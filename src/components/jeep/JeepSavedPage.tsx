import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Home, 
  GraduationCap, 
  Briefcase, 
  MapPin, 
  Trash2, 
  ArrowRight, 
  Navigation, 
  Plus, 
  Clock, 
  Bus,
  ArrowLeft
} from 'lucide-react';
import { 
  SavedPlace, 
  FavoriteRoute, 
  RecentTrip, 
  getSavedPlaces, 
  getFavoriteRoutes, 
  getRecentTrips, 
  deletePlace, 
  toggleFavoriteRoute,
  savePlace
} from '../../services/savedRoutesService';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { LatLng } from '../../utils/davaoTransitRouter';

export interface JeepSavedPageProps {
  onPlanTrip: (origin: LatLng, destination: LatLng) => void;
  onTrackRouteOnMap: (routeId: string) => void;
  onOpenMapForPin?: (placeType: 'home' | 'campus' | 'custom', defaultName?: string) => void;
  onBack?: () => void;
}

export const JeepSavedPage: React.FC<JeepSavedPageProps> = ({
  onPlanTrip,
  onTrackRouteOnMap,
  onOpenMapForPin,
  onBack
}) => {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [editingCampus, setEditingCampus] = useState<boolean>(false);
  const [editingHome, setEditingHome] = useState<boolean>(false);
  const [isAddingPlace, setIsAddingPlace] = useState<boolean>(false);
  const [customPlaceName, setCustomPlaceName] = useState<string>('');
  const [customHomeName, setCustomHomeName] = useState<string>('');

  useEffect(() => {
    setSavedPlaces(getSavedPlaces());
    setFavoriteRoutes(getFavoriteRoutes());
    setRecentTrips(getRecentTrips());
  }, []);

  const handleRemovePlace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deletePlace(id);
    setSavedPlaces(updated);
  };

  const handleRemoveFavorite = (route: FavoriteRoute, e: React.MouseEvent) => {
    e.stopPropagation();
    const { favorites } = toggleFavoriteRoute(route);
    setFavoriteRoutes(favorites);
  };

  const handleSelectCampus = (campus: typeof DAVAO_CAMPUSES[0]) => {
    const updated = savePlace({
      id: 'place-campus',
      type: 'campus',
      name: campus.name,
      address: campus.address,
      lat: campus.lat,
      lng: campus.lng,
      updatedAt: new Date().toISOString()
    });
    setSavedPlaces(updated);
    setEditingCampus(false);
  };

  const handleSaveHome = (name: string, address: string, lat: number, lng: number) => {
    const updated = savePlace({
      id: 'place-home',
      type: 'home',
      name,
      address,
      lat,
      lng,
      updatedAt: new Date().toISOString()
    });
    setSavedPlaces(updated);
    setEditingHome(false);
    setCustomHomeName('');
  };

  const handleAddPopularHub = (name: string, lat: number, lng: number) => {
    const updated = savePlace({
      id: `place-${Date.now()}`,
      type: 'custom',
      name,
      address: 'Davao City',
      lat,
      lng,
      updatedAt: new Date().toISOString()
    });
    setSavedPlaces(updated);
    setIsAddingPlace(false);
  };

  const handleAddCustomNamedPlace = () => {
    if (!customPlaceName.trim()) return;
    const updated = savePlace({
      id: `place-${Date.now()}`,
      type: 'custom',
      name: customPlaceName.trim(),
      address: 'Custom Davao Location',
      lat: 7.0734,
      lng: 125.6128,
      updatedAt: new Date().toISOString()
    });
    setSavedPlaces(updated);
    setCustomPlaceName('');
    setIsAddingPlace(false);
  };

  const getPlaceIcon = (type: SavedPlace['type']) => {
    switch (type) {
      case 'home':
        return <Home className="w-4 h-4 text-emerald-400" />;
      case 'campus':
        return <GraduationCap className="w-4 h-4 text-blue-400" />;
      case 'work':
        return <Briefcase className="w-4 h-4 text-purple-400" />;
      default:
        return <MapPin className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-24 select-none">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-[var(--text-primary)]">
              Saved Places &amp; Favorite Routes
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Quick 1-tap route planning to your home, university campus, and daily commute lines.
            </p>
          </div>
        </div>
      </div>

      {/* 1. SAVED PLACES SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--accent-color)]" />
            <span>Saved Places ({savedPlaces.length})</span>
          </h3>

          <div className="flex items-center gap-1.5 flex-wrap">
            {!savedPlaces.some(p => p.type === 'home') && (
              <button
                type="button"
                onClick={() => {
                  setEditingHome(true);
                  setEditingCampus(false);
                  setIsAddingPlace(false);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25 flex items-center gap-1 transition-all pressable shadow-xs"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Set Home</span>
              </button>
            )}
            {!savedPlaces.some(p => p.type === 'campus') && (
              <button
                type="button"
                onClick={() => {
                  setEditingCampus(true);
                  setEditingHome(false);
                  setIsAddingPlace(false);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-500 hover:bg-blue-500/25 flex items-center gap-1 transition-all pressable shadow-xs"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Set Campus</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsAddingPlace(!isAddingPlace);
                setEditingHome(false);
                setEditingCampus(false);
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 flex items-center gap-1 transition-all pressable shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Place</span>
            </button>
          </div>
        </div>

        {/* Set / Change Home Modal/Panel (Interactive Map Pinning) */}
        {editingHome && (
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-emerald-500/30 space-y-3 animate-fade-in shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Set Your Home on Map</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingHome(false)}
                className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)]">
              Drop a pin directly on the interactive map to save your exact residence, boarding house, or dorm.
            </p>

            <button
              type="button"
              onClick={() => {
                if (onOpenMapForPin) {
                  onOpenMapForPin('home', customHomeName.trim() || 'Home');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all pressable"
            >
              <MapPin className="w-4 h-4" />
              <span>Choose Exact Home on Map</span>
            </button>

            <div className="pt-2 border-t border-[var(--card-border)]/60 flex items-center gap-2">
              <input
                type="text"
                placeholder="Optional custom label (e.g. My Apartment, Dorm)..."
                value={customHomeName}
                onChange={(e) => setCustomHomeName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Add Custom Place Panel (Interactive Map Pinning) */}
        {isAddingPlace && (
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-3 animate-fade-in shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Save Location on Map
              </span>
              <button
                type="button"
                onClick={() => setIsAddingPlace(false)}
                className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)]">
              Pick any location on the map to save as a frequent commute destination.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Place name (e.g. Work, Gym, Lola's House)..."
                value={customPlaceName}
                onChange={(e) => setCustomPlaceName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--card-hover-border)]"
              />

              <button
                type="button"
                onClick={() => {
                  if (onOpenMapForPin) {
                    onOpenMapForPin('custom', customPlaceName.trim() || 'Saved Place');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all pressable"
              >
                <MapPin className="w-4 h-4" />
                <span>Pick Location on Map</span>
              </button>
            </div>
          </div>
        )}

        {/* Saved Places Grid or Empty State */}
        {savedPlaces.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] text-[var(--text-muted)] mx-auto flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">No Saved Places Yet</h4>
              <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto">
                Set your home address, university campus, or frequent Davao commute stops for instant 1-tap route planning.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingHome(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5 pressable"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Set Home Location</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingCampus(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500 text-xs font-bold hover:bg-blue-500/25 transition-colors flex items-center gap-1.5 pressable"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Set Campus</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {savedPlaces.map(place => (
              <div
                key={place.id}
                onClick={() => {
                  // Route to this place from Davao City Hall / current location
                  onPlanTrip(
                    { name: 'My Current Location', lat: 7.0734, lng: 125.6128 },
                    { name: place.name, lat: place.lat, lng: place.lng }
                  );
                }}
                className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] cursor-pointer transition-all space-y-2 shadow-sm group pressable"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--nested-bg)] flex items-center justify-center">
                      {getPlaceIcon(place.type)}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {place.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {place.type === 'campus' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCampus(true);
                          setEditingHome(false);
                          setIsAddingPlace(false);
                        }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:bg-[var(--card-bg)]"
                      >
                        Change
                      </button>
                    )}
                    {place.type === 'home' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingHome(true);
                          setEditingCampus(false);
                          setIsAddingPlace(false);
                        }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:bg-[var(--card-bg)]"
                      >
                        Change
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleRemovePlace(place.id, e)}
                      className="p-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                      title="Delete saved place"
                      aria-label={`Delete ${place.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-color)] transition-colors">
                    {place.name}
                  </h4>
                  {place.address && (
                    <p className="text-[10.5px] text-[var(--text-muted)] truncate">
                      {place.address}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[var(--card-border)]/60 text-[10.5px] font-semibold text-[var(--accent-color)]">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    <span>Route here</span>
                  </span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Change University Campus Modal/Dropdown */}
        {editingCampus && (
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-sky-500/30 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Select Your Davao Campus
              </span>
              <button
                type="button"
                onClick={() => setEditingCampus(false)}
                className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {DAVAO_CAMPUSES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCampus(c)}
                  className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-sky-500 text-left transition-all"
                >
                  <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">{c.shortName}</p>
                  <p className="text-[9.5px] text-[var(--text-muted)] truncate">{c.address}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. FAVORITE JEEP & BUS ROUTES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Saved Corridors ({favoriteRoutes.length})</span>
          </h3>
        </div>

        {favoriteRoutes.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center space-y-2">
            <Bookmark className="w-7 h-7 mx-auto text-[var(--text-muted)] opacity-40" />
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              No saved corridors yet
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Go to the 114 Routes Directory and tap the bookmark icon on any jeepney or bus corridor to save it here for fast tracking.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {favoriteRoutes.map(route => (
              <div
                key={route.id}
                onClick={() => onTrackRouteOnMap(route.id)}
                className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-amber-400/50 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-sm group pressable"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-3.5 h-3.5 rounded-full shrink-0" 
                    style={{ backgroundColor: route.color || '#10B981' }} 
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-amber-400 transition-colors">
                      {route.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium capitalize truncate">
                      {route.mode.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-sky-400 group-hover:underline">
                    Track on Map
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveFavorite(route, e)}
                    className="p-1.5 text-amber-400 hover:text-rose-400 transition-colors"
                  >
                    <Bookmark className="w-4 h-4 fill-amber-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. RECENT COMMUTE SEARCHES */}
      {recentTrips.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Recent Searches</span>
            </h3>
          </div>

          <div className="space-y-1.5">
            {recentTrips.map(trip => (
              <div
                key={trip.id}
                onClick={() => onPlanTrip(
                  { name: trip.originName, lat: trip.originLat, lng: trip.originLng },
                  { name: trip.destName, lat: trip.destLat, lng: trip.destLng }
                )}
                className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-sky-500/40 flex items-center justify-between cursor-pointer transition-all pressable"
              >
                <div className="flex items-center gap-2 min-w-0 text-xs">
                  <span className="font-semibold text-emerald-400 truncate">{trip.originName}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                  <span className="font-semibold text-blue-400 truncate">{trip.destName}</span>
                </div>
                <Navigation className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default JeepSavedPage;
