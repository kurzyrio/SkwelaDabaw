import React from 'react';
import { X, Info, Heart, Shield, Tag, MapPin, Code, Compass } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm sheet-backdrop-enter select-none">
      <div className="bg-[var(--card-bg)] w-full max-w-sm rounded-3xl border border-[var(--card-border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sheet-enter-spring">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--nested-bg)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--card-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] flex items-center justify-center font-bold">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">About SkwelaDabaw</h3>
              <p className="text-xs text-[var(--text-secondary)]">Davao Student Companion</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="text-center space-y-2 py-2">
            <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden shadow-lg border border-[var(--nested-border)] flex items-center justify-center bg-black">
              <img src="/app-icon.png" alt="SkwelaDabaw Icon" className="w-full h-full object-cover" />
            </div>
            <h4 className="font-bold text-base text-[var(--text-primary)]">
              SkwelaDabaw
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Campus schedule, jeepney transit, allowance tracking &amp; emergency hotlines.
            </p>
          </div>

          {/* Specs Card */}
          <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                Author:
              </span>
              <span className="font-bold text-[var(--text-primary)]">Kurzyrio</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                Version:
              </span>
              <span className="font-semibold text-[var(--text-primary)]">1.4.1</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                Region:
              </span>
              <span className="font-semibold text-[var(--text-primary)]">Davao City, Philippines</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                Data Storage:
              </span>
              <span className="font-semibold text-[var(--text-primary)]">Local Encrypted IndexedDB</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-center">
            <p className="text-[11px] text-[var(--text-secondary)] flex items-center justify-center gap-1">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
              <span>for Davao Students</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--card-border)] flex justify-end bg-[var(--nested-bg)]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
