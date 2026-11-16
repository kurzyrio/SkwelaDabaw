import { StudentAuthSession, getSavedSession, saveSession, signOutUser } from './authService';
import { ClassSchedule } from '../types';
import { db, clearAllDexieData } from '../db';
import { auth, isFirebaseConfigured } from './firebase';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  PENDING_SYNC_KEY,
  queueCloudSync,
  syncLocalDataToCloud,
  syncCloudDataBiDirectional,
  restoreUserData,
  hasPendingLocalSync,
  getFirebaseIdToken
} from './cloudSyncService';
import { cancelAllAccountReminders, scheduleAllClassSchedulesReminders, refreshUnremovableClassNotification } from './notificationService';
import { syncScheduleToWidgets, syncTasksToWidgets, syncRoutinesToWidgets } from './widgetService';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { imageCacheService } from './imageCacheService';
import { SyncTombstones, generateSyncUUID, hasPendingTombstones, purgeUserScopedStorage, readSyncTombstones, scopedKey } from './userScope';

const USER_API_URL = 'https://skweladabaw.kurzyrio.site/api/user.php';
const REGISTERED_USERS_KEY = 'skweladabaw_registered_accounts';

export interface UserAccountRecord {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  campusId: string;
  course: string;
  yearLevel: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
  updatedAt: string;
  lastUsernameChange?: string;
  isVerified?: boolean;
  isSetupComplete?: boolean;
  presetTag?: string;
  customTag?: string;
  customTagBg?: string;
  customTagColor?: string;
  chatBannedUntil?: string | null;
  chatBanReason?: string;
  age?: number;
  gender?: string;
}

export type ProfileVerificationState = 
  | 'LOADING'
  | 'NETWORK_OR_DB_ERROR'
  | 'PROFILE_COMPLETE'
  | 'PROFILE_INCOMPLETE';

export interface ProfileVerificationResult {
  state: ProfileVerificationState;
  user?: UserAccountRecord;
  missingFields: string[];
  errorMessage?: string;
}

export interface CheckUserResult {
  state: 'PROFILE_COMPLETE' | 'PROFILE_INCOMPLETE' | 'NETWORK_OR_DB_ERROR' | 'USER_NOT_FOUND';
  user?: UserAccountRecord;
  missingFields: string[];
  error?: string;
}

interface HttpResponseWithStatus<T = any> {
  status: number;
  data: T | null;
  error?: string;
  isNetworkError: boolean;
}

/**
 * Universal HTTP GET helper across Native Android and Web with full status reporting
 */
async function httpGetWithStatus<T = any>(
  url: string,
  headers: Record<string, string> = {}
): Promise<HttpResponseWithStatus<T>> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.get({
        url,
        headers,
        connectTimeout: 7000,
        readTimeout: 7000
      });
      const parsedData = res.data && typeof res.data === 'string'
        ? (() => {
            try { return JSON.parse(res.data); } catch { return res.data; }
          })()
        : res.data;
      return {
        status: res.status,
        data: parsedData,
        isNetworkError: false,
        error: res.status >= 400 ? (parsedData?.error || parsedData?.message || `HTTP ${res.status}`) : undefined
      };
    } catch (e: any) {
      console.warn('[userService] Native httpGet error:', e);
      return {
        status: 0,
        data: null,
        isNetworkError: true,
        error: e?.message || 'Network request failed'
      };
    }
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      let parsedData = null;
      try {
        parsedData = await res.json();
      } catch {
        parsedData = null;
      }
      return {
        status: res.status,
        data: parsedData,
        isNetworkError: false,
        error: !res.ok ? (parsedData?.error || parsedData?.message || `HTTP ${res.status}`) : undefined
      };
    } catch (e: any) {
      console.warn('[userService] Fetch httpGet error:', e);
      return {
        status: 0,
        data: null,
        isNetworkError: true,
        error: e?.message || 'Network request failed'
      };
    }
  }
}

/**
 * Universal HTTP GET helper across Native Android and Web
 */
async function httpGet(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await httpGetWithStatus(url, headers);
  if (res.status >= 200 && res.status < 300) {
    return res.data;
  }
  return null;
}

/**
 * Universal HTTP POST helper with full status & server error reporting
 */
async function httpPostWithStatus<T = any>(url: string, body: any, token?: string): Promise<HttpResponseWithStatus<T>> {
  let targetUrl = url;
  if (token && !targetUrl.includes('token=')) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.post({
        url: targetUrl,
        headers,
        data: body,
        connectTimeout: 8000,
        readTimeout: 8000
      });
      const parsedData = res.data && typeof res.data === 'string'
        ? (() => {
            try { return JSON.parse(res.data); } catch { return res.data; }
          })()
        : res.data;
      return {
        status: res.status,
        data: parsedData,
        isNetworkError: false,
        error: res.status >= 400 ? (parsedData?.error || parsedData?.message || `HTTP ${res.status}`) : undefined
      };
    } catch (e: any) {
      console.warn('Native httpPost note:', e);
      return {
        status: 0,
        data: null,
        isNetworkError: true,
        error: e?.message || 'Network request failed'
      };
    }
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      let parsedData = null;
      try {
        parsedData = await res.json();
      } catch {
        parsedData = null;
      }
      return {
        status: res.status,
        data: parsedData,
        isNetworkError: false,
        error: !res.ok ? (parsedData?.error || parsedData?.message || `HTTP ${res.status}`) : undefined
      };
    } catch (e: any) {
      console.warn('Fetch httpPost note:', e);
      return {
        status: 0,
        data: null,
        isNetworkError: true,
        error: e?.message || 'Network request failed'
      };
    }
  }
}

/**
 * Universal HTTP POST helper across Native Android and Web
 */
async function httpPost(url: string, body: any, token?: string): Promise<any> {
  const res = await httpPostWithStatus(url, body, token);
  if (res.status >= 200 && res.status < 300) {
    return res.data;
  }
  return null;
}

/**
 * Get all known registered accounts from local registry
 */
export function getLocalUserRegistry(): Record<string, UserAccountRecord> {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Failed to parse local user registry:', err);
    return {};
  }
}

/**
 * Validates and checks if a username is available across MySQL and local registry
 * Highly optimized with local-first lookup and fast network timeout.
 */
export async function checkUsernameAvailable(
  rawUsername: string,
  currentUid?: string
): Promise<{ available: boolean; reason?: string; networkError?: boolean }> {
  const username = rawUsername.trim().toLowerCase();

  // 1. Format validations (Instant)
  if (!username || username.length < 3) {
    return { available: false, reason: 'Username must be at least 3 characters long.' };
  }
  if (username.length > 20) {
    return { available: false, reason: 'Username must be at most 20 characters.' };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { available: false, reason: 'Only letters, numbers, and underscores are allowed.' };
  }

  // 2. Check local registered accounts registry (Instant 0ms)
  const registry = getLocalUserRegistry();
  for (const [key, user] of Object.entries(registry)) {
    if (user && user.username && user.username.toLowerCase() === username) {
      if (user.uid !== currentUid && key !== currentUid) {
        return { available: false, reason: 'Username is already registered.' };
      }
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      available: false,
      networkError: true,
      reason: 'Offline — connect to the internet to check username availability.'
    };
  }

  // 3. Fast lookup in MySQL user database with strict status verification (never assume available offline)
  try {
    const url = `${USER_API_URL}?action=check_username&username=${encodeURIComponent(username)}&current_uid=${encodeURIComponent(currentUid || '')}`;
    const httpRes = await httpGetWithStatus(url);
    if (
      !httpRes.isNetworkError &&
      httpRes.status >= 200 &&
      httpRes.status < 300 &&
      httpRes.data &&
      typeof httpRes.data.available === 'boolean'
    ) {
      return httpRes.data;
    }
    return {
      available: false,
      networkError: true,
      reason: httpRes.error || 'Could not reach server to verify username availability.'
    };
  } catch (err) {
    console.warn('MySQL username check note:', err);
    return {
      available: false,
      networkError: true,
      reason: 'Could not reach server to verify username availability.'
    };
  }
}

/**
 * Performs a deep account check with explicit 4-state discrimination:
 * PROFILE_COMPLETE | PROFILE_INCOMPLETE | NETWORK_OR_DB_ERROR | USER_NOT_FOUND
 */
export async function checkExistingUserDetailed(
  uid: string,
  email: string
): Promise<CheckUserResult> {
  if (!uid && !email) {
    return { state: 'USER_NOT_FOUND', missingFields: ['username', 'displayName'] };
  }

  // 1. Check MySQL cloud database
  try {
    const idToken = await getFirebaseIdToken();
    const headers: Record<string, string> = idToken ? { Authorization: `Bearer ${idToken}` } : {};
    const tokenParam = idToken ? `&token=${encodeURIComponent(idToken)}` : '';
    const lookupUrl = `${USER_API_URL}?action=lookup&uid=${encodeURIComponent(uid || '')}&email=${encodeURIComponent(email || '')}${tokenParam}&t=${Date.now()}`;
    const httpRes = await httpGetWithStatus(lookupUrl, headers);

    // Case A: 404 Not Found explicitly means user record does not exist in MySQL yet
    if (httpRes.status === 404) {
      return {
        state: 'USER_NOT_FOUND',
        missingFields: ['username', 'displayName']
      };
    }

    // Case B: Successful HTTP response (200-299)
    if (httpRes.status >= 200 && httpRes.status < 300) {
      const data = httpRes.data;
      if (data) {
        // Explicit non-existent user state returned by backend
        if (data.exists === false || data.status === 'USER_NOT_FOUND') {
          return {
            state: 'USER_NOT_FOUND',
            missingFields: ['username', 'displayName']
          };
        }

        if (data.success && data.exists && data.user) {
          saveLocalUserRecord(data.user);
          const hasCoreFields = Boolean(
            data.user.username && 
            String(data.user.username).trim().length > 0 && 
            data.user.displayName && 
            String(data.user.displayName).trim().length > 0
          );
          const isComplete = data.isSetupComplete !== false && hasCoreFields;
          return {
            state: isComplete ? 'PROFILE_COMPLETE' : 'PROFILE_INCOMPLETE',
            user: data.user as UserAccountRecord,
            missingFields: Array.isArray(data.missingFields) ? data.missingFields : (isComplete ? [] : ['username'])
          };
        }

        // If backend returned explicit database failure
        if (data.status === 'NETWORK_OR_DB_ERROR' || data.success === false) {
          console.error('[userService] Backend reported database error:', data);
          const registry = getLocalUserRegistry();
          const localUser = (uid && registry[uid]) || (email && registry[email.toLowerCase()]) || undefined;
          return {
            state: 'NETWORK_OR_DB_ERROR',
            user: localUser,
            missingFields: [],
            error: data.error || data.message || 'Database error occurred'
          };
        }
      }

      // If data is null or empty object under 200 OK, treat as new user
      return {
        state: 'USER_NOT_FOUND',
        missingFields: ['username', 'displayName']
      };
    }

    // Case C: Server error (HTTP 500+) or Network Failure (status === 0 / isNetworkError)
    console.error(`[userService] MySQL user lookup failed. HTTP Status: ${httpRes.status}, Error:`, httpRes.error || httpRes.data);

    const registry = getLocalUserRegistry();
    const localUser = (uid && registry[uid]) || (email && registry[email.toLowerCase()]) || undefined;
    return {
      state: 'NETWORK_OR_DB_ERROR',
      user: localUser,
      missingFields: [],
      error: httpRes.error || `Server error (HTTP ${httpRes.status})`
    };
  } catch (apiErr: any) {
    console.error('[userService] MySQL user lookup unexpected exception:', apiErr);
    const registry = getLocalUserRegistry();
    const localUser = (uid && registry[uid]) || (email && registry[email.toLowerCase()]) || undefined;
    return {
      state: 'NETWORK_OR_DB_ERROR',
      user: localUser,
      missingFields: [],
      error: apiErr?.message || 'Network request failed'
    };
  }
}

/**
 * Check if a user account already exists in MySQL database, API, or local registry.
 * Returns the existing profile if found, or null if it is a new user.
 */
export async function checkExistingUser(
  uid: string,
  email: string,
  idToken?: string
): Promise<UserAccountRecord | null> {
  const result = await checkExistingUserDetailed(uid, email);
  if (result.state === 'PROFILE_COMPLETE' || result.state === 'PROFILE_INCOMPLETE') {
    return result.user || null;
  }
  return null;
}

/**
 * Save and sync new or updated user profile to MySQL database & local registry.
 */
export async function saveUserProfile(
  session: StudentAuthSession,
  idToken?: string
): Promise<boolean> {
  const uid = session.uid || `user-${Date.now()}`;
  const now = new Date().toISOString();

  const record: UserAccountRecord = {
    uid,
    email: session.email || '',
    username: (session.username || '').trim().toLowerCase(),
    displayName: session.name || 'Davao Student',
    avatar: session.avatar || '',
    campusId: session.campusId || '',
    course: session.course || '',
    yearLevel: session.yearLevel || 'Freshman',
    role: (session.role as any) || 'student',
    createdAt: now,
    updatedAt: now,
    lastUsernameChange: now,
    age: session.age,
    gender: session.gender
  };

  // 1. Save to Local Persistent Registry
  saveLocalUserRecord(record);

  // 2. Direct instant push to MySQL user profile endpoint
  try {
    updateUserProfileFields(uid, {
      displayName: record.displayName,
      campusId: record.campusId,
      course: record.course,
      yearLevel: record.yearLevel,
      age: record.age,
      gender: record.gender
    }).catch(() => {});
  } catch (_) {}

  // 3. Trigger background MySQL cloud sync for timetable schedules & settings
  try {
    queueCloudSync(session);
  } catch (err) {
    console.warn('Queue cloud sync note:', err);
  }

  return true;
}

/**
 * Update username with 7-day cooldown check in MySQL
 */
export async function updateUsername(
  uid: string,
  newUsername: string,
  currentLastChange?: string
): Promise<{ success: boolean; message: string; nextAllowedDate?: Date; offline?: boolean }> {
  // Check 7-day cooldown locally
  if (currentLastChange) {
    const lastDate = new Date(currentLastChange).getTime();
    const cooldownMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const nextAllowed = new Date(lastDate + cooldownMs);
    if (Date.now() < nextAllowed.getTime()) {
      const daysLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      return {
        success: false,
        message: `You can only change your username once every 7 days. Please try again in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
        nextAllowedDate: nextAllowed
      };
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      offline: true,
      message: 'You are offline. Please connect to the internet to update your username.'
    };
  }

  const check = await checkUsernameAvailable(newUsername, uid);
  if (!check.available) {
    return {
      success: false,
      offline: Boolean(check.networkError),
      message: check.reason || 'Username is not available.'
    };
  }

  const cleanUsername = newUsername.trim().toLowerCase();
  const now = new Date().toISOString();

  // Require server confirmation before mutating local username registry or returning success
  try {
    const token = await getFirebaseIdToken();
    if (!token) {
      return {
        success: false,
        offline: true,
        message: 'Authentication session could not be verified online. Please try again.'
      };
    }

    const res = await httpPost(USER_API_URL, {
      action: 'update_username',
      newUsername: cleanUsername
    }, token);

    if (res && res.success) {
      const registry = getLocalUserRegistry();
      if (registry[uid]) {
        registry[uid].username = cleanUsername;
        registry[uid].lastUsernameChange = res.lastUsernameChange || now;
        registry[uid].updatedAt = now;
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registry));
      }

      const savedSession = getSavedSession();
      if (savedSession && savedSession.isLoggedIn) {
        savedSession.username = cleanUsername;
        savedSession.lastUsernameChange = res.lastUsernameChange || now;
        saveSession(savedSession);
      }

      return {
        success: true,
        message: 'Username updated successfully!',
        nextAllowedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
    }

    return {
      success: false,
      message: res?.message || 'Unable to reach server to update username. Please try again online.',
      nextAllowedDate: res?.nextAllowedDate ? new Date(res.nextAllowedDate) : undefined
    };
  } catch (err: any) {
    console.warn('MySQL update username note:', err);
    return {
      success: false,
      offline: true,
      message: err?.message || 'Connection error while contacting server. Please check your network.'
    };
  }
}

/**
 * Fetch and synchronize user's saved schedules ONLY on new login
 * and saves into local IndexedDB for complete offline usage.
 */
export async function syncUserSchedules(uid: string, idToken?: string): Promise<number> {
  if (!uid) {
    return await db.schedules.count();
  }

  try {
    const res = await restoreUserData(uid, idToken);
    if (res.restored) {
      return res.scheduleCount;
    }
  } catch (err) {
    console.warn('MySQL schedule restore note:', err);
  }

  return await db.schedules.count();
}

/**
 * Back up user's local schedules to MySQL in background
 */
export async function backupSchedulesToCloud(
  uid: string, 
  schedules?: ClassSchedule[],
  immediate = false,
  session?: StudentAuthSession
): Promise<void> {
  if (!uid) return;
  try {
    if (immediate) {
      await syncLocalDataToCloud(session);
    } else {
      queueCloudSync(session);
    }
  } catch (err) {
    console.warn('MySQL schedule backup note:', err);
  }
}

export const ACCOUNT_BACKUP_KEY_PREFIX = 'skweladabaw_account_backup_';

export interface AccountSwitchBackup {
  version: number;
  uid: string;
  savedAt: string;
  hasPendingSync: boolean;
  schedules: any[];
  tasks: any[];
  dayReminders: any[];
  expenses: any[];
  grades: any[];
  tombstones?: SyncTombstones;
  explicitEmptySchedules?: boolean;
  explicitEmptyTasks?: boolean;
}

export function readAccountBackup(uid: string): AccountSwitchBackup | null {
  if (!uid || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${ACCOUNT_BACKUP_KEY_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid === uid) {
      return parsed as AccountSwitchBackup;
    }
  } catch (_) {}
  return null;
}

export function clearAccountBackup(uid: string): void {
  if (!uid || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(`${ACCOUNT_BACKUP_KEY_PREFIX}${uid}`);
  } catch (_) {}
}

export async function snapshotAccountBackup(uid: string, forcePendingSync?: boolean): Promise<boolean> {
  if (!uid || typeof localStorage === 'undefined') return false;
  try {
    const [schedules, tasks, dayReminders, expenses, grades] = await Promise.all([
      db.schedules.toArray(),
      db.tasks.toArray(),
      db.dayReminders.toArray(),
      db.expenses.toArray(),
      db.grades.toArray()
    ]);

    const hasPending = forcePendingSync ?? (await hasPendingLocalSync(uid));
    const backup: AccountSwitchBackup = {
      version: 1,
      uid,
      savedAt: new Date().toISOString(),
      hasPendingSync: hasPending,
      schedules,
      tasks,
      dayReminders,
      expenses,
      grades,
      tombstones: readSyncTombstones(uid),
      explicitEmptySchedules: localStorage.getItem(scopedKey('skweladabaw_explicit_empty_schedules', uid)) === 'true',
      explicitEmptyTasks: localStorage.getItem(scopedKey('skweladabaw_explicit_empty_tasks', uid)) === 'true'
    };

    localStorage.setItem(`${ACCOUNT_BACKUP_KEY_PREFIX}${uid}`, JSON.stringify(backup));
    localStorage.setItem(`skweladabaw_cached_schedules_${uid}`, JSON.stringify(schedules));
    localStorage.setItem(`skweladabaw_cached_tasks_${uid}`, JSON.stringify(tasks.filter((t) => t.sync_status !== 'pending_delete')));
    localStorage.setItem(`skweladabaw_cached_routines_${uid}`, JSON.stringify(dayReminders));
    localStorage.setItem(`skweladabaw_cached_expenses_${uid}`, JSON.stringify(expenses));
    localStorage.setItem(`skweladabaw_cached_grades_${uid}`, JSON.stringify(grades));
    return true;
  } catch (err) {
    console.warn('Error creating UID-scoped account backup:', err);
    return false;
  }
}

/**
 * Switch account schedules safely with multi-account isolation:
 * 1. Saves oldUid's current schedules/data to local cache + UID-scoped backup (or syncs synchronously if signing out).
 * 2. Clears local Dexie tables atomically ONLY AFTER backup/sync preservation succeeds.
 * 3. If newUid exists, restores local account backup/cache first, migrates any guest tables, then syncs with MySQL.
 * 4. Never pushes oldUid's Dexie data under newUid's Firebase token.
 */
export async function switchAccountSchedules(
  oldUid?: string,
  newUid?: string,
  session?: StudentAuthSession,
  token?: string
): Promise<{ success: boolean; abortedOffline?: boolean; message?: string }> {
  if (oldUid && newUid && oldUid === newUid) {
    return { success: true };
  }

  // 1. Back up or preserve previous schedules, tasks, routines, expenses, and grades
  try {
    if (!oldUid) {
      // Switching from guest mode: preserve all 5 Dexie stores for guest-to-login migration
      const [currentSchedules, currentTasks, currentRoutines, currentExpenses, currentGrades] = await Promise.all([
        db.schedules.toArray(),
        db.tasks.toArray(),
        db.dayReminders.toArray(),
        db.expenses.toArray(),
        db.grades.toArray()
      ]);
      const activeTasks = currentTasks.filter((t) => t.sync_status !== 'pending_delete');
      if (currentSchedules.length > 0) {
        localStorage.setItem('skweladabaw_pending_guest_schedules', JSON.stringify(currentSchedules));
      } else {
        localStorage.removeItem('skweladabaw_pending_guest_schedules');
      }
      if (activeTasks.length > 0) {
        localStorage.setItem('skweladabaw_pending_guest_tasks', JSON.stringify(activeTasks));
      } else {
        localStorage.removeItem('skweladabaw_pending_guest_tasks');
      }
      if (currentRoutines.length > 0) {
        localStorage.setItem('skweladabaw_pending_guest_routines', JSON.stringify(currentRoutines));
      } else {
        localStorage.removeItem('skweladabaw_pending_guest_routines');
      }
      if (currentExpenses.length > 0) {
        localStorage.setItem('skweladabaw_pending_guest_expenses', JSON.stringify(currentExpenses));
      } else {
        localStorage.removeItem('skweladabaw_pending_guest_expenses');
      }
      if (currentGrades.length > 0) {
        localStorage.setItem('skweladabaw_pending_guest_grades', JSON.stringify(currentGrades));
      } else {
        localStorage.removeItem('skweladabaw_pending_guest_grades');
      }
    } else if (oldUid !== newUid && session && session.uid === oldUid && session.isLoggedIn) {
      const [currentSchedules, currentTasks, currentRoutines, currentExpenses, currentGrades] = await Promise.all([
        db.schedules.toArray(),
        db.tasks.toArray(),
        db.dayReminders.toArray(),
        db.expenses.toArray(),
        db.grades.toArray()
      ]);

      const activeTasks = currentTasks.filter((t) => t.sync_status !== 'pending_delete');
      localStorage.setItem(`skweladabaw_cached_schedules_${oldUid}`, JSON.stringify(currentSchedules));
      localStorage.setItem(`skweladabaw_cached_tasks_${oldUid}`, JSON.stringify(activeTasks));
      localStorage.setItem(`skweladabaw_cached_routines_${oldUid}`, JSON.stringify(currentRoutines));
      localStorage.setItem(`skweladabaw_cached_expenses_${oldUid}`, JSON.stringify(currentExpenses));
      localStorage.setItem(`skweladabaw_cached_grades_${oldUid}`, JSON.stringify(currentGrades));

      const hasUnsyncedChanges =
        localStorage.getItem(PENDING_SYNC_KEY) === 'true' ||
        localStorage.getItem('skweladabaw_pending_sync') === 'true' ||
        localStorage.getItem('skweladabaw_profile_dirty') === 'true' ||
        hasPendingTombstones(oldUid) ||
        currentTasks.some((t) => t.sync_status !== 'synced') ||
        currentSchedules.some((s) => s.syncStatus === 'pending') ||
        currentRoutines.some((r) => r.syncStatus === 'pending') ||
        currentExpenses.some((e) => e.syncStatus === 'pending') ||
        currentGrades.some((g) => g.syncStatus === 'pending');

      if (!newUid) {
        // Explicit logout: preserve user's cloud & per-UID local backup so switching accounts works offline too.
        // Only clear the active client workspace after snapshotting locally + attempting a quick bounded sync.
        await snapshotAccountBackup(oldUid, hasUnsyncedChanges).catch(() => false);
        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            const pushed = await Promise.race([
              syncLocalDataToCloud(session),
              new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500))
            ]);
            if (pushed) {
              clearAccountBackup(oldUid);
            }
          } catch (_) {}
        }
      } else {
        // Switching to another account: syncLocalDataToCloud fails fast if auth already switched to newUid.
        // Push ONLY if oldUid auth still matches; otherwise persist complete UID-scoped local backup.
        let flushedOldUid = false;
        if (hasUnsyncedChanges && (typeof navigator === 'undefined' || navigator.onLine)) {
          try {
            flushedOldUid = await syncLocalDataToCloud(session);
          } catch (_) {
            flushedOldUid = false;
          }
        }
        if (hasUnsyncedChanges && !flushedOldUid) {
          const backedUp = await snapshotAccountBackup(oldUid, true);
          if (!backedUp) {
            return {
              success: false,
              abortedOffline: true,
              message: 'Could not save offline backup for your previous account. Please try again.'
            };
          }
        } else if (flushedOldUid || !hasUnsyncedChanges) {
          clearAccountBackup(oldUid);
        }
      }
    }
  } catch (err) {
    console.warn('Error saving old account data during switch:', err);
    return {
      success: false,
      abortedOffline: true,
      message: 'Could not verify backup for your current account. Please try again.'
    };
  }

  // 2. Clear transient global flags & atomically wipe all 5 Dexie tables so accounts never bleed
  try {
    localStorage.removeItem('skweladabaw_cached_schedules_guest');
    localStorage.removeItem(PENDING_SYNC_KEY);
    localStorage.removeItem('skweladabaw_pending_sync');
    localStorage.removeItem('skweladabaw_profile_dirty');
    localStorage.removeItem('skweladabaw_explicit_empty_schedules');
    localStorage.removeItem('skweladabaw_explicit_empty_tasks');
    await db.transaction(
      'rw',
      [db.schedules, db.tasks, db.dayReminders, db.expenses, db.grades],
      async () => {
        await Promise.all([
          db.schedules.clear(),
          db.tasks.clear(),
          db.dayReminders.clear(),
          db.expenses.clear(),
          db.grades.clear()
        ]);
      }
    );
  } catch (e) {
    console.warn('Error clearing tables on switch:', e);
  }

  // 3. Cancel old account's reminders & clear widgets
  try {
    await cancelAllAccountReminders();
    syncScheduleToWidgets([]);
    syncTasksToWidgets([]);
  } catch (e) {
    console.warn('Error canceling reminders on switch:', e);
  }

  // 4. If logging out (no newUid), clean state is ready
  if (!newUid) {
    return { success: true };
  }

  // 5. Switch to registered user: restore all 5 Dexie stores atomically (account backup -> cache -> guest extras)
  let restoredSchedules: any[] = [];
  let restoredWidgetTasks: any[] = [];
  let shouldPushRestoredLocal = false;
  let consumedAccountBackup = false;
  let consumedGuestExtras = false;

  try {
    const parseArray = (key: string): any[] => {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    };

    const accountBackup = readAccountBackup(newUid);
    if (accountBackup) {
      consumedAccountBackup = true;
      shouldPushRestoredLocal = Boolean(accountBackup.hasPendingSync);
      restoredSchedules = Array.isArray(accountBackup.schedules) ? accountBackup.schedules : [];
      const backupTasks = Array.isArray(accountBackup.tasks) ? accountBackup.tasks : [];
      const backupRoutines = Array.isArray(accountBackup.dayReminders) ? accountBackup.dayReminders : [];
      const backupExpenses = Array.isArray(accountBackup.expenses) ? accountBackup.expenses : [];
      const backupGrades = Array.isArray(accountBackup.grades) ? accountBackup.grades : [];

      if (accountBackup.explicitEmptySchedules) {
        localStorage.setItem(scopedKey('skweladabaw_explicit_empty_schedules', newUid), 'true');
      }
      if (accountBackup.explicitEmptyTasks) {
        localStorage.setItem(scopedKey('skweladabaw_explicit_empty_tasks', newUid), 'true');
      }
      if (accountBackup.tombstones) {
        const tombKey = scopedKey('skweladabaw_sync_tombstones', newUid);
        if (!localStorage.getItem(tombKey)) {
          localStorage.setItem(tombKey, JSON.stringify(accountBackup.tombstones));
        }
      }

      await db.transaction(
        'rw',
        [db.schedules, db.tasks, db.dayReminders, db.expenses, db.grades],
        async () => {
          if (restoredSchedules.length > 0) await db.schedules.bulkPut(restoredSchedules);
          if (backupTasks.length > 0) await db.tasks.bulkPut(backupTasks);
          if (backupRoutines.length > 0) await db.dayReminders.bulkPut(backupRoutines);
          if (backupExpenses.length > 0) await db.expenses.bulkPut(backupExpenses);
          if (backupGrades.length > 0) await db.grades.bulkPut(backupGrades);
        }
      );

      restoredWidgetTasks = backupTasks.filter((t) => t && t.sync_status !== 'pending_delete');
    } else {
      const cachedScheds = parseArray(`skweladabaw_cached_schedules_${newUid}`);
      const rawTasks = parseArray(`skweladabaw_cached_tasks_${newUid}`);
      const taskByUuid = new Map<string, any>();
      for (const t of rawTasks) {
        if (t && t.sync_status !== 'pending_delete' && t.uuid) {
          taskByUuid.set(t.uuid, t);
        }
      }
      const cachedTasks = Array.from(taskByUuid.values());
      let cachedRoutines = parseArray(`skweladabaw_cached_routines_${newUid}`);
      let cachedExpenses = parseArray(`skweladabaw_cached_expenses_${newUid}`);
      let cachedGrades = parseArray(`skweladabaw_cached_grades_${newUid}`);

      if (!oldUid) {
        const guestRoutines = parseArray('skweladabaw_pending_guest_routines');
        const guestExpenses = parseArray('skweladabaw_pending_guest_expenses');
        const guestGrades = parseArray('skweladabaw_pending_guest_grades');
        const nowIso = new Date().toISOString();

        if (guestRoutines.length > 0) {
          consumedGuestExtras = true;
          const taggedRoutines = guestRoutines.map((r) => ({
            ...r,
            id: undefined,
            uuid: r.uuid || generateSyncUUID('routine'),
            updatedAt: r.updatedAt || r.createdAt || nowIso,
            syncStatus: 'pending'
          }));
          cachedRoutines = [...cachedRoutines, ...taggedRoutines];
        }
        if (guestExpenses.length > 0) {
          consumedGuestExtras = true;
          const taggedExpenses = guestExpenses.map((e) => ({
            ...e,
            id: undefined,
            uuid: e.uuid || generateSyncUUID('exp'),
            updatedAt: e.updatedAt || e.createdAt || nowIso,
            syncStatus: 'pending'
          }));
          cachedExpenses = [...cachedExpenses, ...taggedExpenses];
        }
        if (guestGrades.length > 0) {
          consumedGuestExtras = true;
          const taggedGrades = guestGrades.map((g) => ({
            ...g,
            id: undefined,
            uuid: g.uuid || generateSyncUUID('grade'),
            updatedAt: g.updatedAt || g.createdAt || nowIso,
            syncStatus: 'pending'
          }));
          cachedGrades = [...cachedGrades, ...taggedGrades];
        }
        if (consumedGuestExtras) {
          shouldPushRestoredLocal = true;
        }
      }

      await db.transaction(
        'rw',
        [db.schedules, db.tasks, db.dayReminders, db.expenses, db.grades],
        async () => {
          if (cachedScheds.length > 0) await db.schedules.bulkPut(cachedScheds);
          if (cachedTasks.length > 0) await db.tasks.bulkPut(cachedTasks);
          if (cachedRoutines.length > 0) await db.dayReminders.bulkPut(cachedRoutines);
          if (cachedExpenses.length > 0) await db.expenses.bulkPut(cachedExpenses);
          if (cachedGrades.length > 0) await db.grades.bulkPut(cachedGrades);
        }
      );

      restoredSchedules = cachedScheds;
      restoredWidgetTasks = cachedTasks;
    }

    if (consumedAccountBackup) {
      clearAccountBackup(newUid);
    }
    if (consumedGuestExtras) {
      localStorage.removeItem('skweladabaw_pending_guest_routines');
      localStorage.removeItem('skweladabaw_pending_guest_expenses');
      localStorage.removeItem('skweladabaw_pending_guest_grades');
    }
    if (shouldPushRestoredLocal) {
      localStorage.setItem(PENDING_SYNC_KEY, 'true');
    }
  } catch (restoreErr) {
    console.warn('Account cache restore note:', restoreErr);
  }

  try {
    if (restoredSchedules.length > 0) {
      await scheduleAllClassSchedulesReminders(restoredSchedules);
      await refreshUnremovableClassNotification(restoredSchedules);
      syncScheduleToWidgets(restoredSchedules);
    }
    if (restoredWidgetTasks.length > 0) {
      syncTasksToWidgets(restoredWidgetTasks);
    }
  } catch (_) {}

  // Then flush any restored pending backup under newUid's active token & fetch latest authoritative data from MySQL
  try {
    if (shouldPushRestoredLocal && (typeof navigator === 'undefined' || navigator.onLine)) {
      await syncCloudDataBiDirectional();
    } else {
      await restoreUserData(newUid, token);
    }
  } catch (err) {
    console.warn('MySQL cloud sync on account switch note:', err);
  }

  return { success: true };
}

const profileRevalidateThrottle: Record<string, number> = {};

/**
 * Fetch latest live user profile with tags, verified status, and chat ban status.
 * Returns local cached profile immediately for offline speed, and revalidates via MySQL.
 */
export async function fetchLiveUserProfile(uid: string): Promise<UserAccountRecord | null> {
  if (!uid) return null;
  const registry = getLocalUserRegistry();
  const cached = registry[uid] || null;

  // If offline, return cached user immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return cached;
  }

  try {
    const url = `${USER_API_URL}?action=lookup&uid=${encodeURIComponent(uid)}`;
    const data = await httpGet(url);
    if (data && data.exists && data.user) {
      saveLocalUserRecord(data.user);
      return data.user as UserAccountRecord;
    }
  } catch (err) {
    console.warn('Failed to fetch live user profile from MySQL:', err);
  }
  return cached;
}

/**
 * Save user record in local persistent registry with auto avatar cache update and event dispatch
 */
export function saveLocalUserRecord(record: UserAccountRecord): void {
  try {
    const registry = getLocalUserRegistry();
    const existing = registry[record.uid] || (record.email ? registry[record.email.toLowerCase()] : undefined);

    // If avatar changed or was added, update cache
    if (record.avatar) {
      if (existing && existing.avatar && existing.avatar !== record.avatar) {
        imageCacheService.invalidate(existing.avatar).catch(() => {});
      }
      imageCacheService.getImageUrl(record.avatar).catch(() => {});
    }

    registry[record.uid] = record;
    if (record.email) {
      registry[record.email.toLowerCase()] = record;
    }
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registry));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('skwela_profile_updated', {
        detail: { uid: record.uid, user: record }
      }));
    }
  } catch (err) {
    console.warn('Failed to persist user record locally:', err);
  }
}

/**
 * Look up public user profile by UID or username.
 * Local-First SWR: returns local cache first (0ms), then checks MySQL in background if stale.
 */
export async function getPublicUserProfile(params: {
  uid?: string;
  username?: string;
}): Promise<UserAccountRecord | null> {
  const { uid, username } = params;
  const cleanUsername = (username || '').trim().toLowerCase().replace(/^@/, '');
  const throttleKey = uid || cleanUsername;

  // 1. Check local registry first (0ms cache)
  const registry = getLocalUserRegistry();
  let cachedRecord: UserAccountRecord | null = null;
  if (uid && registry[uid]) {
    cachedRecord = registry[uid];
  } else if (cleanUsername) {
    for (const record of Object.values(registry)) {
      if (record?.username && record.username.toLowerCase() === cleanUsername) {
        cachedRecord = record;
        break;
      }
    }
  }

  const now = Date.now();
  const lastRevalidation = profileRevalidateThrottle[throttleKey] || 0;
  const isStale = now - lastRevalidation > 5 * 60 * 1000; // 5 minutes

  // If cached and fresh or offline, return cached immediately
  if (cachedRecord && (!isStale || (typeof navigator !== 'undefined' && !navigator.onLine))) {
    return cachedRecord;
  }

  // 2. Direct lookup or background revalidation in MySQL
  const performLookup = async () => {
    try {
      profileRevalidateThrottle[throttleKey] = Date.now();
      const queryParam = uid ? `uid=${encodeURIComponent(uid)}` : `username=${encodeURIComponent(cleanUsername)}`;
      const url = `${USER_API_URL}?action=lookup&${queryParam}`;
      const data = await httpGet(url);
      if (data && data.exists && data.user) {
        saveLocalUserRecord(data.user);
        return data.user as UserAccountRecord;
      }
    } catch (err) {
      console.warn('MySQL public user lookup note:', err);
    }
    return cachedRecord;
  };

  if (cachedRecord) {
    // If we have cached record, trigger revalidation asynchronously and return cached immediately!
    performLookup().catch(() => {});
    return cachedRecord;
  }

  return performLookup();
}

/**
 * Strict 4-State Profile Verification Engine.
 * Conforms to:
 * - LOADING: in-flight request
 * - NETWORK_OR_DB_ERROR: MySQL unreachable, timeout, or 500 error
 * - PROFILE_COMPLETE: 200 OK and core required fields (username, displayName, isSetupComplete) exist
 * - PROFILE_INCOMPLETE: Confirmed 200 OK / 404 and core required fields genuinely blank
 */
export async function verifyProfileIntegrity(
  uid: string,
  email?: string
): Promise<ProfileVerificationResult> {
  if (!uid && !email) {
    return {
      state: 'PROFILE_INCOMPLETE',
      missingFields: ['username', 'displayName']
    };
  }

  try {
    const idToken = await getFirebaseIdToken();
    const headers: Record<string, string> = idToken ? { Authorization: `Bearer ${idToken}` } : {};
    const tokenParam = idToken ? `&token=${encodeURIComponent(idToken)}` : '';
    const query = uid ? `uid=${encodeURIComponent(uid)}` : `email=${encodeURIComponent(email || '')}`;
    const url = `${USER_API_URL}?action=verify_session&${query}${tokenParam}&t=${Date.now()}`;
    const res = await httpGet(url, headers);

    if (res && res.success) {
      if (res.exists && res.user) {
        saveLocalUserRecord(res.user);
        const hasCoreFields = Boolean(
          res.user.username && 
          String(res.user.username).trim().length > 0 && 
          res.user.displayName && 
          String(res.user.displayName).trim().length > 0
        );
        const isComplete = res.isSetupComplete !== false && hasCoreFields;

        if (isComplete) {
          return {
            state: 'PROFILE_COMPLETE',
            user: res.user as UserAccountRecord,
            missingFields: []
          };
        } else {
          return {
            state: 'PROFILE_INCOMPLETE',
            user: res.user as UserAccountRecord,
            missingFields: Array.isArray(res.missingFields) && res.missingFields.length > 0 
              ? res.missingFields 
              : (!res.user.username ? ['username'] : ['displayName'])
          };
        }
      } else {
        // Confirmed by MySQL server: User does not exist in database yet
        return {
          state: 'PROFILE_INCOMPLETE',
          missingFields: ['username', 'displayName']
        };
      }
    } else if (res && (res.status === 'NETWORK_OR_DB_ERROR' || res.success === false)) {
      return {
        state: 'NETWORK_OR_DB_ERROR',
        missingFields: [],
        errorMessage: res.error || res.message || 'Database error occurred'
      };
    }
  } catch (err: any) {
    console.warn('verifyProfileIntegrity network exception:', err);
    return {
      state: 'NETWORK_OR_DB_ERROR',
      missingFields: [],
      errorMessage: err?.message || 'Network connection failed'
    };
  }

  // Fallback: If HTTP request timed out or returned empty response
  return {
    state: 'NETWORK_OR_DB_ERROR',
    missingFields: [],
    errorMessage: 'Could not connect to database'
  };
}

/**
 * Backward-compatible session verifier that delegates to verifyProfileIntegrity
 */
export async function verifySessionWithServer(
  uid: string,
  email?: string
): Promise<{ exists: boolean; missingFields: string[]; user?: UserAccountRecord; offline?: boolean }> {
  const result = await verifyProfileIntegrity(uid, email);
  if (result.state === 'PROFILE_COMPLETE') {
    return {
      exists: true,
      missingFields: [],
      user: result.user
    };
  }
  if (result.state === 'PROFILE_INCOMPLETE') {
    return {
      exists: Boolean(result.user),
      missingFields: result.missingFields,
      user: result.user
    };
  }
  // On network or DB error: report offline explicitly and never pretend uncached sessions exist
  const registry = getLocalUserRegistry();
  const cached = (uid && registry[uid]) || (email && registry[email.toLowerCase()]) || undefined;
  return {
    exists: Boolean(cached),
    missingFields: [],
    user: cached,
    offline: true
  };
}

/**
 * Updates specific profile attributes (e.g. gender, age) directly to MySQL and local cache.
 */
export async function updateUserProfileFields(
  uid: string,
  fields: Partial<UserAccountRecord>
): Promise<boolean> {
  // 1. Immediately apply to local user session so instant restarts preserve the selection
  const current = localStorage.getItem('skweladabaw_user_session');
  if (current) {
    try {
      const parsed = JSON.parse(current);
      const updated = { ...parsed, ...fields };
      localStorage.setItem('skweladabaw_user_session', JSON.stringify(updated));
    } catch (_) {}
  }
  // Mark profile dirty and queue background retry so offline edits synchronize on reconnect
  localStorage.setItem('skweladabaw_profile_dirty', 'true');
  localStorage.setItem('skweladabaw_profile_updated_at', String(Date.now()));
  localStorage.setItem(PENDING_SYNC_KEY, 'true');

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const token = await getFirebaseIdToken();
    if (!token) {
      return false;
    }
    const payload = {
      action: 'update_profile',
      uid,
      idToken: token,
      ...fields
    };
    const res = await httpPost(USER_API_URL, payload, token || undefined);
    if (res && res.success) {
      localStorage.removeItem('skweladabaw_profile_dirty');
      const registry = getLocalUserRegistry();
      if (registry[uid]) {
        registry[uid] = { ...registry[uid], ...fields, updatedAt: new Date().toISOString() };
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registry));
      }
      return true;
    }
  } catch (err) {
    console.warn('updateUserProfileFields note:', err);
  }
  return false;
}

/**
 * Permanently deletes the student account and all cloud & local records
 * in compliance with Google Play Store Account Deletion requirements.
 */
export async function deleteUserAccount(): Promise<{ success: boolean; message: string }> {
  const activeSession = getSavedSession();
  const uid = activeSession.uid;

  if (activeSession.isLoggedIn && typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      message: 'You are offline. Please connect to the internet to permanently delete your account and cloud data.'
    };
  }

  try {
    let token = await getFirebaseIdToken();
    if (activeSession.isLoggedIn && !token) {
      token = await getFirebaseIdToken(true);
    }

    if (activeSession.isLoggedIn && !token) {
      return {
        success: false,
        message: 'Could not verify your authentication session. Please sign in again and retry.'
      };
    }

    if (activeSession.isLoggedIn && token) {
      let res = await httpPostWithStatus(USER_API_URL, { action: 'delete_account', idToken: token }, token);
      if (res.status === 401) {
        const refreshed = await getFirebaseIdToken(true);
        if (refreshed && refreshed !== token) {
          token = refreshed;
          res = await httpPostWithStatus(USER_API_URL, { action: 'delete_account', idToken: token }, token);
        }
      }
      if (res.isNetworkError || res.status === 0 || res.status >= 400 || !res.data || !res.data.success) {
        return {
          success: false,
          message: res.data?.message || res.data?.error || res.error || 'Could not delete account on server. Please check your connection and try again.'
        };
      }
    }

    // Attempt Firebase Auth user deletion cleanly (fallback safely to signOut if recent-login check blocks)
    if (activeSession.isLoggedIn) {
      try {
        if (Capacitor.isNativePlatform()) {
          await Promise.race([
            FirebaseAuthentication.deleteUser().catch(() => {}),
            new Promise((resolve) => setTimeout(resolve, 2500))
          ]);
        }
        if (isFirebaseConfigured && auth?.currentUser) {
          await Promise.race([
            auth.currentUser.delete().catch(() => {}),
            new Promise((resolve) => setTimeout(resolve, 2500))
          ]);
        }
      } catch (_) {}
    }

    try {
      await cancelAllAccountReminders();
      syncScheduleToWidgets([]);
      syncTasksToWidgets([]);
      syncRoutinesToWidgets([]);
    } catch (e) {
      console.warn('Notification/widget cleanup error during wipe:', e);
    }

    try {
      await clearAllDexieData(true);
    } catch (e) {
      console.warn('Local database purge error during account deletion:', e);
    }

    // Purge all user-scoped storage, backups, sync queues, routes, chat cache, and session keys
    if (uid) {
      clearAccountBackup(uid);
      purgeUserScopedStorage(uid);
    }
    purgeUserScopedStorage('guest');

    const keysToRemove = [
      'skweladabaw_user_session',
      'skweladabaw_registered_accounts',
      'skweladabaw_user_profile_cache',
      'skweladabaw_profile_dirty',
      'skweladabaw_profile_updated_at',
      'skweladabaw_pending_guest_schedules',
      'skweladabaw_pending_guest_tasks',
      'skweladabaw_pending_guest_routines',
      'skweladabaw_pending_guest_expenses',
      'skweladabaw_pending_guest_grades',
      'skweladabaw_last_sync_timestamp',
      'skweladabaw_pending_sync',
      PENDING_SYNC_KEY,
      'skweladabaw_explicit_empty_schedules',
      'skweladabaw_explicit_empty_tasks',
      'skweladabaw_offline_chat_queue',
      'skweladabaw_saved_places',
      'skweladabaw_favorite_routes',
      'skweladabaw_recent_trips',
      'skweladabaw_bookmarked_bulletins',
      'skweladabaw_auth_token',
      'skweladabaw_onboarding_completed',
      'skwela_password_set',
      'skwela_session_checked'
    ];
    for (const key of keysToRemove) {
      try { localStorage.removeItem(key); } catch (_) {}
    }

    // Remove all remaining account/chat/backup caches across localStorage
    try {
      const wipePrefixes = [
        'skweladabaw_chat_cache_',
        'skweladabaw_account_backup_',
        'skweladabaw_cached_',
        'skweladabaw_sync_tombstones_',
        'skweladabaw_has_hydrated_',
        'skweladabaw_saved_places_',
        'skweladabaw_favorite_routes_',
        'skweladabaw_recent_trips_',
        'skweladabaw_bookmarked_bulletins_',
        'skweladabaw_explicit_empty_'
      ];
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allKeys.push(k);
      }
      for (const k of allKeys) {
        if (wipePrefixes.some((p) => k.startsWith(p)) || (uid && k.endsWith(`_${uid}`))) {
          localStorage.removeItem(k);
        }
      }
    } catch (_) {}

    try {
      await signOutUser(undefined, { skipAccountSync: true });
    } catch (_) {}

    return { success: true, message: 'Account and all data successfully deleted.' };
  } catch (err: any) {
    console.error('deleteUserAccount error:', err);
    return { success: false, message: err?.message || 'Failed to complete deletion.' };
  }
}
