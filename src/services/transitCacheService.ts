/**
 * Persistent Local Storage & Cache for Heavy Transit Stops and GeoJSON Datasets.
 * Uses Web CacheStorage API so multi-megabyte route and stop files are downloaded
 * only once, persisting across app restarts and background reopens with zero cellular data use.
 */

const TRANSIT_CACHE_NAME = 'skweladabaw-transit-v1';

class TransitCacheService {
  private isCacheStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof caches !== 'undefined';
  }

  /**
   * Fetches transit asset with persistent CacheStorage disk caching
   */
  async getTransitAssetWithCache(
    url: string,
    fetchFallback: (targetUrl: string) => Promise<Response>
  ): Promise<Response> {
    if (!this.isCacheStorageAvailable()) {
      return fetchFallback(url);
    }

    try {
      const cache = await caches.open(TRANSIT_CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch and store locally
      const networkResponse = await fetchFallback(url);
      if (networkResponse && networkResponse.ok) {
        try {
          await cache.put(url, networkResponse.clone());
        } catch (putErr) {
          console.warn('[TransitCacheService] Cache put warning:', putErr);
        }
      }
      return networkResponse;
    } catch (err) {
      console.warn('[TransitCacheService] CacheStorage read error, falling back to direct network:', err);
      return fetchFallback(url);
    }
  }

  /**
   * Clears transit dataset cache when major data migrations occur
   */
  async clearTransitCache(): Promise<void> {
    if (!this.isCacheStorageAvailable()) return;
    try {
      await caches.delete(TRANSIT_CACHE_NAME);
    } catch (err) {
      console.warn('[TransitCacheService] Clear cache warning:', err);
    }
  }
}

export const transitCacheService = new TransitCacheService();
