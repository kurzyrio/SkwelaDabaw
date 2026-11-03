/**
 * SkwelaDabaw Saved Places & Favorite Routes Service
 * Manages commuter home/campus places and starred transit corridors with offline persistence.
 */

import { queueCloudSync } from './cloudSyncService';

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

// User-defined saved places (No hardcoded presets)
const DEFAULT_SAVED_PLACES: SavedPlace[] = [];

export function getSavedPlaces(): SavedPlace[] {
  try {
    const raw = localStorage.getItem(SAVED_PLACES_KEY);
    if (!raw) {
      return [];
    }
    const places: SavedPlace[] = JSON.parse(raw);
    // Sanitize legacy hardcoded default "Home (Toril)"
    const sanitized = places.filter(p => !(p.id === 'place-home' && p.name === 'Home (Toril)' && p.address?.includes('Toril')));
    if (sanitized.length !== places.length) {
      localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(sanitized));
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

export function savePlace(place: SavedPlace): SavedPlace[] {
  try {
    const places = getSavedPlaces();
    const existingIdx = places.findIndex(p => p.id === place.id || p.type === place.type && p.type !== 'custom');
    if (existingIdx >= 0) {
      places[existingIdx] = { ...place, updatedAt: new Date().toISOString() };
    } else {
      places.push({ ...place, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places));
    queueCloudSync();
    return places;
  } catch (e) {
    console.error('Error saving place:', e);
    return getSavedPlaces();
  }
}

export function deletePlace(id: string): SavedPlace[] {
  try {
    const places = getSavedPlaces().filter(p => p.id !== id);
    localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places));
    queueCloudSync();
    return places;
  } catch {
    return getSavedPlaces();
  }
}

export function getFavoriteRoutes(): FavoriteRoute[] {
  try {
    const raw = localStorage.getItem(FAVORITE_ROUTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function toggleFavoriteRoute(route: { id: string; name: string; mode: string; color?: string; origin?: string; destination?: string }): { isFavorite: boolean; favorites: FavoriteRoute[] } {
  try {
    const favorites = getFavoriteRoutes();
    const idx = favorites.findIndex(f => f.id === route.id);
    let isFavorite = false;
    if (idx >= 0) {
      favorites.splice(idx, 1);
      isFavorite = false;
    } else {
      favorites.push({
        ...route,
        starredAt: new Date().toISOString()
      });
      isFavorite = true;
    }
    localStorage.setItem(FAVORITE_ROUTES_KEY, JSON.stringify(favorites));
    queueCloudSync();
    return { isFavorite, favorites };
  } catch (e) {
    console.error('Error toggling favorite route:', e);
    return { isFavorite: false, favorites: getFavoriteRoutes() };
  }
}

export function isRouteFavorite(routeId: string): boolean {
  const favorites = getFavoriteRoutes();
  return favorites.some(f => f.id === routeId);
}

export function getRecentTrips(): RecentTrip[] {
  try {
    const raw = localStorage.getItem(RECENT_TRIPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addRecentTrip(trip: Omit<RecentTrip, 'id' | 'date'>): RecentTrip[] {
  try {
    let trips = getRecentTrips();
    // Remove duplicate
    trips = trips.filter(t => !(t.originName === trip.originName && t.destName === trip.destName));
    trips.unshift({
      ...trip,
      id: `trip-${Date.now()}`,
      date: new Date().toISOString()
    });
    // Keep top 6
    trips = trips.slice(0, 6);
    localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(trips));
    return trips;
  } catch {
    return getRecentTrips();
  }
}
