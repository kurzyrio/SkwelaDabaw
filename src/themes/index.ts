import { ThemeConfig } from './types';
import { lightTheme } from './light';
import { darkTheme } from './dark';
import { violetTheme } from './violet';
import { emeraldTheme } from './emerald';
import { cyberTheme } from './cyber';
import { oledTheme } from './oled';

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

export function getTheme(id?: string | null): ThemeConfig {
  if (!id) return lightTheme;
  const match = AVAILABLE_THEMES.find((t) => t.id === id);
  if (match) return match;
  // Backward compatibility with legacy stored ids ('bw-light', 'bw-dark')
  if (id === 'bw-dark') return darkTheme;
  if (id === 'bw-light') return lightTheme;
  return lightTheme;
}

export function applyTheme(id?: string | null): ThemeConfig {
  const theme = getTheme(id);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;

    // 1. Inject all CSS variables directly into root style
    Object.entries(theme.variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // 2. Set data attribute and dark class for tailwind/system compatibility
    root.setAttribute('data-theme', theme.id);
    if (theme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 3. Save active theme id
    try {
      localStorage.setItem('skweladabaw_theme', theme.id);
    } catch (_) {}

    // 4. Dispatch custom event for components listening to theme shifts
    window.dispatchEvent(new CustomEvent('skweladabaw_theme_changed', {
      detail: { themeId: theme.id, theme }
    }));

    // 5. Synchronize equipped theme with native Android home screen widgets and Eagle Overlay
    try {
      import('../services/widgetService').then(({ syncThemeToWidgets }) => {
        syncThemeToWidgets(theme.id);
      }).catch(() => {});
      import('../services/eagleOverlayService').then(({ autoSyncCurrentStateToOverlay }) => {
        autoSyncCurrentStateToOverlay();
      }).catch(() => {});
    } catch (_) {}
  }
  return theme;
}
