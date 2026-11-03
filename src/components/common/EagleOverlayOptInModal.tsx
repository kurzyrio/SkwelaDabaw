import React from 'react';
import { Compass, X, MoveHorizontal, CheckCircle2 } from 'lucide-react';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { 
  requestOverlayPerm, 
  startEagleOverlay, 
  setEagleOverlayEnabledPref 
} from '../../services/eagleOverlayService';

export const EAGLE_OVERLAY_PROMPTED_KEY = 'skwela_eagle_overlay_prompted';

interface EagleOverlayOptInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnabled?: () => void;
}

export const EagleOverlayOptInModal: React.FC<EagleOverlayOptInModalProps> = ({
  isOpen,
  onClose,
  onEnabled
}) => {
  const handleSkip = () => {
    try {
      localStorage.setItem(EAGLE_OVERLAY_PROMPTED_KEY, 'true');
    } catch (_) {}
    setEagleOverlayEnabledPref(false);
    onClose();
  };

  useBackHandler(isOpen, handleSkip, BackPriority.MODAL, 'eagle_overlay_opt_in');

  if (!isOpen) return null;

  const handleEnable = async () => {
    try {
      localStorage.setItem(EAGLE_OVERLAY_PROMPTED_KEY, 'true');
      const permRes = await requestOverlayPerm();
      if (permRes.granted) {
        await startEagleOverlay();
      } else {
        setEagleOverlayEnabledPref(true);
      }
      if (onEnabled) onEnabled();
    } catch (err) {
      console.warn('Eagle overlay opt-in error:', err);
      setEagleOverlayEnabledPref(true);
    } finally {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleSkip}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[var(--card-bg,#1c1c1e)] border border-[var(--card-border,#2c2c2e)] p-6 shadow-2xl space-y-5 text-[var(--text-primary,#ffffff)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="eagle-optin-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-2xl bg-[var(--btn-primary-bg,#2563eb)]/15 border border-[var(--btn-primary-bg,#2563eb)]/30 flex items-center justify-center text-[var(--btn-primary-bg,#3b82f6)]">
            <Compass className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="p-2 rounded-xl text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#ffffff)] hover:bg-[var(--nested-bg,#27272a)] transition-colors pressable cursor-pointer"
            aria-label="Skip for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2 id="eagle-optin-title" className="text-base font-bold tracking-tight">
            Eagle Floating Overlay
          </h2>
          <p className="text-xs text-[var(--text-secondary,#a1a1aa)] leading-relaxed">
            A system-wide floating companion that stays accessible over any app. Access live Davao weather, up-next class schedules, and quick navigation.
          </p>
        </div>

        <div className="space-y-2 rounded-2xl bg-[var(--nested-bg,#121214)] border border-[var(--card-border,#27272a)] p-3.5">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-primary,#ffffff)]">
            <MoveHorizontal className="w-4 h-4 text-[#30D158] shrink-0" />
            <span>Snaps smoothly to left or right screen edges</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-primary,#ffffff)]">
            <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
            <span>Drag to bottom dismiss target to close anytime</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleEnable}
            className="w-full py-3 px-4 rounded-xl bg-[var(--btn-primary-bg,#2563eb)] text-[var(--btn-primary-text,#ffffff)] text-xs font-bold hover:opacity-95 active:scale-[0.98] transition-all shadow-md pressable cursor-pointer"
          >
            Enable Eagle Overlay
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2.5 px-4 rounded-xl text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#ffffff)] text-xs font-semibold transition-colors pressable cursor-pointer"
          >
            Skip / Disable for Now
          </button>
        </div>
      </div>
    </div>
  );
};
