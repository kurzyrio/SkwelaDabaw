import { useState, useEffect } from 'react';
import { setBayaniLanguage, BayaniLanguage } from '../utils/bayaniDialogues';
import { queueCloudSync } from './cloudSyncService';

export type AppLanguage = 'en' | 'tl' | 'ceb';

const STORAGE_KEY_LANGUAGE = 'skweladabaw_app_language';

export function normalizeAppLanguage(lang: any): AppLanguage {
  if (lang === 'en' || lang === 'english') return 'en';
  if (lang === 'tl' || lang === 'tagalog') return 'tl';
  if (lang === 'ceb' || lang === 'bisaya') return 'ceb';
  return 'ceb';
}

export function toBayaniLanguage(lang: AppLanguage): BayaniLanguage {
  switch (lang) {
    case 'en': return 'english';
    case 'tl': return 'tagalog';
    case 'ceb': return 'bisaya';
    default: return 'bisaya';
  }
}

export function fromBayaniLanguage(lang: BayaniLanguage): AppLanguage {
  switch (lang) {
    case 'english': return 'en';
    case 'tagalog': return 'tl';
    case 'bisaya': return 'ceb';
    default: return 'ceb';
  }
}

export function getAppLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'ceb';
  const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
  if (saved) {
    return normalizeAppLanguage(saved);
  }
  // Check legacy mascot language
  const mascotLang = localStorage.getItem('skweladabaw_mascot_language');
  if (mascotLang) {
    return normalizeAppLanguage(mascotLang);
  }
  return 'ceb'; // Default to Davao Bisaya
}

export function setAppLanguage(lang: AppLanguage): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeAppLanguage(lang);
  localStorage.setItem(STORAGE_KEY_LANGUAGE, normalized);

  // Sync with Bayani mascot dialogue engine
  const mascotLang = toBayaniLanguage(normalized);
  localStorage.setItem('skweladabaw_mascot_language', mascotLang);
  queueCloudSync();

  try {
    window.dispatchEvent(new CustomEvent('skweladabaw_language_changed', { 
      detail: { language: normalized, bayaniLanguage: mascotLang } 
    }));
  } catch (_) {}
}

export function useAppLanguage(): { language: AppLanguage; setLanguage: (lang: AppLanguage) => void } {
  const [language, setLanguageState] = useState<AppLanguage>(getAppLanguage);

  useEffect(() => {
    const handleLangChange = (e: any) => {
      const raw = e?.detail?.language;
      const normalized = raw ? normalizeAppLanguage(raw) : getAppLanguage();
      setLanguageState(normalized);
    };

    window.addEventListener('skweladabaw_language_changed', handleLangChange);
    window.addEventListener('storage', handleLangChange);

    return () => {
      window.removeEventListener('skweladabaw_language_changed', handleLangChange);
      window.removeEventListener('storage', handleLangChange);
    };
  }, []);

  const changeLanguage = (lang: AppLanguage) => {
    setAppLanguage(lang);
    setLanguageState(normalizeAppLanguage(lang));
  };

  return { language, setLanguage: changeLanguage };
}

/**
 * Modern, conversational translations for Davao college students.
 * (English, Tagalog, Bisaya).
 * Per project directive: Button texts remain standard, page texts & descriptions adapt.
 */
export const TRANSLATIONS: Record<string, Record<AppLanguage, string>> = {
  // ─── App Header ──────────────────────────────────────────────
  'header.tagline': {
    en: 'Campus & Transit Hub',
    tl: 'Sentro ng Campus at Byahe',
    ceb: 'Sentro sa Campus ug Byahe'
  },
  'header.facultyTagline': {
    en: 'Faculty Academic Portal',
    tl: 'Portal ng mga Guro at Faculty',
    ceb: 'Portal sa mga Magtutudlo ug Faculty'
  },
  'header.emergencyButton': {
    en: '911',
    tl: '911',
    ceb: '911'
  },
  'header.emergencyTooltip': {
    en: 'Davao 911 Hotlines',
    tl: 'Mga Hotline ng Davao 911',
    ceb: 'Mga Hotline sa Davao 911'
  },
  'header.profile': {
    en: 'Profile',
    tl: 'Profile',
    ceb: 'Profile'
  },

  // ─── Navigation Tabs ─────────────────────────────────────────
  'nav.schedule': {
    en: 'Schedule',
    tl: 'Iskedyul',
    ceb: 'Iskedyul'
  },
  'nav.tasks': {
    en: 'Tasks',
    tl: 'Gawain',
    ceb: 'Buluhaton'
  },
  'nav.hub': {
    en: 'Hub',
    tl: 'Hub',
    ceb: 'Hub'
  },
  'nav.chat': {
    en: 'Chat',
    tl: 'Chat',
    ceb: 'Chat'
  },
  'nav.jeep': {
    en: 'Jeep',
    tl: 'Jeep',
    ceb: 'Jeep'
  },
  'nav.alerts': {
    en: 'Alerts',
    tl: 'Balita',
    ceb: 'Pahibalo'
  },

  // ─── Student Hub Page ────────────────────────────────────────
  'hub.badge': {
    en: 'Dabawenyo Student Utility Hub',
    tl: 'Sentro ng mga Gamit ng Estudyanteng Dabawenyo',
    ceb: 'Sentro sa Gamit sa Estudyanteng Dabawenyo'
  },
  'hub.title': {
    en: 'Campus Tools & Utilities',
    tl: 'Mga Kagamitan sa Campus at Byahe',
    ceb: 'Mga Gamit sa Campus ug Byahe'
  },
  'hub.description': {
    en: 'Offline-first utilities tailored for Davao City college and senior high students.',
    tl: 'Mga offline tools na sadyang ginawa para sa mga estudyante sa kolehiyo at senior high sa Davao City.',
    ceb: 'Mga gamit nga offline nga gihimo para sa mga estudyante sa kolehiyo ug senior high sa Davao City.'
  },

  // Hub Groups
  'hub.group.academics': {
    en: 'Academics & Timetable',
    tl: 'Akademiko at Iskedyul',
    ceb: 'Akademiko ug Iskedyul'
  },
  'hub.group.transit': {
    en: 'Davao Transit & Mobility',
    tl: 'Byahe at Transportasyon sa Davao',
    ceb: 'Byahe ug Sakay sa Davao'
  },
  'hub.group.campusLife': {
    en: 'Campus Life & Budget',
    tl: 'Buhay Estudyante at Baon',
    ceb: 'Kinabuhi sa Eskwela ug Baon'
  },
  'hub.group.safetySupport': {
    en: 'Safety & System Support',
    tl: 'Kaligtasan at Suporta',
    ceb: 'Kaluwasan ug Suporta'
  },

  // Hub Tools
  'hub.tool.calendar.title': {
    en: 'Weekly Timetable Grid',
    tl: 'Lingguhang Iskedyul ng Klase',
    ceb: 'Semanal nga Iskedyul sa Klase'
  },
  'hub.tool.calendar.desc': {
    en: 'Monday to Saturday full-week visual timetable view with course room blocks.',
    tl: 'Buong linggong visual timetable mula Lunes hanggang Sabado na may kwarto ng bawat klase.',
    ceb: 'Tibuok semana nga visual timetable gikan Lunes hangtod Sabado nga naay kwarto sa klase.'
  },
  'hub.tool.gpa.title': {
    en: 'GPA & QPI Calculator',
    tl: 'Kalkulator ng GPA at QPI',
    ceb: 'Kalkulator sa GPA ug QPI'
  },
  'hub.tool.gpa.desc': {
    en: 'Philippine 1.00–5.00 grading scale, Ateneo 4.0 QPI system, and Latin honors estimator.',
    tl: 'Grading scale ng Pilipinas (1.00–5.00), Ateneo 4.0 QPI, at pagtatantya ng Latin honors.',
    ceb: 'Grading scale sa Pilipinas (1.00–5.00), Ateneo 4.0 QPI, ug banabana sa Latin honors.'
  },
  'hub.tool.dcbus.title': {
    en: 'DC Bus Interim Transit',
    tl: 'Interim Bus ng Davao City',
    ceb: 'Interim Bus sa Davao City'
  },
  'hub.tool.dcbus.desc': {
    en: 'Davao City HPBS routes, coastal interim bus schedules, and service etiquette guide.',
    tl: 'Mga ruta ng HPBS sa Davao, iskedyul ng coastal bus, at gabay sa tamang sakay.',
    ceb: 'Mga rota sa HPBS sa Davao, iskedyul sa coastal bus, ug giya sa saktong pagsakay.'
  },
  'hub.tool.jeep.title': {
    en: 'Davao Jeepney Routes & Fares',
    tl: 'Mga Ruta ng Jeep at Pamasahe sa Davao',
    ceb: 'Mga Rota sa Jeep ug Plete sa Davao'
  },
  'hub.tool.jeep.desc': {
    en: 'LTFRB Davao jeep routes, landmark stops, student discounts, and fare matrix.',
    tl: 'Mga ruta ng jeep sa Davao, kilalang babaan, diskwento sa estudyante, at listahan ng pamasahe.',
    ceb: 'Mga rota sa jeep sa Davao, iladong naogan, diskwento sa estudyante, ug lista sa pletehan.'
  },
  'hub.tool.weather.title': {
    en: 'Weather & Heat Index',
    tl: 'Panahon at Heat Index',
    ceb: 'Panahon ug Heat Index'
  },
  'hub.tool.weather.desc': {
    en: 'Live Davao City temperature, heat index warning alerts, and commuter rain advisories.',
    tl: 'Temperatura sa Davao City, babala sa heat index, at abiso sa ulan para sa commuters.',
    ceb: 'Temperatura sa Davao City, pasidaan sa init (heat index), ug pahimangno sa ulan para sa commuters.'
  },
  'hub.tool.spots.title': {
    en: 'Study Hubs & Cafes',
    tl: 'Mga Studyhanan at Coffee Shops',
    ceb: 'Mga Studyhanan ug Kapehan'
  },
  'hub.tool.spots.desc': {
    en: 'Davao City Public Library, quiet coffee shops, Wi-Fi speeds, power outlets & study spaces.',
    tl: 'Davao City Public Library, tahimik na kapehan, bilis ng Wi-Fi, saksakan, at espasyo sa pag-aaral.',
    ceb: 'Davao City Public Library, hilom nga kapehan, kapaspas sa Wi-Fi, saksakanan, ug lugar tun-anan.'
  },
  'hub.tool.budget.title': {
    en: 'Baon & Commute Budget',
    tl: 'Badyet sa Baon at Pamasahe',
    ceb: 'Badyet sa Baon ug Plete'
  },
  'hub.tool.budget.desc': {
    en: 'Daily student allowance tracker, jeep expenses, remaining balance, and savings calculator.',
    tl: 'Talaan ng araw-araw na baon, gastusin sa jeep, natitirang pera, at ipon ng estudyante.',
    ceb: 'Talaan sa inadlaw nga baon, gasto sa jeep, nabilin nga kwarta, ug tigum sa estudyante.'
  },
  'hub.tool.community.title': {
    en: 'Davao Student Community',
    tl: 'Komunidad ng mga Estudyante sa Davao',
    ceb: 'Komunidad sa mga Estudyante sa Davao'
  },
  'hub.tool.community.desc': {
    en: 'Campus Q&A, study tips, lost and found, reviewer swaps, and student org events.',
    tl: 'Q&A sa campus, tips sa pag-aaral, nawawala at nahanap na gamit, at mga kaganapan.',
    ceb: 'Q&A sa campus, tips sa pagtuon, nawala ug nakit-an nga butang, ug mga kalihukan.'
  },
  'hub.tool.announcements.title': {
    en: 'Campus Bulletins & DepEd Alerts',
    tl: 'Mga Anunsyo sa Campus at Ulat Panahon',
    ceb: 'Mga Pahibalo sa Campus ug Kahimtang sa Panahon'
  },
  'hub.tool.announcements.desc': {
    en: 'Davao weather alerts, heavy rain class suspensions, university bulletins & student affairs news.',
    tl: 'Alerto sa ulan at baha sa Davao, kanselasyon ng klase, at balita mula sa mga unibersidad.',
    ceb: 'Alerto sa ulan ug baha sa Davao, kanselasyon sa klase, ug balita gikan sa mga unibersidad.'
  },
  'hub.tool.emergency.title': {
    en: 'Davao Central 911 Safety',
    tl: 'Proteksyon at Davao Central 911',
    ceb: 'Kaluwasan ug Davao Central 911'
  },
  'hub.tool.emergency.desc': {
    en: '1-tap instant emergency dialer for Central 911, DCPO police, SPMC hospital, and campus security.',
    tl: 'Isang pindot na tawag sa Central 911, pulis ng DCPO, ospital ng SPMC, at guwardiya ng campus.',
    ceb: 'Usa ka pindot nga tawag sa Central 911, pulis sa DCPO, ospital sa SPMC, ug guwardiya sa campus.'
  },
  'hub.tool.about.title': {
    en: 'About SkwelaDabaw',
    tl: 'Tungkol sa SkwelaDabaw',
    ceb: 'Bahin sa SkwelaDabaw'
  },
  'hub.tool.about.desc': {
    en: 'The offline-first Dabawenyo student companion. Developer credits, version info, and mission.',
    tl: 'Ang offline student companion ng Dabawenyo. Impormasyon sa gumawa, bersyon, at layunin.',
    ceb: 'Ang offline student companion sa Dabawenyo. Impormasyon sa nagbuhat, bersyon, ug tumong.'
  },
  'hub.tool.settings.title': {
    en: 'App Settings & Identity',
    tl: 'Settings at Pagkakakilanlan',
    ceb: 'Settings ug Pagkatawo'
  },
  'hub.tool.settings.desc': {
    en: 'Campus university selector, PIN privacy lock, notifications, and local data backup.',
    tl: 'Pagpili ng campus, PIN privacy lock, abiso ng klase, at backup ng sariling data.',
    ceb: 'Pagpili sa campus, PIN privacy lock, pahibalo sa klase, ug backup sa imong data.'
  },
  'hub.tool.feedback.title': {
    en: 'Student Feedback & Survey',
    tl: 'Puna at Suhestiyon ng Estudyante',
    ceb: 'Panglantaw ug Suhestiyon sa Estudyante'
  },
  'hub.tool.feedback.desc': {
    en: 'Submit feature suggestions, report missing jeep routes, and help improve SkwelaDabaw.',
    tl: 'Magpadala ng suhestiyon, mag-ulat ng kulang na ruta ng jeep, at tumulong pagandahin ang app.',
    ceb: 'Pagpadala og suhestiyon, pag-report og kulang nga rota sa jeep, ug tabang pagpaayo sa app.'
  },

  // ─── Schedule Manager ─────────────────────────────────────────
  'schedule.title': {
    en: 'Class Schedule',
    tl: 'Iskedyul ng Klase',
    ceb: 'Iskedyul sa Klase'
  },
  'schedule.subtitle': {
    en: 'Manage your enrolled courses, lecture rooms, and class alarms.',
    tl: 'Pamahalaan ang iyong mga enrolled courses, kwarto ng klase, at alarms.',
    ceb: 'Dumala sa imong mga enrolled courses, kwarto sa klase, ug alarms.'
  },
  'schedule.emptyTitle': {
    en: 'No Enrolled Classes Added Yet',
    tl: 'Wala Pang Naidagdag na Klase',
    ceb: 'Wala Pay Nadugang nga Klase'
  },
  'schedule.emptySubtitle': {
    en: 'Import your timetable using QR Code, Photo OCR, or add courses manually.',
    tl: 'I-import ang iyong iskedyul gamit ang QR Code, Photo OCR, o magdagdag mano-mano.',
    ceb: 'I-import imong iskedyul gamit ang QR Code, Photo OCR, o pagdugang mano-mano.'
  },

  // ─── Task Tracker ─────────────────────────────────────────────
  'tasks.title': {
    en: 'Tasks & Deadlines',
    tl: 'Mga Gawain at Takdang-Aralin',
    ceb: 'Mga Buluhaton ug Deadlines'
  },
  'tasks.subtitle': {
    en: 'Track homework, quizzes, projects, and academic deliverables.',
    tl: 'Subaybayan ang mga homework, quiz, proyekto, at kailangang ipasa sa paaralan.',
    ceb: 'Subaya ang imong mga homework, quiz, proyekto, ug mga kinahanglan ipasa sa eskwela.'
  },
  'tasks.emptyTitle': {
    en: 'All Caught Up!',
    tl: 'Tapos Na Lahat ng Gawain!',
    ceb: 'Nahuman Na Tanan Buluhaton!'
  },
  'tasks.emptySubtitle': {
    en: 'Enjoy your free time or add a new academic goal to stay ahead.',
    tl: 'Magpahinga muna o maglista ng bagong layunin sa pag-aaral.',
    ceb: 'Pahuway sa kadali o paglista og bag-ong tumong sa pagtuon.'
  },

  // ─── Onboarding Language Step ────────────────────────────────
  'onboarding.langTitle': {
    en: 'Choose Your Preferred Language',
    tl: 'Piliin ang Iyong Wika',
    ceb: 'Pilia Imong Gustong Pinulongan'
  },
  'onboarding.langSubtitle': {
    en: 'You can change this anytime in Settings. Button labels stay clean and standard.',
    tl: 'Maaari mo itong palitan kahit kailan sa Settings. Ang mga pindutan ay mananatiling malinaw.',
    ceb: 'Pwede nimo ni ilisan bisan kanus-a sa Settings. Ang mga buttons magpabiling klaro ug simple.'
  },
  'onboarding.langBisaya': {
    en: 'Davao Bisaya (Binisaya)',
    tl: 'Davao Bisaya (Binisaya)',
    ceb: 'Davao Bisaya (Binisaya)'
  },
  'onboarding.langBisayaDesc': {
    en: 'Authentic conversational Davao Binisaya tone',
    tl: 'Makabagong pakikipag-usap gamit ang Davao Binisaya',
    ceb: 'Kinaadman ug natural nga sinultihan sa Davao'
  },
  'onboarding.langTagalog': {
    en: 'Modern Tagalog (Filipino)',
    tl: 'Modernong Tagalog (Filipino)',
    ceb: 'Modernong Tagalog (Filipino)'
  },
  'onboarding.langTagalogDesc': {
    en: 'Modern everyday Filipino conversational style',
    tl: 'Natural at makabagong Tagalog na ginagamit sa eskwelahan',
    ceb: 'Klaro ug inadlaw nga Tagalog para sa mga estudyante'
  },
  'onboarding.langEnglish': {
    en: 'English',
    tl: 'Ingles (English)',
    ceb: 'Ingles (English)'
  },
  'onboarding.langEnglishDesc': {
    en: 'Standard academic and transit English',
    tl: 'Pangkaraniwang Ingles para sa akademiko at byahe',
    ceb: 'Standard nga Iningles para sa klase ug byahe'
  },

  // ─── Settings Preferences ───────────────────────────────────
  'settings.langHeading': {
    en: 'Language & Mascot Voice',
    tl: 'Wika at Boses ni Bayani',
    ceb: 'Pinulongan ug Tingog ni Bayani'
  },
  'settings.langDesc': {
    en: 'Choose the conversational language used across the app and Bayani dialogues.',
    tl: 'Piliin ang wikang gagamitin sa buong app at sa mga mensahe ni Bayani.',
    ceb: 'Pilia ang pinulongan nga gamiton sa tibuok app ug sa mga istorya ni Bayani.'
  },
  'settings.aiHeading': {
    en: 'CamScanner Document Engine',
    tl: 'CamScanner Document Engine',
    ceb: 'CamScanner Document Engine'
  },
  'settings.aiDesc': {
    en: 'Automatic schedule OCR scanning from class photos and portal text.',
    tl: 'Awtomatikong pag-scan ng schedule mula sa litrato ng COR at portal text.',
    ceb: 'Awtomatikong pag-scan sa schedule gikan sa litrato sa COR ug portal text.'
  }
};

/**
 * Translate a key into the active or requested language.
 */
export function t(key: string, langOverride?: AppLanguage): string {
  const activeLang = langOverride || getAppLanguage();
  const entry = TRANSLATIONS[key];
  if (!entry) {
    return key;
  }
  return entry[activeLang] || entry['en'] || key;
}
