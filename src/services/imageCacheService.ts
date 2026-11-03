import { db } from '../db';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// In-memory LRU map of URL -> ObjectURL for 0ms synchronous access
const memoryCache = new Map<string, string>();
const activeFetches = new Map<string, Promise<string | null>>();

const MAX_CACHE_ITEMS = 300;
const STALE_CHECK_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const MAX_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Universal binary blob fetcher across Native Android and Web
 */
async function fetchBinaryBlob(url: string): Promise<Blob | null> {
  // 1. Try standard browser fetch with CORS
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 0) {
        return blob;
      }
    }
  } catch (webErr) {
    // If running in browser and CORS fails, nothing more we can do via fetch
    if (!Capacitor.isNativePlatform()) {
      return null;
    }
  }

  // 2. On Native Android: Use CapacitorHttp to bypass any WebView CORS or origin restrictions
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.get({
        url,
        responseType: 'arraybuffer',
        connectTimeout: 8000,
        readTimeout: 8000
      });

      if (res.status >= 200 && res.status < 300 && res.data) {
        let binaryBlob: Blob;
        if (typeof res.data === 'string') {
          // Base64 response
          const contentType = res.headers?.['content-type'] || res.headers?.['Content-Type'] || 'image/jpeg';
          const byteChars = atob(res.data);
          const byteNumbers = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          binaryBlob = new Blob([byteNumbers], { type: contentType });
        } else if (res.data instanceof ArrayBuffer) {
          const contentType = res.headers?.['content-type'] || res.headers?.['Content-Type'] || 'image/jpeg';
          binaryBlob = new Blob([res.data], { type: contentType });
        } else {
          return null;
        }

        if (binaryBlob.size > 0) {
          return binaryBlob;
        }
      }
    } catch (nativeErr) {
      console.warn('[ImageCacheService] Native HTTP binary fetch error:', nativeErr);
    }
  }

  return null;
}

class ImageCacheService {
  private isPruning = false;

  /**
   * Synchronously returns cached ObjectURL if already resolved in memory
   */
  getSync(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
      return url;
    }
    return memoryCache.get(url) || null;
  }

  /**
   * Retrieves image URL with local-first persistent caching.
   * If cached in IndexedDB: returns cached ObjectURL (0ms).
   * If stale or missing: fetches in background/on-demand and persists.
   */
  async getImageUrl(url: string | null | undefined): Promise<string | null> {
    if (!url || typeof url !== 'string') return null;

    // Fast-path for local assets, blobs, and base64 data URIs
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/') || !url.startsWith('http')) {
      return url;
    }

    // 1. Check in-memory cache (0ms)
    const inMem = memoryCache.get(url);
    if (inMem) {
      return inMem;
    }

    // 2. Check deduplicated active fetch in-flight
    if (activeFetches.has(url)) {
      return activeFetches.get(url)!;
    }

    const fetchPromise = (async () => {
      try {
        // 3. Check persistent IndexedDB cache
        const record = await db.cachedImages.get(url);
        if (record && record.blob && record.blob.size > 0) {
          const blobUrl = URL.createObjectURL(record.blob);
          memoryCache.set(url, blobUrl);

          // If entry is older than 3 days and device is online, revalidate in background
          if (Date.now() - record.timestamp > STALE_CHECK_THRESHOLD_MS && navigator.onLine) {
            this.revalidateInBackground(url);
          }

          return blobUrl;
        }

        // 4. Not in local database: if offline, return null
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return null;
        }

        // 5. Fetch binary image from remote CDN
        const blob = await fetchBinaryBlob(url);
        if (blob) {
          try {
            await db.cachedImages.put({
              url,
              blob,
              mimeType: blob.type || 'image/jpeg',
              timestamp: Date.now()
            });
          } catch (dbErr) {
            console.warn('[ImageCacheService] Failed to persist blob to IndexedDB:', dbErr);
          }

          const blobUrl = URL.createObjectURL(blob);
          memoryCache.set(url, blobUrl);
          this.schedulePrune();
          return blobUrl;
        }
      } catch (err) {
        console.warn('[ImageCacheService] Failed to resolve image:', url, err);
      } finally {
        activeFetches.delete(url);
      }

      return null;
    })();

    activeFetches.set(url, fetchPromise);
    return fetchPromise;
  }

  /**
   * Background revalidation: downloads fresh image and updates IndexedDB + memory
   */
  private async revalidateInBackground(url: string) {
    try {
      const blob = await fetchBinaryBlob(url);
      if (blob) {
        await db.cachedImages.put({
          url,
          blob,
          mimeType: blob.type || 'image/jpeg',
          timestamp: Date.now()
        });
        const oldBlobUrl = memoryCache.get(url);
        if (oldBlobUrl) {
          URL.revokeObjectURL(oldBlobUrl);
        }
        const newBlobUrl = URL.createObjectURL(blob);
        memoryCache.set(url, newBlobUrl);
      }
    } catch (_) {}
  }

  /**
   * Invalidate a URL from memory and persistent disk cache
   */
  async invalidate(url: string | null | undefined): Promise<void> {
    if (!url) return;
    const blobUrl = memoryCache.get(url);
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
      memoryCache.delete(url);
    }
    try {
      await db.cachedImages.delete(url);
    } catch (_) {}
  }

  /**
   * Prune expired and least recently used image blobs to protect device storage
   */
  async pruneCache(): Promise<void> {
    if (this.isPruning) return;
    this.isPruning = true;
    try {
      const now = Date.now();
      const cutoff = now - MAX_EXPIRY_MS;
      
      // Delete entries older than 14 days
      await db.cachedImages.where('timestamp').below(cutoff).delete();

      // Check count and trim if exceeding limit
      const count = await db.cachedImages.count();
      if (count > MAX_CACHE_ITEMS) {
        const excess = count - MAX_CACHE_ITEMS;
        const oldestRecords = await db.cachedImages.orderBy('timestamp').limit(excess).primaryKeys();
        await db.cachedImages.bulkDelete(oldestRecords);
      }
    } catch (err) {
      console.warn('[ImageCacheService] Prune error:', err);
    } finally {
      this.isPruning = false;
    }
  }

  private schedulePrune() {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => this.pruneCache());
    } else {
      setTimeout(() => this.pruneCache(), 5000);
    }
  }
}

export const imageCacheService = new ImageCacheService();
