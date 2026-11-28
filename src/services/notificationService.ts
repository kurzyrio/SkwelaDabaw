import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ClassSchedule, TaskItem, DayReminderItem } from '../types';
import { db } from '../db';
import { getBayaniLanguage } from '../utils/bayaniDialogues';
import { 
  postNativeUnremovableNotification, 
  cancelNativeUnremovableNotification,
  requestNativeNotificationPermission,
  format12Hour,
  syncScheduleToWidgets
} from './widgetService';

export const NOTIFICATION_CHANNEL_ID = 'skweladabaw_reminders';
export const ONGOING_NOTIFICATION_CHANNEL_ID = 'skweladabaw_ongoing_class';
export const APP_UPDATE_NOTIFICATION_CHANNEL_ID = 'skweladabaw_updates';
export const APP_UPDATE_NOTIFICATION_ID = 99999;
export const WEATHER_NOTIFICATION_CHANNEL_ID = 'skweladabaw_weather';
export const WEATHER_HEAT_NOTIFICATION_ID = 95001;
export const WEATHER_RAIN_NOTIFICATION_ID = 95002;
export const INGAT_PRE_CLASS_ID_BASE = 81000;
export const INGAT_POST_CLASS_ID_BASE = 82000;
export const INGAT_PRE_CLASS_LEAD_MINUTES = 45;

/**
 * Thoroughly purge any legacy or orphaned notifications that were scheduled in previous app builds
 * and remain lingering in Android's AlarmManager (such as old 78000..78999 recurring alarms,
 * rogue 120000..121500 native alerts, or military-time alerts).
 */
export async function purgeLegacyOrphanedNotifications(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Explicitly cancel legacy range blocks known from prior app builds
    const legacyIds: { id: number }[] = [];
    
    // Rogue native class alert IDs (120000..121500)
    for (let i = 120000; i <= 121500; i++) {
      legacyIds.push({ id: i });
    }
    // Legacy class reminder IDs (78000..78250)
    for (let i = 78000; i <= 78250; i++) {
      legacyIds.push({ id: i });
    }
    // Legacy first-class briefings (70000..70020)
    for (let i = 70000; i <= 70020; i++) {
      legacyIds.push({ id: i });
    }
    // Legacy commute morning & evening alerts (77000..77020 and 79000..79020)
    for (let i = 77000; i <= 77020; i++) {
      legacyIds.push({ id: i });
    }
    for (let i = 79000; i <= 79020; i++) {
      legacyIds.push({ id: i });
    }

    try {
      await LocalNotifications.cancel({ notifications: legacyIds });
    } catch (_) {}

    // 2. Query pending notifications from the OS to find and cancel any zombie recurring alarms
    try {
      const pending = await LocalNotifications.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        const toCancel: { id: number }[] = [];
        for (const notif of pending.notifications) {
          const body = (notif.body || '').toLowerCase();
          const title = (notif.title || '').toLowerCase();
          
          // Detect legacy text patterns: military time, legacy "Greetings, this is your class", etc.
          const isLegacyZombie = 
            (notif.id >= 70000 && notif.id < 80000) ||
            (notif.id >= 120000 && notif.id < 130000) ||
            body.includes('greetings, this is your class') ||
            body.includes('starts at 13:') ||
            body.includes('starts at 14:') ||
            body.includes('starts at 15:') ||
            body.includes('starts at 16:') ||
            body.includes('starts at 17:') ||
            body.includes('starts at 18:') ||
            body.includes('starts at 19:') ||
            body.includes('starts at 20:') ||
            body.includes('starts at 21:') ||
            body.includes('starts at 22:') ||
            body.includes('starts at 23:') ||
            body.includes('starts at 00:') ||
            title.startsWith('first class today') ||
            title.startsWith('good morning dabawenyo');

          if (isLegacyZombie) {
            toCancel.push({ id: notif.id });
          }
        }

        if (toCancel.length > 0) {
          await LocalNotifications.cancel({ notifications: toCancel });
        }
      }
    } catch (e) {
      console.warn('Error checking pending notifications for legacy purge:', e);
    }
  } catch (err) {
    console.warn('Error in purgeLegacyOrphanedNotifications:', err);
  }
}

/**
 * Initialize Android notification channels with high priority and ongoing channel
 */
export async function initializeNotificationChannels(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await purgeLegacyOrphanedNotifications();

      // Reset legacy muted channel if needed to restore native system sound
      try {
        if (localStorage.getItem('skweladabaw_channel_audio_fixed_v2') !== 'true') {
          await LocalNotifications.deleteChannel({ id: NOTIFICATION_CHANNEL_ID });
          localStorage.setItem('skweladabaw_channel_audio_fixed_v2', 'true');
        }
      } catch (_) {}

      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Class & Study Reminders',
        description: 'Alerts for upcoming classes, rooms, and assignments',
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: undefined
      });

      await LocalNotifications.createChannel({
        id: ONGOING_NOTIFICATION_CHANNEL_ID,
        name: 'Unremovable Class Status Bar',
        description: 'Persistent ongoing notification showing current and next class',
        importance: 3,
        visibility: 1,
        vibration: false,
        sound: undefined
      });

      await LocalNotifications.createChannel({
        id: APP_UPDATE_NOTIFICATION_CHANNEL_ID,
        name: 'App Updates',
        description: 'Notifications for new SkwelaDabaw releases and student feature updates',
        importance: 4,
        visibility: 1,
        vibration: true,
        sound: undefined
      });

      await LocalNotifications.createChannel({
        id: WEATHER_NOTIFICATION_CHANNEL_ID,
        name: 'Davao Weather & Commuter Alerts',
        description: 'Actionable advisories for extreme heat index, heavy rain, and commute delays in Davao City',
        importance: 4,
        visibility: 1,
        vibration: true,
        sound: undefined
      });
    }
  } catch (err) {
    console.warn('Failed to create notification channel:', err);
  }
}

/**
 * Request notification permissions on Android / Web
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await initializeNotificationChannels();

    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        const nativeRes = await requestNativeNotificationPermission();
        if (nativeRes.granted) return true;
      }
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
  }
  return false;
}

/**
 * Check if notification permission is currently granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
  } catch (err) {
    console.warn('Failed to check notification permission:', err);
  }
  return false;
}

/**
 * Send an immediate test notification to verify notification functionality
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return {
        success: false,
        message: 'Notification permission was denied. Please enable notifications in your browser or device settings.'
      };
    }

    await initializeNotificationChannels();

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 99999,
            title: 'SkwelaDabaw',
            body: 'Your class reminders and campus notifications are working properly!',
            channelId: NOTIFICATION_CHANNEL_ID,
            schedule: {
              at: new Date(Date.now() + 500),
              allowWhileIdle: true
            },
            extra: {
              type: 'test_notification'
            }
          }
        ]
      });
      return {
        success: true,
        message: 'Test notification sent! Check your notification tray.'
      };
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification('SkwelaDabaw', {
            body: 'Your class reminders and campus notifications are working properly!',
            icon: '/compass.svg',
            badge: '/compass.svg'
          } as any);
        } else {
          new Notification('SkwelaDabaw', {
            body: 'Your class reminders and campus notifications are working properly!',
            icon: '/compass.svg'
          });
        }
      } catch {
        new Notification('SkwelaDabaw', {
          body: 'Your class reminders and campus notifications are working properly!'
        });
      }

      return {
        success: true,
        message: 'Test notification sent to your browser!'
      };
    }

    return {
      success: true,
      message: 'Notification trigger executed.'
    };
  } catch (err: any) {
    console.error('Error sending test notification:', err);
    return {
      success: false,
      message: `Failed to trigger notification: ${err?.message || 'Unknown error'}`
    };
  }
}

export const DAY_INDEX_MAP: Record<string, number> = {
  'Sunday': 1,
  'Monday': 2,
  'Tuesday': 3,
  'Wednesday': 4,
  'Thursday': 5,
  'Friday': 6,
  'Saturday': 7
};

/**
 * Format room and building into clean, professional display text
 */
export function formatRoomBuilding(room?: string, building?: string): string {
  if (!room && !building) return 'Campus Room';
  const cleanRoom = room?.trim() || '';
  const cleanBuilding = building?.trim() || '';
  const prefix = cleanRoom.toLowerCase().startsWith('room') || cleanRoom.toLowerCase().startsWith('lab') ? '' : 'Room ';
  if (cleanRoom && cleanBuilding) {
    return `${prefix}${cleanRoom} • ${cleanBuilding}`;
  }
  return cleanRoom ? `${prefix}${cleanRoom}` : cleanBuilding;
}

/**
 * Safe 32-bit positive integer notification ID for a schedule and weekday
 */
export function getClassReminderNotificationId(scheduleId: number, weekday: number): number {
  return 100000 + ((scheduleId % 10000) * 10) + (weekday % 10);
}

/**
 * Schedule recurring weekly reminders for a class schedule.
 * Only schedules if the user has explicitly set an alarm (reminderMinutes > 0).
 */
export async function scheduleClassScheduleReminder(schedule: ClassSchedule): Promise<void> {
  if (!schedule.id || !schedule.startTime || !schedule.days || schedule.days.length === 0) return;

  const defaultTiming = Number(localStorage.getItem('skweladabaw_reminder_timing') || 10);
  const reminderMinutes = (schedule.reminderMinutes !== undefined && schedule.reminderMinutes !== null)
    ? schedule.reminderMinutes
    : defaultTiming;

  if (reminderMinutes <= 0) {
    // If set to None (0), ensure any prior alarm is canceled
    await cancelScheduleReminder(schedule.id);
    return;
  }

  try {
    if (!Capacitor.isNativePlatform()) return;
    await initializeNotificationChannels();

    // Parse start time (HH:mm)
    const [startHourStr, startMinStr] = schedule.startTime.split(':');
    const startHour = parseInt(startHourStr, 10);
    const startMin = parseInt(startMinStr, 10);
    if (isNaN(startHour) || isNaN(startMin)) return;

    // Cancel existing notifications for this schedule
    await cancelScheduleReminder(schedule.id);

    // Calculate trigger time
    let notifyMinute = startMin - reminderMinutes;
    let notifyHour = startHour;
    while (notifyMinute < 0) {
      notifyMinute += 60;
      notifyHour -= 1;
    }
    if (notifyHour < 0) {
      notifyHour += 24;
    }

    const roomText = formatRoomBuilding(schedule.room, schedule.building);
    const notesSection = schedule.notes && schedule.notes.trim().length > 0
      ? `Notes and Reminders:\n${schedule.notes.trim()}`
      : 'No extra notes recorded for this class';
    const instructorSection = schedule.instructor ? `\nInstructor: ${schedule.instructor}` : '';
    const formattedTimeRange = `${format12Hour(schedule.startTime)} - ${format12Hour(schedule.endTime)}`;
    const largeBodyText = `${schedule.subjectName}\nTime: ${formattedTimeRange}\nRoom: ${roomText}${instructorSection}\n\n${notesSection}`;

    const notificationsToSchedule = schedule.days.map((day) => {
      const weekday = DAY_INDEX_MAP[day] || 2;
      const notifId = getClassReminderNotificationId(schedule.id!, weekday);

      return {
        id: notifId,
        title: `Next Class in ${reminderMinutes}m: ${schedule.subjectCode}`,
        body: `${schedule.subjectName} • Starts at ${format12Hour(schedule.startTime)} • ${roomText}${schedule.notes ? ` • Note: ${schedule.notes}` : ''}`,
        largeBody: largeBodyText,
        summaryText: `Upcoming Class • ${schedule.subjectCode}`,
        channelId: NOTIFICATION_CHANNEL_ID,
        schedule: {
          on: {
            weekday,
            hour: notifyHour,
            minute: notifyMinute
          },
          allowWhileIdle: true
        },
        extra: {
          scheduleId: schedule.id,
          type: 'class_reminder'
        }
      };
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  } catch (err) {
    console.warn('Error scheduling class reminder:', err);
  }
}

/**
 * Schedule recurring weekly reminders for class schedules that have alarms enabled.
 * Only schedules alarms for subjects where the student explicitly configured reminderMinutes > 0,
 * strictly eliminating unrequested duplicate notifications.
 */
export async function scheduleAllClassSchedulesReminders(schedules: ClassSchedule[]): Promise<void> {
  if (!schedules || schedules.length === 0) return;

  try {
    if (!Capacitor.isNativePlatform()) return;
    await initializeNotificationChannels();

    const defaultTiming = Number(localStorage.getItem('skweladabaw_reminder_timing') || 10);
    const notificationsToSchedule: any[] = [];

    for (const schedule of schedules) {
      if (!schedule.id || !schedule.startTime || !schedule.days || schedule.days.length === 0) continue;

      const rem = (schedule.reminderMinutes !== undefined && schedule.reminderMinutes !== null)
        ? schedule.reminderMinutes
        : defaultTiming;

      if (rem <= 0) continue;

      const [startHourStr, startMinStr] = schedule.startTime.split(':');
      const startHour = parseInt(startHourStr, 10);
      const startMin = parseInt(startMinStr, 10);
      if (isNaN(startHour) || isNaN(startMin)) continue;

      let notifyMinute = startMin - rem;
      let notifyHour = startHour;
      while (notifyMinute < 0) {
        notifyMinute += 60;
        notifyHour -= 1;
      }
      if (notifyHour < 0) {
        notifyHour += 24;
      }

      const roomText = formatRoomBuilding(schedule.room, schedule.building);
      const notesSection = schedule.notes && schedule.notes.trim().length > 0
        ? `Notes and Reminders:\n${schedule.notes.trim()}`
        : 'No extra notes recorded for this class';
      const instructorSection = schedule.instructor ? `\nInstructor: ${schedule.instructor}` : '';
      const formattedTimeRange = `${format12Hour(schedule.startTime)} - ${format12Hour(schedule.endTime)}`;
      const largeBodyText = `${schedule.subjectName}\nTime: ${formattedTimeRange}\nRoom: ${roomText}${instructorSection}\n\n${notesSection}`;

      for (const day of schedule.days) {
        const weekday = DAY_INDEX_MAP[day] || 2;
        const notifId = getClassReminderNotificationId(schedule.id, weekday);

        notificationsToSchedule.push({
          id: notifId,
          title: `Next Class in ${rem}m: ${schedule.subjectCode}`,
          body: `${schedule.subjectName} • Starts at ${format12Hour(schedule.startTime)} • ${roomText}${schedule.notes ? ` • Note: ${schedule.notes}` : ''}`,
          largeBody: largeBodyText,
          summaryText: `Upcoming Class • ${schedule.subjectCode}`,
          channelId: NOTIFICATION_CHANNEL_ID,
          schedule: {
            on: {
              weekday,
              hour: notifyHour,
              minute: notifyMinute
            },
            allowWhileIdle: true
          },
          extra: {
            scheduleId: schedule.id,
            type: 'class_reminder'
          }
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  } catch (err) {
    console.warn('Error scheduling all class reminders:', err);
  }
}

/**
 * Clean up legacy first class daily briefing IDs and schedule all classes
 */
export async function scheduleFirstClassDailyReminder(schedules: ClassSchedule[]): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const cancelList = [0, 1, 2, 3, 4, 5, 6, 7].map((w) => ({ id: 70000 + w }));
    await LocalNotifications.cancel({ notifications: cancelList });
    await scheduleAllClassSchedulesReminders(schedules);
  } catch (err) {
    console.warn('Error in scheduleFirstClassDailyReminder:', err);
  }
}

/**
 * Cancel reminders for a specific class schedule
 */
export async function cancelScheduleReminder(scheduleId: number): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const idsToCancel = [1, 2, 3, 4, 5, 6, 7].flatMap((weekday) => [
      { id: getClassReminderNotificationId(scheduleId, weekday) },
      { id: ((scheduleId % 100000) * 10) + (weekday % 10) }
    ]);
    await LocalNotifications.cancel({ notifications: idsToCancel });
  } catch (err) {
    console.warn('Error canceling class reminder:', err);
  }
}

/**
 * Cancel all active and pending class, task, and routine notifications on account switch or logout
 */
export async function cancelAllAccountReminders(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await cancelPersistentNextClassNotification();
    const pending = await LocalNotifications.getPending();
    if (pending && pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id }))
      });
    }
  } catch (err) {
    console.warn('Error canceling all account reminders:', err);
  }
}

/**
 * Schedule separated reminders & priority-based near-hour notifications for a task
 */
export async function scheduleTaskReminder(task: TaskItem): Promise<void> {
  if (!task.id || !task.dueDate) return;

  try {
    if (!Capacitor.isNativePlatform()) return;
    await initializeNotificationChannels();

    // Always clear existing notifications for this task first
    await cancelTaskReminder(task.id);

    // If marked done or reminders disabled, don't schedule new alerts
    if (task.completed || task.reminderOption === 'none') {
      return;
    }

    const baseNotifId = 800000 + ((task.id % 10000) * 10);
    const notificationsToSchedule: any[] = [];
    const now = Date.now();

    // 1. Primary Reminder (Separated Date & Time)
    const deadlineTimeStr = task.dueTime || '23:59';
    const deadlineDate = new Date(`${task.dueDate}T${deadlineTimeStr}:00`);

    let primaryReminderDate: Date;
    if (task.reminderDate && task.reminderTime) {
      primaryReminderDate = new Date(`${task.reminderDate}T${task.reminderTime}:00`);
    } else if (task.reminderOption === '1h') {
      primaryReminderDate = new Date(deadlineDate.getTime() - (60 * 60 * 1000));
    } else if (task.reminderOption === '1d') {
      primaryReminderDate = new Date(deadlineDate.getTime() - (24 * 60 * 60 * 1000));
    } else {
      const targetRemindDateStr = task.reminderDate || task.dueDate;
      const targetRemindTimeStr = task.reminderTime || '08:00';
      primaryReminderDate = new Date(`${targetRemindDateStr}T${targetRemindTimeStr}:00`);
    }

    if (primaryReminderDate.getTime() > now + 30000) {
      notificationsToSchedule.push({
        id: baseNotifId + 0,
        title: `Bayani Reminder: ${task.title}`,
        body: `${task.subjectCode ? `[${task.subjectCode}] ` : ''}Due ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''} • Priority: ${task.priority.toUpperCase()}`,
        channelId: NOTIFICATION_CHANNEL_ID,
        schedule: {
          at: primaryReminderDate,
          allowWhileIdle: true
        },
        extra: {
          taskId: task.id,
          type: 'task_reminder',
          priority: task.priority
        }
      });
    }

    // 2. Near-Hour Notifications based on Priority level
    // Parse task deadline timestamp
    const deadlineMs = deadlineDate.getTime();

    // Priority Near-Hour Intervals (Hours before deadline)
    // High Priority: 24h, 12h, 4h, 2h, 1h
    // Medium Priority: 24h, 6h, 2h
    // Low Priority: 24h, 3h
    let nearHourIntervals: number[] = [];
    if (task.priority === 'high') {
      nearHourIntervals = [24, 12, 4, 2, 1];
    } else if (task.priority === 'medium') {
      nearHourIntervals = [24, 6, 2];
    } else {
      nearHourIntervals = [24, 3];
    }

    nearHourIntervals.forEach((hoursBefore, index) => {
      const alertMs = deadlineMs - (hoursBefore * 60 * 60 * 1000);
      // Ensure alert time is strictly in the future
      if (alertMs > now + 60000) {
        // Prevent duplicate if within 25 minutes of primary reminder
        const diffFromPrimary = Math.abs(alertMs - primaryReminderDate.getTime());
        if (diffFromPrimary > 25 * 60 * 1000) {
          const isUrgent = hoursBefore <= 2;
          notificationsToSchedule.push({
            id: baseNotifId + 1 + index,
            title: isUrgent ? `⚠️ Bayani Alert: ${task.title} Due Soon` : `Bayani Task: ${task.title}`,
            body: `${task.subjectCode ? `[${task.subjectCode}] ` : ''}Due in ${hoursBefore}h (${deadlineTimeStr}). Tap to view or complete.`,
            channelId: NOTIFICATION_CHANNEL_ID,
            schedule: {
              at: new Date(alertMs),
              allowWhileIdle: true
            },
            extra: {
              taskId: task.id,
              type: 'task_reminder',
              priority: task.priority,
              hoursBefore
            }
          });
        }
      }
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  } catch (err) {
    console.warn('Error scheduling task reminder:', err);
  }
}

/**
 * Cancel all reminder and recurring notifications for a specific task
 */
export async function cancelTaskReminder(taskId: number): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const baseNotifId = 800000 + ((taskId % 10000) * 10);
    const notifIds = Array.from({ length: 10 }, (_, i) => ({ id: baseNotifId + i }));
    await LocalNotifications.cancel({
      notifications: notifIds
    });
  } catch (err) {
    console.warn('Error canceling task reminder:', err);
  }
}

export const FOCUS_TIMER_NOTIFICATION_ID = 88888;
export const PERSISTENT_NEXT_CLASS_NOTIFICATION_ID = 88800;

export interface NotificationThemeConfig {
  id: string;
  name: string;
  bgHex: string;
  accentHex: string;
  borderHex: string;
  textHex: string;
}

export const NOTIFICATION_THEMES: Record<string, NotificationThemeConfig> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight Slate',
    bgHex: '#141416',
    accentHex: '#3B82F6',
    borderHex: '#2C2C2E',
    textHex: '#FFFFFF'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Campus',
    bgHex: '#062E20',
    accentHex: '#30D158',
    borderHex: '#0D4F37',
    textHex: '#FFFFFF'
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Transit',
    bgHex: '#0A2540',
    accentHex: '#60A5FA',
    borderHex: '#1E3A5F',
    textHex: '#FFFFFF'
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Amber',
    bgHex: '#381C06',
    accentHex: '#FF9F0A',
    borderHex: '#5A2E0C',
    textHex: '#FFFFFF'
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Minimal',
    bgHex: '#FFFFFF',
    accentHex: '#000000',
    borderHex: '#E5E5EA',
    textHex: '#000000'
  },
  match_app: {
    id: 'match_app',
    name: 'Match App Theme',
    bgHex: '#18181B',
    accentHex: '#38BDF8',
    borderHex: '#2C2C2E',
    textHex: '#FFFFFF'
  }
};

/**
 * Safely resolves the ongoing notification theme config.
 * Preserves all 5 built-in presets 100% identically, while dynamically reading the active
 * app theme (official or custom) ONLY when the user opts into 'match_app'.
 */
export function resolveNotificationTheme(themeKey?: string): NotificationThemeConfig {
  const key = themeKey || 'midnight';
  if (key !== 'match_app') {
    return NOTIFICATION_THEMES[key] || NOTIFICATION_THEMES.midnight;
  }

  try {
    const activeId = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('skweladabaw_theme') || 'light')
      : 'light';
    // Lazy sync-safe lookup without creating circular startup cost
    const rawSnap = typeof localStorage !== 'undefined'
      ? localStorage.getItem('skweladabaw_active_theme_snapshot')
      : null;

    if (rawSnap) {
      const snap = JSON.parse(rawSnap);
      if (snap && snap.id === activeId && snap.variables) {
        const ns = snap.nativeSurfaces || {};
        const isDark = Boolean(snap.isDark);
        return {
          id: 'match_app',
          name: 'Match App Theme',
          bgHex: ns.cardBg || (isDark ? '#18181B' : '#FFFFFF'),
          accentHex: ns.accent || snap.accentColor || (isDark ? '#38BDF8' : '#007AFF'),
          borderHex: ns.stroke || (isDark ? '#2C2C2E' : '#E5E5EA'),
          textHex: ns.textPrimary || (isDark ? '#FFFFFF' : '#000000')
        };
      }
    }

    const officialMap: Record<string, NotificationThemeConfig> = {
      light: { id: 'match_app', name: 'Match App Theme', bgHex: '#FFFFFF', accentHex: '#007AFF', borderHex: '#E5E5EA', textHex: '#000000' },
      dark: { id: 'match_app', name: 'Match App Theme', bgHex: '#1A1A1A', accentHex: '#30D158', borderHex: '#2C2C2E', textHex: '#FFFFFF' },
      oled: { id: 'match_app', name: 'Match App Theme', bgHex: '#000000', accentHex: '#FFFFFF', borderHex: '#1F1F1F', textHex: '#FFFFFF' },
      emerald: { id: 'match_app', name: 'Match App Theme', bgHex: '#0A2215', accentHex: '#10B981', borderHex: '#16432B', textHex: '#ECFDF5' },
      cyber: { id: 'match_app', name: 'Match App Theme', bgHex: '#0D111A', accentHex: '#00E5FF', borderHex: '#1F293D', textHex: '#FFFFFF' },
      violet: { id: 'match_app', name: 'Match App Theme', bgHex: '#FFFFFF', accentHex: '#7C3AED', borderHex: '#EDE9FE', textHex: '#1E1B4B' }
    };
    return officialMap[activeId] || NOTIFICATION_THEMES.midnight;
  } catch {
    return NOTIFICATION_THEMES.midnight;
  }
}

/**
 * Dispatch or update an ongoing non-removable Study Focus Timer notification
 */
export async function updateFocusTimerNotification(
  remainingSeconds: number,
  isRunning: boolean,
  sessionType = 'Study Session'
): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;

    if (!isRunning || remainingSeconds <= 0) {
      await cancelFocusTimerNotification();
      return;
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    await initializeNotificationChannels();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: FOCUS_TIMER_NOTIFICATION_ID,
          title: `Study Focus Timer • ${formatted}`,
          body: `${sessionType} in progress • Tap to return to study tools`,
          channelId: NOTIFICATION_CHANNEL_ID,
          ongoing: true,
          autoCancel: false,
          schedule: { at: new Date(Date.now() + 100) },
          extra: { type: 'focus_timer' }
        }
      ]
    });
  } catch (err) {
    console.warn('Error updating focus timer notification:', err);
  }
}

/**
 * Cancel the active Study Focus Timer ongoing notification
 */
export async function cancelFocusTimerNotification(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await LocalNotifications.cancel({
      notifications: [{ id: FOCUS_TIMER_NOTIFICATION_ID }]
    });
  } catch (err) {
    console.warn('Error canceling focus timer notification:', err);
  }
}

/**
 * Update or dispatch unremovable status bar notification for current and next class
 * Supports 4 distinct real-world student states:
 * 1. Current class in session + next class
 * 2. Next upcoming class today
 * 3. Classes finished: "Classes Completed • No classes left for today"
 * 4. No classes today: "No Classes Today • You have no class for today"
 */
export async function updateUnremovableClassNotification(
  currentClass: ClassSchedule | null,
  nextClass: ClassSchedule | null,
  hasClassesScheduledToday: boolean,
  themeKey = 'midnight'
): Promise<void> {
  try {
    const isEnabled = localStorage.getItem('skweladabaw_persistent_next_class') === 'true';
    if (!isEnabled) {
      await cancelPersistentNextClassNotification();
      return;
    }

    const theme = resolveNotificationTheme(themeKey);
    await initializeNotificationChannels();

    let notifTitle = 'Student Timetable';
    let notifBody = 'SkwelaDabaw Daily Schedule';

    if (currentClass) {
      notifTitle = `Current Class: ${currentClass.subjectCode}`;
      const nextSnippet = nextClass ? ` • Next: ${nextClass.subjectCode} at ${format12Hour(nextClass.startTime)}` : '';
      notifBody = `${currentClass.subjectName} • Room ${currentClass.room || 'Campus'}${currentClass.building ? ` • ${currentClass.building}` : ''}${nextSnippet}`;
    } else if (nextClass) {
      notifTitle = `Next Class: ${nextClass.subjectCode}`;
      notifBody = `${nextClass.subjectName} • Starts at ${format12Hour(nextClass.startTime)} • Room ${nextClass.room || 'Campus'}${nextClass.building ? ` • ${nextClass.building}` : ''}`;
    } else if (hasClassesScheduledToday) {
      notifTitle = 'Classes Completed';
      notifBody = 'No classes left for today';
    } else {
      notifTitle = 'No Classes Today';
      notifBody = 'You have no class for today';
    }

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const formatRoomBuilding = (room?: string, building?: string) => {
        if (!room && !building) return 'Campus Room';
        const cleanRoom = room?.trim() || '';
        const cleanBuilding = building?.trim() || '';
        const prefix = cleanRoom.toLowerCase().startsWith('room') || cleanRoom.toLowerCase().startsWith('lab') ? '' : 'Room ';
        if (cleanRoom && cleanBuilding) {
          return `${prefix}${cleanRoom} • ${cleanBuilding}`;
        }
        return cleanRoom ? `${prefix}${cleanRoom}` : cleanBuilding;
      };

      const currentFormattedTime = currentClass
        ? `${format12Hour(currentClass.startTime)} - ${format12Hour(currentClass.endTime)}`
        : '';
      const nextFormattedTime = nextClass
        ? format12Hour(nextClass.startTime)
        : '';

      const extraDetails = {
        currentClass: currentClass ? `${currentClass.subjectCode} • ${currentClass.subjectName}` : '',
        currentRoom: currentClass ? formatRoomBuilding(currentClass.room, currentClass.building) : '',
        currentTime: currentFormattedTime,
        nextClass: nextClass ? `${nextClass.subjectCode} • ${nextClass.subjectName}` : '',
        nextRoom: nextClass ? formatRoomBuilding(nextClass.room, nextClass.building) : '',
        nextTime: nextFormattedTime,
        statusState: currentClass ? 'active' : (nextClass ? 'upcoming' : (hasClassesScheduledToday ? 'done' : 'empty')),
        themeKey: theme.id,
        themeBg: theme.bgHex,
        themeAccent: theme.accentHex,
        themeBorder: theme.borderHex,
        themeText: theme.textHex
      };

      const sentNatively = await postNativeUnremovableNotification(
        notifTitle,
        notifBody,
        'Timetable',
        extraDetails
      );
      if (sentNatively) return;
    }

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: PERSISTENT_NEXT_CLASS_NOTIFICATION_ID,
            title: notifTitle,
            body: notifBody,
            channelId: ONGOING_NOTIFICATION_CHANNEL_ID,
            ongoing: true,
            autoCancel: false,
            extra: { 
              type: 'unremovable_status_bar_class',
              theme: theme.id
            }
          }
        ]
      });
    }
  } catch (err) {
    console.warn('Error updating unremovable class notification:', err);
  }
}

/**
 * Backward-compatible wrapper for updating persistent next class status bar card notification
 */
export async function updatePersistentNextClassNotification(
  nextClass: ClassSchedule | null,
  themeKey = 'midnight'
): Promise<void> {
  return updateUnremovableClassNotification(null, nextClass, nextClass !== null, themeKey);
}

/**
 * Compute current and next class from user schedules and refresh the unremovable notification
 */
let lastOngoingEnabledState: boolean | null = null;
let ongoingNotificationTimeout: ReturnType<typeof setTimeout> | null = null;
let ongoingLoopCleanup: (() => void) | null = null;
let ingatOpChain: Promise<void> = Promise.resolve();

/**
 * Compute and push real-time status bar ongoing class notification & widgets
 */
export async function refreshUnremovableClassNotification(
  schedules?: ClassSchedule[],
  themeKey?: string
): Promise<void> {
  try {
    const wasExplicitlyPassed = schedules !== undefined;
    let resolvedSchedules = schedules;
    if (!wasExplicitlyPassed) {
      try {
        resolvedSchedules = await db.schedules.toArray();
      } catch (_) {}
      if (!resolvedSchedules || resolvedSchedules.length === 0) {
        try {
          const rawSession = localStorage.getItem('skweladabaw_user_session');
          const parsedSession = rawSession ? JSON.parse(rawSession) : null;
          const activeUid = parsedSession?.isLoggedIn && parsedSession?.uid ? String(parsedSession.uid) : 'guest';
          const isExplicitEmpty = localStorage.getItem(`skweladabaw_explicit_empty_schedules_${activeUid}`) === 'true';
          if (!isExplicitEmpty) {
            const rawJson = localStorage.getItem('skweladabaw_all_schedules_json');
            if (rawJson) {
              const parsed = JSON.parse(rawJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                resolvedSchedules = parsed;
              }
            }
          }
        } catch (_) {}
      }
    }

    await syncScheduleToWidgets(resolvedSchedules || []);

    const isEnabled = localStorage.getItem('skweladabaw_persistent_next_class') === 'true';
    if (!isEnabled) {
      if (lastOngoingEnabledState !== false) {
        lastOngoingEnabledState = false;
        await cancelPersistentNextClassNotification();
      }
      return;
    }
    lastOngoingEnabledState = true;
    const activeTheme = themeKey || localStorage.getItem('skweladabaw_persistent_theme') || 'midnight';
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[now.getDay()];

    const matchesDay = (days: any, targetDay: string): boolean => {
      if (!days) return false;
      const lowerTarget = targetDay.toLowerCase();
      if (Array.isArray(days)) {
        return days.some((d) => String(d).toLowerCase() === lowerTarget);
      }
      if (typeof days === 'string') {
        return days.split(',').some((d) => d.trim().toLowerCase() === lowerTarget);
      }
      return false;
    };

    const todayClasses = (resolvedSchedules || []).filter((s) => matchesDay(s.days, todayName));
    todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let currentClass: ClassSchedule | null = null;
    let nextClass: ClassSchedule | null = null;

    for (const cls of todayClasses) {
      const [sH, sM] = cls.startTime.split(':').map(Number);
      const [eH, eM] = cls.endTime.split(':').map(Number);
      const startMin = sH * 60 + sM;
      const endMin = eH * 60 + eM;

      if (currentMinutes >= startMin && currentMinutes <= endMin) {
        currentClass = cls;
      } else if (currentMinutes < startMin && !nextClass) {
        nextClass = cls;
      }
    }

    await updateUnremovableClassNotification(
      currentClass,
      nextClass,
      todayClasses.length > 0,
      activeTheme
    );
  } catch (err) {
    console.warn('Error refreshing unremovable class notification:', err);
  }
}

export function initOngoingNotificationLoop(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (ongoingLoopCleanup) return ongoingLoopCleanup;

  let isDisposed = false;

  const clearScheduledTick = () => {
    if (ongoingNotificationTimeout !== null) {
      clearTimeout(ongoingNotificationTimeout);
      ongoingNotificationTimeout = null;
    }
  };

  const scheduleNextMinuteTick = () => {
    clearScheduledTick();
    if (isDisposed) return;
    if (localStorage.getItem('skweladabaw_persistent_next_class') !== 'true') return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const msUntilNextMinute = Math.max(1000, 60000 - (Date.now() % 60000) + 250);
    ongoingNotificationTimeout = setTimeout(() => {
      ongoingNotificationTimeout = null;
      if (isDisposed) return;
      if (
        localStorage.getItem('skweladabaw_persistent_next_class') === 'true' &&
        (typeof document === 'undefined' || !document.hidden)
      ) {
        refreshUnremovableClassNotification().catch(console.warn);
        scheduleNextMinuteTick();
      }
    }, msUntilNextMinute);
  };

  const handleStateOrVisibility = () => {
    if (isDisposed) return;
    if (
      isLiveNotificationsEnabled() &&
      (typeof document === 'undefined' || !document.hidden)
    ) {
      scheduleNextMinuteTick();
    } else {
      clearScheduledTick();
    }
  };

  const handlePersistentNotifChanged = () => {
    if (isDisposed) return;
    handleStateOrVisibility();
    scheduleIngatNotifications().catch(console.warn);
  };

  const handleLanguageChanged = () => {
    if (isDisposed) return;
    scheduleIngatNotifications().catch(console.warn);
  };

  scheduleNextMinuteTick();
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleStateOrVisibility);
  }
  window.addEventListener('skweladabaw_persistent_notif_changed', handlePersistentNotifChanged);
  window.addEventListener('skweladabaw_language_changed', handleLanguageChanged);

  ongoingLoopCleanup = () => {
    isDisposed = true;
    clearScheduledTick();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleStateOrVisibility);
    }
    window.removeEventListener('skweladabaw_persistent_notif_changed', handlePersistentNotifChanged);
    window.removeEventListener('skweladabaw_language_changed', handleLanguageChanged);
    ongoingLoopCleanup = null;
  };

  return ongoingLoopCleanup;
}

/**
 * Check whether Live Notification Updates (status bar card & Ingat commute alerts) are enabled.
 */
export function isLiveNotificationsEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('skweladabaw_persistent_next_class') === 'true';
  } catch {
    return false;
  }
}

function enqueueIngatOp(op: () => Promise<void>): Promise<void> {
  const next = ingatOpChain.then(op, op);
  ingatOpChain = next.catch(() => {});
  return next;
}

function parseTimeMinutes(timeStr?: string): number {
  if (!timeStr || typeof timeStr !== 'string') return Number.NaN;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return Number.NaN;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return Number.NaN;
  if (meridiem) {
    if (hours < 1 || hours > 12) return Number.NaN;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  } else if (hours < 0 || hours > 23) {
    return Number.NaN;
  }
  return hours * 60 + minutes;
}

function matchesScheduleDay(days: unknown, targetDay: string): boolean {
  if (!days) return false;
  const lowerTarget = targetDay.toLowerCase();
  if (Array.isArray(days)) {
    return days.some((d) => {
      const lower = String(d).trim().toLowerCase();
      return lower === lowerTarget || lower === 'everyday';
    });
  }
  if (typeof days === 'string') {
    return days.split(',').some((d) => {
      const lower = d.trim().toLowerCase();
      return lower === lowerTarget || lower === 'everyday';
    });
  }
  return false;
}

async function cancelIngatNotificationsInternal(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const idsToCancel = [0, 1, 2, 3, 4, 5, 6, 7].flatMap((w) => [
      { id: INGAT_PRE_CLASS_ID_BASE + w },
      { id: INGAT_POST_CLASS_ID_BASE + w },
      { id: 77000 + w },
      { id: 79000 + w }
    ]);
    await LocalNotifications.cancel({ notifications: idsToCancel });
  } catch (err) {
    console.warn('Error canceling Ingat notifications:', err);
  }
}

/**
 * Cancel all pre-class and post-class "Ingat" / "Take Care" commute notifications
 * (including legacy 77000..77007 and 79000..79007 IDs).
 */
export async function cancelIngatNotifications(): Promise<void> {
  return enqueueIngatOp(cancelIngatNotificationsInternal);
}

async function scheduleIngatNotificationsInternal(schedules?: ClassSchedule[]): Promise<void> {
  try {
    // Always cancel existing and legacy Ingat notifications first
    await cancelIngatNotificationsInternal();

    if (!Capacitor.isNativePlatform()) return;

    // STRICT GATE: Zero Ingat notifications may ever be scheduled when Live Notification updates are OFF
    if (!isLiveNotificationsEnabled()) return;

    let resolvedSchedules = schedules;
    if (resolvedSchedules === undefined) {
      try {
        resolvedSchedules = await db.schedules.toArray();
      } catch (dbErr) {
        console.warn('Error reading schedules for Ingat notifications:', dbErr);
        return;
      }
    }

    if (!resolvedSchedules || resolvedSchedules.length === 0) return;

    await initializeNotificationChannels();

    // Re-verify gate after async channel init in case user toggled OFF mid-flight
    if (!isLiveNotificationsEnabled()) return;

    const language = getBayaniLanguage();
    const weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ] as const;

    const notifications: any[] = [];

    for (const dayName of weekdays) {
      const weekday = DAY_INDEX_MAP[dayName];
      if (!weekday) continue;

      const dayClasses = resolvedSchedules.filter((s) => matchesScheduleDay(s.days, dayName));
      if (dayClasses.length === 0) continue;

      // Pre-class "Ingat" notification (45 minutes before first class of the day)
      const validStartClasses = dayClasses.filter((cls) => Number.isFinite(parseTimeMinutes(cls.startTime)));
      if (validStartClasses.length > 0) {
        validStartClasses.sort((a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime));
        const firstClass = validStartClasses[0];
        const firstStartMinutes = parseTimeMinutes(firstClass.startTime);
        let totalPreMinutes = firstStartMinutes - INGAT_PRE_CLASS_LEAD_MINUTES;
        let preWeekday = weekday;
        if (totalPreMinutes < 0) {
          totalPreMinutes += 1440;
          preWeekday = weekday === 1 ? 7 : weekday - 1;
        }
        const preH = Math.floor(totalPreMinutes / 60);
        const preM = totalPreMinutes % 60;
        const formattedStart = format12Hour(firstClass.startTime);

        let preTitle: string;
        let preBody: string;
        if (language === 'tagalog') {
          preTitle = 'Ingat sa Biyahe!';
          preBody = `Mag-ingat papuntang campus! Unang klase mo: ${firstClass.subjectCode} (${formattedStart}).`;
        } else if (language === 'english') {
          preTitle = 'Take Care on Your Way!';
          preBody = `First class today: ${firstClass.subjectCode} at ${formattedStart}. Have a safe commute to campus!`;
        } else {
          preTitle = 'Ingat sa Biyahe!';
          preBody = `Amping padulong sa campus! Unang klase: ${firstClass.subjectCode} (${formattedStart}).`;
        }

        notifications.push({
          id: INGAT_PRE_CLASS_ID_BASE + weekday,
          title: preTitle,
          body: preBody,
          channelId: NOTIFICATION_CHANNEL_ID,
          schedule: {
            on: {
              weekday: preWeekday,
              hour: preH,
              minute: preM
            },
            allowWhileIdle: true
          },
          extra: {
            type: 'ingat_pre_class',
            day: dayName
          }
        });
      }

      // Post-class "Ingat" notification (at final dismissal of the day)
      const validEndClasses = dayClasses.filter((cls) => Number.isFinite(parseTimeMinutes(cls.endTime)));
      if (validEndClasses.length > 0) {
        validEndClasses.sort((a, b) => parseTimeMinutes(a.endTime) - parseTimeMinutes(b.endTime));
        const lastClass = validEndClasses[validEndClasses.length - 1];
        const lastEndMinutes = parseTimeMinutes(lastClass.endTime);
        const lastH = Math.floor(lastEndMinutes / 60);
        const lastM = lastEndMinutes % 60;

        let postTitle: string;
        let postBody: string;
        if (language === 'tagalog') {
          postTitle = 'Ingat Pauwi, Dabawenyo!';
          postBody = `Tapos na ang mga klase mo ngayong araw (${lastClass.subjectCode}). Mag-ingat sa pag-uwi!`;
        } else if (language === 'english') {
          postTitle = 'Take Care Going Home!';
          postBody = `Classes done for today (${lastClass.subjectCode}). Have a safe commute home, Dabawenyo!`;
        } else {
          postTitle = 'Ingat Pauwi, Dabawenyo!';
          postBody = `Human na imong mga klase karon (${lastClass.subjectCode}). Amping sa imong pag-uli!`;
        }

        notifications.push({
          id: INGAT_POST_CLASS_ID_BASE + weekday,
          title: postTitle,
          body: postBody,
          channelId: NOTIFICATION_CHANNEL_ID,
          schedule: {
            on: {
              weekday,
              hour: lastH,
              minute: lastM
            },
            allowWhileIdle: true
          },
          extra: {
            type: 'ingat_post_class',
            day: dayName
          }
        });
      }
    }

    if (notifications.length > 0 && isLiveNotificationsEnabled()) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (err) {
    console.warn('Error scheduling Ingat notifications:', err);
  }
}

/**
 * Schedule weekly pre-class (45m before first class) and post-class (at final dismissal)
 * "Ingat" / "Take Care" commute notifications, strictly gated by Live Notification Updates.
 */
export async function scheduleIngatNotifications(schedules?: ClassSchedule[]): Promise<void> {
  return enqueueIngatOp(() => scheduleIngatNotificationsInternal(schedules));
}

/**
 * Synchronize "Ingat" commute notifications when the Live Notification Updates toggle changes.
 */
export async function syncIngatNotificationsForLiveToggle(
  enabled: boolean,
  schedules?: ClassSchedule[]
): Promise<void> {
  if (!enabled) {
    await cancelIngatNotifications();
    return;
  }
  await scheduleIngatNotifications(schedules);
}

/**
 * Cancel persistent next class status bar notification and gated Ingat commute alerts
 */
export async function cancelPersistentNextClassNotification(): Promise<void> {
  lastOngoingEnabledState = false;
  if (ongoingNotificationTimeout !== null) {
    clearTimeout(ongoingNotificationTimeout);
    ongoingNotificationTimeout = null;
  }
  try {
    await cancelIngatNotifications();
    if (Capacitor.isNativePlatform()) {
      await cancelNativeUnremovableNotification();
      await LocalNotifications.cancel({
        notifications: [{ id: PERSISTENT_NEXT_CLASS_NOTIFICATION_ID }]
      });
    }
  } catch (err) {
    console.warn('Error canceling persistent next class notification:', err);
  }
}

/**
 * Synchronize pre- and post-class "Ingat" / "Take Care" commute alerts (strictly gated by Live Notification Updates).
 */
export async function scheduleCommuteAndEasterNotifications(schedules?: ClassSchedule[]): Promise<void> {
  return scheduleIngatNotifications(schedules);
}

/**
 * Schedule a recurring day-of-week and time-specific routine reminder
 * e.g. "Wear PE uniform every Tuesday at 07:00"
 */
export async function scheduleDayReminder(reminder: DayReminderItem): Promise<void> {
  if (!reminder.id || !reminder.enabled) return;

  try {
    if (!Capacitor.isNativePlatform()) return;
    await initializeNotificationChannels();

    const [hourStr, minStr] = reminder.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minStr, 10);
    if (isNaN(hour) || isNaN(minute)) return;

    await cancelDayReminder(reminder.id);

    const isEveryday = reminder.dayOfWeek === 'Everyday';
    const notifId = 85000 + (reminder.id % 9999);

    if (isEveryday) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `Daily Routine: ${reminder.title}`,
            body: `Every day at ${format12Hour(reminder.time)}${reminder.notes ? ` • ${reminder.notes}` : ''}`,
            channelId: NOTIFICATION_CHANNEL_ID,
            schedule: {
              repeats: true,
              every: 'day',
              on: {
                hour,
                minute
              },
              allowWhileIdle: true
            },
            extra: {
              reminderId: reminder.id,
              type: 'day_routine_reminder',
              frequency: 'daily'
            }
          }
        ]
      });
    } else {
      const weekday = DAY_INDEX_MAP[reminder.dayOfWeek] || 2;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `Reminder: ${reminder.title}`,
            body: `Every ${reminder.dayOfWeek} at ${format12Hour(reminder.time)}${reminder.notes ? ` • ${reminder.notes}` : ''}`,
            channelId: NOTIFICATION_CHANNEL_ID,
            schedule: {
              on: {
                weekday,
                hour,
                minute
              },
              allowWhileIdle: true
            },
            extra: {
              reminderId: reminder.id,
              type: 'day_routine_reminder'
            }
          }
        ]
      });
    }
  } catch (err) {
    console.warn('Error scheduling day reminder:', err);
  }
}

/**
 * Cancel a scheduled recurring day routine reminder
 */
export async function cancelDayReminder(reminderId: number): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const notifId = 85000 + (reminderId % 9999);
    await LocalNotifications.cancel({
      notifications: [{ id: notifId }]
    });
  } catch (err) {
    console.warn('Error cancelling day reminder:', err);
  }
}

/**
 * Dispatch an Android status bar notification when a new version is available
 */
export async function notifyAppUpdateAvailable(
  version: string,
  title?: string,
  downloadUrl?: string
): Promise<void> {
  try {
    const lastNotified = localStorage.getItem('skweladabaw_last_notified_update_version');
    if (lastNotified === version) return;

    if (Capacitor.isNativePlatform()) {
      await initializeNotificationChannels();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: APP_UPDATE_NOTIFICATION_ID,
            title: `SkwelaDabaw v${version} Ready`,
            body: title || 'A new update is available with timetable improvements and fixes',
            channelId: APP_UPDATE_NOTIFICATION_CHANNEL_ID,
            extra: {
              type: 'app_update',
              target_action: 'update',
              version,
              downloadUrl
            }
          }
        ]
      });
      localStorage.setItem('skweladabaw_last_notified_update_version', version);
    }
  } catch (err) {
    console.warn('Error dispatching app update notification:', err);
  }
}

/**
 * Dispatches an actionable Davao City commuter weather notification (Heat or Rain Alert).
 */
export async function scheduleWeatherNotification(
  id: number,
  title: string,
  body: string
): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    await initializeNotificationChannels();

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          channelId: WEATHER_NOTIFICATION_CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 1000) },
          extra: {
            type: 'weather_advisory',
            timestamp: Date.now()
          }
        }
      ]
    });
  } catch (err) {
    console.warn('Error dispatching weather notification:', err);
  }
}

