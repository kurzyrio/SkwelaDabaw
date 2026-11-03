import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

import { 
  Plus, 
  Minus, 
  Crosshair, 
  MapPin, 
  X, 
  ArrowUpDown, 
  Clock, 
  Bus, 
  Layers, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  RotateCw, 
  Search, 
  ArrowLeft, 
  Footprints,
  AlertTriangle,
  ExternalLink,
  Info,
  MessageSquare,
  Share2,
  Compass,
  Navigation
} from 'lucide-react';
import { 
  subscribeToDeviceHeading, 
  diagnoseLocationStatus, 
  requestDeviceLocationOn, 
  requestAppLocationPermissions 
} from '../../services/locationService';
import { Capacitor } from '@capacitor/core';
import { WidgetBridge } from '../../services/widgetService';
import { 
  TransitJourney, 
  LatLng,
  planTransitJourneys,
  GeoJsonFeature,
  isInsideDavaoCity
} from '../../utils/davaoTransitRouter';
import { 
  addRecentTrip, 
  savePlace 
} from '../../services/savedRoutesService';
import { JeepSchoolSearchModal } from './JeepSchoolSearchModal';

// Vite worker setup strictly as documented in https://openfreemap.org/quick_start/
if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl(workerUrl);
}

export interface JeepTransitMapProps {
  initialOrigin?: LatLng | null;
  initialDestination?: LatLng | null;
  singleRouteFeature?: GeoJsonFeature | null;
  initialSavePlaceType?: 'home' | 'campus' | 'custom' | null;
  initialSavePlaceName?: string;
  onClearSingleRoute?: () => void;
  onNavigateToCatalog?: () => void;
  onNavigateToFare?: () => void;
  onBack?: () => void;
}

// Davao City coordinates [lng, lat] for MapLibre GL
const DAVAO_CENTER_LNG_LAT: [number, number] = [125.6128, 7.0734];
const DEFAULT_ORIGIN_COORD = { lat: 7.0705, lng: 125.6139 }; // Central Davao (Post Office / City Hall)

// Pure OpenFreeMap vector styles + Satellite Hybrid (strictly no Carto)
export type VectorMapStyleId = 'dark' | 'liberty' | 'bright' | 'hybrid';

interface MapStyleConfig {
  id: VectorMapStyleId;
  name: string;
  style: string;
}

const MAP_STYLES: MapStyleConfig[] = [
  {
    id: 'dark',
    name: 'Dark Vector',
    style: 'https://tiles.openfreemap.org/styles/dark'
  },
  {
    id: 'liberty',
    name: 'Liberty Vector (Light)',
    style: 'https://tiles.openfreemap.org/styles/liberty'
  },
  {
    id: 'bright',
    name: 'Bright Vector',
    style: 'https://tiles.openfreemap.org/styles/bright'
  },
  {
    id: 'hybrid',
    name: 'Satellite Hybrid',
    style: 'https://api.maptiler.com/maps/hybrid-v4/style.json?key=lYkPykoYvdzqXhWuo3Wa'
  }
];

function registerFootprintImage(map: maplibregl.Map): void {
  try {
    if (map.hasImage('pedestrian-footprint')) return;

    const canvas = document.createElement('canvas');
    canvas.width = 36;
    canvas.height = 36;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 36, 36);

    // Draw clean vector footprint pointing forward (North / 0 degrees)
    ctx.save();
    ctx.translate(18, 18);

    // Front / Toes (top)
    ctx.beginPath();
    ctx.ellipse(0, -6, 5.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2563EB';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Heel (bottom)
    ctx.beginPath();
    ctx.ellipse(0, 6.5, 4.5, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2563EB';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Inner tread highlight
    ctx.beginPath();
    ctx.arc(0, -6, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    ctx.restore();

    const imgData = ctx.getImageData(0, 0, 36, 36);
    if (!map.hasImage('pedestrian-footprint')) {
      map.addImage('pedestrian-footprint', imgData);
    }
  } catch (err) {
    console.warn('[JeepTransitMap] Footprint registration note:', err);
  }
}

export const JeepTransitMap: React.FC<JeepTransitMapProps> = ({
  initialOrigin,
  initialDestination,
  singleRouteFeature,
  initialSavePlaceType,
  initialSavePlaceName,
  onClearSingleRoute,
  onNavigateToCatalog,
  onNavigateToFare,
  onBack
}) => {
  // Detect dark mode from html element or localStorage
  const isDarkMode = useMemo(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
      ['dark', 'oled', 'cyber'].includes(localStorage.getItem('skweladabaw_theme') || '');
  }, []);

  // Map Style state: default to dark if dark theme, else liberty vector
  const [mapStyleId, setMapStyleId] = useState<VectorMapStyleId>(() => {
    return isDarkMode ? 'dark' : 'liberty';
  });

  // Pin placement target when setting origin/dest or saving place
  const [pinPlacementMode, setPinPlacementMode] = useState<'origin' | 'destination' | 'save_place' | null>(() => {
    if (initialSavePlaceType) return 'save_place';
    return null;
  });

  // Ref to always capture latest pin placement mode in map callbacks without stale closures
  const pinPlacementModeRef = useRef<'origin' | 'destination' | 'save_place' | null>(pinPlacementMode);
  pinPlacementModeRef.current = pinPlacementMode;

  // Target place type when saving via pin placement
  const [savePlaceType, setSavePlaceType] = useState<'home' | 'campus' | 'custom'>(() => {
    return initialSavePlaceType || 'home';
  });
  const [savePlaceLabel, setSavePlaceLabel] = useState<string>(() => {
    return initialSavePlaceName || (initialSavePlaceType === 'home' ? 'Home' : 'Saved Place');
  });
  const savePlaceLabelRef = useRef<string>(savePlaceLabel);
  savePlaceLabelRef.current = savePlaceLabel;

  // Pinned location for saving
  const [pendingSaveCoord, setPendingSaveCoord] = useState<LatLng | null>(null);

  // Map & Markers References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isStyleLoaded, setIsStyleLoaded] = useState<boolean>(false);
  const [styleRevision, setStyleRevision] = useState<number>(0);
  const [isMapTilesLoading, setIsMapTilesLoading] = useState<boolean>(true);
  const currentLoadedStyleIdRef = useRef<VectorMapStyleId>(mapStyleId);
  const activeJourneyRef = useRef<TransitJourney | null>(null);
  const activeSingleRouteRef = useRef<GeoJsonFeature | null>(null);

  // HTML Marker References (Independent DOM elements)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userHeadingBeamRef = useRef<HTMLDivElement | null>(null);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerRef = useRef<maplibregl.Marker | null>(null);
  const savePinMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Origin & Destination State
  // Origin is pre-initialized to avoid routing deadlocks
  const [origin, setOrigin] = useState<LatLng>(() => {
    if (initialOrigin) return initialOrigin;
    try {
      const cached = localStorage.getItem('skweladabaw_user_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.lat && parsed.lng) {
          return { name: 'My current location', lat: parsed.lat, lng: parsed.lng };
        }
      }
    } catch {}
    return { name: 'My current location', lat: DEFAULT_ORIGIN_COORD.lat, lng: DEFAULT_ORIGIN_COORD.lng };
  });

  const [destination, setDestination] = useState<LatLng | null>(initialDestination || null);

  const originRef = useRef<LatLng>(origin);
  originRef.current = origin;
  const destinationRef = useRef<LatLng | null>(destination);
  destinationRef.current = destination;

  const isOriginOutOfCoverage = useMemo(() => {
    return origin ? !isInsideDavaoCity(origin.lat, origin.lng) : false;
  }, [origin]);

  const isDestOutOfCoverage = useMemo(() => {
    return destination ? !isInsideDavaoCity(destination.lat, destination.lng) : false;
  }, [destination]);

  const isOutOfCoverage = isOriginOutOfCoverage || isDestOutOfCoverage;

  // Journeys & Routing State
  const [journeys, setJourneys] = useState<TransitJourney[]>([]);
  const [selectedJourneyIndex, setSelectedJourneyIndex] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [scanningPhase, setScanningPhase] = useState<string>('Scanning corridors...');

  // Active Single Route Inspection from directory
  const [activeSingleRoute, setActiveSingleRoute] = useState<GeoJsonFeature | null>(singleRouteFeature || null);

  // Search Modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [searchTargetMode, setSearchTargetMode] = useState<'origin' | 'destination'>('destination');

  // UI Drawer / Step Card expansion
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState<boolean>(false);

  // GPS User location & Navigation Tracking
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const isNavigatingRef = useRef<boolean>(false);
  isNavigatingRef.current = isNavigating;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsModalState, setGpsModalState] = useState<{
    isOpen: boolean;
    type: 'off' | 'denied';
    title: string;
    message: string;
  } | null>(null);

  // Subscribe to device orientation compass heading
  useEffect(() => {
    const unsubscribe = subscribeToDeviceHeading((heading) => {
      if (userHeadingBeamRef.current) {
        userHeadingBeamRef.current.style.transform = `rotate(${heading}deg)`;
      }
    });
    return () => unsubscribe();
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Sync active single route prop
  useEffect(() => {
    setActiveSingleRoute(singleRouteFeature || null);
  }, [singleRouteFeature]);

  // Keep map style in sync with theme changes if style wasn't manually overridden
  useEffect(() => {
    if (mapStyleId === 'liberty' || mapStyleId === 'dark') {
      const nextStyle: VectorMapStyleId = isDarkMode ? 'dark' : 'liberty';
      if (nextStyle !== mapStyleId) {
        setMapStyleId(nextStyle);
      }
    }
  }, [isDarkMode]);

  // Request GPS automatically and keep continuous smooth watch tracking while active
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let watchId: number | null = null;

    const handlePos = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserLocation({ lat, lng });

      // Smoothly update user dot on map
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat]);
      }

      try {
        localStorage.setItem('skweladabaw_user_location', JSON.stringify({ lat, lng }));
      } catch {}

      // If origin is still default center, smoothly initialize to real GPS
      if (originRef.current.lat === DEFAULT_ORIGIN_COORD.lat && originRef.current.lng === DEFAULT_ORIGIN_COORD.lng) {
        setOrigin({ name: 'My current location', lat, lng });
      }

      // If active navigation is turned on, center camera smoothly
      if (isNavigatingRef.current && mapRef.current) {
        mapRef.current.easeTo({
          center: [lng, lat],
          zoom: 17.5,
          pitch: 40,
          duration: 1000
        });
      }
    };

    // 1. Initial immediate location check
    navigator.geolocation.getCurrentPosition(
      handlePos,
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // 2. Continuous real-time movement watching
    try {
      watchId = navigator.geolocation.watchPosition(
        handlePos,
        () => {},
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
    } catch (_) {}

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // MAP INITIALIZATION (MapLibre GL with OpenFreeMap Web Worker)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialStyleObj = MAP_STYLES.find(s => s.id === mapStyleId) || MAP_STYLES[0];
    currentLoadedStyleIdRef.current = initialStyleObj.id;

    const initialCenter: [number, number] = initialDestination 
      ? [initialDestination.lng, initialDestination.lat]
      : (origin ? [origin.lng, origin.lat] : DAVAO_CENTER_LNG_LAT);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyleObj.style,
      center: initialCenter,
      zoom: initialDestination ? 14.5 : 13.5,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    map.on('load', () => {
      registerFootprintImage(map);
      setIsStyleLoaded(true);
      setStyleRevision(r => r + 1);
      map.resize();
    });

    map.on('style.load', () => {
      registerFootprintImage(map);
      setIsStyleLoaded(true);
      setStyleRevision(r => r + 1);
      map.resize();
    });

    map.once('idle', () => {
      setIsMapTilesLoading(false);
    });

    map.on('styledata', () => {
      if (map.isStyleLoaded()) {
        setIsStyleLoaded(true);
        // Ensure sources and layers exist if active journey or route is present
        if (activeJourneyRef.current || activeSingleRouteRef.current) {
          if (!map.getSource('ride-source') && !map.getSource('single-route-source')) {
            setStyleRevision(r => r + 1);
          }
        }
      }
    });

    map.on('webglcontextlost', (e: any) => {
      if (typeof e?.preventDefault === 'function') {
        e.preventDefault();
      }
      console.warn('[JeepTransitMap] WebGL context lost - preventing crash');
    });

    map.on('webglcontextrestored', () => {
      console.info('[JeepTransitMap] WebGL context restored');
      const curStyle = MAP_STYLES.find(s => s.id === currentLoadedStyleIdRef.current) || MAP_STYLES[0];
      map.setStyle(curStyle.style, { diff: false });
    });

    map.on('error', (err) => {
      console.warn('[JeepTransitMap] MapLibre notice:', err?.error?.message || err);
    });

    // Handle map clicks without stale closures
    map.on('click', (e) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;
      const mode = pinPlacementModeRef.current;

      // Automatically unstick/clear single route inspection on new map clicks
      if (activeSingleRouteRef.current) {
        setActiveSingleRoute(null);
        onClearSingleRoute?.();
      }

      if (mode === 'origin') {
        const name = `My location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setOrigin({ name, lat, lng });
        setPinPlacementMode(null);
        showToast('My location placed on map');
      } else if (mode === 'destination') {
        const name = `Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setDestination({ name, lat, lng });
        setPinPlacementMode(null);
        showToast('Destination placed on map');
      } else if (mode === 'save_place') {
        setPendingSaveCoord({ name: savePlaceLabelRef.current, lat, lng });
        showToast('Pin placed. Tap "Confirm & Save" below.');
      } else {
        // Free Map Tap: Dropping destination pin
        const name = `Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setDestination({ name, lat, lng });
        showToast('Destination placed on map');
      }
    });

    mapRef.current = map;

    return () => {
      try {
        originMarkerRef.current?.remove();
        destMarkerRef.current?.remove();
        pickupMarkerRef.current?.remove();
        dropoffMarkerRef.current?.remove();
        userMarkerRef.current?.remove();
        savePinMarkerRef.current?.remove();
      } catch {}
      originMarkerRef.current = null;
      destMarkerRef.current = null;
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      userMarkerRef.current = null;
      savePinMarkerRef.current = null;

      try {
        map.remove();
      } catch {}
      mapRef.current = null;
      setIsStyleLoaded(false);
    };
  }, []);

  // Handle map style changes dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (currentLoadedStyleIdRef.current === mapStyleId) return;

    currentLoadedStyleIdRef.current = mapStyleId;
    setIsStyleLoaded(false);
    setIsMapTilesLoading(true);

    const styleObj = MAP_STYLES.find(s => s.id === mapStyleId);
    if (!styleObj) return;

    // Use diff: false so MapLibre reliably reconstructs the style and triggers style.load
    map.setStyle(styleObj.style, { diff: false });

    const onStyleReady = () => {
      setIsStyleLoaded(true);
      setIsMapTilesLoading(false);
      setStyleRevision(r => r + 1);
    };

    map.once('style.load', onStyleReady);
    map.once('idle', () => setIsMapTilesLoading(false));
  }, [mapStyleId]);

  // Handle ResizeObserver for reliable canvas dimensions
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Resilient GPS Geolocation acquisition with Life360/Google Maps-style location prompt
  const handleLocateUser = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showToast('Geolocation is not supported on this device.');
      return;
    }

    setIsLocating(true);
    showToast('Locating...');

    const applyLocation = (lat: number, lng: number, toastText = 'Location updated') => {
      setIsLocating(false);
      setUserLocation({ lat, lng });
      setOrigin({ name: 'My current location', lat, lng });

      try {
        localStorage.setItem('skweladabaw_user_location', JSON.stringify({ lat, lng }));
      } catch {}

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 15,
          duration: 700
        });
      }

      // Render pulsating user location ring with directional compass arrow
      try {
        if (!userMarkerRef.current && mapRef.current) {
          const el = document.createElement('div');
          el.style.width = '44px';
          el.style.height = '44px';
          el.style.pointerEvents = 'none';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.position = 'relative';

          // Directional heading arrow beam
          const beam = document.createElement('div');
          beam.style.position = 'absolute';
          beam.style.width = '44px';
          beam.style.height = '44px';
          beam.style.pointerEvents = 'none';
          beam.style.transform = 'rotate(0deg)';
          beam.style.transition = 'transform 0.15s ease-out';
          beam.innerHTML = `
            <svg viewBox="0 0 44 44" width="44" height="44" fill="none">
              <path d="M22 2 L28 16 L22 12 L16 16 Z" fill="#3B82F6" opacity="0.95" />
              <path d="M22 2 L38 22 A22 22 0 0 1 6 22 Z" fill="#3B82F6" opacity="0.18" />
            </svg>
          `;
          userHeadingBeamRef.current = beam;
          el.appendChild(beam);

          // Center blue location dot
          const dot = document.createElement('div');
          dot.style.position = 'relative';
          dot.style.display = 'flex';
          dot.style.alignItems = 'center';
          dot.style.justifyContent = 'center';
          dot.innerHTML = `
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 18px; height: 18px; border-radius: 9999px; background: #3B82F6; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
          `;
          el.appendChild(dot);

          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(mapRef.current);
        } else if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([lng, lat]);
        }
      } catch {}

      showToast(toastText);
    };

    // 1. Direct native Android/Capacitor path
    if (Capacitor.isNativePlatform()) {
      try {
        const diag = await diagnoseLocationStatus();
        if (!diag.isPermitted) {
          setIsLocating(false);
          setGpsModalState({
            isOpen: true,
            type: 'denied',
            title: 'Location Permission Needed',
            message: 'Location access is required to pinpoint your stop and recommend jeeps. Please allow location permissions in device settings.'
          });
          return;
        }
        if (!diag.isGpsEnabled) {
          setIsLocating(false);
          setGpsModalState({
            isOpen: true,
            type: 'off',
            title: 'Turn On Device Location',
            message: "Your phone's Location (GPS) is turned off. To see your current position on the map, turn on your device's location service."
          });
          return;
        }

        const nativePos = await WidgetBridge.getCurrentLocation();
        if (nativePos && typeof nativePos.lat === 'number' && typeof nativePos.lng === 'number') {
          applyLocation(nativePos.lat, nativePos.lng, 'Location acquired');
          return;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err || '');
        if (errMsg.includes('denied') || errMsg.includes('permission')) {
          setIsLocating(false);
          setGpsModalState({
            isOpen: true,
            type: 'denied',
            title: 'Location Permission Needed',
            message: 'Location access is required to pinpoint your stop and recommend jeeps. Please allow location permissions in device settings.'
          });
          return;
        }
        if (errMsg.includes('disabled') || errMsg.includes('Location services are disabled')) {
          setIsLocating(false);
          setGpsModalState({
            isOpen: true,
            type: 'off',
            title: 'Turn On Device Location',
            message: "Your phone's Location (GPS) is turned off. To see your current position on the map, turn on your device's location service."
          });
          return;
        }
      }
    }

    // 2. Standard Web/Browser Geolocation fallback
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          setIsLocating(false);
          setGpsModalState({
            isOpen: true,
            type: 'denied',
            title: 'Location Permission Needed',
            message: 'SkwelaDabaw needs location permission to calculate transit journeys and display your position. Please enable location permissions in settings.'
          });
          return;
        }
      } catch {}
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocation(pos.coords.latitude, pos.coords.longitude, 'Location acquired');
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsModalState({
            isOpen: true,
            type: 'denied',
            title: 'Location Permission Needed',
            message: 'Location access is required to pinpoint your stop and recommend jeeps. Please allow location permissions in device settings.'
          });
        } else if (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT) {
          setGpsModalState({
            isOpen: true,
            type: 'off',
            title: 'Turn On Device Location',
            message: "Your phone's Location (GPS) is turned off. To see your current position on the map, turn on your device's location service."
          });
        } else {
          setGpsModalState({
            isOpen: true,
            type: 'off',
            title: 'Location Unavailable',
            message: 'Unable to acquire a location fix. Please verify device Location is enabled in settings and try again.'
          });
        }
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );
  }, [showToast]);

  // Handle destination selection without conflicting camera animations
  const handleSelectDestination = useCallback((dest: LatLng) => {
    setActiveSingleRoute(null);
    onClearSingleRoute?.();
    setDestination(dest);

    // If origin is not set, fly directly to destination.
    // If origin IS set, do not trigger a conflicting flyTo animation
    // because the layer manager's fitBounds will frame both points together.
    if (!originRef.current && mapRef.current) {
      mapRef.current.flyTo({
        center: [dest.lng, dest.lat],
        zoom: 15,
        duration: 800
      });
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // PIXEL-PERFECT MARKER RENDERING (NO TAILWIND CLASS CONFLICTS)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Origin Marker (Green 'A' Pin)
    if (origin) {
      if (!originMarkerRef.current) {
        const el = document.createElement('div');
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        el.innerHTML = `
          <div style="width: 28px; height: 28px; border-radius: 9999px; background: #10B981; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 11px; font-family: system-ui, sans-serif;">
            A
          </div>
        `;
        originMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map);
      } else {
        originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
      }
    } else {
      originMarkerRef.current?.remove();
      originMarkerRef.current = null;
    }

    // 2. Destination Marker (Blue 'B' Pin with Pulsing Radar Ring)
    if (destination) {
      if (!destMarkerRef.current) {
        const el = document.createElement('div');
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        el.innerHTML = `
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 9999px; background: rgba(37, 99, 235, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; border-radius: 9999px; background: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 900; font-size: 11px; font-family: system-ui, sans-serif; position: relative;">
            B
          </div>
        `;
        destMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);
      } else {
        destMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      }
    } else {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
    }
  }, [origin, destination]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PACED ASYNCHRONOUS ROUTE SCANNING (Anti-Lag Architecture)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!origin || !destination) {
      setJourneys([]);
      setSelectedJourneyIndex(0);
      setIsCalculating(false);
      return;
    }

    let isCancelled = false;
    setIsCalculating(true);
    setJourneys([]);
    setSelectedJourneyIndex(0);
    setScanningPhase('Scanning transit corridors...');

    const timer = setTimeout(async () => {
      try {
        setScanningPhase('Checking nearby pickup points...');
        await new Promise(r => setTimeout(r, 180));

        if (isCancelled) return;
        setScanningPhase('Looking for best routes...');

        const results = await planTransitJourneys(origin, destination);

        await new Promise(r => setTimeout(r, 180));

        if (isCancelled) return;
        setJourneys(results);
        setSelectedJourneyIndex(0);
        setIsCalculating(false);

        if (origin.name && destination.name) {
          addRecentTrip({
            originName: origin.name,
            originLat: origin.lat,
            originLng: origin.lng,
            destName: destination.name,
            destLat: destination.lat,
            destLng: destination.lng
          });
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('[JeepTransitMap] Planning error:', err);
        setJourneys([]);
        setIsCalculating(false);
      }
    }, 280);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [origin, destination]);

  const activeJourney = useMemo(() => {
    if (journeys.length === 0) return null;
    return journeys[selectedJourneyIndex] || journeys[0];
  }, [journeys, selectedJourneyIndex]);

  activeJourneyRef.current = activeJourney;
  activeSingleRouteRef.current = activeSingleRoute;

  const handleShareActiveJourneyToChat = () => {
    if (!activeJourney) return;
    const payload = {
      routeId: activeJourney.id,
      routeName: activeJourney.summaryTitle,
      fromName: origin?.name || 'Pickup Point',
      toName: destination?.name || 'Destination Point',
      estimatedFare: `₱${(activeJourney.totalStudentFare ?? 0).toFixed(2)}`
    };
    try {
      localStorage.setItem('skweladabaw_shared_route_to_view', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('skweladabaw_navigate_tab', { detail: { tab: 'chat', shareRoute: payload } }));
      showToast('Route shared to Student Community Chat!');
    } catch (_) {}
  };

  const handleToggleNavigating = () => {
    if (!isNavigating) {
      setIsNavigating(true);
      showToast('Live navigation active');
      if (userLocation && mapRef.current) {
        mapRef.current.easeTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: 17.5,
          pitch: 45,
          duration: 1000
        });
      } else {
        handleLocateUser();
      }
    } else {
      setIsNavigating(false);
      showToast('Navigation ended');
      if (mapRef.current) {
        mapRef.current.easeTo({
          pitch: 0,
          zoom: 14.5,
          duration: 800
        });
      }
    }
  };

  const lastFramedJourneyIdRef = useRef<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // ROBUST GeoJSON SOURCE & LAYER MANAGER (ZERO CRASHES / ZERO CONFLICTS)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isStyleLoaded || !map.isStyleLoaded()) {
      const handleStyleData = () => {
        if (map.isStyleLoaded()) {
          setIsStyleLoaded(true);
          setStyleRevision(r => r + 1);
        }
      };
      map.once('styledata', handleStyleData);
      return () => {
        map.off('styledata', handleStyleData);
      };
    }

    // Safe helper that updates data if source exists or creates source+layers if not
    const setSourceData = (
      sourceId: string, 
      layerConfigs: { id: string; type: 'line' | 'symbol' | string; layout?: any; paint?: any }[], 
      data: any
    ) => {
      try {
        const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existing) {
          existing.setData(data);
          layerConfigs.forEach(cfg => {
            if (!map.getLayer(cfg.id)) {
              map.addLayer({
                id: cfg.id,
                type: cfg.type as any,
                source: sourceId as any,
                layout: cfg.layout || { 'line-join': 'round', 'line-cap': 'round' },
                paint: cfg.paint || {}
              } as any);
            }
          });
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data
          });
          layerConfigs.forEach(cfg => {
            if (!map.getLayer(cfg.id)) {
              map.addLayer({
                id: cfg.id,
                type: cfg.type as any,
                source: sourceId as any,
                layout: cfg.layout || { 'line-join': 'round', 'line-cap': 'round' },
                paint: cfg.paint || {}
              } as any);
            }
          });
        }
      } catch (srcErr) {
        console.warn(`[JeepTransitMap] Source/layer update error (${sourceId}):`, srcErr);
      }
    };

    try {
      // Clean up transit leg markers safely
      try {
        pickupMarkerRef.current?.remove();
        dropoffMarkerRef.current?.remove();
      } catch {}
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;

      // Define Layer Specifications
      const singleRouteLayers = [
        {
          id: 'single-route-casing',
          type: 'line' as const,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#FFFFFF', 'line-width': 7.5, 'line-opacity': 0.85 }
        },
        {
          id: 'single-route-core',
          type: 'line' as const,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ['coalesce', ['get', 'color'], '#10B981'], 'line-width': 5, 'line-opacity': 0.95 }
        }
      ];

      // Ensure pedestrian footprint image is registered on the active map canvas
      registerFootprintImage(map);

      const walkLayers = [
        {
          id: 'walk-lines-casing',
          type: 'line' as const,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 
            'line-color': isDarkMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)', 
            'line-width': 5.0, 
            'line-opacity': 0.6 
          }
        },
        {
          id: 'walk-lines-path',
          type: 'line' as const,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#3B82F6',
            'line-width': 2.0,
            'line-opacity': 0.45
          }
        },
        {
          id: 'walk-shoe-trail',
          type: 'symbol' as const,
          layout: {
            'symbol-placement': 'line',
            'symbol-spacing': 26,
            'icon-image': 'pedestrian-footprint',
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              13, 0.45,
              15, 0.65,
              17, 0.85
            ],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            'icon-keep-upright': false
          }
        }
      ];

      const rideLayers = [
        {
          id: 'ride-lines-casing',
          type: 'line' as const,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 
            'line-color': '#FFFFFF', 
            'line-width': 8.5, 
            'line-opacity': 0.9 
          }
        },
        {
          id: 'ride-lines',
          type: 'line' as const,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#10B981'],
            'line-width': 5.5,
            'line-opacity': 0.98
          }
        }
      ];

      // 1. Single Route Tracking Inspection Mode (only when not actively planning an origin-to-destination journey)
      const isTrackingSingleRoute = Boolean(activeSingleRoute && activeSingleRoute.geometry?.coordinates && (!origin || !destination));

      if (isTrackingSingleRoute && activeSingleRoute && activeSingleRoute.geometry?.coordinates) {
        const coords = activeSingleRoute.geometry.coordinates; // [lng, lat][]
        const routeColor = activeSingleRoute.properties.color || '#10B981';

        setSourceData('single-route-source', singleRouteLayers, {
          type: 'Feature',
          properties: { color: routeColor },
          geometry: {
            type: 'LineString',
            coordinates: coords
          }
        });

        // Clear transit journey sources
        setSourceData('walk-source', walkLayers, { type: 'FeatureCollection', features: [] });
        setSourceData('ride-source', rideLayers, { type: 'FeatureCollection', features: [] });

        const bounds = new maplibregl.LngLatBounds();
        coords.forEach(pt => {
          if (Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
            bounds.extend(pt as [number, number]);
          }
        });
        if (!bounds.isEmpty()) {
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          if (Math.abs(sw.lat - ne.lat) < 0.0001 && Math.abs(sw.lng - ne.lng) < 0.0001) {
            map.easeTo({ center: [sw.lng, sw.lat], zoom: 14, duration: 600 });
          } else {
            map.fitBounds(bounds, { 
              padding: { top: 120, bottom: 180, left: 40, right: 40 }, 
              duration: 800,
              minZoom: 11,
              maxZoom: 16
            });
          }
        }
        return;
      } else {
        // Clear single route if not active
        setSourceData('single-route-source', singleRouteLayers, { type: 'FeatureCollection', features: [] });
      }

      // 2. Active Transit Journey Rendering
      if (activeJourney && activeJourney.legs && activeJourney.legs.length > 0) {
        const walkFeatures: any[] = [];
        const rideFeatures: any[] = [];
        const allLngLats: [number, number][] = [];

        let pickupCoord: [number, number] | null = null;
        let dropoffCoord: [number, number] | null = null;

        activeJourney.legs.forEach(leg => {
          if (!leg.geometry || leg.geometry.length < 2) return;

          // Convert [lat, lng][] to GeoJSON [lng, lat][]
          const geoCoords: [number, number][] = leg.geometry
            .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
            .map(([lat, lng]) => [lng, lat]);
          
          if (geoCoords.length < 2) return;
          allLngLats.push(...geoCoords);

          if (leg.type === 'walk' || leg.type === 'transfer') {
            walkFeatures.push({
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: geoCoords }
            });
          } else if (leg.type === 'ride') {
            rideFeatures.push({
              type: 'Feature',
              properties: { color: leg.color || '#10B981' },
              geometry: { type: 'LineString', coordinates: geoCoords }
            });

            if (!pickupCoord && leg.fromCoords && Number.isFinite(leg.fromCoords[0]) && Number.isFinite(leg.fromCoords[1])) {
              pickupCoord = [leg.fromCoords[1], leg.fromCoords[0]];
            }
            if (leg.toCoords && Number.isFinite(leg.toCoords[0]) && Number.isFinite(leg.toCoords[1])) {
              dropoffCoord = [leg.toCoords[1], leg.toCoords[0]];
            }
          }
        });

        // Update Walking Layer
        setSourceData('walk-source', walkLayers, {
          type: 'FeatureCollection',
          features: walkFeatures
        });

        // Update Vehicle Ride Layer
        setSourceData('ride-source', rideLayers, {
          type: 'FeatureCollection',
          features: rideFeatures
        });

        // Suggested Pickup Point (Amber Ring Pin where Jeep Ride Begins)
        if (pickupCoord && Number.isFinite(pickupCoord[0]) && Number.isFinite(pickupCoord[1])) {
          try {
            const pickEl = document.createElement('div');
            pickEl.style.width = '30px';
            pickEl.style.height = '30px';
            pickEl.style.display = 'flex';
            pickEl.style.alignItems = 'center';
            pickEl.style.justifyContent = 'center';
            pickEl.innerHTML = `
              <div style="width: 26px; height: 26px; border-radius: 9999px; background: #F59E0B; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4-.2-.8-.6-.9h-18c-.4.1-.7.5-.6.9.3 1.1.8 2.8.8 2.8h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
              </div>
            `;
            pickupMarkerRef.current = new maplibregl.Marker({ element: pickEl })
              .setLngLat(pickupCoord)
              .addTo(map);
          } catch {}
        }

        // Suggested Drop-off Point (Sky Blue Pin where Jeep Ride Ends)
        if (dropoffCoord && Number.isFinite(dropoffCoord[0]) && Number.isFinite(dropoffCoord[1])) {
          try {
            const dropEl = document.createElement('div');
            dropEl.style.width = '30px';
            dropEl.style.height = '30px';
            dropEl.style.display = 'flex';
            dropEl.style.alignItems = 'center';
            dropEl.style.justifyContent = 'center';
            dropEl.innerHTML = `
              <div style="width: 26px; height: 26px; border-radius: 9999px; background: #0EA5E9; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </div>
            `;
            dropoffMarkerRef.current = new maplibregl.Marker({ element: dropEl })
              .setLngLat(dropoffCoord)
              .addTo(map);
          } catch {}
        }

        // Fit Camera to entire route journey with safe bounded box (only when route selection changes)
        if (allLngLats.length > 0 && lastFramedJourneyIdRef.current !== activeJourney.id) {
          lastFramedJourneyIdRef.current = activeJourney.id;
          const bounds = new maplibregl.LngLatBounds();
          allLngLats.forEach(pt => {
            if (Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]) &&
                pt[0] >= 125.2 && pt[0] <= 125.8 && pt[1] >= 6.8 && pt[1] <= 7.4) {
              bounds.extend(pt);
            }
          });
          if (!bounds.isEmpty()) {
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            if (Math.abs(sw.lat - ne.lat) < 0.0001 && Math.abs(sw.lng - ne.lng) < 0.0001) {
              map.easeTo({ center: [sw.lng, sw.lat], zoom: 15, duration: 500 });
            } else {
              const container = map.getContainer();
              const cHeight = container?.clientHeight || 600;
              const cWidth = container?.clientWidth || 400;
              const padTop = Math.min(120, Math.floor(cHeight * 0.18));
              const padBottom = Math.min(240, Math.floor(cHeight * 0.34));
              const padSide = Math.min(40, Math.floor(cWidth * 0.1));
              map.stop();
              map.fitBounds(bounds, { 
                padding: { top: padTop, bottom: padBottom, left: padSide, right: padSide }, 
                duration: 600,
                minZoom: 11,
                maxZoom: 16
              });
            }
          }
        }
        return;
      } else {
        // Clear lines if no active journey
        setSourceData('walk-source', walkLayers, { type: 'FeatureCollection', features: [] });
        setSourceData('ride-source', rideLayers, { type: 'FeatureCollection', features: [] });
      }

      // 3. If origin and destination are both set but journey is computing: safely fit bounds without antimeridian wrapping
      if (origin && destination && !activeJourney) {
        if (
          Number.isFinite(origin.lng) && Number.isFinite(origin.lat) &&
          Number.isFinite(destination.lng) && Number.isFinite(destination.lat) &&
          origin.lng >= 125.2 && origin.lng <= 125.8 && origin.lat >= 6.8 && origin.lat <= 7.4 &&
          destination.lng >= 125.2 && destination.lng <= 125.8 && destination.lat >= 6.8 && destination.lat <= 7.4
        ) {
          const bounds = new maplibregl.LngLatBounds();
          bounds.extend([origin.lng, origin.lat]);
          bounds.extend([destination.lng, destination.lat]);
          if (!bounds.isEmpty()) {
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            if (Math.abs(sw.lat - ne.lat) < 0.0001 && Math.abs(sw.lng - ne.lng) < 0.0001) {
              map.easeTo({ center: [sw.lng, sw.lat], zoom: 14, duration: 500 });
            } else {
              const container = map.getContainer();
              const cHeight = container?.clientHeight || 600;
              const cWidth = container?.clientWidth || 400;
              const padTop = Math.min(120, Math.floor(cHeight * 0.18));
              const padBottom = Math.min(220, Math.floor(cHeight * 0.32));
              const padSide = Math.min(40, Math.floor(cWidth * 0.1));
              map.stop();
              map.fitBounds(bounds, { 
                padding: { top: padTop, bottom: padBottom, left: padSide, right: padSide }, 
                duration: 600,
                minZoom: 11,
                maxZoom: 15
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[JeepTransitMap] Layer render error caught safely:', err);
    }
  }, [isStyleLoaded, styleRevision, activeJourney, activeSingleRoute, origin, destination, isDarkMode, mapStyleId]);

  // Render Pin Placement Marker for saving places
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pendingSaveCoord) {
      if (!savePinMarkerRef.current) {
        const el = document.createElement('div');
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.innerHTML = `
          <div style="width: 28px; height: 28px; border-radius: 9999px; background: #10B981; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #FFFFFF; animation: bounce 1s infinite;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `;

        savePinMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([pendingSaveCoord.lng, pendingSaveCoord.lat])
          .addTo(map);
      } else {
        savePinMarkerRef.current.setLngLat([pendingSaveCoord.lng, pendingSaveCoord.lat]);
      }
    } else {
      savePinMarkerRef.current?.remove();
      savePinMarkerRef.current = null;
    }
  }, [pendingSaveCoord]);

  // Confirm saving pinned place
  const handleConfirmSavePlace = () => {
    if (!pendingSaveCoord) return;

    savePlace({
      id: `place-${Date.now()}`,
      type: savePlaceType,
      name: savePlaceLabel || (savePlaceType === 'home' ? 'Home' : 'Saved Place'),
      address: `Davao City (${pendingSaveCoord.lat.toFixed(4)}, ${pendingSaveCoord.lng.toFixed(4)})`,
      lat: pendingSaveCoord.lat,
      lng: pendingSaveCoord.lng,
      updatedAt: new Date().toISOString()
    });

    showToast(`${savePlaceLabel || 'Location'} saved to your places!`);
    setPendingSaveCoord(null);
    setPinPlacementMode(null);
  };

  // Zoom controls
  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 });

  return (
    <div className="relative w-full h-full min-h-[100dvh] overflow-hidden select-none bg-[var(--canvas-bg)]">
      {/* 1. MAPLIBRE GL CANVAS */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* 2. INITIAL MAP & TILE LOADING OVERLAY (Zero Black Screen Flashes) */}
      {(!isStyleLoaded || isMapTilesLoading) && (
        <div 
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm pointer-events-none transition-opacity duration-300"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/95 dark:bg-slate-800/95 shadow-xl border border-slate-200/80 dark:border-slate-700/80">
            <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Loading Davao City map...
            </span>
          </div>
        </div>
      )}

      {/* 2. TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-2xl bg-black/85 text-white text-xs font-semibold backdrop-blur-md shadow-xl border border-white/10 animate-fade-in pointer-events-none text-center max-w-[85vw] truncate">
          {toastMessage}
        </div>
      )}

      {/* 3. PIN PLACEMENT MODE BANNER */}
      {pinPlacementMode && (
        <div className="absolute top-4 left-4 right-4 z-[75] flex items-center justify-between p-3.5 rounded-2xl bg-[var(--card-bg)] text-[var(--text-primary)] backdrop-blur-md border border-[var(--card-border)] shadow-2xl animate-modal-pop-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {pinPlacementMode === 'save_place' 
                  ? `Tap on map to set ${savePlaceLabel}` 
                  : `Tap anywhere to set ${pinPlacementMode === 'origin' ? 'My location' : 'Destination'}`}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">Move map and tap to drop exact coordinate</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pendingSaveCoord && pinPlacementMode === 'save_place' && (
              <button
                type="button"
                onClick={handleConfirmSavePlace}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all pressable"
              >
                Confirm & Save
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPinPlacementMode(null);
                setPendingSaveCoord(null);
              }}
              className="p-1.5 rounded-xl bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. TOP CONTROLS & COMPACT SEARCH BAR */}
      {!pinPlacementMode && (
        <div className="absolute top-4 left-4 right-4 z-[70] flex flex-col gap-2 max-w-lg mx-auto">
          {/* Main Directions Header */}
          <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl backdrop-blur-md flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {/* Origin / Destination Quick Row */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {/* Origin (My Current Location) */}
                <div 
                  onClick={() => {
                    setSearchTargetMode('origin');
                    setIsSearchModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] cursor-pointer hover:border-[var(--card-hover-border)] transition-all min-w-0"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate flex-1">
                    {origin?.name || 'My current location'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLocateUser();
                    }}
                    className="text-[10px] font-bold text-emerald-500 hover:underline shrink-0"
                  >
                    GPS
                  </button>
                </div>

                {/* Destination */}
                <div 
                  onClick={() => {
                    setSearchTargetMode('destination');
                    setIsSearchModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] cursor-pointer hover:border-[var(--card-hover-border)] transition-all min-w-0"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className={`text-xs font-semibold truncate flex-1 ${destination ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)]'}`}>
                    {destination?.name || 'Where to? (e.g. SM Ecoland, Ateneo, Toril)'}
                  </span>
                  <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                </div>
              </div>

              {/* Pin Mode Dropdown / Toggle */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  title="Swap Points"
                  onClick={() => {
                    if (destination) {
                      const temp = origin;
                      setOrigin(destination);
                      setDestination(temp);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--card-border)] transition-all pressable"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Drop Pin on Map"
                  onClick={() => setPinPlacementMode('destination')}
                  className="p-1.5 rounded-lg bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--card-border)] transition-all pressable"
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Active single route banner */}
            {activeSingleRoute && (
              <div className="pt-2 border-t border-[var(--card-border)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: activeSingleRoute.properties.color || '#10B981' }} 
                  />
                  <span className="font-bold text-[var(--text-primary)] truncate">
                    {activeSingleRoute.properties.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSingleRoute(null);
                    onClearSingleRoute?.();
                  }}
                  className="text-[11px] font-semibold text-rose-400 hover:underline shrink-0"
                >
                  Clear Route
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Tracked Route Floating Banner (Accessible in both full-screen & normal modes) */}
      {activeSingleRoute && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 bg-[var(--card-bg)]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-sky-500/40 shadow-lg animate-fade-in max-w-[90vw]">
          <span 
            className="w-2.5 h-2.5 rounded-full shrink-0" 
            style={{ backgroundColor: activeSingleRoute.properties.color || '#10B981' }} 
          />
          <span className="text-xs font-bold text-[var(--text-primary)] max-w-[160px] sm:max-w-xs truncate">
            {activeSingleRoute.properties.name}
          </span>
          <button
            type="button"
            onClick={handleToggleNavigating}
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full pressable shrink-0 ${
              isNavigating 
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
            }`}
          >
            <Navigation className="w-3 h-3" />
            <span>{isNavigating ? 'Stop' : 'Start Nav'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSingleRoute(null);
              onClearSingleRoute?.();
            }}
            className="ml-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 pressable shrink-0"
          >
            Exit Tracking
          </button>
        </div>
      )}

      {/* 5. RIGHT FLOATING CONTROLS */}
      <div className="absolute right-4 top-48 z-[75] flex flex-col gap-2">
        {/* Recenter GPS Crosshair */}
        <button
          type="button"
          onClick={handleLocateUser}
          title="Recenter to My Location"
          disabled={isLocating}
          className="w-10 h-10 rounded-2xl bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-xl flex items-center justify-center hover:bg-[var(--nested-bg)] transition-all active:scale-95 pressable"
        >
          {isLocating ? (
            <RotateCw className="w-4 h-4 text-emerald-500 animate-spin" />
          ) : (
            <Crosshair className="w-4 h-4 text-emerald-500" />
          )}
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-10 h-10 rounded-2xl bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-xl flex items-center justify-center hover:bg-[var(--nested-bg)] transition-all active:scale-95 pressable"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-10 h-10 rounded-2xl bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-xl flex items-center justify-center hover:bg-[var(--nested-bg)] transition-all active:scale-95 pressable"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Style Switcher Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
            title="Map Style"
            className="w-10 h-10 rounded-2xl bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-xl flex items-center justify-center hover:bg-[var(--nested-bg)] transition-all active:scale-95 pressable"
          >
            <Layers className="w-4 h-4 text-sky-400" />
          </button>

          {isStyleMenuOpen && (
            <div className="absolute right-12 top-0 w-48 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl p-1.5 flex flex-col gap-1 z-[80] animate-modal-pop-in">
              {MAP_STYLES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setMapStyleId(s.id);
                    setIsStyleMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    mapStyleId === s.id 
                      ? 'bg-[var(--nested-bg)] text-[var(--accent-color)] font-bold' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {mapStyleId === s.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. BOTTOM JOURNEY DRAWER & STEP CARD (Matching Screenshot 2) */}
      {isCalculating && (
        <div className="absolute bottom-6 left-4 right-4 z-[70] max-w-lg mx-auto p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <RotateCw className="w-5 h-5 text-emerald-500 animate-spin shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{scanningPhase}</p>
            <p className="text-[10.5px] text-[var(--text-muted)]">Looking for best routes and walking paths...</p>
          </div>
        </div>
      )}

      {/* OUT OF DAVAO CITY COVERAGE WARNING */}
      {isOutOfCoverage && !isCalculating && (
        <div className="absolute bottom-6 left-4 right-4 z-[75] max-w-lg mx-auto p-4 rounded-3xl bg-[var(--card-bg)] border border-amber-500/40 shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                These Marked Locations Are Out of This App's Ability
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                SkwelaDabaw routes jeepneys and buses within Davao City. For locations outside Davao City, please refer to Google Maps.
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${origin?.lat || 7.0705},${origin?.lng || 125.6139}&destination=${destination ? `${destination.lat},${destination.lng}` : ''}&travelmode=transit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all pressable mt-1"
              >
                <span>Use Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {!isCalculating && !isOutOfCoverage && activeJourney && (
        <div className="absolute bottom-4 left-4 right-4 z-[70] max-w-lg mx-auto">
          <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl overflow-hidden backdrop-blur-md transition-all">
            {/* JOURNEY OPTION SWITCHER (If Multiple Transits Available) */}
            {journeys.length > 1 && (
              <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--card-border)]/50">
                {journeys.map((j, idx) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setSelectedJourneyIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all pressable ${
                      selectedJourneyIndex === idx
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>{j.summaryTitle}</span>
                    <span className="opacity-75 ml-1">({j.totalMinutes ?? 0}m)</span>
                  </button>
                ))}
              </div>
            )}

            {/* STEP 1 HIGHLIGHT CARD (Screenshot 2 Match) */}
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {activeJourney.legs?.[0]?.type === 'walk' ? 'STEP 1 • WALK TO PICKUP' : 'STEP 1 • BOARD TRANSIT'}
                </span>

                <span className="text-xs font-bold text-[var(--text-primary)]">
                  ₱{(activeJourney.totalStudentFare ?? 0).toFixed(2)} Student Fare
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-[var(--text-primary)] truncate">
                    {activeJourney.legs?.[0]?.toName || 'Suggested pickup point'}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{activeJourney.totalMinutes ?? 0} min total</span>
                    <span>•</span>
                    <Footprints className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{activeJourney.totalWalkingMeters ?? 0}m walk</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                  className="p-2 rounded-xl bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all pressable"
                >
                  {isDrawerExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>

              {/* WALKING / TRIKE ADVICE FOR WALKS > 500m */}
              {activeJourney.legs?.[0]?.type === 'walk' && (activeJourney.legs?.[0]?.distanceMeters || 0) > 500 && (
                <div className="mt-1 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <Footprints className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <span className="leading-relaxed">
                    Walk or ride a Trike / Bao-Bao / Tricycle to the suggested pickup point ({activeJourney.legs[0].distanceMeters}m walk) or check the map.
                  </span>
                </div>
              )}

              {/* Action Buttons: Start Navigating & Share Route */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleToggleNavigating}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm pressable ${
                    isNavigating 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 animate-pulse'
                      : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-95'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isNavigating ? 'Stop Navigating' : 'Start Navigating'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareActiveJourneyToChat}
                  className="py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] border border-[var(--nested-border)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-all pressable"
                  title="Share Route to Chat"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-500" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>

              {/* EXPANDABLE FULL JOURNEY LEGS & COMMUTER ADVICE */}
              {isDrawerExpanded && (
                <div className="pt-3 border-t border-[var(--card-border)]/60 flex flex-col gap-2.5 max-h-60 overflow-y-auto no-scrollbar">
                  {(activeJourney.legs || []).map((leg, lIdx) => (
                    <div key={leg.id || lIdx} className="flex items-start gap-2.5 text-xs">
                      <div className="w-6 h-6 rounded-lg bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center shrink-0 mt-0.5">
                        {leg.type === 'walk' ? (
                          <Footprints className="w-3 h-3 text-sky-400" />
                        ) : (
                          <Bus className="w-3 h-3" style={{ color: leg.color || '#10B981' }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-[var(--text-primary)] truncate">
                            {leg.type === 'walk' 
                              ? (leg.distanceMeters > 500 ? `Walk / Trike to ${leg.toName}` : `Walk to ${leg.toName}`)
                              : leg.type === 'transfer'
                                ? `Walk to transfer: ${leg.toName}`
                                : `Ride ${leg.routeCode || leg.routeName || 'Jeepney'}`}
                          </p>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                            {leg.durationMinutes ?? 1} min
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[var(--text-secondary)] truncate">
                          {leg.fromName} ➔ {leg.toName}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* COMMUTER ADVICE TIPS */}
                  <div className="mt-2 pt-2.5 border-t border-[var(--card-border)]/50 flex flex-col gap-2">
                    <div className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                      <span>
                        Most recommended pick-up and drop-off points are estimated. If you don't know anything about the place, feel free to ask local citizens around you first.
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>
                        If you find it hard looking for the right jeep in real life, there is no problem asking jeepney drivers—you can ask them anytime.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. SEARCH MODAL FOR MY LOCATION & DESTINATION */}
      <JeepSchoolSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        targetMode={searchTargetMode}
        onChangeTargetMode={(mode) => setSearchTargetMode(mode)}
        onPickOnMap={() => setPinPlacementMode(searchTargetMode)}
        onSelectPlace={(place, mode) => {
          setActiveSingleRoute(null);
          onClearSingleRoute?.();
          if (mode === 'origin') {
            setOrigin(place);
            showToast(`My location set: ${place.name}`);
          } else {
            handleSelectDestination(place);
            showToast(`Destination set: ${place.name}`);
          }
        }}
        currentOriginName={origin?.name}
        currentDestName={destination?.name}
      />

      {/* Google Maps / Life360-Style Location Request Modal */}
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

export default JeepTransitMap;
