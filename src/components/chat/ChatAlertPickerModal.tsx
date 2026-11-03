import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CloudRain, AlertTriangle, X, Send, MapPin, Construction, Car, Users } from 'lucide-react';

interface ChatAlertPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendAlert: (alertData: {
    category: string;
    location: string;
    description: string;
    icon: string;
  }) => void;
}

const ALERT_CATEGORIES = [
  { id: 'traffic', label: 'Heavy Traffic', icon: Car, emoji: '🚦', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { id: 'flood', label: 'Flash Flood / Rain', icon: CloudRain, emoji: '🌧️', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  { id: 'construction', label: 'Road Work / Reroute', icon: Construction, emoji: '🚧', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 'queue', label: 'Long Jeep Queue', icon: Users, emoji: '🚌', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  { id: 'accident', label: 'Road Incident', icon: AlertTriangle, emoji: '⚠️', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' }
];

const POPULAR_LOCATIONS = [
  'Roxas Ave (AdDU/Night Market)',
  'Matina Crossing',
  'Bankerohan River Bridge',
  'Bajada / Victoria Plaza',
  'Ulas Crossing',
  'Toril Public Market',
  'Buhangin Underpass',
  'C.M. Recto (Claveria)',
  'Ecoland Terminal',
  'Agdao Flyover'
];

export const ChatAlertPickerModal: React.FC<ChatAlertPickerModalProps> = ({
  isOpen,
  onClose,
  onSendAlert
}) => {
  const [selectedCat, setSelectedCat] = useState(ALERT_CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;

    onSendAlert({
      category: selectedCat.label,
      location: location.trim(),
      description: details.trim() || `Reported ${selectedCat.label.toLowerCase()} at ${location.trim()}.`,
      icon: selectedCat.emoji
    });
    onClose();
    setLocation('');
    setDetails('');
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
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Post Commute Alert</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">Broadcast real-time Davao road situation to students</p>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {/* Category Chips */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Alert Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALERT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCat.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all pressable ${
                      isSelected
                        ? `${cat.color} font-bold ring-2 ring-amber-500/40`
                        : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Input & Chips */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location / Intersection *</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={location}
              onChange={(e) => setLocation(e.target.value.slice(0, 100))}
              placeholder="e.g. Roxas Ave fronting Ateneo Finster Gate"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--card-hover-border)]"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className="px-2 py-1 text-[10px] rounded-lg bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--nested-border)] transition-colors pressable"
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Situation Details (Optional)
              </label>
              <span className={`text-[10px] font-mono ${details.length >= 270 ? 'text-amber-400 font-bold' : 'text-[var(--text-tertiary)]'}`}>
                {details.length}/300
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={300}
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 300))}
              placeholder="e.g. Heavy standstill traffic heading north due to road repairs. Expect 20 min delays."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--card-hover-border)] resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!location.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 pressable shadow-md shadow-amber-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Commute Alert</span>
          </button>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
