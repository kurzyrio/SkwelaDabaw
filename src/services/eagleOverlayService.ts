import { registerPlugin, Capacitor } from '@capacitor/core';
import { db } from '../db';

export interface EagleOverlayData {
  weatherTemp?: number | string;
  weatherCondition?: string;
  weatherIcon?: string;
  heatIndex?: number | string;
  currentClass?: string;
  currentRoom?: string;
  currentTime?: string;
  nextClass?: string;
  nextRoom?: string;
  nextTime?: string;
  statusState?: string;
  pendingTasksCount?: number;
  nextTaskTitle?: string;
  nextTaskDue?: string;
  themeId?: string;
}

export interface NativeOverlayState {
  granted: boolean;
  running: boolean;
  enabled: boolean;
}

export interface EagleOverlayPluginType {
  checkOverlayPermission(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<{ granted: boolean; openedSettings: boolean }>;
  startEagleOverlay(): Promise<{ success: boolean }>;
  stopEagleOverlay(): Promise<{ success: boolean }>;
  isOverlayRunning(): Promise<{ running: boolean }>;
  getOverlayState(): Promise<NativeOverlayState>;
  resetBubblePosition(): Promise<{ success: boolean }>;
  syncOverlayData(data: EagleOverlayData): Promise<{ success: boolean }>;
}

export const EagleOverlayBridge = registerPlugin<EagleOverlayPluginType>('EagleOverlay');

export const EAGLE_OVERLAY_STORAGE_KEY = 'skweladabaw_eagle_overlay_enabled';

/** Safe 12h / 24h time parser ("13:30", "1:30 PM", "07:15 AM") -> minutes since midnight */
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const upper = timeStr.trim().toUpperCase();
  const isPm = upper.includes('PM');
  const isAm = upper.includes('AM');
  const cleaned = upper.replace('AM', '').replace('PM', '').trim();
  const [hStr, mStr] = cleaned.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt((mStr || '').replace(/\D/g, ''), 10) || 0;
  if (isPm && h < 12) h += 12;
  else if (isAm && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Returns whether Eagle Overlay is enabled in local user preferences (strictly opt-in, default false)
 */
export function isEagleOverlayEnabledPref(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(EAGLE_OVERLAY_STORAGE_KEY) === 'true';
}

/**
 * Persists the user's preference for the Eagle Overlay
 */
export function setEagleOverlayEnabledPref(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(EAGLE_OVERLAY_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Queries native Android truth for permission, service running status, and user-active state
 */
export async function getNativeOverlayState(): Promise<NativeOverlayState> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return { granted: false, running: false, enabled: false };
  }
  try {
    const res = await EagleOverlayBridge.getOverlayState();
    return {
      granted: Boolean(res?.granted),
      running: Boolean(res?.running),
      enabled: Boolean(res?.enabled)
    };
  } catch {
    return { granted: false, running: false, enabled: false };
  }
}

/**
 * Checks if the system overlay permission (SYSTEM_ALERT_WINDOW) is granted
 */
export async function isOverlayPermitted(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    const res = await EagleOverlayBridge.checkOverlayPermission();
    return !!res?.granted;
  } catch {
    return false;
  }
}

/**
 * Requests overlay permission, routing the user to Android system settings if necessary
 */
export async function requestOverlayPerm(): Promise<{ granted: boolean; openedSettings: boolean }> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return { granted: false, openedSettings: false };
  }
  try {
    return await EagleOverlayBridge.requestOverlayPermission();
  } catch {
    return { granted: false, openedSettings: false };
  }
}

/**
 * Starts the native Messenger-style floating bubble foreground service
 */
export async function startEagleOverlay(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    const res = await EagleOverlayBridge.startEagleOverlay();
    if (res?.success) {
      setEagleOverlayEnabledPref(true);
      await autoSyncCurrentStateToOverlay();
      return true;
    }
  } catch (err) {
    console.warn('Failed to start Eagle Overlay:', err);
  }
  return false;
}

/**
 * Stops the native floating bubble service
 */
export async function stopEagleOverlay(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    const res = await EagleOverlayBridge.stopEagleOverlay();
    setEagleOverlayEnabledPref(false);
    return !!res?.success;
  } catch (err) {
    console.warn('Failed to stop Eagle Overlay:', err);
    return false;
  }
}

/**
 * Resets the native floating bubble back to its default resting edge
 */
export async function resetEagleBubblePosition(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    const res = await EagleOverlayBridge.resetBubblePosition();
    return !!res?.success;
  } catch (err) {
    console.warn('Failed to reset Eagle bubble position:', err);
    return false;
  }
}

/**
 * Checks if the floating overlay service is currently running
 */
export async function checkIsOverlayRunning(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    const res = await EagleOverlayBridge.isOverlayRunning();
    return !!res?.running;
  } catch {
    return false;
  }
}

/**
 * Synchronizes updated weather, schedule, task, and theme state to the overlay service
 */
export async function syncDataToEagleOverlay(data: EagleOverlayData): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }
  try {
    await EagleOverlayBridge.syncOverlayData(data);
  } catch (err) {
    console.warn('Failed to sync data to Eagle Overlay:', err);
  }
}

/**
 * Reads live timetable schedules, pending tasks, and weather cache and pushes them to the native bubble
 */
export async function autoSyncCurrentStateToOverlay(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }
  try {
    const payload: EagleOverlayData = {
      currentClass: '',
      currentRoom: '',
      currentTime: '',
      nextClass: '',
      nextRoom: '',
      nextTime: '',
      statusState: 'clear',
      pendingTasksCount: 0,
      nextTaskTitle: '',
      nextTaskDue: ''
    };

    // 1. Read cached weather
    const rawWeather = localStorage.getItem('skweladabaw_weather_cache');
    if (rawWeather) {
      try {
        const w = JSON.parse(rawWeather);
        if (w?.current) {
          payload.weatherTemp = `${Math.round(w.current.temp)}°C`;
          payload.weatherCondition = w.current.condition || 'Partly Cloudy';
          if (w.current.heatIndex !== undefined) {
            payload.heatIndex = `${Math.round(w.current.heatIndex)}°C`;
          }
        }
      } catch (_) {}
    }

    // 2. Query live schedules directly from Dexie DB (with 12h/24h safe time parsing)
    try {
      const schedules = await db.schedules.toArray();
      const now = new Date();
      const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = DAY_NAMES[now.getDay()];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const todayClasses = schedules
        .filter((s) => {
          if (!Array.isArray(s.days)) return false;
          return s.days.some((d) => {
            const trimmed = (d || '').trim();
            return trimmed === todayName || trimmed === 'Everyday' || todayName.startsWith(trimmed);
          });
        })
        .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

      let ongoingClass: any = null;
      let upcomingClass: any = null;

      for (const s of todayClasses) {
        const start = parseTimeToMinutes(s.startTime);
        const end = parseTimeToMinutes(s.endTime);
        if (currentMinutes >= start && currentMinutes < end) {
          ongoingClass = s;
          break;
        }
        if (start > currentMinutes && !upcomingClass) {
          upcomingClass = s;
        }
      }

      if (ongoingClass) {
        payload.currentClass = ongoingClass.subjectName || ongoingClass.subjectCode;
        payload.currentRoom = ongoingClass.room ? `Rm ${ongoingClass.room}` : '';
        payload.currentTime = `${ongoingClass.startTime} - ${ongoingClass.endTime}`;
        payload.statusState = 'ongoing';
      }

      if (upcomingClass) {
        payload.nextClass = upcomingClass.subjectName || upcomingClass.subjectCode;
        payload.nextRoom = upcomingClass.room ? `Rm ${upcomingClass.room}` : '';
        payload.nextTime = `${upcomingClass.startTime} - ${upcomingClass.endTime}`;
        if (!ongoingClass) {
          payload.statusState = 'upcoming';
        }
      }
    } catch (schedErr) {
      console.warn('Error fetching schedules for overlay:', schedErr);
    }

    // 3. Query tasks directly from Dexie DB
    try {
      const tasks = await db.tasks.toArray();
      const pending = tasks.filter((t) => !t.completed && !t.is_completed);
      payload.pendingTasksCount = pending.length;
      if (pending.length > 0) {
        pending.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
        payload.nextTaskTitle = pending[0].title;
        payload.nextTaskDue = pending[0].dueDate ? `${pending[0].dueDate} ${pending[0].dueTime || ''}`.trim() : '';
      }
    } catch (taskErr) {
      console.warn('Error fetching tasks for overlay:', taskErr);
    }

    payload.themeId = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('skweladabaw_theme') || 'light')
      : 'light';

    await syncDataToEagleOverlay(payload);
  } catch (err) {
    console.warn('Auto sync to Eagle Overlay failed:', err);
  }
}

/**
 * Syncs overlay state cleanly on app launch/resume without ever resurrecting a
 * bubble that the user dismissed via drag-to-close or the notification action.
 */
export function initOverlayLifecycle(onStateChange?: (state: NativeOverlayState) => void): () => void {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return () => {};
  }

  const checkAndSync = async () => {
    try {
      const nativeState = await getNativeOverlayState();
      setEagleOverlayEnabledPref(nativeState.enabled);

      if (onStateChange) {
        onStateChange(nativeState);
      }

      if (nativeState.enabled && nativeState.granted) {
        if (!nativeState.running) {
          await startEagleOverlay();
        } else {
          await autoSyncCurrentStateToOverlay();
        }
      }
    } catch (err) {
      console.warn('Eagle overlay lifecycle check error:', err);
    }
  };

  checkAndSync();

  const handleFocus = () => {
    checkAndSync();
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkAndSync();
    }
  };

  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
