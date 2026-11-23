/**
 * SkwelaDabaw — Unified MySQL Cloud Sync Service
 * 
 * Implements 100% offline-first synchronization with Dexie.js (IndexedDB).
 * Connects securely to https://skweladabaw.kurzyrio.site/api/sync.php
 * using Firebase Auth JWT ID Tokens.
 */

import { db } from '../db';
import { auth, isFirebaseConfigured } from './firebase';
import { StudentAuthSession, saveSession, setOnboardingCompleted, getSavedSession, hasCompletedOnboarding } from './authService';
import { ClassSchedule, DayOfWeek, TaskItem, DayReminderItem, ExpenseItem, GradeItem } from '../types';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  scheduleAllClassSchedulesReminders,
  refreshUnremovableClassNotification,
  scheduleCommuteAndEasterNotifications
} from './notificationService';
import { syncScheduleToWidgets, syncTasksToWidgets, syncRoutinesToWidgets, syncWeatherAlertPreference } from './widgetService';
import {
  SyncTombstones,
  clearSyncedTombstones,
  enqueueSyncOperation,
  generateSyncUUID,
  getCurrentStorageUid,
  hasPendingTombstones,
  mergeSyncTombstones,
  parseUtcTimestampMs,
  readScopedJson,
  readSyncTombstones,
  scopedKey,
  updateServerClockOffset,
  writeScopedJson
} from './userScope';

const SYNC_API_URL = 'https://skweladabaw.kurzyrio.site/api/sync.php';

export interface CloudSyncResult {
  restored: boolean;
  scheduleCount: number;
  taskCount: number;
  message?: string;
  error?: string;
}

/**
 * Helper to fetch raw token from Native or Web Firebase SDK matching active session UID
 */
async function fetchRawFirebaseToken(forceRefresh = false): Promise<string | null> {
  const saved = getSavedSession();
  const expectedUid = saved?.isLoggedIn && saved?.uid ? String(saved.uid) : null;

  // 0. Check for SkwelaDabaw Phone Auth session token (only if it belongs to the active logged-in user)
  const localToken = typeof localStorage !== 'undefined' ? localStorage.getItem('skweladabaw_auth_token') : null;
  if (localToken) {
    const tokenUid = extractJwtTokenUid(localToken);
    if (saved?.isLoggedIn && saved.uid && (!tokenUid || tokenUid === saved.uid)) {
      return localToken;
    }
    try { localStorage.removeItem('skweladabaw_auth_token'); } catch (_) {}
  }

  // 1. Web Firebase JS SDK check first if active user matches session UID
  if (isFirebaseConfigured && auth && auth.currentUser) {
    if (!expectedUid || auth.currentUser.uid === expectedUid) {
      try {
        const webToken = await auth.currentUser.getIdToken(forceRefresh);
        if (webToken) return webToken;
      } catch (err) {
        console.warn('Could not fetch Firebase ID token from web SDK:', err);
      }
    }
  }

  // 2. Native Android (Capacitor Firebase Auth)
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await FirebaseAuthentication.getIdToken(forceRefresh ? { forceRefresh: true } : undefined);
      if (res && res.token) {
        const tokenUid = extractJwtTokenUid(res.token);
        if (!expectedUid || !tokenUid || tokenUid === expectedUid) {
          return res.token;
        }
      }
    } catch (e) {
      console.warn('Native getIdToken notice:', e);
    }
  }

  // 3. Fallback: Web Firebase SDK regardless of mismatch (e.g., anonymous guest session)
  if (isFirebaseConfigured && auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (err) {
      console.warn('Could not fetch fallback Firebase ID token:', err);
    }
  }

  // 4. Fallback: Native Firebase user with force refresh
  if (Capacitor.isNativePlatform()) {
    try {
      const cur = await FirebaseAuthentication.getCurrentUser();
      if (cur && cur.user) {
        const res = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
        if (res && res.token) {
          return res.token;
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Get current user Firebase Auth ID token across Native Android & Web with retry
 */
export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const token = await fetchRawFirebaseToken(forceRefresh || attempt > 1);
    if (token) return token;
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return null;
}

function extractJwtTokenUid(token: string | null | undefined): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const json = atob(b64 + pad);
    const payload = JSON.parse(json);
    const resolved = payload?.user_id || payload?.uid || payload?.sub;
    return resolved ? String(resolved) : null;
  } catch {
    return null;
  }
}

const INT_TO_DAY_OF_WEEK: Record<number, DayOfWeek> = {
  0: 'Everyday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
};

function mapDayOfWeekFromServer(raw: unknown): DayOfWeek {
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw.trim()))) {
    const n = Number(raw);
    return INT_TO_DAY_OF_WEEK[n] || 'Monday';
  }
  const str = String(raw || '').trim();
  const valid: DayOfWeek[] = ['Everyday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const matched = valid.find((d) => d.toLowerCase() === str.toLowerCase());
  return matched || 'Monday';
}

function isRecordTombstoned(
  uuid: string | undefined,
  recordUpdatedAt: string | undefined,
  entries: Array<{ uuid: string; deletedAt: string }>,
  clearBefore?: string
): boolean {
  const recMs = parseUtcTimestampMs(recordUpdatedAt);
  if (clearBefore) {
    const clearMs = parseUtcTimestampMs(clearBefore);
    if (clearMs > 0 && (recMs === 0 || recMs <= clearMs)) {
      return true;
    }
  }
  if (!uuid) return false;
  const entry = entries.find((e) => e.uuid === uuid);
  if (!entry) return false;
  const delMs = parseUtcTimestampMs(entry.deletedAt);
  return delMs === 0 || recMs === 0 || recMs <= delMs;
}

/**
 * Helper to reconcile remote cloud schedules with local Dexie schedules inside an active transaction.
 * Matches by UUID -> OFR code -> (subjectCode + days + startTime), compares updatedAt,
 * preserves pending/unacknowledged local edits and local reminderMinutes, and omits server IDs on insert.
 */
async function reconcileSchedulesWithCloud(
  remoteSchedules: ClassSchedule[],
  uid: string,
  options?: {
    defaultReminder?: number;
    tombstones?: SyncTombstones;
    hasLocalPending?: boolean;
  }
): Promise<{ changed: boolean; count: number; schedules: ClassSchedule[] }> {
  const localSchedules = await db.schedules.toArray();
  const defaultReminder = options?.defaultReminder ?? Number(localStorage.getItem('skweladabaw_reminder_timing') || 10);
  const tombstones = options?.tombstones ?? readSyncTombstones(uid);
  const hasLocalPending = options?.hasLocalPending ?? false;

  const filteredRemote = remoteSchedules.filter(
    (r) => !isRecordTombstoned(r.uuid, r.updatedAt || r.createdAt, tombstones.schedules, tombstones.clearSchedulesBefore)
  );

  // If local database is empty, add filtered remote schedules letting Dexie assign local ++id
  if (localSchedules.length === 0) {
    const withDefaults: ClassSchedule[] = filteredRemote.map((r) => ({
      ...r,
      id: undefined,
      uuid: r.uuid || generateSyncUUID('sched'),
      syncStatus: 'synced',
      reminderMinutes: (r.reminderMinutes !== undefined && r.reminderMinutes !== null)
        ? Number(r.reminderMinutes)
        : defaultReminder
    }));
    if (withDefaults.length > 0) {
      await db.schedules.bulkAdd(withDefaults);
    }
    const saved = await db.schedules.toArray();
    return { changed: saved.length > 0, count: saved.length, schedules: saved };
  }

  // If remote has no surviving schedules, preserve local pending/unpushed schedules (Anti-Wipe Guard)
  if (filteredRemote.length === 0) {
    return { changed: false, count: localSchedules.length, schedules: localSchedules };
  }

  let hasChanged = false;
  const matchedLocalIds = new Set<number>();

  const areDaysEqual = (d1: string[], d2: string[]) => {
    if (!Array.isArray(d1) || !Array.isArray(d2)) return false;
    if (d1.length !== d2.length) return false;
    const s1 = [...d1].sort().join(',');
    const s2 = [...d2].sort().join(',');
    return s1.toLowerCase() === s2.toLowerCase();
  };

  for (const remote of filteredRemote) {
    // 1. Find matching local schedule (UUID -> OFR -> natural composite key)
    const match = localSchedules.find((local) => {
      if (local.id && matchedLocalIds.has(local.id)) return false;
      if (remote.uuid && local.uuid && remote.uuid === local.uuid) {
        return true;
      }
      if (remote.ofrCode && local.ofrCode && remote.ofrCode.trim() === local.ofrCode.trim()) {
        return true;
      }
      const codeMatch = remote.subjectCode.trim().toUpperCase() === local.subjectCode.trim().toUpperCase();
      const timeMatch = (remote.startTime || '').trim() === (local.startTime || '').trim();
      const daysMatch = areDaysEqual(remote.days, local.days);
      return codeMatch && timeMatch && daysMatch;
    });

    if (match && match.id) {
      matchedLocalIds.add(match.id);

      const localTs = parseUtcTimestampMs(match.updatedAt);
      const remoteTs = parseUtcTimestampMs(remote.updatedAt);
      const keepLocalPending = match.syncStatus === 'pending' && (localTs === 0 || remoteTs === 0 || localTs >= remoteTs);

      if (keepLocalPending) {
        // Adopt missing server UUID if local lacked one, without overwriting pending local edits
        if (!match.uuid && remote.uuid) {
          await db.schedules.update(match.id, { uuid: remote.uuid });
        }
        continue;
      }

      const resolvedOfr = remote.ofrCode !== undefined ? remote.ofrCode : (match.ofrCode || '');
      const resolvedSubjectCode = remote.subjectCode || match.subjectCode;
      const resolvedDays = Array.isArray(remote.days) && remote.days.length > 0 ? remote.days : match.days;
      const resolvedStartTime = remote.startTime || match.startTime;
      const resolvedBuilding =
        remote.building !== undefined && remote.building !== ''
          ? remote.building
          : (match.building || '');
      const resolvedUnits = remote.units !== undefined ? remote.units : match.units;
      const resolvedNotes = remote.notes !== undefined ? remote.notes : match.notes;

      const resolvedReminder = (match.reminderMinutes !== undefined && match.reminderMinutes !== null)
        ? match.reminderMinutes
        : ((remote.reminderMinutes !== undefined && remote.reminderMinutes !== null) ? Number(remote.reminderMinutes) : defaultReminder);

      const isCoreDiff =
        (match.ofrCode || '') !== resolvedOfr ||
        match.subjectCode !== resolvedSubjectCode ||
        match.subjectName !== remote.subjectName ||
        match.room !== remote.room ||
        (match.building || '') !== resolvedBuilding ||
        match.instructor !== remote.instructor ||
        !areDaysEqual(match.days, resolvedDays) ||
        match.startTime !== resolvedStartTime ||
        match.endTime !== remote.endTime ||
        match.color !== remote.color ||
        match.units !== resolvedUnits ||
        (match.notes || '') !== (resolvedNotes || '') ||
        (remote.uuid && match.uuid !== remote.uuid);

      if (isCoreDiff || match.reminderMinutes !== resolvedReminder || match.syncStatus !== 'synced') {
        hasChanged = isCoreDiff || match.reminderMinutes !== resolvedReminder || hasChanged;
        await db.schedules.update(match.id, {
          uuid: remote.uuid || match.uuid || generateSyncUUID('sched'),
          ofrCode: resolvedOfr,
          subjectCode: resolvedSubjectCode,
          subjectName: remote.subjectName,
          room: remote.room,
          building: resolvedBuilding,
          instructor: remote.instructor,
          days: resolvedDays,
          startTime: resolvedStartTime,
          endTime: remote.endTime,
          color: remote.color,
          units: resolvedUnits,
          notes: resolvedNotes,
          reminderMinutes: resolvedReminder,
          createdAt: remote.createdAt || match.createdAt,
          updatedAt: remote.updatedAt || match.updatedAt,
          syncStatus: 'synced'
        });
      }
    } else {
      hasChanged = true;
      const newSchedule: ClassSchedule = {
        ...remote,
        id: undefined,
        uuid: remote.uuid || generateSyncUUID('sched'),
        syncStatus: 'synced',
        reminderMinutes: (remote.reminderMinutes !== undefined && remote.reminderMinutes !== null)
          ? Number(remote.reminderMinutes)
          : defaultReminder
      };
      await db.schedules.add(newSchedule);
    }
  }

  // Only remove local schedules that were previously synced and are not locally pending
  for (const local of localSchedules) {
    if (local.id && !matchedLocalIds.has(local.id)) {
      const isPending = local.syncStatus === 'pending' || (!local.syncStatus && hasLocalPending);
      if (!isPending) {
        hasChanged = true;
        await db.schedules.delete(local.id);
      }
    }
  }

  const finalSchedules = await db.schedules.toArray();
  return { changed: hasChanged, count: finalSchedules.length, schedules: finalSchedules };
}

/**
 * Restore user profile, timetable schedules, tasks, and settings from MySQL
 * Hydrates local Dexie.js database atomically for instant 0ms offline access.
 */
export async function restoreUserData(
  uid?: string,
  providedToken?: string,
  skipAutoQueue = false
): Promise<CloudSyncResult> {
  // STRICT OFFLINE GUARD: Never attempt network fetch or risk touching local storage when offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { restored: false, scheduleCount: 0, taskCount: 0, message: 'Device is offline' };
  }

  const token = providedToken || (await getFirebaseIdToken());
  if (!token) {
    return { restored: false, scheduleCount: 0, taskCount: 0, message: 'No auth token available' };
  }

  return enqueueSyncOperation(async (): Promise<CloudSyncResult> => {
  try {
    let responseData: any = null;
    const requestUrl = `${SYNC_API_URL}?t=${Date.now()}&token=${encodeURIComponent(token)}`;

    if (Capacitor.isNativePlatform()) {
      const nativeRes = await CapacitorHttp.get({
        url: requestUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        connectTimeout: 8000,
        readTimeout: 8000
      });

      if (nativeRes.status === 200 && nativeRes.data) {
        responseData = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
      }
    } else {
      const res = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        responseData = await res.json();
      }
    }

    if (responseData && responseData.success && responseData.exists && responseData.user) {
      updateServerClockOffset(responseData.serverNow || responseData.timestamp);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('skwela_network_activity', { detail: { isOnline: true } }));
      }
      const u = responseData.user;
      const activeTokenUid = extractJwtTokenUid(token);
      const serverUid = String(u.user_id || uid || '');
      const targetUid = activeTokenUid || serverUid;
      if (serverUid && targetUid && serverUid !== targetUid) {
        mergeSyncTombstones(readSyncTombstones(serverUid), targetUid);
      }
      if (uid && targetUid && uid !== targetUid) {
        mergeSyncTombstones(readSyncTombstones(uid), targetUid);
      }
      const currentSaved = getSavedSession();
      const tombstones = readSyncTombstones(targetUid);
      const hasPendingSync = typeof window !== 'undefined' && (
        localStorage.getItem(PENDING_SYNC_KEY) === 'true' ||
        localStorage.getItem('skweladabaw_pending_sync') === 'true' ||
        localStorage.getItem('skweladabaw_profile_dirty') === 'true' ||
        hasPendingTombstones(targetUid)
      );
      const isProfileDirty = typeof window !== 'undefined' && localStorage.getItem('skweladabaw_profile_dirty') === 'true';

      const isLocalCampusCustom = Boolean(currentSaved.campusId);
      const shouldPreserveLocalCampus = isProfileDirty || hasPendingSync || isLocalCampusCustom || (Boolean(currentSaved.campusId) && currentSaved.campusId !== u.campus_id);

      const hasRealLocalUsername = Boolean(currentSaved.username && !/^student_[a-f0-9]{6,16}$/i.test(currentSaved.username));
      const isCloudUsernameValid = Boolean(u.username && !/^student_[a-f0-9]{6,16}$/i.test(u.username));
      const resolvedUsername = isCloudUsernameValid ? u.username : (hasRealLocalUsername ? currentSaved.username : (u.username || ''));

      const isLocalNameCustom = Boolean(currentSaved.name && currentSaved.name !== 'Davao Student' && currentSaved.name !== 'Student');
      const isCloudNameDefault = !u.display_name || u.display_name === 'Davao Student';
      const shouldPreserveLocalName = isProfileDirty || hasPendingSync || (isLocalNameCustom && isCloudNameDefault);
      const resolvedName = shouldPreserveLocalName ? (currentSaved.name || u.display_name || 'Student') : ((u.display_name && u.display_name !== 'Davao Student') ? u.display_name : (currentSaved.name || 'Student'));

      const resolvedCampus = shouldPreserveLocalCampus ? (currentSaved.campusId || u.campus_id || '') : (u.campus_id || currentSaved.campusId || '');

      const isLocalCourseCustom = Boolean(currentSaved.course && currentSaved.course !== 'Enrolled Student');
      const isCloudCourseDefault = !u.course || u.course === 'Enrolled Student';
      const shouldPreserveLocalCourse = isProfileDirty || hasPendingSync || (isLocalCourseCustom && isCloudCourseDefault);
      const resolvedCourse = shouldPreserveLocalCourse ? (currentSaved.course || u.course || 'Enrolled Student') : ((u.course && u.course !== 'Enrolled Student') ? u.course : (currentSaved.course || 'Enrolled Student'));

      const isLocalYearCustom = Boolean(currentSaved.yearLevel && currentSaved.yearLevel !== 'College Student');
      const isCloudYearDefault = !u.year_level || u.year_level === 'College Student';
      const shouldPreserveLocalYear = isProfileDirty || hasPendingSync || (isLocalYearCustom && isCloudYearDefault);
      const resolvedYearLevel = shouldPreserveLocalYear ? (currentSaved.yearLevel || u.year_level || 'College Student') : ((u.year_level && u.year_level !== 'College Student') ? u.year_level : (currentSaved.yearLevel || 'College Student'));

      const resolvedAvatar = (shouldPreserveLocalName && currentSaved.avatar) ? currentSaved.avatar : (u.avatar_url || currentSaved.avatar || '');
      const resolvedAge = (isProfileDirty || hasPendingSync) && currentSaved.age ? currentSaved.age : (u.age ? Number(u.age) : currentSaved.age);
      const resolvedGender = (isProfileDirty || hasPendingSync) && currentSaved.gender ? currentSaved.gender : (u.gender || currentSaved.gender);

      // 1. Restore local session without destroying student's chosen profile
      const restoredSession: StudentAuthSession = {
        isLoggedIn: true,
        uid: targetUid,
        name: resolvedName,
        username: resolvedUsername,
        email: u.email || currentSaved.email || '',
        avatar: resolvedAvatar,
        campusId: resolvedCampus,
        course: resolvedCourse,
        yearLevel: resolvedYearLevel,
        role: u.role || currentSaved.role || 'student',
        age: resolvedAge,
        gender: resolvedGender,
        lastUsernameChange: u.last_username_change || u.lastUsernameChange || currentSaved.lastUsernameChange
      };
      saveSession(restoredSession);

      let needsBackgroundPush =
        hasPendingSync || shouldPreserveLocalCampus || shouldPreserveLocalCourse || shouldPreserveLocalYear;

      const isCompleteProfile = Boolean(
        (u.is_setup_complete === 1 || u.is_setup_complete === true || hasRealLocalUsername) &&
        resolvedUsername &&
        !/^student_[a-f0-9]{6,16}$/i.test(resolvedUsername)
      );
      if (isCompleteProfile && (hasCompletedOnboarding() || currentSaved.isLoggedIn)) {
        if (hasCompletedOnboarding()) {
          setOnboardingCompleted(true);
        }
        if (hasRealLocalUsername && !isCloudUsernameValid) {
          needsBackgroundPush = true;
        }
      }

      const dayAbbrevMap: Record<string, string> = {
        'm': 'Monday', 'mon': 'Monday', 'monday': 'Monday',
        't': 'Tuesday', 'tue': 'Tuesday', 'tues': 'Tuesday', 'tuesday': 'Tuesday',
        'w': 'Wednesday', 'wed': 'Wednesday', 'wednesday': 'Wednesday',
        'th': 'Thursday', 'thu': 'Thursday', 'thur': 'Thursday', 'thurs': 'Thursday', 'thursday': 'Thursday',
        'f': 'Friday', 'fri': 'Friday', 'friday': 'Friday',
        's': 'Saturday', 'sat': 'Saturday', 'saturday': 'Saturday',
        'su': 'Sunday', 'sun': 'Sunday', 'sunday': 'Sunday',
        'everyday': 'Everyday'
      };

      const parseDays = (raw: any): DayOfWeek[] => {
        if (!raw) return ['Monday', 'Wednesday', 'Friday'];
        let items: string[] = [];
        if (Array.isArray(raw)) {
          items = raw.map(x => String(x).trim());
        } else if (typeof raw === 'string') {
          items = raw.split(',').map(x => x.trim());
        }
        const mapped: DayOfWeek[] = [];
        for (const item of items) {
          const key = item.toLowerCase();
          if (dayAbbrevMap[key]) {
            const val = dayAbbrevMap[key] as DayOfWeek;
            if (!mapped.includes(val)) mapped.push(val);
          } else if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Everyday'].includes(item)) {
            const val = item as DayOfWeek;
            if (!mapped.includes(val)) mapped.push(val);
          }
        }
        return mapped.length > 0 ? mapped : ['Monday', 'Wednesday', 'Friday'];
      };

      // Pre-map all cloud collections synchronously before entering atomic IDB transaction
      const defaultReminder = Number(localStorage.getItem('skweladabaw_reminder_timing') || 10);
      const hasHydratedBefore = typeof window !== 'undefined' && localStorage.getItem(`skweladabaw_has_hydrated_${targetUid}`) === 'true';
      const isExplicitEmptySchedules = typeof window !== 'undefined' &&
        localStorage.getItem(scopedKey('skweladabaw_explicit_empty_schedules', targetUid)) === 'true';
      const isExplicitEmptyTasks = typeof window !== 'undefined' &&
        localStorage.getItem(scopedKey('skweladabaw_explicit_empty_tasks', targetUid)) === 'true';

      const hasSchedulesField = Array.isArray(responseData.schedules);
      const mappedSchedules: ClassSchedule[] = hasSchedulesField
        ? responseData.schedules.map((s: any) => ({
            uuid: s.uuid || undefined,
            ofrCode: s.ofr_code || s.ofrCode || '',
            subjectCode: s.subject_code || s.subjectCode || 'SUBJ',
            subjectName: s.subject_name || s.subjectName || s.subject_code || s.subjectCode || 'Subject',
            room: s.room || '',
            building: s.building !== undefined && s.building !== null ? String(s.building) : undefined,
            days: parseDays(s.days),
            startTime: s.start_time || s.startTime || '07:30',
            endTime: s.end_time || s.endTime || '09:00',
            color: s.color || '#0284c7',
            units: (s.units !== undefined && s.units !== null && s.units !== '') ? Number(s.units) : undefined,
            notes: s.notes !== undefined && s.notes !== null ? String(s.notes) : undefined,
            instructor: s.instructor || '',
            reminderMinutes: (s.reminder_minutes !== undefined && s.reminder_minutes !== null)
              ? Number(s.reminder_minutes)
              : (s.reminderMinutes !== undefined && s.reminderMinutes !== null ? Number(s.reminderMinutes) : undefined),
            createdAt: s.created_at || s.createdAt || undefined,
            updatedAt: s.updated_at || s.updatedAt || undefined,
            syncStatus: 'synced'
          }))
        : [];

      const hasTasksField = Array.isArray(responseData.tasks);
      const mappedTasks: TaskItem[] = hasTasksField
        ? responseData.tasks
            .map((t: any) => ({
              uuid: t.uuid || generateSyncUUID('task'),
              title: t.title || 'Task',
              notes: t.description || t.notes || '',
              dueDate: t.due_date || t.dueDate || '',
              reminderTime: t.reminder_time || t.reminderTime || '',
              dueTime: t.due_time || t.dueTime || '23:59',
              priority: t.priority || 'medium',
              completed: Boolean(t.is_completed ?? t.completed),
              is_completed: Boolean(t.is_completed ?? t.completed),
              completed_at: t.completed_at || null,
              created_at: t.created_at || new Date().toISOString(),
              updated_at: t.updated_at || new Date().toISOString(),
              sync_status: 'synced' as const,
              subjectCode: t.subject_code || t.subjectCode || ''
            }))
            .filter((t: TaskItem) => !isRecordTombstoned(t.uuid, t.updated_at, tombstones.tasks))
        : [];

      const hasRoutinesField = Array.isArray(responseData.routines);
      const mappedRoutines: DayReminderItem[] = hasRoutinesField
        ? responseData.routines
            .map((r: any) => ({
              uuid: r.uuid || generateSyncUUID('routine'),
              title: r.title || 'Routine',
              dayOfWeek: mapDayOfWeekFromServer(r.day_of_week ?? r.dayOfWeek),
              time: r.time || '07:00',
              enabled: Boolean(r.enabled),
              createdAt: r.created_at || undefined,
              updatedAt: r.updated_at || undefined,
              syncStatus: 'synced' as const
            }))
            .filter((r: DayReminderItem) => !isRecordTombstoned(r.uuid, r.updatedAt || r.createdAt, tombstones.routines))
        : [];

      const hasExpensesField = Array.isArray(responseData.expenses);
      const mappedExpenses: ExpenseItem[] = hasExpensesField
        ? responseData.expenses
            .map((e: any) => ({
              uuid: e.uuid || generateSyncUUID('exp'),
              date: e.date ? String(e.date).substring(0, 10) : new Date().toISOString().substring(0, 10),
              category: e.category || 'other',
              amount: Number(e.amount) || 0,
              note: e.note || '',
              createdAt: e.created_at || undefined,
              updatedAt: e.updated_at || undefined,
              syncStatus: 'synced' as const
            }))
            .filter((e: ExpenseItem) => !isRecordTombstoned(e.uuid, e.updatedAt || e.createdAt, tombstones.expenses))
        : [];

      const hasGradesField = Array.isArray(responseData.grades);
      const mappedGrades: GradeItem[] = hasGradesField
        ? responseData.grades
            .map((g: any) => ({
              uuid: g.uuid || generateSyncUUID('grade'),
              subjectCode: g.subject_code || g.subjectCode || 'SUBJ',
              subjectName: g.subject_name || g.subjectName || 'Subject',
              units: Number(g.units) || 3,
              prelim: g.prelim !== null && g.prelim !== undefined ? Number(g.prelim) : undefined,
              midterm: g.midterm !== null && g.midterm !== undefined ? Number(g.midterm) : undefined,
              prefinal: g.prefinal !== null && g.prefinal !== undefined ? Number(g.prefinal) : undefined,
              finals: g.finals !== null && g.finals !== undefined ? Number(g.finals) : undefined,
              rawAverage: g.raw_average !== null && g.raw_average !== undefined ? Number(g.raw_average) : undefined,
              transmutedGrade: g.transmuted_grade || g.transmutedGrade || undefined,
              gradingScale: g.grading_scale || g.gradingScale || '1.0-5.0',
              createdAt: g.created_at || undefined,
              updatedAt: g.updated_at || undefined,
              syncStatus: 'synced' as const
            }))
            .filter((g: GradeItem) => !isRecordTombstoned(g.uuid, g.updatedAt || g.createdAt, tombstones.grades))
        : [];

      // 2. Single atomic transaction across all 5 Dexie stores (non-destructive uuid + updated_at merge)
      const txResult = await db.transaction(
        'rw',
        [db.schedules, db.tasks, db.dayReminders, db.expenses, db.grades],
        async () => {
          // A. Schedules
          let schedulesChanged = false;
          let finalSchedules: ClassSchedule[] = [];
          const survivedMappedSchedules = mappedSchedules.filter(
            (s) => !isRecordTombstoned(s.uuid, s.updatedAt || s.createdAt, tombstones.schedules, tombstones.clearSchedulesBefore)
          );

          if (survivedMappedSchedules.length > 0) {
            const reconciliation = await reconcileSchedulesWithCloud(survivedMappedSchedules, targetUid, {
              defaultReminder,
              tombstones,
              hasLocalPending: hasPendingSync
            });
            schedulesChanged = reconciliation.changed;
            finalSchedules = reconciliation.schedules;
          } else if (hasSchedulesField) {
            const existingLocal = await db.schedules.toArray();
            if (isExplicitEmptySchedules || tombstones.clearSchedulesBefore) {
              for (const loc of existingLocal) {
                if (loc.id && loc.syncStatus !== 'pending') {
                  schedulesChanged = true;
                  await db.schedules.delete(loc.id);
                }
              }
            } else if (
              existingLocal.length > 0 &&
              hasHydratedBefore &&
              !hasPendingSync &&
              existingLocal.every((s) => s.syncStatus === 'synced')
            ) {
              schedulesChanged = true;
              await db.schedules.clear();
            } else if (existingLocal.length > 0) {
              needsBackgroundPush = true;
            }
            finalSchedules = await db.schedules.toArray();
          } else {
            finalSchedules = await db.schedules.toArray();
          }

          // B. Tasks (preserve all pending_create / pending_update / pending_delete rows)
          if (hasTasksField) {
            const localTasks = await db.tasks.toArray();
            const localByUuid = new Map<string, TaskItem>();
            for (const lt of localTasks) {
              if (lt.uuid) localByUuid.set(lt.uuid, lt);
            }
            const remoteUuidSet = new Set(mappedTasks.map((t) => t.uuid));

            for (const rt of mappedTasks) {
              const existing = localByUuid.get(rt.uuid);
              if (!existing) {
                await db.tasks.add(rt);
              } else if (existing.sync_status === 'synced') {
                const remoteTs = parseUtcTimestampMs(rt.updated_at);
                const localTs = parseUtcTimestampMs(existing.updated_at);
                const remoteIsNewer = remoteTs === 0 || localTs === 0 || remoteTs >= localTs;
                const differs =
                  existing.title !== rt.title ||
                  (existing.notes || '') !== (rt.notes || '') ||
                  (existing.dueDate || '') !== (rt.dueDate || '') ||
                  (existing.dueTime || '') !== (rt.dueTime || '') ||
                  (existing.reminderTime || '') !== (rt.reminderTime || '') ||
                  existing.priority !== rt.priority ||
                  Boolean(existing.completed) !== Boolean(rt.completed) ||
                  (existing.subjectCode || '') !== (rt.subjectCode || '');
                if (remoteIsNewer && differs && existing.id) {
                  await db.tasks.update(existing.id, {
                    title: rt.title,
                    notes: rt.notes,
                    dueDate: rt.dueDate,
                    dueTime: rt.dueTime,
                    reminderTime: rt.reminderTime,
                    priority: rt.priority,
                    completed: rt.completed,
                    is_completed: rt.is_completed,
                    completed_at: rt.completed_at,
                    updated_at: rt.updated_at,
                    subjectCode: rt.subjectCode,
                    sync_status: 'synced'
                  });
                }
              }
            }

            // Delete only previously-synced tasks that no longer exist on the server
            for (const lt of localTasks) {
              const isPending = lt.sync_status !== 'synced';
              if (!isPending && !remoteUuidSet.has(lt.uuid) && lt.id) {
                await db.tasks.delete(lt.id);
              }
            }
          }
          const allTasksNow = await db.tasks.toArray();
          const activeTasks = allTasksNow.filter((t) => t.sync_status !== 'pending_delete');

          // C. Day Routines (uuid + natural key reconciliation)
          if (hasRoutinesField) {
            const localRoutines = await db.dayReminders.toArray();
            const matchedRoutineIds = new Set<number>();
            for (const rr of mappedRoutines) {
              const match = localRoutines.find((lr) => {
                if (lr.id && matchedRoutineIds.has(lr.id)) return false;
                if (rr.uuid && lr.uuid && rr.uuid === lr.uuid) return true;
                return (
                  lr.title.trim().toLowerCase() === rr.title.trim().toLowerCase() &&
                  String(lr.dayOfWeek).toLowerCase() === String(rr.dayOfWeek).toLowerCase() &&
                  lr.time === rr.time
                );
              });
              if (match && match.id) {
                matchedRoutineIds.add(match.id);
                const localTs = parseUtcTimestampMs(match.updatedAt);
                const remoteTs = parseUtcTimestampMs(rr.updatedAt);
                const keepLocal = match.syncStatus === 'pending' && (localTs === 0 || remoteTs === 0 || localTs >= remoteTs);
                if (keepLocal) {
                  if (!match.uuid && rr.uuid) {
                    await db.dayReminders.update(match.id, { uuid: rr.uuid });
                  }
                } else {
                  await db.dayReminders.update(match.id, {
                    uuid: rr.uuid || match.uuid,
                    title: rr.title,
                    dayOfWeek: rr.dayOfWeek,
                    time: rr.time,
                    enabled: rr.enabled,
                    createdAt: rr.createdAt || match.createdAt,
                    updatedAt: rr.updatedAt || match.updatedAt,
                    syncStatus: 'synced'
                  });
                }
              } else {
                await db.dayReminders.add(rr);
              }
            }
            if (mappedRoutines.length > 0 || (hasHydratedBefore && !hasPendingSync)) {
              for (const lr of localRoutines) {
                if (lr.id && !matchedRoutineIds.has(lr.id)) {
                  const isPending = lr.syncStatus === 'pending' || (!lr.syncStatus && hasPendingSync);
                  if (!isPending) {
                    await db.dayReminders.delete(lr.id);
                  }
                }
              }
            } else if (localRoutines.length > 0) {
              needsBackgroundPush = true;
            }
          }
          const finalRoutines = await db.dayReminders.toArray();

          // D. Expenses (full history, no LIMIT 100 truncation, uuid + 1-to-1 legacy merge)
          if (hasExpensesField) {
            const localExpenses = await db.expenses.toArray();
            const matchedExpenseIds = new Set<number>();
            for (const re of mappedExpenses) {
              const match = localExpenses.find((le) => {
                if (le.id && matchedExpenseIds.has(le.id)) return false;
                if (re.uuid && le.uuid && re.uuid === le.uuid) return true;
                if (!le.uuid) {
                  return (
                    le.date === re.date &&
                    le.category === re.category &&
                    Number(le.amount) === Number(re.amount) &&
                    (le.note || '') === (re.note || '')
                  );
                }
                return false;
              });
              if (match && match.id) {
                matchedExpenseIds.add(match.id);
                const localTs = parseUtcTimestampMs(match.updatedAt);
                const remoteTs = parseUtcTimestampMs(re.updatedAt);
                const keepLocal = match.syncStatus === 'pending' && (localTs === 0 || remoteTs === 0 || localTs >= remoteTs);
                if (keepLocal) {
                  if (!match.uuid && re.uuid) {
                    await db.expenses.update(match.id, { uuid: re.uuid });
                  }
                } else {
                  await db.expenses.update(match.id, {
                    uuid: re.uuid || match.uuid,
                    date: re.date,
                    category: re.category,
                    amount: re.amount,
                    note: re.note,
                    createdAt: re.createdAt || match.createdAt,
                    updatedAt: re.updatedAt || match.updatedAt,
                    syncStatus: 'synced'
                  });
                }
              } else {
                await db.expenses.add(re);
              }
            }
            if (mappedExpenses.length > 0 || (hasHydratedBefore && !hasPendingSync)) {
              for (const le of localExpenses) {
                if (le.id && !matchedExpenseIds.has(le.id)) {
                  const isPending = le.syncStatus === 'pending' || (!le.syncStatus && hasPendingSync);
                  if (!isPending) {
                    await db.expenses.delete(le.id);
                  }
                }
              }
            }
          }
          const finalExpenses = await db.expenses.toArray();

          // E. Student Grades (uuid + subject key merge)
          if (hasGradesField) {
            const localGrades = await db.grades.toArray();
            const matchedGradeIds = new Set<number>();
            for (const rg of mappedGrades) {
              const match = localGrades.find((lg) => {
                if (lg.id && matchedGradeIds.has(lg.id)) return false;
                if (rg.uuid && lg.uuid && rg.uuid === lg.uuid) return true;
                if (!lg.uuid) {
                  return (
                    lg.subjectCode.trim().toLowerCase() === rg.subjectCode.trim().toLowerCase() &&
                    lg.subjectName.trim().toLowerCase() === rg.subjectName.trim().toLowerCase()
                  );
                }
                return false;
              });
              if (match && match.id) {
                matchedGradeIds.add(match.id);
                const localTs = parseUtcTimestampMs(match.updatedAt);
                const remoteTs = parseUtcTimestampMs(rg.updatedAt);
                const keepLocal = match.syncStatus === 'pending' && (localTs === 0 || remoteTs === 0 || localTs >= remoteTs);
                if (keepLocal) {
                  if (!match.uuid && rg.uuid) {
                    await db.grades.update(match.id, { uuid: rg.uuid });
                  }
                } else {
                  await db.grades.update(match.id, {
                    uuid: rg.uuid || match.uuid,
                    subjectCode: rg.subjectCode,
                    subjectName: rg.subjectName,
                    units: rg.units,
                    prelim: rg.prelim,
                    midterm: rg.midterm,
                    prefinal: rg.prefinal,
                    finals: rg.finals,
                    rawAverage: rg.rawAverage,
                    transmutedGrade: rg.transmutedGrade,
                    gradingScale: rg.gradingScale,
                    createdAt: rg.createdAt || match.createdAt,
                    updatedAt: rg.updatedAt || match.updatedAt,
                    syncStatus: 'synced'
                  });
                }
              } else {
                await db.grades.add(rg);
              }
            }
            if (mappedGrades.length > 0 || (hasHydratedBefore && !hasPendingSync)) {
              for (const lg of localGrades) {
                if (lg.id && !matchedGradeIds.has(lg.id)) {
                  const isPending = lg.syncStatus === 'pending' || (!lg.syncStatus && hasPendingSync);
                  if (!isPending) {
                    await db.grades.delete(lg.id);
                  }
                }
              }
            }
          }
          const finalGrades = await db.grades.toArray();

          return {
            schedulesChanged,
            finalSchedules,
            activeTasks,
            allTasksNow,
            finalRoutines,
            finalExpenses,
            finalGrades
          };
        }
      );

      // Persist standardized per-UID localStorage caches & update flags after atomic transaction
      const scheduleCount = txResult.finalSchedules.length;
      const taskCount = txResult.activeTasks.length;

      if (typeof window !== 'undefined' && targetUid) {
        localStorage.setItem(`skweladabaw_cached_schedules_${targetUid}`, JSON.stringify(txResult.finalSchedules));
        localStorage.setItem(`skweladabaw_cached_tasks_${targetUid}`, JSON.stringify(txResult.activeTasks));
        localStorage.setItem(`skweladabaw_cached_routines_${targetUid}`, JSON.stringify(txResult.finalRoutines));
        localStorage.setItem(`skweladabaw_cached_expenses_${targetUid}`, JSON.stringify(txResult.finalExpenses));
        localStorage.setItem(`skweladabaw_cached_grades_${targetUid}`, JSON.stringify(txResult.finalGrades));

        if (scheduleCount > 0) {
          localStorage.removeItem(scopedKey('skweladabaw_explicit_empty_schedules', targetUid));
          localStorage.removeItem('skweladabaw_explicit_empty_schedules');
        }
        if (taskCount > 0) {
          localStorage.removeItem(scopedKey('skweladabaw_explicit_empty_tasks', targetUid));
          localStorage.removeItem('skweladabaw_explicit_empty_tasks');
        }
      }

      try {
        if (txResult.schedulesChanged || scheduleCount === 0) {
          await scheduleAllClassSchedulesReminders(txResult.finalSchedules);
          await refreshUnremovableClassNotification(txResult.finalSchedules);
          syncScheduleToWidgets(txResult.finalSchedules);
        }
      } catch (_) {}

      syncTasksToWidgets(txResult.activeTasks);
      syncRoutinesToWidgets(txResult.finalRoutines);

      // 6. Restore Saved Transit Routes into UID-scoped localStorage
      if (Array.isArray(responseData.savedTransit)) {
        try {
          const remoteRoutes = responseData.savedTransit
            .map((st: any) => ({
              id: st.route_id || st.uuid || st.id || 'route',
              uuid: st.uuid || st.route_id || undefined,
              name: st.route_name || 'Route',
              mode: 'jeep',
              origin: st.origin || '',
              destination: st.destination || '',
              starredAt: st.created_at || new Date().toISOString()
            }))
            .filter((rt: any) => !isRecordTombstoned(rt.uuid || rt.id, rt.starredAt, tombstones.transit));

          const localRoutes = readScopedJson<any[]>('skweladabaw_favorite_routes', [], targetUid, false);
          if (remoteRoutes.length > 0) {
            const merged = [...remoteRoutes];
            if (hasPendingSync) {
              for (const lr of localRoutes) {
                const lid = lr.uuid || lr.id;
                if (lid && !merged.some((rr) => rr.id === lr.id || (rr.uuid && rr.uuid === lid))) {
                  merged.push(lr);
                }
              }
            }
            writeScopedJson('skweladabaw_favorite_routes', merged, targetUid);
          } else if (hasHydratedBefore && !hasPendingSync) {
            writeScopedJson('skweladabaw_favorite_routes', [], targetUid);
          } else if (localRoutes.length > 0) {
            needsBackgroundPush = true;
          }
        } catch (transErr) {
          console.warn('Could not restore saved transit routes:', transErr);
        }
      }

      // 7. Restore Settings into localStorage
      let restoredPersistentNotifSetting = false;
      if (responseData.settings) {
        const set = responseData.settings;
        try {
          if (set.baon_budget) localStorage.setItem('skweladabaw_baon_budget', String(set.baon_budget));
          if (set.baon_frequency) localStorage.setItem('skweladabaw_baon_frequency', set.baon_frequency);
          if (set.default_view) localStorage.setItem('skweladabaw_default_view', set.default_view);
          if (set.reminder_timing) localStorage.setItem('skweladabaw_reminder_timing', String(set.reminder_timing));
          if (set.theme) localStorage.setItem('skweladabaw_theme', set.theme);
          if (set.language) localStorage.setItem('skweladabaw_mascot_language', set.language);
          if (set.persistent_next_class !== undefined && set.persistent_next_class !== null) {
            localStorage.setItem('skweladabaw_persistent_next_class', Number(set.persistent_next_class) === 1 ? 'true' : 'false');
            restoredPersistentNotifSetting = true;
          }
          if (set.persistent_theme) {
            localStorage.setItem('skweladabaw_persistent_theme', set.persistent_theme);
            restoredPersistentNotifSetting = true;
          }
          if (set.connect_allowance !== undefined && set.connect_allowance !== null) {
            localStorage.setItem('skweladabaw_connect_allowance', Number(set.connect_allowance) === 1 ? 'true' : 'false');
          }
          if (set.weather_alerts_enabled !== undefined && set.weather_alerts_enabled !== null) {
            const isAlertsOn = Number(set.weather_alerts_enabled) === 1;
            localStorage.setItem('skweladabaw_weather_alerts_enabled', isAlertsOn ? 'true' : 'false');
            syncWeatherAlertPreference(isAlertsOn);
          }
          if (set.tap_fx_style) localStorage.setItem('skweladabaw_tap_fx_style', set.tap_fx_style);
          if (set.tap_fx_speed) localStorage.setItem('skweladabaw_tap_fx_speed', set.tap_fx_speed);
          if (set.sound_enabled !== undefined && set.sound_enabled !== null) {
            localStorage.setItem('skweladabaw_sound_enabled', Number(set.sound_enabled) === 1 ? 'true' : 'false');
          }
        } catch {}
      }

      // Sync ongoing status bar card & Ingat commute alerts after settings + schedules are restored
      try {
        if (restoredPersistentNotifSetting) {
          await refreshUnremovableClassNotification(txResult.finalSchedules);
        }
        if (typeof window !== 'undefined' && (restoredPersistentNotifSetting || txResult.schedulesChanged || scheduleCount === 0)) {
          window.dispatchEvent(new Event('skweladabaw_persistent_notif_changed'));
        }
        scheduleCommuteAndEasterNotifications(txResult.finalSchedules).catch(() => {});
      } catch (_) {}

      // 9. Restore Saved Commuter Places into UID-scoped localStorage
      if (Array.isArray(responseData.savedPlaces)) {
        try {
          const remotePlaces = responseData.savedPlaces
            .map((sp: any) => ({
              id: sp.place_id || sp.uuid || sp.id || 'place-home',
              uuid: sp.uuid || sp.place_id || undefined,
              type: sp.place_type || sp.type || 'custom',
              name: sp.name || 'Place',
              address: sp.address || '',
              lat: Number(sp.lat) || 0,
              lng: Number(sp.lng) || 0,
              updatedAt: sp.updated_at || sp.created_at || new Date().toISOString()
            }))
            .filter((pl: any) => !isRecordTombstoned(pl.uuid || pl.id, pl.updatedAt, tombstones.places));

          const localPlaces = readScopedJson<any[]>('skweladabaw_saved_places', [], targetUid, false);
          if (remotePlaces.length > 0) {
            const merged = [...remotePlaces];
            if (hasPendingSync) {
              for (const lp of localPlaces) {
                if (lp.id && !merged.some((rp) => rp.id === lp.id)) {
                  merged.push(lp);
                }
              }
            }
            writeScopedJson('skweladabaw_saved_places', merged, targetUid);
          } else if (hasHydratedBefore && !hasPendingSync) {
            writeScopedJson('skweladabaw_saved_places', [], targetUid);
          } else if (localPlaces.length > 0) {
            needsBackgroundPush = true;
          }
        } catch (placeErr) {
          console.warn('Could not restore saved places:', placeErr);
        }
      }

      // 10. Restore Bulletin Bookmarks into UID-scoped localStorage
      if (Array.isArray(responseData.bookmarkedBulletins)) {
        try {
          const tombBm = new Set(tombstones.bookmarks || []);
          const remoteBm: string[] = responseData.bookmarkedBulletins
            .map((id: any) => String(id))
            .filter((id: string) => !tombBm.has(id));
          const localBm = readScopedJson<string[]>('skweladabaw_bookmarked_bulletins', [], targetUid, false);
          const mergedSet = new Set(remoteBm);
          if (hasPendingSync) {
            for (const id of localBm) {
              if (!tombBm.has(String(id))) mergedSet.add(String(id));
            }
          }
          writeScopedJson('skweladabaw_bookmarked_bulletins', Array.from(mergedSet), targetUid);
        } catch (bkErr) {
          console.warn('Could not restore bookmarked bulletins:', bkErr);
        }
      }

      if (typeof window !== 'undefined' && targetUid) {
        localStorage.setItem(`skweladabaw_has_hydrated_${targetUid}`, 'true');
      }

      if (!skipAutoQueue && needsBackgroundPush) {
        queueCloudSync(restoredSession);
      }

      return {
        restored: true,
        scheduleCount,
        taskCount,
        message: 'Successfully restored student cloud data'
      };
    }
  } catch (err: any) {
    console.warn('Cloud sync restore note:', err?.message || err);
  }

  return { restored: false, scheduleCount: 0, taskCount: 0 };
  });
}

export const PENDING_SYNC_KEY = 'skweladabaw_has_pending_cloud_sync';
export const LAST_SYNC_KEY = 'skweladabaw_last_sync_timestamp';
export type SyncStatusState = 'synced' | 'syncing' | 'pending' | 'offline_pending';

let syncTimeout: any = null;
let isLifecycleInitialized = false;

function hasPendingFlagOrTombstones(uid?: string): boolean {
  if (typeof window === 'undefined') return false;
  return (
    localStorage.getItem(PENDING_SYNC_KEY) === 'true' ||
    localStorage.getItem('skweladabaw_pending_sync') === 'true' ||
    localStorage.getItem('skweladabaw_profile_dirty') === 'true' ||
    hasPendingTombstones(uid)
  );
}

async function hasAnyPendingLocalMutations(uid?: string): Promise<boolean> {
  if (hasPendingFlagOrTombstones(uid)) return true;
  try {
    const [pendingTasksCount, pendingSchedCount, pendingRoutineCount, pendingExpenseCount, pendingGradeCount] =
      await Promise.all([
        db.tasks.where('sync_status').anyOf(['pending_create', 'pending_update', 'pending_delete']).count(),
        db.schedules.filter((s) => s.syncStatus === 'pending' || !s.uuid).count(),
        db.dayReminders.filter((r) => r.syncStatus === 'pending' || !r.uuid).count(),
        db.expenses.filter((e) => e.syncStatus === 'pending' || !e.uuid).count(),
        db.grades.filter((g) => g.syncStatus === 'pending' || !g.uuid).count()
      ]);
    return (
      pendingTasksCount > 0 ||
      pendingSchedCount > 0 ||
      pendingRoutineCount > 0 ||
      pendingExpenseCount > 0 ||
      pendingGradeCount > 0
    );
  } catch {
    return false;
  }
}

export async function hasPendingLocalSync(uid?: string): Promise<boolean> {
  return hasAnyPendingLocalMutations(uid);
}

function notifySyncStatus(status: SyncStatusState, timestamp?: string): void {
  if (typeof window === 'undefined') return;
  try {
    // Emit isOnline: true only after a confirmed successful HTTP sync, never on 'syncing'
    if (status === 'synced') {
      window.dispatchEvent(new CustomEvent('skwela_network_activity', {
        detail: { isOnline: true }
      }));
    }
    window.dispatchEvent(new CustomEvent('skweladabaw_sync_status_changed', {
      detail: {
        status,
        timestamp: timestamp || localStorage.getItem(LAST_SYNC_KEY) || null
      }
    }));
  } catch (_) {}
}

export function getCloudSyncState(): { status: SyncStatusState; lastSyncedAt: string | null } {
  if (typeof window === 'undefined') {
    return { status: 'synced', lastSyncedAt: null };
  }
  const hasPending = hasPendingFlagOrTombstones();
  const lastSyncedAt = localStorage.getItem(LAST_SYNC_KEY);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (hasPending) {
    return { status: isOnline ? 'pending' : 'offline_pending', lastSyncedAt };
  }
  return { status: 'synced', lastSyncedAt };
}

/**
 * Initializes network and lifecycle listeners to automatically drain
 * any pending offline mutations as soon as connectivity resumes or app becomes active.
 */
export function initCloudSyncLifecycle(): void {
  if (isLifecycleInitialized || typeof window === 'undefined') return;
  isLifecycleInitialized = true;

  const triggerIfNeeded = () => {
    hasAnyPendingLocalMutations().then((needed) => {
      if (needed) queueCloudSync();
    }).catch(() => {});
  };

  // 1. Online Network Event Listener
  window.addEventListener('online', triggerIfNeeded);

  // 2. Visibility change listener (Web & PWA resume)
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      triggerIfNeeded();
    }
  });

  // 3. Capacitor Native App State Listener (Android foreground resume)
  if (Capacitor.isNativePlatform()) {
    try {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          triggerIfNeeded();
        }
      });
    } catch (_) {}
  }
}

// Auto-initialize on module evaluation in browser environments
if (typeof window !== 'undefined') {
  initCloudSyncLifecycle();
}

/**
 * Trigger background synchronization from local Dexie to MySQL
 * Debounced to bundle rapid successive edits into a single atomic push.
 */
export function queueCloudSync(session?: StudentAuthSession, immediate = false): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PENDING_SYNC_KEY, 'true');
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    notifySyncStatus(isOnline ? 'pending' : 'offline_pending');
  }

  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  if (immediate && (typeof navigator === 'undefined' || navigator.onLine)) {
    syncLocalDataToCloud(session).catch((err) => {
      console.warn('Immediate cloud sync note:', err);
    });
    return;
  }

  syncTimeout = setTimeout(() => {
    syncLocalDataToCloud(session).catch((err) => {
      console.warn('Background cloud sync note:', err);
    });
  }, 1800);
}

/**
 * Execute push of local Dexie data to MySQL server
 */
export async function syncLocalDataToCloud(session?: StudentAuthSession): Promise<boolean> {
  const currentSession = session || getSavedSession();
  if (!currentSession || !currentSession.isLoggedIn || !currentSession.uid) {
    return false;
  }

  const uid = currentSession.uid;

  // Enforce strict active auth identity match before pushing any data
  const localAuthToken = typeof window !== 'undefined' ? localStorage.getItem('skweladabaw_auth_token') : null;
  if (localAuthToken) {
    const localTokenUid = extractJwtTokenUid(localAuthToken);
    if (localTokenUid && localTokenUid !== uid) {
      console.warn('[cloudSyncService] Refusing push: local auth token UID does not match session UID', { uid, localTokenUid });
      return false;
    }
  } else {
    if (isFirebaseConfigured && auth && auth.currentUser && auth.currentUser.uid !== uid) {
      console.warn('[cloudSyncService] Refusing push: active Firebase user does not match target session UID', {
        uid,
        activeUid: auth.currentUser.uid
      });
      return false;
    }
    if (Capacitor.isNativePlatform()) {
      try {
        const curNative = await FirebaseAuthentication.getCurrentUser();
        if (curNative?.user?.uid && curNative.user.uid !== uid) {
          console.warn('[cloudSyncService] Refusing push: active native Firebase UID mismatch', {
            uid,
            activeUid: curNative.user.uid
          });
          return false;
        }
      } catch (_) {}
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PENDING_SYNC_KEY, 'true');
      notifySyncStatus('offline_pending');
    }
    return false;
  }

  const token = await getFirebaseIdToken();
  if (!token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PENDING_SYNC_KEY, 'true');
      notifySyncStatus('offline_pending');
    }
    return false;
  }

  const tokenUid = extractJwtTokenUid(token);
  if (tokenUid && tokenUid !== uid) {
    console.warn('[cloudSyncService] Refusing push: resolved JWT subject does not match target session UID', { uid, tokenUid });
    return false;
  }

  notifySyncStatus('syncing');

  return enqueueSyncOperation(async (): Promise<boolean> => {
  try {
    const tombstoneSnapshot = readSyncTombstones(uid);
    const [localSchedules, allLocalTasks, localRoutines, localExpenses, localGrades] = await Promise.all([
      db.schedules.toArray(),
      db.tasks.toArray(),
      db.dayReminders.toArray(),
      db.expenses.toArray(),
      db.grades.toArray()
    ]);

    const localTasks = allLocalTasks.filter((t) => t.sync_status !== 'pending_delete');
    const pendingDeleteTasks = allLocalTasks.filter((t) => t.sync_status === 'pending_delete');

    const savedTransitRoutes = readScopedJson<any[]>('skweladabaw_favorite_routes', [], uid);
    const savedPlacesList = readScopedJson<any[]>('skweladabaw_saved_places', [], uid);
    const bookmarkedBulletinsList = readScopedJson<string[]>('skweladabaw_bookmarked_bulletins', [], uid);

    const hasHydrated = typeof window !== 'undefined' && localStorage.getItem(`skweladabaw_has_hydrated_${uid}`) === 'true';
    const isExplicitEmptySchedules = typeof window !== 'undefined' &&
      localStorage.getItem(scopedKey('skweladabaw_explicit_empty_schedules', uid)) === 'true';
    const isExplicitEmptyTasks = typeof window !== 'undefined' &&
      localStorage.getItem(scopedKey('skweladabaw_explicit_empty_tasks', uid)) === 'true';

    const nowIso = new Date().toISOString();
    const schedPushMeta = localSchedules.map((s) => ({
      id: s.id,
      uuid: s.uuid || generateSyncUUID('sched'),
      hadUuid: Boolean(s.uuid),
      updatedAt: s.updatedAt || s.createdAt || nowIso
    }));
    const taskPushMeta = localTasks.map((t) => ({
      id: t.id,
      uuid: t.uuid,
      updatedAt: t.updated_at
    }));
    const pendingDeleteMeta = pendingDeleteTasks.map((t) => ({
      id: t.id,
      uuid: t.uuid,
      updatedAt: t.updated_at
    }));
    const routinePushMeta = localRoutines.map((r) => ({
      id: r.id,
      uuid: r.uuid || generateSyncUUID('routine'),
      hadUuid: Boolean(r.uuid),
      updatedAt: r.updatedAt || r.createdAt || nowIso
    }));
    const expensePushMeta = localExpenses.map((e) => ({
      id: e.id,
      uuid: e.uuid || generateSyncUUID('exp'),
      hadUuid: Boolean(e.uuid),
      updatedAt: e.updatedAt || e.createdAt || nowIso
    }));
    const gradePushMeta = localGrades.map((g) => ({
      id: g.id,
      uuid: g.uuid || generateSyncUUID('grade'),
      hadUuid: Boolean(g.uuid),
      updatedAt: g.updatedAt || g.createdAt || nowIso
    }));

    const payload: any = {
      profile: {
        username: currentSession.username,
        displayName: currentSession.name,
        campusId: currentSession.campusId,
        course: currentSession.course,
        yearLevel: currentSession.yearLevel,
        role: currentSession.role,
        avatar: currentSession.avatar,
        age: currentSession.age,
        gender: currentSession.gender,
        isSetupComplete: hasCompletedOnboarding()
      }
    };

    if (tombstoneSnapshot.clearSchedulesBefore) {
      payload.clearSchedulesBefore = tombstoneSnapshot.clearSchedulesBefore;
    }
    if (tombstoneSnapshot.schedules.length > 0) {
      payload.deletedScheduleUuids = tombstoneSnapshot.schedules;
    }
    if (localSchedules.length > 0 || isExplicitEmptySchedules || hasHydrated || tombstoneSnapshot.schedules.length > 0 || tombstoneSnapshot.clearSchedulesBefore) {
      payload.schedules = localSchedules.map((s, idx) => ({
        uuid: schedPushMeta[idx].uuid,
        legacy: !schedPushMeta[idx].hadUuid,
        ofrCode: s.ofrCode,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        room: s.room,
        days: Array.isArray(s.days) ? s.days.join(',') : s.days,
        startTime: s.startTime,
        endTime: s.endTime,
        color: s.color,
        section: s.ofrCode || '',
        instructor: s.instructor,
        reminderMinutes: (s.reminderMinutes !== undefined && s.reminderMinutes !== null)
          ? s.reminderMinutes
          : Number(localStorage.getItem('skweladabaw_reminder_timing') || 10),
        createdAt: s.createdAt || schedPushMeta[idx].updatedAt,
        updatedAt: schedPushMeta[idx].updatedAt
      }));
    }

    const combinedDeletedTaskUuids = [
      ...tombstoneSnapshot.tasks,
      ...pendingDeleteMeta.filter((td) => Boolean(td.uuid)).map((td) => ({ uuid: td.uuid, deletedAt: td.updatedAt }))
    ];
    if (combinedDeletedTaskUuids.length > 0) {
      payload.deletedTaskUuids = combinedDeletedTaskUuids;
    }
    if (localTasks.length > 0 || isExplicitEmptyTasks || hasHydrated || combinedDeletedTaskUuids.length > 0) {
      payload.tasks = localTasks.map((t) => ({
        uuid: t.uuid,
        title: t.title,
        description: t.notes || '',
        dueDate: t.dueDate,
        dueTime: t.dueTime || null,
        reminderTime: t.reminderTime || null,
        priority: t.priority,
        completed: (t.completed || t.is_completed) ? 1 : 0,
        is_completed: (t.is_completed || t.completed) ? 1 : 0,
        completed_at: t.completed_at || null,
        created_at: t.created_at || nowIso,
        updated_at: t.updated_at || nowIso,
        subjectCode: t.subjectCode
      }));
    }

    if (tombstoneSnapshot.routines.length > 0) {
      payload.deletedRoutineUuids = tombstoneSnapshot.routines;
    }
    if (localRoutines.length > 0 || hasHydrated || tombstoneSnapshot.routines.length > 0) {
      payload.routines = localRoutines.map((r, idx) => ({
        uuid: routinePushMeta[idx].uuid,
        legacy: !routinePushMeta[idx].hadUuid,
        title: r.title,
        dayOfWeek: r.dayOfWeek,
        time: r.time,
        enabled: r.enabled ? 1 : 0,
        createdAt: r.createdAt || routinePushMeta[idx].updatedAt,
        updatedAt: routinePushMeta[idx].updatedAt
      }));
    }

    if (tombstoneSnapshot.expenses.length > 0) {
      payload.deletedExpenseUuids = tombstoneSnapshot.expenses;
    }
    if (localExpenses.length > 0 || hasHydrated || tombstoneSnapshot.expenses.length > 0) {
      payload.expenses = localExpenses.map((e, idx) => ({
        uuid: expensePushMeta[idx].uuid,
        legacy: !expensePushMeta[idx].hadUuid,
        amount: e.amount,
        category: e.category,
        note: e.note || '',
        date: e.date,
        createdAt: e.createdAt || expensePushMeta[idx].updatedAt,
        updatedAt: expensePushMeta[idx].updatedAt
      }));
    }

    if (tombstoneSnapshot.transit.length > 0) {
      payload.deletedTransitUuids = tombstoneSnapshot.transit;
    }
    if (savedTransitRoutes.length > 0 || hasHydrated || tombstoneSnapshot.transit.length > 0) {
      payload.savedTransit = savedTransitRoutes.map((st) => ({
        uuid: st.uuid || st.id || undefined,
        legacy: !st.uuid,
        routeId: st.id || '',
        routeName: st.name || '',
        origin: st.origin || '',
        destination: st.destination || '',
        fare: st.fare || null,
        notes: st.notes || '',
        createdAt: st.starredAt || undefined,
        updatedAt: st.updatedAt || st.starredAt || undefined
      }));
    }

    if (tombstoneSnapshot.grades.length > 0) {
      payload.deletedGradeUuids = tombstoneSnapshot.grades;
    }
    if (localGrades.length > 0 || hasHydrated || tombstoneSnapshot.grades.length > 0) {
      payload.grades = localGrades.map((g, idx) => ({
        uuid: gradePushMeta[idx].uuid,
        legacy: !gradePushMeta[idx].hadUuid,
        subjectCode: g.subjectCode,
        subjectName: g.subjectName,
        units: g.units,
        prelim: g.prelim,
        midterm: g.midterm,
        prefinal: g.prefinal,
        finals: g.finals,
        rawAverage: g.rawAverage,
        transmutedGrade: g.transmutedGrade,
        gradingScale: g.gradingScale,
        createdAt: g.createdAt || gradePushMeta[idx].updatedAt,
        updatedAt: gradePushMeta[idx].updatedAt
      }));
    }

    if (tombstoneSnapshot.places.length > 0) {
      payload.deletedPlaceUuids = tombstoneSnapshot.places;
    }
    if (savedPlacesList.length > 0 || hasHydrated || tombstoneSnapshot.places.length > 0) {
      payload.savedPlaces = savedPlacesList.map((p) => ({
        uuid: p.uuid || p.id || undefined,
        legacy: !p.uuid,
        id: p.id,
        type: p.type,
        name: p.name,
        address: p.address || '',
        lat: p.lat,
        lng: p.lng,
        updatedAt: p.updatedAt || undefined
      }));
    }

    if (tombstoneSnapshot.bookmarks.length > 0) {
      payload.deletedBookmarkIds = tombstoneSnapshot.bookmarks;
    }
    if (bookmarkedBulletinsList.length > 0 || hasHydrated || tombstoneSnapshot.bookmarks.length > 0) {
      payload.bookmarkedBulletins = bookmarkedBulletinsList;
    }

    payload.settings = {
        baonBudget: Number(localStorage.getItem('skweladabaw_baon_budget') || 150),
        baonFrequency: localStorage.getItem('skweladabaw_baon_frequency') || 'daily',
        defaultView: localStorage.getItem('skweladabaw_default_view') || 'daily',
        reminderTiming: Number(localStorage.getItem('skweladabaw_reminder_timing') || 15),
        theme: localStorage.getItem('skweladabaw_theme') || 'davao-classic-blue',
        language: localStorage.getItem('skweladabaw_mascot_language') || 'en',
        tapFx: localStorage.getItem('skweladabaw_tap_fx_enabled') !== 'false' ? 1 : 0,
        tapSound: localStorage.getItem('skweladabaw_tap_fx_sound') || 'chirp',
        persistentNextClass: localStorage.getItem('skweladabaw_persistent_next_class') === 'true' ? 1 : 0,
        persistentTheme: localStorage.getItem('skweladabaw_persistent_theme') || 'midnight',
        connectAllowance: localStorage.getItem('skweladabaw_connect_allowance') === 'true' ? 1 : 0,
        weatherAlertsEnabled: localStorage.getItem('skweladabaw_weather_alerts_enabled') !== 'false' ? 1 : 0,
        tapFxStyle: localStorage.getItem('skweladabaw_tap_fx_style') || 'ripple',
        tapFxSpeed: localStorage.getItem('skweladabaw_tap_fx_speed') || 'normal',
        soundEnabled: localStorage.getItem('skweladabaw_sound_enabled') !== 'false' ? 1 : 0
      };

    const postUrl = `${SYNC_API_URL}?token=${encodeURIComponent(token)}`;
    let pushSucceeded = false;
    let pushResponseData: any = null;

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.post({
        url: postUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: payload,
        connectTimeout: 8000,
        readTimeout: 8000
      });
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      pushResponseData = data;
      pushSucceeded = Boolean(res.status >= 200 && res.status < 300 && data?.success);
      if (!pushSucceeded) {
        console.warn('MySQL sync push response status:', res.status, data);
      }
    } else {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 12000) : null;
      try {
        const res = await fetch(postUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller?.signal
        });
        if (res.ok) {
          const data = await res.json();
          pushResponseData = data;
          pushSucceeded = Boolean(data?.success);
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    if (!pushSucceeded) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(PENDING_SYNC_KEY, 'true');
        notifySyncStatus('offline_pending');
      }
      return false;
    }

    updateServerClockOffset(pushResponseData?.serverNow || pushResponseData?.timestamp);

    const confirmedDeletes = pushResponseData?.confirmedDeletes;
    const confirmedTaskSet = confirmedDeletes && Array.isArray(confirmedDeletes.tasks)
      ? new Set<string>(confirmedDeletes.tasks.map((u: any) => String(u)))
      : null;

    if (confirmedDeletes && typeof confirmedDeletes === 'object') {
      const filterByConfirmed = (entries: Array<{ uuid: string; deletedAt: string }>, arr: any) => {
        if (!Array.isArray(arr)) return [];
        const allowed = new Set<string>(arr.map((u: any) => String(u)));
        return entries.filter((e) => allowed.has(e.uuid));
      };
      const bmAllowed = Array.isArray(confirmedDeletes.bookmarks)
        ? new Set<string>(confirmedDeletes.bookmarks.map((u: any) => String(u)))
        : new Set<string>();
      const confirmedSnapshot: SyncTombstones = {
        schedules: filterByConfirmed(tombstoneSnapshot.schedules, confirmedDeletes.schedules),
        routines: filterByConfirmed(tombstoneSnapshot.routines, confirmedDeletes.routines),
        expenses: filterByConfirmed(tombstoneSnapshot.expenses, confirmedDeletes.expenses),
        transit: filterByConfirmed(tombstoneSnapshot.transit, confirmedDeletes.transit),
        grades: filterByConfirmed(tombstoneSnapshot.grades, confirmedDeletes.grades),
        places: filterByConfirmed(tombstoneSnapshot.places, confirmedDeletes.places),
        tasks: filterByConfirmed(tombstoneSnapshot.tasks, confirmedDeletes.tasks),
        bookmarks: tombstoneSnapshot.bookmarks.filter((id) => bmAllowed.has(id)),
        clearSchedulesBefore: confirmedDeletes.clearSchedules === true ? tombstoneSnapshot.clearSchedulesBefore : undefined
      };
      clearSyncedTombstones(confirmedSnapshot, uid);
    } else {
      clearSyncedTombstones(tombstoneSnapshot, uid);
    }

    await db.transaction(
      'rw',
      [db.schedules, db.tasks, db.dayReminders, db.expenses, db.grades],
      async () => {
        for (const meta of schedPushMeta) {
          if (!meta.id) continue;
          const cur = await db.schedules.get(meta.id);
          if (!cur) continue;
          const curTs = cur.updatedAt || cur.createdAt || meta.updatedAt;
          if (curTs === meta.updatedAt) {
            await db.schedules.update(meta.id, { uuid: cur.uuid || meta.uuid, syncStatus: 'synced' });
          } else if (!cur.uuid) {
            await db.schedules.update(meta.id, { uuid: meta.uuid });
          }
        }

        for (const meta of taskPushMeta) {
          const cur = await db.tasks.where('uuid').equals(meta.uuid).first();
          if (cur && cur.sync_status !== 'pending_delete' && cur.updated_at === meta.updatedAt && cur.id) {
            await db.tasks.update(cur.id, { sync_status: 'synced' });
          }
        }
        for (const td of pendingDeleteMeta) {
          if (td.uuid) {
            if (confirmedTaskSet && !confirmedTaskSet.has(td.uuid)) {
              continue;
            }
            const cur = await db.tasks.where('uuid').equals(td.uuid).first();
            if (cur && cur.sync_status === 'pending_delete' && cur.id) {
              await db.tasks.delete(cur.id);
            }
          } else if (td.id) {
            await db.tasks.delete(td.id);
          }
        }

        for (const meta of routinePushMeta) {
          if (!meta.id) continue;
          const cur = await db.dayReminders.get(meta.id);
          if (!cur) continue;
          const curTs = cur.updatedAt || cur.createdAt || meta.updatedAt;
          if (curTs === meta.updatedAt) {
            await db.dayReminders.update(meta.id, { uuid: cur.uuid || meta.uuid, syncStatus: 'synced' });
          } else if (!cur.uuid) {
            await db.dayReminders.update(meta.id, { uuid: meta.uuid });
          }
        }

        for (const meta of expensePushMeta) {
          if (!meta.id) continue;
          const cur = await db.expenses.get(meta.id);
          if (!cur) continue;
          const curTs = cur.updatedAt || cur.createdAt || meta.updatedAt;
          if (curTs === meta.updatedAt) {
            await db.expenses.update(meta.id, { uuid: cur.uuid || meta.uuid, syncStatus: 'synced' });
          } else if (!cur.uuid) {
            await db.expenses.update(meta.id, { uuid: meta.uuid });
          }
        }

        for (const meta of gradePushMeta) {
          if (!meta.id) continue;
          const cur = await db.grades.get(meta.id);
          if (!cur) continue;
          const curTs = cur.updatedAt || cur.createdAt || meta.updatedAt;
          if (curTs === meta.updatedAt) {
            await db.grades.update(meta.id, { uuid: cur.uuid || meta.uuid, syncStatus: 'synced' });
          } else if (!cur.uuid) {
            await db.grades.update(meta.id, { uuid: meta.uuid });
          }
        }
      }
    );

    if (typeof window !== 'undefined') {
      localStorage.setItem(`skweladabaw_has_hydrated_${uid}`, 'true');
      localStorage.removeItem('skweladabaw_pending_sync');
      localStorage.removeItem('skweladabaw_profile_dirty');

      const stillPending = await hasAnyPendingLocalMutations(uid);
      if (!stillPending) {
        localStorage.removeItem(PENDING_SYNC_KEY);
        const now = new Date().toISOString();
        localStorage.setItem(LAST_SYNC_KEY, now);
        notifySyncStatus('synced', now);
      } else {
        localStorage.setItem(PENDING_SYNC_KEY, 'true');
        notifySyncStatus('pending');
      }
    }
    return true;
  } catch (err) {
    console.warn('Failed to push sync to MySQL:', err);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PENDING_SYNC_KEY, 'true');
      notifySyncStatus('offline_pending');
    }
    return false;
  }
  });
}

/**
 * Executes full bidirectional synchronization:
 * 1. Pushes any local mutations/tombstones to cloud MySQL FIRST (preserving offline edits)
 * 2. Hydrates latest cloud state into local Dexie database ONLY after push succeeds
 * 3. Clears pending flag and emits 'synced' ONLY when pushSuccess === true
 */
export async function syncCloudDataBiDirectional(): Promise<{
  success: boolean;
  message: string;
  scheduleCount: number;
  taskCount: number;
  lastSyncedAt: string;
}> {
  const session = getSavedSession();
  if (!session || !session.isLoggedIn || !session.uid) {
    return {
      success: false,
      message: 'Please sign in to sync with cloud.',
      scheduleCount: 0,
      taskCount: 0,
      lastSyncedAt: ''
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notifySyncStatus('offline_pending');
    return {
      success: false,
      message: 'Device is offline. Local changes remain queued for sync.',
      scheduleCount: await db.schedules.count(),
      taskCount: (await db.tasks.toArray()).filter((t) => t.sync_status !== 'pending_delete').length,
      lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY) || ''
    };
  }

  notifySyncStatus('syncing');

  try {
    const needsPush = await hasAnyPendingLocalMutations(session.uid);
    let pushSuccess = true;
    if (needsPush) {
      pushSuccess = await syncLocalDataToCloud(session);
      if (!pushSuccess) {
        return {
          success: false,
          message: 'Could not upload local changes. Your edits stay queued offline.',
          scheduleCount: await db.schedules.count(),
          taskCount: (await db.tasks.toArray()).filter((t) => t.sync_status !== 'pending_delete').length,
          lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY) || ''
        };
      }
    }

    const pullResult = await restoreUserData(session.uid, undefined, true);
    if (!pullResult.restored) {
      notifySyncStatus('offline_pending');
      return {
        success: false,
        message: pullResult.message || 'Could not reach cloud server. Please try again.',
        scheduleCount: await db.schedules.count(),
        taskCount: (await db.tasks.toArray()).filter((t) => t.sync_status !== 'pending_delete').length,
        lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY) || ''
      };
    }

    const now = new Date().toISOString();
    if (typeof window !== 'undefined' && pushSuccess) {
      const remainingPending = await hasAnyPendingLocalMutations(session.uid);
      if (!remainingPending) {
        localStorage.removeItem(PENDING_SYNC_KEY);
        localStorage.setItem(LAST_SYNC_KEY, now);
        notifySyncStatus('synced', now);
      } else {
        localStorage.setItem(PENDING_SYNC_KEY, 'true');
        notifySyncStatus('pending', now);
      }
    }

    return {
      success: true,
      message: 'Timetable and commuter data fully synchronized with cloud.',
      scheduleCount: pullResult.scheduleCount,
      taskCount: pullResult.taskCount,
      lastSyncedAt: now
    };
  } catch (err: any) {
    notifySyncStatus('offline_pending');
    return {
      success: false,
      message: err?.message || 'Sync encountered a network issue.',
      scheduleCount: 0,
      taskCount: 0,
      lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY) || ''
    };
  }
}

/**
 * Toggle single task completion status directly in MySQL cloud
 * Returns true if persisted or if operating as offline guest, false on network/auth error.
 */
export async function toggleTaskInCloud(task: TaskItem, completed: boolean): Promise<boolean> {
  const currentSession = getSavedSession();
  if (!currentSession || !currentSession.isLoggedIn) {
    // Guest user session: local Dexie is authorative, return success
    return true;
  }

  const token = await getFirebaseIdToken();
  if (!token) return false;

  const payload = {
    action: 'toggle_task',
    taskId: task.id,
    uuid: task.uuid,
    title: task.title,
    dueDate: task.dueDate || '',
    dueTime: task.dueTime || '',
    reminderTime: task.reminderTime || '',
    notes: task.notes || '',
    priority: task.priority || 'medium',
    subjectCode: task.subjectCode || '',
    completed: completed ? 1 : 0
  };

  const postUrl = `${SYNC_API_URL}?token=${encodeURIComponent(token)}`;

  try {
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.post({
        url: postUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: payload,
        connectTimeout: 6000,
        readTimeout: 6000
      });
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      return Boolean(res.status >= 200 && res.status < 300 && data?.success);
    } else {
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return Boolean(data?.success);
      }
      return false;
    }
  } catch (err) {
    console.warn('Failed to sync task toggle to cloud:', err);
    return false;
  }
}

