import React from 'react';
import { 
  PhoneCall, 
  User as UserIcon,
  ShieldAlert,
  Settings as SettingsIcon,
  CloudSun
} from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { UserSession } from '../settings/SettingsPage';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { useAppLanguage, t } from '../../services/languageService';
import { playEagleSound } from '../../utils/audio';
import { CachedAvatar } from '../common/CachedAvatar';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenEmergency: () => void;
  onOpenAbout?: () => void;
  onOpenWeather?: () => void;
  userSession: UserSession;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenEmergency,
  onOpenAbout,
  onOpenWeather,
  userSession
}) => {
  const isOnline = useOnlineStatus();
  const { language } = useAppLanguage();
  const userCampus = DAVAO_CAMPUSES.find((c) => c.id === userSession?.campusId);

  const handleEmergencyClick = () => {
    playEagleSound('alert');
    onOpenEmergency();
  };

  const handleProfileClick = () => {
    onOpenSettings();
  };

  const displayName = userSession.username 
    ? `@${userSession.username}` 
    : userSession.name && userSession.name !== 'Student' 
    ? userSession.name.split(' ')[0] 
    : 'Student';

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--card-border)] px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2.5 sm:px-6 transition-colors select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div 
          onClick={onOpenAbout}
          className="flex items-center gap-2.5 cursor-pointer pressable group"
          title="About SkwelaDabaw"
        >
          <div className="w-9 h-9 rounded-2xl overflow-hidden bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <img src="/app-icon.png" alt="SkwelaDabaw Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                Skwela<span className="text-sky-500 font-black">Dabaw</span>
              </h1>
              {userCampus && (
                <span className="hidden sm:inline-block text-[11px] font-semibold text-[var(--text-secondary)] truncate max-w-[130px]">
                  • {userCampus.shortName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium hidden xs:block leading-tight">
              {userSession.presetTag === 'Faculty' 
                ? t('header.facultyTagline', language) 
                : t('header.tagline', language)}
            </p>
          </div>
        </div>

        {/* Top Right Action Controls: Redesigned 911 & Profile Buttons */}
        <div className="flex items-center gap-2">
          {/* Live Davao Weather Capsule Button */}
          {onOpenWeather && (
            <button
              type="button"
              onClick={onOpenWeather}
              aria-label="Davao City Weather & Heat Index"
              title="Davao City Weather & Heat Index"
              className="h-9 px-2.5 sm:px-3 text-xs font-bold rounded-full bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center gap-1.5 transition-all cursor-pointer pressable shadow-xs active:scale-95"
            >
              <CloudSun className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden xs:inline">Weather</span>
            </button>
          )}

          {/* Elevated 911 Emergency Capsule Button */}
          <button
            type="button"
            onClick={handleEmergencyClick}
            aria-label="Davao Central 911 Emergency Hotlines"
            title="Davao Central 911 Emergency Hotlines"
            className="h-9 px-3 text-xs font-bold rounded-full bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center gap-1.5 transition-all cursor-pointer pressable shadow-xs active:scale-95"
          >
            <span className="relative flex items-center justify-center">
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-[var(--header-bg)]" />
            </span>
            <span className="tracking-wide">911</span>
            <span className="hidden md:inline font-semibold text-[11px] opacity-80">Safety</span>
          </button>

          {/* Elevated Profile Capsule Button */}
          <button
            type="button"
            onClick={handleProfileClick}
            aria-label="Profile and App Settings"
            title="Profile & Settings"
            className="h-9 px-2.5 sm:px-3 text-xs font-semibold rounded-full bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] text-[var(--text-primary)] flex items-center gap-2 transition-all cursor-pointer pressable shadow-xs active:scale-95"
          >
            {userSession.isLoggedIn ? (
              <CachedAvatar
                src={userSession.avatar}
                name={userSession.name || 'Student'}
                username={userSession.username}
                className="w-5 h-5 ring-1 ring-black/10 dark:ring-white/20 text-[9px]"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center shrink-0">
                <UserIcon className="w-3 h-3 text-[var(--text-secondary)]" />
              </div>
            )}
            <span className="font-bold text-xs truncate max-w-[90px] hidden sm:inline">
              {displayName}
            </span>
            <SettingsIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-70" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
