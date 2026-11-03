import React, { useState } from 'react';
import { 
  Coffee, 
  Wifi, 
  Zap, 
  Clock, 
  MapPin, 
  Star, 
  Search, 
  Lightbulb
} from 'lucide-react';
import { STUDY_SPOTS } from '../../data/studySpots';
import { PageIntroGuide } from '../common/PageIntroGuide';

export const StudySpotFinder: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [onlyWifi, setOnlyWifi] = useState<boolean>(false);
  const [onlyOutlets, setOnlyOutlets] = useState<boolean>(false);
  const [only24h, setOnly24h] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  React.useEffect(() => {
    const checkSharedSpot = (targetName?: string) => {
      let spotName = targetName;
      if (!spotName) {
        try {
          const raw = localStorage.getItem('skweladabaw_selected_study_spot');
          if (raw) {
            const parsed = JSON.parse(raw);
            spotName = parsed.name;
            localStorage.removeItem('skweladabaw_selected_study_spot');
          }
        } catch (_) {}
      }
      if (spotName) {
        setSelectedArea('All');
        setOnlyWifi(false);
        setOnlyOutlets(false);
        setOnly24h(false);
        setSearchQuery(spotName);
      }
    };

    checkSharedSpot();

    const handleCustomEvent = (e: any) => {
      const detail = e.detail;
      if (detail && detail.name) {
        checkSharedSpot(detail.name);
      }
    };

    window.addEventListener('skweladabaw_select_study_spot', handleCustomEvent);
    return () => {
      window.removeEventListener('skweladabaw_select_study_spot', handleCustomEvent);
    };
  }, []);

  const AREAS = ['All', 'Obrero', 'Jacinto / Roxas', 'Matina', 'Downtown / San Pedro', 'Downtown / Bajada'];

  const filteredSpots = STUDY_SPOTS.filter((spot) => {
    if (selectedArea !== 'All' && spot.area !== selectedArea) return false;
    if (onlyWifi && !spot.hasWifi) return false;
    if (onlyOutlets && !spot.hasOutlets) return false;
    if (only24h && !spot.is24Hours) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        spot.name.toLowerCase().includes(q) ||
        spot.specialty.toLowerCase().includes(q) ||
        spot.area.toLowerCase().includes(q) ||
        spot.address.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-16 md:pb-6 animate-fade-in select-none">
      <PageIntroGuide
        pageKey="spots"
        icon={<Coffee className="w-6 h-6 text-[var(--text-primary)]" />}
        title="Davao Study Hubs &amp; Cafes"
        description="Find quiet study spaces near campus with verified high-speed Wi-Fi and power outlets."
        tips={[
          'Filter by campus district: Obrero, Jacinto, Matina, or Bajada.',
          'Toggle Fast Wi-Fi, Power Outlets, or 24/7 Opening.'
        ]}
      />

      {/* Top Grouped Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          <Coffee className="w-3.5 h-3.5 text-amber-500" />
          <span>Davao Study Spaces</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] pt-1">
          Study Hubs, Cafes &amp; Libraries
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Find quiet study spots near your campus with power outlets and Wi-Fi.
        </p>
      </div>

      {/* Search & Area Filter Bar */}
      <div className="space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cafe name, specialty, or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--card-hover-border)]"
          />
        </div>

        {/* Area Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {AREAS.map((area) => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 pressable ${
                selectedArea === area
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--nested-border)] hover:text-[var(--text-primary)]'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* Feature Toggles */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            onClick={() => setOnlyWifi(!onlyWifi)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition-all pressable ${
              onlyWifi
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--nested-border)]'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Fast Wi-Fi</span>
          </button>

          <button
            onClick={() => setOnlyOutlets(!onlyOutlets)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition-all pressable ${
              onlyOutlets
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--nested-border)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Power Outlets</span>
          </button>

          <button
            onClick={() => setOnly24h(!only24h)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border transition-all pressable ${
              only24h
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-transparent font-bold shadow-xs'
                : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] border-[var(--nested-border)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>24/7 Open</span>
          </button>
        </div>
      </div>

      {/* Spot Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredSpots.map((spot, idx) => (
          <div
            key={spot.id}
            className={`p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] transition-all space-y-2.5 relative group pressable stagger-${(idx % 6) + 1}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
                    {spot.area}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">{spot.priceRange}</span>
                </div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] mt-1">
                  {spot.name}
                </h4>
              </div>

              <div className="flex items-center gap-1 bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)] px-2 py-0.5 rounded-lg text-xs font-bold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{spot.rating}</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
              {spot.specialty}
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold">
              {spot.hasWifi && (
                <span className="flex items-center gap-1 text-[var(--text-primary)] bg-[var(--nested-bg)] border border-[var(--nested-border)] px-2 py-0.5 rounded-md">
                  <Wifi className="w-2.5 h-2.5" /> Wi-Fi
                </span>
              )}
              {spot.hasOutlets && (
                <span className="flex items-center gap-1 text-[var(--text-primary)] bg-[var(--nested-bg)] border border-[var(--nested-border)] px-2 py-0.5 rounded-md">
                  <Zap className="w-2.5 h-2.5" /> Outlets
                </span>
              )}
              {spot.is24Hours ? (
                <span className="flex items-center gap-1 text-[var(--text-primary)] bg-[var(--nested-bg)] border border-[var(--nested-border)] px-2 py-0.5 rounded-md font-bold">
                  <Clock className="w-2.5 h-2.5" /> 24/7
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[var(--text-secondary)] bg-[var(--nested-bg)] border border-[var(--nested-border)] px-2 py-0.5 rounded-md">
                  <Clock className="w-2.5 h-2.5" /> {spot.hours}
                </span>
              )}
            </div>

            {/* Tip Box */}
            <div className="text-[11px] bg-[var(--nested-bg)] p-2.5 rounded-xl text-[var(--text-secondary)] border border-[var(--nested-border)] flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div><strong className="text-[var(--text-primary)]">Tip:</strong> {spot.tips}</div>
            </div>

            <div className="pt-2 border-t border-[var(--card-border)] text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
              <span className="truncate">{spot.address}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
