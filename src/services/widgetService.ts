import { registerPlugin, Capacitor } from '@capacitor/core';
import { ClassSchedule, TaskItem, DayReminderItem } from '../types';

export interface WidgetBridgePluginType {
  setWidgetData(options: { key: string; value: string }): Promise<{ success: boolean }>;
  updateWidgets(): Promise<{ success: boolean }>;
  isBatteryOptimized(): Promise<{ isIgnoringBatteryOptimizations: boolean }>;
  requestBatteryExemption(): Promise<{ success: boolean }>;
  requestNotificationPermission(): Promise<{ granted: boolean; openedSettings: boolean }>;
  postUnremovableNotification(options: {
    title: string;
    body: string;
    subText?: string;
    currentClass?: string;
    currentRoom?: string;
    currentTime?: string;
    nextClass?: string;
    nextRoom?: string;
    nextTime?: string;
    statusState?: string;
  }): Promise<{ success: boolean }>;
  cancelUnremovableNotification(): Promise<{ success: boolean }>;
  saveImageToGallery(options: { dataUrl: string; fileName: string }): Promise<{ success: boolean; message: string }>;
  getLaunchTarget(): Promise<{ tab: string; action: string }>;
  getCurrentLocation(): Promise<{ lat: number; lng: number; accuracy?: number }>;
  openLocationSettings(options?: { type?: 'location' | 'permission' }): Promise<{ success: boolean }>;
  checkLocationStatus?(): Promise<{ isPermitted: boolean; isGpsEnabled: boolean }>;
  getNetworkStatus?(): Promise<{
    connected: boolean;
    validated?: boolean;
    connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
    error?: string;
  }>;
}

export const WidgetBridge = registerPlugin<WidgetBridgePluginType>('WidgetBridge');

/**
 * Check device network connectivity via native Android ConnectivityManager when available
 */
export async function checkDeviceNetworkStatus(): Promise<{
  connected: boolean;
  connectionType: string;
}> {
  if (Capacitor.isNativePlatform() && WidgetBridge.getNetworkStatus) {
    try {
      const res = await WidgetBridge.getNetworkStatus();
      return {
        connected: !!res.connected,
        connectionType: res.connectionType || 'unknown',
      };
    } catch {
      // Fallback below
    }
  }
  return {
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseMinutesTs(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const upper = timeStr.trim().toUpperCase();
  const isPm = upper.includes('PM');
  const isAm = upper.includes('AM');
  const cleaned = upper.replace('AM', '').replace('PM', '').trim();
  const [hStr, mStr] = cleaned.split(':');
  let h = parseInt(hStr, 10) || 0;
  let m = parseInt(mStr?.replace(/\D/g, ''), 10) || 0;
  if (isPm && h < 12) h += 12;
  else if (isAm && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Format HH:mm string to readable 12-hour AM/PM string without parentheses
 */
export function format12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const upper = timeStr.trim().toUpperCase();
  if (upper.includes('AM') || upper.includes('PM')) {
    return timeStr.trim();
  }
  const mins = parseMinutesTs(timeStr);
  let h = Math.floor(mins / 60);
  const m = (mins % 60).toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Synchronize current student class schedule to Android Home Screen Widgets
 */
export async function syncScheduleToWidgets(schedules: ClassSchedule[]): Promise<void> {
  try {
    const now = new Date();
    const todayName = DAY_NAMES[now.getDay()];
    const todayClasses = (schedules || []).filter((s) => s.days && s.days.includes(todayName as any));
    todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let currentClass: ClassSchedule | null = null;
    let nextClass: ClassSchedule | null = null;
    const remainingClasses: ClassSchedule[] = [];

    for (const cls of todayClasses) {
      const startMin = parseMinutesTs(cls.startTime);
      const endMin = parseMinutesTs(cls.endTime);

      if (currentMinutes >= startMin && currentMinutes <= endMin) {
        currentClass = cls;
      } else if (currentMinutes < startMin) {
        if (!nextClass) nextClass = cls;
        remainingClasses.push(cls);
      }
    }

    let smallBadge = 'NEXT CLASS';
    let smallTime = '';
    let smallSubject = 'No classes scheduled';
    let smallRoom = 'Campus';

    let mediumCount = `${todayClasses.length} classes today`;
    let mediumSubject = 'No classes left for today';
    let mediumMeta = 'Enjoy the rest of your day';
    let mediumUpcoming = 'All classes completed';

    if (currentClass) {
      smallBadge = 'CURRENT CLASS';
      smallTime = `${format12Hour(currentClass.startTime)} - ${format12Hour(currentClass.endTime)}`;
      smallSubject = currentClass.subjectCode;
      smallRoom = `Room ${currentClass.room || 'Campus'}${currentClass.building ? ` • ${currentClass.building}` : ''}`;

      mediumSubject = `${currentClass.subjectCode} • ${currentClass.subjectName}`;
      mediumMeta = `${smallTime} • Room ${currentClass.room || 'Campus'}`;
      if (nextClass) {
        mediumUpcoming = `Next: ${nextClass.subjectCode} • ${format12Hour(nextClass.startTime)}`;
      } else {
        mediumUpcoming = 'Last class of the day';
      }
    } else if (nextClass) {
      smallBadge = 'NEXT CLASS';
      smallTime = format12Hour(nextClass.startTime);
      smallSubject = nextClass.subjectCode;
      smallRoom = `Room ${nextClass.room || 'Campus'}${nextClass.building ? ` • ${nextClass.building}` : ''}`;

      mediumSubject = `${nextClass.subjectCode} • ${nextClass.subjectName}`;
      mediumMeta = `${format12Hour(nextClass.startTime)} - ${format12Hour(nextClass.endTime)} • Room ${nextClass.room || 'Campus'}`;
      if (remainingClasses.length > 1) {
        const afterNext = remainingClasses[1];
        mediumUpcoming = `Then: ${afterNext.subjectCode} • ${format12Hour(afterNext.startTime)}`;
      } else {
        mediumUpcoming = 'Single class remaining today';
      }
    } else if (todayClasses.length > 0) {
      smallBadge = 'COMPLETED';
      smallTime = 'All Done';
      smallSubject = 'No classes left for today';
      smallRoom = 'Enjoy your day';

      mediumSubject = 'Classes Completed Today';
      mediumMeta = 'You are all done with classes for today';
      mediumUpcoming = 'Have a restful evening';
    } else {
      smallBadge = 'DAY OFF';
      smallTime = 'No Class';
      smallSubject = 'No classes today';
      smallRoom = 'Enjoy your day off';

      mediumCount = 'No classes today';
      mediumSubject = 'You have no class for today';
      mediumMeta = 'Free schedule today';
      mediumUpcoming = 'SkwelaDabaw Daily Companion';
    }

    // Large Widget: item 1 and item 2
    let item1Time = '';
    let item1Title = 'No classes scheduled';
    let item1Room = 'Tap to setup timetable';
    let item2Time = '';
    let item2Title = '';
    let item2Room = '';

    if (todayClasses.length > 0) {
      const first = currentClass || nextClass || todayClasses[0];
      item1Time = `${format12Hour(first.startTime)} - ${format12Hour(first.endTime)}`;
      item1Title = `${first.subjectCode} • ${first.subjectName}`;
      item1Room = `Room ${first.room || 'Campus'}${first.building ? ` • ${first.building}` : ''}`;

      if (todayClasses.length > 1) {
        const second = (first === todayClasses[0]) ? todayClasses[1] : (remainingClasses[0] || todayClasses[1]);
        item2Time = `${format12Hour(second.startTime)} - ${format12Hour(second.endTime)}`;
        item2Title = `${second.subjectCode} • ${second.subjectName}`;
        item2Room = `Room ${second.room || 'Campus'}${second.building ? ` • ${second.building}` : ''}`;
      }
    }

    const payload = {
      smallBadge,
      smallTime,
      smallSubject,
      smallRoom,
      mediumCount,
      mediumSubject,
      mediumMeta,
      mediumUpcoming,
      largeDay: todayName,
      item1Time,
      item1Title,
      item1Room,
      item2Time,
      item2Title,
      item2Room,
      timestamp: Date.now()
    };

    const jsonStr = JSON.stringify(payload);
    const allSchedulesJson = JSON.stringify(schedules || []);
    localStorage.setItem('skweladabaw_widget_schedule_data', jsonStr);
    localStorage.setItem('skweladabaw_all_schedules_json', allSchedulesJson);

    if (Capacitor.isNativePlatform()) {
      const activeThemeId = localStorage.getItem('skweladabaw_theme') || 'light';
      await WidgetBridge.setWidgetData({ key: 'app_theme_id', value: activeThemeId });
      await WidgetBridge.setWidgetData({ key: 'all_schedules_json', value: allSchedulesJson });
      await WidgetBridge.setWidgetData({ key: 'widget_schedule_data', value: jsonStr });
      await WidgetBridge.updateWidgets();
      import('./eagleOverlayService').then((m) => m.autoSyncCurrentStateToOverlay()).catch(() => {});
    }
  } catch (err) {
    console.warn('Error syncing schedule to widgets:', err);
  }
}

/**
 * Synchronize student task items to Android Home Screen Widgets
 */
export async function syncTasksToWidgets(tasks: TaskItem[]): Promise<void> {
  try {
    const pending = (tasks || []).filter((t) => !t.completed && t.sync_status !== 'pending_delete');
    // Sort by due date ascending
    pending.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

    let count = `${pending.length} Pending`;
    let task1Item = 'All caught up!';
    let task1Sub = 'Zero pending assignments';
    let task2Item = '';
    let task2Sub = '';

    if (pending.length > 0) {
      task1Item = `• ${pending[0].title}`;
      task1Sub = `Due ${pending[0].dueDate || 'No date'} • ${pending[0].priority.toUpperCase()}`;
    }

    if (pending.length > 1) {
      task2Item = `• ${pending[1].title}`;
      task2Sub = `Due ${pending[1].dueDate || 'No date'} • ${pending[1].priority.toUpperCase()}`;
    }

    const payload = {
      count,
      task1Item,
      task1Sub,
      task2Item,
      task2Sub,
      timestamp: Date.now()
    };

    const jsonStr = JSON.stringify(payload);
    const allTasksJson = JSON.stringify(tasks || []);
    localStorage.setItem('skweladabaw_widget_tasks_data', jsonStr);
    localStorage.setItem('skweladabaw_all_tasks_json', allTasksJson);

    if (Capacitor.isNativePlatform()) {
      const activeThemeId = localStorage.getItem('skweladabaw_theme') || 'light';
      await WidgetBridge.setWidgetData({ key: 'app_theme_id', value: activeThemeId });
      await WidgetBridge.setWidgetData({ key: 'widget_tasks_data', value: jsonStr });
      await WidgetBridge.setWidgetData({ key: 'all_tasks_json', value: allTasksJson });
      await WidgetBridge.updateWidgets();
      import('./eagleOverlayService').then((m) => m.autoSyncCurrentStateToOverlay()).catch(() => {});
    }
  } catch (err) {
    console.warn('Error syncing tasks to widgets:', err);
  }
}

/**
 * Synchronize weekly day routine reminders to Android Home Screen Widgets
 */
export async function syncRoutinesToWidgets(routines: DayReminderItem[]): Promise<void> {
  try {
    const allRoutines = routines || [];
    const allRoutinesJson = JSON.stringify(allRoutines);
    localStorage.setItem('skweladabaw_all_routines_json', allRoutinesJson);

    if (Capacitor.isNativePlatform()) {
      const activeThemeId = localStorage.getItem('skweladabaw_theme') || 'light';
      await WidgetBridge.setWidgetData({ key: 'app_theme_id', value: activeThemeId });
      await WidgetBridge.setWidgetData({ key: 'all_routines_json', value: allRoutinesJson });
      await WidgetBridge.updateWidgets();
      import('./eagleOverlayService').then((m) => m.autoSyncCurrentStateToOverlay()).catch(() => {});
    }
  } catch (err) {
    console.warn('Error syncing routines to widgets:', err);
  }
}

/**
 * Synchronize currently equipped app theme to Android Home Screen Widgets
 */
export async function syncThemeToWidgets(themeId: string): Promise<void> {
  try {
    if (!themeId) return;
    localStorage.setItem('skweladabaw_theme', themeId);
    if (Capacitor.isNativePlatform()) {
      await WidgetBridge.setWidgetData({ key: 'app_theme_id', value: themeId });
      await WidgetBridge.updateWidgets();
    }
  } catch (err) {
    console.warn('Error syncing theme to widgets:', err);
  }
}

/**
 * Check if app has battery optimization exemption
 */
export async function isBatteryExemptionActive(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await WidgetBridge.isBatteryOptimized();
    return res.isIgnoringBatteryOptimizations;
  } catch {
    return false;
  }
}

/**
 * Request battery optimization exemption from Android OS
 */
export async function requestBatteryExemption(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await WidgetBridge.requestBatteryExemption();
  } catch (err) {
    console.warn('Failed to request battery exemption:', err);
  }
}

/**
 * Request notification permission via native Android channel / bridge
 */
export async function requestNativeNotificationPermission(): Promise<{ granted: boolean; openedSettings: boolean }> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return { granted: true, openedSettings: false };
  }
  try {
    return await WidgetBridge.requestNotificationPermission();
  } catch (err) {
    console.warn('Failed to request native notification permission:', err);
    return { granted: false, openedSettings: false };
  }
}

export interface UnremovableNotificationDetails {
  currentClass?: string;
  currentRoom?: string;
  currentTime?: string;
  nextClass?: string;
  nextRoom?: string;
  nextTime?: string;
  statusState?: string;
  themeKey?: string;
  themeBg?: string;
  themeAccent?: string;
  themeBorder?: string;
  themeText?: string;
}

/**
 * Dispatch unremovable ongoing notification natively through Android NotificationManager and Foreground Service
 */
export async function postNativeUnremovableNotification(
  title: string, 
  body: string, 
  subText?: string,
  extraDetails?: UnremovableNotificationDetails
): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      await WidgetBridge.postUnremovableNotification({ 
        title, 
        body, 
        subText,
        ...extraDetails
      });
      return true;
    }
  } catch (err) {
    console.warn('Native unremovable notification dispatch error:', err);
  }
  return false;
}

/**
 * Cancel native Android unremovable ongoing notification
 */
export async function cancelNativeUnremovableNotification(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      await WidgetBridge.cancelUnremovableNotification();
      return true;
    }
  } catch (err) {
    console.warn('Native unremovable notification cancel error:', err);
  }
  return false;
}

/**
 * Save rendered wallpaper image to user gallery / media store on Android
 */
export async function saveWallpaperToDevice(dataUrl: string, fileName: string): Promise<{ success: boolean; message?: string }> {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const res = await WidgetBridge.saveImageToGallery({ dataUrl, fileName });
      return { success: res.success, message: res.message || 'Saved to Photos' };
    }
  } catch (err: any) {
    console.warn('Native save image to gallery failed:', err);
  }

  // Web fallback: download via object URL / anchor click
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { success: true, message: 'Image downloaded' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Download failed' };
  }
}
