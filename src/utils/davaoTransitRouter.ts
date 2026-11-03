/**
 * SkwelaDabaw Transit Router & LTFRB Fare Calculation Engine (High-Performance Engine)
 * 
 * Provides instant (<20ms) point-to-point journey planning for Davao City traditional jeepneys
 * and city buses with authentic route geometry, precomputed bounding boxes, and student fare rates.
 */

import { enhanceJourneyWithRoadWalking } from '../services/walkingRouteService';
import { getOfflinePedestrianRoute, loadPedestrianGraph } from '../services/pedestrianGraphService';
import { transitCacheService } from '../services/transitCacheService';

export interface LatLng {
  lat: number;
  lng: number;
  name?: string;
}

/**
 * Evaluates whether GPS coordinates fall within Davao City's operational transit boundaries.
 */
export function isInsideDavaoCity(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
         lat >= 6.85 && lat <= 7.50 &&
         lng >= 125.20 && lng <= 125.75;
}

export interface StudentFareEstimate {
  distanceKm: number;
  fareKilometers: number;
  studentFare: number;
  formatted: string;
  breakdown: string;
}

export interface JourneyLeg {
  id: string;
  type: 'walk' | 'ride' | 'transfer';
  mode?: 'traditional_jeepney' | 'dc_bus' | 'walk';
  routeId?: string;
  routeName?: string;
  routeCode?: string;
  color?: string;
  fromName: string;
  toName: string;
  fromCoords: [number, number]; // [lat, lng]
  toCoords: [number, number];   // [lat, lng]
  distanceMeters: number;
  distanceKm: number;
  durationMinutes: number;
  fare?: StudentFareEstimate;
  geometry: [number, number][]; // [lat, lng][] path
}

export interface TransitJourney {
  id: string;
  tier: 'best' | 'other';
  badges: ('direct-ride' | 'fastest' | 'cheapest' | 'least-walking')[];
  totalMinutes: number;
  walkingMinutes: number;
  ridingMinutes: number;
  totalDistanceKm: number;
  totalWalkingMeters: number;
  totalStudentFare: number;
  fareFormatted: string;
  transfersCount: number;
  legs: JourneyLeg[];
  originLabel: string;
  destinationLabel: string;
  summaryTitle: string;
}

import { DAVAO_BUS_ROUTES } from '../data/davaoBusRoutes';

export interface RawTransitRoute {
  id: string;
  mode: string;
  name: string;
  shortName: string;
  routeCode?: string;
  color?: string;
  patterns?: {
    id: string;
    direction: 'going' | 'back' | 'return' | 'unknown';
    geometry: [number, number][]; // [lng, lat] in GeoJSON
  }[];
}

export interface GeoJsonFeature {
  type: 'Feature';
  properties: {
    routeId: string;
    name: string;
    mode: string;
    direction: 'going' | 'back' | 'return' | 'unknown';
    color?: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
}

export interface TransferConnection {
  fromDist: number;
  toDist: number;
  walkM: number;
  lat: number;
  lng: number;
  toLat: number;
  toLng: number;
}

export type TransferLookupMap = Record<string, Record<string, TransferConnection[]>>;

let cachedTransferLookup: TransferLookupMap | null = null;

// Student fare formula: ₱11.00 base for first 4 km, ₱1.00 per km thereafter
export function calculateStudentFare(distanceMeters: number): StudentFareEstimate {
  const distanceKm = Math.max(0.1, distanceMeters / 1000);
  const fareKilometers = Math.max(1, Math.ceil(distanceKm));
  const extraKm = Math.max(0, fareKilometers - 4);
  const studentFare = 11.00 + extraKm * 1.00;

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    fareKilometers,
    studentFare,
    formatted: `₱${studentFare.toFixed(2)}`,
    breakdown:
      extraKm > 0
        ? `₱11.00 (first 4 km) + ₱${extraKm}.00 (${extraKm} km extra)`
        : `₱11.00 (within 4 km base)`
  };
}

// Great-circle distance between two GPS coordinates (meters)
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distinct route palette for Davao jeepney lines
const ROUTE_PALETTE = [
  '#E11D48', '#2563EB', '#059669', '#D97706', '#7C3AED', 
  '#0891B2', '#EA580C', '#4F46E5', '#16A34A', '#DB2777'
];

function getRouteColor(routeId: string, index = 0): string {
  let hash = 0;
  for (let i = 0; i < routeId.length; i++) {
    hash = (hash << 5) - hash + routeId.charCodeAt(i);
  }
  const colorIdx = Math.abs(hash + index) % ROUTE_PALETTE.length;
  return ROUTE_PALETTE[colorIdx];
}

// Primary Transit Hubs in Davao City for 1-Transfer Journeys
export const DAVAO_TRANSIT_HUBS = [
  { name: 'Roxas Night Market / Post Office', lat: 7.0705, lng: 125.6139 },
  { name: 'Bankerohan Public Market', lat: 7.0664, lng: 125.6015 },
  { name: 'Matina Crossing / McArthur Hwy', lat: 7.0542, lng: 125.5861 },
  { name: 'Gaisano Mall Bajada / Victoria Plaza', lat: 7.0815, lng: 125.6162 },
  { name: 'Agdao Public Market', lat: 7.0831, lng: 125.6262 },
  { name: 'Buhangin Milan Junction', lat: 7.1085, lng: 125.6145 },
  { name: 'Ulas / Bangkal Junction', lat: 7.0601, lng: 125.5562 },
  { name: 'Mintal Highway Junction', lat: 7.0945, lng: 125.5342 },
  { name: 'Sasa Wharf / Km 10', lat: 7.1264, lng: 125.6601 },
  { name: 'C.M. Recto / Claveria', lat: 7.0734, lng: 125.6128 }
];

export interface SnappedPoint {
  index: number;
  lat: number;
  lng: number;
  distanceMeters: number;
  distanceAlongRouteMeters: number;
}

export interface PrecomputedPattern {
  feature: GeoJsonFeature;
  coords: [number, number][]; // [lat, lng]
  routeInfo?: RawTransitRoute;
  totalDistance: number;
  distAlongSegments: number[];
  bbox: [number, number, number, number]; // [minLat, maxLat, minLng, maxLng]
}

/**
 * First-Road-Contact Snapping:
 * For boarding ('board'): Finds the earliest upstream intersection where the commuter's egress
 * road contacts the transit corridor, eliminating parallel walking along roads where the vehicle runs.
 * For alighting ('alight'): Finds the latest downstream point along the transit corridor closest
 * to destination, ensuring the vehicle carries the commuter as close as possible before walking.
 */
/**
 * Retrieves all geometric snap candidates along a route pattern within maxDistanceMeters.
 */
export function getAllCandidateSnaps(
  point: { lat: number; lng: number },
  pattern: PrecomputedPattern,
  maxDistanceMeters = 800
): SnappedPoint[] {
  const [minLat, maxLat, minLng, maxLng] = pattern.bbox;
  const degThreshold = maxDistanceMeters / 110000;

  // Immediate bounding box reject: zero math loop overhead
  if (
    point.lat < minLat - degThreshold ||
    point.lat > maxLat + degThreshold ||
    point.lng < minLng - degThreshold ||
    point.lng > maxLng + degThreshold
  ) {
    return [];
  }

  const coords = pattern.coords;
  const candidates: SnappedPoint[] = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];

    const dx = p2[1] - p1[1];
    const dy = p2[0] - p1[0];
    const segLengthSq = dx * dx + dy * dy;

    let t = 0;
    if (segLengthSq > 0) {
      t = Math.max(0, Math.min(1, ((point.lng - p1[1]) * dx + (point.lat - p1[0]) * dy) / segLengthSq));
    }

    const projLat = p1[0] + t * dy;
    const projLng = p1[1] + t * dx;
    const dist = haversineDistance(point.lat, point.lng, projLat, projLng);

    if (dist <= maxDistanceMeters) {
      const distAlong =
        pattern.distAlongSegments[i] +
        t * (pattern.distAlongSegments[i + 1] - pattern.distAlongSegments[i]);
      candidates.push({
        index: i,
        lat: projLat,
        lng: projLng,
        distanceMeters: dist,
        distanceAlongRouteMeters: distAlong
      });
    }
  }

  return candidates;
}

/**
 * Clusters dense consecutive candidate snap points along a polyline to preserve only
 * distinct road intersections/access corridors (eliminating redundant highway samples).
 */
export function clusterCandidateSnaps(snaps: SnappedPoint[], minSeparationIndices = 6): SnappedPoint[] {
  if (snaps.length <= 1) return snaps;
  const sorted = [...snaps].sort((a, b) => a.index - b.index);
  const clusters: SnappedPoint[] = [];

  for (const s of sorted) {
    const existing = clusters.find(c => Math.abs(c.index - s.index) < minSeparationIndices);
    if (!existing) {
      clusters.push({ ...s });
    } else if (s.distanceMeters < existing.distanceMeters) {
      existing.index = s.index;
      existing.lat = s.lat;
      existing.lng = s.lng;
      existing.distanceMeters = s.distanceMeters;
      existing.distanceAlongRouteMeters = s.distanceAlongRouteMeters;
    }
  }

  return clusters;
}

/**
 * First-Road-Contact Snapping:
 * Prioritizes the absolute minimum pedestrian walking distance to the route corridor,
 * ensuring commuters are routed directly to the closest road intersection rather than
 * being forced to walk kilometers upstream/downstream along the transit line.
 */
export function findFirstContactSnap(
  point: { lat: number; lng: number },
  pattern: PrecomputedPattern,
  maxDistanceMeters = 800,
  mode: 'board' | 'alight' = 'board'
): SnappedPoint | null {
  const rawCandidates = getAllCandidateSnaps(point, pattern, maxDistanceMeters);
  if (rawCandidates.length === 0) return null;
  const candidates = clusterCandidateSnaps(rawCandidates);
  if (candidates.length === 1) return candidates[0];

  // Pick optimal contact point: walking distance is overwhelmingly dominant
  let best = candidates[0];
  let bestScore = mode === 'board'
    ? (best.distanceMeters * 1000 + best.distanceAlongRouteMeters * 0.01)
    : (best.distanceMeters * 1000 - best.distanceAlongRouteMeters * 0.01);

  for (let c = 1; c < candidates.length; c++) {
    const item = candidates[c];
    const score = mode === 'board'
      ? (item.distanceMeters * 1000 + item.distanceAlongRouteMeters * 0.01)
      : (item.distanceMeters * 1000 - item.distanceAlongRouteMeters * 0.01);

    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

export interface DirectRideMatch {
  snapOrigin: SnappedPoint;
  snapDest: SnappedPoint;
  rideDistMeters: number;
  rideGeometry: [number, number][];
  walkOriginGeometry?: [number, number][];
  walkDestGeometry?: [number, number][];
}

/**
 * Finds the optimal direct journey boarding and alighting pair along a transit route pattern.
 * Uses real pedestrian street graph distances so commuters board at the exact road exit junction
 * rather than walking along highways parallel to the vehicle corridor.
 * Strictly prevents fake loop-wrapping to eliminate diagonal straight-line artifacts.
 */
export function findOptimalDirectRide(
  origin: LatLng,
  destination: LatLng,
  pattern: PrecomputedPattern,
  maxWalkMeters: number,
  originTree?: any,
  destTree?: any,
  pedestrianGraph?: any,
  walkCache?: {
    origin: Map<string, { distance: number; coords: [number, number][] }>;
    dest: Map<string, { distance: number; coords: [number, number][] }>;
  }
): DirectRideMatch | null {
  const rawOriginCandidates = getAllCandidateSnaps(origin, pattern, maxWalkMeters);
  if (rawOriginCandidates.length === 0) return null;

  const rawDestCandidates = getAllCandidateSnaps(destination, pattern, maxWalkMeters);
  if (rawDestCandidates.length === 0) return null;

  const originCandidates = clusterCandidateSnaps(rawOriginCandidates);
  const destCandidates = clusterCandidateSnaps(rawDestCandidates);

  // Evaluate true street walking distances for candidate boarding points
  for (const b of originCandidates) {
    const key = `${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
    const cached = walkCache?.origin.get(key);
    if (cached) {
      b.distanceMeters = cached.distance;
    } else if (originTree && pedestrianGraph) {
      try {
        const bSnap = pedestrianGraph.snap({ latitude: b.lat, longitude: b.lng });
        const r = bSnap ? originTree.routeTo(bSnap) : null;
        if (r && Number.isFinite(r.distanceMeters)) {
          const coords: [number, number][] = r.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
          b.distanceMeters = r.distanceMeters;
          walkCache?.origin.set(key, { distance: r.distanceMeters, coords });
        } else {
          b.distanceMeters = haversineDistance(origin.lat, origin.lng, b.lat, b.lng);
          walkCache?.origin.set(key, { distance: b.distanceMeters, coords: [[origin.lat, origin.lng], [b.lat, b.lng]] });
        }
      } catch {
        b.distanceMeters = haversineDistance(origin.lat, origin.lng, b.lat, b.lng);
      }
    }
  }

  // Evaluate true street walking distances for candidate alighting points
  for (const a of destCandidates) {
    const key = `${a.lat.toFixed(5)},${a.lng.toFixed(5)}`;
    const cached = walkCache?.dest.get(key);
    if (cached) {
      a.distanceMeters = cached.distance;
    } else if (destTree && pedestrianGraph) {
      try {
        const aSnap = pedestrianGraph.snap({ latitude: a.lat, longitude: a.lng });
        const r = aSnap ? destTree.routeTo(aSnap) : null;
        if (r && Number.isFinite(r.distanceMeters)) {
          const coords: [number, number][] = r.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]).reverse();
          a.distanceMeters = r.distanceMeters;
          walkCache?.dest.set(key, { distance: r.distanceMeters, coords });
        } else {
          a.distanceMeters = haversineDistance(destination.lat, destination.lng, a.lat, a.lng);
          walkCache?.dest.set(key, { distance: a.distanceMeters, coords: [[a.lat, a.lng], [destination.lat, destination.lng]] });
        }
      } catch {
        a.distanceMeters = haversineDistance(destination.lat, destination.lng, a.lat, a.lng);
      }
    }
  }

  const startEndDist = haversineDistance(
    pattern.coords[0][0], pattern.coords[0][1],
    pattern.coords[pattern.coords.length - 1][0], pattern.coords[pattern.coords.length - 1][1]
  );
  // Strictly only true closed loops (where terminus connects back to start within 300 meters)
  const isTrueCircularLoop = startEndDist < 300;

  let bestMatch: DirectRideMatch | null = null;
  let bestScore = Infinity;

  for (const b of originCandidates) {
    for (const a of destCandidates) {
      let rideDist = 0;
      let rideGeo: [number, number][] | null = null;

      if (a.distanceAlongRouteMeters >= b.distanceAlongRouteMeters + 250 && b.index <= a.index) {
        rideDist = a.distanceAlongRouteMeters - b.distanceAlongRouteMeters;
        rideGeo = [
          [b.lat, b.lng],
          ...pattern.coords.slice(b.index + 1, a.index + 1),
          [a.lat, a.lng]
        ];
      } else if (isTrueCircularLoop && b.index > a.index) {
        rideDist = (pattern.totalDistance - b.distanceAlongRouteMeters) + a.distanceAlongRouteMeters;
        if (rideDist >= 300 && rideDist <= pattern.totalDistance) {
          rideGeo = [
            [b.lat, b.lng],
            ...pattern.coords.slice(b.index + 1),
            ...pattern.coords.slice(0, a.index + 1),
            [a.lat, a.lng]
          ];
        }
      }

      if (!rideGeo || rideDist <= 0) continue;

      // Primary objective: minimize actual walking distance. Tie breaker: directness of ride
      const totalWalk = b.distanceMeters + a.distanceMeters;
      const score = totalWalk * 1000 + (rideDist * 0.05);

      if (score < bestScore) {
        bestScore = score;
        const bKey = `${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
        const aKey = `${a.lat.toFixed(5)},${a.lng.toFixed(5)}`;
        bestMatch = {
          snapOrigin: b,
          snapDest: a,
          rideDistMeters: rideDist,
          rideGeometry: rideGeo,
          walkOriginGeometry: walkCache?.origin.get(bKey)?.coords,
          walkDestGeometry: walkCache?.dest.get(aKey)?.coords
        };
      }
    }
  }

  return bestMatch;
}

// Retain legacy fastSnap as an alias for general coordinate projection
function fastSnap(
  point: { lat: number; lng: number },
  pattern: PrecomputedPattern,
  maxDistanceMeters = 800
): SnappedPoint | null {
  return findFirstContactSnap(point, pattern, maxDistanceMeters, 'board');
}

let cachedFeatures: GeoJsonFeature[] | null = null;
let cachedRoutes: RawTransitRoute[] | null = null;
let cachedPatterns: PrecomputedPattern[] | null = null;

function getTransitAssetUrl(relPath: string): string {
  const clean = relPath.startsWith('/') ? relPath.slice(1) : relPath;
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
    ? import.meta.env.BASE_URL
    : '/';
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${prefix}${clean}`;
}

async function fetchTransitAsset(path: string): Promise<Response> {
  const primaryUrl = getTransitAssetUrl(path);
  const fallbackUrl = path.startsWith('/') ? path : `/${path}`;

  return transitCacheService.getTransitAssetWithCache(primaryUrl, async (targetUrl) => {
    try {
      const res = await fetch(targetUrl);
      if (res && res.ok) return res;
    } catch (_) {}
    return fetch(fallbackUrl);
  });
}

export async function loadTransitData(): Promise<{
  features: GeoJsonFeature[];
  routes: RawTransitRoute[];
  patterns: PrecomputedPattern[];
}> {
  if (cachedFeatures && cachedRoutes && cachedPatterns) {
    return { features: cachedFeatures, routes: cachedRoutes, patterns: cachedPatterns };
  }

  try {
    const [geojsonRes, routesRes, busRes, roadMatchedRes, transferLookupRes] = await Promise.all([
      fetchTransitAsset('/data/transport/davao-routes.geojson'),
      fetchTransitAsset('/data/transport/davao-routes.json'),
      fetchTransitAsset('/data/davaoBusRoutes.json').catch(() => null),
      fetchTransitAsset('/data/transport/davao-road-matched-patterns.json').catch(() => null),
      fetchTransitAsset('/data/transport/davao-transfer-lookup.json').catch(() => null)
    ]);

    const geojsonData = await geojsonRes.json();
    const routesData = await routesRes.json();
    let roadMatchedEntries: Record<string, { key: string; coordinates: [number, number][] }> = {};

    if (transferLookupRes && transferLookupRes.ok) {
      try {
        cachedTransferLookup = await transferLookupRes.json();
      } catch (tlErr) {
        console.warn('[DavaoTransitRouter] Transfer lookup parse warning:', tlErr);
      }
    }

    if (roadMatchedRes && roadMatchedRes.ok) {
      try {
        const rmData = await roadMatchedRes.json();
        if (rmData && rmData.entries) {
          roadMatchedEntries = rmData.entries;
        }
      } catch (rmErr) {
        console.warn('[DavaoTransitRouter] Road-matched patterns parse warning:', rmErr);
      }
    }

    const rawJeepFeatures = (geojsonData.features || []) as GeoJsonFeature[];
    const jeepFeatures = rawJeepFeatures.map(f => {
      const patternKey = `${f.properties.routeId}-pattern-${f.properties.direction}`;
      const matched = roadMatchedEntries[patternKey];
      if (matched && Array.isArray(matched.coordinates) && matched.coordinates.length >= 2) {
        return {
          ...f,
          geometry: {
            ...f.geometry,
            coordinates: matched.coordinates
          }
        };
      }
      return f;
    });

    const busFeatures: GeoJsonFeature[] = [];

    if (busRes && busRes.ok) {
      try {
        const busData = await busRes.json();
        if (busData && Array.isArray(busData.features)) {
          for (const bf of busData.features) {
            if (bf.properties?.kind === 'line' && bf.geometry?.coordinates?.length >= 2) {
              const rCode = bf.properties.route || 'DC Bus';
              const rMeta = (DAVAO_BUS_ROUTES as Record<string, any>)[rCode];
              busFeatures.push({
                type: 'Feature',
                properties: {
                  routeId: bf.properties.fullCode || rCode,
                  name: rMeta?.name ? `DC Bus ${rMeta.name}` : `DC Bus ${rCode}`,
                  mode: 'dc_bus',
                  direction: (bf.properties.shift === 'PM' ? 'back' : 'going') as any,
                  color: rMeta?.color || '#2563EB'
                },
                geometry: bf.geometry
              });
            }
          }
        }
      } catch (busErr) {
        console.warn('[DavaoTransitRouter] DC Bus routes parse warning:', busErr);
      }
    }

    cachedFeatures = [...jeepFeatures, ...busFeatures];
    cachedRoutes = Array.isArray(routesData) ? routesData : [];

    const routeMap = new Map<string, RawTransitRoute>();
    cachedRoutes.forEach(r => routeMap.set(r.id, r));

    // Pre-calculate coordinate conversions, segment distances, and bounding boxes ONCE
    cachedPatterns = cachedFeatures
      .filter(f => f.geometry?.coordinates?.length >= 2)
      .map(f => {
        const coords: [number, number][] = f.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        let cumulative = 0;
        const distAlongSegments: number[] = [0];

        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = coords[i];
          const p2 = coords[i + 1];
          if (p1[0] < minLat) minLat = p1[0];
          if (p1[0] > maxLat) maxLat = p1[0];
          if (p1[1] < minLng) minLng = p1[1];
          if (p1[1] > maxLng) maxLng = p1[1];

          const segLen = haversineDistance(p1[0], p1[1], p2[0], p2[1]);
          cumulative += segLen;
          distAlongSegments.push(cumulative);
        }

        const last = coords[coords.length - 1];
        if (last[0] < minLat) minLat = last[0];
        if (last[0] > maxLat) maxLat = last[0];
        if (last[1] < minLng) minLng = last[1];
        if (last[1] > maxLng) maxLng = last[1];

        return {
          feature: f,
          coords,
          routeInfo: routeMap.get(f.properties.routeId),
          totalDistance: cumulative,
          distAlongSegments,
          bbox: [minLat, maxLat, minLng, maxLng]
        };
      });

    return { features: cachedFeatures, routes: cachedRoutes, patterns: cachedPatterns };
  } catch (err) {
    console.error('[DavaoTransitRouter] Error loading transit data:', err);
    return { features: [], routes: [], patterns: [] };
  }
}

/**
 * High-Performance Multi-Tier Transit Journey Planner (<20ms).
 * Evaluates both direct (0-transfer) and 1-transfer routes using multi-tier walk buffers.
 */
export async function planTransitJourneys(
  origin: LatLng,
  destination: LatLng
): Promise<TransitJourney[]> {
  // Guard against invalid coordinates or out-of-bounds locations outside Davao City
  if (!isInsideDavaoCity(origin.lat, origin.lng) || !isInsideDavaoCity(destination.lat, destination.lng)) {
    return [];
  }

  const { patterns } = await loadTransitData();
  if (!patterns.length) return [];

  // Pre-initialize offline pedestrian graph search trees once for instant street routing
  const pedestrianGraph = await loadPedestrianGraph();
  const originSnap = pedestrianGraph?.snap({ latitude: origin.lat, longitude: origin.lng });
  const originTree = (originSnap && pedestrianGraph) ? pedestrianGraph.createSearchTree(originSnap) : null;
  const destSnap = pedestrianGraph?.snap({ latitude: destination.lat, longitude: destination.lng });
  const destTree = (destSnap && pedestrianGraph) ? pedestrianGraph.createSearchTree(destSnap) : null;

  const walkCache = {
    origin: new Map<string, { distance: number; coords: [number, number][] }>(),
    dest: new Map<string, { distance: number; coords: [number, number][] }>()
  };

  const directWalkDist = haversineDistance(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  const directWalkMinutes = Math.round(directWalkDist / 75);
  const candidates: TransitJourney[] = [];

  // If destination is close (< 650m), provide direct walk option
  if (directWalkDist <= 650) {
    let walkGeo: [number, number][] = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng]
    ];
    if (originTree && destSnap) {
      try {
        const r = originTree.routeTo(destSnap);
        if (r && Array.isArray(r.coordinates) && r.coordinates.length >= 2) {
          walkGeo = r.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
        }
      } catch {}
    }

    candidates.push({
      id: 'walk-direct',
      tier: 'best',
      badges: ['least-walking', 'cheapest', 'fastest'],
      totalMinutes: Math.max(2, directWalkMinutes),
      walkingMinutes: Math.max(2, directWalkMinutes),
      ridingMinutes: 0,
      totalDistanceKm: Math.round((directWalkDist / 1000) * 10) / 10,
      totalWalkingMeters: Math.round(directWalkDist),
      totalStudentFare: 0,
      fareFormatted: 'Free (Walking)',
      transfersCount: 0,
      originLabel: origin.name || 'Your location',
      destinationLabel: destination.name || 'Destination',
      summaryTitle: 'Direct Walk',
      legs: [
        {
          id: 'walk-leg-1',
          type: 'walk',
          mode: 'walk',
          fromName: origin.name || 'Your location',
          toName: destination.name || 'Destination',
          fromCoords: [origin.lat, origin.lng],
          toCoords: [destination.lat, destination.lng],
          distanceMeters: Math.round(directWalkDist),
          distanceKm: Math.round((directWalkDist / 1000) * 10) / 10,
          durationMinutes: Math.max(2, directWalkMinutes),
          geometry: walkGeo
        }
      ]
    });
  }

  // Multi-tier walk snapping: Tier 1 (500m nearby), Tier 2 (900m standard), Tier 3 (1400m wide)
  const SNAP_TIERS = [500, 900, 1400];
  const seenRouteIds = new Set<string>();

  for (const snapTier of SNAP_TIERS) {
    let pIdx = 0;
    for (const item of patterns) {
      pIdx++;
      if (pIdx % 14 === 0) {
        // Yield to browser event loop to prevent mobile CPU spikes and frame drops
        await new Promise(r => setTimeout(r, 0));
      }

      // Optimal direct ride search: evaluates all candidate pairs and minimizes total pedestrian walk
      const directMatch = findOptimalDirectRide(
        origin,
        destination,
        item,
        snapTier,
        originTree,
        destTree,
        pedestrianGraph,
        walkCache
      );
      if (!directMatch) continue;

      const routeId = item.feature.properties.routeId;
      const direction = item.feature.properties.direction;
      const routeKey = `${routeId}-${direction}`;
      if (seenRouteIds.has(routeKey)) continue;

      const { snapOrigin, snapDest, rideDistMeters, rideGeometry, walkOriginGeometry, walkDestGeometry } = directMatch;

      const walkMeters = snapOrigin.distanceMeters + snapDest.distanceMeters;
      if (walkMeters > directWalkDist && directWalkDist < 750) continue;

      seenRouteIds.add(routeKey);

      const isBus = item.feature.properties.mode === 'dc_bus';
      const fare = calculateStudentFare(rideDistMeters);
      const speedMpm = isBus ? 350 : 280;
      const rideMins = Math.max(3, Math.round(rideDistMeters / speedMpm));
      const walkMins = Math.max(1, Math.round(walkMeters / 75));
      const totalMins = rideMins + walkMins + (isBus ? 5 : 3);
      const routeColor = item.feature.properties.color || getRouteColor(routeId);

      const routeName = item.feature.properties.name || item.routeInfo?.name || (isBus ? `DC Bus ${routeId}` : 'Davao Jeep');
      const routeCode = isBus 
        ? (item.feature.properties.routeId || 'DC Bus')
        : (item.routeInfo?.shortName || item.routeInfo?.routeCode || routeName);

      const isLongWalkToPickup = snapOrigin.distanceMeters > 500;
      const pickupTitle = isLongWalkToPickup
        ? `Suggested pickup point (${routeCode} • Walk or ride a Trike / Bao-Bao)`
        : `Suggested pickup point (${routeCode})`;

      const legs: JourneyLeg[] = [
        {
          id: `walk-to-board-${routeKey}`,
          type: 'walk',
          mode: 'walk',
          fromName: origin.name || 'My current location',
          toName: pickupTitle,
          fromCoords: [origin.lat, origin.lng],
          toCoords: [snapOrigin.lat, snapOrigin.lng],
          distanceMeters: Math.round(snapOrigin.distanceMeters),
          distanceKm: Math.round((snapOrigin.distanceMeters / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(snapOrigin.distanceMeters / 75)),
          geometry: walkOriginGeometry && walkOriginGeometry.length >= 2
            ? walkOriginGeometry
            : [
                [origin.lat, origin.lng],
                [snapOrigin.lat, snapOrigin.lng]
              ]
        },
        {
          id: `ride-${routeKey}`,
          type: 'ride',
          mode: isBus ? 'dc_bus' : 'traditional_jeepney',
          routeId,
          routeName,
          routeCode,
          color: routeColor,
          fromName: `Suggested pickup point (${Math.round(snapOrigin.distanceMeters)}m walk)`,
          toName: `Suggested drop-off point (${Math.round(snapDest.distanceMeters)}m to dest)`,
          fromCoords: [snapOrigin.lat, snapOrigin.lng],
          toCoords: [snapDest.lat, snapDest.lng],
          distanceMeters: Math.round(rideDistMeters),
          distanceKm: fare.distanceKm,
          durationMinutes: rideMins,
          fare,
          geometry: rideGeometry
        },
        {
          id: `walk-to-dest-${routeKey}`,
          type: 'walk',
          mode: 'walk',
          fromName: `Suggested drop-off point`,
          toName: destination.name || 'Destination',
          fromCoords: [snapDest.lat, snapDest.lng],
          toCoords: [destination.lat, destination.lng],
          distanceMeters: Math.round(snapDest.distanceMeters),
          distanceKm: Math.round((snapDest.distanceMeters / 1000) * 10) / 10,
          durationMinutes: Math.max(1, Math.round(snapDest.distanceMeters / 75)),
          geometry: walkDestGeometry && walkDestGeometry.length >= 2
            ? walkDestGeometry
            : [
                [snapDest.lat, snapDest.lng],
                [destination.lat, destination.lng]
              ]
        }
      ];

      candidates.push({
        id: `direct-${routeKey}`,
        tier: 'best',
        badges: [],
        totalMinutes: totalMins,
        walkingMinutes: walkMins,
        ridingMinutes: rideMins,
        totalDistanceKm: Math.round(((rideDistMeters + walkMeters) / 1000) * 10) / 10,
        totalWalkingMeters: Math.round(walkMeters),
        totalStudentFare: fare.studentFare,
        fareFormatted: fare.formatted,
        transfersCount: 0,
        originLabel: origin.name || 'My current location',
        destinationLabel: destination.name || 'Destination',
        summaryTitle: routeCode && routeName && routeCode.trim().toLowerCase() !== routeName.trim().toLowerCase() 
          ? `${routeCode} • ${routeName}` 
          : (routeCode || routeName || 'Transit Ride'),
        legs
      });

      if (candidates.length >= 12) break;
    }
    if (candidates.length >= 10) break;
  }

  // 2. High-Precision 1-Transfer Dual Route Search (Destination-First Proximity)
  if (cachedTransferLookup && directWalkDist > 650) {
    const originMatches: { pattern: PrecomputedPattern; patternKey: string; snapO: SnappedPoint }[] = [];
    const destMatches: { pattern: PrecomputedPattern; patternKey: string; snapD: SnappedPoint }[] = [];

    // Search buffer: 600m nearby, expanding to 950m for distant trips
    const walkBuffer = directWalkDist > 3000 ? 950 : 650;

    for (const item of patterns) {
      const pKey = `${item.feature.properties.routeId}-pattern-${item.feature.properties.direction}`;
      const sO = findFirstContactSnap(origin, item, walkBuffer, 'board');
      if (sO) {
        originMatches.push({ pattern: item, patternKey: pKey, snapO: sO });
      }

      const sD = findFirstContactSnap(destination, item, walkBuffer, 'alight');
      if (sD) {
        destMatches.push({ pattern: item, patternKey: pKey, snapD: sD });
      }
    }

    // Crucial Bug Fix: Sort destMatches so routes dropping off closest to Destination are prioritized first
    destMatches.sort((a, b) => a.snapD.distanceMeters - b.snapD.distanceMeters);

    const transferCandidates: { journey: TransitJourney; score: number }[] = [];
    const seenTransferPairs = new Set<string>();

    for (const mD of destMatches) {
      const pKey2 = mD.patternKey;
      const rId2 = mD.pattern.feature.properties.routeId;

      for (const mO of originMatches) {
        const pKey1 = mO.patternKey;
        const rId1 = mO.pattern.feature.properties.routeId;

        // Skip same route or already evaluated route pair
        if (rId1 === rId2) continue;
        const pairKey = `${rId1}->${rId2}`;
        if (seenTransferPairs.has(pairKey)) continue;

        // Query authentic transfer junctions between Pattern 1 and Pattern 2
        const connections = cachedTransferLookup[pKey1]?.[pKey2];
        if (!connections || connections.length === 0) continue;

        // Find the optimal transfer junction along the travel vector
        let bestConn: TransferConnection | null = null;
        let bestConnScore = Infinity;

        for (const conn of connections) {
          // Commuter must ride Pattern 1 FORWARD to the transfer point
          if (conn.fromDist < mO.snapO.distanceAlongRouteMeters + 300) continue;

          // Commuter must ride Pattern 2 FORWARD from transfer point to destination
          if (mD.snapD.distanceAlongRouteMeters < conn.toDist + 300) continue;

          // Transfer walk between junctions must be reasonable (<= 450m)
          if (conn.walkM > 450) continue;

          const totalWalk = mO.snapO.distanceMeters + conn.walkM + mD.snapD.distanceMeters;
          const r1Dist = conn.fromDist - mO.snapO.distanceAlongRouteMeters;
          const r2Dist = mD.snapD.distanceAlongRouteMeters - conn.toDist;

          // Commuter score: prioritize minimal walk at destination (1.5x) and minimal transfer walk (2.5x)
          const score = (totalWalk * 2.5) + (mD.snapD.distanceMeters * 1.5) + ((r1Dist + r2Dist) * 0.05);
          if (score < bestConnScore) {
            bestConnScore = score;
            bestConn = conn;
          }
        }

        if (!bestConn) continue;

        seenTransferPairs.add(pairKey);

        const r1Dist = bestConn.fromDist - mO.snapO.distanceAlongRouteMeters;
        const r2Dist = mD.snapD.distanceAlongRouteMeters - bestConn.toDist;
        const fare1 = calculateStudentFare(r1Dist);
        const fare2 = calculateStudentFare(r2Dist);
        const totalFare = fare1.studentFare + fare2.studentFare;

        const isBus1 = mO.pattern.feature.properties.mode === 'dc_bus';
        const isBus2 = mD.pattern.feature.properties.mode === 'dc_bus';
        const speed1 = isBus1 ? 350 : 280;
        const speed2 = isBus2 ? 350 : 280;
        const ride1Mins = Math.max(3, Math.round(r1Dist / speed1));
        const ride2Mins = Math.max(3, Math.round(r2Dist / speed2));
        const totalWalkMeters = mO.snapO.distanceMeters + bestConn.walkM + mD.snapD.distanceMeters;
        const walkMins = Math.max(2, Math.round(totalWalkMeters / 75));
        const transferWaitMins = 5;
        const totalMins = ride1Mins + ride2Mins + walkMins + transferWaitMins;

        // Walking Domination Pruning: reject if commuter would arrive faster and walk less by walking directly
        const directWalkMins = Math.round((directWalkDist * 1.3) / 75);
        const timeSaved = directWalkMins - totalMins;
        const walkSaved = (directWalkDist * 1.3) - totalWalkMeters;
        if (timeSaved <= 0 && walkSaved <= 0 && directWalkDist < 1800) {
          continue;
        }

        const routeCode1 = isBus1 ? rId1 : (mO.pattern.routeInfo?.shortName || mO.pattern.routeInfo?.routeCode || mO.pattern.feature.properties.name);
        const routeCode2 = isBus2 ? rId2 : (mD.pattern.routeInfo?.shortName || mD.pattern.routeInfo?.routeCode || mD.pattern.feature.properties.name);
        const routeColor1 = mO.pattern.feature.properties.color || getRouteColor(rId1, 0);
        const routeColor2 = mD.pattern.feature.properties.color || getRouteColor(rId2, 1);

        const r1EndIdx = Math.min(
          mO.pattern.coords.length - 1,
          Math.max(mO.snapO.index + 1, Math.floor(bestConn.fromDist / (mO.pattern.totalDistance / mO.pattern.coords.length)))
        );
        const r2StartIdx = Math.min(
          mD.snapD.index,
          Math.max(0, Math.floor(bestConn.toDist / (mD.pattern.totalDistance / mD.pattern.coords.length)))
        );

        const rideGeo1: [number, number][] = [
          [mO.snapO.lat, mO.snapO.lng],
          ...mO.pattern.coords.slice(mO.snapO.index + 1, r1EndIdx + 1),
          [bestConn.lat, bestConn.lng]
        ];

        const rideGeo2: [number, number][] = [
          [bestConn.toLat, bestConn.toLng],
          ...mD.pattern.coords.slice(r2StartIdx + 1, mD.snapD.index + 1),
          [mD.snapD.lat, mD.snapD.lng]
        ];

        const oKey = `${mO.snapO.lat.toFixed(5)},${mO.snapO.lng.toFixed(5)}`;
        const dKey = `${mD.snapD.lat.toFixed(5)},${mD.snapD.lng.toFixed(5)}`;
        const walkO = walkCache?.origin.get(oKey)?.coords;
        const walkD = walkCache?.dest.get(dKey)?.coords;

        const legs: JourneyLeg[] = [
          {
            id: `walk-to-board-1`,
            type: 'walk',
            mode: 'walk',
            fromName: origin.name || 'My current location',
            toName: `Suggested pickup point (${routeCode1})`,
            fromCoords: [origin.lat, origin.lng],
            toCoords: [mO.snapO.lat, mO.snapO.lng],
            distanceMeters: Math.round(mO.snapO.distanceMeters),
            distanceKm: Math.round((mO.snapO.distanceMeters / 1000) * 10) / 10,
            durationMinutes: Math.max(1, Math.round(mO.snapO.distanceMeters / 75)),
            geometry: walkO && walkO.length >= 2 ? walkO : [[origin.lat, origin.lng], [mO.snapO.lat, mO.snapO.lng]]
          },
          {
            id: `ride-1`,
            type: 'ride',
            mode: isBus1 ? 'dc_bus' : 'traditional_jeepney',
            routeId: rId1,
            routeName: mO.pattern.feature.properties.name,
            routeCode: routeCode1,
            color: routeColor1,
            fromName: `Board ${routeCode1}`,
            toName: `Alight at Transfer Point (${Math.round(bestConn.walkM)}m transfer)`,
            fromCoords: [mO.snapO.lat, mO.snapO.lng],
            toCoords: [bestConn.lat, bestConn.lng],
            distanceMeters: Math.round(r1Dist),
            distanceKm: fare1.distanceKm,
            durationMinutes: ride1Mins,
            fare: fare1,
            geometry: rideGeo1
          },
          {
            id: `walk-transfer`,
            type: 'transfer',
            mode: 'walk',
            fromName: `Alight ${routeCode1}`,
            toName: `Board ${routeCode2}`,
            fromCoords: [bestConn.lat, bestConn.lng],
            toCoords: [bestConn.toLat, bestConn.toLng],
            distanceMeters: Math.round(bestConn.walkM),
            distanceKm: Math.round((bestConn.walkM / 1000) * 10) / 10,
            durationMinutes: Math.max(1, Math.round(bestConn.walkM / 75)),
            geometry: [
              [bestConn.lat, bestConn.lng],
              [bestConn.toLat, bestConn.toLng]
            ]
          },
          {
            id: `ride-2`,
            type: 'ride',
            mode: isBus2 ? 'dc_bus' : 'traditional_jeepney',
            routeId: rId2,
            routeName: mD.pattern.feature.properties.name,
            routeCode: routeCode2,
            color: routeColor2,
            fromName: `Board ${routeCode2}`,
            toName: `Alight near ${destination.name || 'Destination'} (${Math.round(mD.snapD.distanceMeters)}m walk)`,
            fromCoords: [bestConn.toLat, bestConn.toLng],
            toCoords: [mD.snapD.lat, mD.snapD.lng],
            distanceMeters: Math.round(r2Dist),
            distanceKm: fare2.distanceKm,
            durationMinutes: ride2Mins,
            fare: fare2,
            geometry: rideGeo2
          },
          {
            id: `walk-to-dest-2`,
            type: 'walk',
            mode: 'walk',
            fromName: `Alight ${routeCode2}`,
            toName: destination.name || 'Destination',
            fromCoords: [mD.snapD.lat, mD.snapD.lng],
            toCoords: [destination.lat, destination.lng],
            distanceMeters: Math.round(mD.snapD.distanceMeters),
            distanceKm: Math.round((mD.snapD.distanceMeters / 1000) * 10) / 10,
            durationMinutes: Math.max(1, Math.round(mD.snapD.distanceMeters / 75)),
            geometry: walkD && walkD.length >= 2 ? walkD : [[mD.snapD.lat, mD.snapD.lng], [destination.lat, destination.lng]]
          }
        ];

        const generalizedScore = totalMins + (walkMins * 2.5) + (mD.snapD.distanceMeters * 0.05);

        transferCandidates.push({
          journey: {
            id: `transfer-${rId1}-${rId2}`,
            tier: 'other',
            badges: [],
            totalMinutes: totalMins,
            walkingMinutes: walkMins,
            ridingMinutes: ride1Mins + ride2Mins,
            totalDistanceKm: Math.round(((r1Dist + r2Dist + totalWalkMeters) / 1000) * 10) / 10,
            totalWalkingMeters: Math.round(totalWalkMeters),
            totalStudentFare: totalFare,
            fareFormatted: `₱${totalFare.toFixed(2)}`,
            transfersCount: 1,
            originLabel: origin.name || 'My current location',
            destinationLabel: destination.name || 'Destination',
            summaryTitle: `Ride ${routeCode1} → Transfer ${routeCode2}`,
            legs
          },
          score: generalizedScore
        });

        if (transferCandidates.length >= 10) break;
      }
      if (transferCandidates.length >= 10) break;
    }

    // Sort transfer candidates by generalized score (least walking & most convenient first)
    transferCandidates.sort((a, b) => a.score - b.score);
    candidates.push(...transferCandidates.slice(0, 4).map(tc => tc.journey));
  }

  // De-duplicate candidates: keep only the best option per distinct route line
  const uniqueCandidateMap = new Map<string, TransitJourney>();
  for (const c of candidates) {
    const normTitle = (c.summaryTitle || c.id)
      .toLowerCase()
      .replace(/\s*\(\d+m\)/g, '')
      .trim();
    const key = `${c.transfersCount}-${normTitle}`;
    const existing = uniqueCandidateMap.get(key);
    if (!existing || c.totalMinutes < existing.totalMinutes || (c.totalMinutes === existing.totalMinutes && c.totalWalkingMeters < existing.totalWalkingMeters)) {
      uniqueCandidateMap.set(key, c);
    }
  }

  const deduplicatedCandidates = Array.from(uniqueCandidateMap.values());

  // Assign badges & Sort: direct rides first, then least total minutes
  deduplicatedCandidates.sort((a, b) => {
    if (a.transfersCount !== b.transfersCount) {
      return a.transfersCount - b.transfersCount;
    }
    return a.totalMinutes - b.totalMinutes;
  });

  if (deduplicatedCandidates.length > 0) {
    // Find fastest & cheapest among candidates
    const minMins = Math.min(...deduplicatedCandidates.map(c => c.totalMinutes));
    const minFare = Math.min(...deduplicatedCandidates.map(c => c.totalStudentFare));
    const minWalk = Math.min(...deduplicatedCandidates.map(c => c.totalWalkingMeters));

    deduplicatedCandidates.forEach(c => {
      if (c.totalMinutes === minMins && !c.badges.includes('fastest')) c.badges.push('fastest');
      if (c.totalStudentFare === minFare && !c.badges.includes('cheapest')) c.badges.push('cheapest');
      if (c.totalWalkingMeters === minWalk && !c.badges.includes('least-walking')) c.badges.push('least-walking');
    });
  }

  // Select top candidate options
  const topCandidates = deduplicatedCandidates.slice(0, 6);

  try {
    for (const candidate of topCandidates) {
      // Only enhance walking legs that lack authentic multi-point pedestrian coordinates
      const unenhancedLegs = candidate.legs.filter(l => (l.type === 'walk' || l.type === 'transfer') && l.geometry.length <= 2);
      if (unenhancedLegs.length > 0) {
        candidate.legs = await enhanceJourneyWithRoadWalking(candidate.legs);
        const walkingLegs = candidate.legs.filter(l => l.type === 'walk' || l.type === 'transfer');
        const totalWalkMeters = walkingLegs.reduce((sum, l) => sum + (l.distanceMeters || 0), 0);
        const totalWalkMinutes = walkingLegs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
        candidate.totalWalkingMeters = totalWalkMeters;
        candidate.walkingMinutes = totalWalkMinutes;
        candidate.totalMinutes = totalWalkMinutes + candidate.ridingMinutes;
      }
    }
  } catch (enhanceErr) {
    console.warn('[davaoTransitRouter] Walking road enhancement skipped:', enhanceErr);
  }

  return topCandidates;
}
