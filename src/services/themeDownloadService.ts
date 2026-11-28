import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { themeDb, StoredCustomThemeRecord } from '../db/themeDb';
import { NativeSurfaceColors, ThemeConfig, ThemeVariables } from '../themes/types';

export const THEME_PORTAL_BASE_URL = 'https://theme.kurzyrio.dev';
export const THEME_API_BASE_URL = `${THEME_PORTAL_BASE_URL}/api/themes.php`;
export const MAX_WALLPAPER_BYTES = 3.5 * 1024 * 1024; // 3.5 MB cap for smooth Android WebView playback

export const RESERVED_OFFICIAL_THEME_IDS = new Set([
  'light',
  'dark',
  'violet',
  'emerald',
  'cyber',
  'oled',
  'bw-light',
  'bw-dark'
]);

const ALLOWED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif'
]);

const FORBIDDEN_CSS_PATTERN = /<script|javascript:|expression\s*\(|url\s*\(|@import|behavior\s*:|;|\\0/i;

const VALID_COLOR_PATTERN = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|transparent)$/i;

const VALID_GRADIENT_PATTERN = /^(linear-gradient|radial-gradient)\([^;<>"{}]+\)$/i;

const VALID_SHADOW_PATTERN = /^(none|[\d.\-px\s,rgba()#a-fA-F%inset]+)$/;

const VALID_BLUR_PATTERN = /^(none|blur\(\s*\d{1,2}(?:\.\d+)?px\s*\)|\d{1,2}(?:\.\d+)?px)$/i;

export function sanitizeCssColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120 || FORBIDDEN_CSS_PATTERN.test(trimmed)) return fallback;
  if (VALID_COLOR_PATTERN.test(trimmed)) return trimmed;
  return fallback;
}

export function sanitizeCssBackground(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 400 || FORBIDDEN_CSS_PATTERN.test(trimmed)) return fallback;
  if (VALID_COLOR_PATTERN.test(trimmed) || VALID_GRADIENT_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function sanitizeCssShadow(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200 || FORBIDDEN_CSS_PATTERN.test(trimmed)) return fallback;
  if (VALID_SHADOW_PATTERN.test(trimmed)) return trimmed;
  return fallback;
}

export function sanitizeCssBlur(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none' || trimmed === '0px') return undefined;
  if (FORBIDDEN_CSS_PATTERN.test(trimmed) || !VALID_BLUR_PATTERN.test(trimmed)) return undefined;
  if (/^\d/.test(trimmed)) {
    const px = Math.min(28, Math.max(0, parseFloat(trimmed)));
    return px > 0 ? `blur(${px}px)` : undefined;
  }
  return trimmed;
}

export function sanitizeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 600) return undefined;
  if (trimmed.startsWith('/assets/themes/')) {
    return `${THEME_PORTAL_BASE_URL}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Normalizes any CSS hex / rgb() / rgba() string into an Android Color.parseColor()-safe #RRGGBB or #AARRGGBB string.
 */
export function normalizeHexForAndroid(cssValue: string | undefined, fallbackHex: string): string {
  const safeFallback = /^#[0-9A-F]{6}([0-9A-F]{2})?$/i.test(fallbackHex) ? fallbackHex.toUpperCase() : '#1A1A1A';
  if (!cssValue || typeof cssValue !== 'string') return safeFallback;
  const v = cssValue.trim();

  // If gradient string, extract first hex or rgb color inside it
  if (v.toLowerCase().includes('gradient(')) {
    const hexMatch = v.match(/#[0-9a-fA-F]{3,8}/);
    if (hexMatch) return normalizeHexForAndroid(hexMatch[0], safeFallback);
    const rgbMatch = v.match(/rgba?\([^)]+\)/i);
    if (rgbMatch) return normalizeHexForAndroid(rgbMatch[0], safeFallback);
    return safeFallback;
  }

  // Hex formats (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
  if (v.startsWith('#')) {
    const hex = v.slice(1);
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      const r = hex[0] + hex[0];
      const g = hex[1] + hex[1];
      const b = hex[2] + hex[2];
      return `#${r}${g}${b}`.toUpperCase();
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return `#${hex}`.toUpperCase();
    }
    if (/^[0-9a-fA-F]{8}$/.test(hex)) {
      // CSS uses #RRGGBBAA whereas Android Color.parseColor uses #AARRGGBB
      const rrggbb = hex.slice(0, 6);
      const aa = hex.slice(6, 8);
      return `#${aa}${rrggbb}`.toUpperCase();
    }
    return safeFallback;
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbaMatch = v.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10)));
    const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
    // Always output opaque #RRGGBB for native cards/text unless explicitly translucent
    if (rgbaMatch[4] !== undefined) {
      const alphaFloat = Math.min(1, Math.max(0, parseFloat(rgbaMatch[4])));
      if (alphaFloat < 0.99) {
        const a = Math.round(alphaFloat * 255);
        return `#${toHex(a)}${toHex(r)}${toHex(g)}${toHex(b)}`;
      }
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return safeFallback;
}

/**
 * Strips alpha channel to guarantee solid #RRGGBB for native Android home-screen cards & readable text.
 */
export function normalizeOpaqueHex(cssValue: string | undefined, fallbackHex: string): string {
  const parsed = normalizeHexForAndroid(cssValue, fallbackHex);
  if (parsed.length === 9) {
    return `#${parsed.slice(3)}`;
  }
  return parsed;
}

function sanitizeThemeId(rawId: unknown, fallbackName: string): string {
  const source = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : fallbackName;
  let slug = source
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 56);
  if (!slug) slug = `community_${Date.now().toString(36)}`;
  if (RESERVED_OFFICIAL_THEME_IDS.has(slug)) {
    slug = `community_${slug}`;
  }
  return slug;
}

/**
 * Strictly validates, sanitizes, and auto-completes a raw theme payload from the marketplace API.
 */
export function validateAndSanitizeTheme(raw: any): ThemeConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid theme payload');
  }

  const name = typeof raw.name === 'string' && raw.name.trim()
    ? raw.name.trim().slice(0, 80)
    : 'Custom Theme';
  const id = sanitizeThemeId(raw.id, name);
  const description = typeof raw.description === 'string'
    ? raw.description.trim().slice(0, 240)
    : 'Community theme from theme.kurzyrio.dev';
  const author = typeof raw.author === 'string' && raw.author.trim()
    ? raw.author.trim().slice(0, 60)
    : 'Dabawenyo Creator';
  const isDark = Boolean(raw.isDark ?? raw.is_dark ?? true);

  const rawVars: Record<string, unknown> = (raw.variables && typeof raw.variables === 'object')
    ? raw.variables
    : {};

  const fallbackAccent = isDark ? '#38BDF8' : '#007AFF';
  const accentColor = sanitizeCssColor(raw.accentColor ?? raw.accent_color ?? rawVars['--accent-color'], fallbackAccent);

  const defaultCanvas = isDark ? '#09090B' : '#F2F2F7';
  const defaultCard = isDark ? '#18181B' : '#FFFFFF';
  const defaultElevated = isDark ? '#202024' : '#FFFFFF';
  const defaultBorder = isDark ? '#2C2C2E' : '#E5E5EA';
  const defaultHoverBorder = isDark ? '#3F3F46' : '#D1D1D6';
  const defaultNested = isDark ? '#242428' : '#E5E5EA';
  const defaultNestedBorder = isDark ? '#34343A' : '#D1D1D6';
  const defaultTextPrimary = isDark ? '#FFFFFF' : '#111114';
  const defaultTextSecondary = isDark ? '#A1A1AA' : '#6C6C70';
  const defaultTextTertiary = isDark ? '#71717A' : '#8E8E93';
  const defaultNav = isDark ? 'rgba(12, 12, 16, 0.88)' : 'rgba(255, 255, 255, 0.88)';
  const defaultHeader = isDark ? 'rgba(12, 12, 16, 0.86)' : 'rgba(245, 245, 250, 0.88)';
  const defaultBtnText = isDark ? '#09090B' : '#FFFFFF';
  const defaultModalOverlay = isDark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(0, 0, 0, 0.45)';
  const defaultShadow = isDark
    ? '0 4px 20px -2px rgba(0, 0, 0, 0.45)'
    : '0 2px 12px -1px rgba(0, 0, 0, 0.08)';

  const canvasBg = sanitizeCssColor(rawVars['--canvas-bg'], defaultCanvas);
  const cardBg = sanitizeCssColor(rawVars['--card-bg'], defaultCard);
  const textPrimary = sanitizeCssColor(rawVars['--text-primary'], defaultTextPrimary);
  const textSecondary = sanitizeCssColor(rawVars['--text-secondary'], defaultTextSecondary);
  const textTertiary = sanitizeCssColor(rawVars['--text-tertiary'], defaultTextTertiary);
  const nestedBg = sanitizeCssColor(rawVars['--nested-bg'], defaultNested);
  const nestedBorder = sanitizeCssColor(rawVars['--nested-border'], defaultNestedBorder);
  const cardBorder = sanitizeCssColor(rawVars['--card-border'], defaultBorder);
  const btnPrimaryBg = sanitizeCssBackground(rawVars['--btn-primary-bg'], accentColor);
  const btnPrimaryText = sanitizeCssColor(rawVars['--btn-primary-text'], defaultBtnText);

  const variables: ThemeVariables = {
    '--canvas-bg': canvasBg,
    '--card-bg': cardBg,
    '--card-elevated-bg': sanitizeCssColor(rawVars['--card-elevated-bg'], defaultElevated),
    '--card-border': cardBorder,
    '--card-hover-border': sanitizeCssColor(rawVars['--card-hover-border'], defaultHoverBorder),
    '--nested-bg': nestedBg,
    '--nested-border': nestedBorder,
    '--input-bg': sanitizeCssColor(rawVars['--input-bg'], nestedBg),
    '--input-text': sanitizeCssColor(rawVars['--input-text'], textPrimary),
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--text-tertiary': textTertiary,
    '--text-muted': sanitizeCssColor(rawVars['--text-muted'], textSecondary),
    '--nav-bg': sanitizeCssColor(rawVars['--nav-bg'], defaultNav),
    '--header-bg': sanitizeCssColor(rawVars['--header-bg'], defaultHeader),
    '--btn-primary-bg': btnPrimaryBg,
    '--btn-primary-text': btnPrimaryText,
    '--btn-secondary-bg': sanitizeCssColor(rawVars['--btn-secondary-bg'], nestedBg),
    '--btn-secondary-text': sanitizeCssColor(rawVars['--btn-secondary-text'], textPrimary),
    '--btn-secondary-border': sanitizeCssColor(rawVars['--btn-secondary-border'], nestedBorder),
    '--modal-bg': sanitizeCssColor(rawVars['--modal-bg'], cardBg),
    '--modal-overlay': sanitizeCssColor(rawVars['--modal-overlay'], defaultModalOverlay),
    '--card-shadow': sanitizeCssShadow(rawVars['--card-shadow'], defaultShadow),
    '--accent-color': accentColor,
    '--nav-active-color': sanitizeCssColor(rawVars['--nav-active-color'], accentColor),
    '--nav-fab-bg': sanitizeCssBackground(rawVars['--nav-fab-bg'], btnPrimaryBg)
  };

  const canvasGradient = rawVars['--canvas-gradient']
    ? sanitizeCssBackground(rawVars['--canvas-gradient'], '')
    : '';
  if (canvasGradient) variables['--canvas-gradient'] = canvasGradient;

  const canvasOverlay = rawVars['--canvas-overlay']
    ? sanitizeCssBackground(rawVars['--canvas-overlay'], '')
    : '';
  if (canvasOverlay) variables['--canvas-overlay'] = canvasOverlay;

  const cardBlur = sanitizeCssBlur(rawVars['--card-backdrop-blur']);
  if (cardBlur) variables['--card-backdrop-blur'] = cardBlur;

  const modalBlur = sanitizeCssBlur(rawVars['--modal-backdrop-blur'] ?? rawVars['--card-backdrop-blur']);
  if (modalBlur) variables['--modal-backdrop-blur'] = modalBlur;

  const wallpaperUrl = sanitizeHttpsUrl(raw.wallpaperUrl ?? raw.wallpaper_url);
  const wallpaperFit = raw.wallpaperFit === 'contain' ? 'contain' : 'cover';
  const rawOpacity = typeof raw.wallpaperOpacity === 'number' ? raw.wallpaperOpacity : 1;
  const wallpaperOpacity = Math.min(1, Math.max(0.1, rawOpacity));

  const previewImages: string[] = Array.isArray(raw.previewImages ?? raw.preview_images)
    ? (raw.previewImages ?? raw.preview_images)
        .map((u: unknown) => sanitizeHttpsUrl(u))
        .filter((u: string | undefined): u is string => Boolean(u))
        .slice(0, 8)
    : [];

  const rawNative = raw.nativeSurfaces && typeof raw.nativeSurfaces === 'object' ? raw.nativeSurfaces : {};
  const nativeSurfaces: Partial<NativeSurfaceColors> = {
    cardBg: normalizeOpaqueHex(rawNative.cardBg || cardBg, defaultCard),
    itemBg: normalizeOpaqueHex(rawNative.itemBg || nestedBg, defaultNested),
    stroke: normalizeOpaqueHex(rawNative.stroke || cardBorder, defaultBorder),
    textPrimary: normalizeOpaqueHex(rawNative.textPrimary || textPrimary, defaultTextPrimary),
    textSecondary: normalizeOpaqueHex(rawNative.textSecondary || textSecondary, defaultTextSecondary),
    accent: normalizeOpaqueHex(rawNative.accent || accentColor, fallbackAccent),
    badgeBg: normalizeOpaqueHex(rawNative.badgeBg || nestedBg, defaultNested),
    btnBg: normalizeOpaqueHex(rawNative.btnBg || nestedBg, defaultNested),
    bubbleBg: normalizeOpaqueHex(rawNative.bubbleBg || cardBg, defaultCard),
    bubbleRim: normalizeHexForAndroid(rawNative.bubbleRim || accentColor, fallbackAccent)
  };

  return {
    schemaVersion: Number(raw.schemaVersion) || 1,
    id,
    name,
    description,
    author,
    category: typeof raw.category === 'string' ? raw.category.slice(0, 32) : 'aesthetic',
    isDark,
    accentColor,
    cardPreviewBg: normalizeOpaqueHex(raw.cardPreviewBg ?? raw.card_preview_bg ?? cardBg, defaultCard),
    variables,
    wallpaperUrl,
    wallpaperFit,
    wallpaperOpacity,
    previewImages,
    nativeSurfaces,
    isCustom: true,
    hasGif: Boolean(raw.hasGif ?? raw.has_gif ?? (wallpaperUrl && wallpaperUrl.toLowerCase().endsWith('.gif'))),
    downloadsCount: typeof raw.downloadsCount === 'number' ? raw.downloadsCount : Number(raw.downloads_count || 0),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : (typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString())
  };
}

/**
 * Builds the compact JSON string sent to Android SharedPreferences for all 7 Home Screen Widgets & Eagle Overlay.
 */
export function buildNativeThemeColorsPayload(theme: ThemeConfig): string {
  const vars = theme.variables;
  const ns = theme.nativeSurfaces || {};
  const fallbackBg = theme.isDark ? '#1A1A1A' : '#FFFFFF';
  const fallbackNested = theme.isDark ? '#282828' : '#E5E5EA';
  const fallbackBorder = theme.isDark ? '#2C2C2E' : '#D1D1D6';
  const fallbackText = theme.isDark ? '#FFFFFF' : '#000000';
  const fallbackSub = theme.isDark ? '#8E8E93' : '#6C6C70';
  const fallbackAccent = theme.isDark ? '#38BDF8' : '#007AFF';

  return JSON.stringify({
    id: theme.id,
    isDark: Boolean(theme.isDark),
    isCustom: Boolean(theme.isCustom),
    cardBg: normalizeOpaqueHex(ns.cardBg || vars['--card-bg'], fallbackBg),
    itemBg: normalizeOpaqueHex(ns.itemBg || vars['--nested-bg'], fallbackNested),
    stroke: normalizeOpaqueHex(ns.stroke || vars['--card-border'], fallbackBorder),
    textPrimary: normalizeOpaqueHex(ns.textPrimary || vars['--text-primary'], fallbackText),
    textSecondary: normalizeOpaqueHex(ns.textSecondary || vars['--text-secondary'], fallbackSub),
    accent: normalizeOpaqueHex(ns.accent || vars['--accent-color'] || theme.accentColor, fallbackAccent),
    badgeBg: normalizeOpaqueHex(ns.badgeBg || vars['--nested-bg'], fallbackNested),
    btnBg: normalizeOpaqueHex(ns.btnBg || vars['--btn-secondary-bg'] || vars['--nested-bg'], fallbackNested),
    bubbleBg: normalizeOpaqueHex(ns.bubbleBg || vars['--card-bg'], fallbackBg),
    bubbleRim: normalizeOpaqueHex(ns.bubbleRim || vars['--accent-color'] || theme.accentColor, fallbackAccent)
  });
}

/**
 * Fetches a theme record from https://theme.kurzyrio.dev/api/themes.php?id=<id>
 */
export async function fetchMarketplaceTheme(themeId: string): Promise<ThemeConfig> {
  const cleanId = (themeId || '').trim();
  if (!cleanId || !/^[a-zA-Z0-9_-]{2,64}$/.test(cleanId)) {
    throw new Error('Invalid theme ID format.');
  }

  const url = `${THEME_API_BASE_URL}?id=${encodeURIComponent(cleanId)}`;
  let data: any;

  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url,
      headers: { Accept: 'application/json' },
      connectTimeout: 12000,
      readTimeout: 15000
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(res.data?.error || `Theme could not be loaded (HTTP ${res.status}).`);
    }
    data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  } else {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      let msg = `Theme not found (HTTP ${res.status}).`;
      try {
        const errJson = await res.json();
        if (errJson?.error) msg = errJson.error;
      } catch {}
      throw new Error(msg);
    }
    data = await res.json();
  }

  if (!data?.success || !data?.theme) {
    throw new Error(data?.error || 'Theme not found in marketplace.');
  }

  const themePayload = data.theme;
  // Support API returning theme_json string or parsed theme object
  const mergedRaw = typeof themePayload.theme_json === 'string'
    ? { ...JSON.parse(themePayload.theme_json), ...themePayload }
    : themePayload;

  return validateAndSanitizeTheme(mergedRaw);
}

/**
 * Downloads remote wallpaper/GIF image as an offline Blob (enforcing size & MIME guardrails)
 */
async function downloadMediaBlob(url: string): Promise<{ blob: Blob; mime: string } | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const blob = await res.blob();
    const mime = contentType || blob.type.toLowerCase();
    if (!ALLOWED_IMAGE_MIMES.has(mime)) {
      console.warn('[ThemeDownload] Rejected unsupported media MIME:', mime);
      return null;
    }
    if (blob.size > MAX_WALLPAPER_BYTES) {
      console.warn('[ThemeDownload] Wallpaper exceeds 3.5 MB safety limit:', blob.size);
      return null;
    }
    return { blob, mime };
  } catch (err) {
    console.warn('[ThemeDownload] Could not cache wallpaper blob offline:', err);
    return null;
  }
}

/**
 * Installs (or updates) a sanitized marketplace theme into the isolated offline SkwelaDabawThemesDB.
 */
export async function installMarketplaceTheme(theme: ThemeConfig): Promise<StoredCustomThemeRecord> {
  const sanitized = validateAndSanitizeTheme(theme);
  let wallpaperBlob: Blob | undefined;
  let wallpaperMime: string | undefined;

  if (sanitized.wallpaperUrl) {
    const downloaded = await downloadMediaBlob(sanitized.wallpaperUrl);
    if (downloaded) {
      wallpaperBlob = downloaded.blob;
      wallpaperMime = downloaded.mime;
    }
  }

  const now = Date.now();
  const existing = await themeDb.customThemes.get(sanitized.id);
  const record: StoredCustomThemeRecord = {
    id: sanitized.id,
    config: sanitized,
    wallpaperBlob: wallpaperBlob ?? existing?.wallpaperBlob,
    wallpaperMime: wallpaperMime ?? existing?.wallpaperMime,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now
  };

  await themeDb.customThemes.put(record);
  return record;
}

export async function getStoredCustomThemeRecords(): Promise<StoredCustomThemeRecord[]> {
  try {
    return await themeDb.customThemes.orderBy('installedAt').reverse().toArray();
  } catch (err) {
    console.warn('[ThemeDownload] Failed to read SkwelaDabawThemesDB:', err);
    return [];
  }
}

export async function getStoredCustomThemeRecord(themeId: string): Promise<StoredCustomThemeRecord | undefined> {
  try {
    return await themeDb.customThemes.get(themeId);
  } catch {
    return undefined;
  }
}

export async function removeStoredCustomTheme(themeId: string): Promise<void> {
  await themeDb.customThemes.delete(themeId);
}

/**
 * Extracts a theme ID from any supported deep link, universal link, or QR code payload.
 * Supports:
 * - https://theme.kurzyrio.dev/theme/<id>
 * - https://theme.kurzyrio.dev/theme?id=<id>
 * - skwela://theme?id=<id>
 * - skwela://theme/<id>
 * - theme:<id>
 */
export function extractThemeIdFromUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Explicit theme:slug QR format
  const prefixMatch = trimmed.match(/^theme:([a-zA-Z0-9_-]{2,64})$/i);
  if (prefixMatch?.[1]) return prefixMatch[1];

  // Query param ?theme=... or ?themeId=...
  const queryThemeMatch = trimmed.match(/[?&](?:theme|themeId)=([a-zA-Z0-9_-]{2,64})/i);
  if (queryThemeMatch?.[1]) return queryThemeMatch[1];

  // skwela://theme?id=XYZ, skweladabaw://theme?id=XYZ, or https://theme.kurzyrio.dev/theme?id=XYZ
  if (/(?:skwela(?:dabaw)?:\/\/theme|theme\.kurzyrio\.dev\/(?:theme(?:\.php)?|t)?)/i.test(trimmed)) {
    const idQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{2,64})/i);
    if (idQuery?.[1]) return idQuery[1];
  }

  // Path style: /theme/XYZ, /t/XYZ, skwela://theme/XYZ, or skweladabaw://theme/XYZ
  const pathMatch = trimmed.match(/(?:skwela(?:dabaw)?:\/\/theme\/|theme\.kurzyrio\.dev\/(?:theme|t)\/)([a-zA-Z0-9_-]{2,64})/i);
  if (pathMatch?.[1]) return pathMatch[1];

  return null;
}
