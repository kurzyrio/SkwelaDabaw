/**
 * Bayani Proactive Student Assistant Engine
 * Analyzes local Dexie schedules, tasks, and budgets to provide actionable student advice.
 */

import { db } from '../db';
import { EagleMood } from '../components/common/EagleBuddy';
import { getBayaniLanguage, BayaniLanguage } from '../utils/bayaniDialogues';

export interface BayaniQuickAction {
  id: string;
  label: string;
  sublabel?: string;
  iconType: 'schedule' | 'tasks' | 'jeep' | 'budget' | 'spots' | 'tip';
  actionType: 'navigate_schedule' | 'navigate_tasks' | 'navigate_jeep' | 'navigate_budget' | 'navigate_spots' | 'show_tip';
}

export interface BayaniStudentInsight {
  mood: EagleMood;
  headline: string;
  body: string;
  urgency: 'high' | 'medium' | 'low';
  quickActions: BayaniQuickAction[];
}

export interface DavaoCampusTip {
  title: string;
  detail: string;
  category: 'transit' | 'study' | 'food' | 'weather';
}

const DAVAO_TIPS_DATABASE: Record<BayaniLanguage, DavaoCampusTip[]> = {
  bisaya: [
    {
      title: "Jeepney Route Secret",
      detail: "Gikan Matina paingon Roxas o Ateneo Jacinto? Sakay ug Route 2, Matina Aplaya, o Bangkal jeep para derecho.",
      category: 'transit'
    },
    {
      title: "24/7 Study Hub with Outlets",
      detail: "Kung puno ang Davao City Public Library, daghang 24/7 study hubs sa Obrero (duol USeP) nga naay kusog nga Wi-Fi ug charging.",
      category: 'study'
    },
    {
      title: "Ting-Ulan Commute Tip",
      detail: "Kung magbaha sa Bajada o Quirino panahon sa ting-ulan, mas paspas mo-agi ang mga jeep via Dacudao o Torres bypass.",
      category: 'weather'
    },
    {
      title: "Baon Saver Tip",
      detail: "Ilista dayon imong plete sa jeep ug snacks sa SkwelaDabaw Baon Tracker aron dili mag-cramming sa budget inig Biyernes!",
      category: 'food'
    },
    {
      title: "Ateneo & UM Commuter Note",
      detail: "Ang mga jeep mo-hunong sa designated Roxas Night Market loading bay inig 6:00 PM. Pag-andam ug sensilyo daan!",
      category: 'transit'
    }
  ],
  tagalog: [
    {
      title: "Jeepney Transit Tip",
      detail: "Mula Matina papuntang Ateneo Jacinto o Claveria, sumakay ng Route 2 o Bangkal jeepney para mabilis makarating.",
      category: 'transit'
    },
    {
      title: "24/7 Study Hub na may Outlets",
      detail: "Subukan ang mga study hub sa Obrero at Jacinto na may high-speed Wi-Fi at saksakan para sa laptop habang nag-aaral.",
      category: 'study'
    },
    {
      title: "Ting-Ulan Diskarte",
      detail: "Kapag umuulan nang malakas sa Davao, sumakay sa mga ruta na dumadaan sa Dacudao o Torres upang maiwasan ang trapiko sa Bajada.",
      category: 'weather'
    },
    {
      title: "Tipid Baon Tip",
      detail: "I-log agad ang pamasahe at meryenda sa Baon Tracker para laging kontrolado ang lingguhang allowance.",
      category: 'food'
    }
  ],
  english: [
    {
      title: "Davao Jeep Transit Tip",
      detail: "Commuting from Matina to Ateneo Jacinto or Claveria? Take Route 2, Bangkal, or Matina Aplaya jeepneys for direct drop-off.",
      category: 'transit'
    },
    {
      title: "24/7 Power & Study Hubs",
      detail: "Need power outlets and fast Wi-Fi? Check out student co-working cafes around Obrero (near USeP) and Jacinto Street.",
      category: 'study'
    },
    {
      title: "Rainy Season Transit",
      detail: "During heavy afternoon downpours, jeepneys bypassing via Dacudao or Torres Street move faster than Bajada corridors.",
      category: 'weather'
    },
    {
      title: "Smart Student Budgeting",
      detail: "Track your jeep fares and daily lunch expenses inside SkwelaDabaw Baon Tracker to save up extra allowance!",
      category: 'food'
    }
  ]
};

/**
 * Generates proactive, real-time student insights based on live schedules and tasks
 */
export async function getProactiveStudentInsight(): Promise<BayaniStudentInsight> {
  const language = getBayaniLanguage();
  const tips = DAVAO_TIPS_DATABASE[language] || DAVAO_TIPS_DATABASE.bisaya;
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  try {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    // 1. Check Schedules from Dexie
    const allSchedules = await db.schedules.toArray();
    const todaySchedules = allSchedules.filter(s => {
      if (!s.days || !Array.isArray(s.days)) return false;
      return s.days.some(d => 
        d.toLowerCase() === currentDay.toLowerCase() ||
        d.toLowerCase().includes(currentDay.slice(0, 3).toLowerCase())
      );
    });

    // Parse start time (e.g. "09:00", "9:00 AM", "14:30")
    let upcomingClass: { subject: string; room: string; minutesUntil: number; timeStr: string } | null = null;

    for (const item of todaySchedules) {
      if (!item.startTime) continue;
      const [hStr, mStr] = item.startTime.split(':');
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr || '0', 10);
      if (item.startTime.toLowerCase().includes('pm') && h < 12) h += 12;
      if (item.startTime.toLowerCase().includes('am') && h === 12) h = 0;

      const scheduleTotalMinutes = h * 60 + m;
      const diff = scheduleTotalMinutes - currentTotalMinutes;

      if (diff > 0 && diff <= 180) { // Within next 3 hours
        if (!upcomingClass || diff < upcomingClass.minutesUntil) {
          upcomingClass = {
            subject: item.subjectName || item.subjectCode || 'Class',
            room: item.room || 'TBA',
            minutesUntil: diff,
            timeStr: item.startTime
          };
        }
      }
    }

    // 2. Check Pending Tasks from Dexie
    const allTasks = await db.tasks.toArray();
    const pendingTasks = allTasks.filter(t => !t.completed);

    // Urgent Class Alert (Within 45 mins)
    if (upcomingClass && upcomingClass.minutesUntil <= 45) {
      return {
        mood: 'alert',
        headline: language === 'bisaya' 
          ? `Padulong na imong klase sa ${upcomingClass.subject}! ⚡`
          : language === 'tagalog'
          ? `Malapit na ang klase mo sa ${upcomingClass.subject}! ⚡`
          : `Upcoming Class: ${upcomingClass.subject}! ⚡`,
        body: language === 'bisaya'
          ? `Magsugod na sulod sa ${upcomingClass.minutesUntil} minutos sa Room ${upcomingClass.room}. Andama imong notebook!`
          : language === 'tagalog'
          ? `Magsisimula na sa loob ng ${upcomingClass.minutesUntil} minuto sa Room ${upcomingClass.room}. Ihanda ang gamit!`
          : `Starts in ${upcomingClass.minutesUntil} mins at Room ${upcomingClass.room}. Head to class now!`,
        urgency: 'high',
        quickActions: [
          { id: 'act-sched', label: '📅 View Timetable', iconType: 'schedule', actionType: 'navigate_schedule' },
          { id: 'act-jeep', label: '🚌 Check Jeep Route', iconType: 'jeep', actionType: 'navigate_jeep' }
        ]
      };
    }

    // Upcoming Class Alert (Within 2-3 hours)
    if (upcomingClass) {
      return {
        mood: 'focused',
        headline: language === 'bisaya'
          ? `Naa kay klase unyang ${upcomingClass.timeStr}: ${upcomingClass.subject}`
          : language === 'tagalog'
          ? `May klase ka mamayang ${upcomingClass.timeStr}: ${upcomingClass.subject}`
          : `Next class at ${upcomingClass.timeStr}: ${upcomingClass.subject}`,
        body: language === 'bisaya'
          ? `Nahimutang sa Room ${upcomingClass.room}. Naa pa kay ${upcomingClass.minutesUntil} minutos aron mag-andam.`
          : language === 'tagalog'
          ? `Gaganapin sa Room ${upcomingClass.room}. May ${upcomingClass.minutesUntil} minuto ka pa para maghanda.`
          : `Located in Room ${upcomingClass.room} • ${upcomingClass.minutesUntil} mins left. Perfect time to review notes.`,
        urgency: 'medium',
        quickActions: [
          { id: 'act-sched', label: '📅 View Class Info', iconType: 'schedule', actionType: 'navigate_schedule' },
          { id: 'act-task', label: `📝 Tasks • ${pendingTasks.length}`, iconType: 'tasks', actionType: 'navigate_tasks' }
        ]
      };
    }

    // Pending Tasks Alert
    if (pendingTasks.length > 0) {
      return {
        mood: 'questioning',
        headline: language === 'bisaya'
          ? `Naa kay ${pendingTasks.length} ka buluhaton / assignments karon!`
          : language === 'tagalog'
          ? `May ${pendingTasks.length} kang gawain o takdang-aralin ngayon!`
          : `You have ${pendingTasks.length} pending tasks & assignments!`,
        body: language === 'bisaya'
          ? `Humanon nato kini sa sayo aron relaks imong gabii sa Davao!`
          : language === 'tagalog'
          ? `Tapusin natin nang maaga para relax ang gabi mo sa Davao!`
          : `Let's knock these out early so you can relax later tonight!`,
        urgency: 'medium',
        quickActions: [
          { id: 'act-task', label: '📝 Open Task List', iconType: 'tasks', actionType: 'navigate_tasks' },
          { id: 'act-spots', label: '☕ Find Study Hubs', iconType: 'spots', actionType: 'navigate_spots' }
        ]
      };
    }

    // Default Proactive Davao Wisdom & Pro-Tip
    return {
      mood: 'friendly',
      headline: language === 'bisaya'
        ? `Bayani Dabawenyo Tip: ${randomTip.title} 🦅`
        : language === 'tagalog'
        ? `Bayani Campus Tip: ${randomTip.title} 🦅`
        : `Bayani Student Tip: ${randomTip.title} 🦅`,
      body: randomTip.detail,
      urgency: 'low',
      quickActions: [
        { id: 'act-tip', label: '💡 Next Davao Tip', iconType: 'tip', actionType: 'show_tip' },
        { id: 'act-sched', label: '📅 Class Schedule', iconType: 'schedule', actionType: 'navigate_schedule' },
        { id: 'act-jeep', label: '🚌 Jeep Routes', iconType: 'jeep', actionType: 'navigate_jeep' }
      ]
    };

  } catch (err) {
    console.warn('Proactive assistant error:', err);
    return {
      mood: 'friendly',
      headline: 'Maayong adlaw! Ako si Bayani 🦅',
      body: 'Andam ko motabang sa imong Davao campus schedule, jeepney routes, ug baon tracker!',
      urgency: 'low',
      quickActions: [
        { id: 'act-sched', label: '📅 My Schedule', iconType: 'schedule', actionType: 'navigate_schedule' },
        { id: 'act-jeep', label: '🚌 Jeep Routes', iconType: 'jeep', actionType: 'navigate_jeep' }
      ]
    };
  }
}
