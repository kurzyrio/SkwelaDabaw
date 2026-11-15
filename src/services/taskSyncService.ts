/**
 * SkwelaDabaw — Centralized Offline-First Task Management & Silent MySQL Sync Service
 * 
 * Guarantees 0ms perceived local latency for task completion toggles and mutations.
 * Maintains client-generated RFC4122 v4 UUIDs and a 4-tier synchronization state machine:
 * 'pending_create' | 'pending_update' | 'pending_delete' | 'synced'
 * 
 * Flushes pending mutations in the background to tasks_sync.php with silent error handling.
 */

import { db } from '../db';
import { TaskItem, TaskSyncStatus } from '../types';
import { getFirebaseIdToken } from './cloudSyncService';
import { getSavedSession } from './authService';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { syncTasksToWidgets } from './widgetService';
import { scheduleTaskReminder, cancelTaskReminder } from './notificationService';
import {
  clearSyncDeletion,
  clearSyncedTombstones,
  parseUtcTimestampMs,
  readSyncTombstones,
  recordSyncDeletion,
  scopedKey
} from './userScope';

const TASKS_SYNC_API_URL = 'https://skweladabaw.kurzyrio.site/api/tasks_sync.php';

let isSyncing = false;
let pendingResyncAfterCurrent = false;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let isBackgroundSyncInitialized = false;

/**
 * Generate an RFC4122 v4 compliant UUID
 */
export function generateTaskUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Keeps account-specific local cache in localStorage and explicit empty flag synchronized
 */
export function syncTaskLocalCache(tasks: TaskItem[]): void {
  try {
    const session = getSavedSession();
    if (session?.uid && typeof localStorage !== 'undefined') {
      const activeTasks = tasks.filter((t) => t.sync_status !== 'pending_delete');
      localStorage.setItem(`skweladabaw_cached_tasks_${session.uid}`, JSON.stringify(activeTasks));
      const scopedEmptyKey = scopedKey('skweladabaw_explicit_empty_tasks', session.uid);
      if (activeTasks.length === 0) {
        localStorage.setItem(scopedEmptyKey, 'true');
        localStorage.setItem('skweladabaw_explicit_empty_tasks', 'true');
      } else {
        localStorage.removeItem(scopedEmptyKey);
        localStorage.removeItem('skweladabaw_explicit_empty_tasks');
      }
    }
  } catch (e) {
    console.debug('[taskSyncService] Task cache sync note:', e);
  }
}

/**
 * Schedule a debounced silent background sync
 */
export function scheduleSilentSync(delayMs = 1500) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    flushPendingSync().catch((err) => {
      console.debug('[taskSyncService] Silent sync caught error:', err);
    });
  }, delayMs);
}

/**
 * Toggle task completion state with 0ms perceived latency.
 * Updates local Dexie storage immediately and queues background sync without network blocking or toasts.
 */
export async function toggleTaskDone(task: TaskItem): Promise<TaskItem> {
  const willBeCompleted = !Boolean(task.is_completed ?? task.completed);
  const now = new Date().toISOString();

  // State machine transition: un-synced created tasks stay pending_create; otherwise pending_update
  const nextSyncStatus: TaskSyncStatus =
    task.sync_status === 'pending_create' ? 'pending_create' : 'pending_update';

  const updatedFields: Partial<TaskItem> = {
    completed: willBeCompleted,
    is_completed: willBeCompleted,
    completed_at: willBeCompleted ? now : null,
    updated_at: now,
    sync_status: nextSyncStatus
  };

  const updatedTask: TaskItem = {
    ...task,
    ...updatedFields
  };

  // 1. Immediate Dexie update
  if (task.id) {
    await db.tasks.update(task.id, updatedFields);
  } else if (task.uuid) {
    await db.tasks.where('uuid').equals(task.uuid).modify(updatedFields);
  }

// 2. Synchronize Android Home Screen Widgets & Local Alarms in background (non-blocking)
  (async () => {
    try {
      const allTasks = await db.tasks.toArray();
      syncTaskLocalCache(allTasks);
      syncTasksToWidgets(allTasks.filter((t) => t.sync_status !== 'pending_delete'));

      if (willBeCompleted) {
        if (task.id) await cancelTaskReminder(task.id);
      } else {
        await scheduleTaskReminder(updatedTask);
      }
    } catch (e) {
      console.debug('[taskSyncService] Local widget/alarm update note:', e);
    }
  })();

  // 3. Schedule silent background cloud synchronization
  scheduleSilentSync(1500);

  return updatedTask;
}

export type CreateTaskInput = Omit<TaskItem, 'uuid' | 'is_completed' | 'completed' | 'sync_status' | 'created_at' | 'updated_at'> & {
  uuid?: string;
  is_completed?: boolean;
  completed?: boolean;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  sync_status?: TaskSyncStatus;
};

/**
 * Create a new task offline-first with client UUID and pending_create state
 */
export async function createTask(data: CreateTaskInput): Promise<TaskItem> {
  const now = new Date().toISOString();
  const uuid = data.uuid || generateTaskUUID();
  const isCompleted = Boolean(data.is_completed ?? data.completed ?? false);
  clearSyncDeletion('tasks', uuid, getSavedSession()?.uid);

  const newTask: TaskItem = {
    ...data,
    uuid,
    completed: isCompleted,
    is_completed: isCompleted,
    completed_at: isCompleted ? (data.completed_at || now) : null,
    created_at: data.created_at || now,
    updated_at: now,
    sync_status: 'pending_create'
  };

  const newId = await db.tasks.add(newTask);
  newTask.id = Number(newId);

  // Background alarms and widget sync
  (async () => {
    try {
      if (newTask.reminderOption && newTask.reminderOption !== 'none') {
        await scheduleTaskReminder(newTask);
      }
      const allTasks = await db.tasks.toArray();
      syncTaskLocalCache(allTasks);
      syncTasksToWidgets(allTasks.filter((t) => t.sync_status !== 'pending_delete'));
    } catch (e) {
      console.debug('[taskSyncService] Task creation side-effect note:', e);
    }
  })();

  scheduleSilentSync(1500);
  return newTask;
}

/**
 * Update an existing task adhering to offline chaining rules
 */
export async function updateTask(task: TaskItem, updates: Partial<TaskItem>): Promise<TaskItem> {
  const now = new Date().toISOString();
  const nextSyncStatus: TaskSyncStatus =
    task.sync_status === 'pending_create' ? 'pending_create' : 'pending_update';

  const isCompleted = updates.is_completed !== undefined 
    ? updates.is_completed 
    : (updates.completed !== undefined ? updates.completed : task.is_completed);

  const completedAt = isCompleted 
    ? (task.completed_at || updates.completed_at || now) 
    : null;

  const mergedUpdates: Partial<TaskItem> = {
    ...updates,
    completed: isCompleted,
    is_completed: isCompleted,
    completed_at: completedAt,
    updated_at: now,
    sync_status: nextSyncStatus
  };

  const updatedTask: TaskItem = {
    ...task,
    ...mergedUpdates
  };

  if (task.id) {
    await db.tasks.update(task.id, mergedUpdates);
  } else if (task.uuid) {
    await db.tasks.where('uuid').equals(task.uuid).modify(mergedUpdates);
  }

  // Side-effects: Widgets and alarms
  (async () => {
    try {
      if (task.id) {
        if (isCompleted) {
          await cancelTaskReminder(task.id);
        } else if (updatedTask.reminderOption && updatedTask.reminderOption !== 'none') {
          await scheduleTaskReminder(updatedTask);
        } else {
          await cancelTaskReminder(task.id);
        }
      }
      const allTasks = await db.tasks.toArray();
      syncTaskLocalCache(allTasks);
      syncTasksToWidgets(allTasks.filter((t) => t.sync_status !== 'pending_delete'));
    } catch (e) {
      console.debug('[taskSyncService] Task update side-effect note:', e);
    }
  })();

  scheduleSilentSync(1500);
  return updatedTask;
}

/**
 * Delete a task offline-first:
 * - If pending_create: immediately delete locally (cloud never knew about it)
 * - If synced or pending_update: mark as pending_delete so it's hidden from UI and sent to cloud
 */
export async function deleteTask(task: TaskItem): Promise<void> {
  const taskId = task.id;
  const taskUuid = task.uuid;
  const uid = getSavedSession()?.uid;

  // Cancel local notification
  if (taskId) {
    await cancelTaskReminder(taskId);
  }

  // Await Dexie persistence BEFORE updating cache/widgets or flushing to server
  if (task.sync_status === 'pending_create' || !taskUuid) {
    // Never synced to cloud or missing UUID -> hard delete immediately
    if (taskId) {
      await db.tasks.delete(taskId);
    } else if (taskUuid) {
      await db.tasks.where('uuid').equals(taskUuid).delete();
    }
  } else {
    // Soft mark as pending_delete and record tombstone for unified cloud sync fallback
    const now = new Date().toISOString();
    if (taskId) {
      await db.tasks.update(taskId, {
        sync_status: 'pending_delete',
        updated_at: now
      });
    } else if (taskUuid) {
      await db.tasks.where('uuid').equals(taskUuid).modify({
        sync_status: 'pending_delete',
        updated_at: now
      });
    }
    recordSyncDeletion('tasks', taskUuid, uid);
  }

  // Update local cache and Android widgets from committed Dexie state
  try {
    const allTasks = await db.tasks.toArray();
    const active = allTasks.filter((t) => t.sync_status !== 'pending_delete');
    syncTaskLocalCache(active);
    syncTasksToWidgets(active);
  } catch (e) {
    console.debug('[taskSyncService] Task delete widget note:', e);
  }

  // Immediately flush sync so database deletes the task without delay
  flushPendingSync().catch((err) => {
    console.debug('[taskSyncService] Immediate flush error:', err);
    scheduleSilentSync(500);
  });
}

/**
 * Silent background batch flush to MySQL tasks_sync.php endpoint
 */
export async function flushPendingSync(): Promise<void> {
  if (isSyncing) {
    pendingResyncAfterCurrent = true;
    return;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  const session = getSavedSession();
  if (!session || !session.isLoggedIn) {
    // Guest mode: local storage is authoritative
    return;
  }

  isSyncing = true;

  try {
    const tombstones = readSyncTombstones(session.uid);
    const pendingTasks = await db.tasks
      .where('sync_status')
      .anyOf(['pending_create', 'pending_update', 'pending_delete'])
      .toArray();

    if (pendingTasks.length === 0 && tombstones.tasks.length === 0) {
      return;
    }

    const token = await getFirebaseIdToken();
    if (!token) {
      return;
    }

    const tasksToUpsert = pendingTasks.filter((t) => t.sync_status !== 'pending_delete');
    const tasksToDelete = pendingTasks.filter((t) => t.sync_status === 'pending_delete');

    // Snapshot updated_at per UUID so edits made while HTTP POST is in-flight stay queued
    const sentVersionByUuid = new Map<string, string>();
    for (const t of tasksToUpsert) {
      if (t.uuid) {
        sentVersionByUuid.set(t.uuid, t.updated_at);
      }
    }

    const deletedEntriesMap = new Map<string, { uuid: string; deletedAt: string }>();
    for (const entry of tombstones.tasks) {
      if (entry.uuid) deletedEntriesMap.set(entry.uuid, entry);
    }
    for (const td of tasksToDelete) {
      if (td.uuid) deletedEntriesMap.set(td.uuid, { uuid: td.uuid, deletedAt: td.updated_at });
    }

    const payload = {
      tasks: tasksToUpsert.map((t) => ({
        uuid: t.uuid,
        title: t.title,
        description: t.notes || null,
        dueDate: t.dueDate || null,
        dueTime: t.dueTime || null,
        reminderDate: t.reminderDate || null,
        reminderTime: t.reminderTime || null,
        priority: t.priority || 'medium',
        completed: Boolean(t.completed),
        is_completed: Boolean(t.is_completed),
        completed_at: t.completed_at || null,
        subjectCode: t.subjectCode || null,
        created_at: t.created_at,
        updated_at: t.updated_at
      })),
      deleted_uuids: Array.from(deletedEntriesMap.values())
    };

    let responseData: any = null;

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.post({
        url: TASKS_SYNC_API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: payload,
        connectTimeout: 8000,
        readTimeout: 8000
      });
      if (res.status >= 200 && res.status < 300) {
        responseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      }
    } else {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 10000) : null;
      try {
        const res = await fetch(TASKS_SYNC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload),
          signal: controller?.signal
        });
        if (res.ok) {
          responseData = await res.json();
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    if (responseData && responseData.success) {
      // Clear only the snapshotted task tombstones acknowledged in this push
      if (tombstones.tasks.length > 0) {
        clearSyncedTombstones(
          {
            schedules: [],
            routines: [],
            expenses: [],
            transit: [],
            grades: [],
            places: [],
            tasks: tombstones.tasks,
            bookmarks: []
          },
          session.uid
        );
      }

      // 1. Mark acknowledged upserted tasks as 'synced' ONLY if updated_at still matches the sent snapshot
      const syncedUuids: string[] = responseData.synced_uuids || tasksToUpsert.map((t) => t.uuid);
      if (syncedUuids.length > 0) {
        await db.transaction('rw', db.tasks, async () => {
          for (const uuid of syncedUuids) {
            const current = await db.tasks.where('uuid').equals(uuid).first();
            const sentUpdatedAt = sentVersionByUuid.get(uuid);
            if (
              current &&
              current.sync_status !== 'pending_delete' &&
              (!sentUpdatedAt || current.updated_at === sentUpdatedAt)
            ) {
              await db.tasks.where('uuid').equals(uuid).modify({ sync_status: 'synced' });
            }
          }
        });
      }

      // 2. Permanently remove acknowledged deleted tasks from Dexie
      const confirmedDeletedUuids: string[] = responseData.deleted_uuids || tasksToDelete.map((t) => t.uuid).filter(Boolean);
      await db.transaction('rw', db.tasks, async () => {
        for (const uuid of confirmedDeletedUuids) {
          if (uuid) {
            const cur = await db.tasks.where('uuid').equals(uuid).first();
            if (cur && cur.sync_status === 'pending_delete') {
              await db.tasks.where('uuid').equals(uuid).delete();
            }
          }
        }
        for (const td of tasksToDelete) {
          if (td.id) {
            const cur = await db.tasks.get(td.id);
            if (cur && cur.sync_status === 'pending_delete') {
              await db.tasks.delete(td.id);
            }
          }
        }
      });

      const remainingNow = await db.tasks.toArray();
      syncTaskLocalCache(remainingNow);
    }
  } catch (err) {
    // Silent failure: zero toasts, zero UI popups, zero rollbacks
    console.debug('[taskSyncService] Background sync caught error silently:', err);
  } finally {
    isSyncing = false;
    if (pendingResyncAfterCurrent) {
      pendingResyncAfterCurrent = false;
      scheduleSilentSync(250);
    }
  }
}

/**
 * Hydrate local tasks from cloud upon login or device restore
 */
export async function pullCloudTasks(): Promise<void> {
  const session = getSavedSession();
  if (!session || !session.isLoggedIn) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  try {
    const token = await getFirebaseIdToken();
    if (!token) return;

    let serverTasks: any[] = [];
    let fetchSucceeded = false;

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({
        url: TASKS_SYNC_API_URL,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        connectTimeout: 8000,
        readTimeout: 8000
      });
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (res.status >= 200 && res.status < 300 && parsed && parsed.success && Array.isArray(parsed.tasks)) {
        serverTasks = parsed.tasks;
        fetchSucceeded = true;
      }
    } else {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 10000) : null;
      try {
        const res = await fetch(TASKS_SYNC_API_URL, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: controller?.signal
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.tasks)) {
            serverTasks = json.tasks;
            fetchSucceeded = true;
          }
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    if (!fetchSucceeded) return;

    const tombstones = readSyncTombstones(session.uid);
    const survivingServerTasks = serverTasks.filter((st) => {
      if (!st.uuid) return false;
      const entry = tombstones.tasks.find((e) => e.uuid === st.uuid);
      if (!entry) return true;
      const delMs = parseUtcTimestampMs(entry.deletedAt);
      const updMs = parseUtcTimestampMs(st.updated_at);
      return updMs > 0 && delMs > 0 && updMs > delMs;
    });

    await db.transaction('rw', db.tasks, async () => {
      const localTasks = await db.tasks.toArray();
      const localByUuid = new Map<string, TaskItem>();
      for (const lt of localTasks) {
        if (lt.uuid) localByUuid.set(lt.uuid, lt);
      }
      const serverUuidSet = new Set(survivingServerTasks.map((st) => String(st.uuid)));

      for (const st of survivingServerTasks) {
        const existing = localByUuid.get(String(st.uuid));
        if (!existing) {
          await db.tasks.add({
            uuid: st.uuid,
            title: st.title,
            subjectCode: st.subject_code || undefined,
            dueDate: st.due_date || '',
            dueTime: st.due_time || st.dueTime || '23:59',
            reminderTime: st.reminder_time || st.reminderTime || '',
            priority: st.priority || 'medium',
            completed: Boolean(st.is_completed ?? st.completed),
            is_completed: Boolean(st.is_completed ?? st.completed),
            completed_at: st.completed_at || null,
            created_at: st.created_at || new Date().toISOString(),
            updated_at: st.updated_at || new Date().toISOString(),
            sync_status: 'synced',
            notes: st.description || undefined
          });
        } else if (existing.sync_status === 'synced') {
          await db.tasks.where('uuid').equals(st.uuid).modify({
            title: st.title,
            subjectCode: st.subject_code || undefined,
            dueDate: st.due_date || existing.dueDate,
            dueTime: st.due_time || st.dueTime || existing.dueTime || '23:59',
            reminderTime: st.reminder_time !== undefined ? (st.reminder_time || '') : existing.reminderTime,
            priority: st.priority || existing.priority,
            completed: Boolean(st.is_completed ?? st.completed),
            is_completed: Boolean(st.is_completed ?? st.completed),
            completed_at: st.completed_at || null,
            updated_at: st.updated_at || existing.updated_at,
            notes: st.description || existing.notes
          });
        }
      }

      // Reconcile deletions (including empty server array): delete ONLY local 'synced' tasks missing on server
      for (const lt of localTasks) {
        if (lt.sync_status === 'synced' && lt.uuid && !serverUuidSet.has(lt.uuid) && lt.id) {
          await db.tasks.delete(lt.id);
        }
      }
    });

    const currentTasks = await db.tasks.toArray();
    syncTaskLocalCache(currentTasks);
    syncTasksToWidgets(currentTasks.filter((t) => t.sync_status !== 'pending_delete'));
    if (currentTasks.some((t) => t.sync_status !== 'synced')) {
      scheduleSilentSync(500);
    }
  } catch (err) {
    console.debug('[taskSyncService] Pull cloud tasks note:', err);
  }
}

/**
 * Initialize event listeners for background task sync:
 * - Browser online event
 * - Tab visibility change (when user returns to app)
 * - Window focus
 * - Capacitor appStateChange (when app resumes from background)
 */
export function initTaskBackgroundSync(): void {
  if (isBackgroundSyncInitialized) return;
  isBackgroundSyncInitialized = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      scheduleSilentSync(500);
    });

    window.addEventListener('focus', () => {
      scheduleSilentSync(1000);
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        scheduleSilentSync(500);
      }
    });
  }

  if (Capacitor.isNativePlatform()) {
    try {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          scheduleSilentSync(500);
        }
      });
    } catch (e) {
      console.debug('[taskSyncService] CapApp listener note:', e);
    }
  }

  // Perform initial flush after slight delay to allow auth session initialization
  scheduleSilentSync(2500);
}

// Auto-initialize background listener when running in browser or native webview
if (typeof window !== 'undefined') {
  initTaskBackgroundSync();
}
