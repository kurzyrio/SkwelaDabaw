import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { School, Search, Check, X, MapPin } from 'lucide-react';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface CampusPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampusId: string;
  onSelectCampus: (campusId: string) => void;
}

export const CampusPickerModal: React.FC<CampusPickerModalProps> = ({
  isOpen,
  onClose,
  selectedCampusId,
  onSelectCampus
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lock background scrolling safely with reference counting
  useBodyScrollLock(isOpen);

  // Dismiss modal on Android back press
  useBackHandler(isOpen, onClose, BackPriority.MODAL);

  if (!isOpen) return null;

  const filteredCampuses = DAVAO_CAMPUSES.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none overscroll-none touch-none"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div 
        className="w-full max-w-lg bg-[var(--modal-bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sheet-enter-spring overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--card-border)] bg-[var(--nested-bg)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-center">
              <School className="w-4 h-4 text-[var(--text-primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Select University / Campus</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">54+ Davao Campuses &amp; Colleges with verified routes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b border-[var(--card-border)] bg-[var(--nested-bg)]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campus e.g. Ateneo, USEP, UM, UIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-semibold focus:outline-hidden"
              autoFocus
            />
          </div>
        </div>

        {/* Campus Cards List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 max-h-[60vh]">
          {filteredCampuses.map((campus) => {
            const isSelected = selectedCampusId === campus.id;
            return (
              <button
                key={campus.id}
                type="button"
                onClick={() => {
                  onSelectCampus(campus.id);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 pressable ${
                  isSelected
                    ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                    : 'border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-black text-white' : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)]'}`}>
                    {campus.shortName.substring(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm truncate">
                      {campus.name}
                    </h4>
                    <p className={`text-[11px] flex items-center gap-1 mt-0.5 truncate ${isSelected ? 'opacity-80' : 'text-[var(--text-secondary)]'}`}>
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{campus.address}</span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected && (
                    <Check className="w-4 h-4" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
