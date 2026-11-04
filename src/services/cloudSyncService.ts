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
import { ClassSchedule, TaskItem, DayReminderItem } from '../types';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { scheduleAllClassSchedulesReminders, refreshUnremovableClassNotification } from './notificationService';
import { syncScheduleToWidgets, syncTasksToWidgets } from './widgetService';

const SYNC_API_URL = 'https://skweladabaw.kurzyrio.site/api/sync.php';

export interface CloudSyncResult {
  restored: boolean;
  scheduleCount: number;
  taskCount: number;
  message?: string;
  error?: string;
}

/**
 * Helper to fetch raw token from Native or Web Firebase SDK
 */
async function fetchRawFirebaseToken(): Promise<string | null> {
  // 0. Check for SkwelaDabaw Phone Auth session token
  const localToken = localStorage.getItem('skweladabaw_auth_token');
  if (localToken) {
    return localToken;
  }

  // 1. Native Android (Capacitor Firebase Auth)
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await FirebaseAuthentication.getIdToken();
      if (res && res.token) {
        return res.token;
      }
    } catch (e) {
      console.warn('Native getIdToken notice:', e);
    }
  }

  // 2. Web Firebase JS SDK fallback
  if (isFirebaseConfigured && auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(false);
    } catch (err) {
      console.warn('Could not fetch Firebase ID token from web SDK:', err);
    }
  }

  // 3. Fallback: Check if native user exists and force token refresh
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
export async function getFirebaseIdToken(): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const token = await fetchRawFirebaseToken();
    if (token) return token;
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return null;
}

/**
 * Restore user profile, timetable schedules, tasks, and settings from MySQL
 * Hydrates local Dexie.js database for instant 0ms offline access.
 */
export async function restoreUserData(
  uid?: string,
  providedToken?: string
): Promise<CloudSyncResult> {
  const token = providedToken || (await getFirebaseIdToken());
  if (!token) {
    return { restored: false, scheduleCount: 0, taskCount: 0, message: 'No auth token available' };
  }

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
      const u = responseData.user;
      const currentSaved = getSavedSession();
      const hasPendingSync = typeof window !== 'undefined' && (
        localStorage.getItem(PENDING_SYNC_KEY) === 'true' ||
        localStorage.getItem('skweladabaw_pending_sync') === 'true' ||
        localStorage.getItem('skweladabaw_profile_dirty') === 'true'
      );
      const isProfileDirty = typeof window !== 'undefined' && localStorage.getItem('skweladabaw_profile_dirty') === 'true';

      const isLocalCampusCustom = Boolean(currentSaved.campusId && currentSaved.campusId !== 'addu-jacinto');
      const isCloudCampusDefault = !u.campus_id || u.campus_id === 'addu-jacinto';
      const shouldPreserveLocalCampus = isProfileDirty || hasPendingSync || (isLocalCampusCustom && isCloudCampusDefault) || (Boolean(currentSaved.campusId) && currentSaved.campusId !== u.campus_id && hasPendingSync);

      const hasRealLocalUsername = Boolean(currentSaved.username && !/^student_[a-f0-9]{6,16}$/i.test(currentSaved.username));
      const isCloudUsernameValid = Boolean(u.username && !/^student_[a-f0-9]{6,16}$/i.test(u.username));
      const resolvedUsername = isCloudUsernameValid ? u.username : (hasRealLocalUsername ? currentSaved.username : (u.username || ''));

      const isLocalNameCustom = Boolean(currentSaved.name && currentSaved.name !== 'Davao Student' && currentSaved.name !== 'Student');
      const isCloudNameDefault = !u.display_name || u.display_name === 'Davao Student';
      const shouldPreserveLocalName = isProfileDirty || hasPendingSync || (isLocalNameCustom && isCloudNameDefault);
      const resolvedName = shouldPreserveLocalName ? (currentSaved.name || u.display_name || 'Student') : ((u.display_name && u.display_name !== 'Davao Student') ? u.display_name : (currentSaved.name || 'Student'));

      const resolvedCampus = shouldPreserveLocalCampus ? (currentSaved.campusId || u.campus_id || 'addu-jacinto') : (u.campus_id || currentSaved.campusId || 'addu-jacinto');

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
        uid: u.user_id || uid,
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

      if (hasPendingSync || shouldPreserveLocalCampus || shouldPreserveLocalCourse || shouldPreserveLocalYear) {
        queueCloudSync(restoredSession);
      }

      const isCompleteProfile = Boolean(
        (u.is_setup_complete === 1 || u.is_setup_complete === true || hasRealLocalUsername) &&
        resolvedUsername &&
        !/^student_[a-f0-9]{6,16}$/i.test(resolvedUsername)
      );
      if (isCompleteProfile) {
        setOnboardingCompleted(true);
        // If local had a custom chosen username but cloud was lagging, auto-heal cloud immediately
        if (hasRealLocalUsername && !isCloudUsernameValid) {
          queueCloudSync(restoredSession);
        }
      }

      // 2. Restore Schedules into Dexie with account isolation
      let scheduleCount = 0;
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

      const parseDays = (raw: any): any[] => {
        if (!raw) return ['Monday', 'Wednesday', 'Friday'];
        let items: string[] = [];
        if (Array.isArray(raw)) {
          items = raw.map(x => String(x).trim());
        } else if (typeof raw === 'string') {
          items = raw.split(',').map(x => x.trim());
        }
        const mapped: string[] = [];
        for (const item of items) {
          const key = item.toLowerCase();
          if (dayAbbrevMap[key]) {
            if (!mapped.includes(dayAbbrevMap[key])) {
              mapped.push(dayAbbrevMap[key]);
            }
          } else if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Everyday'].includes(item)) {
            if (!mapped.includes(item)) {
              mapped.push(item);
            }
          }
        }
        return mapped.length > 0 ? mapped : ['Monday', 'Wednesday', 'Friday'];
      };

      if (Array.isArray(responseData.schedules) && responseData.schedules.length > 0) {
        const mappedSchedules: ClassSchedule[] = responseData.schedules.map((s: any, idx: number) => ({
          id: s.id ? Number(s.id) : idx + 1,
          ofrCode: s.ofr_code || '',
          subjectCode: s.subject_code || 'SUBJ',
          subjectName: s.subject_name || s.subject_code || 'Subject',
          room: s.room || '',
          days: parseDays(s.days),
          startTime: s.start_time || '07:30',
          endTime: s.end_time || '09:00',
          color: s.color || '#0284c7',
          instructor: s.instructor || ''
        }));

        await db.schedules.clear();
        await db.schedules.bulkAdd(mappedSchedules);
        scheduleCount = mappedSchedules.length;
        localStorage.setItem(`skweladabaw_cached_schedules_${uid}`, JSON.stringify(mappedSchedules));

        try {
          await scheduleAllClassSchedulesReminders(mappedSchedules);
          await refreshUnremovableClassNotification(mappedSchedules);
          syncScheduleToWidgets(mappedSchedules);
        } catch (_) {}
      } else {
        // Cloud has 0 schedules for this user.
        // Check if user has an existing account-specific cache for their own UID
        const userCacheRaw = localStorage.getItem(`skweladabaw_cached_schedules_${uid}`);
        if (userCacheRaw) {
          try {
            const userScheds = JSON.parse(userCacheRaw);
            if (Array.isArray(userScheds) && userScheds.length > 0) {
              await db.schedules.clear();
              await db.schedules.bulkAdd(userScheds);
              scheduleCount = userScheds.length;
              queueCloudSync(restoredSession);
              await scheduleAllClassSchedulesReminders(userScheds);
              await refreshUnremovableClassNotification(userScheds);
              syncScheduleToWidgets(userScheds);
            } else {
              await db.schedules.clear();
              syncScheduleToWidgets([]);
            }
          } catch (_) {
            await db.schedules.clear();
            syncScheduleToWidgets([]);
          }
        } else {
          await db.schedules.clear();
          syncScheduleToWidgets([]);
        }
      }

      // 3. Restore Tasks into Dexie with account isolation
      let taskCount = 0;
      if (Array.isArray(responseData.tasks) && responseData.tasks.length > 0) {
        const mappedTasks: TaskItem[] = responseData.tasks.map((t: any, idx: number) => ({
          id: t.id ? Number(t.id) : idx + 1,
          title: t.title || 'Task',
          notes: t.description || t.notes || '',
          dueDate: t.due_date || '',
          reminderTime: t.reminder_time || '',
          priority: t.priority || 'medium',
          completed: Boolean(t.completed),
          subjectCode: t.subject_code || ''
        }));

        await db.tasks.clear();
        await db.tasks.bulkAdd(mappedTasks);
        taskCount = mappedTasks.length;
        localStorage.setItem(`skweladabaw_cached_tasks_${uid}`, JSON.stringify(mappedTasks));
        syncTasksToWidgets(mappedTasks);
      } else {
        const userTasksRaw = localStorage.getItem(`skweladabaw_cached_tasks_${uid}`);
        if (userTasksRaw) {
          try {
            const userTasks = JSON.parse(userTasksRaw);
            if (Array.isArray(userTasks) && userTasks.length > 0) {
              await db.tasks.clear();
              await db.tasks.bulkAdd(userTasks);
              taskCount = userTasks.length;
              queueCloudSync(restoredSession);
            } else {
              await db.tasks.clear();
              syncTasksToWidgets([]);
            }
          } catch (_) {
            await db.tasks.clear();
            syncTasksToWidgets([]);
          }
        } else {
          await db.tasks.clear();
          syncTasksToWidgets([]);
        }
      }

      // 4. Restore Day Routines into Dexie with account isolation
      if (Array.isArray(responseData.routines) && responseData.routines.length > 0) {
        const mappedRoutines: DayReminderItem[] = responseData.routines.map((r: any, idx: number) => ({
          id: r.id ? Number(r.id) : idx + 1,
          title: r.title || 'Routine',
          dayOfWeek: Number(r.day_of_week) || 1,
          time: r.time || '07:00',
          enabled: Boolean(r.enabled)
        }));

        await db.dayReminders.clear();
        await db.dayReminders.bulkAdd(mappedRoutines);
        localStorage.setItem(`skweladabaw_cached_routines_${uid}`, JSON.stringify(mappedRoutines));
      } else {
        const userRoutinesRaw = localStorage.getItem(`skweladabaw_cached_routines_${uid}`);
        if (userRoutinesRaw) {
          try {
            const userRoutines = JSON.parse(userRoutinesRaw);
            if (Array.isArray(userRoutines) && userRoutines.length > 0) {
              await db.dayReminders.clear();
              await db.dayReminders.bulkAdd(userRoutines);
            } else {
              await db.dayReminders.clear();
            }
          } catch (_) {
            await db.dayReminders.clear();
          }
        } else {
          await db.dayReminders.clear();
        }
      }

      // 5. Restore Expenses into Dexie
      if (Array.isArray(responseData.expenses) && responseData.expenses.length > 0) {
        try {
          const mappedExpenses = responseData.expenses.map((e: any, idx: number) => ({
            id: e.id ? Number(e.id) : idx + 1,
            date: e.date ? String(e.date).substring(0, 10) : new Date().toISOString().substring(0, 10),
            category: e.category || 'other',
            amount: Number(e.amount) || 0,
            note: e.note || ''
          }));
          await db.expenses.clear();
          await db.expenses.bulkAdd(mappedExpenses);
        } catch (expErr) {
          console.warn('Could not restore expenses to Dexie:', expErr);
        }
      }

      // 6. Restore Saved Transit Routes into localStorage
      if (Array.isArray(responseData.savedTransit) && responseData.savedTransit.length > 0) {
        try {
          const mappedRoutes = responseData.savedTransit.map((st: any) => ({
            id: st.route_id || st.id || 'route',
            name: st.route_name || 'Route',
            mode: 'jeep',
            origin: st.origin || '',
            destination: st.destination || '',
            starredAt: st.created_at || new Date().toISOString()
          }));
          localStorage.setItem('skweladabaw_favorite_routes', JSON.stringify(mappedRoutes));
        } catch (transErr) {
          console.warn('Could not restore saved transit routes:', transErr);
        }
      }

      // 7. Restore Settings into localStorage
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
          }
          if (set.persistent_theme) localStorage.setItem('skweladabaw_persistent_theme', set.persistent_theme);
          if (set.connect_allowance !== undefined && set.connect_allowance !== null) {
            localStorage.setItem('skweladabaw_connect_allowance', Number(set.connect_allowance) === 1 ? 'true' : 'false');
          }
          if (set.weather_alerts_enabled !== undefined && set.weather_alerts_enabled !== null) {
            localStorage.setItem('skweladabaw_weather_alerts_enabled', Number(set.weather_alerts_enabled) === 1 ? 'true' : 'false');
          }
          if (set.tap_fx_style) localStorage.setItem('skweladabaw_tap_fx_style', set.tap_fx_style);
          if (set.tap_fx_speed) localStorage.setItem('skweladabaw_tap_fx_speed', set.tap_fx_speed);
          if (set.sound_enabled !== undefined && set.sound_enabled !== null) {
            localStorage.setItem('skweladabaw_sound_enabled', Number(set.sound_enabled) === 1 ? 'true' : 'false');
          }
        } catch {}
      }

      // 8. Restore Student Grades into Dexie
      if (Array.isArray(responseData.grades) && responseData.grades.length > 0) {
        try {
          const mappedGrades = responseData.grades.map((g: any, idx: number) => ({
            id: g.id ? Number(g.id) : idx + 1,
            subjectCode: g.subject_code || g.subjectCode || 'SUBJ',
            subjectName: g.subject_name || g.subjectName || 'Subject',
            units: Number(g.units) || 3,
            prelim: g.prelim !== null && g.prelim !== undefined ? Number(g.prelim) : undefined,
            midterm: g.midterm !== null && g.midterm !== undefined ? Number(g.midterm) : undefined,
            prefinal: g.prefinal !== null && g.prefinal !== undefined ? Number(g.prefinal) : undefined,
            finals: g.finals !== null && g.finals !== undefined ? Number(g.finals) : undefined,
            rawAverage: g.raw_average !== null && g.raw_average !== undefined ? Number(g.raw_average) : undefined,
            transmutedGrade: g.transmuted_grade || g.transmutedGrade || undefined,
            gradingScale: g.grading_scale || g.gradingScale || '1.0-5.0'
          }));
          await db.grades.clear();
          await db.grades.bulkAdd(mappedGrades);
        } catch (gradeErr) {
          console.warn('Could not restore grades to Dexie:', gradeErr);
        }
      }

      // 9. Restore Saved Commuter Places into localStorage
      if (Array.isArray(responseData.savedPlaces) && responseData.savedPlaces.length > 0) {
        try {
          const mappedPlaces = responseData.savedPlaces.map((sp: any) => ({
            id: sp.place_id || sp.id || 'place-home',
            type: sp.place_type || sp.type || 'custom',
            name: sp.name || 'Place',
            address: sp.address || '',
            lat: Number(sp.lat) || 0,
            lng: Number(sp.lng) || 0,
            updatedAt: sp.updated_at || sp.created_at || new Date().toISOString()
          }));
          localStorage.setItem('skweladabaw_saved_places', JSON.stringify(mappedPlaces));
        } catch (placeErr) {
          console.warn('Could not restore saved places:', placeErr);
        }
      }

      // 10. Restore Bulletin Bookmarks into localStorage
      if (Array.isArray(responseData.bookmarkedBulletins) && responseData.bookmarkedBulletins.length > 0) {
        try {
          localStorage.setItem('skweladabaw_bookmarked_bulletins', JSON.stringify(responseData.bookmarkedBulletins));
        } catch (bkErr) {
          console.warn('Could not restore bookmarked bulletins:', bkErr);
        }
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
}

export const PENDING_SYNC_KEY = 'skweladabaw_has_pending_cloud_sync';
export const LAST_SYNC_KEY = 'skweladabaw_last_sync_timestamp';
export type SyncStatusState = 'synced' | 'syncing' | 'pending' | 'offline_pending';

let syncTimeout: any = null;
let isLifecycleInitialized = false;

function notifySyncStatus(status: SyncStatusState, timestamp?: string): void {
  if (typeof window === 'undefined') return;
  try {
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
  const hasPending = localStorage.getItem(PENDING_SYNC_KEY) === 'true';
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

  // 1. Online Network Event Listener
  window.addEventListener('online', () => {
    if (localStorage.getItem(PENDING_SYNC_KEY) === 'true') {
      queueCloudSync();
    }
  });

  // 2. Visibility change listener (Web & PWA resume)
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden && localStorage.getItem(PENDING_SYNC_KEY) === 'true') {
      queueCloudSync();
    }
  });

  // 3. Capacitor Native App State Listener (Android foreground resume)
  if (Capacitor.isNativePlatform()) {
    try {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive && localStorage.getItem(PENDING_SYNC_KEY) === 'true') {
          queueCloudSync();
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
export function queueCloudSync(session?: StudentAuthSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PENDING_SYNC_KEY, 'true');
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    notifySyncStatus(isOnline ? 'pending' : 'offline_pending');
  }

  if (syncTimeout) {
    clearTimeout(syncTimeout);
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
  if (!currentSession || !currentSession.isLoggedIn) {
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

  notifySyncStatus('syncing');

  try {
    const localSchedules = await db.schedules.toArray();
    const localTasks = (await db.tasks.toArray()).filter((t) => t.sync_status !== 'pending_delete');
    const localRoutines = await db.dayReminders.toArray();
    const localExpenses = await db.expenses.toArray();
    const localGrades = await db.grades.toArray();

    let savedTransitRoutes: any[] = [];
    try {
      const rawTransit = localStorage.getItem('skweladabaw_favorite_routes');
      if (rawTransit) {
        savedTransitRoutes = JSON.parse(rawTransit);
      }
    } catch {}

    let savedPlacesList: any[] = [];
    try {
      const rawPlaces = localStorage.getItem('skweladabaw_saved_places');
      if (rawPlaces) {
        savedPlacesList = JSON.parse(rawPlaces);
      }
    } catch {}

    let bookmarkedBulletinsList: string[] = [];
    try {
      const rawBk = localStorage.getItem('skweladabaw_bookmarked_bulletins');
      if (rawBk) {
        bookmarkedBulletinsList = JSON.parse(rawBk);
      }
    } catch {}

    const isExplicitEmptySchedules = typeof window !== 'undefined' && localStorage.getItem('skweladabaw_explicit_empty_schedules') === 'true';
    const isExplicitEmptyTasks = typeof window !== 'undefined' && localStorage.getItem('skweladabaw_explicit_empty_tasks') === 'true';

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

    if (localSchedules.length > 0 || isExplicitEmptySchedules) {
      payload.schedules = localSchedules.map((s) => ({
        ofrCode: s.ofrCode,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        room: s.room,
        days: Array.isArray(s.days) ? s.days.join(',') : s.days,
        startTime: s.startTime,
        endTime: s.endTime,
        color: s.color,
        section: s.ofrCode || '',
        instructor: s.instructor
      }));
    }

    if (localTasks.length > 0 || isExplicitEmptyTasks) {
      payload.tasks = localTasks.map((t) => ({
        title: t.title,
        description: t.notes || '',
        dueDate: t.dueDate,
        reminderTime: t.reminderTime,
        priority: t.priority,
        completed: t.completed ? 1 : 0,
        subjectCode: t.subjectCode
      }));
    }

    if (localRoutines.length > 0) {
      payload.routines = localRoutines.map((r) => ({
        title: r.title,
        dayOfWeek: r.dayOfWeek,
        time: r.time,
        enabled: r.enabled ? 1 : 0
      }));
    }

    if (localExpenses.length > 0) {
      payload.expenses = localExpenses.map((e) => ({
        amount: e.amount,
        category: e.category,
        note: e.note || '',
        date: e.date
      }));
    }

    if (Array.isArray(savedTransitRoutes) && savedTransitRoutes.length > 0) {
      payload.savedTransit = savedTransitRoutes.map((st) => ({
        routeId: st.id || '',
        routeName: st.name || '',
        origin: st.origin || '',
        destination: st.destination || '',
        fare: st.fare || null,
        notes: st.notes || ''
      }));
    }

    if (localGrades.length > 0) {
      payload.grades = localGrades.map((g) => ({
        subjectCode: g.subjectCode,
        subjectName: g.subjectName,
        units: g.units,
        prelim: g.prelim,
        midterm: g.midterm,
        prefinal: g.prefinal,
        finals: g.finals,
        rawAverage: g.rawAverage,
        transmutedGrade: g.transmutedGrade,
        gradingScale: g.gradingScale
      }));
    }

    if (Array.isArray(savedPlacesList) && savedPlacesList.length > 0) {
      payload.savedPlaces = savedPlacesList.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        address: p.address || '',
        lat: p.lat,
        lng: p.lng
      }));
    }

    if (Array.isArray(bookmarkedBulletinsList) && bookmarkedBulletinsList.length > 0) {
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
        persistentNextClass: localStorage.getItem('skweladabaw_persistent_next_class') !== 'false' ? 1 : 0,
        persistentTheme: localStorage.getItem('skweladabaw_persistent_theme') || 'midnight',
        connectAllowance: localStorage.getItem('skweladabaw_connect_allowance') === 'true' ? 1 : 0,
        weatherAlertsEnabled: localStorage.getItem('skweladabaw_weather_alerts_enabled') !== 'false' ? 1 : 0,
        tapFxStyle: localStorage.getItem('skweladabaw_tap_fx_style') || 'ripple',
        tapFxSpeed: localStorage.getItem('skweladabaw_tap_fx_speed') || 'normal',
        soundEnabled: localStorage.getItem('skweladabaw_sound_enabled') !== 'false' ? 1 : 0
      };

    const postUrl = `${SYNC_API_URL}?token=${encodeURIComponent(token)}`;

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
      if (res.status >= 200 && res.status < 300 && data?.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(PENDING_SYNC_KEY);
          localStorage.removeItem('skweladabaw_pending_sync');
          localStorage.removeItem('skweladabaw_profile_dirty');
          const now = new Date().toISOString();
          localStorage.setItem(LAST_SYNC_KEY, now);
          notifySyncStatus('synced', now);
        }
        return true;
      }
      console.warn('MySQL sync push response status:', res.status, data);
      notifySyncStatus('offline_pending');
      return false;
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
        if (data?.success) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(PENDING_SYNC_KEY);
            localStorage.removeItem('skweladabaw_pending_sync');
            localStorage.removeItem('skweladabaw_profile_dirty');
            const now = new Date().toISOString();
            localStorage.setItem(LAST_SYNC_KEY, now);
            notifySyncStatus('synced', now);
          }
          return true;
        }
      }
      notifySyncStatus('offline_pending');
      return false;
    }
  } catch (err) {
    console.warn('Failed to push sync to MySQL:', err);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PENDING_SYNC_KEY, 'true');
      notifySyncStatus('offline_pending');
    }
    return false;
  }
}

/**
 * Executes full bidirectional synchronization:
 * 1. Pushes any local mutations to cloud MySQL
 * 2. Hydrates latest cloud state into local Dexie database
 * 3. Returns synchronization report and timestamp
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

  notifySyncStatus('syncing');

  try {
    // Step 1: Hydrate latest authoritative state from cloud first
    const pullResult = await restoreUserData(session.uid);

    // Step 2: Push local state to cloud if pending changes exist
    let pushSuccess = true;
    if (
      typeof window !== 'undefined' &&
      (localStorage.getItem(PENDING_SYNC_KEY) === 'true' ||
       localStorage.getItem('skweladabaw_pending_sync') === 'true' ||
       localStorage.getItem('skweladabaw_profile_dirty') === 'true')
    ) {
      pushSuccess = await syncLocalDataToCloud(session);
    }

    const now = new Date().toISOString();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PENDING_SYNC_KEY);
      localStorage.setItem(LAST_SYNC_KEY, now);
      notifySyncStatus('synced', now);
    }

    return {
      success: pullResult.restored || pushSuccess,
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
    title: task.title,
    dueDate: task.dueDate || '',
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

