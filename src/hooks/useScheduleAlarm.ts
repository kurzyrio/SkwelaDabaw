import { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { ClassSchedule, DayOfWeek } from '../types';
import { playEagleSound, isAudioEnabled } from '../utils/audio';

export interface ActiveAlarmAlert {
  id: string;
  subjectCode: string;
  subjectName: string;
  room?: string;
  building?: string;
  startTime: string;
  minutesLeft: number;
}

const DAY_NAME_MAP: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export function useScheduleAlarm() {
  const [activeAlert, setActiveAlert] = useState<ActiveAlarmAlert | null>(null);
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const alertQueueRef = useRef<ActiveAlarmAlert[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const checkAlarms = async () => {
      if (isCancelled) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const now = new Date();
        const currentDay = DAY_NAME_MAP[now.getDay()];
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMin;
        const dateKey = `${now.toISOString().split('T')[0]}`;

        const schedules = await db.schedules.toArray();
        if (isCancelled) return;

        const todaySchedules = schedules.filter((s) => {
          const rem = (s.reminderMinutes !== undefined && s.reminderMinutes !== null) ? s.reminderMinutes : 0;
          return s.days.includes(currentDay) && rem > 0;
        });

        const newlyTriggered: ActiveAlarmAlert[] = [];
        for (const schedule of todaySchedules) {
          const [sHourStr, sMinStr] = schedule.startTime.split(':');
          const sHour = parseInt(sHourStr, 10);
          const sMin = parseInt(sMinStr, 10);
          if (isNaN(sHour) || isNaN(sMin)) continue;

          const startTotalMinutes = sHour * 60 + sMin;
          const diffMinutes = startTotalMinutes - currentTotalMinutes;
          const alertWindow = (schedule.reminderMinutes !== undefined && schedule.reminderMinutes !== null)
            ? schedule.reminderMinutes
            : 0;

          // Trigger if within the reminder window and class hasn't started yet
          if (diffMinutes > 0 && diffMinutes <= alertWindow && alertWindow > 0) {
            const alertKey = `${dateKey}-${schedule.id}-${schedule.startTime}`;
            if (!alertedIdsRef.current.has(alertKey)) {
              alertedIdsRef.current.add(alertKey);
              newlyTriggered.push({
                id: alertKey,
                subjectCode: schedule.subjectCode,
                subjectName: schedule.subjectName,
                room: schedule.room,
                building: schedule.building,
                startTime: schedule.startTime,
                minutesLeft: diffMinutes
              });
            }
          }
        }

        if (newlyTriggered.length > 0 && !isCancelled) {
          if (isAudioEnabled()) {
            playEagleSound('alert');
          }
          alertQueueRef.current.push(...newlyTriggered);
          setActiveAlert((prev) => prev ?? (alertQueueRef.current.shift() || null));
        }
      } catch (err) {
        console.debug('Schedule alarm check error:', err);
      }
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        checkAlarms();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    // Initial check after 3 seconds, then every 30 seconds while visible
    const initialTimer = setTimeout(checkAlarms, 3000);
    const interval = setInterval(checkAlarms, 30000);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  const dismissAlert = () => {
    setActiveAlert(() => alertQueueRef.current.shift() || null);
  };

  return {
    activeAlert,
    dismissAlert
  };
}
