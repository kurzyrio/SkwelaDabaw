import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, User } from 'lucide-react';
import { PREMADE_AVATARS, PremadeAvatar } from '../../data/premadeAvatars';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { CachedAvatar } from './CachedAvatar';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl: string;
  onSelectAvatar: (url: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSelectAvatar
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'davao' | 'academic' | 'tech' | 'creative'>('all');

  // Dismiss modal on Android back press
  useBackHandler(isOpen, onClose, BackPriority.MODAL);

  if (!isOpen) return null;

  const filteredAvatars = PREMADE_AVATARS.filter(
    (a) => selectedCategory === 'all' || a.category === selectedCategory
  );

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--modal-bg)] w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-[var(--card-border)] space-y-4 sheet-enter-spring max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--card-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-center">
              <User className="w-4 h-4 text-[var(--text-primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight">
                Choose Profile Picture
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Select your Davao student avatar
              </p>
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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 shrink-0">
          {[
            { key: 'all', label: `All • ${PREMADE_AVATARS.length}` },
            { key: 'davao', label: 'Davao' },
            { key: 'academic', label: 'Academic' },
            { key: 'tech', label: 'Tech' },
            { key: 'creative', label: 'Creative' },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 pressable ${
                selectedCategory === cat.key
                  ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                  : 'bg-[var(--nested-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Avatars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 py-1 flex-1">
          {filteredAvatars.map((avatar: PremadeAvatar) => {
            const isSelected = currentAvatarUrl === avatar.url;

            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => {
                  onSelectAvatar(avatar.url);
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all relative pressable ${
                  isSelected
                    ? 'border-[var(--btn-primary-bg)] bg-[var(--nested-bg)]'
                    : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--text-secondary)]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center text-xs shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="w-16 h-16 rounded-full border border-[var(--card-border)] overflow-hidden shrink-0">
                  <CachedAvatar
                    src={avatar.url}
                    name={avatar.name}
                    className="w-full h-full"
                  />
                </div>

                <div className="min-w-0 w-full space-y-0.5">
                  <p className="font-bold text-xs text-[var(--text-primary)] truncate">
                    {avatar.name}
                  </p>
                  <p className="text-[10px] font-semibold text-[var(--text-secondary)] truncate">
                    {avatar.tag}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--card-border)] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
