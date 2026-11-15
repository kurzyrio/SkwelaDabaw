/**
 * SkwelaDabaw Walking Route Service
 * 
 * Provides authentic road- and sidewalk-following pedestrian routes for Davao City.
 * Eliminates straight aerial beelines by routing along actual OSM street geometry.
 * Includes in-memory & localStorage caching, fast timeouts, and resilient fallback.
 */

import {
  getOfflinePedestrianRoute,
  loadPedestrianGraph,
  WALKING_SPEED_MPS,
  walkMetersToMinutes
} from './pedestrianGraphService';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface WalkingRouteResult {
  coordinates: [number, number][]; // [lat, lng][] for Leaflet polylines
  distanceMeters: number;
  durationMinutes: number;
  isRoadSnapped: boolean;
}

// In-memory runtime cache for instant lookups during user session (road-snapped routes only)
const memoryCache = new Map<string, WalkingRouteResult>();
const MAX_MEMORY_ENTRIES = 512;

// Storage key prefix for persisted cache
const STORAGE_CACHE_KEY = 'skweladabaw_walking_cache_v1';
const MAX_PERSISTED_ENTRIES = 120;
const PERSISTED_EVICT_BATCH = 30;

function setMemoryCache(key: string, result: WalkingRouteResult): void {
  if (!result.isRoadSnapped) return;
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  }
  memoryCache.set(key, result);
  while (memoryCache.size > MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey === undefined) break;
    memoryCache.delete(oldestKey);
  }
}

// Pre-warm the offline pedestrian graph in the background
if (typeof window !== 'undefined') {
  setTimeout(() => {
    loadPedestrianGraph().catch(() => {});
  }, 800);
}

/**
 * Generates a stable cache key rounded to ~10 meters precision
 */
function getCacheKey(from: LatLngPoint, to: LatLngPoint): string {
  const round = (n: number) => n.toFixed(4);
  return `${round(from.lat)},${round(from.lng)}|${round(to.lat)},${round(to.lng)}`;
}

/**
 * Loads persisted walking routes from localStorage
 */
function loadPersistedCache(): Record<string, WalkingRouteResult> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves a walking route entry to persisted cache
 */
function saveToPersistedCache(key: string, result: WalkingRouteResult): void {
  if (typeof window === 'undefined' || !result.isRoadSnapped) return;
  try {
    const cache = loadPersistedCache();
    // Re-insert so JS key iteration order reflects recency (LRU)
    delete cache[key];
    cache[key] = result;
    const keys = Object.keys(cache);
    if (keys.length > MAX_PERSISTED_ENTRIES) {
      const targetSize = Math.max(1, MAX_PERSISTED_ENTRIES - PERSISTED_EVICT_BATCH);
      const excess = keys.length - targetSize;
      for (let i = 0; i < excess; i++) {
        delete cache[keys[i]];
      }
    }
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota limits
  }
}

/**
 * Calculates straight-line fallback distance using Haversine formula
 */
function haversineDistMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetches a road-following pedestrian route between two points in Davao City.
 * Automatically checks memory cache, local persistence, and queries high-speed OSRM.
 * Falls back safely to direct connector if offline or timed out.
 */
export async function getWalkingRoute(
  from: LatLngPoint,
  to: LatLngPoint,
  timeoutMs: number = 3000
): Promise<WalkingRouteResult> {
  const key = getCacheKey(from, to);

  // 1. Check in-memory cache (LRU refresh)
  const memHit = memoryCache.get(key);
  if (memHit) {
    setMemoryCache(key, memHit);
    return memHit;
  }

  // 2. Check localStorage cache
  const persisted = loadPersistedCache();
  if (persisted[key] && persisted[key].isRoadSnapped) {
    setMemoryCache(key, persisted[key]);
    return persisted[key];
  }

  // 3. Fallback calculation if points are nearly identical (< 15 meters)
  const directMeters = haversineDistMeters(from.lat, from.lng, to.lat, to.lng);
  if (directMeters < 15) {
    const immediateResult: WalkingRouteResult = {
      coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
      distanceMeters: Math.round(directMeters),
      durationMinutes: 1,
      isRoadSnapped: true
    };
    setMemoryCache(key, immediateResult);
    return immediateResult;
  }

  // 4. Offline Pedestrian Graph Routing (Primary High-Performance Offline Provider)
  try {
    const offlineRoute = await getOfflinePedestrianRoute(from, to);
    if (offlineRoute && offlineRoute.coordinates && offlineRoute.coordinates.length >= 2) {
      const result: WalkingRouteResult = {
        coordinates: offlineRoute.coordinates,
        distanceMeters: offlineRoute.distanceMeters,
        durationMinutes: offlineRoute.durationMinutes,
        isRoadSnapped: true
      };
      setMemoryCache(key, result);
      saveToPersistedCache(key, result);
      return result;
    }
  } catch {
    // Graceful fallback to network routers if offline graph is not initialized
  }

  const buildStraightFallback = (): WalkingRouteResult => ({
    coordinates: [[from.lat, from.lng], [to.lat, to.lng]],
    distanceMeters: Math.round(directMeters),
    durationMinutes: walkMetersToMinutes(directMeters),
    isRoadSnapped: false
  });

  // Short-circuit immediately when offline to avoid blocking on network timeouts
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return buildStraightFallback();
  }

  // 5. Try Geoapify Pedestrian Routing (Secondary Provider)
  {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const geoapifyUrl = `https://api.geoapify.com/v1/routing?waypoints=${from.lat},${from.lng}|${to.lat},${to.lng}&mode=walk&apiKey=da0c237d80b6417f99f09d4cc048009d`;
      const response = await fetch(geoapifyUrl, { signal: controller.signal });

      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const feat = data.features[0];
          const geom = feat.geometry;
          let rawCoords: [number, number][] = [];
          if (geom.type === 'LineString') {
            rawCoords = geom.coordinates || [];
          } else if (geom.type === 'MultiLineString') {
            rawCoords = (geom.coordinates || []).flat();
          }

          if (rawCoords.length >= 2) {
            const coordinates: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
            const distanceMeters = Math.round(feat.properties?.distance || directMeters);
            const timeSeconds = Number(feat.properties?.time);
            const durationMinutes = Number.isFinite(timeSeconds) && timeSeconds > 0
              ? Math.max(1, Math.round(timeSeconds / 60))
              : walkMetersToMinutes(distanceMeters);

            const result: WalkingRouteResult = {
              coordinates,
              distanceMeters,
              durationMinutes,
              isRoadSnapped: true
            };

            setMemoryCache(key, result);
            saveToPersistedCache(key, result);
            return result;
          }
        }
      }
    } catch {
      // Geoapify timed out or network error - proceed to OSRM fallback
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 6. Query OSRM Walking Router API (Secondary Fallback Provider)
  {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://router.project-osrm.org/route/v1/walking/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url, { signal: controller.signal });

      if (response.ok) {
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const rawCoords: [number, number][] = route.geometry.coordinates || [];
          const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

          if (leafletCoords.length >= 2) {
            const distanceMeters = Math.round(route.distance);
            const durationMinutes = Number.isFinite(route.duration) && route.duration > 0
              ? Math.max(1, Math.round(route.duration / 60))
              : walkMetersToMinutes(distanceMeters);
            const result: WalkingRouteResult = {
              coordinates: leafletCoords,
              distanceMeters,
              durationMinutes,
              isRoadSnapped: true
            };

            setMemoryCache(key, result);
            saveToPersistedCache(key, result);
            return result;
          }
        }
      }
    } catch {
      // Both providers unavailable - proceed to direct fallback
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 7. Straight-line fallback (never memoized so offline graph/network retry can recover later)
  return buildStraightFallback();
}

/**
 * Pre-warms or enhances an entire array of transit journey legs with road-following walking paths.
 */
export async function enhanceJourneyWithRoadWalking<T extends { 
  type: string; 
  fromCoords: [number, number]; 
  toCoords: [number, number]; 
  geometry: [number, number][]; 
  distanceMeters?: number; 
  durationMinutes?: number; 
}>(legs: T[]): Promise<T[]> {
  const enhancedLegs = await Promise.all(
    legs.map(async (leg) => {
      if (leg.type === 'walk' || leg.type === 'transfer') {
        const fromPoint: LatLngPoint = { lat: leg.fromCoords[0], lng: leg.fromCoords[1] };
        const toPoint: LatLngPoint = { lat: leg.toCoords[0], lng: leg.toCoords[1] };
        const route = await getWalkingRoute(fromPoint, toPoint, 2500);
        return {
          ...leg,
          geometry: route.coordinates,
          distanceMeters: route.distanceMeters,
          durationMinutes: route.durationMinutes
        };
      }
      return leg;
    })
  );
  return enhancedLegs;
}
