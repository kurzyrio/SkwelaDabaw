import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bus, Search, X, ArrowRight, Check } from 'lucide-react';
import { DAVAO_JEEP_ROUTES } from '../../data/davaoJeepRoutes';
import { RouteCardPayload } from './cards/ChatRouteCard';

interface ChatRoutePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (payload: RouteCardPayload) => void;
}

export const ChatRoutePickerModal: React.FC<ChatRoutePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectRoute
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return DAVAO_JEEP_ROUTES;
    return DAVAO_JEEP_ROUTES.filter(
      (r) =>
        r.routeName.toLowerCase().includes(q) ||
        r.routeCode.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.landmarks.some((l) => l.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const handlePickRoute = (r: typeof DAVAO_JEEP_ROUTES[0]) => {
    onSelectRoute({
      routeId: r.id,
      routeName: `${r.routeCode}: ${r.origin} ➔ ${r.destination}`,
      fromName: r.origin,
      toName: r.destination,
      estimatedFare: `₱${r.baseFareStudent.toFixed(2)} Student / ₱${r.regularBaseFare.toFixed(2)} Regular`
    });
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
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Share Transit Route</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">Pick a Davao jeepney route to send to chat</p>
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
            placeholder="Search route name, terminal, or campus..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--card-hover-border)]"
          />
        </div>

        {/* Route List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {filteredRoutes.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
              No routes found matching "{searchQuery}"
            </div>
          ) : (
            filteredRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => handlePickRoute(route)}
                className="w-full p-3 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] border border-[var(--nested-border)] text-left transition-all flex flex-col gap-1.5 pressable"
              >
                <div className="flex items-center justify-between gap-2">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shrink-0"
                    style={{ backgroundColor: route.color || '#3b82f6' }}
                  >
                    {route.routeCode}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500">
                    ₱{route.baseFareStudent.toFixed(2)} (Student)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] font-medium">
                  <span className="truncate max-w-[130px]">{route.origin}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                  <span className="truncate max-w-[130px]">{route.destination}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] truncate">
                  <span className="truncate">{route.landmarks.slice(0, 3).join(' • ')}</span>
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
