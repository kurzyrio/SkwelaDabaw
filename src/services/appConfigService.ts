import { CapacitorHttp, Capacitor } from '@capacitor/core';

export interface RemoteAppConfig {
  maintenance: {
    enabled: boolean;
    title: string;
    message: string;
    estimatedEndTime?: string | null;
  };
  globalBanner: {
    enabled: boolean;
    type: 'info' | 'warning' | 'danger' | 'success';
    text: string;
    link?: string | null;
    dismissible: boolean;
  };
  features: {
    campusChat: boolean;
    aiOcr: boolean;
    qrSharing: boolean;
    pujDirectory: boolean;
    dcbusTracking: boolean;
  };
  advisories: {
    dcbus?: string | null;
    aiScanner?: string | null;
  };
  minSupportedVersion?: string;
  updatedAt?: string;
}

export const DEFAULT_APP_CONFIG: RemoteAppConfig = {
  maintenance: {
    enabled: false,
    title: 'Scheduled System Maintenance',
    message: 'SkwelaDabaw is undergoing brief scheduled enhancements to optimize services for Dabawenyos. Please check back shortly!',
    estimatedEndTime: null
  },
  globalBanner: {
    enabled: false,
    type: 'info',
    text: '',
    link: null,
    dismissible: true
  },
  features: {
    campusChat: true,
    aiOcr: true,
    qrSharing: true,
    pujDirectory: true,
    dcbusTracking: true
  },
  advisories: {
    dcbus: 'DavaoBus official tracking service is currently protected by Cloudflare Turnstile security. Please visit the official https://davaobus.davaocity.gov.ph/dibs/ portal directly.',
    aiScanner: null
  },
  minSupportedVersion: '1.5.0.1'
};

const STORAGE_KEY = 'skweladabaw_remote_app_config';
const DISMISSED_BANNER_KEY = 'skweladabaw_dismissed_global_banner';

/**
 * Get current cached configuration from localStorage with instant fallback
 */
export function getCachedAppConfig(): RemoteAppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_APP_CONFIG,
        ...parsed,
        maintenance: { ...DEFAULT_APP_CONFIG.maintenance, ...(parsed.maintenance || {}) },
        globalBanner: { ...DEFAULT_APP_CONFIG.globalBanner, ...(parsed.globalBanner || {}) },
        features: { ...DEFAULT_APP_CONFIG.features, ...(parsed.features || {}) },
        advisories: { ...DEFAULT_APP_CONFIG.advisories, ...(parsed.advisories || {}) }
      };
    }
  } catch (err) {
    console.warn('Failed to parse cached app config:', err);
  }
  return DEFAULT_APP_CONFIG;
}

/**
 * Fetch remote app configuration via website API
 */
export async function fetchRemoteAppConfig(): Promise<RemoteAppConfig> {
  const apiUrl = 'https://skweladabaw.kurzyrio.site/api/app_config.php';
  try {
    let rawText = '';
    if (Capacitor.isNativePlatform()) {
      const resp = await CapacitorHttp.get({
        url: `${apiUrl}?t=${Date.now()}`,
        connectTimeout: 5000,
        readTimeout: 5000
      });
      if (resp.status >= 200 && resp.status < 300) {
        rawText = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      }
    } else {
      const resp = await fetch(`${apiUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (resp.ok) {
        rawText = await resp.text();
      }
    }

    if (rawText) {
      const parsed = JSON.parse(rawText);
      const merged: RemoteAppConfig = {
        ...DEFAULT_APP_CONFIG,
        ...parsed,
        maintenance: { ...DEFAULT_APP_CONFIG.maintenance, ...(parsed.maintenance || {}) },
        globalBanner: { ...DEFAULT_APP_CONFIG.globalBanner, ...(parsed.globalBanner || {}) },
        features: { ...DEFAULT_APP_CONFIG.features, ...(parsed.features || {}) },
        advisories: { ...DEFAULT_APP_CONFIG.advisories, ...(parsed.advisories || {}) }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (httpErr) {
    console.warn('HTTP app config fetch note:', httpErr);
  }

  return getCachedAppConfig();
}

/**
 * Listener for remote configuration updates
 */
export function subscribeToRemoteAppConfig(
  onUpdate: (config: RemoteAppConfig) => void
): () => void {
  // Call immediately with cache
  onUpdate(getCachedAppConfig());

  // Also fetch once via network
  fetchRemoteAppConfig().then(onUpdate).catch(() => {});

  // Periodic poll every 60s
  const intervalId = setInterval(() => {
    fetchRemoteAppConfig().then(onUpdate).catch(() => {});
  }, 60000);

  return () => clearInterval(intervalId);
}

/**
 * Checks if a specific banner has already been dismissed by this student
 */
export function isBannerDismissed(bannerText: string): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISSED_BANNER_KEY);
    return dismissed === bannerText;
  } catch {
    return false;
  }
}

/**
 * Save dismissed banner in localStorage
 */
export function dismissBanner(bannerText: string): void {
  try {
    localStorage.setItem(DISMISSED_BANNER_KEY, bannerText);
  } catch (_) {}
}
