/**
 * SkwelaDabaw - Bayani (Philippine Eagle Mascot Companion) Tri-Lingual Script Engine
 * 
 * Languages supported:
 * 1. Bisaya (Dabawenyo) - Authentic local dialect
 * 2. Tagalog (Filipino)
 * 3. English
 */

export type BayaniLanguage = 'bisaya' | 'tagalog' | 'english';

export type BayaniMood =
  | 'friendly'
  | 'questioning'
  | 'focused'
  | 'celebrating'
  | 'alert'
  | 'sleepy'
  | 'confident'
  | 'winking';

const STORAGE_KEY_LANGUAGE = 'skweladabaw_mascot_language';

/**
 * Gets the current preferred language for Bayani's dialogue
 */
export function getBayaniLanguage(): BayaniLanguage {
  if (typeof window === 'undefined') return 'bisaya';
  const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE) as BayaniLanguage;
  if (saved === 'bisaya' || saved === 'tagalog' || saved === 'english') {
    return saved;
  }
  return 'bisaya'; // Default to Dabawenyo Bisaya
}

/**
 * Updates Bayani's preferred language
 */
export function setBayaniLanguage(lang: BayaniLanguage): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);
  const appLang = lang === 'english' ? 'en' : lang === 'tagalog' ? 'tl' : 'ceb';
  localStorage.setItem('skweladabaw_app_language', appLang);
  try {
    window.dispatchEvent(new CustomEvent('skweladabaw_language_changed', { 
      detail: { language: appLang, bayaniLanguage: lang } 
    }));
  } catch (_) {}
}

/**
 * Tri-Lingual dialogue dictionary for Bayani's mood expressions
 */
export const BAYANI_MOOD_SCRIPTS: Record<BayaniMood, Record<BayaniLanguage, string>> = {
  friendly: {
    bisaya: "Kumusta, bai! Ako si Bayani, imong Agila guide sa Davao! Unsay atong buhaton karon?",
    tagalog: "Kumusta! Ako si Bayani, ang iyong Agila guide sa Davao! Anong gagawin natin ngayon?",
    english: "Hello there! I'm Bayani, your Davao Eagle companion! How can I help you today?"
  },
  questioning: {
    bisaya: "Hmm... Galibog ka ba o naa kay pangutana bahin sa imong schedule o rota sa jeep?",
    tagalog: "Hmm... Naguguluhan ka ba o may tanong tungkol sa iyong schedule o ruta ng jeep?",
    english: "Hmm... Do you have a question or need tips on your schedule or jeep route?"
  },
  focused: {
    bisaya: "Focus mode sa ta, bai! Humanon nato kining priority subjects ug assignments.",
    tagalog: "Focus mode muna tayo! Tapusin natin ang mga priority subjects at assignments.",
    english: "Deep focus active. Let's finish your priority tasks and study sessions!"
  },
  celebrating: {
    bisaya: "Payter kaayo! Nahuman na nimo imong task! Milestone completed, congrats! 🎉",
    tagalog: "Ang galing! Natapos mo na ang iyong gawain! Milestone completed, congrats! 🎉",
    english: "Awesome job! You completed your task! Fantastic milestone! 🎉"
  },
  alert: {
    bisaya: "Hala, paminaw sa! Hapit na ang deadline sa imong klase o buluhaton! ⚡",
    tagalog: "Teka lang! Malapit na ang deadline ng iyong klase o gawain! ⚡",
    english: "Heads up! An urgent class deadline or schedule alert is approaching! ⚡"
  },
  sleepy: {
    bisaya: "Pahuway sa kadali, bai. Inom ug tubig o kape para abtik ug presko imong huna-huna! ☕",
    tagalog: "Magpahinga muna sandali. Uminom ng tubig o kape para laging alerto ang isip! ☕",
    english: "Time for a quick recharge break. Grab some water or coffee to refresh! ☕"
  },
  confident: {
    bisaya: "Ayaw kabalaka, plastar na tanan imong klase, baon, ug rota sa jeep! ✨",
    tagalog: "Huwag mag-alala, maayos na ang iyong mga klase, baon, at ruta ng jeep! ✨",
    english: "Everything is on track. Your schedule, baon, and jeepney routes are ready! ✨"
  },
  winking: {
    bisaya: "Diskarte tip: Gamita ang SkwelaDabaw offline aron dili ma-hurot imong mobile data!",
    tagalog: "Pro tip: Gamitin ang SkwelaDabaw offline para makatipid sa mobile data!",
    english: "Pro tip: Use SkwelaDabaw offline to save your mobile data on campus!"
  }
};

/**
 * Onboarding dialogue scripts by step and language
 */
export const BAYANI_ONBOARDING_SCRIPTS: Record<number, Record<BayaniLanguage, { title: string; speech: string }>> = {
  1: {
    bisaya: {
      title: "Maayong Pag-abot!",
      speech: "Maayong pag-abot sa SkwelaDabaw! Ako si Bayani. Tabangan tika mag-setup sa imong campus life!"
    },
    tagalog: {
      title: "Maligayang Pagdating!",
      speech: "Maligayang pagdating sa SkwelaDabaw! Ako si Bayani. Tutulungan kita sa iyong campus life!"
    },
    english: {
      title: "Welcome Dabawenyo!",
      speech: "Welcome to SkwelaDabaw! I'm Bayani. I'll help you set up your campus schedule and student tools!"
    }
  },
  2: {
    bisaya: {
      title: "Unibersidad & Kolehiyo",
      speech: "Asa ka nga eskwelahan sa Davao nag-eskwela? Pilia imong campus aron ma-sync imong schedule."
    },
    tagalog: {
      title: "Unibersidad & Kolehiyo",
      speech: "Saan ka nag-aaral sa Davao? Piliin ang iyong campus para ma-sync ang tamang schedule."
    },
    english: {
      title: "Your Davao Campus",
      speech: "Which Davao university or college do you attend? Select it to customize your campus experience."
    }
  },
  3: {
    bisaya: {
      title: "Pangalan o Alyas",
      speech: "Unsay gusto nimo itawag nako nimo? I-set ang imong display name ug @username!"
    },
    tagalog: {
      title: "Pangalan o Palayaw",
      speech: "Anong gusto mong itawag ko sa iyo? I-set ang iyong display name at @username!"
    },
    english: {
      title: "Student Profile",
      speech: "What should I call you? Choose a display name and unique @username for your profile!"
    }
  },
  4: {
    bisaya: {
      title: "Klase & Iskedyul",
      speech: "Pwede nimo i-scan imong COR pinaagi sa camera, o i-import imong schedule gamit ang CamScanner!"
    },
    tagalog: {
      title: "Klase at Iskedyul",
      speech: "Maaari mong i-scan ang iyong COR gamit ang camera, o i-import ang iyong schedule gamit ang CamScanner!"
    },
    english: {
      title: "Classes & Schedules",
      speech: "You can snap a photo of your Certificate of Registration or import your subjects with CamScanner!"
    }
  },
  5: {
    bisaya: {
      title: "Adlaw-adlaw nga Baon",
      speech: "Pila imong budget o baon kada adlaw? Tabangan tika mag-ihap sa pletehan sa jeep ug pagkaon."
    },
    tagalog: {
      title: "Araw-araw na Baon",
      speech: "Magkano ang iyong baon kada araw? Tutulungan kitang subaybayan ang pamasahe at pagkain."
    },
    english: {
      title: "Daily Allowance & Fare",
      speech: "What is your daily student allowance? I'll help you track jeepney fares and savings!"
    }
  },
  6: {
    bisaya: {
      title: "Tingog & Pinulongan",
      speech: "Ganahan ka ba makadungog sa akong mga huni ug chimes? Pilii pud imong pinulongan diri!"
    },
    tagalog: {
      title: "Tunog at Wika",
      speech: "Nais mo bang marinig ang aking mga huni at chimes? Piliin din ang iyong wika rito!"
    },
    english: {
      title: "Voice & Language",
      speech: "Would you like cheerful mascot chirps and sound alerts? Select your preferred language here!"
    }
  },
  7: {
    bisaya: {
      title: "Himsog ug Andam Na!",
      speech: "Andam na ang tanan, bai! Adto na ta sa imong dashboard ug magsugod na sa klase!"
    },
    tagalog: {
      title: "Handang-Handa Na!",
      speech: "Handang-handa na ang lahat! Pumunta na tayo sa iyong dashboard at simulan ang klase!"
    },
    english: {
      title: "All Set & Ready!",
      speech: "Everything is set up! Let's head over to your dashboard and conquer the semester!"
    }
  }
};

/**
 * Helper to fetch Bayani speech text for a given mood based on user's language preference
 */
export function getBayaniSpeech(mood: BayaniMood, customLanguage?: BayaniLanguage): string {
  const lang = customLanguage || getBayaniLanguage();
  return BAYANI_MOOD_SCRIPTS[mood]?.[lang] || BAYANI_MOOD_SCRIPTS[mood]?.bisaya || "Kumusta, bai!";
}
