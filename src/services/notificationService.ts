import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ClassSchedule, TaskItem, DayReminderItem } from '../types';
import { db } from '../db';
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

/**
 * Thoroughly purge any legacy or orphaned notifications that were scheduled in previous app builds
 * and remain lingering in Android's AlarmManager (such as old 78000..78999 recurring alarms or military-time alerts).
 */
export async function purgeLegacyOrphanedNotifications(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Explicitly cancel legacy range blocks known from prior app builds
    const legacyIds: { id: number }[] = [];
    
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
        title: `Bayani Class Alert: ${schedule.subjectCode} in ${reminderMinutes}m`,
        body: `${schedule.subjectName} • Starts at ${format12Hour(schedule.startTime)} • ${roomText}${schedule.notes ? ` • Note: ${schedule.notes}` : ''}`,
        largeBody: largeBodyText,
        summaryText: `Bayani Upcoming Class • ${schedule.subjectCode}`,
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
    const targetRemindDateStr = task.reminderDate || task.dueDate;
    const targetRemindTimeStr = task.reminderTime || '08:00';
    const primaryReminderDate = new Date(`${targetRemindDateStr}T${targetRemindTimeStr}:00`);

    if (task.reminderOption === '1d') {
      primaryReminderDate.setDate(primaryReminderDate.getDate() - 1);
    } else if (task.reminderOption === '1h') {
      primaryReminderDate.setHours(primaryReminderDate.getHours() - 1);
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
    const deadlineTimeStr = task.dueTime || '23:59';
    const deadlineDate = new Date(`${task.dueDate}T${deadlineTimeStr}:00`);
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
  }
};

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

    const theme = NOTIFICATION_THEMES[themeKey] || NOTIFICATION_THEMES.midnight;
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
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notifTitle, {
          body: notifBody,
          icon: '/compass.svg',
          tag: 'skweladabaw_ongoing_class'
        });
      } catch (_) {}
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
export async function refreshUnremovableClassNotification(
  schedules?: ClassSchedule[],
  themeKey?: string
): Promise<void> {
  try {
    let resolvedSchedules = schedules;
    if (!resolvedSchedules || resolvedSchedules.length === 0) {
      try {
        resolvedSchedules = await db.schedules.toArray();
      } catch (_) {}
    }
    if (!resolvedSchedules || resolvedSchedules.length === 0) {
      try {
        const rawJson = localStorage.getItem('skweladabaw_all_schedules_json');
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            resolvedSchedules = parsed;
          }
        }
      } catch (_) {}
    }

    await syncScheduleToWidgets(resolvedSchedules || []);

    const isEnabled = localStorage.getItem('skweladabaw_persistent_next_class') === 'true';
    if (!isEnabled) {
      await cancelPersistentNextClassNotification();
      return;
    }
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

let ongoingNotificationInterval: any = null;

export function initOngoingNotificationLoop(): void {
  if (typeof window === 'undefined') return;
  if (ongoingNotificationInterval) return;

  ongoingNotificationInterval = setInterval(() => {
    refreshUnremovableClassNotification().catch(console.warn);
  }, 60000);
}

// Auto-start on module evaluation in browser/native
if (typeof window !== 'undefined') {
  initOngoingNotificationLoop();
}

/**
 * Cancel persistent next class status bar notification
 */
export async function cancelPersistentNextClassNotification(): Promise<void> {
  try {
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
 * Schedule client-side commute dismissal notifications (canceling duplicate morning greetings)
 * 100% on-device schedule reading with zero server dependencies
 */
export async function scheduleCommuteAndEasterNotifications(schedules: ClassSchedule[]): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform() || !schedules || schedules.length === 0) return;

    await initializeNotificationChannels();

    const daysList: (keyof typeof DAY_INDEX_MAP)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const notificationsToSchedule: any[] = [];

    // Clear old commute IDs (including duplicate morning 77000 IDs)
    const cleanupIds = [0, 1, 2, 3, 4, 5, 6, 7].flatMap((w) => [
      { id: 77000 + w },
      { id: 79000 + w }
    ]);
    await LocalNotifications.cancel({ notifications: cleanupIds });

    daysList.forEach((dayName) => {
      const weekday = DAY_INDEX_MAP[dayName] || 2;
      const dayClasses = schedules.filter((s) => s.days.includes(dayName as any));

      if (dayClasses.length > 0) {
        // Sort classes of this day by start time
        const sorted = [...dayClasses].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const lastClass = sorted[sorted.length - 1];

        // Evening Commute Greeting: right at last class dismissal
        const [lastH, lastM] = lastClass.endTime.split(':').map(Number);

        notificationsToSchedule.push({
          id: 79000 + weekday,
          title: '🦅 Bayani: Classes Done For Today!',
          body: 'Mabuhay! You are done for today • Have a safe commute home Dabawenyo!',
          channelId: NOTIFICATION_CHANNEL_ID,
          schedule: {
            on: {
              weekday,
              hour: lastH,
              minute: lastM
            },
            allowWhileIdle: true
          },
          extra: { type: 'commute_evening', day: dayName }
        });
      }
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  } catch (err) {
    console.warn('Error scheduling commute notifications:', err);
  }
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

