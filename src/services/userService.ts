import { StudentAuthSession, getSavedSession, saveSession } from './authService';
import { ClassSchedule } from '../types';
import { db } from '../db';
import { queueCloudSync, syncLocalDataToCloud, restoreUserData, getFirebaseIdToken } from './cloudSyncService';
import { cancelAllAccountReminders, scheduleAllClassSchedulesReminders, refreshUnremovableClassNotification } from './notificationService';
import { syncScheduleToWidgets, syncTasksToWidgets } from './widgetService';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { imageCacheService } from './imageCacheService';

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
 * Universal HTTP POST helper across Native Android and Web
 */
async function httpPost(url: string, body: any, token?: string): Promise<any> {
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
      if (res.status >= 200 && res.status < 300 && res.data) {
        return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      }
      return null;
    } catch (e) {
      console.warn('Native httpPost note:', e);
      return null;
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
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      console.warn('Fetch httpPost note:', e);
      return null;
    }
  }
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
): Promise<{ available: boolean; reason?: string }> {
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

  // 3. Fast lookup in MySQL user database with timeout guard
  try {
    const url = `${USER_API_URL}?action=check_username&username=${encodeURIComponent(username)}&current_uid=${encodeURIComponent(currentUid || '')}`;
    const result = await httpGet(url);
    if (result && typeof result.available === 'boolean') {
      return result;
    }
  } catch (err) {
    console.warn('MySQL username check note:', err);
  }

  return { available: true };
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
    const lookupUrl = `${USER_API_URL}?action=lookup&uid=${encodeURIComponent(uid || '')}&email=${encodeURIComponent(email || '')}&t=${Date.now()}`;
    const httpRes = await httpGetWithStatus(lookupUrl);

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
          const localUser = (uid && registry[uid]) || (email && registry[email.toLowerCase()]);
          if (localUser) {
            return {
              state: 'PROFILE_COMPLETE',
              user: localUser,
              missingFields: []
            };
          }
          return {
            state: 'NETWORK_OR_DB_ERROR',
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

    // Offline / Local Registry Fallback
    const registry = getLocalUserRegistry();
    const localUser = (uid && registry[uid]) || (email && registry[email.toLowerCase()]);
    if (localUser) {
      return {
        state: 'PROFILE_COMPLETE',
        user: localUser,
        missingFields: []
      };
    }

    return {
      state: 'NETWORK_OR_DB_ERROR',
      missingFields: [],
      error: httpRes.error || `Server error (HTTP ${httpRes.status})`
    };
  } catch (apiErr: any) {
    console.error('[userService] MySQL user lookup unexpected exception:', apiErr);
    // Offline / Local Registry Fallback
    const registry = getLocalUserRegistry();
    const localUser = (uid && registry[uid]) || (email && registry[email.toLowerCase()]);
    if (localUser) {
      return {
        state: 'PROFILE_COMPLETE',
        user: localUser,
        missingFields: []
      };
    }
    return {
      state: 'NETWORK_OR_DB_ERROR',
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
    campusId: session.campusId || 'addu-jacinto',
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
): Promise<{ success: boolean; message: string; nextAllowedDate?: Date }> {
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

  const check = await checkUsernameAvailable(newUsername, uid);
  if (!check.available) {
    return { success: false, message: check.reason || 'Username is not available.' };
  }

  const cleanUsername = newUsername.trim().toLowerCase();
  const now = new Date().toISOString();

  // Save in local registry
  const registry = getLocalUserRegistry();
  if (registry[uid]) {
    registry[uid].username = cleanUsername;
    registry[uid].lastUsernameChange = now;
    registry[uid].updatedAt = now;
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registry));
  }

  // Update in MySQL server
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const res = await httpPost(USER_API_URL, {
        action: 'update_username',
        newUsername: cleanUsername
      }, token);

      if (res && res.success) {
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
      } else if (res && !res.success) {
        return {
          success: false,
          message: res.message || 'Unable to update username.',
          nextAllowedDate: res.nextAllowedDate ? new Date(res.nextAllowedDate) : undefined
        };
      }
    }
  } catch (err: any) {
    console.warn('MySQL update username note:', err);
    return {
      success: false,
      message: err?.message || 'Connection error while contacting server. Please check your network.'
    };
  }

  const savedSession = getSavedSession();
  if (savedSession && savedSession.isLoggedIn) {
    savedSession.username = cleanUsername;
    savedSession.lastUsernameChange = now;
    saveSession(savedSession);
  }
  return { 
    success: true, 
    message: 'Username updated successfully!',
    nextAllowedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
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

/**
 * Switch account schedules safely with multi-account isolation:
 * 1. Saves oldUid's current schedules to local cache and backs up synchronously to MySQL.
 * 2. Clears local db.schedules only AFTER sync finishes.
 * 3. If newUid exists, checks local account cache first, then syncs latest from MySQL.
 * 4. If guest (no newUid), loads guest cache or leaves empty so new account/guest never sees previous account's classes.
 */
export async function switchAccountSchedules(
  oldUid?: string, 
  newUid?: string,
  session?: StudentAuthSession
): Promise<void> {
  // 1. Back up old account's current schedules, tasks, routines to that account's own cache & cloud
  try {
    if (oldUid && session && session.uid === oldUid && session.isLoggedIn) {
      const [currentSchedules, currentTasks, currentRoutines, currentExpenses] = await Promise.all([
        db.schedules.toArray(),
        db.tasks.toArray(),
        db.dayReminders.toArray(),
        db.expenses.toArray()
      ]);

      if (currentSchedules.length > 0) {
        localStorage.setItem(`skweladabaw_cached_schedules_${oldUid}`, JSON.stringify(currentSchedules));
      }
      if (currentTasks.length > 0) {
        localStorage.setItem(`skweladabaw_cached_tasks_${oldUid}`, JSON.stringify(currentTasks));
      }
      if (currentRoutines.length > 0) {
        localStorage.setItem(`skweladabaw_cached_routines_${oldUid}`, JSON.stringify(currentRoutines));
      }
      if (currentExpenses.length > 0) {
        localStorage.setItem(`skweladabaw_cached_expenses_${oldUid}`, JSON.stringify(currentExpenses));
      }

      // Direct, blocking sync so cloud receives data before logout/switch
      try {
        await syncLocalDataToCloud(session);
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Error saving old account data during switch:', err);
  }

  // 2. Clear guest cache & ALWAYS wipe Dexie tables so schedules/tasks NEVER bleed into other accounts
  try {
    localStorage.removeItem('skweladabaw_cached_schedules_guest');
    await Promise.all([
      db.schedules.clear(),
      db.tasks.clear(),
      db.dayReminders.clear(),
      db.expenses.clear()
    ]);
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
    return;
  }

  // 5. If switching to a new registered user (newUid)
  // Check new user's local account cache first (instant 0ms response)
  try {
    const cachedSchedRaw = localStorage.getItem(`skweladabaw_cached_schedules_${newUid}`);
    if (cachedSchedRaw) {
      const cached = JSON.parse(cachedSchedRaw);
      if (Array.isArray(cached) && cached.length > 0) {
        await db.schedules.bulkAdd(cached);
        await scheduleAllClassSchedulesReminders(cached);
        await refreshUnremovableClassNotification(cached);
        syncScheduleToWidgets(cached);
      }
    }

    const cachedTasksRaw = localStorage.getItem(`skweladabaw_cached_tasks_${newUid}`);
    if (cachedTasksRaw) {
      const cached = JSON.parse(cachedTasksRaw);
      if (Array.isArray(cached) && cached.length > 0) {
        await db.tasks.bulkAdd(cached);
        syncTasksToWidgets(cached);
      }
    }

    const cachedRoutinesRaw = localStorage.getItem(`skweladabaw_cached_routines_${newUid}`);
    if (cachedRoutinesRaw) {
      const cached = JSON.parse(cachedRoutinesRaw);
      if (Array.isArray(cached) && cached.length > 0) {
        await db.dayReminders.bulkAdd(cached);
      }
    }
  } catch (_) {}

  // Then fetch latest authoritative data from MySQL cloud
  try {
    await restoreUserData(newUid);
  } catch (err) {
    console.warn('MySQL cloud sync on account switch note:', err);
  }
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
    const query = uid ? `uid=${encodeURIComponent(uid)}` : `email=${encodeURIComponent(email || '')}`;
    const url = `${USER_API_URL}?action=verify_session&${query}&t=${Date.now()}`;
    const res = await httpGet(url);

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
): Promise<{ exists: boolean; missingFields: string[]; user?: UserAccountRecord }> {
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
  // On network or DB error: default to safe existing profile without hallucinating missing fields
  const registry = getLocalUserRegistry();
  const cached = (uid && registry[uid]) || (email && registry[email.toLowerCase()]) || undefined;
  return {
    exists: true,
    missingFields: [],
    user: cached
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
  // Mark profile dirty so startup hydration never overwrites with older MySQL data
  localStorage.setItem('skweladabaw_profile_dirty', 'true');
  localStorage.setItem('skweladabaw_profile_updated_at', String(Date.now()));

  try {
    const token = await getFirebaseIdToken();
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
