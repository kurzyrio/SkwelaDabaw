/**
 * SkwelaDabaw Saved Places & Favorite Routes Service
 * Manages commuter home/campus places and starred transit corridors with offline persistence.
 */

import { queueCloudSync } from './cloudSyncService';
import {
  readScopedJson,
  writeScopedJson,
  recordSyncDeletion,
  clearSyncDeletion,
  getCurrentStorageUid
} from './userScope';

export interface SavedPlace {
  id: string;
  type: 'home' | 'campus' | 'work' | 'custom';
  name: string;
  address?: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface FavoriteRoute {
  id: string; // Route ID or code
  name: string;
  mode: string;
  color?: string;
  origin?: string;
  destination?: string;
  starredAt: string;
}

const SAVED_PLACES_KEY = 'skweladabaw_saved_places';
const FAVORITE_ROUTES_KEY = 'skweladabaw_favorite_routes';
const RECENT_TRIPS_KEY = 'skweladabaw_recent_trips';

export interface RecentTrip {
  id: string;
  originName: string;
  originLat: number;
  originLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  date: string;
}

export function getSavedPlaces(explicitUid?: string): SavedPlace[] {
  try {
    const uid = getCurrentStorageUid(explicitUid);
    const places = readScopedJson<SavedPlace[]>(SAVED_PLACES_KEY, [], uid, true);
    if (!Array.isArray(places)) return [];
    // Sanitize legacy hardcoded default "Home (Toril)"
    const sanitized = places.filter(p => !(p.id === 'place-home' && p.name === 'Home (Toril)' && p.address?.includes('Toril')));
    if (sanitized.length !== places.length) {
      writeScopedJson(SAVED_PLACES_KEY, sanitized, uid);
    }
    return sanitized;
  } catch {
    return [];
  }
}

export function setHomePlace(name: string, address: string, lat: number, lng: number): SavedPlace[] {
  return savePlace({
    id: 'place-home',
    type: 'home',
    name,
    address,
    lat,
    lng,
    updatedAt: new Date().toISOString()
  });
}

export function savePlace(place: SavedPlace, explicitUid?: string): SavedPlace[] {
  try {
    const uid = getCurrentStorageUid(explicitUid);
    const places = getSavedPlaces(uid);
    const now = new Date().toISOString();
    const existingIdx = places.findIndex(p => p.id === place.id || (p.type === place.type && p.type !== 'custom'));
    const removedExisting = existingIdx >= 0 && places[existingIdx].id !== place.id ? places[existingIdx].id : null;
    if (existingIdx >= 0) {
      places[existingIdx] = { ...place, updatedAt: now };
    } else {
      places.push({ ...place, updatedAt: now });
    }
    if (removedExisting) {
      recordSyncDeletion('places', removedExisting, uid);
    }
    clearSyncDeletion('places', place.id, uid);
    writeScopedJson(SAVED_PLACES_KEY, places, uid);
    queueCloudSync();
    return places;
  } catch (e) {
    console.error('Error saving place:', e);
    return getSavedPlaces(explicitUid);
  }
}

export function deletePlace(id: string, explicitUid?: string): SavedPlace[] {
  try {
    const uid = getCurrentStorageUid(explicitUid);
    const places = getSavedPlaces(uid).filter(p => p.id !== id);
    recordSyncDeletion('places', id, uid);
    writeScopedJson(SAVED_PLACES_KEY, places, uid);
    queueCloudSync();
    return places;
  } catch {
    return getSavedPlaces(explicitUid);
  }
}

export function getFavoriteRoutes(explicitUid?: string): FavoriteRoute[] {
  try {
    const routes = readScopedJson<FavoriteRoute[]>(FAVORITE_ROUTES_KEY, [], explicitUid, true);
    return Array.isArray(routes) ? routes : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteRoute(
  route: { id: string; name: string; mode: string; color?: string; origin?: string; destination?: string },
  explicitUid?: string
): { isFavorite: boolean; favorites: FavoriteRoute[] } {
  try {
    const uid = getCurrentStorageUid(explicitUid);
    const favorites = getFavoriteRoutes(uid);
    const idx = favorites.findIndex(f => f.id === route.id);
    let isFavorite = false;
    if (idx >= 0) {
      favorites.splice(idx, 1);
      isFavorite = false;
      recordSyncDeletion('transit', route.id, uid);
    } else {
      clearSyncDeletion('transit', route.id, uid);
      favorites.push({
        ...route,
        starredAt: new Date().toISOString()
      });
      isFavorite = true;
    }
    writeScopedJson(FAVORITE_ROUTES_KEY, favorites, uid);
    queueCloudSync();
    return { isFavorite, favorites };
  } catch (e) {
    console.error('Error toggling favorite route:', e);
    return { isFavorite: false, favorites: getFavoriteRoutes(explicitUid) };
  }
}

export function isRouteFavorite(routeId: string, explicitUid?: string): boolean {
  const favorites = getFavoriteRoutes(explicitUid);
  return favorites.some(f => f.id === routeId);
}

export function getRecentTrips(explicitUid?: string): RecentTrip[] {
  try {
    const trips = readScopedJson<RecentTrip[]>(RECENT_TRIPS_KEY, [], explicitUid, true);
    return Array.isArray(trips) ? trips : [];
  } catch {
    return [];
  }
}

export function addRecentTrip(trip: Omit<RecentTrip, 'id' | 'date'>, explicitUid?: string): RecentTrip[] {
  try {
    const uid = getCurrentStorageUid(explicitUid);
    let trips = getRecentTrips(uid);
    // Remove duplicate
    trips = trips.filter(t => !(t.originName === trip.originName && t.destName === trip.destName));
    trips.unshift({
      ...trip,
      id: `trip-${Date.now()}`,
      date: new Date().toISOString()
    });
    // Keep top 6
    trips = trips.slice(0, 6);
    writeScopedJson(RECENT_TRIPS_KEY, trips, uid);
    return trips;
  } catch {
    return getRecentTrips(explicitUid);
  }
}
