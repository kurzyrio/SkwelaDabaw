import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Compass, X, ArrowRight, Lightbulb, HelpCircle } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';

export interface PageIntroGuideProps {
  pageKey: string;
  title: string;
  description: string;
  tips: string[];
  icon?: React.ReactNode;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
}

export const PageIntroGuide: React.FC<PageIntroGuideProps> = ({
  pageKey,
  title,
  description,
  tips,
  icon = <Lightbulb className="w-6 h-6 text-amber-400" />,
  isOpenControlled,
  onCloseControlled
}) => {
  const storageKey = `skweladabaw_intro_seen_${pageKey}`;
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpenControlled !== undefined) return;
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setInternalOpen(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [storageKey, isOpenControlled]);

  const isVisible = isOpenControlled !== undefined ? isOpenControlled : internalOpen;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    if (onCloseControlled) {
      onCloseControlled();
    } else {
      setInternalOpen(false);
    }
  };

  // Dismiss guide modal on Android back press
  useBackHandler(isVisible, handleDismiss, BackPriority.MODAL);

  if (!isVisible) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-fade-in"
      onClick={handleDismiss}
    >
      <div 
        className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="p-5 pb-3.5 shrink-0 flex items-start justify-between gap-3 border-b border-[var(--card-border)] bg-[var(--modal-bg)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center shrink-0 shadow-inner">
              {icon}
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-500 mb-1">
                <Compass className="w-3 h-3" />
                <span>Quick Guide</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight leading-tight">
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable shrink-0"
            title="Close Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-5 py-4 flex-1 overflow-y-auto overscroll-contain space-y-3.5">
          {/* Description */}
          <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
            {description}
          </p>

          {/* Tips / Highlights */}
          {tips.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Pro Tips and Features</span>
              </div>
              <ul className="space-y-2">
                {tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--text-primary)] leading-snug">
                    <span className="w-4 h-4 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-amber-500 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 pt-3 border-t border-[var(--card-border)] shrink-0 bg-[var(--modal-bg)]">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all pressable shadow-md"
          >
            <span>Understood</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const GuideTriggerButton: React.FC<{ onClick: () => void; label?: string }> = ({ 
  onClick, 
  label = 'Guide' 
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all pressable shrink-0"
    title="Open Feature Guide"
  >
    <HelpCircle className="w-3 h-3 text-amber-500 shrink-0" />
    <span>{label}</span>
  </button>
);
