import React, { useState } from 'react';
import { 
  Wrench, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  Lock, 
  ExternalLink 
} from 'lucide-react';
import { RemoteAppConfig } from '../../services/appConfigService';

interface MaintenanceScreenProps {
  config: RemoteAppConfig['maintenance'];
  onCheckAgain: () => Promise<void>;
  onAdminBypass?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  config,
  onCheckAgain,
  onAdminBypass
}) => {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [adminPass, setAdminPass] = useState<string>('');
  const [passError, setPassError] = useState<boolean>(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onCheckAgain();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass.trim().toLowerCase() === 'kurzyrio' || adminPass.trim() === 'skweladabaw2026') {
      localStorage.setItem('skweladabaw_admin_bypass', 'true');
      if (onAdminBypass) onAdminBypass();
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--canvas-bg)] text-[var(--text-primary)] select-none">
      <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-5 animate-scale-up">
        {/* Animated Icon Avatar */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Wrench className="w-10 h-10 animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-[var(--card-bg)] flex items-center justify-center text-[10px] text-black font-black">
            !
          </span>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {config.title || 'Scheduled System Maintenance'}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {config.message || 'SkwelaDabaw is currently undergoing brief scheduled improvements. We will be back online shortly!'}
          </p>
        </div>

        {/* Estimated Time Pill */}
        {config.estimatedEndTime && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs text-amber-400 font-mono font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Estimated return: {config.estimatedEndTime}</span>
          </div>
        )}

        {/* Actions */}
        <div className="w-full pt-2 space-y-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full py-3 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-sm shadow-md flex items-center justify-center gap-2 pressable transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking Cloud Status...' : 'Check Status Again'}</span>
          </button>

          <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-secondary)] pt-1">
            <a
              href="https://skweladabaw.kurzyrio.site/changelog.php"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
            >
              <span>Website Status</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <span>•</span>

            <button
              type="button"
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Admin Access
            </button>
          </div>

          {/* Admin Passcode Form */}
          {showAdminLogin && (
            <form onSubmit={handlePasscodeSubmit} className="pt-2 animate-fade-in flex gap-2">
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="Admin Passcode"
                className={`flex-1 px-3 py-2 rounded-xl bg-[var(--nested-bg)] border ${passError ? 'border-red-500' : 'border-[var(--card-border)]'} text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-gold)] font-mono`}
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--card-border)] pressable"
              >
                Bypass
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
