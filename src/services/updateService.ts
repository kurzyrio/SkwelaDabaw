/**
 * SkwelaDabaw In-App Update Service
 * Checks Firebase Hosting (https://skweladabaw.web.app/version.json) for app updates.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const CURRENT_APP_VERSION = "1.11.5.4";
export const CURRENT_VERSION_CODE = 133;

export const GOOGLE_PLAY_PACKAGE_NAME = 'com.kurzyrio.skweladabaw.app';
export const GOOGLE_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${GOOGLE_PLAY_PACKAGE_NAME}`;
export const GOOGLE_PLAY_MARKET_URI = `market://details?id=${GOOGLE_PLAY_PACKAGE_NAME}`;

/**
 * Safely redirects the commuter to the official Google Play Store listing
 */
export function openGooglePlayStore(): void {
  if (typeof window === 'undefined') return;
  try {
    if (Capacitor.isNativePlatform()) {
      window.open(GOOGLE_PLAY_MARKET_URI, '_system');
    } else {
      window.open(GOOGLE_PLAY_STORE_URL, '_blank');
    }
  } catch {
    window.open(GOOGLE_PLAY_STORE_URL, '_blank');
  }
}

export interface AppVersionManifest {
  version: string;
  versionCode: number;
  releaseDate: string;
  minSupportedVersion?: string;
  forceUpdate?: boolean;
  required?: boolean | string;
  title?: string;
  releaseNotes?: string[];
  downloadUrl?: string;
  apkUrl?: string;
  sizeFormatted?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  isForceUpdate: boolean;
  isOptional: boolean;
  currentVersion: string;
  latestVersion: string;
  title?: string;
  releaseNotes?: string[];
  downloadUrl?: string;
  apkUrl?: string;
  sizeFormatted?: string;
  checkedAt: string;
  error?: string;
}

const UPDATE_ENDPOINTS = [
  'https://skweladabaw.kurzyrio.site/api/version.php',
  'https://skweladabaw.kurzyrio.site/version.json',
  'https://skweladabaw.kurzyrio.site/api/proxy.php?action=version',
  '/version.json'
];

/**
 * Compare two semver-like version strings (e.g., "1.3.0" vs "1.2.0")
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = v2.split('.').map(n => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check for the latest version manifest across robust native and web endpoints
 */
export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const cacheBuster = `?t=${Date.now()}`;
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let manifest: AppVersionManifest | null = null;
  let lastError: string | null = null;

  for (const endpoint of UPDATE_ENDPOINTS) {
    const targetUrl = endpoint.startsWith('http') ? `${endpoint}${cacheBuster}` : `${endpoint}${cacheBuster}`;

    try {
      // 1. On Native Android: Use CapacitorHttp to completely bypass WebView CORS restrictions
      if (Capacitor.isNativePlatform()) {
        const nativeRes = await CapacitorHttp.get({
          url: targetUrl,
          headers: {
            'Accept': 'application/json'
          },
          connectTimeout: 8000,
          readTimeout: 8000
        });

        if (nativeRes.status === 200 && nativeRes.data) {
          const parsed = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
          if (parsed && parsed.version) {
            manifest = parsed as AppVersionManifest;
            break;
          }
        }
      } else {
        // 2. On Web / Browser: Use standard fetch without non-simple CORS headers to avoid preflight issues
        const webRes = await fetch(targetUrl, {
          method: 'GET',
          cache: 'no-store'
        });

        if (webRes.ok) {
          const parsed = await webRes.json();
          if (parsed && parsed.version) {
            manifest = parsed as AppVersionManifest;
            break;
          }
        }
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
      // Try next endpoint fallback
    }
  }

  if (manifest) {
    const isNewer = compareVersions(manifest.version, CURRENT_APP_VERSION) > 0;
    const hasHigherVersionCode = manifest.versionCode > CURRENT_VERSION_CODE;
    const hasUpdate = isNewer || hasHigherVersionCode;

    // Check optional vs required update specifications
    const requiredStr = typeof manifest.required === 'string' ? manifest.required.toLowerCase().trim() : '';
    const isExplicitlyRequired = manifest.required === true || requiredStr === 'yes' || requiredStr === 'true';
    const isExplicitlyOptional = manifest.required === false || requiredStr === 'no' || requiredStr === 'false';

    const isMinSupportedHigher = manifest.minSupportedVersion
      ? compareVersions(manifest.minSupportedVersion, CURRENT_APP_VERSION) > 0
      : false;

    // An update is forced ONLY if explicitly required or minSupportedVersion is higher, AND not explicitly optional
    const isForceUpdate = hasUpdate && !isExplicitlyOptional && (isExplicitlyRequired || Boolean(manifest.forceUpdate) || isMinSupportedHigher);
    const isOptional = hasUpdate && !isForceUpdate;

    return {
      hasUpdate,
      isForceUpdate,
      isOptional,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: manifest.version,
      title: manifest.title,
      releaseNotes: manifest.releaseNotes,
      downloadUrl: manifest.downloadUrl || GOOGLE_PLAY_STORE_URL,
      apkUrl: manifest.apkUrl || GOOGLE_PLAY_STORE_URL,
      sizeFormatted: manifest.sizeFormatted,
      checkedAt: nowStr
    };
  }

  return {
    hasUpdate: false,
    isForceUpdate: false,
    isOptional: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    checkedAt: nowStr,
    error: lastError || 'Could not connect to update servers.'
  };
}

/**
 * Apply the update (hard reloads cache on web or opens download URL)
 */
export function applyAppUpdate(downloadUrl?: string) {
  const win = typeof window !== 'undefined' ? (window as any) : null;
  if (!win) return;

  if (win.caches && typeof win.caches.keys === 'function') {
    win.caches.keys().then((names: string[]) => {
      names.forEach(name => win.caches.delete(name));
    }).finally(() => {
      win.location.reload();
    });
  } else {
    win.location.reload();
  }

  if (downloadUrl && win.navigator && !win.navigator.onLine) {
    win.open(downloadUrl, '_blank');
  }
}
