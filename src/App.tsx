import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { BatteryOptimizationModal } from './components/common/BatteryOptimizationModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { initOverlayLifecycle } from './services/eagleOverlayService';
import { ExitToast } from './components/common/ExitToast';
import { AnnouncementPopupModal } from './components/announcements/AnnouncementPopupModal';
import { openGooglePlayStore } from './services/updateService';
import { PopupAnnouncement, fetchActivePopupAnnouncement, isAnnouncementSnoozed } from './services/announcementService';
import { fetchDavaoWeather } from './services/weatherService';
import { db, initializeDatabaseWithSeedData } from './db';
import { syncScheduleToWidgets, syncTasksToWidgets, syncRoutinesToWidgets, isBatteryExemptionActive, WidgetBridge } from './services/widgetService';
import { Capacitor } from '@capacitor/core';
import { 
  subscribeToRemoteAppConfig, 
  RemoteAppConfig, 
  getCachedAppConfig, 
  fetchRemoteAppConfig,
  verifyServerMaintenanceBypass 
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
import { restoreUserData, syncLocalDataToCloud, queueCloudSync, syncCloudDataBiDirectional, getFirebaseIdToken, hasPendingLocalSync } from './services/cloudSyncService';
import { flushPendingSync } from './services/taskSyncService';
import { verifyProfileIntegrity, ProfileVerificationState, saveLocalUserRecord } from './services/userService';
import { requestNotificationPermission, refreshUnremovableClassNotification, scheduleAllClassSchedulesReminders, scheduleCommuteAndEasterNotifications, initOngoingNotificationLoop } from './services/notificationService';
import { useScheduleAlarm } from './hooks/useScheduleAlarm';
import { useBackHandler } from './hooks/useBackHandler';
import { useAntiSnooperEasterEgg } from './hooks/useAntiSnooperEasterEgg';
import { forceUnlockBodyScroll } from './hooks/useBodyScrollLock';
import { navigationManager, BackPriority } from './services/navigationManager';
import { applyTheme, DEFAULT_THEME_ID, hydrateCustomThemes } from './themes';
import { ThemeWallpaperLayer } from './components/common/ThemeWallpaperLayer';
import { ThemeInstallModal } from './components/themes/ThemeInstallModal';
import { extractThemeIdFromUrl } from './services/themeDownloadService';

export type AppView = 'main' | 'settings' | 'about' | 'changelog' | 'feedback' | 'import-schedule';

const WidgetDexieSync: React.FC = React.memo(() => {
  const liveSchedules = useLiveQuery(() => db.schedules.toArray(), []);
  const liveTasks = useLiveQuery(() => db.tasks.toArray(), []);

  useEffect(() => {
    if (liveSchedules) {
      if (localStorage.getItem('skweladabaw_persistent_next_class') === 'true') {
        refreshUnremovableClassNotification(liveSchedules).catch(() => {});
      } else {
        syncScheduleToWidgets(liveSchedules);
      }
      scheduleCommuteAndEasterNotifications(liveSchedules).catch(() => {});
    }
  }, [liveSchedules]);

  useEffect(() => {
    if (liveTasks) {
      syncTasksToWidgets(liveTasks);
    }
  }, [liveTasks]);

  useEffect(() => {
    return initOngoingNotificationLoop();
  }, []);

  return null;
});

export function App() {
  useAntiSnooperEasterEgg();

  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(true);
  const [activeAnnouncement, setActiveAnnouncement] = useState<PopupAnnouncement | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('schedule');
  const [tabHistory, setTabHistory] = useState<NavigationTab[]>(['schedule']);
  const [currentView, setCurrentView] = useState<AppView>('main');
  const [viewHistory, setViewHistory] = useState<AppView[]>(['main']);
  const [isExitToastVisible, setIsExitToastVisible] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [pendingOnboardingGoogleSession, setPendingOnboardingGoogleSession] = useState<StudentAuthSession | null>(null);
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = useState<boolean>(false);
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [isMissingProfileModalOpen, setIsMissingProfileModalOpen] = useState<boolean>(false);
  const [isBatteryModalOpen, setIsBatteryModalOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('skweladabaw_theme') || DEFAULT_THEME_ID;
  });
  const [userSession, setUserSession] = useState<UserSession>(getSavedSession());
  const [appConfig, setAppConfig] = useState<RemoteAppConfig>(getCachedAppConfig);
  const [isMaintenanceBypassed, setIsMaintenanceBypassed] = useState<boolean>(false);
  const [isJeepMapFullScreen, setIsJeepMapFullScreen] = useState<boolean>(false);
  const [isChatTyping, setIsChatTyping] = useState<boolean>(false);
  const [pendingImportCode, setPendingImportCode] = useState<string | undefined>(undefined);
  const [pendingThemeInstallId, setPendingThemeInstallId] = useState<string | null>(null);

  const { activeAlert, dismissAlert } = useScheduleAlarm();

  // Navigation Stack Helpers
  const navigateToView = useCallback((nextView: AppView) => {
    forceUnlockBodyScroll();
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
    forceUnlockBodyScroll();
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

  const currentViewRef = useRef<AppView>(currentView);
  currentViewRef.current = currentView;
  const activeTabRef = useRef<NavigationTab>(activeTab);
  activeTabRef.current = activeTab;

  const navigateToTab = useCallback((nextTab: NavigationTab) => {
    forceUnlockBodyScroll();
    if (currentViewRef.current !== 'main') {
      setViewHistory(['main']);
      setCurrentView('main');
    }
    if (nextTab === activeTabRef.current) return;
    if (nextTab !== 'jeep') {
      setIsJeepMapFullScreen(false);
    }
    setIsChatTyping(false);
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === nextTab) return prev;
      return [...prev, nextTab];
    });
    setActiveTab(nextTab);
  }, []);

  const handleBackTab = useCallback(() => {
    forceUnlockBodyScroll();
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
    (currentView === 'main' && tabHistory.length <= 1 && activeTab === 'schedule' && !isOnboardingOpen) ||
    (isOnboardingOpen && !hasCompletedOnboarding()),
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
    Boolean(activeAnnouncement),
    () => {
      setActiveAnnouncement(null);
    },
    BackPriority.MODAL,
    'app_announcement_popup'
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
      // Returning logged-in user who ALREADY completed onboarding: keep onboarding closed, flush pending mutations first, then hydrate from cloud
      setIsOnboardingOpen(false);
      (async () => {
        try {
          const hasPending = await hasPendingLocalSync(saved.uid);
          if (hasPending) {
            await flushPendingSync().catch(() => {});
            await syncCloudDataBiDirectional();
          } else {
            await restoreUserData(saved.uid);
          }
        } catch (err) {
          console.warn('Initial cloud restore note:', err);
        }
      })();
    } else if (!hasCompletedOnboarding()) {
      setIsOnboardingOpen(true);
    }
    if (Capacitor.isNativePlatform()) {
      requestNotificationPermission().catch((err) => {
        console.warn('Initial notification permission request:', err);
      });
    }

    // Immediate 0ms offline startup synchronization for unremovable notification, widgets & reminders
    db.schedules.toArray().then((scheds) => {
      const safeScheds = scheds || [];
      if (safeScheds.length > 0) {
        scheduleAllClassSchedulesReminders(safeScheds).catch(console.warn);
        refreshUnremovableClassNotification(safeScheds).catch(console.warn);
        syncScheduleToWidgets(safeScheds).catch(console.warn);
      }
      scheduleCommuteAndEasterNotifications(safeScheds).catch(() => {});
    }).catch(console.warn);
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

            const isLocalCampusCustom = Boolean(userSession.campusId);
            const isCloudCampusDefault = !result.user.campusId;
            const preserveLocalCampus = isProfileDirty || hasPendingSync || isLocalCampusCustom || (Boolean(userSession.campusId) && userSession.campusId !== result.user.campusId);

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
              campusId: preserveLocalCampus ? (userSession.campusId || result.user.campusId || '') : (result.user.campusId || userSession.campusId || ''),
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
          const currentGender = updatedSession.gender || result.user?.gender || getSavedSession().gender;
          const currentAge = updatedSession.age ?? result.user?.age ?? getSavedSession().age;
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

          const currentGender = userSession.gender || result.user?.gender || getSavedSession().gender;
          const currentAge = userSession.age ?? result.user?.age ?? getSavedSession().age;
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

          // If core fields (username/displayName/gender/age) are actually missing on existing account:
          const coreMissing = (result.missingFields || []).filter(
            f => f === 'username' || f === 'displayName' || f === 'gender' || f === 'age'
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

  // Verify admin bypass or authenticated admin role on server whenever maintenance mode is active
  useEffect(() => {
    let cancelled = false;
    if (!appConfig?.maintenance?.enabled) {
      setIsMaintenanceBypassed(false);
      return;
    }
    (async () => {
      const idToken = await getFirebaseIdToken().catch(() => null);
      const ok = await verifyServerMaintenanceBypass({ idToken });
      if (!cancelled) {
        setIsMaintenanceBypassed(ok);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appConfig?.maintenance?.enabled, userSession?.uid, userSession?.isLoggedIn]);

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

  // Handle widget route deep links & actions (registered once via stable navigateToTab)
  useEffect(() => {
    let isDisposed = false;
    let widgetListenerHandle: any = null;
    let appUrlListenerHandle: any = null;
    let isResuming = false;
    let lastResumeAt = 0;

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

      // Deep link / App Link handler for theme.kurzyrio.dev community themes
      const extractedThemeId = extractThemeIdFromUrl(urlStr);
      if (extractedThemeId) {
        setPendingThemeInstallId(extractedThemeId);
        return;
      }

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

    const hash = window.location.hash;
    const href = window.location.href;
    handleUrl(`${hash} ${href}`);

    // Check cold-boot launch target & URL from Android WidgetBridge and Capacitor App plugin
    if (Capacitor.isNativePlatform()) {
      CapApp.getLaunchUrl().then((launch) => {
        if (!isDisposed && launch?.url) {
          handleUrl(launch.url);
        }
      }).catch(() => {});

      WidgetBridge.getLaunchTarget().then((res) => {
        if (!isDisposed && res) {
          if (res.url) {
            handleUrl(res.url);
          } else if (res.tab || res.action) {
            processLaunch(res.tab, res.action);
          }
        }
      }).catch((e) => console.warn('Error reading launch target:', e));

      try {
        Promise.resolve(
          (WidgetBridge as any).addListener('launchTarget', (data: { tab?: string; action?: string; url?: string }) => {
            if (data?.url) {
              handleUrl(data.url);
            } else if (data && (data.tab || data.action)) {
              processLaunch(data.tab, data.action);
            }
          })
        ).then((handle) => {
          if (isDisposed) {
            handle?.remove?.();
          } else {
            widgetListenerHandle = handle;
          }
        }).catch((err) => console.warn('addListener launchTarget error:', err));
      } catch (err) {
        console.warn('addListener launchTarget error:', err);
      }
    }

    try {
      Promise.resolve(
        CapApp.addListener('appUrlOpen', (data) => {
          if (data?.url) {
            handleUrl(data.url);
          }
        })
      ).then((handle) => {
        if (isDisposed) {
          handle?.remove?.();
        } else {
          appUrlListenerHandle = handle;
        }
      }).catch((err) => console.warn('CapApp appUrlOpen listener error:', err));
    } catch (err) {
      console.warn('CapApp appUrlOpen listener error:', err);
    }

    const handleResume = async () => {
      if (isDisposed) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = Date.now();
      if (isResuming || now - lastResumeAt < 1500) return;
      isResuming = true;
      lastResumeAt = now;

      try {
        const [allSchedules, allTasks, allRoutines] = await Promise.all([
          db.schedules.toArray(),
          db.tasks.toArray(),
          db.dayReminders.toArray()
        ]);
        if (isDisposed) return;
        await Promise.all([
          syncScheduleToWidgets(allSchedules),
          syncTasksToWidgets(allTasks),
          syncRoutinesToWidgets(allRoutines),
          refreshUnremovableClassNotification(allSchedules)
        ]);
      } catch (err) {
        console.warn('Widget & notification resume sync error:', err);
      } finally {
        isResuming = false;
      }
    };

    window.addEventListener('focus', handleResume);
    document.addEventListener('visibilitychange', handleResume);
    return () => {
      isDisposed = true;
      widgetListenerHandle?.remove?.();
      appUrlListenerHandle?.remove?.();
      window.removeEventListener('focus', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, [navigateToTab]);

  // Initialize native Eagle Overlay lifecycle listeners (auto-resume on app focus, return from settings)
  useEffect(() => {
    const cleanup = initOverlayLifecycle();
    const overlayInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      import('./services/eagleOverlayService').then((m) => m.autoSyncCurrentStateToOverlay()).catch(() => {});
    }, 45000);
    return () => {
      cleanup();
      clearInterval(overlayInterval);
    };
  }, []);

  // Initialize offline local database & check for updates
  useEffect(() => {
    let isUnmounted = false;
    initializeDatabaseWithSeedData().catch((err) => {
      console.error('Local database initialization error:', err);
    });

    let notifSub: any = null;
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action.notification?.extra;
        if (extra?.type === 'app_update' || extra?.target_action === 'update') {
          openGooglePlayStore();
        }
      }).then((handle) => {
        if (isUnmounted) {
          handle?.remove?.();
        } else {
          notifSub = handle;
        }
      }).catch((e) => console.warn('LocalNotifications listener error:', e));
    }

    const updateTimer = setTimeout(async () => {
      if (isUnmounted) return;
      try {
        // Fetch on-launch active announcement popup (community relief drives, class advisories)
        const announcement = await fetchActivePopupAnnouncement();
        if (!isUnmounted && announcement && !isAnnouncementSnoozed(announcement.id)) {
          setActiveAnnouncement(announcement);
        }

        // Prime real-time Davao weather cache & evaluate alert thresholds
        fetchDavaoWeather().catch(() => {});
      } catch (e) {
        console.warn('Silent startup checks error:', e);
      }
    }, 2000);

    return () => {
      isUnmounted = true;
      clearTimeout(updateTimer);
      if (notifSub && typeof notifSub.remove === 'function') {
        notifSub.remove();
      }
    };
  }, []);

  // Modular Theme Syncing & Persistence (hydrate offline SkwelaDabawThemesDB on mount)
  useEffect(() => {
    let active = true;
    hydrateCustomThemes()
      .then(() => {
        if (active) applyTheme(localStorage.getItem('skweladabaw_theme') || DEFAULT_THEME_ID);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

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
    setPendingOnboardingGoogleSession(null);
    setUserSession(session);
    saveSession(session);
    setIsOnboardingOpen(false);
  };

  const handleStartFreshOnboarding = useCallback((googleSession: StudentAuthSession) => {
    forceUnlockBodyScroll();
    setUserSession(googleSession);
    setCurrentView('main');
    setViewHistory(['main']);
    setPendingOnboardingGoogleSession(googleSession);
    setIsOnboardingOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    setPendingOnboardingGoogleSession(null);
    setCurrentView('main');
    setViewHistory(['main']);
    setActiveTab('schedule');
    setTabHistory(['schedule']);
    setIsOnboardingOpen(true);
  }, []);

  const handleUpdateSession = (session: UserSession) => {
    const wasLoggedIn = userSession.isLoggedIn;
    setUserSession(session);
    saveSession(session);
    if (session.isLoggedIn && session.uid) {
      if (!wasLoggedIn) {
        syncCloudDataBiDirectional().catch(() => {});
      } else {
        queueCloudSync(session);
      }
    }
    if (wasLoggedIn && !session.isLoggedIn) {
      handleLogout();
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

    if (appConfig?.maintenance?.enabled && !isMaintenanceBypassed) {
      return (
        <MaintenanceScreen 
          config={appConfig.maintenance} 
          onCheckAgain={async () => {
            const fresh = await fetchRemoteAppConfig();
            setAppConfig(fresh);
          }}
          onAdminBypass={() => setIsMaintenanceBypassed(true)}
        />
      );
    }

    if (isOnboardingOpen) {
      return (
        <DedicatedOnboardingPage 
          onComplete={handleFinishOnboarding} 
          currentTheme={theme}
          onChangeTheme={setTheme}
          initialGoogleSession={pendingOnboardingGoogleSession}
        />
      );
    }

    if (currentView === 'settings') {
      return (
        <div key="settings" className="animate-page-enter">
          <ErrorBoundary fallbackTitle="Settings" onGoBack={handleBackView} onReset={() => setCurrentView('main')}>
            <SettingsPage
              userSession={userSession}
              onUpdateSession={handleUpdateSession}
              onLogout={handleLogout}
              onStartFreshOnboarding={handleStartFreshOnboarding}
              currentTheme={theme}
              onChangeTheme={setTheme}
              onBack={handleBackView}
              onOpenAbout={() => navigateToView('about')}
              onOpenChangelog={() => navigateToView('changelog')}
              onOpenFeedback={() => navigateToView('feedback')}
            />
          </ErrorBoundary>
        </div>
      );
    }

    if (currentView === 'about') {
      return (
        <div key="about" className="animate-page-enter">
          <ErrorBoundary fallbackTitle="About" onGoBack={handleBackView} onReset={() => setCurrentView('main')}>
            <AboutPage 
              onBack={handleBackView}
              onOpenChangelog={() => navigateToView('changelog')}
            />
          </ErrorBoundary>
        </div>
      );
    }

    if (currentView === 'changelog') {
      return (
        <div key="changelog" className="animate-page-enter">
          <ErrorBoundary fallbackTitle="Changelog" onGoBack={handleBackView} onReset={() => setCurrentView('main')}>
            <ChangelogPage 
              onBack={handleBackView} 
              onOpenAbout={() => navigateToView('about')}
            />
          </ErrorBoundary>
        </div>
      );
    }

    if (currentView === 'feedback') {
      return (
        <div key="feedback" className="animate-page-enter">
          <ErrorBoundary fallbackTitle="Feedback" onGoBack={handleBackView} onReset={() => setCurrentView('main')}>
            <StudentFeedbackPage 
              onBack={handleBackView}
              onOpenSettings={() => navigateToView('settings')}
            />
          </ErrorBoundary>
        </div>
      );
    }

    if (currentView === 'import-schedule') {
      return (
        <div key="import-schedule" className="animate-page-enter">
          <ErrorBoundary fallbackTitle="Schedule Import" onGoBack={handleBackView} onReset={() => navigateToTab('schedule')}>
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
      <div className={`skwela-app-shell relative z-10 min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col transition-colors ${(activeTab === 'dcbus' || activeTab === 'chat' || isFullScreenMap) ? 'h-[100dvh] overflow-hidden' : ''}`}>
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
              <ErrorBoundary fallbackTitle="Class Schedule" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <ScheduleManager onOpenImport={() => navigateToView('import-schedule')} />
              </ErrorBoundary>
            )}
            {activeTab === 'tasks' && (
              <ErrorBoundary fallbackTitle="Tasks" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <TaskTrackerPage />
              </ErrorBoundary>
            )}
            {activeTab === 'tools' && (
              <ErrorBoundary fallbackTitle="Student Hub" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
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
              <ErrorBoundary fallbackTitle="GPA Calculator" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <GpaCalculatorPage />
              </ErrorBoundary>
            )}
            {activeTab === 'calendar' && (
              <ErrorBoundary fallbackTitle="Calendar" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <CalendarPage />
              </ErrorBoundary>
            )}
            {activeTab === 'jeep' && (
              <ErrorBoundary fallbackTitle="Jeepney Transit" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <JeepRouteFinder 
                  onNavigateToBus={() => navigateToTab('dcbus')} 
                  onFullScreenChange={setIsJeepMapFullScreen}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'dcbus' && (
              <ErrorBoundary fallbackTitle="Davao City Bus" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <DcBusPage onNavigateToJeep={() => navigateToTab('jeep')} />
              </ErrorBoundary>
            )}
            {activeTab === 'announcements' && (
              <ErrorBoundary fallbackTitle="Announcements" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <AnnouncementBoard 
                  userSession={userSession} 
                  onNavigateToCommunity={() => navigateToTab('community')} 
                />
              </ErrorBoundary>
            )}
            {activeTab === 'community' && (
              <ErrorBoundary fallbackTitle="Community Discussions" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <CommunityPostsPage 
                  userSession={userSession} 
                  onOpenAuth={() => setIsOnboardingOpen(true)} 
                />
              </ErrorBoundary>
            )}
            {activeTab === 'chat' && (
              <ErrorBoundary fallbackTitle="Community Chat" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <StudentCommunityChat 
                  userSession={userSession} 
                  onBack={handleBackTab}
                  onNavigateTab={navigateToTab}
                  onOpenAuth={() => setIsOnboardingOpen(true)}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'spots' && (
              <ErrorBoundary fallbackTitle="Study Spots" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <StudySpotFinder />
              </ErrorBoundary>
            )}
            {activeTab === 'budget' && (
              <ErrorBoundary fallbackTitle="Budget Tracker" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <BudgetTracker />
              </ErrorBoundary>
            )}
            {activeTab === 'emergency' && (
              <ErrorBoundary fallbackTitle="Emergency Directory" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <EmergencyDirectory />
              </ErrorBoundary>
            )}
            {activeTab === 'about' && (
              <ErrorBoundary fallbackTitle="About" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
                <AboutPage 
                  onBack={() => navigateToTab('schedule')} 
                  onOpenChangelog={() => navigateToView('changelog')} 
                />
              </ErrorBoundary>
            )}
            {activeTab === 'weather' && (
              <ErrorBoundary fallbackTitle="Weather" onGoBack={handleBackTab} onReset={() => navigateToTab('schedule')}>
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
    <ErrorBoundary 
      fallbackTitle="Application Shell" 
      onGoBack={() => { setCurrentView('main'); setActiveTab('schedule'); }}
      onReset={() => { setCurrentView('main'); setActiveTab('schedule'); }}
    >
      {/* GPU-Composited Wallpaper/GIF/Gradient Layer (renders null on official themes) */}
      <ThemeWallpaperLayer />

      {/* Isolated Dexie -> Widget/Notification synchronization (prevents root <App /> re-renders) */}
      <WidgetDexieSync />

      {/* Global Interactive Screen Tap Particle Effect (Mounted Globally at Root) */}
      <ScreenTapEffect />

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
          signOutUser().catch(() => signOutUser(undefined, { skipAccountSync: true }).catch(() => {}));
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
          const newSession = { ...userSession, ...updated };
          setUserSession(newSession);
          saveSession(newSession);
          sessionStorage.setItem('skwela_session_checked', 'true');
        }}
      />

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

      {/* Community Theme Install Modal (Deep Link / App Link / QR Code) */}
      <ThemeInstallModal
        themeId={!showSplashScreen ? pendingThemeInstallId : null}
        onClose={() => setPendingThemeInstallId(null)}
        onThemeEquipped={(newId) => setTheme(newId)}
      />

      {/* Android Hardware Back Button Double-Tap Exit Notification */}
      <ExitToast isVisible={isExitToastVisible} />
    </ErrorBoundary>
  );
}

export default App;
