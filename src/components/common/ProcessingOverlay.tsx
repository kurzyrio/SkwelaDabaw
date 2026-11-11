import React from 'react';
import { createPortal } from 'react-dom';
import { EagleBuddy } from './EagleBuddy';

export interface ProcessingOverlayProps {
  isOpen: boolean;
  message?: string;
  submessage?: string;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isOpen,
  message = 'Authenticating • Please wait',
  submessage = 'Connecting securely to SkwelaDabaw cloud'
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md select-none animate-fade-in pointer-events-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xs rounded-3xl bg-[var(--modal-bg)] border border-[var(--card-border)] p-6 shadow-2xl flex flex-col items-center justify-center text-center gap-3.5 animate-scale-up">
        {/* Animated Mascot with Active Orbital Spinner Ring & Glowing Halo */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Subtle Ambient Pulse Ring */}
          <div className="absolute -inset-2 rounded-full bg-sky-400/10 dark:bg-sky-400/15 animate-ping opacity-40 pointer-events-none" />

          {/* Smooth High-Performance GPU Orbital Spinner */}
          <div 
            className="absolute -inset-1.5 rounded-full border-2 border-sky-500/20 border-t-sky-500 animate-spin pointer-events-none"
            style={{ animationDuration: '1.1s' }}
          />

          <EagleBuddy
            mood="focused"
            width={76}
            height={84}
            showSpeech={false}
            isAnimated={true}
            isLoading={true}
          />

          {/* Soft Pedestal Shadow */}
          <div className="w-16 h-1.5 bg-sky-500/15 dark:bg-sky-400/15 rounded-full blur-xs -mt-1" />
        </div>

        {/* Smooth Indeterminate Progress Bar */}
        <div className="w-36 h-1.5 bg-[var(--nested-bg)] rounded-full overflow-hidden border border-[var(--nested-border)] relative">
          <div 
            className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-500 rounded-full animate-shimmer"
            style={{ animationDuration: '1.3s' }}
          />
        </div>

        {/* Status Message & Pulsing Indicator */}
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
            {message}
          </h4>
          {submessage && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
              {submessage}
            </p>
          )}
        </div>

        {/* Dynamic Status Activity Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProcessingOverlay;
