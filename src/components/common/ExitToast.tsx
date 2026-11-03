import React from 'react';

interface ExitToastProps {
  isVisible: boolean;
}

export const ExitToast: React.FC<ExitToastProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[max(env(safe-area-inset-bottom),5rem)] left-0 right-0 px-4 z-[99999] flex justify-center pointer-events-none select-none animate-fade-in"
    >
      <div className="flex items-center justify-center px-4 py-2 rounded-full bg-[var(--card-bg)]/95 text-[var(--text-primary)] text-xs font-bold tracking-wide shadow-2xl border border-[var(--card-border)] backdrop-blur-xl">
        Press back again to exit
      </div>
    </div>
  );
};
