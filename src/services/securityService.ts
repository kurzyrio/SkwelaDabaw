/**
 * SkwelaDabaw Security & Content Moderation Service
 * Created by: Kurzyrio
 */

// Profanity, insults, sexual, slurs, harassment and toxic words list (English, Tagalog, Bisaya)
export const BLOCKED_WORDS = [
  'yawa', 'ywa', 'piste', 'pisting', 'pisteng', 'gago', 'gaga', 'tanga', 'inutil', 'bobo', 'ulol',
  'tangina', 'putangina', 'tanginamo', 'leche', 'pota', 'pucha', 'buang', 'boang', 'kolera',
  'bilat', 'oten', 'kayat', 'iyot', 'bayot', 'pokpok', 'kupal', 'tarantado', 'kantot',
  'hinayupak', 'animal', 'pakyu', 'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'bastard',
  'dick', 'pussy', 'slut', 'whore', 'cunt', 'nigger', 'faggot', 'retard',
  'scam', 'crypto investment', 'gcash money doubler', 'hack account', 'cheat code'
];

export const MAX_MESSAGE_LENGTH = 350;
export const SLOW_MODE_SECONDS = 10;

// Strict check for profanity violations to prevent message sending
export const containsProfanity = (text: string): { blocked: boolean; violationWords: string[] } => {
  const violationWords: string[] = [];
  const lower = text.toLowerCase();
  
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      violationWords.push(word);
    }
  }

  return {
    blocked: violationWords.length > 0,
    violationWords
  };
};

// Clean text with asterisk masking
export const filterProfanity = (text: string): { cleanText: string; hasViolation: boolean } => {
  let cleanText = text;
  let hasViolation = false;

  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(cleanText)) {
      hasViolation = true;
      cleanText = cleanText.replace(regex, '***');
    }
  }

  return { cleanText, hasViolation };
};

// URL Detection in text
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};



