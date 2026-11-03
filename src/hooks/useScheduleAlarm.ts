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

  useEffect(() => {
    const checkAlarms = async () => {
      try {
        const now = new Date();
        const currentDay = DAY_NAME_MAP[now.getDay()];
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMin;
        const dateKey = `${now.toISOString().split('T')[0]}`;

        const schedules = await db.schedules.toArray();
        const todaySchedules = schedules.filter((s) => {
          const rem = (s.reminderMinutes !== undefined && s.reminderMinutes !== null) ? s.reminderMinutes : 0;
          return s.days.includes(currentDay) && rem > 0;
        });

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

              setActiveAlert({
                id: alertKey,
                subjectCode: schedule.subjectCode,
                subjectName: schedule.subjectName,
                room: schedule.room,
                building: schedule.building,
                startTime: schedule.startTime,
                minutesLeft: diffMinutes
              });

              if (isAudioEnabled()) {
                playEagleSound('alert');
              }
              break;
            }
          }
        }
      } catch (err) {
        console.debug('Schedule alarm check error:', err);
      }
    };

    // Initial check after 3 seconds, then every 30 seconds
    const initialTimer = setTimeout(checkAlarms, 3000);
    const interval = setInterval(checkAlarms, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const dismissAlert = () => {
    setActiveAlert(null);
  };

  return {
    activeAlert,
    dismissAlert
  };
}
