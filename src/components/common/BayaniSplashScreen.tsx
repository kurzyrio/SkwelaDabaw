import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EagleBuddy } from './EagleBuddy';
import { playEagleSound } from '../../utils/audio';
import { db, initializeDatabaseWithSeedData } from '../../db';
import { applyTheme } from '../../themes';
import { 
  initializeNotificationChannels, 
  refreshUnremovableClassNotification,
  scheduleAllClassSchedulesReminders 
} from '../../services/notificationService';
import { CURRENT_APP_VERSION } from '../../services/updateService';

interface BayaniSplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const BayaniSplashScreen: React.FC<BayaniSplashScreenProps> = ({
  onFinish
}) => {
  const [statusText, setStatusText] = useState<string>('Starting your day in Davao...');
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const hasFinishedRef = useRef<boolean>(false);

  const finishSplash = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    playEagleSound('chirp');
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 200);
  }, [onFinish]);

  useEffect(() => {
    let isMounted = true;

    const runInitialization = async () => {
      try {
        // Stage 1: Verify and open local Dexie database
        await db.open();
        await initializeDatabaseWithSeedData();

        // Stage 2: Load and apply active theme
        const savedTheme = localStorage.getItem('skweladabaw_theme') || 'davao-classic-blue';
        applyTheme(savedTheme);

        if (isMounted) {
          setStatusText('Ready for campus & commute');
        }

        // Complete splash immediately as local database is ready
        setTimeout(() => {
          finishSplash();
        }, 320);

        // Stage 3 (Non-blocking Background Task):
        // Run notification channels & reminder scheduling asynchronously without delaying UI startup
        setTimeout(async () => {
          try {
            await initializeNotificationChannels();
            const allSchedules = await db.schedules.toArray();
            if (allSchedules && allSchedules.length > 0) {
              await scheduleAllClassSchedulesReminders(allSchedules);
            }
            await refreshUnremovableClassNotification(allSchedules);
          } catch (bgErr) {
            console.warn('[BayaniSplashScreen] Background setup note:', bgErr);
          }
        }, 100);

      } catch (err) {
        console.warn('Initialization notice:', err);
        if (isMounted) {
          finishSplash();
        }
      }
    };

    runInitialization();

    // Failsafe timeout so the user is never stuck on splash
    const failsafeTimer = setTimeout(() => {
      finishSplash();
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
    };
  }, [finishSplash]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between bg-[var(--canvas-bg)] text-[var(--text-primary)] px-6 pt-[max(env(safe-area-inset-top,1.5rem),2rem)] pb-[max(env(safe-area-inset-bottom,1.5rem),2rem)] select-none transition-opacity duration-200 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30 dark:opacity-20">
        <div className="w-[320px] h-[320px] bg-sky-500/15 rounded-full blur-[90px]" />
      </div>

      {/* Top Header */}
      <div className="w-full max-w-sm flex items-center justify-between relative z-10 pt-1">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="font-bold text-xs tracking-wide text-[var(--text-primary)]">
            Skwela<span className="text-sky-500 dark:text-sky-400 font-extrabold">Dabaw</span>
          </span>
        </div>
        <div className="text-[11px] font-semibold text-[var(--text-secondary)] tracking-wider font-mono">
          v{CURRENT_APP_VERSION}
        </div>
      </div>

      {/* Centered Bayani Mascot & Active Orbital Spinner */}
      <div className="flex flex-col items-center justify-center my-auto relative z-10 w-full max-w-sm space-y-6">
        <div className="relative flex items-center justify-center">
          {/* Smooth GPU-Accelerated Outer Orbital Spinner Ring */}
          <div 
            className="absolute -inset-3 rounded-full border-2 border-sky-500/15 border-t-sky-500 animate-spin pointer-events-none"
            style={{ animationDuration: '1.2s' }}
          />

          {/* Secondary Counter-Rotating Orbital Ring */}
          <div 
            className="absolute -inset-1.5 rounded-full border border-teal-400/20 border-b-teal-400 animate-spin pointer-events-none"
            style={{ animationDuration: '2.0s', animationDirection: 'reverse' }}
          />

          <EagleBuddy
            mood="friendly"
            width={150}
            height={165}
            showSpeech={false}
            isAnimated={true}
            isLoading={true}
          />
        </div>

        {/* Brand Title & Minimalist Loading Indicator */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Skwela<span className="text-sky-500 dark:text-sky-400">Dabaw</span>
          </h1>

          {/* Indeterminate Shimmer Loading Beam */}
          <div className="w-44 h-1.5 bg-[var(--nested-bg)] rounded-full overflow-hidden relative border border-[var(--nested-border)]">
            <div 
              className="absolute inset-y-0 w-2/5 bg-gradient-to-r from-sky-500 via-teal-400 to-sky-500 rounded-full animate-shimmer"
              style={{ animationDuration: '1.3s' }}
            />
          </div>

          {/* Clean 1-Line Status Text */}
          <p className="text-xs font-medium text-[var(--text-secondary)] tracking-tight">
            {statusText}
          </p>
        </div>
      </div>

      {/* Bottom Minimalist Footer */}
      <div className="w-full max-w-sm flex items-center justify-center pb-2 relative z-10">
        <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-70">
          Dabawenyo Student Companion • v{CURRENT_APP_VERSION}
        </span>
      </div>
    </div>
  );
};

export default BayaniSplashScreen;
