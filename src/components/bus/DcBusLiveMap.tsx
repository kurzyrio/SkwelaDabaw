import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Search, 
  RotateCw, 
  MapPin, 
  Navigation, 
  Crosshair, 
  Compass, 
  X,
  Plus,
  Minus,
  Clock,
  Zap,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Info,
  HelpCircle,
  Layers,
  Eye,
  EyeOff,
  Map as MapIcon,
  Moon,
  Check
} from 'lucide-react';
import { 
  DAVAO_BUS_ROUTES, 
  ROUTE_FAMILIES, 
  getManilaShift, 
  DavaoBusGeoJson,
  GeoJsonLineFeature,
  GeoJsonStopFeature
} from '../../data/davaoBusRoutes';
import { 
  getDibsServiceStatus, 
  DibsScheduleStatus, 
  DIBS_OFFICIAL_DISCLAIMER 
} from '../../utils/dibsSchedule';
import { 
  diagnoseLocationStatus, 
  requestDeviceLocationOn, 
  requestAppLocationPermissions 
} from '../../services/locationService';
import { WidgetBridge } from '../../services/widgetService';

export type MapStyleId = 'detailed' | 'minimal' | 'satellite' | 'dark';

export interface MapStyleConfig {
  id: MapStyleId;
  label: string;
  tagline: string;
  url: string;
  options: L.TileLayerOptions;
  badgeBg: string;
}

export const MAP_STYLES: Record<MapStyleId, MapStyleConfig> = {
  detailed: {
    id: 'detailed',
    label: 'MapTiler Dataviz',
    tagline: 'Clean vector streets, road labels & building footprints',
    url: 'https://api.maptiler.com/maps/dataviz-v4/256/{z}/{x}/{y}@2x.png?key=lYkPykoYvdzqXhWuo3Wa',
    options: {
      maxZoom: 20,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap'
    },
    badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
  },
  minimal: {
    id: 'minimal',
    label: 'Clean Minimal',
    tagline: 'Clean high-contrast vector street network',
    url: 'https://api.maptiler.com/maps/dataviz-v4/256/{z}/{x}/{y}@2x.png?key=lYkPykoYvdzqXhWuo3Wa',
    options: {
      maxZoom: 20,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap'
    },
    badgeBg: 'bg-blue-500/20 border-blue-500/40 text-blue-400'
  },
  satellite: {
    id: 'satellite',
    label: 'MapTiler Satellite',
    tagline: 'Real aerial terrain and overlaid road network',
    url: 'https://api.maptiler.com/maps/hybrid-v4/256/{z}/{x}/{y}@2x.jpg?key=lYkPykoYvdzqXhWuo3Wa',
    options: {
      maxZoom: 20,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap'
    },
    badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-400'
  },
  dark: {
    id: 'dark',
    label: 'Dark Transit',
    tagline: 'High contrast transit streets and corridors',
    url: 'https://api.maptiler.com/maps/dataviz-v4/256/{z}/{x}/{y}@2x.png?key=lYkPykoYvdzqXhWuo3Wa',
    options: {
      maxZoom: 20,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap'
    },
    badgeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-400'
  }
};

export interface BusPosition {
  fleet: string;
  route: string;
  code: string;
  route_color?: string;
  color_token?: string;
  shift?: string;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
  directionAngle?: number;
  ignition?: boolean;
  accState?: number;
  energyType?: string;
  online?: boolean;
  onlineState?: number;
  status?: string;
  reportClock?: string;
  stale?: boolean;
  lastUpdate?: string;
}

// Fallback active fleet data across all Davao corridors with multiple buses per route
const DEFAULT_BUSES: BusPosition[] = [
  // Toril Corridor (Blue) - Multiple buses on R102 and R103
  { fleet: 'DCBUS-01', route: 'R102 Toril – GE Torres Sandawa', code: 'R102', shift: 'AM', lat: 7.042806, lon: 125.529682, speed: 32, heading: 56, directionAngle: 56, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-11', route: 'R102 Toril – GE Torres Sandawa', code: 'R102', shift: 'AM', lat: 7.054855, lon: 125.600478, speed: 28, heading: 101, directionAngle: 101, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-02', route: 'R103 Toril – Roxas', code: 'R103', shift: 'AM', lat: 7.020623, lon: 125.496922, speed: 0, heading: 49, directionAngle: 49, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-12', route: 'R103 Toril – Roxas', code: 'R103', shift: 'AM', lat: 7.046208, lon: 125.591499, speed: 22, heading: 45, directionAngle: 45, ignition: true, online: true, energyType: 'Electric' },

  // Mintal Corridor (Orange) - Multiple buses on R402 and R403
  { fleet: 'DCBUS-03', route: 'R402 Mintal – GE Torres', code: 'R402', shift: 'AM', lat: 7.072251, lon: 125.521077, speed: 44, heading: 127, directionAngle: 127, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-13', route: 'R402 Mintal – GE Torres', code: 'R402', shift: 'AM', lat: 7.061964, lon: 125.593964, speed: 18, heading: 135, directionAngle: 135, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-04', route: 'R403 Mintal – Roxas', code: 'R403', shift: 'AM', lat: 7.081454, lon: 125.512046, speed: 38, heading: 138, directionAngle: 138, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-14', route: 'R403 Mintal – Roxas', code: 'R403', shift: 'AM', lat: 7.068696, lon: 125.525749, speed: 26, heading: 85, directionAngle: 85, ignition: true, online: true, energyType: 'Electric' },

  // Bangkal Corridor (Emerald Green) - R503
  { fleet: 'DCBUS-05', route: 'R503 Bangkal – Roxas', code: 'R503', shift: 'AM', lat: 7.058921, lon: 125.568189, speed: 20, heading: 112, directionAngle: 112, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-15', route: 'R503 Bangkal – Roxas', code: 'R503', shift: 'AM', lat: 7.068902, lon: 125.589124, speed: 24, heading: 115, directionAngle: 115, ignition: true, online: true, energyType: 'Electric' },

  // Buhangin Corridor (Amber) - Multiple buses on R603
  { fleet: 'DCBUS-06', route: 'R603 Buhangin – Roxas', code: 'R603', shift: 'AM', lat: 7.126720, lon: 125.620695, speed: 41, heading: 128, directionAngle: 128, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-07', route: 'R603 Buhangin – Roxas', code: 'R603', shift: 'AM', lat: 7.142091, lon: 125.600008, speed: 0, heading: 96, directionAngle: 96, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-16', route: 'R603 Buhangin – Roxas', code: 'R603', shift: 'AM', lat: 7.081459, lon: 125.612856, speed: 30, heading: 180, directionAngle: 180, ignition: true, online: true, energyType: 'Electric' },

  // Panacan Corridors (Pink / Rose) - R763, R783, R793
  { fleet: 'DCBUS-08', route: 'R763 Panacan via Buhangin – Roxas', code: 'R763', shift: 'AM', lat: 7.132845, lon: 125.642855, speed: 0, heading: 222, directionAngle: 222, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-17', route: 'R763 Panacan via Buhangin – Roxas', code: 'R763', shift: 'AM', lat: 7.088790, lon: 125.610125, speed: 24, heading: 210, directionAngle: 210, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-09', route: 'R783 Panacan via Angliongto – Roxas', code: 'R783', shift: 'AM', lat: 7.143011, lon: 125.653655, speed: 35, heading: 226, directionAngle: 226, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-18', route: 'R783 Panacan via Angliongto – Roxas', code: 'R783', shift: 'AM', lat: 7.108542, lon: 125.632145, speed: 29, heading: 215, directionAngle: 215, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-10', route: 'R793 Panacan via R. Castillo – Roxas', code: 'R793', shift: 'AM', lat: 7.122228, lon: 125.658764, speed: 0, heading: 213, directionAngle: 213, ignition: true, online: true, energyType: 'Electric' },
  { fleet: 'DCBUS-19', route: 'R793 Panacan via R. Castillo – Roxas', code: 'R793', shift: 'AM', lat: 7.094512, lon: 125.641209, speed: 22, heading: 210, directionAngle: 210, ignition: true, online: true, energyType: 'Electric' }
];


// Helper to remove any parentheses from text strings
function cleanLabel(text: string): string {
  return (text || '').replace(/[()]/g, '').trim();
}

// Calculate bearing between two GPS coordinates
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const dLon = (lon2 - lon1) * toRad;
  const y = Math.sin(dLon) * Math.cos(lat2 * toRad);
  const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
            Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * toDeg;
  return (brng + 360) % 360;
}

// Format heading to compass abbreviation
function getCompassHeading(deg: number = 0): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
  return `${Math.round(deg)}° ${directions[index]}`;
}

// Generate realistic elongated modern transit bus SVG icon with directional heading & headlights beam
function createBusIcon(bus: BusPosition, isSelected: boolean, zoom = 15): L.DivIcon {
  const routeMeta = DAVAO_BUS_ROUTES[bus.code];
  const busColor = bus.route_color || (routeMeta ? routeMeta.color : '#0B7A62');
  const heading = typeof bus.directionAngle === 'number' 
    ? bus.directionAngle 
    : (typeof bus.heading === 'number' ? bus.heading : 0);
  const isMoving = (bus.speed || 0) > 2;

  // 1. Zoom < 14: Minimalist compact transit pill to prevent visual clutter across city scale
  if (zoom < 14) {
    const svgHtml = `
      <div class="relative flex items-center justify-center select-none cursor-pointer" style="width: 24px; height: 28px;">
        <div style="
          transform: rotate(${heading}deg);
          transition: transform 0.35s ease-out;
          width: 12px;
          height: 20px;
          background: ${busColor};
          border: 1.5px solid ${isSelected ? '#FFFFFF' : '#000000'};
          border-radius: 6px 6px 3px 3px;
          box-shadow: ${isSelected ? '0 0 0 2px #FFFFFF, 0 2px 6px rgba(0,0,0,0.85)' : '0 1.5px 4px rgba(0,0,0,0.6)'};
          position: relative;
        ">
          <!-- Forward direction indicator -->
          <div style="position: absolute; top: 2px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background: #FFFFFF; border-radius: 50%;"></div>
        </div>
      </div>
    `;
    return L.divIcon({
      className: 'dc-bus-vehicle-icon-minimal',
      html: svgHtml,
      iconSize: [24, 28],
      iconAnchor: [12, 14]
    });
  }

  // 2. Zoom 14-15: Streamlined medium transit coach
  if (zoom < 16) {
    const svgHtml = `
      <div class="relative flex items-center justify-center select-none cursor-pointer" style="width: 36px; height: 50px;">
        <!-- Rotatable Vehicle Body -->
        <div style="
          transform: rotate(${heading}deg); 
          transition: transform 0.35s ease-out;
          width: 22px; 
          height: 40px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 15px;
            height: 32px;
            background: #0D0D11;
            border-radius: 4px 4px 3px 3px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.7);
            position: relative;
            overflow: hidden;
            border: 1.5px solid ${isSelected ? '#FFFFFF' : busColor};
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <!-- Front Windshield -->
            <div style="margin-top: 1px; width: 12px; height: 5px; background: #60A5FA; border-radius: 2px 2px 1px 1px; opacity: 0.95;"></div>
            <!-- Body Center Accent -->
            <div style="flex: 1; width: 4px; background: ${busColor}; margin: 2px 0; border-radius: 1px;"></div>
            <!-- Rear Red Brake Line -->
            <div style="width: 11px; height: 2px; background: #FF453A; border-radius: 1px; margin-bottom: 1px;"></div>
          </div>
        </div>

        <!-- Route Code Floating Badge -->
        <div style="
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          background: #09090B;
          color: #FFFFFF;
          border: 1px solid ${isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.4)'};
          font-size: 8px;
          font-weight: 800;
          padding: 0.5px 4px;
          border-radius: 9999px;
          white-space: nowrap;
          z-index: 10;
        ">
          ${cleanLabel(bus.code || bus.fleet)}
        </div>
      </div>
    `;
    return L.divIcon({
      className: 'dc-bus-vehicle-icon-medium',
      html: svgHtml,
      iconSize: [36, 50],
      iconAnchor: [18, 25]
    });
  }

  // 3. Zoom >= 16: Full elongated modern transit coach with high detail
  const svgHtml = `
    <div class="relative flex items-center justify-center select-none cursor-pointer" style="width: 44px; height: 68px;">
      <!-- Rotatable Vehicle Body -->
      <div 
        style="
          transform: rotate(${heading}deg); 
          transition: transform 0.35s ease-out;
          width: 30px; 
          height: 58px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        <!-- Headlights beam (visible if vehicle is moving) -->
        ${isMoving ? `
          <div style="
            position: absolute;
            top: -18px;
            left: 50%;
            transform: translateX(-50%);
            width: 28px;
            height: 24px;
            background: radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 80%);
            clip-path: polygon(50% 100%, 100% 0, 0 0);
            pointer-events: none;
          "></div>
        ` : ''}

        <!-- Outer Vehicle Body (Elongated Coach) -->
        <div style="
          width: 22px;
          height: 52px;
          background: #0D0D11;
          border-radius: 5px 5px 4px 4px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.65), 0 0 0 1.5px rgba(255,255,255,0.85);
          position: relative;
          overflow: hidden;
          border: 2px solid ${isSelected ? '#FFFFFF' : busColor};
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <!-- Digital LED Route Sign (Front Bumper) -->
          <div style="
            width: 16px; 
            height: 3.5px; 
            background: #000000; 
            border: 1px solid #FF9F0A; 
            border-radius: 1px; 
            margin-top: 1.5px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="font-size: 5px; font-weight: 900; color: #FF9F0A; line-height: 1; font-family: monospace;">${bus.code}</span>
          </div>

          <!-- Front Aerodynamic Windshield -->
          <div style="
            margin-top: 1.5px;
            width: 18px;
            height: 7px;
            background: #60A5FA;
            border-radius: 3px 3px 1px 1px;
            opacity: 0.95;
          "></div>

          <!-- Midsection: 4 Side Windows on each flank + Roof AC Unit in center -->
          <div style="
            width: 100%; 
            flex: 1; 
            display: flex; 
            justify-content: space-between; 
            padding: 2px 1.5px; 
            position: relative;
          ">
            <!-- Left Flank Windows (4 Windows) -->
            <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
              <div style="width: 2px; height: 5px; background: #93C5FD; border-radius: 1px;"></div>
              <div style="width: 2px; height: 5px; background: #93C5FD; border-radius: 1px;"></div>
              <div style="width: 2px; height: 5px; background: #93C5FD; border-radius: 1px;"></div>
              <div style="width: 2px; height: 5px; background: #93C5FD; border-radius: 1px;"></div>
            </div>

            <!-- Rooftop Accent Stripe & HVAC Cooling Unit -->
            <div style="
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              width: 10px;
            ">
              <div style="width: 8px; height: 12px; background: #242426; border-radius: 2px; border: 1px solid rgba(255,255,255,0.2); position: relative;">
                <div style="position: absolute; inset: 2px; background: ${busColor}; border-radius: 1px; opacity: 0.85;"></div>
              </div>
            </div>

            <!-- Right Flank Windows (4 Windows) -->
            <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
              <div style="width: 2px; height: 5px; background: #93C5FD; border-radius: 1px;"></div>
              <div style="width: 2px; height: 5px; background: #93C5FD; border-radius: 1px;"></div>
              <div style="width: 2px; height: 5px; background: #93C5FD; border-radius: 1px;"></div>
              <div style="width: 2px; height: 5px; background: #93C5FD; border-radius: 1px;"></div>
            </div>
          </div>

          <!-- Rear Windshield & Dual Red Brake Lights -->
          <div style="
            width: 16px;
            height: 3px;
            background: #3B82F6;
            border-radius: 1px;
            opacity: 0.85;
            margin-bottom: 1.5px;
          "></div>
          <div style="width: 18px; display: flex; justify-content: space-between; margin-bottom: 1.5px;">
            <div style="width: 4px; height: 1.5px; background: #FF453A; border-radius: 0.5px;"></div>
            <div style="width: 4px; height: 1.5px; background: #FF453A; border-radius: 0.5px;"></div>
          </div>
        </div>
      </div>

      <!-- Route Code Floating Badge -->
      <div 
        style="
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          background: #09090B;
          color: #FFFFFF;
          border: 1px solid ${isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.4)'};
          box-shadow: 0 2px 6px rgba(0,0,0,0.75);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2px;
          padding: 1px 5px;
          border-radius: 9999px;
          white-space: nowrap;
          z-index: 10;
        "
      >
        ${cleanLabel(bus.code || bus.fleet)}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'dc-bus-vehicle-icon-full',
    html: svgHtml,
    iconSize: [44, 68],
    iconAnchor: [22, 34]
  });
}

interface DcBusLiveMapProps {
  onOpenRules?: () => void;
  onOpenSchedule?: () => void;
  onNavigateToJeep?: () => void;
  onOpenGuide?: () => void;
}

export const DcBusLiveMap: React.FC<DcBusLiveMapProps> = ({ 
  onOpenRules,
  onOpenSchedule,
  onNavigateToJeep,
  onOpenGuide
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  // Map Style & Layer Overlays State with LocalStorage Persistence
  const [mapStyle, setMapStyle] = useState<MapStyleId>(() => {
    const saved = localStorage.getItem('skweladabaw_map_style') as MapStyleId;
    return saved && MAP_STYLES[saved] ? saved : 'detailed';
  });
  const [showBusStops, setShowBusStops] = useState<boolean>(() => {
    const saved = localStorage.getItem('skweladabaw_map_show_stops');
    return saved !== null ? saved === 'true' : true;
  });
  const [showCorridors, setShowCorridors] = useState<boolean>(() => {
    const saved = localStorage.getItem('skweladabaw_map_show_corridors');
    return saved !== null ? saved === 'true' : true;
  });
  const [showTraffic, setShowTraffic] = useState<boolean>(() => {
    return localStorage.getItem('skweladabaw_map_traffic') === 'true';
  });
  const [currentZoom, setCurrentZoom] = useState<number>(13);
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [isTransitToolsOpen, setIsTransitToolsOpen] = useState<boolean>(false);
  const [isServiceClosedModalOpen, setIsServiceClosedModalOpen] = useState<boolean>(false);

  // Persistent registry of active markers keyed by bus fleet
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  // Active requestAnimationFrame driving animations keyed by bus fleet
  const activeAnimationsRef = useRef<Map<string, number>>(new Map());
  const trafficLayerRef = useRef<L.TileLayer | null>(null);

  // Clean initialization: Real live telemetry or fresh cached telemetry, with resilient default fleet fallback
  const [buses, setBuses] = useState<BusPosition[]>(() => {
    try {
      const cached = localStorage.getItem('skweladabaw_cached_bus_telemetry');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_BUSES;
  });
  const [reloadProgress, setReloadProgress] = useState<number>(0);
  const [geoData, setGeoData] = useState<DavaoBusGeoJson | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null);
  const [activeShift, setActiveShift] = useState<'AM' | 'PM'>(getManilaShift());
  const [scheduleStatus, setScheduleStatus] = useState<DibsScheduleStatus>(getDibsServiceStatus());
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [gpsModalState, setGpsModalState] = useState<{
    isOpen: boolean;
    type: 'off' | 'denied';
    title: string;
    message: string;
  } | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('skweladabaw_cached_bus_telemetry'));
    } catch {
      return false;
    }
  });
  const [telemetrySource, setTelemetrySource] = useState<string>('DIBS Telemetry');

  // Monitor official schedule status for information only - never erase active buses
  useEffect(() => {
    const updateSchedule = () => {
      const s = getDibsServiceStatus();
      setScheduleStatus(s);
    };
    updateSchedule();
    const interval = setInterval(updateSchedule, 30000);
    return () => clearInterval(interval);
  }, []);

  // 1. Fetch Official Road GeoJSON (polylines & 125 stops)
  useEffect(() => {
    fetch('https://davaobus.kurzyrio.site/api/v1/routes?format=geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: DavaoBusGeoJson) => {
        setGeoData(data);
      })
      .catch(() => {
        const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
          ? import.meta.env.BASE_URL.replace(/\/$/, '') + '/'
          : '/';
        const fetchLocal = () => fetch(`${base}data/davaoBusRoutes.json`).catch(() => fetch('/data/davaoBusRoutes.json'));
        fetchLocal()
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((data: DavaoBusGeoJson) => {
            setGeoData(data);
          })
          .catch((err) => {
            console.warn('Local routes fetch fallback:', err);
          });
      });
  }, []);

  // Normalizer for heterogeneous bus payloads with official DCBUS-xx naming, authentic route colors & ignition filtering
  const normalizeBusList = (rawList: any[]): BusPosition[] => {
    return rawList.map((item: any) => {
      const rawRoute = item.route_name || item.route || item.code || '';
      const rawCode = item.route_code || item.code || '';
      const codeMatch = String(rawCode).match(/R\d{3}/i) || String(rawRoute).match(/R\d{3}/i);
      const code = codeMatch ? codeMatch[0].toUpperCase() : (cleanLabel(rawCode || 'DIBS'));
      const cleanRoute = cleanLabel(rawRoute || `${code} Davao Corridor`);

      // Standardize naming to official DCBUS-xx
      const rawFleet = cleanLabel(item.fleet || item.name || item.id || 'DCBUS');
      const numMatch = rawFleet.match(/(\d+)/);
      const fleetNum = numMatch ? numMatch[1].padStart(2, '0') : '01';
      const fleet = `DCBUS-${fleetNum}`;

      const speed = Math.round(Number(item.speed_kmh ?? item.speed ?? 0));
      const heading = Number(item.heading_deg ?? item.directionAngle ?? item.heading ?? 0);
      const isMoving = speed > 2;
      const ignition = typeof item.ignition === 'boolean'
        ? (item.ignition || (item.is_online !== false && !item.is_stale))
        : (item.is_online !== false && !item.is_stale);
      const online = item.is_online !== undefined ? Boolean(item.is_online) : Boolean(item.online ?? true);

      return {
        fleet,
        route: cleanRoute,
        code,
        route_color: item.route_color,
        color_token: item.color_token,
        shift: item.shift || (getManilaShift()),
        lat: Number(item.latitude ?? item.lat),
        lon: Number(item.longitude ?? item.lon),
        speed,
        heading,
        directionAngle: heading,
        ignition,
        accState: item.accState,
        energyType: item.energyType || 'Electric',
        online,
        onlineState: item.onlineState,
        status: item.status || (isMoving ? 'En Route' : 'At Stop'),
        reportClock: item.report_clock,
        stale: Boolean(item.is_stale),
        lastUpdate: item.report_clock || new Date().toLocaleTimeString()
      };
    }).filter((b) => b.lat !== 0 && b.lon !== 0 && b.online);
  };

  // 2. High-Speed Direct Telemetry Pipeline with Native CapacitorHttp & Fast Relay Failover
  const fetchBusPositions = useCallback(async () => {
    setIsRefreshing(true);

    // 1. Android Native Direct Query (Bypasses Browser CORS with Zero Delay)
    if (Capacitor.isNativePlatform()) {
      try {
        const nativeRes = await CapacitorHttp.get({
          url: 'https://davaobus.kurzyrio.site/api/v1/buses',
          connectTimeout: 4000,
          readTimeout: 4000
        });
        if (nativeRes.status === 200 && nativeRes.data) {
          const raw = nativeRes.data.buses || nativeRes.data.data;
          if (Array.isArray(raw) && raw.length > 0) {
            const parsed = normalizeBusList(raw);
            if (parsed.length > 0) {
              setBuses(parsed);
              setIsLiveConnected(true);
              setTelemetrySource('DavaoBus Live Telemetry');
              try {
                localStorage.setItem('skweladabaw_cached_bus_telemetry', JSON.stringify(parsed));
              } catch {}
              setIsRefreshing(false);
              return;
            }
          }
        }
      } catch (nativeErr) {
        console.warn('Native direct telemetry fetch notice:', nativeErr);
      }
    }

    const fetchEndpoint = async (url: string, timeoutMs = 2500): Promise<{ buses: any[]; source: string }> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const raw = json.buses || json.data;
        if (Array.isArray(raw) && raw.length > 0) {
          return { buses: raw, source: json.source || 'DavaoBus Telemetry' };
        }
        throw new Error('Empty telemetry payload');
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    };

    try {
      // Race DavaoBus primary, backup mirror, and relay proxy
      const primaryCandidates = [
        fetchEndpoint('https://davaobus.kurzyrio.site/api/v1/buses', 3000),
        fetchEndpoint('https://busapi.kurzyrio.site/api/v1/buses', 3000),
        fetchEndpoint('https://skweladabaw.kurzyrio.site/api/dibs_proxy.php', 3000),
        fetchEndpoint('/api/dcbus-live', 2000)
      ];

      const winner = await ((Promise as any).any ? (Promise as any).any(primaryCandidates) : Promise.race(primaryCandidates));
      const parsed = normalizeBusList(winner.buses);
      if (parsed.length > 0) {
        setBuses(parsed);
        setIsLiveConnected(true);
        setTelemetrySource(winner.source || 'DavaoBus Live Telemetry');
        try {
          localStorage.setItem('skweladabaw_cached_bus_telemetry', JSON.stringify(parsed));
        } catch {}
      }
    } catch (e) {
      // Fallback: CORS proxy with short timeout if direct is unreachable
      try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://davaobus.kurzyrio.site/api/v1/buses');
        const winner = await fetchEndpoint(proxyUrl, 3500);
        const parsed = normalizeBusList(winner.buses);
        if (parsed.length > 0) {
          setBuses(parsed);
          setIsLiveConnected(true);
          setTelemetrySource('DavaoBus Live Telemetry');
          try {
            localStorage.setItem('skweladabaw_cached_bus_telemetry', JSON.stringify(parsed));
          } catch {}
        }
      } catch (err) {
        console.warn('Telemetry refresh notice:', err);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Telemetry refresh cycle (strictly every 5s always)
  useEffect(() => {
    fetchBusPositions();
    const timer = setInterval(() => {
      fetchBusPositions();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchBusPositions]);

  // 3. Initialize Leaflet Map with Custom Panes (Stops, Routes, Traffic)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center at Davao City Hall / San Pedro
    const map = L.map(mapContainerRef.current, {
      center: [7.0707, 125.6087],
      zoom: 13,
      minZoom: 10,
      maxZoom: 20,
      zoomControl: false,
      attributionControl: true
    });

    // Create dedicated panes for layering integrity
    map.createPane('trafficPane');
    map.getPane('trafficPane')!.style.zIndex = '350';
    map.createPane('routesPane');
    map.getPane('routesPane')!.style.zIndex = '400';
    map.createPane('stopsPane');
    map.getPane('stopsPane')!.style.zIndex = '450';

    // Initialize Base Tile Layer from Active Style Preference
    const initialConfig = MAP_STYLES[mapStyle] || MAP_STYLES.detailed;
    const tile = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);
    currentTileLayerRef.current = tile;

    const polyGroup = L.layerGroup();
    const stopsGroup = L.layerGroup();
    const markersGroup = L.layerGroup().addTo(map);

    if (showCorridors) polyGroup.addTo(map);
    if (showBusStops) stopsGroup.addTo(map);

    polylinesLayerRef.current = polyGroup;
    stopsLayerRef.current = stopsGroup;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Track map zoom dynamically for marker scaling
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // Immediate and multi-stage invalidation to force Leaflet to recalculate canvas dimensions and render tiles
    map.invalidateSize();
    const invalidateTimers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 150),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 600),
      setTimeout(() => map.invalidateSize(), 1200),
    ];

    // Native ResizeObserver to automatically handle container resizes, tab switches, and orientation changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      invalidateTimers.forEach((t) => clearTimeout(t));
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      activeAnimationsRef.current.forEach((id) => cancelAnimationFrame(id));
      activeAnimationsRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
      markersMapRef.current.clear();
    };
  }, []);

  // Dynamic Map Style Swapping without resetting map or interrupting driving tweens
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const config = MAP_STYLES[mapStyle] || MAP_STYLES.detailed;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const newTile = L.tileLayer(config.url, config.options).addTo(map);
    newTile.bringToBack();
    currentTileLayerRef.current = newTile;

    localStorage.setItem('skweladabaw_map_style', mapStyle);
  }, [mapStyle]);

  // Synchronize Live Traffic Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = L.tileLayer(
          'https://{s}.google.com/vt?lyrs=traffic&x={x}&y={y}&z={z}',
          {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'trafficPane',
            opacity: 0.85
          }
        );
      }
      if (!map.hasLayer(trafficLayerRef.current)) {
        trafficLayerRef.current.addTo(map);
      }
    } else {
      if (trafficLayerRef.current && map.hasLayer(trafficLayerRef.current)) {
        map.removeLayer(trafficLayerRef.current);
      }
    }
    localStorage.setItem('skweladabaw_map_traffic', String(showTraffic));
  }, [showTraffic]);

  // Synchronize Bus Stops Overlay Visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    const stopsLayer = stopsLayerRef.current;
    if (!map || !stopsLayer) return;

    if (showBusStops) {
      if (!map.hasLayer(stopsLayer)) map.addLayer(stopsLayer);
    } else {
      if (map.hasLayer(stopsLayer)) map.removeLayer(stopsLayer);
    }
    localStorage.setItem('skweladabaw_map_show_stops', String(showBusStops));
  }, [showBusStops]);

  // Synchronize Route Corridors Overlay Visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polyLayer = polylinesLayerRef.current;
    if (!map || !polyLayer) return;

    if (showCorridors) {
      if (!map.hasLayer(polyLayer)) map.addLayer(polyLayer);
    } else {
      if (map.hasLayer(polyLayer)) map.removeLayer(polyLayer);
    }
    localStorage.setItem('skweladabaw_map_show_corridors', String(showCorridors));
  }, [showCorridors]);

  // 4. Render Authentic Road Polylines and Official Stops with StopsPane & High-Contrast Dots
  useEffect(() => {
    if (!mapInstanceRef.current || !polylinesLayerRef.current || !stopsLayerRef.current || !geoData) return;

    polylinesLayerRef.current.clearLayers();
    stopsLayerRef.current.clearLayers();

    // Split features into lines and stops with strict type guards
    const lines = geoData.features.filter(
      (f): f is GeoJsonLineFeature => f.properties.kind === 'line' && f.geometry.type === 'LineString'
    );
    const stops = geoData.features.filter(
      (f): f is GeoJsonStopFeature => f.properties.kind === 'stop' && f.geometry.type === 'Point'
    );

    // Draw active shift lines in routesPane
    lines.forEach((f) => {
      const routeCode = f.properties.route;
      const shift = f.properties.shift;
      const routeMeta = DAVAO_BUS_ROUTES[routeCode];
      const color = routeMeta ? routeMeta.color : '#3B82F6';
      const family = routeMeta ? routeMeta.family : '';

      // Match family filter & active shift
      const matchesFilter = selectedFamily === 'all' || family.toLowerCase() === selectedFamily.toLowerCase();
      const matchesShift = !shift || shift === activeShift;

      if (matchesFilter && matchesShift) {
        const latLngs = f.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);

        const isCorridorFocused = selectedFamily !== 'all' && family.toLowerCase() === selectedFamily.toLowerCase();

        // Streamlined Route Line (loosened casing eliminates redraw lag)
        const line = L.polyline(latLngs, {
          pane: 'routesPane',
          color: color,
          weight: isCorridorFocused ? 4 : 3,
          opacity: isCorridorFocused ? 0.95 : 0.75,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(polylinesLayerRef.current!);

        // Find which buses are currently traveling on this specific route
        const activeRouteBuses = buses.filter((b) => b.code.toUpperCase() === routeCode.toUpperCase());
        const busListHtml = activeRouteBuses.length > 0
          ? `<div style="color: #30D158; font-weight: bold; margin-top: 2px;">Active: ${activeRouteBuses.map((b) => b.fleet).join(', ')}</div>`
          : '<div style="color: #8E8E93; font-size: 10px; margin-top: 2px;">No buses on this route right now</div>';

        line.bindTooltip(`
          <div style="font-family: inherit; font-size: 11px; padding: 2px 4px;">
            <div style="font-weight: 900; color: #FFFFFF; display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background: ${color};"></span>
              <span>${routeCode} • ${routeMeta ? routeMeta.name : routeCode}</span>
            </div>
            ${busListHtml}
          </div>
        `, {
          sticky: true,
          direction: 'top',
          className: 'dc-bus-route-tooltip'
        });
      }
    });

    // Draw Official Stops on stopsPane with crisp high-contrast border
    stops.forEach((s) => {
      const stopRoute = s.properties.route || '';
      const [lon, lat] = s.geometry.coordinates;
      const stopName = cleanLabel(s.properties.name || 'Bus Stop');

      const matchesFilter = selectedFamily === 'all' || 
        Object.keys(DAVAO_BUS_ROUTES).some((code) => {
          const meta = DAVAO_BUS_ROUTES[code];
          return meta.family.toLowerCase() === selectedFamily.toLowerCase() && stopRoute.includes(code);
        });

      if (matchesFilter) {
        const stopMarker = L.circleMarker([lat, lon], {
          pane: 'stopsPane',
          radius: 3.5,
          fillColor: '#FFFFFF',
          color: '#09090B',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        });

        stopMarker.bindTooltip(stopName, {
          direction: 'top',
          offset: [0, -4],
          className: 'dc-bus-stop-tooltip'
        });

        stopMarker.addTo(stopsLayerRef.current!);
      }
    });
  }, [geoData, selectedFamily, activeShift, buses]);


  // 5. Filter Buses by Family & Search (Zero Parentheses)
  const filteredBuses = useMemo(() => {
    return buses.filter((b) => {
      const routeMeta = DAVAO_BUS_ROUTES[b.code];
      const family = routeMeta ? routeMeta.family : '';
      const matchesFamily = selectedFamily === 'all' || family.toLowerCase() === selectedFamily.toLowerCase();

      const query = searchFilter.trim().toLowerCase();
      const matchesSearch = 
        !query || 
        cleanLabel(b.fleet).toLowerCase().includes(query) || 
        cleanLabel(b.route).toLowerCase().includes(query) ||
        cleanLabel(b.code).toLowerCase().includes(query);

      return matchesFamily && matchesSearch;
    });
  }, [buses, selectedFamily, searchFilter]);

  // Map active buses to routes and corridor families
  const corridorBusSummary = useMemo(() => {
    const summary: Record<string, { routes: string[]; buses: BusPosition[] }> = {
      Toril: { routes: ['R102', 'R103'], buses: [] },
      Mintal: { routes: ['R402', 'R403'], buses: [] },
      Bangkal: { routes: ['R503'], buses: [] },
      Buhangin: { routes: ['R603'], buses: [] },
      Panacan: { routes: ['R763', 'R783', 'R793'], buses: [] }
    };

    buses.forEach((b) => {
      const routeMeta = DAVAO_BUS_ROUTES[b.code];
      const fam = routeMeta?.family;
      if (fam && summary[fam]) {
        summary[fam].buses.push(b);
      }
    });

    return summary;
  }, [buses]);

  // Buses on the currently selected family
  const currentCorridorBuses = useMemo(() => {
    if (selectedFamily === 'all') return buses;
    return corridorBusSummary[selectedFamily]?.buses || [];
  }, [selectedFamily, buses, corridorBusSummary]);

  // 6. Smooth requestAnimationFrame Driving Animation (No Teleportation!)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const currentFleetIds = new Set<string>();

    filteredBuses.forEach((bus) => {
      if (!bus.lat || !bus.lon) return;

      currentFleetIds.add(bus.fleet);
      const isSelected = selectedBus?.fleet === bus.fleet;
      const existingMarker = markersMapRef.current.get(bus.fleet);

      if (existingMarker) {
        const startPos = existingMarker.getLatLng();
        const targetLat = bus.lat;
        const targetLon = bus.lon;

        // Calculate distance delta in degrees
        const dLat = targetLat - startPos.lat;
        const dLon = targetLon - startPos.lng;
        const distSquared = dLat * dLat + dLon * dLon;

        // Cancel previous animation for this fleet if still running
        const prevAnimId = activeAnimationsRef.current.get(bus.fleet);
        if (prevAnimId) {
          cancelAnimationFrame(prevAnimId);
          activeAnimationsRef.current.delete(bus.fleet);
        }

        // If moved between ~2 meters and 4 kilometers, animate the vehicle driving smoothly!
        if (distSquared > 0.00000004 && distSquared < 0.0016) {
          // Compute street bearing from movement direction
          const motionBearing = calculateBearing(startPos.lat, startPos.lng, targetLat, targetLon);
          const activeBearing = (bus.speed || 0) > 2 ? motionBearing : (bus.directionAngle ?? bus.heading ?? motionBearing);
          const movingBus: BusPosition = {
            ...bus,
            directionAngle: activeBearing,
            heading: activeBearing
          };

          // Update icon with motion bearing
          existingMarker.setIcon(createBusIcon(movingBus, isSelected, currentZoom));

          const startTime = performance.now();
          const duration = 2400; // 2.4s smooth driving transition
          const sLat = startPos.lat;
          const sLon = startPos.lng;

          const animateDrive = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Smooth easeInOutCubic formula
            const ease = progress < 0.5 
              ? 4 * progress * progress * progress 
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const curLat = sLat + (targetLat - sLat) * ease;
            const curLon = sLon + (targetLon - sLon) * ease;

            existingMarker.setLatLng([curLat, curLon]);

            if (progress < 1) {
              const animId = requestAnimationFrame(animateDrive);
              activeAnimationsRef.current.set(bus.fleet, animId);
            } else {
              existingMarker.setLatLng([targetLat, targetLon]);
              activeAnimationsRef.current.delete(bus.fleet);
            }
          };

          const animId = requestAnimationFrame(animateDrive);
          activeAnimationsRef.current.set(bus.fleet, animId);
        } else {
          // Stationary or initial setup
          existingMarker.setLatLng([targetLat, targetLon]);
          existingMarker.setIcon(createBusIcon(bus, isSelected, currentZoom));
        }
      } else {
        // Initial marker registration
        const icon = createBusIcon(bus, isSelected, currentZoom);
        const marker = L.marker([bus.lat, bus.lon], { icon });

        marker.on('click', () => {
          setSelectedBus(bus);
          mapInstanceRef.current?.setView([bus.lat, bus.lon], 15, { animate: true });
        });

        marker.addTo(markersLayerRef.current!);
        markersMapRef.current.set(bus.fleet, marker);
      }
    });

    // Clean up markers that are no longer present
    markersMapRef.current.forEach((marker, fleet) => {
      if (!currentFleetIds.has(fleet)) {
        const animId = activeAnimationsRef.current.get(fleet);
        if (animId) cancelAnimationFrame(animId);
        activeAnimationsRef.current.delete(fleet);
        markersLayerRef.current?.removeLayer(marker);
        markersMapRef.current.delete(fleet);
      }
    });
  }, [filteredBuses, selectedBus, currentZoom]);

  // Recenter Map on Davao City
  const handleRecenterDavao = () => {
    mapInstanceRef.current?.setView([7.0707, 125.6087], 13, { animate: true });
  };

  // Core Geolocation Pinpoint & Map Recenter
  const applyUserLocation = (lat: number, lng: number) => {
    setIsLocatingUser(false);
    const coords: [number, number] = [lat, lng];
    setUserCoords(coords);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(coords, 15, { animate: true });

      if (!userLocationMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'user-gps-dot',
          html: `
            <div style="width: 18px; height: 18px; background: #2563EB; border: 3px solid #FFFFFF; border-radius: 9999px; box-shadow: 0 0 0 3px rgba(37,99,235,0.4), 0 2px 6px rgba(0,0,0,0.4);"></div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        userLocationMarkerRef.current = L.marker(coords, { icon: userIcon }).addTo(mapInstanceRef.current);
      } else {
        userLocationMarkerRef.current.setLatLng(coords);
      }
    }
  };

  // User Geolocation (Locate Me with Device Settings Diagnostic)
  const handleLocateMe = async () => {
    setIsLocatingUser(true);

    // 1. Android Native Diagnostic Check
    if (Capacitor.isNativePlatform()) {
      try {
        const diag = await diagnoseLocationStatus();
        if (!diag.isPermitted) {
          setIsLocatingUser(false);
          setGpsModalState({
            isOpen: true,
            type: 'denied',
            title: 'Location Permission Needed',
            message: 'Location access is required to show your position along Davao City bus routes. Please enable location permissions in settings.'
          });
          return;
        }
        if (!diag.isGpsEnabled) {
          setIsLocatingUser(false);
          setGpsModalState({
            isOpen: true,
            type: 'off',
            title: 'Turn On Device Location',
            message: "Your phone's Location (GPS) is turned off. To see your position along bus routes, turn on your device's location service."
          });
          return;
        }

        const nativePos = await WidgetBridge.getCurrentLocation();
        if (nativePos && typeof nativePos.lat === 'number' && typeof nativePos.lng === 'number') {
          applyUserLocation(nativePos.lat, nativePos.lng);
          return;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err || '');
        if (errMsg.includes('denied') || errMsg.includes('permission')) {
          setIsLocatingUser(false);
          setGpsModalState({
            isOpen: true,
            type: 'denied',
            title: 'Location Permission Needed',
            message: 'Location access is required to show your position along Davao City bus routes. Please enable location permissions in settings.'
          });
          return;
        }
        if (errMsg.includes('disabled') || errMsg.includes('Location services are disabled')) {
          setIsLocatingUser(false);
          setGpsModalState({
            isOpen: true,
            type: 'off',
            title: 'Turn On Device Location',
            message: "Your phone's Location (GPS) is turned off. To see your position along bus routes, turn on your device's location service."
          });
          return;
        }
      }
    }

    // 2. Browser Geolocation Fallback
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          setIsLocatingUser(false);
          setGpsModalState({
            isOpen: true,
            type: 'denied',
            title: 'Location Permission Needed',
            message: 'SkwelaDabaw needs location permission to display your position on the bus map. Please enable location permissions in settings.'
          });
          return;
        }
      } catch {}
    }

    if (!navigator.geolocation) {
      setIsLocatingUser(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyUserLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsModalState({
            isOpen: true,
            type: 'denied',
            title: 'Location Permission Needed',
            message: 'Location access is required to show your position along bus routes. Please allow location permissions in device settings.'
          });
        } else if (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT) {
          setGpsModalState({
            isOpen: true,
            type: 'off',
            title: 'Turn On Device Location',
            message: "Your phone's Location (GPS) is turned off. To see your position along bus routes, turn on your device's location service."
          });
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Zoom Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Map Style and Overlays Preset Handler
  const handleSelectMapStyle = (id: MapStyleId) => {
    setMapStyle(id);
    if (id === 'minimal') {
      setShowBusStops(false);
    } else if (id === 'detailed') {
      setShowBusStops(true);
    }
  };

  return (
    <div className="h-full w-full flex-1 relative select-none overflow-hidden bg-[var(--canvas-bg)]">
      {/* Full-Screen Leaflet Map Surface */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-0 touch-none" 
        style={{
          height: '100%',
          width: '100%'
        }}
      />

      {/* TOP FLOATING HUD: Clean Search, 5s Live Status, Transit Tools & Map FAB */}
      <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-30 flex items-center justify-between gap-1.5 sm:gap-2 max-w-xl mx-auto pointer-events-none">
        {/* Search Bar */}
        <div className="flex-1 flex items-center gap-2 p-1.5 px-3 rounded-full bg-[var(--modal-bg)]/90 backdrop-blur-2xl border border-[var(--card-border)] shadow-xl pointer-events-auto">
          <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search fleet or route..."
            className="w-full bg-transparent text-[var(--text-primary)] text-xs font-medium placeholder:text-[var(--text-secondary)] focus:outline-hidden"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 pressable"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Status & 5-Second Refresh Pill */}
        <button
          type="button"
          onClick={fetchBusPositions}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full bg-[var(--modal-bg)]/90 backdrop-blur-2xl border border-[var(--card-border)] shadow-xl text-xs font-bold pointer-events-auto transition-all pressable shrink-0 text-[var(--text-primary)]"
          title="Auto-reloads every 5 seconds. Tap to refresh immediately."
        >
          <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-[#30D158] animate-pulse shadow-[0_0_8px_#30D158]' : 'bg-[#FF9F0A]'}`} />
          <span className="text-[11px] font-bold">{filteredBuses.length} Live</span>
          <RotateCw className={`w-3 h-3 text-[var(--text-secondary)] ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* TRANSIT TOOLS BUTTON (Timetable, Rules, Guide, Jeep) */}
        {(onOpenSchedule || onOpenRules || onOpenGuide || onNavigateToJeep) && (
          <button
            type="button"
            onClick={() => setIsTransitToolsOpen(true)}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-full font-bold text-xs shadow-xl backdrop-blur-2xl transition-all pressable pointer-events-auto shrink-0 border ${
              isTransitToolsOpen
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent'
                : 'bg-[var(--modal-bg)]/90 border-[var(--card-border)] text-[var(--text-primary)] hover:border-[var(--text-primary)]'
            }`}
            title="Transit Timetable and Travel Guides"
          >
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xs:inline">Info</span>
          </button>
        )}

        {/* MAP BUTTON (ONLY FOR MAP STYLES & OVERLAYS) */}
        <button
          type="button"
          onClick={() => setIsMapModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-xs shadow-xl backdrop-blur-2xl transition-all pressable pointer-events-auto shrink-0 border ${
            isMapModalOpen
              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent'
              : 'bg-[var(--modal-bg)]/90 border-[var(--card-border)] text-[var(--text-primary)] hover:border-[var(--text-primary)]'
          }`}
          title="Map Styles and Map Overlays"
        >
          <MapIcon className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xs:inline">Map</span>
        </button>
      </div>

      {/* HORIZONTAL CORRIDOR AND SHIFT BAR (Directly accessible on map) */}
      <div className="absolute top-14 left-2.5 sm:left-3 right-2.5 sm:right-3 z-30 pointer-events-none flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {/* Operating Shift Quick Toggle */}
        <button
          type="button"
          onClick={() => setActiveShift(activeShift === 'AM' ? 'PM' : 'AM')}
          className="pointer-events-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-[var(--modal-bg)]/95 backdrop-blur-2xl border border-[var(--card-border)] shadow-xl text-[var(--text-primary)] pressable"
          title={`Currently showing ${activeShift} Shift routes. Tap to toggle.`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeShift} Shift</span>
        </button>

        {/* Corridor Filter Chips */}
        {ROUTE_FAMILIES.map((family) => {
          const isSelected = selectedFamily === family.id;
          return (
            <button
              key={family.id}
              type="button"
              onClick={() => setSelectedFamily(family.id)}
              className={`pointer-events-auto shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all pressable border shadow-md backdrop-blur-2xl ${
                isSelected
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-black shadow-xs'
                  : 'bg-[var(--modal-bg)]/90 border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {family.label}
            </button>
          );
        })}
      </div>

      {/* RIGHT FLOATING MINIMAL MAP UTILITY CONTROLS */}
      <div className="absolute right-2.5 sm:right-3 top-28 sm:top-28 z-30 flex flex-col gap-2 pointer-events-auto">
        <div className="flex flex-col rounded-2xl bg-[var(--modal-bg)]/90 backdrop-blur-xl border border-[var(--card-border)] shadow-xl overflow-hidden divide-y divide-[var(--card-border)]">
          {/* GPS Locate Me */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocatingUser}
            className={`p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pressable ${
              isLocatingUser ? 'animate-pulse text-[#30D158]' : ''
            }`}
            title="Locate my position"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Recenter Davao */}
          <button
            type="button"
            onClick={handleRecenterDavao}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pressable"
            title="Center Davao City"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pressable"
            title="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pressable"
            title="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAP STYLES & OVERLAYS MODAL (STRICTLY FOR MAPS) */}
      {isMapModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto"
          onClick={() => setIsMapModalOpen(false)}
        >
          <div 
            className="w-full sm:w-96 max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--modal-bg)]/95 backdrop-blur-2xl border border-[var(--card-border)] shadow-2xl p-4 sm:p-5 space-y-4 animate-slide-up pointer-events-auto mb-safe sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-[var(--card-border)] mx-auto sm:hidden mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--card-border)]">
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">
                  Map Styles & Layers
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Map Styles 2x2 Grid */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Base Map Style
              </span>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(MAP_STYLES).map((style) => {
                  const isActive = mapStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleSelectMapStyle(style.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all pressable flex flex-col justify-between gap-1.5 ${
                        isActive
                          ? 'bg-[var(--nested-bg)] border-[var(--text-primary)] text-[var(--text-primary)] shadow-md'
                          : 'bg-[var(--nested-bg)]/50 border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--card-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${style.badgeBg}`}>
                          {style.id}
                        </span>
                        {isActive && <Check className="w-3.5 h-3.5 text-[var(--text-primary)]" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                          {style.label}
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] line-clamp-1">
                          {style.tagline}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Overlays / Visibility Toggles */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Map Details and Overlays
              </span>

              <div className="space-y-1.5">
                {/* 125 Bus Stops Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)]">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>125 Official Stops</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      Designated pick-up points
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBusStops(!showBusStops)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all pressable flex items-center gap-1 border ${
                      showBusStops
                        ? 'bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]'
                        : 'bg-[var(--card-bg)] border-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {showBusStops ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{showBusStops ? 'Shown' : 'Hidden'}</span>
                  </button>
                </div>

                {/* Corridor Route Lines Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)]">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      <span>Route Corridors</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      Colored road pathways
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCorridors(!showCorridors)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all pressable flex items-center gap-1 border ${
                      showCorridors
                        ? 'bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]'
                        : 'bg-[var(--card-bg)] border-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {showCorridors ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{showCorridors ? 'Shown' : 'Hidden'}</span>
                  </button>
                </div>

                {/* Live Traffic Toggle inside Tray */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)]">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Real-Time Traffic Flow</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      Live congestion colors on roads
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTraffic(!showTraffic)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all pressable flex items-center gap-1 border ${
                      showTraffic
                        ? 'bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]'
                        : 'bg-[var(--card-bg)] border-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {showTraffic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{showTraffic ? 'Active' : 'Off'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEPARATE TRANSIT TOOLS & TIMETABLE SHEET */}
      {isTransitToolsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto"
          onClick={() => setIsTransitToolsOpen(false)}
        >
          <div 
            className="w-full sm:w-96 max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--modal-bg)]/95 backdrop-blur-2xl border border-[var(--card-border)] shadow-2xl p-4 sm:p-5 space-y-4 animate-slide-up pointer-events-auto mb-safe sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-[var(--card-border)] mx-auto sm:hidden mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--card-border)]">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">
                  Transit Information & Tools
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTransitToolsOpen(false)}
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Operating Shift Selection */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Operating Shift Hours
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveShift('AM')}
                  className={`p-2.5 rounded-2xl border text-left transition-all pressable ${
                    activeShift === 'AM'
                      ? 'bg-[var(--nested-bg)] border-[var(--text-primary)] text-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--nested-bg)]/50 border-[var(--nested-border)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="text-xs font-bold text-[var(--text-primary)]">AM Shift</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">6:00 AM – 10:00 AM</div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveShift('PM')}
                  className={`p-2.5 rounded-2xl border text-left transition-all pressable ${
                    activeShift === 'PM'
                      ? 'bg-[var(--nested-bg)] border-[var(--text-primary)] text-[var(--text-primary)] shadow-sm'
                      : 'bg-[var(--nested-bg)]/50 border-[var(--nested-border)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="text-xs font-bold text-[var(--text-primary)]">PM Shift</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">4:00 PM – 9:00 PM</div>
                </button>
              </div>
            </div>

            {/* Transit Utilities */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Transit Tools
              </span>
              <div className="grid grid-cols-2 gap-2">
                {onOpenSchedule && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransitToolsOpen(false);
                      onOpenSchedule();
                    }}
                    className="p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-left hover:border-[var(--card-border)] transition-all pressable flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">Timetable</span>
                  </button>
                )}

                {onOpenRules && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransitToolsOpen(false);
                      onOpenRules();
                    }}
                    className="p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-left hover:border-[var(--card-border)] transition-all pressable flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">14 Rules</span>
                  </button>
                )}

                {onOpenGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransitToolsOpen(false);
                      onOpenGuide();
                    }}
                    className="p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-left hover:border-[var(--card-border)] transition-all pressable flex items-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">Guide & Tips</span>
                  </button>
                )}

                {onNavigateToJeep && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransitToolsOpen(false);
                      onNavigateToJeep();
                    }}
                    className="p-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-left hover:border-[var(--card-border)] transition-all pressable flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">Jeep Routes</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM FLOATING CARD: Selected Bus Inspector or Active Fleet Indicator */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-4 left-2.5 sm:left-4 right-2.5 sm:right-auto sm:w-96 z-30 pointer-events-auto animate-slide-up">
        {selectedBus ? (
          <div className="p-4 rounded-3xl bg-[var(--modal-bg)]/95 backdrop-blur-2xl border border-[var(--card-border)] shadow-2xl space-y-3">
            {/* Mobile Sheet Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-[var(--card-border)] mx-auto sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-md shrink-0"
                  style={{
                    backgroundColor: DAVAO_BUS_ROUTES[selectedBus.code]?.color || '#0B7A62'
                  }}
                >
                  BUS
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 className="font-black text-sm text-[var(--text-primary)]">
                      {cleanLabel(selectedBus.fleet)}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30D158]/20 text-[#30D158] font-bold">
                      Zero Fare Transit
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight mt-0.5">
                    {cleanLabel(selectedBus.route)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBus(null)}
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] pressable"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Official DIBS Vehicle Metrics Grid */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[var(--card-border)] text-center">
              <div className="p-2 rounded-xl bg-[var(--nested-bg)]">
                <span className="block text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Fare</span>
                <span className="text-xs font-black text-[#30D158]">₱0.00</span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--nested-bg)]">
                <span className="block text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Speed</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {selectedBus.speed !== undefined ? `${Math.round(selectedBus.speed)} km/h` : '0 km/h'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--nested-bg)]">
                <span className="block text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Heading</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {getCompassHeading(selectedBus.directionAngle ?? selectedBus.heading ?? 0)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--nested-bg)]">
                <span className="block text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Ignition</span>
                <span className={`text-xs font-bold ${selectedBus.ignition !== false ? 'text-[#30D158]' : 'text-[var(--text-secondary)]'}`}>
                  {selectedBus.ignition !== false ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            {/* Non-Affiliation Legal Micro-Notice */}
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-[var(--text-secondary)]">
              <Info className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
              <span className="truncate">Unofficial student transit companion • Not affiliated with Davao City Govt</span>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => {
              setReloadProgress(0);
              fetchBusPositions();
            }}
            className="relative overflow-hidden px-4 py-2.5 rounded-full bg-[var(--modal-bg)]/95 backdrop-blur-xl border border-[var(--card-border)] shadow-2xl flex items-center justify-between gap-3 text-xs cursor-pointer select-none pressable"
            title="Tap to refresh live bus positions"
          >
            {/* Glassy progress loading bar filling the pill background */}
            <div 
              className="absolute inset-y-0 left-0 bg-emerald-500/25 backdrop-blur-xs rounded-full pointer-events-none transition-all ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, reloadProgress))}%`, transitionDuration: '200ms' }}
            />
            <span className="relative z-10 flex items-center gap-2 text-[var(--text-primary)]">
              <span className={`w-2.5 h-2.5 rounded-full ${isLiveConnected ? 'bg-[#30D158] animate-pulse shadow-[0_0_8px_#30D158]' : 'bg-[#FF9F0A]'}`} />
              <span className="font-bold">{filteredBuses.length} Buses Live</span>
              <span className="text-[var(--text-secondary)]">•</span>
              <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[150px] sm:max-w-none">{telemetrySource}</span>
            </span>
            <span className="relative z-10 font-bold text-[#30D158] shrink-0">Zero Fare Transit</span>
          </div>
        )}
      </div>

      {/* SERVICE IS CLOSED RIGHT NOW POPUP MODAL */}
      {isServiceClosedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] p-6 shadow-2xl space-y-5 animate-scale-up relative">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setIsServiceClosedModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pressable"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Bus Hero Graphic */}
            <div className="flex justify-center pt-2">
              <div className="w-28 h-14 rounded-2xl bg-[#2563EB] flex items-center justify-center relative shadow-xl">
                {/* Windshield & Windows */}
                <div className="flex items-center gap-1.5 absolute top-2.5 left-2.5 right-2.5">
                  <div className="h-4 flex-1 bg-white/90 rounded-xs" />
                  <div className="h-4 flex-1 bg-white/90 rounded-xs" />
                  <div className="h-4 w-6 bg-white/90 rounded-xs" />
                </div>
                {/* Bus Wheels */}
                <div className="absolute -bottom-2 left-5 w-4 h-4 rounded-full bg-[#141416] border-2 border-neutral-600" />
                <div className="absolute -bottom-2 right-5 w-4 h-4 rounded-full bg-[#141416] border-2 border-neutral-600" />
              </div>
            </div>

            {/* Heading and Next Service Subtitle */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                Service is closed right now
              </h3>
              <p className="text-xs font-semibold text-emerald-400">
                {scheduleStatus.nextServiceTime.startsWith('Resumes') 
                  ? `Next service: ${scheduleStatus.nextServiceTime.replace(/^Resumes\s*/i, '')}`
                  : `Next service: ${scheduleStatus.nextServiceTime}`}
              </p>
            </div>

            {/* Published Schedule Table Box */}
            <div className="rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] divide-y divide-[var(--nested-border)] text-xs">
              <div className="flex items-center justify-between px-4 py-3 text-[var(--text-primary)]">
                <span>Monday – Saturday</span>
                <span className="font-semibold text-[var(--text-primary)] font-mono">6:00 – 10:00 AM</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-[var(--text-primary)]">
                <span>Monday – Saturday</span>
                <span className="font-semibold text-[var(--text-primary)] font-mono">4:00 – 9:00 PM</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-[var(--text-primary)]">
                <span>Sunday</span>
                <span className="font-semibold text-[var(--text-secondary)]">No service</span>
              </div>
            </div>

            <p className="text-[11px] text-center text-[var(--text-secondary)]">
              Published service hours — actual times may vary.
            </p>

            {/* Got it Action Button */}
            <button
              type="button"
              onClick={() => setIsServiceClosedModalOpen(false)}
              className="w-full py-3.5 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-black text-sm tracking-wide transition-all shadow-lg pressable"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Location Access & GPS Settings Modal */}
      {gpsModalState?.isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm sheet-backdrop-enter"
          onClick={() => setGpsModalState(null)}
        >
          <div 
            className="bg-[var(--card-bg)] w-full max-w-sm rounded-3xl border border-[var(--card-border)] shadow-2xl p-6 text-center space-y-4 sheet-enter-spring"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Compass className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-base text-[var(--text-primary)]">
                {gpsModalState.title}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {gpsModalState.message}
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const modalType = gpsModalState.type;
                  setGpsModalState(null);
                  if (modalType === 'denied') {
                    await requestAppLocationPermissions();
                  } else {
                    await requestDeviceLocationOn();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable hover:opacity-95"
              >
                Go to Settings
              </button>
              <button
                type="button"
                onClick={() => setGpsModalState(null)}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pressable"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

