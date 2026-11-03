import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Bus, 
  MapPin, 
  Compass, 
  ArrowRight, 
  Filter, 
  X,
  ChevronRight,
  ShieldCheck,
  Info,
  Bookmark,
  ArrowLeft
} from 'lucide-react';
import { 
  toggleFavoriteRoute, 
  isRouteFavorite, 
  getFavoriteRoutes 
} from '../../services/savedRoutesService';
import { 
  GeoJsonFeature, 
  RawTransitRoute 
} from '../../utils/davaoTransitRouter';

export interface JeepRoutesDirectoryProps {
  features: GeoJsonFeature[];
  routes: RawTransitRoute[];
  onSelectRouteForMap: (feature: GeoJsonFeature) => void;
  onBack?: () => void;
}

export const JeepRoutesDirectory: React.FC<JeepRoutesDirectoryProps> = ({
  features,
  routes,
  onSelectRouteForMap,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'jeep' | 'bus' | 'provincial'>('all');
  const [selectedRoute, setSelectedRoute] = useState<GeoJsonFeature | null>(null);
  const [savedRouteIds, setSavedRouteIds] = useState<Set<string>>(() => {
    return new Set(getFavoriteRoutes().map(r => r.id));
  });

  const handleToggleBookmark = (feature: GeoJsonFeature, e: React.MouseEvent) => {
    e.stopPropagation();
    const routeId = feature.properties.routeId;
    const { favorites } = toggleFavoriteRoute({
      id: routeId,
      name: feature.properties.name,
      mode: feature.properties.mode,
      color: feature.properties.color
    });
    setSavedRouteIds(new Set(favorites.map(r => r.id)));
  };

  // Group features by unique routeId or name
  const filteredFeatures = useMemo(() => {
    return features.filter(f => {
      // Category filter
      if (selectedCategory === 'jeep' && f.properties.mode !== 'traditional_jeepney') return false;
      if (selectedCategory === 'bus' && f.properties.mode !== 'dc_bus') return false;
      if (selectedCategory === 'provincial' && f.properties.mode !== 'provincial') return false;

      // Text query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (f.properties.name || '').toLowerCase();
      const id = (f.properties.routeId || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [features, selectedCategory, searchQuery]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let jeep = 0;
    let bus = 0;
    let provincial = 0;
    features.forEach(f => {
      if (f.properties.mode === 'traditional_jeepney') jeep++;
      else if (f.properties.mode === 'dc_bus') bus++;
      else provincial++;
    });
    return { all: features.length, jeep, bus, provincial };
  }, [features]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-4 pb-24 select-none">
      {/* Header Banner */}
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
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Bus className="w-5 h-5 text-emerald-500" />
            <span>Davao City Public Transit Network</span>
          </h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Explore complete bidirectional routes for 114 traditional jeepneys, 9 DC buses, and regional lines.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by route name, number, or corridor (e.g. Route 10, Toril, Mintal, Buhangin)..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all', label: `All Routes (${counts.all})` },
          { id: 'jeep', label: `Jeepneys (${counts.jeep})` },
          { id: 'bus', label: `DC Bus (${counts.bus})` },
          { id: 'provincial', label: `Provincial (${counts.provincial})` }
        ].map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all shrink-0 pressable ${
                isSelected
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
        <span>Showing {filteredFeatures.length} matching routes</span>
        <span>Tap any route to view path details or track on map</span>
      </div>

      {/* Route Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredFeatures.map(feature => {
          const modeLabel = feature.properties.mode === 'dc_bus' 
            ? 'DC Bus' 
            : feature.properties.mode === 'provincial' 
            ? 'Provincial' 
            : 'Traditional Jeepney';

          const color = feature.properties.color || '#10B981';

          return (
            <div
              key={`${feature.properties.routeId}-${feature.properties.direction}`}
              className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-emerald-500/40 transition-all space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-2">
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {modeLabel}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {feature.properties.direction === 'going' ? 'Outbound' : 'Return / Inbound'}
                  </span>
                </div>

                {/* Route Title */}
                <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                  {feature.properties.name}
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[var(--card-border)]/60 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium text-[var(--text-muted)] truncate">
                  {feature.geometry.coordinates.length} GPS road fixes
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleBookmark(feature, e)}
                    title={savedRouteIds.has(feature.properties.routeId) ? 'Remove from Saved Corridors' : 'Save Corridor'}
                    className={`p-2 rounded-xl border transition-all active:scale-95 pressable ${
                      savedRouteIds.has(feature.properties.routeId)
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-muted)] hover:text-amber-400'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${savedRouteIds.has(feature.properties.routeId) ? 'fill-amber-400' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectRouteForMap(feature)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 pressable shadow-xs"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Track on Map</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <p className="text-sm font-bold text-[var(--text-secondary)]">No transit routes found</p>
          <p className="text-xs text-[var(--text-muted)]">
            Try adjusting your search query or switching category filters.
          </p>
        </div>
      )}
    </div>
  );
};
