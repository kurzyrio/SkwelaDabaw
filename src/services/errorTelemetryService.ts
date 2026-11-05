/**
 * SkwelaDabaw — Partitioned Error Logging & Telemetry Service
 *
 * Separates offline crashes (transmitted immediately on reconnection)
 * from online telemetry errors (batched and transmitted every 24 hours).
 *
 * Enforces a strict commuter data-saver guardrail:
 * - NO data transmitted over cellular/mobile data by default (Wi-Fi only).
 * - Only the developer has access.
 * - Zero PII (no personal info, student names, IDs, or passwords).
 */

import { CURRENT_APP_VERSION } from './updateService';

export interface TelemetryLogEntry {
  id: string; // OFFLINE_ERR_* or ONLINE_ERR_*
  deviceId?: string;
  type: 'online' | 'offline';
  message: string;
  stack?: string;
  url?: string;
  componentStack?: string;
  context?: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  deviceInfo: {
    platform: string;
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    pixelRatio: number;
    language: string;
    networkType: string;
  };
  appTelemetry: {
    version: string;
    sessionUptimeSeconds: number;
    currentUrl: string;
  };
}

const STORAGE_KEYS = {
  OFFLINE_LOGS: 'skwela_logs_offline',
  ONLINE_LOGS: 'skwela_logs_online',
  ONLINE_LAST_SENT: 'skwela_logs_online_last_sent',
  ENABLED: 'skwela_telemetry_enabled',
  ALLOW_CELLULAR: 'skwela_telemetry_allow_cellular',
  DEVICE_ID: 'skwela_device_id'
} as const;

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 9);
      const time = Date.now().toString(36);
      id = `dev_${rand}_${time}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'dev_default';
  }
}

const API_ENDPOINT = 'https://skweladabaw.kurzyrio.site/api/logs.php';
const MAX_QUEUE_LIMIT = 50;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const sessionStartTime = Date.now();

// --- Configuration & Preferences Getters/Setters ---

export function isTelemetryEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.ENABLED);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setTelemetryEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ENABLED, String(enabled));
  } catch {}
}

export function isAllowCellularEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.ALLOW_CELLULAR);
    // Default is FALSE (Wi-Fi only) to protect student data allowances
    return val === 'true';
  } catch {
    return false;
  }
}

export function setAllowCellularEnabled(allowed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ALLOW_CELLULAR, String(allowed));
  } catch {}
}

// --- Network & Device Telemetry Helpers ---

export function getNetworkConnectionType(): 'cellular' | 'wifi' | 'ethernet' | 'none' | 'unknown' {
  if (typeof navigator === 'undefined' || !navigator.onLine) return 'none';
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (!conn) return 'unknown';

  if (conn.type) {
    if (conn.type === 'cellular') return 'cellular';
    if (conn.type === 'wifi') return 'wifi';
    if (conn.type === 'ethernet') return 'ethernet';
    if (conn.type === 'none') return 'none';
  }

  // Fallback checks on effectiveType for Android WebViews
  if (conn.effectiveType === '2g' || conn.effectiveType === '3g' || conn.effectiveType === '4g') {
    return 'cellular';
  }

  return 'unknown';
}

export function isDispatchAllowed(): boolean {
  if (typeof navigator === 'undefined' || !navigator.onLine) return false;
  if (!isTelemetryEnabled()) return false;

  const allowCellular = isAllowCellularEnabled();
  if (allowCellular) return true;

  const connType = getNetworkConnectionType();
  // Block if explicitly on cellular data and commuter did not opt in
  if (connType === 'cellular') {
    return false;
  }

  return true;
}

function getDeviceInfoSnapshot(networkType: string) {
  if (typeof window === 'undefined') {
    return {
      platform: 'unknown',
      userAgent: 'unknown',
      screenWidth: 0,
      screenHeight: 0,
      pixelRatio: 1,
      language: 'en',
      networkType
    };
  }
  return {
    platform: navigator.platform || 'unknown',
    userAgent: navigator.userAgent || 'unknown',
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    pixelRatio: window.devicePixelRatio || 1,
    language: navigator.language || 'en',
    networkType
  };
}

// --- Queue Management ---

export function getPendingLogsCount(): { offline: number; online: number } {
  try {
    const offRaw = localStorage.getItem(STORAGE_KEYS.OFFLINE_LOGS);
    const onRaw = localStorage.getItem(STORAGE_KEYS.ONLINE_LOGS);
    const offlineList = offRaw ? JSON.parse(offRaw) : [];
    const onlineList = onRaw ? JSON.parse(onRaw) : [];
    return {
      offline: Array.isArray(offlineList) ? offlineList.length : 0,
      online: Array.isArray(onlineList) ? onlineList.length : 0
    };
  } catch {
    return { offline: 0, online: 0 };
  }
}

export function clearAllLocalLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_LOGS);
    localStorage.removeItem(STORAGE_KEYS.ONLINE_LOGS);
  } catch {}
}

function saveQueue(key: string, queue: TelemetryLogEntry[]) {
  try {
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (err) {
    console.warn('[Telemetry] Storage write failure:', err);
  }
}

function loadQueue(key: string): TelemetryLogEntry[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// --- Error Recording & Deduplication ---

export function recordError(
  error: Error | string,
  extra: {
    context?: string;
    componentStack?: string;
    source?: string;
  } = {}
): void {
  if (!isTelemetryEnabled()) return;

  const message = typeof error === 'string' ? error : error?.message || 'Unknown exception';
  const stack = typeof error === 'object' && error?.stack ? error.stack : undefined;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
  const type: 'online' | 'offline' = isOnline ? 'online' : 'offline';
  const storageKey = isOnline ? STORAGE_KEYS.ONLINE_LOGS : STORAGE_KEYS.OFFLINE_LOGS;

  const queue = loadQueue(storageKey);
  const nowIso = new Date().toISOString();

  // Deduplication: Match existing error with same message and stack trace
  const existingIndex = queue.findIndex(item => item.message === message && item.stack === stack);

  if (existingIndex >= 0) {
    queue[existingIndex].occurrences += 1;
    queue[existingIndex].lastSeen = nowIso;
    if (extra.context) queue[existingIndex].context = extra.context;
    if (extra.componentStack) queue[existingIndex].componentStack = extra.componentStack;
  } else {
    // Generate distinct separated ID prefix
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const id = isOnline
      ? `ONLINE_ERR_${Date.now()}_${randomSuffix}`
      : `OFFLINE_ERR_${Date.now()}_${randomSuffix}`;

    const newEntry: TelemetryLogEntry = {
      id,
      deviceId: getOrCreateDeviceId(),
      type,
      message,
      stack,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      componentStack: extra.componentStack,
      context: extra.context || extra.source,
      occurrences: 1,
      firstSeen: nowIso,
      lastSeen: nowIso,
      deviceInfo: getDeviceInfoSnapshot(getNetworkConnectionType()),
      appTelemetry: {
        version: CURRENT_APP_VERSION,
        sessionUptimeSeconds: Math.floor((Date.now() - sessionStartTime) / 1000),
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
      }
    };

    if (queue.length >= MAX_QUEUE_LIMIT) {
      queue.shift(); // Drop oldest entry to maintain storage safety
    }
    queue.push(newEntry);
  }

  saveQueue(storageKey, queue);

  // If online, check if it's time for the 24h batch upload
  if (isOnline) {
    checkAndFlushOnlineLogs();
  }
}

// --- Transmission & Flushing ---

/**
 * Flushes offline logs immediately when network connectivity is restored.
 */
export async function flushOfflineLogs(): Promise<boolean> {
  if (!isDispatchAllowed()) return false;

  const queue = loadQueue(STORAGE_KEYS.OFFLINE_LOGS);
  if (queue.length === 0) return true;

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'offline',
        deviceId: getOrCreateDeviceId(),
        deviceInfo: getDeviceInfoSnapshot(getNetworkConnectionType()),
        logs: queue
      })
    });

    if (res.ok) {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_LOGS);
      return true;
    }
  } catch (err) {
    // Failed to connect, leave in storage for next retry
    console.debug('[Telemetry] Offline log flush failed; will retry later.', err);
  }

  return false;
}

/**
 * Flushes online logs in batches every 24 hours.
 */
export async function checkAndFlushOnlineLogs(force = false): Promise<boolean> {
  if (!isDispatchAllowed()) return false;

  const queue = loadQueue(STORAGE_KEYS.ONLINE_LOGS);
  if (queue.length === 0) return true;

  const lastSentStr = localStorage.getItem(STORAGE_KEYS.ONLINE_LAST_SENT);
  const lastSent = lastSentStr ? parseInt(lastSentStr, 10) : 0;
  const now = Date.now();

  // Enforce 24-hour cadence unless forced
  if (!force && now - lastSent < TWENTY_FOUR_HOURS_MS) {
    return false;
  }

  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'online',
        deviceId: getOrCreateDeviceId(),
        deviceInfo: getDeviceInfoSnapshot(getNetworkConnectionType()),
        logs: queue
      })
    });

    if (res.ok) {
      localStorage.removeItem(STORAGE_KEYS.ONLINE_LOGS);
      localStorage.setItem(STORAGE_KEYS.ONLINE_LAST_SENT, String(now));
      return true;
    }
  } catch (err) {
    console.debug('[Telemetry] Online 24h batch flush failed; will retry later.', err);
  }

  return false;
}

// --- Lifecycle & Initialization ---

let isInitialized = false;

export function initErrorTelemetry(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // 1. Capture standard JavaScript uncaught runtime exceptions
  window.addEventListener('error', (event: ErrorEvent) => {
    // Ignore harmless script load errors or cross-origin issues with no message
    if (!event.message) return;
    recordError(event.error || event.message, {
      source: 'window.onerror',
      context: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined
    });
  });

  // 2. Capture unhandled async promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const errorObj = reason instanceof Error ? reason : new Error(String(reason));
    recordError(errorObj, {
      source: 'unhandledrejection',
      context: 'Unhandled Async Promise'
    });
  });

  // 3. React to network reconnection: flush offline logs immediately
  window.addEventListener('online', () => {
    // Delay slightly to allow socket connection to stabilize
    setTimeout(() => {
      flushOfflineLogs();
      checkAndFlushOnlineLogs();
    }, 2000);
  });

  // 4. Initial startup check
  setTimeout(() => {
    if (navigator.onLine) {
      flushOfflineLogs();
      checkAndFlushOnlineLogs();
    }
  }, 3500);
}
