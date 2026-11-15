import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Plus, 
  Minus, 
  Crosshair, 
  Bus, 
  MapPin, 
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { TransitJourney, JourneyLeg } from '../../utils/davaoTransitRouter';

export interface JeepVectorMapProps {
  journey?: TransitJourney | null;
  singleRouteGeometry?: [number, number][] | null; // [lat, lng][]
  singleRouteColor?: string;
  singleRouteName?: string;
  userLocation?: { lat: number; lng: number } | null;
  isDark?: boolean;
  className?: string;
  onSelectLeg?: (leg: JourneyLeg) => void;
}

const DAVAO_CENTER: [number, number] = [125.6128, 7.0734]; // [lng, lat]
const MAPTILER_DATAVIZ_STYLE = 'https://api.maptiler.com/maps/dataviz-v4/style.json?key=lYkPykoYvdzqXhWuo3Wa';
const MAPTILER_HYBRID_STYLE = 'https://api.maptiler.com/maps/hybrid-v4/style.json?key=lYkPykoYvdzqXhWuo3Wa';

const createOfflineBlankStyle = (dark: boolean): maplibregl.StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': dark ? '#0f172a' : '#f3f4f6'
      }
    }
  ]
});

// High-resolution MapTiler fallback raster style if vector tiles encounter issues
const FALLBACK_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'maptiler-tiles': {
      type: 'raster',
      tiles: [
        'https://api.maptiler.com/maps/dataviz-v4/256/{z}/{x}/{y}@2x.png?key=lYkPykoYvdzqXhWuo3Wa'
      ],
      tileSize: 256,
      attribution: '&copy; MapTiler &copy; OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'maptiler-tiles-layer',
      type: 'raster',
      source: 'maptiler-tiles',
      minzoom: 0,
      maxzoom: 20
    }
  ]
};

export const JeepVectorMap: React.FC<JeepVectorMapProps> = ({
  journey,
  singleRouteGeometry,
  singleRouteColor = '#E11D48',
  singleRouteName,
  userLocation,
  isDark = false,
  className = 'w-full h-full'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [styleRevision, setStyleRevision] = useState<number>(0);
  const [isOfflineBasemap, setIsOfflineBasemap] = useState<boolean>(
    () => typeof navigator !== 'undefined' && navigator.onLine === false
  );
  const [hasError, setHasError] = useState<boolean>(false);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let isUnmounted = false;
    let fallbackStage = 0; // 0 = remote vector, 1 = remote raster, 2 = inline blank offline
    let timeoutTimer: number | null = null;
    let map: maplibregl.Map | null = null;

    const clearTimeoutTimer = () => {
      if (timeoutTimer !== null) {
        window.clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
    };

    const armFallbackTimer = (targetMap: maplibregl.Map, nextStageFn: () => void) => {
      clearTimeoutTimer();
      timeoutTimer = window.setTimeout(() => {
        if (!isUnmounted && !targetMap.isStyleLoaded()) {
          nextStageFn();
        }
      }, 4000);
    };

    try {
      const startOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      fallbackStage = startOffline ? 2 : 0;
      if (startOffline) setIsOfflineBasemap(true);

      const createdMap = new maplibregl.Map({
        container: mapContainerRef.current,
        style: startOffline ? createOfflineBlankStyle(isDark) : MAPTILER_DATAVIZ_STYLE,
        center: DAVAO_CENTER,
        zoom: 13,
        pitch: 0,
        bearing: 0,
        attributionControl: false
      });
      map = createdMap;

      const advanceFallbackStyle = () => {
        if (isUnmounted) return;
        clearTimeoutTimer();

        if (fallbackStage === 0 && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
          fallbackStage = 1;
          try {
            createdMap.setStyle(FALLBACK_RASTER_STYLE);
            armFallbackTimer(createdMap, advanceFallbackStyle);
            return;
          } catch {
            // Proceed to offline blank style below
          }
        }

        if (fallbackStage < 2) {
          fallbackStage = 2;
          setIsOfflineBasemap(true);
          try {
            createdMap.setStyle(createOfflineBlankStyle(isDark));
            window.setTimeout(() => {
              if (!isUnmounted && createdMap.isStyleLoaded()) {
                setMapLoaded(true);
                setStyleRevision(r => r + 1);
              }
            }, 120);
          } catch {
            setHasError(true);
          }
        }
      };

      const markStyleReady = () => {
        if (isUnmounted || !createdMap.isStyleLoaded()) return;
        clearTimeoutTimer();
        setMapLoaded(true);
        setStyleRevision(r => r + 1);
        requestAnimationFrame(() => createdMap.resize());
      };

      createdMap.on('error', (e) => {
        if (isUnmounted) return;
        if (fallbackStage < 2 && (!createdMap.isStyleLoaded() || (e?.error && fallbackStage === 0) || (typeof navigator !== 'undefined' && navigator.onLine === false))) {
          advanceFallbackStyle();
        }
      });

      createdMap.on('load', markStyleReady);
      createdMap.on('style.load', markStyleReady);

      if (startOffline) {
        window.setTimeout(markStyleReady, 120);
      } else {
        armFallbackTimer(createdMap, advanceFallbackStyle);
      }

      mapRef.current = createdMap;

      const handleOffline = () => {
        if (!isUnmounted && !createdMap.isStyleLoaded()) {
          advanceFallbackStyle();
        }
      };
      window.addEventListener('offline', handleOffline);

      // Keep map sized properly as containers expand or animate
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      // Delayed resizes to catch tab transitions
      const timers = [
        setTimeout(() => createdMap.resize(), 100),
        setTimeout(() => createdMap.resize(), 300),
        setTimeout(() => createdMap.resize(), 600)
      ];

      return () => {
        isUnmounted = true;
        clearTimeoutTimer();
        timers.forEach(t => clearTimeout(t));
        window.removeEventListener('offline', handleOffline);
        resizeObserver.disconnect();
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        try {
          createdMap.remove();
        } catch {}
        mapRef.current = null;
      };
    } catch (err) {
      console.error('[JeepVectorMap] Failed to initialize MapLibre GL:', err);
      setHasError(true);
    }

    return () => {
      isUnmounted = true;
      clearTimeoutTimer();
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
      }
    };
  }, []);

  // Clear existing vector layers and sources
  const clearMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const layerIds = [
      'journey-walk-outline',
      'journey-walk-line',
      'journey-ride-casing',
      'journey-ride-line',
      'journey-ride-casing-2',
      'journey-ride-line-2',
      'single-route-casing',
      'single-route-line'
    ];

    layerIds.forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });

    const sourceIds = [
      'journey-walk-data',
      'journey-ride-data',
      'journey-ride-data-2',
      'single-route-data'
    ];

    sourceIds.forEach(id => {
      if (map.getSource(id)) map.removeSource(id);
    });
  }, []);

  // Render Journey or Single Route when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.isStyleLoaded()) return;

    clearMapLayers();

    const bounds = new maplibregl.LngLatBounds();
    let hasCoords = false;

    // 1. Render Active Journey
    if (journey && journey.legs.length > 0) {
      const rideLegs = journey.legs.filter(l => l.type === 'ride');
      const walkLegs = journey.legs.filter(l => l.type === 'walk' || l.type === 'transfer');

      // Draw walk legs
      const walkFeatures = walkLegs.map(l => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: l.geometry.map(([lat, lng]) => [lng, lat])
        }
      }));

      if (walkFeatures.length > 0) {
        map.addSource('journey-walk-data', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: walkFeatures
          }
        });

        map.addLayer({
          id: 'journey-walk-line',
          type: 'line',
          source: 'journey-walk-data',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': isDark ? '#94A3B8' : '#475569',
            'line-width': 4,
            'line-dasharray': [2, 2]
          }
        });
      }

      // Draw ride leg 1
      if (rideLegs.length > 0 && rideLegs[0].geometry.length > 0) {
        const coordsLngLat = rideLegs[0].geometry.map(([lat, lng]) => {
          bounds.extend([lng, lat]);
          hasCoords = true;
          return [lng, lat];
        });

        map.addSource('journey-ride-data', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordsLngLat
            }
          }
        });

        map.addLayer({
          id: 'journey-ride-casing',
          type: 'line',
          source: 'journey-ride-data',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#000000',
            'line-width': 9,
            'line-opacity': 0.35
          }
        });

        map.addLayer({
          id: 'journey-ride-line',
          type: 'line',
          source: 'journey-ride-data',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': rideLegs[0].color || '#E11D48',
            'line-width': 6
          }
        });
      }

      // Draw ride leg 2 (if transfer)
      if (rideLegs.length > 1 && rideLegs[1].geometry.length > 0) {
        const coordsLngLat2 = rideLegs[1].geometry.map(([lat, lng]) => {
          bounds.extend([lng, lat]);
          hasCoords = true;
          return [lng, lat];
        });

        map.addSource('journey-ride-data-2', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordsLngLat2
            }
          }
        });

        map.addLayer({
          id: 'journey-ride-casing-2',
          type: 'line',
          source: 'journey-ride-data-2',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#000000',
            'line-width': 9,
            'line-opacity': 0.35
          }
        });

        map.addLayer({
          id: 'journey-ride-line-2',
          type: 'line',
          source: 'journey-ride-data-2',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': rideLegs[1].color || '#2563EB',
            'line-width': 6
          }
        });
      }

      // Add HTML Markers for Origin, Board, Alight, Destination
      const firstLeg = journey.legs[0];
      const lastLeg = journey.legs[journey.legs.length - 1];

      // Origin Pin (Green Ring)
      if (firstLeg?.fromCoords) {
        const el = document.createElement('div');
        el.className = 'w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold animate-pulse';
        el.innerHTML = '●';
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([firstLeg.fromCoords[1], firstLeg.fromCoords[0]])
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([firstLeg.fromCoords[1], firstLeg.fromCoords[0]]);
        hasCoords = true;
      }

      // Boarding Pin (Jeep Bus Icon)
      if (rideLegs[0]?.fromCoords) {
        const el = document.createElement('div');
        el.className = 'w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold';
        el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.2 6 18.2 6H5.8C4.8 6 3.9 6.8 3.6 7.8L2.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>';
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rideLegs[0].fromCoords[1], rideLegs[0].fromCoords[0]])
          .addTo(map);
        markersRef.current.push(marker);
      }

      // Transfer Pin (if any)
      if (rideLegs.length > 1 && rideLegs[0]?.toCoords) {
        const el = document.createElement('div');
        el.className = 'w-7 h-7 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold';
        el.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>';
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rideLegs[0].toCoords[1], rideLegs[0].toCoords[0]])
          .addTo(map);
        markersRef.current.push(marker);
      }

      // Destination Pin (Flag)
      if (lastLeg?.toCoords) {
        const el = document.createElement('div');
        el.className = 'w-7 h-7 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold';
        el.innerHTML = '★';
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lastLeg.toCoords[1], lastLeg.toCoords[0]])
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([lastLeg.toCoords[1], lastLeg.toCoords[0]]);
        hasCoords = true;
      }
    } 
    // 2. Render Single Route from Catalog
    else if (singleRouteGeometry && singleRouteGeometry.length > 0) {
      const coordsLngLat = singleRouteGeometry.map(([lat, lng]) => {
        bounds.extend([lng, lat]);
        hasCoords = true;
        return [lng, lat];
      });

      map.addSource('single-route-data', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordsLngLat
          }
        }
      });

      map.addLayer({
        id: 'single-route-casing',
        type: 'line',
        source: 'single-route-data',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#000000',
          'line-width': 9,
          'line-opacity': 0.35
        }
      });

      map.addLayer({
        id: 'single-route-line',
        type: 'line',
        source: 'single-route-data',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': singleRouteColor,
          'line-width': 6
        }
      });

      // Start & End markers
      const startPt = singleRouteGeometry[0];
      const endPt = singleRouteGeometry[singleRouteGeometry.length - 1];

      const startEl = document.createElement('div');
      startEl.className = 'w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center text-white text-[10px] font-bold';
      startEl.innerText = 'A';
      markersRef.current.push(
        new maplibregl.Marker({ element: startEl })
          .setLngLat([startPt[1], startPt[0]])
          .addTo(map)
      );

      const endEl = document.createElement('div');
      endEl.className = 'w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow flex items-center justify-center text-white text-[10px] font-bold';
      endEl.innerText = 'B';
      markersRef.current.push(
        new maplibregl.Marker({ element: endEl })
          .setLngLat([endPt[1], endPt[0]])
          .addTo(map)
      );
    }

    // Zoom to fit journey with comfortable padding
    if (hasCoords && !bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 70, bottom: 250, left: 40, right: 40 },
        maxZoom: 16,
        duration: 900
      });
    }
  }, [journey, singleRouteGeometry, singleRouteColor, mapLoaded, styleRevision, isDark, clearMapLayers]);

  // Controls
  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 300 });
  const handleResetCenter = () => {
    mapRef.current?.flyTo({ center: DAVAO_CENTER, zoom: 13, duration: 800 });
  };

  return (
    <div className={`relative ${className} w-full h-full min-h-[380px] overflow-hidden`}>
      {/* Absolute Map Canvas Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" style={{ minHeight: '380px' }} />

      {/* Floating Control Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-2xl bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-xl flex items-center justify-center active:scale-90 transition-transform"
          title="Zoom In"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-2xl bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-xl flex items-center justify-center active:scale-90 transition-transform"
          title="Zoom Out"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={handleResetCenter}
          className="w-10 h-10 rounded-2xl bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-xl flex items-center justify-center active:scale-90 transition-transform"
          title="Center Davao City"
        >
          <Crosshair size={18} />
        </button>
      </div>

      {/* Single Route Name Badge (if previewing from catalog) */}
      {singleRouteName && !journey && (
        <div className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-full bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] shadow-xl text-xs font-semibold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: singleRouteColor }} />
          <span>{singleRouteName}</span>
        </div>
      )}

      {/* Subtle Offline Basemap Notice */}
      {isOfflineBasemap && !hasError && (
        <div className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px] font-semibold backdrop-blur-md pointer-events-none">
          Offline basemap
        </div>
      )}

      {/* Error state if map completely failed */}
      {hasError && (
        <div className="absolute inset-0 bg-[var(--card-bg)]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <AlertCircle size={32} className="text-amber-500 mb-2" />
          <h4 className="text-sm font-bold">Map Preview Unavailable</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs">
            Could not connect to map tiles. Please check your internet connection.
          </p>
        </div>
      )}
    </div>
  );
};
