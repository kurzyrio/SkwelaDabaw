import React, { useState, useEffect, useCallback } from 'react';
import { AlarmClock, X as CloseIcon } from 'lucide-react';
import { Header } from './components/layout/Header';
import { Navbar, NavigationTab } from './components/layout/Navbar';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { ScheduleManager } from './components/schedule/ScheduleManager';
import { JeepRouteFinder } from './components/jeep/JeepRouteFinder';
import { DcBusPage } from './components/bus/DcBusPage';
import { StudentCommunityChat } from './components/chat/StudentCommunityChat';
import { AnnouncementBoard } from './components/announcements/AnnouncementBoard';
import { CommunityPostsPage } from './components/community/CommunityPostsPage';
import { StudySpotFinder } from './components/spots/StudySpotFinder';
import { BudgetTracker } from './components/budget/BudgetTracker';
import { EmergencyDirectory } from './components/emergency/EmergencyDirectory';
import { CalendarPage } from './components/calendar/CalendarPage';
import { ScreenTapEffect } from './components/common/ScreenTapEffect';
import { SettingsPage, UserSession } from './components/settings/SettingsPage';
import { DedicatedOnboardingPage } from './components/auth/DedicatedOnboardingPage';
import { SessionExpiredModal } from './components/auth/SessionExpiredModal';
import { MissingProfileInfoModal } from './components/auth/MissingProfileInfoModal';
import { AboutPage } from './components/about/AboutPage';
import { ChangelogPage } from './components/changelog/ChangelogPage';
import { StudentFeedbackPage } from './components/more/StudentFeedbackPage';
import { ScheduleImportPage } from './components/schedule/ScheduleImportPage';
import { GpaCalculatorPage } from './components/calculator/GpaCalculatorPage';
import { TaskTrackerPage } from './components/tasks/TaskTrackerPage';
import { WeatherPage } from './components/weather/WeatherPage';
import { StudentHubPage } from './components/layout/StudentHubPage';
import { BayaniSplashScreen } from './components/common/BayaniSplashScreen';
import { AppUpdateModal } from './components/common/AppUpdateModal';
import { UpdateBannerPill } from './components/common/UpdateBannerPill';
import { BatteryOptimizationModal } from './components/common/BatteryOptimizationModal';
import { EagleOverlayOptInModal } from './components/common/EagleOverlayOptInModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { EagleOverlay } from './components/common/EagleOverlay';
import { initOverlayLifecycle } from './services/eagleOverlayService';
import { ExitToast } from './components/common/ExitToast';
import { AnnouncementPopupModal } from './components/announcements/AnnouncementPopupModal';
import { checkForAppUpdate, UpdateCheckResult } from './services/updateService';
import { PopupAnnouncement, fetchActivePopupAnnouncement, isAnnouncementSnoozed } from './services/announcementService';
import { fetchDavaoWeather } from './services/weatherService';
import { db, initializeDatabaseWithSeedData } from './db';
import { syncScheduleToWidgets, syncTasksToWidgets, isBatteryExemptionActive, WidgetBridge } from './services/widgetService';
import { Capacitor } from '@capacitor/core';
import { 
  subscribeToRemoteAppConfig, 
  RemoteAppConfig, 
  getCachedAppConfig, 
  fetchRemoteAppConfig 
} from './services/appConfigService';
import { GlobalBroadcastBanner } from './components/common/GlobalBroadcastBanner';
import { MaintenanceScreen } from './components/common/MaintenanceScreen';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  getSavedSession, 
  saveSession, 
  hasCompletedOnboarding, 
  setOnboardingCompleted,
  subscribeToAuthChanges,
  StudentAuthSession,
  signOutUser
} from './services/authService';
import { restoreUserData, syncLocalDataToCloud, queueCloudSync } from './services/cloudSyncService';
import { verifyProfileIntegrity, ProfileVerificationState, saveLocalUserRecord } from './services/userService';
import { requestNotificationPermission, notifyAppUpdateAvailable } from './services/notificationService';
import { useScheduleAlarm } from './hooks/useScheduleAlarm';
import { useBackHandler } from './hooks/useBackHandler';
import { useAntiSnooperEasterEgg } from './hooks/useAntiSnooperEasterEgg';
import { navigationManager, BackPriority } from './services/navigationManager';
import { applyTheme, DEFAULT_THEME_ID } from './themes';

export type AppView = 'main' | 'settings' | 'about' | 'changelog' | 'feedback' | 'import-schedule';

export function App() {
  useAntiSnooperEasterEgg();

  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(true);
  const [pendingUpdate, setPendingUpdate] = useState<UpdateCheckResult | null>(null);
  const [availableUpdatePill, setAvailableUpdatePill] = useState<UpdateCheckResult | null>(null);
  const [activeAnnouncement, setActiveAnnouncement] = useState<PopupAnnouncement | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('schedule');
  const [tabHistory, setTabHistory] = useState<NavigationTab[]>(['schedule']);
  const [currentView, setCurrentView] = useState<AppView>('main');
  const [viewHistory, setViewHistory] = useState<AppView[]>(['main']);
  const [isExitToastVisible, setIsExitToastVisible] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState<boolean>(false);
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [isMissingProfileModalOpen, setIsMissingProfileModalOpen] = useState<boolean>(false);
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState<boolean>(false);
  const [isEagleOverlayPromptOpen, setIsEagleOverlayPromptOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('skweladabaw_theme') || DEFAULT_THEME_ID;
  });
  const [userSession, setUserSession] = useState<UserSession>(getSavedSession());
  const [appConfig, setAppConfig] = useState<RemoteAppConfig>(getCachedAppConfig);
  const [isJeepMapFullScreen, setIsJeepMapFullScreen] = useState<boolean>(false);
  const [isChatTyping, setIsChatTyping] = useState<boolean>(false);
  const [pendingImportCode, setPendingImportCode] = useState<string | undefined>(undefined);

  const { activeAlert, dismissAlert } = useScheduleAlarm();

  // Navigation Stack Helpers
  const navigateToView = useCallback((nextView: AppView) => {
    if (nextView === currentView) return;
    if (nextView === 'main') {
      setViewHistory(['main']);
      setCurrentView('main');
    } else {
      setViewHistory((prev) => {
        if (prev[prev.length - 1] === nextView) return prev;
        return [...prev, nextView];
      });
      setCurrentView(nextView);
    }
  }, [currentView]);

  const handleBackView = useCallback(() => {
    if (viewHistory.length > 1) {
      const updated = [...viewHistory];
      updated.pop();
      const previous = updated[updated.length - 1] || 'main';
      setViewHistory(updated);
      setCurrentView(previous);
      return true;
    } else if (currentView !== 'main') {
      setViewHistory(['main']);
      setCurrentView('main');
      return true;
    }
    return false;
  }, [viewHistory, currentView]);

  const navigateToTab = useCallback((nextTab: NavigationTab) => {
    if (currentView !== 'main') {
      setViewHistory(['main']);
      setCurrentView('main');
    }
    if (nextTab === activeTab) return;
    if (nextTab !== 'jeep') {
      setIsJeepMapFullScreen(false);
    }
    setIsChatTyping(false);
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === nextTab) return prev;
      return [...prev, nextTab];
    });
    setActiveTab(nextTab);
  }, [currentView, activeTab]);

  const handleBackTab = useCallback(() => {
    if (tabHistory.length > 1) {
      const updated = [...tabHistory];
      updated.pop();
      const previous = updated[updated.length - 1] || 'schedule';
      setTabHistory(updated);
      setActiveTab(previous);
      return true;
    } else if (activeTab !== 'schedule') {
      setTabHistory(['schedule']);
      setActiveTab('schedule');
      return true;
    }
    return false;
  }, [tabHistory, activeTab]);

  // Back Button Navigation Handlers (Prioritized LIFO)
  useBackHandler(
    currentView !== 'main',
    () => {
      handleBackView();
    },
    BackPriority.SUBVIEW,
    'app_subview'
  );

  useBackHandler(
    currentView === 'main' && (tabHistory.length > 1 || activeTab !== 'schedule'),
    () => {
      handleBackTab();
    },
    BackPriority.TAB,
    'app_tab'
  );

  useBackHandler(
    currentView === 'main' && tabHistory.length <= 1 && activeTab === 'schedule' && !isOnboardingOpen && !pendingUpdate,
    () => {
      navigationManager.armExit(2000);
    },
    BackPriority.ROOT,
    'app_root_exit'
  );

  useBackHandler(
    isOnboardingOpen && hasCompletedOnboarding(),
    () => {
      setIsOnboardingOpen(false);
    },
    BackPriority.MODAL,
    'app_onboarding'
  );

  useBackHandler(
    Boolean(pendingUpdate),
    () => {
      setPendingUpdate(null);
    },
    BackPriority.MODAL,
    'app_pending_update'
  );

  useBackHandler(
    Boolean(activeAnnouncement),
    () => {
      setActiveAnnouncement(null);
    },
    BackPriority.MODAL,
    'app_announcement_popup'
  );

  useBackHandler(
    isEagleOverlayPromptOpen,
    () => {
      setIsEagleOverlayPromptOpen(false);
    },
    BackPriority.MODAL,
    'app_eagle_overlay_prompt'
  );

  // Subscribe to root double-tap exit toast visibility
  useEffect(() => {
    const unsubscribe = navigationManager.onExitArmedChange((armed) => {
      setIsExitToastVisible(armed);
    });
    return () => unsubscribe();
  }, []);

  // Check first-time launch onboarding & auto-restore existing authenticated accounts
  useEffect(() => {
    const saved = getSavedSession();
    if (saved && saved.isLoggedIn && saved.uid && hasCompletedOnboarding()) {
      // Returning logged-in user who ALREADY completed onboarding: keep onboarding closed, and hydrate data from cloud
      setIsOnboardingOpen(false);
      restoreUserData(saved.uid).catch((err) => {
        console.warn('Initial cloud restore note:', err);
      });
      // Check if user has not yet been prompted for Eagle Overlay (Native Android Only)
      if (Capacitor.isNativePlatform() && typeof localStorage !== 'undefined' && localStorage.getItem('skwela_eagle_overlay_prompted') !== 'true') {
        setIsEagleOverlayPromptOpen(true);
      }
    } else if (!hasCompletedOnboarding()) {
      // Give Firebase Auth a brief window to restore existing OAuth session before opening onboarding
      const timer = setTimeout(() => {
        if (!hasCompletedOnboarding()) {
          setIsOnboardingOpen(true);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
    if (Capacitor.isNativePlatform()) {
      requestNotificationPermission().catch((err) => {
        console.warn('Initial notification permission request:', err);
      });
    }
  }, []);

  // ─── STRICT 4-STATE PROFILE VERIFICATION FLOW ─────────────────────────────
  // State 1: LOADING (Firebase Auth is ready, but MySQL fetch is in flight; NEVER evaluate missing info)
  // State 2: NETWORK_OR_DB_ERROR (MySQL unreachable, timeout, or 500; fallback to local cache, NEVER show setup popup)
  // State 3: PROFILE_COMPLETE (200 OK and core fields exist; hydrate storage and proceed normally)
  // State 4: PROFILE_INCOMPLETE (Confirmed 200 OK / 404 from server and core required fields genuinely blank)
  const [profileVerificationState, setProfileVerificationState] = useState<ProfileVerificationState>('LOADING');

  useEffect(() => {
    // STRICT OFFLINE EXEMPTION: never block offline students!
    if (!navigator.onLine) {
      setProfileVerificationState('PROFILE_COMPLETE');
      return;
    }

    if (!userSession.isLoggedIn || !userSession.uid) {
      return;
    }

    // Do not run background profile verification or trigger missing info modal while student is in onboarding
    if (isOnboardingOpen) {
      return;
    }

    if (sessionStorage.getItem('skwela_session_checked') === 'true') {
      setProfileVerificationState('PROFILE_COMPLETE');
      return;
    }

    let isMounted = true;
    setProfileVerificationState('LOADING');

    verifyProfileIntegrity(userSession.uid, userSession.email).then(async (result) => {
      if (!isMounted) return;

      switch (result.state) {
        case 'LOADING':
          // Keep waiting, never evaluate missing fields
          break;

        case 'NETWORK_OR_DB_ERROR': {
          setProfileVerificationState('NETWORK_OR_DB_ERROR');
          // If cached local profile data exists, let the user into the app seamlessly!
          const hasCachedProfile = Boolean(userSession.name && userSession.uid);
          if (hasCachedProfile) {
            console.info('Using local cached user profile due to temporary MySQL unavailability.');
          } else {
            console.warn('Network or DB error during initial profile verification on new device.');
          }
          break;
        }

        case 'PROFILE_COMPLETE': {
          setProfileVerificationState('PROFILE_COMPLETE');

          // Hydrate/update local device storage with latest MySQL data so offline starts are in sync
          let updatedSession: StudentAuthSession = userSession;
          if (result.user) {
            const hasPendingSync = typeof localStorage !== 'undefined' && (
              localStorage.getItem('skweladabaw_has_pending_cloud_sync') === 'true' ||
              localStorage.getItem('skweladabaw_pending_sync') === 'true' ||
              localStorage.getItem('skweladabaw_profile_dirty') === 'true'
            );
            const isProfileDirty = typeof localStorage !== 'undefined' && localStorage.getItem('skweladabaw_profile_dirty') === 'true';

            const isLocalCampusCustom = Boolean(userSession.campusId && userSession.campusId !== 'addu-jacinto');
            const isCloudCampusDefault = !result.user.campusId || result.user.campusId === 'addu-jacinto';
            const preserveLocalCampus = isProfileDirty || hasPendingSync || (isLocalCampusCustom && isCloudCampusDefault) || (Boolean(userSession.campusId) && userSession.campusId !== result.user.campusId && hasPendingSync);

            const isLocalNameCustom = Boolean(userSession.name && userSession.name !== 'Davao Student' && userSession.name !== 'Student');
            const isCloudNameDefault = !result.user.displayName || result.user.displayName === 'Davao Student';
            const preserveLocalName = isProfileDirty || hasPendingSync || (isLocalNameCustom && isCloudNameDefault);

            const isLocalCourseCustom = Boolean(userSession.course && userSession.course !== 'Enrolled Student');
            const isCloudCourseDefault = !result.user.course || result.user.course === 'Enrolled Student';
            const preserveLocalCourse = isProfileDirty || hasPendingSync || (isLocalCourseCustom && isCloudCourseDefault);

            const isLocalYearCustom = Boolean(userSession.yearLevel && userSession.yearLevel !== 'College Student');
            const isCloudYearDefault = !result.user.yearLevel || result.user.yearLevel === 'College Student';
            const preserveLocalYear = isProfileDirty || hasPendingSync || (isLocalYearCustom && isCloudYearDefault);

            updatedSession = {
              ...userSession,
              isLoggedIn: true,
              uid: result.user.uid,
              name: preserveLocalName ? (userSession.name || result.user.displayName || 'Student') : (result.user.displayName || userSession.name),
              username: result.user.username || userSession.username,
              email: result.user.email || userSession.email,
              avatar: (preserveLocalName && userSession.avatar) ? userSession.avatar : (result.user.avatar || userSession.avatar),
              campusId: preserveLocalCampus ? (userSession.campusId || result.user.campusId || 'addu-jacinto') : (result.user.campusId || userSession.campusId || 'addu-jacinto'),
              course: preserveLocalCourse ? (userSession.course || result.user.course || 'Enrolled Student') : (result.user.course || userSession.course || 'Enrolled Student'),
              yearLevel: preserveLocalYear ? (userSession.yearLevel || result.user.yearLevel || 'College Student') : (result.user.yearLevel || userSession.yearLevel || 'College Student'),
              role: result.user.role || userSession.role,
              age: (isProfileDirty || hasPendingSync) && userSession.age ? userSession.age : (result.user.age ?? userSession.age),
              gender: (isProfileDirty || hasPendingSync) && userSession.gender ? userSession.gender : (result.user.gender ?? userSession.gender)
            };
            saveSession(updatedSession);
            setUserSession(updatedSession);
            saveLocalUserRecord(result.user);

            if (hasPendingSync || preserveLocalCampus || preserveLocalCourse || preserveLocalYear) {
              queueCloudSync(updatedSession);
            }
          }

          // Check if existing/old user lacks newer personal information (gender, age)
          const currentGender = updatedSession.gender || result.user?.gender;
          const currentAge = updatedSession.age ?? result.user?.age;
          const missingNewer: string[] = [];
          if (!currentGender) missingNewer.push('gender');
          if (!currentAge || currentAge <= 0) missingNewer.push('age');

          // Only prompt existing/old users who already completed onboarding
          if (hasCompletedOnboarding() && missingNewer.length > 0) {
            setMissingProfileFields(missingNewer);
            setIsMissingProfileModalOpen(true);
          } else {
            sessionStorage.setItem('skwela_session_checked', 'true');
            setOnboardingCompleted(true);
            setIsOnboardingOpen(false);
            setIsMissingProfileModalOpen(false);
          }
          break;
        }

        case 'PROFILE_INCOMPLETE': {
          setProfileVerificationState('PROFILE_INCOMPLETE');

          // If the student has not finished onboarding, keep/open onboarding instead of the missing profile modal
          if (!hasCompletedOnboarding()) {
            setIsOnboardingOpen(true);
            break;
          }

          // Existing/old user who already completed onboarding:
          const hasLocalValidUsername = Boolean(userSession.username && !/^student_[a-f0-9]{6,16}$/i.test(userSession.username));
          const hasLocalName = Boolean(userSession.name && userSession.name.trim().length > 0 && userSession.name !== 'Student');

          const currentGender = userSession.gender || result.user?.gender;
          const currentAge = userSession.age ?? result.user?.age;
          const missingNewer: string[] = [];
          if (!currentGender) missingNewer.push('gender');
          if (!currentAge || currentAge <= 0) missingNewer.push('age');

          if (hasLocalValidUsername && hasLocalName) {
            // Auto-heal MySQL cloud in background with the local valid profile
            syncLocalDataToCloud(userSession).catch(() => {});

            if (missingNewer.length > 0) {
              setMissingProfileFields(missingNewer);
              setIsMissingProfileModalOpen(true);
            } else {
              setProfileVerificationState('PROFILE_COMPLETE');
              sessionStorage.setItem('skwela_session_checked', 'true');
              setIsMissingProfileModalOpen(false);
            }
            break;
          }

          // If core fields (username/displayName) are actually missing on existing account:
          const coreMissing = (result.missingFields || []).filter(
            f => f === 'username' || f === 'displayName' || f === 'isSetupComplete' || f === 'gender' || f === 'age'
          );
          if (coreMissing.length > 0) {
            setMissingProfileFields(coreMissing);
            setIsMissingProfileModalOpen(true);
          } else {
            setOnboardingCompleted(true);
            setIsOnboardingOpen(false);
            setIsMissingProfileModalOpen(false);
            sessionStorage.setItem('skwela_session_checked', 'true');
          }
          break;
        }
      }
    }).catch((err) => {
      console.warn('Profile verification unexpected error:', err);
      if (isMounted) {
        setProfileVerificationState('NETWORK_OR_DB_ERROR');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userSession.isLoggedIn, userSession.uid, userSession.email, isOnboardingOpen]);

  // Check Battery Optimization Exemption on Android so background alarms fire reliably
  useEffect(() => {
    const checkBattery = async () => {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const dismissedStr = localStorage.getItem('skwela_battery_prompt_dismissed');
        if (dismissedStr) {
          const dismissedAt = parseInt(dismissedStr, 10);
          if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) {
            return;
          }
        }
        const isActive = await isBatteryExemptionActive();
        if (!isActive) {
          setTimeout(() => {
            setIsBatteryModalOpen(true);
          }, 1500);
        }
      }
    };
    checkBattery();
  }, []);

  // Subscribe to auth changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((session) => {
      setUserSession(session);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to live remote app configuration (Maintenance mode, announcements, feature flags)
  useEffect(() => {
    const unsubscribe = subscribeToRemoteAppConfig((config) => {
      setAppConfig(config);
    });
    return () => unsubscribe();
  }, []);

  // Listen for tab navigation requests across components
  useEffect(() => {
    const handleNavTab = (e: any) => {
      const targetTab = typeof e?.detail === 'string' ? e.detail : e?.detail?.tab;
      if (targetTab) {
        navigateToTab(targetTab);
      }
    };
    window.addEventListener('skweladabaw_navigate_tab', handleNavTab);
    return () => window.removeEventListener('skweladabaw_navigate_tab', handleNavTab);
  }, [navigateToTab]);

  // Listen for real-time background user profile updates across tabs and views
  useEffect(() => {
    const handleProfileUpdated = (e: any) => {
      const updatedUser = e?.detail?.user;
      if (updatedUser && updatedUser.uid && updatedUser.uid === userSession?.uid) {
        setUserSession((prev) => ({
          ...prev,
          name: updatedUser.displayName || prev.name,
          username: updatedUser.username || prev.username,
          avatar: updatedUser.avatar || prev.avatar,
          campusId: updatedUser.campusId || prev.campusId,
          course: updatedUser.course || prev.course,
          yearLevel: updatedUser.yearLevel || prev.yearLevel,
          presetTag: updatedUser.presetTag || prev.presetTag,
          customTag: updatedUser.customTag || prev.customTag
        }));
      }
    };
    window.addEventListener('skwela_profile_updated', handleProfileUpdated);
    return () => window.removeEventListener('skwela_profile_updated', handleProfileUpdated);
  }, [userSession?.uid]);

  // Listen for schedule import page requests
  useEffect(() => {
    const handleOpenImport = () => {
      navigateToView('import-schedule');
    };
    window.addEventListener('skweladabaw_open_import', handleOpenImport);
    return () => window.removeEventListener('skweladabaw_open_import', handleOpenImport);
  }, [navigateToView]);

  // Real-time synchronization of schedules and tasks to Android widgets
  const liveSchedules = useLiveQuery(() => db.schedules.toArray(), []);
  const liveTasks = useLiveQuery(() => db.tasks.toArray(), []);

  useEffect(() => {
    if (liveSchedules) {
      syncScheduleToWidgets(liveSchedules);
    }
  }, [liveSchedules]);

  useEffect(() => {
    if (liveTasks) {
      syncTasksToWidgets(liveTasks);
    }
  }, [liveTasks]);

  // Handle widget route deep links & actions (initial load & runtime background resumes)
  useEffect(() => {
    const processLaunch = (tab?: string, action?: string) => {
      if (!tab && !action) return;
      const t = (tab || '').toLowerCase();
      const a = (action || '').toLowerCase();

      if (t === 'tasks' || t.includes('tasks')) {
        navigateToTab('tasks');
        if (a === 'tasks_add' || a === 'add' || a.includes('add')) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('skweladabaw_open_add_task'));
          }, 350);
        }
      } else if (t === 'schedule' || t.includes('schedule') || t.includes('timetable')) {
        navigateToTab('schedule');
        if (a === 'schedule_add' || a === 'add' || a.includes('add')) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('skweladabaw_open_add_class'));
          }, 350);
        }
      } else if (t === 'jeep' || t === 'transit' || t.includes('transit') || t.includes('jeep') || t.includes('dcbus')) {
        navigateToTab('jeep');
      }
    };

    const handleUrl = (urlStr: string) => {
      if (!urlStr) return;
      const lower = urlStr.toLowerCase();

      // Deep link / App Link handler for shared timetable links
      const shareCodeMatch = urlStr.match(/[?&](?:code|import)=([A-Za-z0-9_-]+)/i) ||
                             urlStr.match(/(?:share|schedule)\/([A-Za-z0-9_-]{5,10})/i);
      if (shareCodeMatch && shareCodeMatch[1]) {
        const extractedCode = shareCodeMatch[1].trim().toUpperCase();
        setPendingImportCode(extractedCode);
        navigateToView('import-schedule');
        return;
      }

      let action: string | undefined;
      if (lower.includes('action=tasks_add') || lower.includes('action=add')) {
        action = 'add';
      }
      if (lower.includes('tasks')) {
        processLaunch('tasks', action);
      } else if (lower.includes('transit') || lower.includes('jeep') || lower.includes('dcbus')) {
        processLaunch('jeep', action);
      } else if (lower.includes('schedule')) {
        processLaunch('schedule', action);
      }
    };

    const hash = window.location.hash.toLowerCase();
    const href = window.location.href.toLowerCase();
    handleUrl(`${hash} ${href}`);

    // Check cold-boot launch target from Android WidgetBridge
    if (Capacitor.isNativePlatform()) {
      WidgetBridge.getLaunchTarget().then((res) => {
        if (res && (res.tab || res.action)) {
          processLaunch(res.tab, res.action);
        }
      }).catch((e) => console.warn('Error reading launch target:', e));

      try {
        (WidgetBridge as any).addListener('launchTarget', (data: { tab?: string; action?: string }) => {
          if (data && (data.tab || data.action)) {
            processLaunch(data.tab, data.action);
          }
        });
      } catch (err) {
        console.warn('addListener launchTarget error:', err);
      }
    }

    let sub: any;
    try {
      sub = CapApp.addListener('appUrlOpen', (data) => {
        if (data?.url) {
          handleUrl(data.url);
        }
      });
    } catch (err) {
      console.warn('CapApp appUrlOpen listener error:', err);
    }

    const handleResume = async () => {
      try {
        const [allSchedules, allTasks] = await Promise.all([
          db.schedules.toArray(),
          db.tasks.toArray()
        ]);
        await Promise.all([
          syncScheduleToWidgets(allSchedules),
          syncTasksToWidgets(allTasks)
        ]);
      } catch (err) {
        console.warn('Widget resume sync error:', err);
      }
    };

    window.addEventListener('focus', handleResume);
    window.addEventListener('visibilitychange', handleResume);
    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('visibilitychange', handleResume);
    };
  }, [navigateToTab]);

  // Initialize native Eagle Overlay lifecycle listeners (auto-resume on app focus, return from settings)
  useEffect(() => {
    const cleanup = initOverlayLifecycle();
    const overlayInterval = setInterval(() => {
      import('./services/eagleOverlayService').then((m) => m.autoSyncCurrentStateToOverlay()).catch(() => {});
    }, 45000);
    return () => {
      cleanup();
      clearInterval(overlayInterval);
    };
  }, []);

  // Initialize offline local database & check for updates
  useEffect(() => {
    initializeDatabaseWithSeedData().catch((err) => {
      console.error('Local database initialization error:', err);
    });

    let notifSub: any;
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action.notification?.extra;
        if (extra?.type === 'app_update' || extra?.target_action === 'update') {
          checkForAppUpdate().then((res) => {
            if (res.hasUpdate) {
              setPendingUpdate(res);
              setAvailableUpdatePill(null);
            }
          });
        }
      }).then((handle) => {
        notifSub = handle;
      }).catch((e) => console.warn('LocalNotifications listener error:', e));
    }

    const updateTimer = setTimeout(async () => {
      try {
        const snoozedUntilStr = localStorage.getItem('skwela_update_snoozed_until');
        const snoozedUntil = snoozedUntilStr ? parseInt(snoozedUntilStr, 10) : 0;
        const snoozedVersion = localStorage.getItem('skwela_update_snoozed_version');

        const result = await checkForAppUpdate();
        if (result.hasUpdate) {
          const isSnoozed = Date.now() < snoozedUntil && snoozedVersion === result.latestVersion;
          if (result.isForceUpdate) {
            // Mandatory required update: display modal
            setPendingUpdate(result);
            setAvailableUpdatePill(null);
          } else if (!isSnoozed) {
            // Optional update: display dismissible modal once per release/snooze
            setPendingUpdate(result);
            setAvailableUpdatePill(null);
          } else {
            // Snoozed optional update: keep as quiet top pill only
            setAvailableUpdatePill(result);
          }
        }

        // Fetch on-launch active announcement popup (community relief drives, class advisories)
        const announcement = await fetchActivePopupAnnouncement();
        if (announcement && !isAnnouncementSnoozed(announcement.id)) {
          setActiveAnnouncement(announcement);
        }

        // Prime real-time Davao weather cache & evaluate alert thresholds
        fetchDavaoWeather().catch(() => {});
      } catch (e) {
        console.warn('Silent startup checks error:', e);
      }
    }, 2000);

    return () => {
      clearTimeout(updateTimer);
      if (notifSub && typeof notifSub.remove === 'function') {
        notifSub.remove();
      }
    };
  }, []);

  // Modular Theme Syncing & Persistence
  useEffect(() => {
    applyTheme(theme);

    const handleThemeChange = (e: any) => {
      const newThemeId = e?.detail?.themeId;
      if (newThemeId && newThemeId !== theme) {
        setTheme(newThemeId);
      }
    };
    window.addEventListener('skweladabaw_theme_changed', handleThemeChange);
    return () => window.removeEventListener('skweladabaw_theme_changed', handleThemeChange);
  }, [theme]);

  const handleFinishOnboarding = (session: StudentAuthSession) => {
    setUserSession(session);
    saveSession(session);
    setIsOnboardingOpen(false);
    if (Capacitor.isNativePlatform() && typeof localStorage !== 'undefined' && localStorage.getItem('skwela_eagle_overlay_prompted') !== 'true') {
      setIsEagleOverlayPromptOpen(true);
    }
  };

  const handleUpdateSession = (session: UserSession) => {
    const wasLoggedIn = userSession.isLoggedIn;
    setUserSession(session);
    saveSession(session);
    if (session.isLoggedIn && session.uid) {
      queueCloudSync(session);
    }
    if (!wasLoggedIn && session.isLoggedIn) {
      if (Capacitor.isNativePlatform() && typeof localStorage !== 'undefined' && localStorage.getItem('skwela_eagle_overlay_prompted') !== 'true') {
        setIsEagleOverlayPromptOpen(true);
      }
    }
  };

  // Render view content based on state
  const renderContent = () => {
    if (showSplashScreen) {
      return (
        <BayaniSplashScreen 
          onFinish={() => setShowSplashScreen(false)} 
          durationMs={2000} 
        />
      );
    }

    const isBypassed = typeof localStorage !== 'undefined' && localStorage.getItem('skweladabaw_admin_bypass') === 'true';
    const isAdmin = (userSession?.role as string) === 'admin' || userSession?.username?.toLowerCase() === 'admin';
    if (appConfig?.maintenance?.enabled && !isBypassed && !isAdmin) {
      return (
        <MaintenanceScreen 
          config={appConfig.maintenance} 
          onCheckAgain={async () => {
            const fresh = await fetchRemoteAppConfig();
            setAppConfig(fresh);
          }} 
        />
      );
    }

    if (isOnboardingOpen) {
      return (
        <DedicatedOnboardingPage 
          onComplete={handleFinishOnboarding} 
          currentTheme={theme}
          onChangeTheme={setTheme}
        />
      );
    }

    if (currentView === 'settings') {
      return (
        <div key="settings" className="animate-page-enter">
          <SettingsPage
            userSession={userSession}
            onUpdateSession={handleUpdateSession}
            currentTheme={theme}
            onChangeTheme={setTheme}
            onBack={handleBackView}
            onOpenAbout={() => navigateToView('about')}
            onOpenChangelog={() => navigateToView('changelog')}
            onReplayOnboarding={() => {
              navigateToView('main');
              setIsOnboardingOpen(true);
            }}
            onOpenFeedback={() => navigateToView('feedback')}
          />
        </div>
      );
    }

    if (currentView === 'about') {
      return (
        <div key="about" className="animate-page-enter">
          <AboutPage 
            onBack={handleBackView}
            onOpenChangelog={() => navigateToView('changelog')}
          />
        </div>
      );
    }

    if (currentView === 'changelog') {
      return (
        <div key="changelog" className="animate-page-enter">
          <ChangelogPage 
            onBack={handleBackView} 
            onOpenAbout={() => navigateToView('about')}
          />
        </div>
      );
    }

    if (currentView === 'feedback') {
      return (
        <div key="feedback" className="animate-page-enter">
          <StudentFeedbackPage 
            onBack={handleBackView}
            onOpenSettings={() => navigateToView('settings')}
          />
        </div>
      );
    }

    if (currentView === 'import-schedule') {
      return (
        <div key="import-schedule" className="animate-page-enter">
          <ErrorBoundary fallbackTitle="Unable to load Schedule Import" onReset={() => navigateToTab('schedule')}>
            <ScheduleImportPage
              onBack={handleBackView}
              initialCode={pendingImportCode}
              onImportComplete={() => {
                setPendingImportCode(undefined);
                handleBackView();
                navigateToTab('schedule');
              }}
            />
          </ErrorBoundary>
        </div>
      );
    }

    const isFullScreenMap = activeTab === 'jeep' && isJeepMapFullScreen;

    return (
      <div className={`min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col transition-colors ${(activeTab === 'dcbus' || activeTab === 'chat' || isFullScreenMap) ? 'h-[100dvh] overflow-hidden' : ''}`}>
        {/* Top Header */}
        {!isFullScreenMap && activeTab !== 'chat' && (
          <Header
            onOpenSettings={() => navigateToView('settings')}
            onOpenEmergency={() => navigateToTab('emergency')}
            onOpenAbout={() => navigateToView('about')}
            onOpenWeather={() => navigateToTab('weather')}
            userSession={userSession}
          />
        )}

        {/* Remote Global Broadcast Banner */}
        {!isFullScreenMap && activeTab !== 'chat' && (
          <GlobalBroadcastBanner config={appConfig.globalBanner} />
        )}

        {/* Offline Status Alert */}
        {!isFullScreenMap && activeTab !== 'chat' && (
          <OfflineBanner />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 w-full mx-auto relative z-10 transition-all ${
          isFullScreenMap
            ? 'max-w-none w-full h-full p-0 flex flex-col overflow-hidden min-h-0'
            : activeTab === 'dcbus' || activeTab === 'chat'
              ? 'max-w-none w-full p-0 flex flex-col overflow-hidden min-h-0'
              : 'max-w-6xl px-4 sm:px-6 py-3 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8'
        }`}>
          {/* Navigation Tabs */}
          {!isFullScreenMap && (
            <Navbar 
              activeTab={activeTab} 
              isHidden={activeTab === 'chat'}
              onChangeTab={(tab) => {
                if (tab === 'settings') {
                  navigateToView('settings');
                } else if (tab === 'about') {
                  navigateToView('about');
                } else {
                  navigateToTab(tab);
                }
              }} 
              onOpenSettings={() => navigateToView('settings')}
              onOpenFeedback={() => navigateToView('feedback')}
            />
          )}

          {/* Tab Panels */}
          <div 
            key={activeTab} 
            className={`${(activeTab === 'dcbus' || activeTab === 'chat' || isFullScreenMap) ? 'flex-1 min-h-0 flex flex-col overflow-hidden w-full h-full' : 'mt-2 animate-page-enter'}`}
          >
            {activeTab === 'schedule' && (
              <ErrorBoundary fallbackTitle="Unable to load Timetable" onReset={() => navigateToTab('schedule')}>
                <ScheduleManager onOpenImport={() => navigateToView('import-schedule')} />
              </ErrorBoundary>
            )}
            {activeTab === 'tasks' && (
              <ErrorBoundary fallbackTitle="Unable to load Tasks" onReset={() => navigateToTab('schedule')}>
                <TaskTrackerPage />
              </ErrorBoundary>
            )}
            {activeTab === 'tools' && (
              <ErrorBoundary fallbackTitle="Unable to load Student Hub" onReset={() => navigateToTab('schedule')}>
                <StudentHubPage 
                  onSelectTool={(tab) => {
                    if (tab === 'settings') {
                      navigateToView('settings');
                    } else if (tab === 'about') {
                      navigateToView('about');
                    } else {
                      navigateToTab(tab);
                    }
                  }} 
                  onOpenFeedback={() => navigateToView('feedback')} 
                />
              </ErrorBoundary>
            )}
            {(activeTab === 'gpa' || activeTab === 'grades') && (
              <ErrorBoundary fallbackTitle="Unable to load GPA Calculator" onReset={() => navigateToTab('schedule')}>
                <GpaCalculatorPage />
              </ErrorBoundary>
            )}
            {activeTab === 'calendar' && (
              <ErrorBoundary fallbackTitle="Unable to load Calendar" onReset={() => navigateToTab('schedule')}>
                <CalendarPage />
              </ErrorBoundary>
            )}
            {activeTab === 'jeep' && (
              <ErrorBoundary fallbackTitle="Unable to load Jeepney Transit" onReset={() => navigateToTab('schedule')}>
                <JeepRouteFinder 
                  onNavigateToBus={() => navigateToTab('dcbus')} 
                  onFullScreenChange={setIsJeepMapFullScreen}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'dcbus' && (
              <ErrorBoundary fallbackTitle="Unable to load Davao City Bus" onReset={() => navigateToTab('schedule')}>
                <DcBusPage onNavigateToJeep={() => navigateToTab('jeep')} />
              </ErrorBoundary>
            )}
            {activeTab === 'announcements' && (
              <ErrorBoundary fallbackTitle="Unable to load Announcements" onReset={() => navigateToTab('schedule')}>
                <AnnouncementBoard 
                  userSession={userSession} 
                  onNavigateToCommunity={() => navigateToTab('community')} 
                />
              </ErrorBoundary>
            )}
            {activeTab === 'community' && (
              <ErrorBoundary fallbackTitle="Unable to load Community Discussions" onReset={() => navigateToTab('schedule')}>
                <CommunityPostsPage 
                  userSession={userSession} 
                  onOpenAuth={() => setIsOnboardingOpen(true)} 
                />
              </ErrorBoundary>
            )}
            {activeTab === 'chat' && (
              <ErrorBoundary fallbackTitle="Unable to load Community Chat" onReset={() => navigateToTab('schedule')}>
                <StudentCommunityChat 
                  userSession={userSession} 
                  onBack={handleBackTab}
                  onNavigateTab={navigateToTab}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'spots' && (
              <ErrorBoundary fallbackTitle="Unable to load Study Spots" onReset={() => navigateToTab('schedule')}>
                <StudySpotFinder />
              </ErrorBoundary>
            )}
            {activeTab === 'budget' && (
              <ErrorBoundary fallbackTitle="Unable to load Budget Tracker" onReset={() => navigateToTab('schedule')}>
                <BudgetTracker />
              </ErrorBoundary>
            )}
            {activeTab === 'emergency' && (
              <ErrorBoundary fallbackTitle="Unable to load Emergency Directory" onReset={() => navigateToTab('schedule')}>
                <EmergencyDirectory />
              </ErrorBoundary>
            )}
            {activeTab === 'about' && (
              <ErrorBoundary fallbackTitle="Unable to load About page" onReset={() => navigateToTab('schedule')}>
                <AboutPage 
                  onBack={() => navigateToTab('schedule')} 
                  onOpenChangelog={() => navigateToView('changelog')} 
                />
              </ErrorBoundary>
            )}
            {activeTab === 'weather' && (
              <ErrorBoundary fallbackTitle="Unable to load Weather" onReset={() => navigateToTab('schedule')}>
                <WeatherPage onBack={() => navigateToTab('schedule')} />
              </ErrorBoundary>
            )}
          </div>
        </main>

        {/* Desktop Footer */}
        {activeTab !== 'dcbus' && activeTab !== 'jeep' && !isFullScreenMap && (
          <footer className="hidden md:block py-5 text-center text-xs text-[#8E8E93] mt-auto relative z-10">
            <p className="font-medium text-[#8E8E93]">
              SkwelaDabaw • Davao Student Campus &amp; Transit System
            </p>
          </footer>
        )}
      </div>
    );
  };

  return (
    <ErrorBoundary fallbackTitle="Application Shell">
      {/* Global Interactive Screen Tap Particle Effect (Mounted Globally at Root) */}
      <ScreenTapEffect />

      {/* Assistive Draggable Snapping Eagle Mascot Overlay (Mobile Android Native Only) */}
      {Capacitor.isNativePlatform() && (
        <EagleOverlay onNavigate={(tab) => navigateToTab(tab)} currentTab={activeTab} />
      )}

      {/* In-App Live Class Reminder Alert Banner */}
      {activeAlert && (
        <div className="fixed top-[calc(max(env(safe-area-inset-top),1.25rem)+4rem)] left-0 right-0 px-4 z-[9999] flex justify-center pointer-events-none select-none">
          <div className="w-full max-w-lg pointer-events-auto p-3.5 sm:p-4 rounded-2xl bg-[var(--card-bg)]/95 backdrop-blur-xl border border-[#FF9F0A]/40 text-[var(--text-primary)] shadow-2xl flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FF9F0A]/20 text-[#FF9F0A] flex items-center justify-center font-bold text-sm shrink-0">
                <AlarmClock className="w-4 h-4 text-[#FF9F0A]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[var(--text-primary)] truncate">{activeAlert.subjectCode}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF9F0A]/20 text-[#FF9F0A]">
                    Starts in {activeAlert.minutesLeft}m
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {activeAlert.subjectName} • {activeAlert.room ? `Room ${activeAlert.room}` : 'Campus'} • {activeAlert.startTime}
                </p>
              </div>
            </div>
            <button
              onClick={dismissAlert}
              aria-label="Dismiss alert"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-colors pressable text-xs font-bold"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Content */}
      {renderContent()}

      {/* Ghost Account Session Expired Re-Login Modal */}
      <SessionExpiredModal
        isOpen={isSessionExpiredModalOpen}
        userName={userSession.name}
        onReLogin={() => {
          setIsSessionExpiredModalOpen(false);
          setIsOnboardingOpen(true);
        }}
        onContinueGuest={() => {
          setIsSessionExpiredModalOpen(false);
          signOutUser();
        }}
      />

      {/* Missing Required Profile Information & Password Modal */}
      <MissingProfileInfoModal
        isOpen={isMissingProfileModalOpen}
        uid={userSession.uid || ''}
        email={userSession.email || ''}
        missingFields={missingProfileFields}
        onSaved={(updated) => {
          setIsMissingProfileModalOpen(false);
          setUserSession((prev) => ({ ...prev, ...updated }));
          sessionStorage.setItem('skwela_session_checked', 'true');
        }}
      />

      {/* Non-Intrusive Floating Update Pill */}
      {availableUpdatePill && !pendingUpdate && (
        <UpdateBannerPill
          updateInfo={availableUpdatePill}
          onOpenDetails={() => {
            setPendingUpdate(availableUpdatePill);
            setAvailableUpdatePill(null);
          }}
          onDismiss={() => {
            setAvailableUpdatePill(null);
            try {
              localStorage.setItem('skwela_update_snoozed_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
              localStorage.setItem('skwela_update_snoozed_version', availableUpdatePill.latestVersion);
            } catch (_) {}
          }}
        />
      )}

      {/* In-App Update Modal (Firebase Hosting) */}
      {pendingUpdate && (
        <AppUpdateModal
          updateInfo={pendingUpdate}
          onClose={() => setPendingUpdate(null)}
        />
      )}

      {/* On-Launch MySQL Announcement Popup Modal */}
      {activeAnnouncement && (
        <AnnouncementPopupModal
          announcement={activeAnnouncement}
          onClose={() => setActiveAnnouncement(null)}
        />
      )}

      {/* Battery Optimization Exemption Modal */}
      <BatteryOptimizationModal
        isOpen={isBatteryModalOpen}
        onClose={() => setIsBatteryModalOpen(false)}
      />

      {/* Eagle Floating Overlay Onboarding Opt-In Modal (Mobile Android Native Only) */}
      {Capacitor.isNativePlatform() && (
        <EagleOverlayOptInModal
          isOpen={isEagleOverlayPromptOpen}
          onClose={() => setIsEagleOverlayPromptOpen(false)}
        />
      )}

      {/* Android Hardware Back Button Double-Tap Exit Notification */}
      <ExitToast isVisible={isExitToastVisible} />
    </ErrorBoundary>
  );
}

export default App;
