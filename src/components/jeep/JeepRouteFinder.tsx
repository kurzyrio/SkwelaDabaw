import React, { useState, useEffect } from 'react';
import { Bus } from 'lucide-react';
import { JeepHubPage } from './JeepHubPage';
import { JeepTransitMap } from './JeepTransitMap';
import { JeepSavedPage } from './JeepSavedPage';
import { JeepRoutesDirectory } from './JeepRoutesDirectory';
import { JeepCampusesPage } from './JeepCampusesPage';
import { JeepFareCalculatorPage } from './JeepFareCalculatorPage';
import { JeepSafetyHazardPage } from './JeepSafetyHazardPage';
import { PageIntroGuide } from '../common/PageIntroGuide';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { 
  loadTransitData, 
  GeoJsonFeature, 
  RawTransitRoute,
  LatLng
} from '../../utils/davaoTransitRouter';
import { DavaoCampus } from '../../types';

export interface JeepRouteFinderProps {
  onNavigateToBus?: () => void;
  onFullScreenChange?: (fullScreen: boolean) => void;
}

export type JeepSubTab = 'hub' | 'map' | 'saved' | 'routes' | 'campuses' | 'fare' | 'safety';

export const JeepRouteFinder: React.FC<JeepRouteFinderProps> = ({ 
  onNavigateToBus,
  onFullScreenChange 
}) => {
  // Active sub-page tab (defaults to the clean modular Hub)
  const [activeSubTab, setActiveSubTab] = useState<JeepSubTab>('hub');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Transit Data for routes directory and map
  const [features, setFeatures] = useState<GeoJsonFeature[]>([]);
  const [routes, setRoutes] = useState<RawTransitRoute[]>([]);
  const [singleRouteFeature, setSingleRouteFeature] = useState<GeoJsonFeature | null>(null);

  // Selected Origin and Destination for map
  const [mapOrigin, setMapOrigin] = useState<LatLng | null>(null);
  const [mapDestination, setMapDestination] = useState<LatLng | null>(null);
  const [savePlaceType, setSavePlaceType] = useState<'home' | 'campus' | 'custom' | null>(null);
  const [savePlaceName, setSavePlaceName] = useState<string>('');

  // Notify parent of full-screen status whenever activeSubTab changes
  useEffect(() => {
    onFullScreenChange?.(activeSubTab === 'map');
  }, [activeSubTab, onFullScreenChange]);

  useEffect(() => {
    return () => {
      onFullScreenChange?.(false);
    };
  }, [onFullScreenChange]);

  // Load route dataset once
  useEffect(() => {
    loadTransitData().then(({ features, routes }) => {
      setFeatures(features);
      setRoutes(routes);
    });
  }, []);

  // Inspect shared route from Chat or external link
  useEffect(() => {
    if (features.length === 0) return;

    const checkSharedRoute = (targetRouteId?: string, targetRouteName?: string) => {
      let routeId = targetRouteId;
      let routeName = targetRouteName;

      if (!routeId && !routeName) {
        try {
          const raw = localStorage.getItem('skweladabaw_shared_route_to_view');
          if (raw) {
            const parsed = JSON.parse(raw);
            routeId = parsed.routeId;
            routeName = parsed.routeName;
            localStorage.removeItem('skweladabaw_shared_route_to_view');
          }
        } catch (_) {}
      }

      if (routeId || routeName) {
        const feat = features.find(
          f => (routeId && f.properties.routeId === routeId) ||
               (routeName && f.properties.name && (routeName.includes(f.properties.name) || f.properties.name.includes(routeName)))
        );
        if (feat) {
          setSingleRouteFeature(feat);
          setActiveSubTab('map');
        }
      }
    };

    checkSharedRoute();

    const handleCustomEvent = (e: any) => {
      const detail = e.detail;
      if (detail) {
        checkSharedRoute(detail.routeId, detail.routeName);
      }
    };

    window.addEventListener('skweladabaw_select_jeep_route', handleCustomEvent);
    return () => {
      window.removeEventListener('skweladabaw_select_jeep_route', handleCustomEvent);
    };
  }, [features]);

  // Hardware Back Button Interception: from any subpage return to 'hub'
  useBackHandler(
    activeSubTab !== 'hub',
    () => {
      setActiveSubTab('hub');
      setSingleRouteFeature(null);
      try {
        localStorage.removeItem('skweladabaw_shared_route_to_view');
      } catch (_) {}
    },
    BackPriority.SUBVIEW,
    'jeep_subpage_back'
  );

  useBackHandler(
    isGuideOpen,
    () => setIsGuideOpen(false),
    BackPriority.MODAL,
    'jeep_guide_modal'
  );

  // Handler when user selects a route from the 114+ directory to track on map
  const handleSelectRouteForMap = (feature: GeoJsonFeature) => {
    setSingleRouteFeature(feature);
    setActiveSubTab('map');
  };

  // Handler when user selects a saved place or recent trip to plan
  const handlePlanTripFromSaved = (origin: LatLng, destination: LatLng) => {
    setMapOrigin(origin);
    setMapDestination(destination);
    setSingleRouteFeature(null);
    setActiveSubTab('map');
  };

  // Handler when user tracks a favorite route from Saved page
  const handleTrackFavoriteRoute = (routeId: string) => {
    const feat = features.find(f => f.properties.routeId === routeId) || null;
    if (feat) {
      setSingleRouteFeature(feat);
      setActiveSubTab('map');
    }
  };

  // Handler when user chooses to plan a route to a school from the Campuses directory
  const handlePlanToCampus = (campus: DavaoCampus) => {
    setMapDestination({
      name: campus.name,
      lat: campus.lat,
      lng: campus.lng
    });
    setMapOrigin(null);
    setSingleRouteFeature(null);
    setActiveSubTab('map');
  };

  return (
    <div className={`relative w-full ${activeSubTab === 'map' ? 'h-[100dvh] min-h-[100dvh] flex-1 overflow-hidden' : ''} select-none`}>
      {/* QUICK FEATURE GUIDE MODAL */}
      <PageIntroGuide
        pageKey="jeep"
        isOpenControlled={isGuideOpen}
        onCloseControlled={() => setIsGuideOpen(false)}
        icon={<Bus className="w-6 h-6 text-white" />}
        title="Davao City PUJ & Transit System"
        description="Interactive 2-point transit map, saved places & favorite routes, 114+ route directory, verified 54 Davao campuses, and official LTFRB 2026 student fare calculation."
        tips={[
          'Search verified Davao campuses or tap Pin Mode to place pins with 100% free map movement.',
          'Save your home, university campus, and daily commute routes in the Saved section for 1-tap navigation.',
          'Student fare is automatically calculated at ₱11.00 base for first 4 km, +₱1.00/km thereafter.',
          'Browse the 114+ Routes Directory and tap Track on Map to inspect any traditional jeep or bus corridor.',
          'Review the Safety guide for CTTMO guidelines on 103 unsafe flyover and bridge boarding zones.'
        ]}
      />

      {/* DEDICATED SUBPAGES */}

      {/* 1. JEEPNEY TRANSIT HUB LANDING */}
      {activeSubTab === 'hub' && (
        <JeepHubPage
          onOpenMap={() => setActiveSubTab('map')}
          onOpenRoutes={() => setActiveSubTab('routes')}
          onOpenSaved={() => setActiveSubTab('saved')}
          onOpenSchools={() => setActiveSubTab('campuses')}
          onOpenFare={() => setActiveSubTab('fare')}
          onOpenSafety={() => setActiveSubTab('safety')}
          onOpenGuide={() => setIsGuideOpen(true)}
          onNavigateToBus={onNavigateToBus}
        />
      )}

      {/* 2. FULLSCREEN INTERACTIVE TRANSIT MAP */}
      {activeSubTab === 'map' && (
        <div className="w-full h-full absolute inset-0">
          <ErrorBoundary fallbackTitle="Unable to load transit map" onReset={() => setActiveSubTab('hub')}>
            <JeepTransitMap
              initialOrigin={mapOrigin}
              initialDestination={mapDestination}
              singleRouteFeature={singleRouteFeature}
              initialSavePlaceType={savePlaceType}
              initialSavePlaceName={savePlaceName}
              onClearSingleRoute={() => setSingleRouteFeature(null)}
              onNavigateToCatalog={() => setActiveSubTab('routes')}
              onNavigateToFare={() => setActiveSubTab('fare')}
              onBack={() => {
                setSavePlaceType(null);
                setActiveSubTab('hub');
              }}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* 3. 114+ ROUTES DIRECTORY */}
      {activeSubTab === 'routes' && (
        <JeepRoutesDirectory
          features={features}
          routes={routes}
          onSelectRouteForMap={handleSelectRouteForMap}
          onBack={() => setActiveSubTab('hub')}
        />
      )}

      {/* 4. SAVED PLACES & FAVORITE CORRIDORS */}
      {activeSubTab === 'saved' && (
        <JeepSavedPage
          onPlanTrip={handlePlanTripFromSaved}
          onTrackRouteOnMap={handleTrackFavoriteRoute}
          onOpenMapForPin={(type, name) => {
            setSavePlaceType(type);
            setSavePlaceName(name || '');
            setActiveSubTab('map');
          }}
          onBack={() => setActiveSubTab('hub')}
        />
      )}

      {/* 5. 54 VERIFIED DAVAO CAMPUSES */}
      {activeSubTab === 'campuses' && (
        <JeepCampusesPage
          onPlanToCampus={handlePlanToCampus}
          onBack={() => setActiveSubTab('hub')}
        />
      )}

      {/* 6. LTFRB 2026 STUDENT FARE MATRIX */}
      {activeSubTab === 'fare' && (
        <JeepFareCalculatorPage
          onBack={() => setActiveSubTab('hub')}
        />
      )}

      {/* 7. SAFETY & FLYOVER HAZARDS */}
      {activeSubTab === 'safety' && (
        <JeepSafetyHazardPage
          onBack={() => setActiveSubTab('hub')}
        />
      )}
    </div>
  );
};

export default JeepRouteFinder;
