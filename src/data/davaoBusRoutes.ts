// Davao City Interim Bus Service (DIBS) Routes Metadata & Utilities
// Strictly no parentheses in route names or descriptions

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

// Get current Manila time hour to detect AM/PM shift
export function getManilaShift(): 'AM' | 'PM' {
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        hour12: false
      }).format(new Date()),
      10
    );
    return hour < 13 ? 'AM' : 'PM';
  } catch {
    return new Date().getHours() < 13 ? 'AM' : 'PM';
  }
}
