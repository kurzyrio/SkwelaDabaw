import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  GraduationCap, 
  Search, 
  X, 
  MapPin, 
  Check, 
  ShoppingBag, 
  Trees, 
  Bus, 
  Layers,
  Navigation,
  Hospital,
  ShieldAlert
} from 'lucide-react';
import { DAVAO_PLACES, DavaoPlaceCategory } from '../../data/davaoPlaces';
import { LatLng } from '../../utils/davaoTransitRouter';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

export interface JeepSchoolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMode: 'origin' | 'destination';
  onChangeTargetMode?: (mode: 'origin' | 'destination') => void;
  onSelectPlace: (place: LatLng, mode: 'origin' | 'destination') => void;
  onPickOnMap?: () => void;
  currentOriginName?: string;
  currentDestName?: string;
}

type SearchCategoryFilter = 'all' | 'school' | 'mall' | 'park' | 'hub' | 'hospital' | 'police';

export const JeepSchoolSearchModal: React.FC<JeepSchoolSearchModalProps> = ({
  isOpen,
  onClose,
  targetMode,
  onChangeTargetMode,
  onSelectPlace,
  onPickOnMap,
  currentOriginName,
  currentDestName
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<SearchCategoryFilter>('all');

  // Hardware Back Button Interception
  useBackHandler(isOpen, onClose, BackPriority.MODAL, 'jeep_place_search_modal');

  // Filter items across all Davao places (Schools, Malls, Parks, Hubs)
  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return DAVAO_PLACES.filter(place => {
      // Category filter
      if (activeCategory !== 'all' && place.category !== activeCategory) {
        return false;
      }

      // Search query
      if (!q) return true;
      return (
        place.name.toLowerCase().includes(q) ||
        place.shortName.toLowerCase().includes(q) ||
        place.address.toLowerCase().includes(q) ||
        place.area.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  const isOrigin = targetMode === 'origin';

  const getCategoryIcon = (category: DavaoPlaceCategory) => {
    switch (category) {
      case 'mall':
        return <ShoppingBag className="w-3.5 h-3.5 text-pink-500" />;
      case 'park':
        return <Trees className="w-3.5 h-3.5 text-emerald-500" />;
      case 'school':
        return <GraduationCap className="w-3.5 h-3.5 text-amber-500" />;
      case 'hospital':
        return <Hospital className="w-3.5 h-3.5 text-rose-500" />;
      case 'police':
        return <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />;
      case 'hub':
      case 'landmark':
      default:
        return <Bus className="w-3.5 h-3.5 text-sky-500" />;
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md select-none animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-modal-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 border-b border-[var(--card-border)] bg-[var(--nested-bg)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full shrink-0 ${isOrigin ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                {isOrigin ? 'Select My Current Location' : 'Select Destination'}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-all pressable"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MODE TOGGLE */}
          {onChangeTargetMode && (
            <div className="flex rounded-xl bg-[var(--card-bg)] p-1 border border-[var(--card-border)] text-xs font-semibold">
              <button
                type="button"
                onClick={() => onChangeTargetMode('origin')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all pressable ${
                  isOrigin 
                    ? 'bg-[var(--nested-bg)] text-[var(--text-primary)] font-bold shadow-xs' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>My Location</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeTargetMode('destination')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all pressable ${
                  !isOrigin 
                    ? 'bg-[var(--nested-bg)] text-[var(--text-primary)] font-bold shadow-xs' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span>Destination</span>
              </button>
            </div>
          )}
        </div>

        {/* SEARCH INPUT */}
        <div className="p-3 border-b border-[var(--card-border)] bg-[var(--card-bg)] space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SM, Abreeza, People's Park, Ateneo, Toril..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-medium focus:outline-hidden focus:border-[var(--accent-color)] transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* MINIMAL CATEGORY FILTER */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-all pressable border ${
                activeCategory === 'all'
                  ? 'bg-[var(--text-primary)] text-[var(--card-bg)] border-[var(--text-primary)]'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>All</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('mall')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-all pressable border ${
                activeCategory === 'mall'
                  ? 'bg-pink-600 text-white border-pink-600'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Malls</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('park')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-all pressable border ${
                activeCategory === 'park'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Trees className="w-3 h-3" />
              <span>Parks</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('school')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-all pressable border ${
                activeCategory === 'school'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>Schools</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('hub')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-all pressable border ${
                activeCategory === 'hub'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Bus className="w-3 h-3" />
              <span>Hubs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('hospital')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-all pressable border ${
                activeCategory === 'hospital'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Hospital className="w-3 h-3" />
              <span>Hospitals</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('police')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1.5 transition-all pressable border ${
                activeCategory === 'police'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--card-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Police</span>
            </button>
          </div>
        </div>

        {/* TEXT-MINIMAL PLACES LIST */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--card-border)]/40 p-1">
          {/* SET ON MAP OPTION */}
          {!searchQuery && onPickOnMap && (
            <div
              onClick={() => {
                onPickOnMap();
                onClose();
              }}
              className="p-3 mb-1.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer flex items-center justify-between gap-3 pressable"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-blue-500 truncate">
                    Set {isOrigin ? 'My Location' : 'Destination'} on Map
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    Tap anywhere on the Davao map to drop an exact pin
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider bg-blue-500/20 px-2 py-0.5 rounded-lg">
                Map
              </span>
            </div>
          )}

          {isOrigin && !searchQuery && (
            <div
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      onSelectPlace({ name: 'My current location', lat: pos.coords.latitude, lng: pos.coords.longitude }, 'origin');
                      onClose();
                    },
                    () => {
                      const cached = localStorage.getItem('skweladabaw_user_location');
                      if (cached) {
                        try {
                          const parsed = JSON.parse(cached);
                          onSelectPlace({ name: 'My current location', lat: parsed.lat, lng: parsed.lng }, 'origin');
                          onClose();
                          return;
                        } catch {}
                      }
                      onSelectPlace({ name: 'My current location', lat: 7.0705, lng: 125.6139 }, 'origin');
                      onClose();
                    },
                    { enableHighAccuracy: false, timeout: 6000 }
                  );
                } else {
                  onSelectPlace({ name: 'My current location', lat: 7.0705, lng: 125.6139 }, 'origin');
                  onClose();
                }
              }}
              className="p-3 mb-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-between gap-3 pressable"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Navigation className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-emerald-500 truncate">
                    Use Current GPS Location
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    Detect your exact coordinates automatically
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-lg">
                GPS
              </span>
            </div>
          )}

          {filteredPlaces.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-secondary)]">
              <MapPin className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">No places found</p>
            </div>
          ) : (
            filteredPlaces.map((place) => {
              const isSelectedOrigin = currentOriginName === place.name || currentOriginName === place.shortName;
              const isSelectedDest = currentDestName === place.name || currentDestName === place.shortName;
              const isCurrentSelection = isOrigin ? isSelectedOrigin : isSelectedDest;

              return (
                <div
                  key={place.id}
                  onClick={() => {
                    onSelectPlace(
                      { name: place.shortName || place.name, lat: place.lat, lng: place.lng },
                      targetMode
                    );
                    onClose();
                  }}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--nested-bg)] active:scale-[0.99] transition-all pressable ${
                    isCurrentSelection ? 'bg-[var(--nested-bg)] border border-[var(--accent-color)]/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center shrink-0">
                      {getCategoryIcon(place.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {place.name}
                      </h4>
                      <p className="text-[10.5px] text-[var(--text-secondary)] truncate">
                        {place.area || place.address.replace(/,\s*Davao City/i, '')}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isCurrentSelection ? (
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] hover:bg-[var(--accent-color)] hover:text-white text-[var(--text-primary)] text-[10px] font-semibold transition-all shadow-xs"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-[var(--nested-bg)] border-t border-[var(--card-border)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--card-bg)] text-[var(--text-primary)] font-semibold border border-[var(--card-border)] hover:bg-[var(--nested-bg)] text-xs transition-all pressable"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
