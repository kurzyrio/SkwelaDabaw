// Davao City Interim Bus Service (DIBS) Routes Metadata & Utilities
// Strictly no parentheses in route names or descriptions

import { getDibsServiceStatus, getManilaDate } from '../utils/dibsSchedule';

export interface RouteMeta {
  code: string;
  family: string;
  name: string;
  color: string;
  filterLabel: string;
}

export const DAVAO_BUS_ROUTES: Record<string, RouteMeta> = {
  R102: {
    code: 'R102',
    family: 'Toril',
    name: 'Toril – GE Torres Sandawa',
    color: '#3B82F6', // Blue
    filterLabel: 'Toril R102'
  },
  R103: {
    code: 'R103',
    family: 'Toril',
    name: 'Toril – Roxas',
    color: '#2563EB',
    filterLabel: 'Toril R103'
  },
  R402: {
    code: 'R402',
    family: 'Mintal',
    name: 'Mintal – GE Torres',
    color: '#F97316', // Orange
    filterLabel: 'Mintal R402'
  },
  R403: {
    code: 'R403',
    family: 'Mintal',
    name: 'Mintal – Roxas',
    color: '#EA580C',
    filterLabel: 'Mintal R403'
  },
  R503: {
    code: 'R503',
    family: 'Bangkal',
    name: 'Bangkal – Roxas',
    color: '#10B981', // Emerald Green
    filterLabel: 'Bangkal R503'
  },
  R603: {
    code: 'R603',
    family: 'Buhangin',
    name: 'Buhangin – Roxas',
    color: '#F59E0B', // Amber
    filterLabel: 'Buhangin R603'
  },
  R763: {
    code: 'R763',
    family: 'Panacan',
    name: 'Panacan via Buhangin – Roxas',
    color: '#EC4899', // Rose/Pink
    filterLabel: 'Panacan R763'
  },
  R783: {
    code: 'R783',
    family: 'Panacan',
    name: 'Panacan via Angliongto – Roxas',
    color: '#DB2777',
    filterLabel: 'Panacan R783'
  },
  R793: {
    code: 'R793',
    family: 'Panacan',
    name: 'Panacan via R. Castillo – Roxas',
    color: '#BE185D',
    filterLabel: 'Panacan R793'
  }
};

export const ROUTE_FAMILIES = [
  { id: 'all', label: 'All Corridors' },
  { id: 'Toril', label: 'Toril' },
  { id: 'Mintal', label: 'Mintal' },
  { id: 'Bangkal', label: 'Bangkal' },
  { id: 'Buhangin', label: 'Buhangin' },
  { id: 'Panacan', label: 'Panacan' }
];

export interface GeoJsonLineFeature {
  type: 'Feature';
  properties: {
    kind: 'line';
    route: string;
    shift?: 'AM' | 'PM';
    name?: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lon, lat]
  };
}

export interface GeoJsonStopFeature {
  type: 'Feature';
  properties: {
    kind: 'stop';
    route: string;
    name: string;
    shift?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
}

export interface DavaoBusGeoJson {
  type: 'FeatureCollection';
  features: (GeoJsonLineFeature | GeoJsonStopFeature)[];
}

// Align AM/PM shift detection with DIBS operating windows (Morning 06:00-10:00 AM, Evening 04:00-09:00 PM)
export function getManilaShift(refDate: Date = new Date()): 'AM' | 'PM' {
  try {
    const status = getDibsServiceStatus(refDate);
    if (status.currentShift === 'morning') return 'AM';
    if (status.currentShift === 'evening' || status.currentShift === 'between_shifts') return 'PM';
    const manila = getManilaDate(refDate);
    const totalMinutes = manila.getHours() * 60 + manila.getMinutes();
    return totalMinutes > 600 && totalMinutes <= 1260 ? 'PM' : 'AM';
  } catch {
    const totalMinutes = refDate.getHours() * 60 + refDate.getMinutes();
    return totalMinutes > 600 && totalMinutes <= 1260 ? 'PM' : 'AM';
  }
}
