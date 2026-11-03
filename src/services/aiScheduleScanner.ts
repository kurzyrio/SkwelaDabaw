import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { ClassSchedule, DayOfWeek } from '../types';

import { auth, isFirebaseConfigured } from './firebase';
import { ensureFirebaseAuth } from './authService';

export type ScanSourceMode = 'server' | 'client';

export interface ScanProgressCallback {
  (message: string, step: number, mode?: ScanSourceMode): void;
}

const STORAGE_KEY_GEMINI_API_KEY = 'skweladabaw_gemini_api_key';
const STORAGE_KEY_OCR_MODEL = 'skweladabaw_ocr_model_preference';

export const DEFAULT_API_BASE_URL = 'https://skweladabaw.kurzyrio.site';

const API_BASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL?.trim()) || 
  DEFAULT_API_BASE_URL;

export interface UnreadableDetection {
  subjectCode?: string;
  field: 'room' | 'startTime' | 'endTime' | 'days' | 'subjectCode' | 'subjectName' | 'units' | 'instructor';
  detectedSnippet: string;
  suggestedAction: string;
}

export interface ScheduleExtractionResult {
  schedules: ClassSchedule[];
  unreadableDetections: UnreadableDetection[];
}

export const AVAILABLE_OCR_MODELS = [
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', badge: 'Ultra Fast & High Accuracy' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash-Lite Latest', badge: 'Fast & Resilient' }
];

export function getPreferredOcrModel(): string {
  return 'gemini-3.5-flash-lite';
}

export function setPreferredOcrModel(modelId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_OCR_MODEL, modelId);
}

/**
 * SECURITY: Never hardcode API keys in client-side code.
 * Users must provide their own Gemini key via Settings or .env (VITE_GEMINI_API_KEY).
 */

export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY)?.trim();
  if (stored && stored.length > 5) return stored;
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY?.trim()) || '';
  if (envKey && envKey.length > 5) return envKey;
  // Default to empty if not provided via Settings or environment
  return '';
}

export function setStoredGeminiApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_GEMINI_API_KEY);
  }
}

export interface AiReachabilityResult {
  reachable: boolean;
  mode: 'proxy' | 'direct' | 'none';
  message: string;
}

/**
 * Checks whether the AI backend proxy on your web server is online and reachable.
 */
export async function checkAiReachability(): Promise<AiReachabilityResult> {
  // 1. Check if PHP Server Proxy is configured and responsive
  if (API_BASE_URL && API_BASE_URL.trim().length > 0) {
    const urlsToTry = [
      `${API_BASE_URL.replace(/\/$/, '')}/api/proxy.php`,
      `${DEFAULT_API_BASE_URL}/api/proxy.php`
    ];
    const uniqueUrls = Array.from(new Set(urlsToTry));

    for (const proxyUrl of uniqueUrls) {
      try {
        let data: any = null;

        // Try standard fetch first for maximum compatibility
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(proxyUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          });
          clearTimeout(timeoutId);
          if (res.status === 200) {
            data = await res.json().catch(() => null);
          }
        } catch (_) {
          // If fetch fails and native platform, try CapacitorHttp
          if (Capacitor.isNativePlatform()) {
            const nativeRes = await CapacitorHttp.get({
              url: proxyUrl,
              headers: { 'Accept': 'application/json' },
              connectTimeout: 5000,
              readTimeout: 5000
            });
            if (nativeRes.status === 200 && nativeRes.data) {
              data = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
            }
          }
        }

        // ONLY mark reachable if server explicitly confirms online AND configured
        if (data && data.status === 'online' && data.configured === true) {
          return {
            reachable: true,
            mode: 'proxy',
            message: 'CamScanner Online'
          };
        }
      } catch {
        // Continue to fallback
      }
    }
  }

  // 2. Fallback key check
  const fallbackKey = getStoredGeminiApiKey();
  if (fallbackKey && fallbackKey.length > 10) {
    return {
      reachable: true,
      mode: 'direct',
      message: 'CamScanner Online (Direct Mode)'
    };
  }

  return {
    reachable: false,
    mode: 'none',
    message: 'Document scanner is currently unreachable.'
  };
}

/**
 * Pre-crafted Prompt Yourself extraction prompt compatible with ChatGPT, Claude, Gemini, and DeepSeek.
 * Supports any number of courses (10+ subjects, lectures, and laboratories).
 */
export const PROMPT_YOURSELF_TEMPLATE = `You are a schedule extraction assistant for SkwelaDabaw (Philippine college student companion).
Please extract ALL enrolled subject rows (including all lectures, laboratories, and NSTP/PE classes) from my enrollment document/portal text below into a clean JSON array.

IMPORTANT LAB & MULTI-ROOM INSTRUCTIONS:
- Look at the document/text very carefully: A single subject may have multiple schedule rows with DIFFERENT ROOMS, BUILDINGS, or LABORATORIES (e.g. Lecture in Finster 404 on MWF, and Laboratory in Computer Lab 2 (CLAB 2) or Science Lab (SLAB) on Saturday).
- NEVER merge or drop these rows! Treat each distinct meeting time, room, or laboratory as its own separate object in the JSON array.
- Pay close attention to multi-line rows where room numbers differ between lecture and lab components.

COLOR ASSIGNMENT DIRECTIVE:
Select and assign a distinct theme color to each course from the official SkwelaDabaw palette:
- "#2563eb" (Blue)
- "#059669" (Emerald)
- "#dc2626" (Red)
- "#7c3aed" (Purple)
- "#db2777" (Pink)
- "#d97706" (Amber)
- "#4f46e5" (Indigo)
- "#0891b2" (Cyan)
Decide and assign different colors across courses and labs so the timetable is colorful, dynamic, and easy to read at a glance. DO NOT make every class the same blue color.

Please return ONLY a valid JSON array of objects with NO markdown formatting, backticks, or extra commentary.

Schema for each course object:
[
  {
    "ofrCode": "string (OFR / Section Code or Class ID, or empty string)",
    "subjectCode": "string (e.g. IT 211, CS 101, GE 4, MATH 101)",
    "subjectName": "string (Full course title, e.g. Data Structures and Algorithms)",
    "room": "string (Room code e.g. F-404, CLAB 2, SLAB 1, or TBA)",
    "building": "string (Building name or campus hall, or empty string)",
    "instructor": "string (Faculty / Teacher name or TBA)",
    "days": ["Monday", "Wednesday", "Friday"], // Array of full day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
    "startTime": "08:00", // 24-hour format "HH:mm" (e.g. 07:30, 13:00, 17:30)
    "endTime": "09:30",   // 24-hour format "HH:mm" (e.g. 09:00, 14:30, 19:00)
    "units": 3,           // Number of credit units (e.g. 3, 2, 1)
    "color": "#059669"    // Distinct hex color chosen from palette above
  }
]

IMPORTANT RULES:
- Include ALL subjects without omission, even if there are more than 10 or 15 subjects.
- If a course has separate Lecture and Lab schedules, create a separate JSON entry for the lecture and lab with their respective specific room codes.
- Format all times strictly in 24-hour "HH:mm" format.

[PASTE YOUR ENROLLMENT / PORTAL SCHEDULE TEXT BELOW THIS LINE]`;

/**
 * Optimizes an image for Gemini OCR by downscaling to max 1800px and applying optimal JPEG compression
 */
async function optimizeImageForOcr(dataUrlOrBase64: string): Promise<string> {
  return new Promise((resolve) => {
    const src = dataUrlOrBase64.startsWith('data:') 
      ? dataUrlOrBase64 
      : `data:image/jpeg;base64,${dataUrlOrBase64}`;

    const img = new Image();
    img.onload = () => {
      const maxDim = 1280;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.80);
        const cleanBase64 = optimizedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
        resolve(cleanBase64);
      } else {
        resolve(dataUrlOrBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''));
      }
    };
    img.onerror = () => {
      resolve(dataUrlOrBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, ''));
    };
    img.src = src;
  });
}

/**
 * Capture photo using native Android camera
 */
export async function capturePhotoFromCamera(): Promise<{ base64: string; dataUrl: string } | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        await Camera.requestPermissions();
      } catch (permErr) {
        console.warn('Camera request permissions warning:', permErr);
      }
    }

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      correctOrientation: true
    });

    if (!image || !image.base64String) return null;

    const base64 = image.base64String;
    const format = image.format || 'jpeg';
    const dataUrl = `data:image/${format};base64,${base64}`;

    return { base64, dataUrl };
  } catch (error: any) {
    console.warn('Native camera capture error:', error);
    throw error;
  }
}

/**
 * Pick photo from device gallery
 */
export async function pickPhotoFromGallery(): Promise<{ base64: string; dataUrl: string } | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        await Camera.requestPermissions();
      } catch (permErr) {
        console.warn('Gallery request permissions warning:', permErr);
      }

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        correctOrientation: true
      });

      if (image && image.base64String) {
        const base64 = image.base64String;
        const format = image.format || 'jpeg';
        const dataUrl = `data:image/${format};base64,${base64}`;
        return { base64, dataUrl };
      }
    }
  } catch (error: any) {
    console.warn('Native gallery pick error:', error);
    throw error;
  }
  return null;
}

export const PRESET_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#d97706', // Amber
  '#4f46e5', // Indigo
  '#0891b2'  // Cyan
];

const ERC_OCR_PROMPT = `You are Gemini 3.5 Flash Lite, an expert OCR and schedule extraction engine specialized in Philippine college & university enrollment records, Certificate of Registration (COR), Assessment Cards, and study load forms (e.g. Ateneo de Davao AdDU, USEP, UM, UIC, DDC, SPC, HCDC, SJPCD, MMCM).

CRITICAL MULTI-ROOM & LABORATORY INSPECTION:
- Carefully inspect every column and sub-row in this paper/photo.
- A single enrolled subject often has MULTIPLE DIFFERENT ROOMS or LABORATORIES across different days (e.g., Lecture in standard classroom "F-404" on MWF, and Laboratory in "CLAB-2", "SLAB-1", "ENGLAB", or "AVR" on TTH or Saturday).
- Always check the room and time columns thoroughly for each day/session.
- DO NOT combine or drop separate lecture and laboratory sessions into one. Output a separate JSON item for each distinct room/laboratory and meeting time!

COLOR ASSIGNMENT RULES (DECIDE DISTINCT COLORS):
Assign a distinct theme color to each course from the official SkwelaDabaw palette:
- '#2563eb' (Blue)
- '#059669' (Emerald)
- '#dc2626' (Red)
- '#7c3aed' (Purple)
- '#db2777' (Pink)
- '#d97706' (Amber)
- '#4f46e5' (Indigo)
- '#0891b2' (Cyan)
Decide and assign distinct colors to different courses so that the student timetable is colorful, clear, and high-contrast (DO NOT make everything blue).
Include the chosen hex color in the "color" property of each schedule object.

AMBIGUOUS / UNREADABLE TEXT DETECTION (CRITICAL USER SAFETY FEATURE):
- If any letters, room codes (e.g. "F-???", "CLAB-?"), time digits, or subject names are blurry, cut off on page borders, obscured by stamps, or ambiguous, you MUST report them in the "unreadableDetections" array so the student can verify them.

Return ONLY a valid JSON object with:
{
  "schedules": [
    {
      "ofrCode": "string",
      "subjectCode": "string",
      "subjectName": "string",
      "room": "string (or TBA)",
      "building": "string",
      "instructor": "string",
      "days": ["Monday", "Wednesday", "Friday"],
      "startTime": "08:00",
      "endTime": "09:30",
      "units": 3,
      "color": "string (hex code e.g. #059669, #7c3aed, #dc2626)"
    }
  ],
  "unreadableDetections": [
    {
      "subjectCode": "string",
      "field": "room | startTime | endTime | days | subjectCode | subjectName",
      "detectedSnippet": "string",
      "suggestedAction": "string explaining what needs user confirmation"
    }
  ]
}

If everything is 100% crisp and clear, "unreadableDetections" can be empty array []. Do not include markdown or backticks.`;

/**
 * Scan schedule image with Gemini (via secure PHP proxy or direct key)
 */
export async function analyzeErcWithAi(
  base64Data: string,
  onProgress?: ScanProgressCallback
): Promise<ScheduleExtractionResult> {
  onProgress?.('Optimizing document for CamScanner...', 1);
  const cleanBase64 = await optimizeImageForOcr(base64Data);

  // Helper to map and sanitize raw JSON output
  const processExtractionPayload = (parsed: any): ScheduleExtractionResult => {
    let rawList: any[] = [];
    let unreadable: UnreadableDetection[] = [];

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      rawList = parsed.schedules || parsed.courses || parsed.subjects || [];
      if (Array.isArray(parsed.unreadableDetections)) {
        unreadable = parsed.unreadableDetections;
      }
    }

    const schedules: ClassSchedule[] = rawList.map((item: any, idx: number) => {
      const roomVal = String(item.room || '').trim();
      // Auto-detect ambiguous room values if not already in unreadable list
      if ((roomVal.includes('?') || roomVal.toLowerCase() === 'tba' || roomVal.length === 1) && !unreadable.some(u => u.subjectCode === item.subjectCode)) {
        unreadable.push({
          subjectCode: item.subjectCode || `SUBJ-${idx + 1}`,
          field: 'room',
          detectedSnippet: roomVal || 'TBA',
          suggestedAction: `Room is '${roomVal || 'TBA'}'. Please verify classroom or laboratory name.`
        });
      }

      return {
        ofrCode: String(item.ofrCode || '').trim(),
        subjectCode: String(item.subjectCode || `SUBJ-${idx + 1}`).trim().toUpperCase(),
        subjectName: String(item.subjectName || item.subjectCode || 'Course').trim(),
        room: roomVal,
        building: String(item.building || '').trim(),
        instructor: String(item.instructor || '').trim(),
        days: Array.isArray(item.days) && item.days.length > 0 
          ? (item.days.filter((d: string) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(d)) as DayOfWeek[])
          : ['Monday', 'Wednesday', 'Friday'],
        startTime: item.startTime || '08:00',
        endTime: item.endTime || '09:30',
        units: Number(item.units) || 3,
        color: (typeof item.color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(item.color.trim()))
          ? item.color.trim()
          : PRESET_COLORS[idx % PRESET_COLORS.length],
        notes: ''
      };
    });

    return { schedules, unreadableDetections: unreadable };
  };

  // 1. Try PHP Proxy Backend on https://skweladabaw.kurzyrio.site/
  if (API_BASE_URL) {
    try {
      onProgress?.('Connecting to SkwelaDabaw CamScanner service...', 2, 'server');
      let idToken: string | undefined = undefined;
      try {
        await ensureFirebaseAuth();
        idToken = await auth?.currentUser?.getIdToken();
      } catch (_) {}

      onProgress?.('Scanning document via CamScanner...', 3, 'server');
      const proxyUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/proxy.php?action=scan-image`;
      let data: any = null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      if (Capacitor.isNativePlatform()) {
        const nativeRes = await CapacitorHttp.post({
          url: proxyUrl,
          headers,
          data: { base64: cleanBase64 },
          connectTimeout: 8000,
          readTimeout: 8000
        });
        if (nativeRes.status === 200 && nativeRes.data) {
          data = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
        } else {
          const errData = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
          console.warn('Proxy scan returned status:', nativeRes.status, errData?.error);
        }
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(proxyUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ base64: cleanBase64 }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            data = await res.json();
          } else {
            const errData = await res.json().catch(() => null);
            console.warn('Proxy scan returned status:', res.status, errData?.error);
          }
        } catch (_) {
          clearTimeout(timeoutId);
        }
      }

      if (data && data.result) {
        const jsonStr = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        const result = processExtractionPayload(parsed);

        if (result.schedules.length > 0) {
          onProgress?.('Document scanned successfully!', 4, 'server');
          return result;
        }
      }
    } catch (proxyErr) {
      console.warn('Proxy scan attempt note:', proxyErr);
    }
  }

  // 2. Direct fallback
  const apiKey = getStoredGeminiApiKey();
  if (!apiKey) {
    throw new Error('Document scanner is currently unreachable. Please check your internet connection or use JSON / Text import.');
  }

  onProgress?.('Scanning document via direct channel...', 2, 'client');

  const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      onProgress?.('Extracting timetable records...', 3, 'client');

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: ERC_OCR_PROMPT },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        onProgress?.('Parsing timetable records directly with Gemini (Client)...', 4, 'client');
        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          const jsonStr = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(jsonStr);
          const result = processExtractionPayload(parsed);

          if (result.schedules.length > 0) {
            onProgress?.('Schedule extracted directly via Google Gemini!', 4, 'client');
            return result;
          }
        }
      } else {
        const errJson = await response.json().catch(() => null);
        const errMessage = errJson?.error?.message || `HTTP ${response.status}`;
        console.warn(`Model ${model} note:`, response.status, errMessage);
        lastError = new Error(`Gemini (${response.status}): ${errMessage}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  throw new Error('Could not extract subjects from the document. Please verify the photo is clear and contains your study load table.');
}

/**
 * Parse raw copied text from school portal tables (via secure PHP proxy or direct key)
 */
export async function parseRawScheduleTextWithAi(
  rawText: string,
  onProgress?: ScanProgressCallback
): Promise<ScheduleExtractionResult> {
  const processExtractionPayload = (parsed: any): ScheduleExtractionResult => {
    let rawList: any[] = [];
    let unreadable: UnreadableDetection[] = [];

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      rawList = parsed.schedules || parsed.courses || parsed.subjects || [];
      if (Array.isArray(parsed.unreadableDetections)) {
        unreadable = parsed.unreadableDetections;
      }
    }

    const schedules: ClassSchedule[] = rawList.map((item: any, idx: number) => ({
      ofrCode: String(item.ofrCode || '').trim(),
      subjectCode: String(item.subjectCode || `SUBJ-${idx + 1}`).trim().toUpperCase(),
      subjectName: String(item.subjectName || item.subjectCode || 'Course').trim(),
      room: String(item.room || '').trim(),
      building: String(item.building || '').trim(),
      instructor: String(item.instructor || '').trim(),
      days: Array.isArray(item.days) && item.days.length > 0 
        ? (item.days.filter((d: string) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(d)) as DayOfWeek[])
        : ['Monday', 'Wednesday', 'Friday'],
      startTime: item.startTime || '08:00',
      endTime: item.endTime || '09:30',
      units: Number(item.units) || 3,
      color: (typeof item.color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(item.color.trim()))
        ? item.color.trim()
        : PRESET_COLORS[idx % PRESET_COLORS.length],
      notes: ''
    }));

    return { schedules, unreadableDetections: unreadable };
  };

  // 1. Try PHP Proxy Backend on https://skweladabaw.kurzyrio.site/
  if (API_BASE_URL) {
    try {
      onProgress?.('Connecting to SkwelaDabaw CamScanner service...', 1, 'server');
      let idToken: string | undefined = undefined;
      try {
        await ensureFirebaseAuth();
        idToken = await auth?.currentUser?.getIdToken();
      } catch (_) {}

      onProgress?.('Parsing timetable text...', 2, 'server');
      const proxyUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/proxy.php?action=parse-text`;
      let data: any = null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      if (Capacitor.isNativePlatform()) {
        const nativeRes = await CapacitorHttp.post({
          url: proxyUrl,
          headers,
          data: { text: rawText },
          connectTimeout: 12000,
          readTimeout: 12000
        });
        if (nativeRes.status === 200 && nativeRes.data) {
          data = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
        }
      } else {
        const res = await fetch(proxyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: rawText })
        });

        if (res.ok) {
          data = await res.json();
        }
      }

      if (data && data.result) {
        const jsonStr = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        const result = processExtractionPayload(parsed);

        if (result.schedules.length > 0) {
          return result;
        }
      }
    } catch (proxyErr) {
      console.warn('Proxy parse text attempt note:', proxyErr);
    }
  }

  // 2. Direct fallback
  const apiKey = getStoredGeminiApiKey();
  if (!apiKey) {
    throw new Error('Document scanner is currently unreachable. Please check your internet connection or use JSON / Text import.');
  }

  onProgress?.('Parsing timetable text via direct channel...', 1, 'client');

  const prompt = `You are Gemini Flash SOTA schedule table parser for Philippine student portals.
Parse this raw text and extract ALL enrolled course subjects, including separate lecture and laboratory rows:
"""
${rawText}
"""

CRITICAL: If a subject has separate lecture and laboratory meeting times or rooms (e.g. F-404 vs CLAB-2), output them as separate entries in the array.

COLOR ASSIGNMENT RULES (DECIDE DISTINCT COLORS):
Assign a distinct theme color to each course from the official SkwelaDabaw palette:
- '#2563eb' (Blue)
- '#059669' (Emerald)
- '#dc2626' (Red)
- '#7c3aed' (Purple)
- '#db2777' (Pink)
- '#d97706' (Amber)
- '#4f46e5' (Indigo)
- '#0891b2' (Cyan)
Decide and assign distinct colors to different courses so that the student timetable is colorful, clear, and high-contrast (DO NOT make everything blue).
Include the chosen hex color in the "color" property of each schedule object.

Return ONLY a valid JSON object with:
{
  "schedules": [
    {
      "ofrCode": "string",
      "subjectCode": "string",
      "subjectName": "string",
      "room": "string",
      "building": "string",
      "instructor": "string",
      "days": ["Monday", "Wednesday", "Friday"],
      "startTime": "08:00",
      "endTime": "09:30",
      "units": 3,
      "color": "string (hex code e.g. #059669, #7c3aed, #dc2626)"
    }
  ],
  "unreadableDetections": []
}
`;

  const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const jsonStr = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(jsonStr);
          const result = processExtractionPayload(parsed);

          if (result.schedules.length > 0) {
            return result;
          }
        }
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        lastError = new Error(`Gemini (${response.status}): ${errMsg}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  throw new Error('Could not extract subjects from the text.');
}
