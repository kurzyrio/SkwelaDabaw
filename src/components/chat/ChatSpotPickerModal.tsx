import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Search, X, Wifi, Zap, Clock, Bookmark } from 'lucide-react';
import { STUDY_SPOTS } from '../../data/studySpots';
import { StudySpot } from '../../types';

interface ChatSpotPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSpot: (spot: StudySpot) => void;
}

export const ChatSpotPickerModal: React.FC<ChatSpotPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSpot
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSpots = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return STUDY_SPOTS;
    return STUDY_SPOTS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const handlePickSpot = (spot: StudySpot) => {
    onSelectSpot(spot);
    onClose();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/60 backdrop-blur-xs sheet-backdrop-enter"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[var(--card-bg)] border-t border-[var(--card-border)] rounded-t-3xl p-5 pb-safe space-y-4 sheet-enter-spring max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Recommend Study Spot</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">Share cafes, libraries & wifi hubs in Davao</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--nested-bg)] text-[var(--text-secondary)] flex items-center justify-center hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cafe, library, or area (e.g. Jacinto, Obrero)..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--card-hover-border)]"
          />
        </div>

        {/* Spot List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {filteredSpots.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
              No study spots found matching "{searchQuery}"
            </div>
          ) : (
            filteredSpots.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => handlePickSpot(spot)}
                className="w-full p-3 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] border border-[var(--nested-border)] text-left transition-all flex flex-col gap-1.5 pressable"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {spot.name}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold shrink-0">
                    <Bookmark className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{spot.rating}</span>
                  </div>
                </div>

                <div className="text-[11px] text-[var(--text-secondary)] truncate">
                  {spot.area} • {spot.address}
                </div>

                <div className="flex items-center gap-2 pt-0.5 text-[10px] text-[var(--text-secondary)] flex-wrap">
                  {spot.hasWifi && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-500 font-semibold">
                      <Wifi className="w-3 h-3" /> Wi-Fi
                    </span>
                  )}
                  {spot.hasOutlets && (
                    <span className="inline-flex items-center gap-0.5 text-sky-500 font-semibold">
                      <Zap className="w-3 h-3" /> Outlets
                    </span>
                  )}
                  {spot.is24Hours ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-bold">
                      24/7 Open
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[var(--text-tertiary)]">
                      <Clock className="w-3 h-3" /> {spot.hours}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
