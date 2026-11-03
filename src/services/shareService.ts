import { deflateRaw, inflateRaw } from 'pako';
import { ClassSchedule, DayOfWeek } from '../types';

export interface ShareResult {
  success: boolean;
  action: 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'error';
  message?: string;
}

export interface DecodedScheduleResult {
  success: boolean;
  schedules: ClassSchedule[];
  studentName?: string;
  campusName?: string;
  isCloudLookup?: boolean;
  shortCode?: string;
  format?: 'Z1' | 'A1' | 'ID' | 'V2' | 'JSON';
  error?: string;
}

/**
 * Native System Share with image file support and clipboard fallback
 */
export async function shareCanvasImage(
  canvas: HTMLCanvasElement,
  fileName: string,
  title: string,
  text: string
): Promise<ShareResult> {
  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );

    if (blob && typeof navigator !== 'undefined' && navigator.share) {
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file]
        });
        return { success: true, action: 'shared', message: 'Shared timetable successfully' };
      }

      // If file sharing is not supported by device, try text share
      await navigator.share({ title, text });
      return { success: true, action: 'shared', message: 'Shared timetable details' };
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, action: 'cancelled', message: 'Share cancelled' };
    }
    console.warn('Native share failed, falling back:', err);
  }

  // Fallback: Copy summary to clipboard & trigger download
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
    return { success: true, action: 'downloaded', message: 'Image downloaded and text copied to clipboard' };
  } catch (fallbackErr) {
    return { success: false, action: 'error', message: 'Unable to share or save image' };
  }
}

/**
 * Universal text/announcement/route share with clipboard fallback
 */
export async function shareContent(title: string, text: string, url?: string): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: url || undefined
      });
      return { success: true, action: 'shared', message: 'Shared successfully' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, action: 'cancelled', message: 'Share cancelled' };
      }
      console.warn('Native share failed, using clipboard fallback:', err);
    }
  }

  // Clipboard fallback
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${title}\n\n${text}${url ? `\n${url}` : ''}`);
      return { success: true, action: 'copied', message: 'Copied to clipboard' };
    }
  } catch (clipErr) {
    console.warn('Clipboard write failed:', clipErr);
  }

  return { success: false, action: 'error', message: 'Sharing not supported on this device' };
}

export const shareText = shareContent;

// -------------------------------------------------------------
// 1. QR ALPHANUMERIC ALPHABET & BASE45 (IETF RFC 9285)
// -------------------------------------------------------------
export const QR_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/**
 * Encodes binary bytes into Base45 string according to IETF RFC 9285.
 * Every 2 bytes are encoded into 3 characters from the 45-character QR alphanumeric set.
 * A remaining single byte is encoded into 2 characters.
 */
export function encodeBase45(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 2) {
    if (i + 1 < len) {
      const val = (bytes[i] << 8) + bytes[i + 1];
      const c = val % 45;
      const d = Math.floor(val / 45) % 45;
      const e = Math.floor(val / (45 * 45));
      result += QR_ALPHABET[c] + QR_ALPHABET[d] + QR_ALPHABET[e];
    } else {
      const val = bytes[i];
      const c = val % 45;
      const d = Math.floor(val / 45);
      result += QR_ALPHABET[c] + QR_ALPHABET[d];
    }
  }
  return result;
}

/**
 * Decodes a Base45 string back into raw binary bytes according to IETF RFC 9285.
 */
export function decodeBase45(str: string): Uint8Array {
  const bytes: number[] = [];
  let i = 0;
  const len = str.length;

  while (i < len) {
    const remaining = len - i;
    if (remaining >= 3) {
      const c = QR_ALPHABET.indexOf(str[i]);
      const d = QR_ALPHABET.indexOf(str[i + 1]);
      const e = QR_ALPHABET.indexOf(str[i + 2]);
      if (c === -1 || d === -1 || e === -1) {
        throw new Error('Invalid character in Base45 payload');
      }
      const val = c + d * 45 + e * 45 * 45;
      if (val > 65535) {
        throw new Error('Base45 numeric overflow (value exceeds 65535)');
      }
      bytes.push((val >> 8) & 0xff, val & 0xff);
      i += 3;
    } else if (remaining === 2) {
      const c = QR_ALPHABET.indexOf(str[i]);
      const d = QR_ALPHABET.indexOf(str[i + 1]);
      if (c === -1 || d === -1) {
        throw new Error('Invalid character in Base45 payload');
      }
      const val = c + d * 45;
      if (val > 255) {
        throw new Error('Base45 numeric overflow (value exceeds 255)');
      }
      bytes.push(val);
      i += 2;
    } else {
      throw new Error('Invalid Base45 string length (single trailing character)');
    }
  }

  return new Uint8Array(bytes);
}

// -------------------------------------------------------------
// 2. POSITIONAL SERIALIZATION & FIELD VALUE MAPPINGS
// -------------------------------------------------------------
export const QR_COLOR_PALETTE = [
  '#2563EB', // 0: Blue (Default)
  '#059669', // 1: Emerald
  '#D97706', // 2: Amber
  '#E11D48', // 3: Rose / Red
  '#7C3AED', // 4: Purple
  '#DB2777', // 5: Pink
  '#0891B2', // 6: Cyan
  '#EA580C', // 7: Orange
  '#4F46E5', // 8: Indigo
  '#0D9488'  // 9: Teal
];

// Helper to parse hex to [r, g, b]
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  } else if (clean.length === 6) {
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16)
    ];
  }
  return null;
}

const KNOWN_COLOR_ALIASES: Record<string, number> = {
  // Blue (0)
  '#2563EB': 0, '#3B82F6': 0, '#1D4ED8': 0, '#60A5FA': 0, 'BLUE': 0,
  // Emerald / Green (1)
  '#059669': 1, '#10B981': 1, '#047857': 1, '#34D399': 1, '#30D158': 1, 'GREEN': 1, 'EMERALD': 1,
  // Amber / Yellow (2)
  '#D97706': 2, '#F59E0B': 2, '#B45309': 2, '#FF9F0A': 2, '#FBBF24': 2, 'AMBER': 2, 'YELLOW': 2,
  // Red / Rose (3)
  '#E11D48': 3, '#DC2626': 3, '#EF4444': 3, '#BE123C': 3, '#FF453A': 3, 'RED': 3, 'ROSE': 3,
  // Purple / Violet (4)
  '#7C3AED': 4, '#8B5CF6': 4, '#6D28D9': 4, '#BF5AF2': 4, '#A78BFA': 4, 'PURPLE': 4, 'VIOLET': 4,
  // Pink (5)
  '#DB2777': 5, '#EC4899': 5, '#BE185D': 5, '#F472B6': 5, 'PINK': 5,
  // Cyan / Sky (6)
  '#0891B2': 6, '#06B6D4': 6, '#0E7490': 6, '#64D2FF': 6, '#22D3EE': 6, 'CYAN': 6, 'SKY': 6,
  // Orange (7)
  '#EA580C': 7, '#F97316': 7, '#C2410C': 7, '#FB923C': 7, 'ORANGE': 7,
  // Indigo (8)
  '#4F46E5': 8, '#6366F1': 8, '#4338CA': 8, '#818CF8': 8, 'INDIGO': 8,
  // Teal (9)
  '#0D9488': 9, '#14B8A6': 9, '#0F766E': 9, '#2DD4BF': 9, 'TEAL': 9
};

export function colorToPaletteIndex(hexColor?: string): number {
  if (!hexColor) return 0;
  const target = hexColor.toUpperCase().trim();
  
  // 1. Exact match in palette
  const idx = QR_COLOR_PALETTE.findIndex((c) => c.toUpperCase() === target);
  if (idx !== -1) return idx;

  // 2. Known color aliases
  if (KNOWN_COLOR_ALIASES[target] !== undefined) {
    return KNOWN_COLOR_ALIASES[target];
  }

  // 3. Euclidean RGB distance nearest-neighbor fallback
  const targetRgb = hexToRgb(target);
  if (!targetRgb) return 0;

  let bestIdx = 0;
  let minDistance = Infinity;

  QR_COLOR_PALETTE.forEach((paletteHex, pIdx) => {
    const pRgb = hexToRgb(paletteHex);
    if (pRgb) {
      const dr = targetRgb[0] - pRgb[0];
      const dg = targetRgb[1] - pRgb[1];
      const db = targetRgb[2] - pRgb[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDistance) {
        minDistance = dist;
        bestIdx = pIdx;
      }
    }
  });

  return bestIdx;
}

export function paletteIndexToColor(idx: number): string {
  if (isNaN(idx) || idx < 0 || idx >= QR_COLOR_PALETTE.length) return QR_COLOR_PALETTE[0];
  return QR_COLOR_PALETTE[idx];
}

/**
 * Map DayOfWeek array to 7-bit bitmask integer:
 * Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
 */
export function daysToBitmask(days: (string | DayOfWeek)[]): number {
  if (!Array.isArray(days) || days.length === 0) return 21; // MWF default = 1 + 4 + 16
  let mask = 0;
  for (const d of days) {
    const norm = String(d).trim().toLowerCase();
    if (norm.startsWith('mon')) mask |= 1;
    else if (norm.startsWith('tue')) mask |= 2;
    else if (norm.startsWith('wed')) mask |= 4;
    else if (norm.startsWith('thu')) mask |= 8;
    else if (norm.startsWith('fri')) mask |= 16;
    else if (norm.startsWith('sat')) mask |= 32;
    else if (norm.startsWith('sun')) mask |= 64;
  }
  return mask === 0 ? 21 : mask;
}

export function bitmaskToDays(mask: number): DayOfWeek[] {
  const result: DayOfWeek[] = [];
  if (mask & 1) result.push('Monday');
  if (mask & 2) result.push('Tuesday');
  if (mask & 4) result.push('Wednesday');
  if (mask & 8) result.push('Thursday');
  if (mask & 16) result.push('Friday');
  if (mask & 32) result.push('Saturday');
  if (mask & 64) result.push('Sunday');
  return result.length > 0 ? result : ['Monday', 'Wednesday', 'Friday'];
}

/**
 * Converts 24-hr time string "HH:MM" into 15-minute slot index (0 to 95)
 */
export function timeToSlotIndex(timeStr: string): number {
  if (!timeStr) return 32; // 08:00
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 32;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 32;
  const slot = Math.floor(hours * 4 + Math.round(minutes / 15));
  return Math.max(0, Math.min(95, slot));
}

/**
 * Converts 15-minute slot index (0 to 95) back into "HH:MM" string
 */
export function slotIndexToTime(slot: number): string {
  const clamped = Math.max(0, Math.min(95, isNaN(slot) ? 32 : slot));
  const hours = Math.floor(clamped / 4);
  const minutes = (clamped % 4) * 15;
  const hh = hours < 10 ? `0${hours}` : `${hours}`;
  const mm = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hh}:${mm}`;
}

/**
 * Sanitizes any string strictly into the 45-character QR Alphanumeric alphabet.
 * Delimiters within fields:
 * - Internal slashes '/' replaced with '-'
 * - Delimiters '%', '*' replaced with space
 * - Removes non-alphanumeric symbols
 */
export function sanitizeAlphanumericField(val?: string, replaceSlashWithDash = true): string {
  if (!val) return '';
  let str = String(val).toUpperCase().trim();
  if (replaceSlashWithDash) {
    str = str.replace(/\//g, '-');
  }
  str = str.replace(/[%*]/g, ' ');
  str = str.replace(/[_]/g, '-');
  str = str.replace(/[^0-9A-Z $%*+\-./:]/g, ' ');
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

/**
 * Serialize full schedule into keyless delimited positional format:
 * STUDENT/CAMPUS%CODE/NAME/DAYS_MASK/START_SLOT/END_SLOT/ROOM/BLDG/UNITS/COLOR_IDX/INSTRUCTOR*...
 */
export function serializeSchedulePositional(
  schedules: ClassSchedule[],
  studentName?: string,
  campusName?: string
): string {
  const sName = sanitizeAlphanumericField(studentName || 'STUDENT');
  const cName = sanitizeAlphanumericField(campusName || 'DAVAO');

  const rows = schedules.map((item) => {
    const code = sanitizeAlphanumericField(item.subjectCode || 'CLASS');
    const name = sanitizeAlphanumericField(item.subjectName || code);
    const mask = daysToBitmask(item.days);
    const startSlot = timeToSlotIndex(item.startTime);
    const endSlot = timeToSlotIndex(item.endTime);
    const room = sanitizeAlphanumericField(item.room);
    const bldg = sanitizeAlphanumericField(item.building);
    const units = item.units || 3;
    const colIdx = colorToPaletteIndex(item.color);
    const instr = sanitizeAlphanumericField(item.instructor);

    return [code, name, mask, startSlot, endSlot, room, bldg, units, colIdx, instr].join('/');
  });

  return `${sName}/${cName}%${rows.join('*')}`;
}

/**
 * Parse keyless delimited positional format back into ClassSchedule array
 */
export function deserializeSchedulePositional(rawStr: string): {
  studentName: string;
  campusName: string;
  schedules: ClassSchedule[];
} {
  const pctIdx = rawStr.indexOf('%');
  let studentName = 'Dabawenyo Student';
  let campusName = 'Davao Campus';
  let body = rawStr;

  if (pctIdx !== -1) {
    const meta = rawStr.substring(0, pctIdx).split('/');
    if (meta[0]) studentName = meta[0].trim();
    if (meta[1]) campusName = meta[1].trim();
    body = rawStr.substring(pctIdx + 1);
  }

  const defaultReminder = Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;
  const rows = body.split('*').filter((r) => r.trim().length > 0);

  const schedules: ClassSchedule[] = rows.map((row, idx) => {
    const parts = row.split('/');
    const subjectCode = (parts[0] || `CLASS-${idx + 1}`).trim();
    const subjectName = (parts[1] || subjectCode).trim();
    const days = bitmaskToDays(parseInt(parts[2], 10) || 21);
    const startTime = slotIndexToTime(parseInt(parts[3], 10));
    const endTime = slotIndexToTime(parseInt(parts[4], 10));
    const room = parts[5] || '';
    const building = parts[6] || '';
    const units = parseInt(parts[7], 10) || 3;
    const color = paletteIndexToColor(parseInt(parts[8], 10));
    const instructor = parts[9] || '';

    return {
      subjectCode,
      subjectName,
      days,
      startTime,
      endTime,
      room,
      building,
      units,
      color,
      instructor,
      reminderMinutes: defaultReminder
    };
  });

  return { studentName, campusName, schedules };
}

// -------------------------------------------------------------
// 3. SMART UNIVERSAL PAYLOAD ENCODER
// -------------------------------------------------------------
/**
 * Smart Universal QR Payload Encoder.
 * - Keyless positional serialization
 * - Automatically chooses between:
 *   - A1: Uncompressed Alphanumeric (shorter for 1-2 classes)
 *   - Z1: Raw Deflate + Base45 (shorter for multi-class schedules)
 * - Restricts characters strictly to 45 QR Alphanumeric alphabet (5.5 bits/char)
 */
export function encodeScheduleToQrPayload(
  schedules: ClassSchedule[],
  studentName?: string,
  campusName?: string
): string {
  if (!schedules || schedules.length === 0) return '';

  const serialized = serializeSchedulePositional(schedules, studentName, campusName);
  const uncompressedPayload = `A1:${serialized}`;

  try {
    const utf8Bytes = new TextEncoder().encode(serialized);
    const compressedBytes = deflateRaw(utf8Bytes, { level: 9 });
    const base45Str = encodeBase45(compressedBytes);
    const compressedPayload = `Z1:${base45Str}`;

    // Select whichever is shorter
    return compressedPayload.length < uncompressedPayload.length
      ? compressedPayload
      : uncompressedPayload;
  } catch (err) {
    console.warn('Deflate compression note, falling back to A1:', err);
    return uncompressedPayload;
  }
}

// -------------------------------------------------------------
// 4. UNIVERSAL PAYLOAD DECODER
// -------------------------------------------------------------
/**
 * Universal Decoder function.
 * Automatically detects and parses:
 * - Z1: Compressed Raw Deflate + Base45
 * - A1: Keyless Positional Alphanumeric
 * - ID: Cloud Short-Code lookup (e.g. ID:K9X2M4)
 * - SKWELA:v2: Legacy compact format
 * - SKWELA:v1: Legacy format
 * - Raw JSON / Base64 / URI-encoded
 */
export function decodeScheduleFromQrPayload(rawInput: string): DecodedScheduleResult {
  try {
    if (!rawInput || typeof rawInput !== 'string') {
      return { success: false, schedules: [], error: 'Empty QR code payload.' };
    }

    let text = rawInput.trim();

    // 1. Z1: Raw Deflate + Base45 Compressed Format
    if (text.startsWith('Z1:')) {
      const b45Payload = text.substring(3).trim();
      const compressedBytes = decodeBase45(b45Payload);
      const decompressedBytes = inflateRaw(compressedBytes);
      const decompressedStr = new TextDecoder().decode(decompressedBytes);
      const { studentName, campusName, schedules } = deserializeSchedulePositional(decompressedStr);

      if (schedules.length > 0) {
        return {
          success: true,
          format: 'Z1',
          schedules,
          studentName,
          campusName
        };
      }
    }

    // 2. A1: Uncompressed Positional Alphanumeric Format
    if (text.startsWith('A1:')) {
      const rawPositional = text.substring(3).trim();
      const { studentName, campusName, schedules } = deserializeSchedulePositional(rawPositional);

      if (schedules.length > 0) {
        return {
          success: true,
          format: 'A1',
          schedules,
          studentName,
          campusName
        };
      }
    }

    // 3. ID: Cloud Short-Code Lookup
    if (text.startsWith('ID:')) {
      const shortCode = text.substring(3).trim().toUpperCase();
      return {
        success: true,
        isCloudLookup: true,
        shortCode,
        format: 'ID',
        schedules: []
      };
    }

    // 4. Legacy SKWELA:v2: format
    if (text.startsWith('SKWELA:v2:')) {
      const payloadBody = text.substring('SKWELA:v2:'.length).trim();
      const hashIndex = payloadBody.indexOf('#');
      let sName = 'Dabawenyo Student';
      let cName = 'Davao Campus';
      let coursesPart = payloadBody;

      if (hashIndex !== -1) {
        const metaPart = payloadBody.substring(0, hashIndex);
        coursesPart = payloadBody.substring(hashIndex + 1);
        const metaTokens = metaPart.split('|');
        if (metaTokens[0]) sName = metaTokens[0].trim();
        if (metaTokens[1]) cName = metaTokens[1].trim();
      }

      const rows = coursesPart.split('~').filter((r) => r.trim().length > 0);
      const defaultReminder = Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;

      const schedules: ClassSchedule[] = rows.map((row, idx) => {
        const parts = row.split('|');
        const subjectCode = (parts[0] || `CLASS-${idx + 1}`).toUpperCase().trim();
        const subjectName = (parts[1] || subjectCode).trim();
        const days = compactCodeToDays(parts[2] || 'MWF');
        const startTime = (parts[3] || '08:00').trim();
        const endTime = (parts[4] || '09:00').trim();
        const room = (parts[5] || '').trim();
        const building = (parts[6] || '').trim();
        const units = Number(parts[7]) || 3;
        const color = (parts[8] && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(parts[8].trim()))
          ? parts[8].trim()
          : '#3B82F6';

        return {
          subjectCode,
          subjectName,
          days: days as any,
          startTime,
          endTime,
          room,
          building,
          units,
          reminderMinutes: defaultReminder,
          color
        };
      });

      if (schedules.length > 0) {
        return {
          success: true,
          format: 'V2',
          schedules,
          studentName: sName,
          campusName: cName
        };
      }
    }

    // 5. Strip legacy prefixes if present
    if (text.startsWith('SKWELA:v1:')) {
      text = text.substring('SKWELA:v1:'.length).trim();
    } else if (text.startsWith('SKWELA:')) {
      text = text.substring('SKWELA:'.length).trim();
    } else if (text.startsWith('skweladabaw:')) {
      text = text.substring('skweladabaw:'.length).trim();
    }

    // 6. Fallback to JSON / Base64 / URI-encoded parsing
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      try {
        const unescaped = decodeURIComponent(text);
        data = JSON.parse(unescaped);
      } catch {
        try {
          const b64 = atob(text);
          data = JSON.parse(b64);
        } catch {
          // not json
        }
      }
    }

    if (!data) {
      return { success: false, schedules: [], error: 'Could not decode QR payload. Unrecognized timetable structure.' };
    }

    const defaultReminder = Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;
    const rawList = Array.isArray(data.classes)
      ? data.classes
      : Array.isArray(data.schedules)
      ? data.schedules
      : Array.isArray(data)
      ? data
      : [data];

    const schedules: ClassSchedule[] = rawList
      .filter((item: any) => item && (item.c || item.subjectCode || item.code || item.name || item.n))
      .map((item: any) => {
        let days: any = item.d || item.days;
        if (typeof days === 'string') {
          days = compactCodeToDays(days);
        }
        if (!Array.isArray(days) || days.length === 0) {
          days = ['Monday', 'Wednesday', 'Friday'];
        }

        return {
          subjectCode: String(item.c || item.subjectCode || item.code || 'CLASS').toUpperCase().trim(),
          subjectName: String(item.n || item.subjectName || item.name || item.c || 'Course').trim(),
          days,
          startTime: String(item.s || item.startTime || '08:00').trim(),
          endTime: String(item.e || item.endTime || '09:00').trim(),
          room: item.r || item.room || '',
          building: item.b || item.building || '',
          units: Number(item.u || item.units) || 3,
          reminderMinutes: item.reminderMinutes !== undefined && item.reminderMinutes !== null
            ? Number(item.reminderMinutes)
            : defaultReminder,
          color: item.col || item.color || '#3B82F6'
        };
      });

    if (schedules.length === 0) {
      return { success: false, schedules: [], error: 'No valid courses found in QR payload.' };
    }

    return {
      success: true,
      format: 'JSON',
      schedules,
      studentName: data.student,
      campusName: data.campus
    };
  } catch (err: any) {
    return {
      success: false,
      schedules: [],
      error: 'Could not decode QR payload. ' + (err?.message || 'Invalid format.')
    };
  }
}

// -------------------------------------------------------------
// 5. CLOUD SHORT-CODE SERVICES (ID:XXXXXX)
// -------------------------------------------------------------
/**
 * Create a lightweight 6-character cloud lookup short-code in Firestore:
 * e.g. ID:K9X2M4
 */
export async function createCloudScheduleCode(
  schedules: ClassSchedule[],
  studentName?: string,
  campusName?: string
): Promise<{ success: boolean; shortCode?: string; fullQrPayload?: string; error?: string }> {
  if (!schedules || schedules.length === 0) {
    return { success: false, error: 'Cannot share empty schedule.' };
  }

  try {
    const payload = {
      schedules,
      studentName: studentName || 'Dabawenyo Student',
      campusName: campusName || 'Davao Campus'
    };

    const res = await fetch('https://skweladabaw.kurzyrio.site/api/share.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data && data.success && data.shortCode) {
      return {
        success: true,
        shortCode: data.shortCode,
        fullQrPayload: data.fullQrPayload || `ID:${data.shortCode}`
      };
    }

    return {
      success: false,
      error: data?.error || 'Failed to upload schedule to cloud.'
    };
  } catch (err: any) {
    console.warn('Failed to create cloud schedule code:', err);
    return {
      success: false,
      error: err?.message || 'Failed to upload schedule to cloud.'
    };
  }
}

/**
 * Generates verified universal App Link URL for schedule sharing with web fallback
 */
export function getScheduleShareUrl(code: string): string {
  const clean = code.replace(/^ID:/i, '').trim();
  return `https://skweladabaw.kurzyrio.site/share?code=${encodeURIComponent(clean)}`;
}

/**
 * Fetch schedule from MySQL cloud using a short code:
 */
export async function fetchScheduleByCloudCode(rawCode: string): Promise<{
  success: boolean;
  schedules: ClassSchedule[];
  studentName?: string;
  campusName?: string;
  error?: string;
}> {
  if (!rawCode) {
    return { success: false, schedules: [], error: 'Please enter a valid schedule code.' };
  }

  let code = rawCode.trim().toUpperCase();
  if (code.startsWith('ID:')) {
    code = code.substring(3).trim();
  }

  if (code.length < 3 || code.length > 12) {
    return { success: false, schedules: [], error: 'Invalid schedule code format.' };
  }

  try {
    const res = await fetch(`https://skweladabaw.kurzyrio.site/api/share.php?code=${encodeURIComponent(code)}`);
    const data = await res.json();

    if (data && data.success && Array.isArray(data.schedules) && data.schedules.length > 0) {
      return {
        success: true,
        schedules: data.schedules,
        studentName: data.studentName || 'Dabawenyo Student',
        campusName: data.campusName || 'Davao Campus'
      };
    }

    return {
      success: false,
      schedules: [],
      error: data?.error || `Schedule code "${code}" was not found or has expired.`
    };
  } catch (err: any) {
    return {
      success: false,
      schedules: [],
      error: 'Could not connect to MySQL cloud server. Please check your network connection.'
    };
  }
}

// -------------------------------------------------------------
// 6. BACKWARD COMPATIBILITY HELPERS
// -------------------------------------------------------------
/**
 * Convert days array into compact code, e.g. ['Monday', 'Wednesday', 'Friday'] -> 'MWF'
 */
export function daysToCompactCode(days: string[]): string {
  if (!Array.isArray(days) || days.length === 0) return 'MWF';
  const dayMap: Record<string, string> = {
    monday: 'M',
    tuesday: 'T',
    wednesday: 'W',
    thursday: 'Th',
    friday: 'F',
    saturday: 'S',
    sunday: 'Su'
  };
  return days
    .map((d) => dayMap[d.toLowerCase()] || d)
    .join('');
}

/**
 * Convert compact code back into standard days array, e.g. 'MWF' -> ['Monday', 'Wednesday', 'Friday']
 */
export function compactCodeToDays(code: string): string[] {
  if (!code) return ['Monday', 'Wednesday', 'Friday'];
  const normalized = code.trim();
  const result: string[] = [];

  let i = 0;
  while (i < normalized.length) {
    if (normalized.substring(i, i + 2).toLowerCase() === 'th') {
      result.push('Thursday');
      i += 2;
    } else if (normalized.substring(i, i + 2).toLowerCase() === 'su') {
      result.push('Sunday');
      i += 2;
    } else {
      const ch = normalized[i].toUpperCase();
      if (ch === 'M') result.push('Monday');
      else if (ch === 'T') result.push('Tuesday');
      else if (ch === 'W') result.push('Wednesday');
      else if (ch === 'F') result.push('Friday');
      else if (ch === 'S') result.push('Saturday');
      i++;
    }
  }

  return result.length > 0 ? result : ['Monday', 'Wednesday', 'Friday'];
}
