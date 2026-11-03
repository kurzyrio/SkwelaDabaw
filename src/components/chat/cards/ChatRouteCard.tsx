import React from 'react';
import { Bus, Navigation, ArrowRight, MapPin } from 'lucide-react';

export interface RouteCardPayload {
  routeId: string;
  routeName: string;
  fromName: string;
  toName: string;
  estimatedFare?: string;
  startCoords?: [number, number];
  endCoords?: [number, number];
}

interface ChatRouteCardProps {
  payload: RouteCardPayload | string;
  onViewRoute?: (payload: RouteCardPayload) => void;
}

export const ChatRouteCard: React.FC<ChatRouteCardProps> = ({ payload, onViewRoute }) => {
  let data: RouteCardPayload | null = null;
  try {
    data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch (_) {
    data = null;
  }

  if (!data) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] border-l-4 border-l-sky-500 space-y-2.5 w-full max-w-full min-w-0 overflow-hidden shadow-xs">
      {/* Route Badge & Student Fare */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center shrink-0">
            <Bus className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)] truncate min-w-0 flex-1">
            {data.routeName || data.routeId || 'Jeepney Route'}
          </span>
        </div>
        {data.estimatedFare && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
            {data.estimatedFare}
          </span>
        )}
      </div>

      {/* Visual Journey: Clean vertical timeline fitting all screen widths */}
      <div className="flex flex-col gap-1.5 text-xs text-[var(--text-secondary)] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-2.5 rounded-xl min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-medium truncate text-[var(--text-primary)] min-w-0 flex-1" title={data.fromName}>
            {data.fromName || 'Origin'}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span className="font-medium truncate text-[var(--text-primary)] min-w-0 flex-1" title={data.toName}>
            {data.toName || 'Destination'}
          </span>
        </div>
      </div>

      {/* Action Button */}
      {onViewRoute && (
        <button
          type="button"
          onClick={() => onViewRoute(data!)}
          className="w-full py-2 px-3 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-[0.98] transition-all pressable"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>View on Map</span>
        </button>
      )}
    </div>
  );
};
