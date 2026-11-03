import React from 'react';
import { MapPin, Wifi, Zap, Bookmark, Compass } from 'lucide-react';
import { StudySpot } from '../../../types';

interface ChatSpotCardProps {
  payload: StudySpot | string;
  onViewSpot?: (spot: StudySpot) => void;
}

export const ChatSpotCard: React.FC<ChatSpotCardProps> = ({ payload, onViewSpot }) => {
  let data: StudySpot | null = null;
  try {
    data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch (_) {
    data = null;
  }

  if (!data) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] border-l-4 border-l-emerald-500 space-y-2.5 w-full max-w-full min-w-0 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
            {data.name}
          </span>
        </div>
        {data.rating && (
          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <Bookmark className="w-3 h-3 fill-emerald-500/30 text-emerald-500" />
            <span>{data.rating}</span>
          </div>
        )}
      </div>

      {/* Address & Hours */}
      <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-2.5 rounded-xl">
        <p className="font-semibold text-[var(--text-primary)] truncate">{data.area}</p>
        <p className="truncate opacity-80 text-[10px]">{data.address}</p>
      </div>

      {/* Amenity Badges */}
      <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] flex-wrap">
        {data.hasWifi && (
          <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10">
            <Wifi className="w-3 h-3" /> Wi-Fi
          </span>
        )}
        {data.hasOutlets && (
          <span className="inline-flex items-center gap-1 text-sky-500 font-semibold px-2 py-0.5 rounded-md bg-sky-500/10">
            <Zap className="w-3 h-3" /> Outlets
          </span>
        )}
        {data.is24Hours && (
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500 font-bold">
            24/7 Open
          </span>
        )}
      </div>

      {/* Action Button */}
      {onViewSpot && (
        <button
          type="button"
          onClick={() => onViewSpot(data!)}
          className="w-full py-2 px-3 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-[0.98] transition-all pressable"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore in Study Spots</span>
        </button>
      )}
    </div>
  );
};
