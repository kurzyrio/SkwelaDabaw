import React, { useState, useMemo } from 'react';
import { 
  School, 
  Search, 
  MapPin, 
  Bus, 
  Bookmark, 
  Check, 
  ExternalLink, 
  Navigation,
  ArrowLeft
} from 'lucide-react';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { DavaoCampus } from '../../types';
import { getSavedPlaces, savePlace, deletePlace, SavedPlace } from '../../services/savedRoutesService';

export interface JeepCampusesPageProps {
  onBack: () => void;
  onPlanToCampus: (campus: DavaoCampus) => void;
}

export const JeepCampusesPage: React.FC<JeepCampusesPageProps> = ({
  onBack,
  onPlanToCampus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(() => {
    const saved = getSavedPlaces();
    return new Set(saved.map((p: SavedPlace) => p.name));
  });

  const categories = [
    { id: 'all', label: 'All Campuses' },
    { id: 'university', label: 'Universities' },
    { id: 'college', label: 'Colleges' },
    { id: 'health', label: 'Health & Medical' },
    { id: 'tech', label: 'Tech & Aviation' },
    { id: 'seminary', label: 'Seminaries' }
  ];

  const filteredCampuses = useMemo(() => {
    return DAVAO_CAMPUSES.filter(c => {
      // Category filter
      if (selectedCategory === 'university') {
        const t = (c.type || '').toLowerCase();
        if (!t.includes('university') && !c.name.toLowerCase().includes('university')) return false;
      } else if (selectedCategory === 'college') {
        const t = (c.type || '').toLowerCase();
        if (!t.includes('college')) return false;
      } else if (selectedCategory === 'health') {
        const t = (c.type || '').toLowerCase();
        if (!t.includes('health') && !t.includes('medical')) return false;
      } else if (selectedCategory === 'tech') {
        const t = (c.type || '').toLowerCase();
        if (!t.includes('polytechnic') && !t.includes('aviation') && !t.includes('it /') && !t.includes('technology')) return false;
      } else if (selectedCategory === 'seminary') {
        const t = (c.type || '').toLowerCase();
        if (!t.includes('theological') && !t.includes('seminary') && !t.includes('bible')) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.area && c.area.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  const handleToggleBookmark = (campus: DavaoCampus) => {
    const isSaved = savedPlaceNames.has(campus.name);
    if (isSaved) {
      deletePlace(`campus-${campus.id}`);
      setSavedPlaceNames(prev => {
        const updated = new Set(prev);
        updated.delete(campus.name);
        return updated;
      });
    } else {
      savePlace({
        id: `campus-${campus.id}`,
        type: 'campus',
        name: campus.name,
        address: campus.address,
        lat: campus.lat,
        lng: campus.lng,
        updatedAt: new Date().toISOString()
      });
      setSavedPlaceNames(prev => new Set(prev).add(campus.name));
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--canvas-bg)] select-none animate-fade-in">
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <School className="w-4 h-4 text-emerald-500" />
              <span>Davao Campuses Directory</span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              54 verified institutions with nearest drop-off points
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]">
          {filteredCampuses.length} Campuses
        </span>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="p-3 bg-[var(--card-bg)] border-b border-[var(--card-border)] space-y-2.5 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search school name, acronym, district, or street..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-sky-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all pressable shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--card-border)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campus List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
        {filteredCampuses.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
            <School className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">No campuses found matching your search</p>
          </div>
        ) : (
          filteredCampuses.map(campus => {
            const isBookmarked = savedPlaceNames.has(campus.name);
            return (
              <div
                key={campus.id}
                className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] transition-all shadow-xs space-y-2.5"
              >
                {/* Title & Actions */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                        {campus.name}
                      </h3>
                      {campus.type && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-[var(--nested-bg)] text-[var(--text-secondary)] border border-[var(--card-border)]">
                          {campus.type}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                      <span className="truncate">{campus.address || campus.area}</span>
                    </p>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(campus)}
                    title={isBookmarked ? "Saved in Favorites" : "Save to Favorites"}
                    className={`p-2 rounded-xl border transition-all pressable shrink-0 ${
                      isBookmarked
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                        : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Drop-off points & Jeeps */}
                {(campus.dropOffPoints?.length > 0 || campus.recommendedJeeps?.length > 0) && (
                  <div className="p-2 rounded-xl bg-[var(--nested-bg)] text-[10.5px] space-y-1">
                    {campus.dropOffPoints?.length > 0 && (
                      <p className="text-[var(--text-secondary)] truncate">
                        <span className="font-semibold text-[var(--text-primary)]">Drop-off: </span>
                        {campus.dropOffPoints.join(' • ')}
                      </p>
                    )}
                    {campus.recommendedJeeps?.length > 0 && (
                      <div className="flex items-center gap-1 text-[var(--text-secondary)] flex-wrap">
                        <Bus className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="font-semibold text-[var(--text-primary)]">Routes: </span>
                        <span className="truncate">{campus.recommendedJeeps.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onPlanToCampus(campus)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-[var(--btn-primary-bg)] hover:opacity-90 text-[var(--btn-primary-text)] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all pressable"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Plan Route Here</span>
                  </button>

                  {campus.googleMapsUrl && (
                    <a
                      href={campus.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--card-border)] transition-colors"
                      title="View on Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JeepCampusesPage;
