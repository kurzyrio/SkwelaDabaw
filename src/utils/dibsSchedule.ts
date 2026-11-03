/**
 * SkwelaDabaw — Official Davao City Interim Bus Service (DIBS) Schedule Engine
 * 
 * Implements the authentic timetable of the Davao City Interim Bus Service:
 * Monday - Saturday:
 *   Morning Shift:   06:00 AM - 10:00 AM
 *   Evening Shift:   04:00 PM - 09:00 PM
 * Sunday:
 *   Whole Day Offline
 * 
 * Note: Timezone strictly locked to Philippine Standard Time (Asia/Manila, UTC+8).
 * Note: Typography adheres strictly to zero parentheses directive.
 */

export interface DibsScheduleStatus {
  isOperational: boolean;
  statusLabel: string;
  badgeColor: 'emerald' | 'amber' | 'rose' | 'slate';
  currentShift: 'morning' | 'between_shifts' | 'evening' | 'night_offline' | 'sunday_offline';
  detailMessage: string;
  nextServiceTime: string;
  manilaTimeFormatted: string;
  officialDisclaimer: string;
}

export const DIBS_OFFICIAL_DISCLAIMER =
  'SkwelaDabaw is an independent, unofficial student transit companion and is not affiliated with, endorsed by, or operated by the City Government of Davao or the Davao City Interim Bus Service.';

export const DIBS_OFFICIAL_SCHEDULE_RULES = [
  {
    days: 'Monday to Saturday',
    shift: 'Morning Shift',
    hours: '6:00 AM to 10:00 AM',
    status: 'Operational'
  },
  {
    days: 'Monday to Saturday',
    shift: 'Midday Maintenance Interval',
    hours: '10:00 AM to 4:00 PM',
    status: 'Between Shifts'
  },
  {
    days: 'Monday to Saturday',
    shift: 'Afternoon and Evening Shift',
    hours: '4:00 PM to 9:00 PM',
    status: 'Operational'
  },
  {
    days: 'Monday to Saturday',
    shift: 'Night Maintenance Interval',
    hours: '9:00 PM to 6:00 AM',
    status: 'Offline'
  },
  {
    days: 'Sunday',
    shift: 'Sunday Fleet Rest',
    hours: 'Whole Day',
    status: 'Service Unavailable'
  }
];

/**
 * Returns current date/time converted to Asia/Manila (UTC+8)
 */
export function getManilaDate(date: Date = new Date()): Date {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  return new Date(utc + manilaOffsetMs);
}

/**
 * Computes exact real-time operational state according to official DIBS schedule
 */
export function getDibsServiceStatus(refDate: Date = new Date()): DibsScheduleStatus {
  const manila = getManilaDate(refDate);
  const day = manila.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hours = manila.getHours();
  const minutes = manila.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Format readable time e.g. "11:25 AM"
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const manilaTimeFormatted = `${displayHours}:${displayMinutes} ${period} PST`;

  // Sunday: Whole Day Offline
  if (day === 0) {
    return {
      isOperational: false,
      statusLabel: 'Sunday Offline',
      badgeColor: 'rose',
      currentShift: 'sunday_offline',
      detailMessage: 'Davao City Interim Bus Service does not operate on Sundays.',
      nextServiceTime: 'Resumes Monday at 6:00 AM',
      manilaTimeFormatted,
      officialDisclaimer: DIBS_OFFICIAL_DISCLAIMER
    };
  }

  // Monday to Saturday
  // 06:00 AM (360) to 10:00 AM (600) -> Morning Shift
  if (totalMinutes >= 360 && totalMinutes <= 600) {
    return {
      isOperational: true,
      statusLabel: 'Morning Shift Active',
      badgeColor: 'emerald',
      currentShift: 'morning',
      detailMessage: 'Active peak transit service across Davao corridors until 10:00 AM.',
      nextServiceTime: 'Evening shift resumes today at 4:00 PM',
      manilaTimeFormatted,
      officialDisclaimer: DIBS_OFFICIAL_DISCLAIMER
    };
  }

  // 10:01 AM (601) to 03:59 PM (959) -> Between Shifts
  if (totalMinutes > 600 && totalMinutes < 960) {
    return {
      isOperational: false,
      statusLabel: 'Between Shifts',
      badgeColor: 'amber',
      currentShift: 'between_shifts',
      detailMessage: 'Morning shift completed. Fleet rests during midday window.',
      nextServiceTime: 'Resumes today at 4:00 PM',
      manilaTimeFormatted,
      officialDisclaimer: DIBS_OFFICIAL_DISCLAIMER
    };
  }

  // 04:00 PM (960) to 09:00 PM (1260) -> Evening Shift
  if (totalMinutes >= 960 && totalMinutes <= 1260) {
    return {
      isOperational: true,
      statusLabel: 'Evening Shift Active',
      badgeColor: 'emerald',
      currentShift: 'evening',
      detailMessage: 'Active evening peak transit service across Davao corridors until 9:00 PM.',
      nextServiceTime: day === 6 ? 'Resumes Monday at 6:00 AM' : 'Resumes tomorrow at 6:00 AM',
      manilaTimeFormatted,
      officialDisclaimer: DIBS_OFFICIAL_DISCLAIMER
    };
  }

  // 09:01 PM (1261) to 11:59 PM (1439) -> Night Offline
  if (totalMinutes > 1260) {
    return {
      isOperational: false,
      statusLabel: 'Service Ended for Today',
      badgeColor: 'slate',
      currentShift: 'night_offline',
      detailMessage: 'Evening shift ended at 9:00 PM. Buses are currently in depot.',
      nextServiceTime: day === 6 ? 'Resumes Monday at 6:00 AM' : 'Resumes tomorrow at 6:00 AM',
      manilaTimeFormatted,
      officialDisclaimer: DIBS_OFFICIAL_DISCLAIMER
    };
  }

  // 00:00 AM (0) to 05:59 AM (359) -> Early Morning Offline
  return {
    isOperational: false,
    statusLabel: 'Depot Standby',
    badgeColor: 'slate',
    currentShift: 'night_offline',
    detailMessage: 'Early morning standby. Fleet prepares for morning service.',
    nextServiceTime: 'Resumes today at 6:00 AM',
    manilaTimeFormatted,
    officialDisclaimer: DIBS_OFFICIAL_DISCLAIMER
  };
}
