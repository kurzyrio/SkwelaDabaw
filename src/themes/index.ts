import { ThemeConfig } from './types';
import { lightTheme } from './light';
import { darkTheme } from './dark';
import { violetTheme } from './violet';
import { emeraldTheme } from './emerald';
import { cyberTheme } from './cyber';
import { oledTheme } from './oled';
import {
  getStoredCustomThemeRecords,
  removeStoredCustomTheme,
  installMarketplaceTheme
} from '../services/themeDownloadService';
import { StoredCustomThemeRecord } from '../db/themeDb';

export * from './types';
export { lightTheme } from './light';
export { darkTheme } from './dark';
export { violetTheme } from './violet';
export { emeraldTheme } from './emerald';
export { cyberTheme } from './cyber';
export { oledTheme } from './oled';

export const AVAILABLE_THEMES: ThemeConfig[] = [
  violetTheme,
  lightTheme,
  darkTheme,
  emeraldTheme,
  cyberTheme,
  oledTheme
];

export const DEFAULT_THEME_ID = 'light';
export const ACTIVE_THEME_SNAPSHOT_KEY = 'skweladabaw_active_theme_snapshot';

// Optional custom-theme CSS variables that MUST be cleared before applying any theme
// so switching back from a custom theme to an official theme leaves zero residual styles.
const OPTIONAL_CUSTOM_CSS_VARS = [
  '--canvas-gradient',
  '--canvas-overlay',
  '--card-backdrop-blur',
  '--modal-backdrop-blur',
  '--nav-active-color',
  '--nav-fab-bg',
  '--text-muted'
];

export interface ActiveWallpaperState {
  themeId: string;
  isCustom: boolean;
  wallpaperUrl: string | null;
  wallpaperFit: 'cover' | 'contain';
  wallpaperOpacity: number;
  canvasGradient: string | null;
  canvasOverlay: string | null;
}

// In-memory hydrated registry of offline custom themes from SkwelaDabawThemesDB
const customThemesMap = new Map<string, StoredCustomThemeRecord>();
let isHydrated = false;
let activeWallpaperObjectUrl: string | null = null;
let currentWallpaperState: ActiveWallpaperState = {
  themeId: DEFAULT_THEME_ID,
  isCustom: false,
  wallpaperUrl: null,
  wallpaperFit: 'cover',
  wallpaperOpacity: 1,
  canvasGradient: null,
  canvasOverlay: null
};

export function isOfficialThemeId(id?: string | null): boolean {
  if (!id) return false;
  return AVAILABLE_THEMES.some((t) => t.id === id) || id === 'bw-dark' || id === 'bw-light';
}

export function getActiveWallpaperState(): ActiveWallpaperState {
  return currentWallpaperState;
}

export function getCustomThemes(): ThemeConfig[] {
  return Array.from(customThemesMap.values()).map((rec) => rec.config);
}

export function getAllThemes(): ThemeConfig[] {
  return [...AVAILABLE_THEMES, ...getCustomThemes()];
}

export async function hydrateCustomThemes(): Promise<ThemeConfig[]> {
  const records = await getStoredCustomThemeRecords();
  customThemesMap.clear();
  for (const rec of records) {
    if (rec?.id && rec?.config) {
      customThemesMap.set(rec.id, rec);
    }
  }
  isHydrated = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('skweladabaw_custom_themes_updated', {
      detail: { count: customThemesMap.size }
    }));
  }
  return getCustomThemes();
}

export async function installAndCacheCustomTheme(theme: ThemeConfig): Promise<StoredCustomThemeRecord> {
  const saved = await installMarketplaceTheme(theme);
  customThemesMap.set(saved.id, saved);
  isHydrated = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('skweladabaw_custom_themes_updated', {
      detail: { count: customThemesMap.size, installedId: saved.id }
    }));
  }
  return saved;
}

export async function deleteCustomThemeAndFallback(themeId: string): Promise<void> {
  await removeStoredCustomTheme(themeId);
  customThemesMap.delete(themeId);
  if (typeof window !== 'undefined') {
    const activeId = localStorage.getItem('skweladabaw_theme');
    if (activeId === themeId) {
      applyTheme(DEFAULT_THEME_ID);
    }
    window.dispatchEvent(new CustomEvent('skweladabaw_custom_themes_updated', {
      detail: { count: customThemesMap.size, deletedId: themeId }
    }));
  }
}

export function getTheme(id?: string | null): ThemeConfig {
  if (!id) return lightTheme;

  // 1. Official built-in themes ALWAYS take top priority
  const official = AVAILABLE_THEMES.find((t) => t.id === id);
  if (official) return official;

  // 2. Legacy aliases
  if (id === 'bw-dark') return darkTheme;
  if (id === 'bw-light') return lightTheme;

  // 3. Hydrated custom community themes
  const customRecord = customThemesMap.get(id);
  if (customRecord?.config) return customRecord.config;

  // 4. Cold-boot fallback: if IndexedDB hasn't hydrated yet, inspect the <4KB boot snapshot
  if (!isHydrated && typeof localStorage !== 'undefined') {
    try {
      const rawSnap = localStorage.getItem(ACTIVE_THEME_SNAPSHOT_KEY);
      if (rawSnap) {
        const snap = JSON.parse(rawSnap);
        if (snap && snap.id === id && snap.variables) {
          return snap as ThemeConfig;
        }
      }
    } catch (_) {}
  }

  return lightTheme;
}

export function applyTheme(id?: string | null): ThemeConfig {
  const theme = getTheme(id);
  const isCustom = Boolean(theme.isCustom && !isOfficialThemeId(theme.id));

  if (typeof document !== 'undefined') {
    const root = document.documentElement;

    // 1. Strictly clear all optional custom-theme variables to guarantee zero leakage onto official themes
    for (const key of OPTIONAL_CUSTOM_CSS_VARS) {
      root.style.removeProperty(key);
    }

    // 2. Inject active theme's CSS variables into :root
    Object.entries(theme.variables).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        root.style.setProperty(key, value);
      }
    });

    // 3. Revoke previous Blob ObjectURL and resolve new wallpaper/gradient state
    if (activeWallpaperObjectUrl) {
      try {
        URL.revokeObjectURL(activeWallpaperObjectUrl);
      } catch (_) {}
      activeWallpaperObjectUrl = null;
    }

    let resolvedWallpaperUrl: string | null = null;
    if (isCustom) {
      const rec = customThemesMap.get(theme.id);
      if (rec?.wallpaperBlob) {
        try {
          activeWallpaperObjectUrl = URL.createObjectURL(rec.wallpaperBlob);
          resolvedWallpaperUrl = activeWallpaperObjectUrl;
        } catch (_) {}
      } else if (theme.wallpaperUrl) {
        resolvedWallpaperUrl = theme.wallpaperUrl;
      }
    }

    const canvasGradient = isCustom ? (theme.variables['--canvas-gradient'] || null) : null;
    const canvasOverlay = isCustom ? (theme.variables['--canvas-overlay'] || null) : null;
    const hasVisualBackdrop = Boolean(isCustom && (resolvedWallpaperUrl || canvasGradient));

    currentWallpaperState = {
      themeId: theme.id,
      isCustom,
      wallpaperUrl: resolvedWallpaperUrl,
      wallpaperFit: theme.wallpaperFit === 'contain' ? 'contain' : 'cover',
      wallpaperOpacity: typeof theme.wallpaperOpacity === 'number' ? theme.wallpaperOpacity : 1,
      canvasGradient,
      canvasOverlay
    };

    // 4. Set DOM attributes & dark class (official themes never receive data-custom-theme)
    root.setAttribute('data-theme', theme.id);
    if (isCustom) {
      root.setAttribute('data-custom-theme', 'true');
    } else {
      root.removeAttribute('data-custom-theme');
    }

    if (hasVisualBackdrop) {
      root.setAttribute('data-has-wallpaper', 'true');
    } else {
      root.removeAttribute('data-has-wallpaper');
    }

    if (theme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update mobile browser theme-color meta tag
    try {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme && theme.variables['--canvas-bg']) {
        metaTheme.setAttribute('content', theme.variables['--canvas-bg']);
      }
    } catch (_) {}

    // 5. Persist active theme id + tiny (<4KB) color-only snapshot for zero-flicker cold boots
    try {
      localStorage.setItem('skweladabaw_theme', theme.id);
      localStorage.setItem('skweladabaw_theme_is_dark', theme.isDark ? 'true' : 'false');
      if (isCustom) {
        const tinySnapshot = {
          id: theme.id,
          name: theme.name,
          description: theme.description,
          author: theme.author,
          isDark: theme.isDark,
          isCustom: true,
          accentColor: theme.accentColor,
          cardPreviewBg: theme.cardPreviewBg,
          variables: theme.variables,
          nativeSurfaces: theme.nativeSurfaces
        };
        localStorage.setItem(ACTIVE_THEME_SNAPSHOT_KEY, JSON.stringify(tinySnapshot));
      } else {
        localStorage.removeItem(ACTIVE_THEME_SNAPSHOT_KEY);
      }
    } catch (_) {}

    // 6. Dispatch custom event for React components & ThemeWallpaperLayer
    window.dispatchEvent(new CustomEvent('skweladabaw_theme_changed', {
      detail: { themeId: theme.id, theme, wallpaperState: currentWallpaperState }
    }));

    // 7. Synchronize equipped theme with native Android Home Screen Widgets, Eagle Overlay & Optional Ongoing Notification
    try {
      import('../services/widgetService').then(({ syncThemeToWidgets }) => {
        syncThemeToWidgets(theme.id, theme);
      }).catch(() => {});
      import('../services/eagleOverlayService').then(({ autoSyncCurrentStateToOverlay }) => {
        autoSyncCurrentStateToOverlay();
      }).catch(() => {});
      if (typeof localStorage !== 'undefined' &&
          localStorage.getItem('skweladabaw_persistent_next_class') === 'true' &&
          localStorage.getItem('skweladabaw_persistent_theme') === 'match_app') {
        import('../services/notificationService').then(({ refreshUnremovableClassNotification }) => {
          refreshUnremovableClassNotification(undefined, 'match_app').catch(() => {});
        }).catch(() => {});
      }
    } catch (_) {}
  }
  return theme;
}
