import React, { useState, useEffect } from 'react';
import { WifiOff, ShieldCheck, X } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const SESSION_DISMISS_KEY = 'skwela_offline_banner_dismissed';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // If device returns online, clear dismissed flag so future drops warn the user again
  useEffect(() => {
    if (isOnline) {
      try {
        sessionStorage.removeItem(SESSION_DISMISS_KEY);
      } catch {}
      setIsDismissed(false);
    }
  }, [isOnline]);

  if (isOnline || isDismissed) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    } catch {}
    setIsDismissed(true);
  };

  return (
    <div className="mx-4 mt-2 sm:mx-6 animate-fade-in transition-all">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 font-medium min-w-0">
          <div className="p-1.5 shrink-0 bg-[var(--nested-bg)] border border-[var(--nested-border)] rounded-xl text-[var(--text-primary)]">
            <WifiOff className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="font-bold tracking-wide uppercase text-[10px] bg-[var(--nested-bg)] text-[var(--text-primary)] px-2 py-0.5 rounded-md mr-1.5 border border-[var(--nested-border)]">
              Offline Mode
            </span>
            <span className="text-[var(--text-secondary)] text-xs">Schedules, Jeep Routes &amp; Emergency Hub active offline.</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-[var(--text-secondary)] text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-primary)]" />
            <span>Local Database Active</span>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss offline banner"
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
