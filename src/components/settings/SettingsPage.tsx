import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  ArrowLeft,
  User, 
  Palette, 
  Database, 
  Download, 
  Upload,
  RefreshCw, 
  Lock, 
  LogOut,
  Building2,
  ChevronRight,
  ChevronDown,
  Shield,
  Info,
  Check,
  CheckSquare,
  AlertTriangle,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  School,
  Lightbulb,
  Bus,
  Bug,
  Globe,
  Compass,
  MessageSquare,
  Heart,
  Bell,
  Moon,
  Sun,
  Zap,
  Activity,
  Volume2,
  Wand2,
  GraduationCap,
  FileText,
  ShieldCheck,
  Calendar,
  Wallet,
  LayoutGrid,
  ListOrdered,
  Eye,
  EyeOff,
  KeyRound,
  CheckCheck,
  ExternalLink,
  Bot,
  CloudSun,
  MoveHorizontal
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { LegalModal } from '../common/LegalModal';
import { SelectWithOther } from '../common/SelectWithOther';
import { CustomSelect } from '../common/CustomSelect';
import { db, initializeDatabaseWithSeedData } from '../../db';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { 
  isOverlayPermitted, 
  requestOverlayPerm, 
  startEagleOverlay, 
  stopEagleOverlay, 
  setEagleOverlayEnabledPref, 
  isEagleOverlayEnabledPref,
  autoSyncCurrentStateToOverlay 
} from '../../services/eagleOverlayService';
import { flushPendingSync } from '../../services/taskSyncService';
import { StudentAuthSession, signInWithGoogle, signOutUser, setOnboardingCompleted, saveSession } from '../../services/authService';
import { 
  checkUsernameAvailable, 
  updateUsername, 
  fetchLiveUserProfile, 
  UserAccountRecord, 
  saveUserProfile, 
  switchAccountSchedules,
  checkExistingUserDetailed,
  syncUserSchedules,
  saveLocalUserRecord,
  updateUserProfileFields
} from '../../services/userService';
import { syncLocalDataToCloud, queueCloudSync, syncCloudDataBiDirectional, LAST_SYNC_KEY } from '../../services/cloudSyncService';
import { AccountLinkSyncModal } from '../auth/AccountLinkSyncModal';
import { CampusPickerModal } from '../common/CampusPickerModal';
import { ProcessingOverlay } from '../common/ProcessingOverlay';
import { EagleBuddy } from '../common/EagleBuddy';
import { ScheduleImportModal } from '../schedule/ScheduleImportModal';
import { CachedAvatar } from '../common/CachedAvatar';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { useAppLanguage, AppLanguage, t } from '../../services/languageService';
import { isAudioEnabled, setAudioEnabled } from '../../utils/audio';
import { checkForAppUpdate, CURRENT_APP_VERSION, UpdateCheckResult } from '../../services/updateService';
import { 
  sendTestNotification, 
  NOTIFICATION_THEMES, 
  NotificationThemeConfig,
  updatePersistentNextClassNotification,
  refreshUnremovableClassNotification,
  cancelPersistentNextClassNotification,
  requestNotificationPermission,
  checkNotificationPermission,
  scheduleAllClassSchedulesReminders
} from '../../services/notificationService';
import { requestBatteryExemption, isBatteryExemptionActive, syncScheduleToWidgets } from '../../services/widgetService';
import { AppUpdateModal } from '../common/AppUpdateModal';
import {
  TapEffectStyle,
  TapSoundType,
  getSavedTapEffectStyle,
  getSavedTapSound,
  getSavedTapSpeed,
  isTapEffectEnabled,
  playTapSound,
  notifyTapSettingsChange
} from '../common/ScreenTapEffect';
import { AVAILABLE_THEMES, applyTheme, getTheme } from '../../themes';

export interface UserSession extends StudentAuthSession {
  lastUsernameChange?: string;
  isVerified?: boolean;
  presetTag?: string;
  customTag?: string;
  customTagBg?: string;
  customTagColor?: string;
}

export type SettingsCategory = 
  | 'account'
  | 'theme'
  | 'tap_fx'
  | 'overlay'
  | 'academic'
  | 'notifications'
  | 'sync'
  | 'tasks'
  | 'general'
  | 'about';

export interface CategoryOption {
  id: SettingsCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SETTINGS_CATEGORIES: CategoryOption[] = [
  {
    id: 'account',
    label: 'Account & Profile',
    description: 'Name, username, campus, course & Google account',
    icon: User
  },
  {
    id: 'theme',
    label: 'Appearance & Themes',
    description: 'Color themes, dark mode & mascot language',
    icon: Palette
  },
  {
    id: 'tap_fx',
    label: 'Touch Effects & Sound',
    description: 'Particle bursts, audio feedback & tap preview',
    icon: Zap
  },
  {
    id: 'overlay',
    label: 'Eagle Assistive Overlay',
    description: 'System-wide floating companion & live glance',
    icon: Compass
  },
  {
    id: 'academic',
    label: 'Schedule & Timetable',
    description: 'Default view, reminder timing & Baon daily budget',
    icon: Calendar
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Class alert themes & persistent status bar',
    icon: Bell
  },
  {
    id: 'sync',
    label: 'Tasks & Cloud Sync',
    description: 'Offline Dexie database & cloud account backup',
    icon: CheckSquare
  },
  {
    id: 'about',
    label: 'About & System',
    description: 'App version, update checker & database reset',
    icon: Info
  }
];

const TAP_STYLE_OPTIONS: { id: TapEffectStyle; name: string; desc: string; icon: string }[] = [
  { id: 'feathers', name: 'Eagle Feathers', desc: 'Soft floating Davao eagle plumes', icon: '🦅' },
  { id: 'stars_sparks', name: 'Stars & Sparks', desc: 'Luminous starlight & radiant sparks', icon: '✨' },
  { id: 'cyber_rings', name: 'Cyber Rings', desc: 'Expanding neon sci-fi geometric rings', icon: '⭕' },
  { id: 'hearts_affinity', name: 'Student Hearts', desc: 'Warm floating affinity heart bursts', icon: '💖' },
  { id: 'comic_burst', name: 'Comic Burst', desc: 'Dynamic pop-art comic action sparks', icon: '💥' },
  { id: 'bubble_pop', name: 'Bubble Pop', desc: 'Rising translucent buoyant spheres', icon: '🫧' },
  { id: 'firework_confetti', name: 'Confetti Flares', desc: 'Festive celebratory paper burst', icon: '🎉' },
  { id: 'none', name: 'No Particles', desc: 'Clean touch without visual particles', icon: '🚫' },
];

const TAP_SOUND_OPTIONS: { id: TapSoundType; name: string; desc: string; icon: string }[] = [
  { id: 'auto', name: 'Auto Match', desc: 'Adaptive sound tailored to chosen particles', icon: '🎵' },
  { id: 'chirp', name: 'Eagle Chirp', desc: 'Playful Bayani chirp tone', icon: '🦅' },
  { id: 'pop', name: 'Gentle Pop', desc: 'Subtle clean tactile click', icon: '🔘' },
  { id: 'sparkle', name: 'Sparkle Chime', desc: 'Glinting musical bell tone', icon: '✨' },
  { id: 'laser', name: 'Laser Beam', desc: 'Futuristic synth sweep sound', icon: '⚡' },
  { id: 'heart', name: 'Heart Harmonic', desc: 'Warm melodic chord', icon: '💖' },
  { id: 'bubble', name: 'Bubble Plop', desc: 'Light upward watery droplet', icon: '🫧' },
  { id: 'none', name: 'Silent', desc: 'No sound on tap', icon: '🔇' },
];

const TAP_SPEED_OPTIONS: { id: 'snappy' | 'normal' | 'gentle'; name: string; desc: string }[] = [
  { id: 'snappy', name: 'Snappy', desc: '0.35s rapid burst' },
  { id: 'normal', name: 'Normal', desc: '0.55s balanced drift' },
  { id: 'gentle', name: 'Gentle', desc: '0.85s slow float' },
];

interface SettingsPageProps {
  userSession: UserSession;
  onUpdateSession: (updated: UserSession) => void;
  currentTheme?: string;
  onChangeTheme?: (theme: string) => void;
  onBack: () => void;
  onOpenAbout?: () => void;
  onOpenChangelog?: () => void;
  onReplayOnboarding?: () => void;
  onOpenFeedback?: () => void;
  initialCategory?: SettingsCategory;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userSession,
  onUpdateSession,
  currentTheme = 'bw-light',
  onChangeTheme,
  onBack,
  onOpenAbout,
  onOpenChangelog,
  onReplayOnboarding,
  onOpenFeedback,
  initialCategory
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory | null>(initialCategory || null);
  const [isOverlayPermGranted, setIsOverlayPermGranted] = useState<boolean>(false);
  const [taskMetrics, setTaskMetrics] = useState<{ total: number; pending: number; synced: number }>({
    total: 0,
    pending: 0,
    synced: 0
  });
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isCampusPickerOpen, setIsCampusPickerOpen] = useState<boolean>(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isNotifSettingsModalOpen, setIsNotifSettingsModalOpen] = useState<boolean>(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<boolean>(false);

  // Eagle Assistive Overlay State
  const [eagleOverlayEnabled, setEagleOverlayEnabled] = useState<boolean>(() => {
    return isEagleOverlayEnabledPref();
  });
  const [eagleResetFeedback, setEagleResetFeedback] = useState<string | null>(null);

  // Check overlay permission & task metrics
  const checkPerm = useCallback(async () => {
    const granted = await isOverlayPermitted();
    setIsOverlayPermGranted(granted);
  }, []);

  const refreshTaskMetrics = useCallback(async () => {
    try {
      const total = await db.tasks.count();
      const pending = await db.tasks
        .where('sync_status')
        .anyOf(['pending_create', 'pending_update', 'pending_delete'])
        .count();
      const synced = await db.tasks
        .where('sync_status')
        .equals('synced')
        .count();
      setTaskMetrics({ total, pending, synced });
    } catch (_) {}
  }, []);

  useEffect(() => {
    checkPerm();
    refreshTaskMetrics();

    const onFocus = () => {
      checkPerm();
      refreshTaskMetrics();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkPerm();
        refreshTaskMetrics();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkPerm, refreshTaskMetrics]);

  // Manual Cloud Sync State
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [cloudSyncFeedback, setCloudSyncFeedback] = useState<string | null>(null);

  // Language & Audio Preference State
  const { language, setLanguage } = useAppLanguage();
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(isAudioEnabled);
  const [selectedTheme, setSelectedTheme] = useState<string>(currentTheme);

  // In-App Update State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);
  const [foundUpdateModal, setFoundUpdateModal] = useState<UpdateCheckResult | null>(null);

  // Username Change State
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [newUsernameInput, setNewUsernameInput] = useState<string>(userSession.username || '');
  const [isSavingUsername, setIsSavingUsername] = useState<boolean>(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameFeedback, setUsernameFeedback] = useState<string>('');
  const [usernameToast, setUsernameToast] = useState<string | null>(null);
  const [loginErrorToast, setLoginErrorToast] = useState<string | null>(null);

  // Account Link Conflict State
  const [isAccountLinkSyncModalOpen, setIsAccountLinkSyncModalOpen] = useState<boolean>(false);
  const [pendingCloudUser, setPendingCloudUser] = useState<UserAccountRecord | null>(null);
  const [pendingGoogleSession, setPendingGoogleSession] = useState<StudentAuthSession | null>(null);
  const [pendingScheduleCount, setPendingScheduleCount] = useState<number>(0);
  const [isResolvingSyncConflict, setIsResolvingSyncConflict] = useState<boolean>(false);

  // Hardware Back Button Interception for Settings Sub-pages & Modals
  useBackHandler(Boolean(activeCategory), () => setActiveCategory(null), BackPriority.SUBVIEW, 'settings_subpage');
  useBackHandler(isAccountLinkSyncModalOpen, () => setIsAccountLinkSyncModalOpen(false), BackPriority.MODAL, 'settings_account_link_sync');
  useBackHandler(isCampusPickerOpen, () => setIsCampusPickerOpen(false), BackPriority.MODAL, 'settings_campus');
  useBackHandler(isLogoutModalOpen, () => setIsLogoutModalOpen(false), BackPriority.MODAL, 'settings_logout');
  useBackHandler(isResetModalOpen, () => setIsResetModalOpen(false), BackPriority.MODAL, 'settings_reset');
  useBackHandler(isImportModalOpen, () => setIsImportModalOpen(false), BackPriority.MODAL, 'settings_import');
  useBackHandler(Boolean(foundUpdateModal), () => setFoundUpdateModal(null), BackPriority.MODAL, 'settings_update');
  useBackHandler(isEditingUsername, () => setIsEditingUsername(false), BackPriority.MODAL, 'settings_edit_username');

  // Background Scroll Lock when any modal dialog is active
  const isAnyModalActive = Boolean(
    isCampusPickerOpen ||
    isLogoutModalOpen ||
    isResetModalOpen ||
    isImportModalOpen ||
    isNotifSettingsModalOpen ||
    isAccountLinkSyncModalOpen ||
    isEditingUsername ||
    foundUpdateModal
  );

  useEffect(() => {
    if (isAnyModalActive) {
      const prevOverflow = document.body.style.overflow;
      const prevTouch = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouch;
      };
    }
  }, [isAnyModalActive]);

  // Re-check overlay permission when app gains focus or visibility (e.g. returning from Android system settings)
  useEffect(() => {
    const handleCheckOverlay = async () => {
      const permitted = await isOverlayPermitted();
      setIsOverlayPermGranted(permitted);
      if (permitted && eagleOverlayEnabled) {
        await startEagleOverlay();
      }
    };
    handleCheckOverlay();
    window.addEventListener('focus', handleCheckOverlay);
    document.addEventListener('visibilitychange', handleCheckOverlay);
    return () => {
      window.removeEventListener('focus', handleCheckOverlay);
      document.removeEventListener('visibilitychange', handleCheckOverlay);
    };
  }, [eagleOverlayEnabled]);

  // Tap Motion Settings
  const [tapEnabled, setTapEnabled] = useState<boolean>(isTapEffectEnabled());
  const [tapStyle, setTapStyle] = useState<TapEffectStyle>(getSavedTapEffectStyle());
  const [tapSound, setTapSound] = useState<TapSoundType>(getSavedTapSound());
  const [tapSpeed, setTapSpeed] = useState<'snappy' | 'normal' | 'gentle'>(getSavedTapSpeed());

  // Notification Testing
  const [isTestingNotif, setIsTestingNotif] = useState<boolean>(false);
  const [notifTestStatus, setNotifTestStatus] = useState<string | null>(null);

  // Schedule & Routine Preferences
  const [defaultScheduleView, setDefaultScheduleView] = useState<'today' | 'weekly'>(() => {
    const saved = localStorage.getItem('skweladabaw_default_view');
    return (saved === 'weekly' || saved === 'grid') ? 'weekly' : 'today';
  });
  const [defaultReminderTiming, setDefaultReminderTiming] = useState<number>(() => {
    return Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;
  });
  const [isCustomSettingReminder, setIsCustomSettingReminder] = useState<boolean>(() => {
    const r = Number(localStorage.getItem('skweladabaw_reminder_timing')) || 10;
    return ![0, 10, 15, 30, 60].includes(r);
  });
  const [connectAllowance, setConnectAllowance] = useState<boolean>(() => {
    return localStorage.getItem('skweladabaw_connect_allowance') === 'true';
  });
  const [weatherAlertsEnabled, setWeatherAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('skweladabaw_weather_alerts_enabled') !== 'false';
  });

  // Unremovable Class Notification State & Permissions
  const [persistentNextClass, setPersistentNextClass] = useState<boolean>(() => {
    return localStorage.getItem('skweladabaw_persistent_next_class') === 'true';
  });
  const [persistentTheme, setPersistentTheme] = useState<string>(() => {
    return localStorage.getItem('skweladabaw_persistent_theme') || 'midnight';
  });
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(true);
  const [isBatteryOptimizedExempt, setIsBatteryOptimizedExempt] = useState<boolean>(true);
  const [isTriggeringLiveNotif, setIsTriggeringLiveNotif] = useState<boolean>(false);
  const [liveNotifFeedback, setLiveNotifFeedback] = useState<string | null>(null);

  useEffect(() => {
    const checkPerms = async () => {
      try {
        const notifGranted = await checkNotificationPermission();
        setHasNotificationPermission(notifGranted);
        const battExempt = await isBatteryExemptionActive();
        setIsBatteryOptimizedExempt(battExempt);
      } catch (_) {}
    };
    checkPerms();

    const handleResume = async () => {
      await checkPerms();
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, []);

  const handleRequestNotificationPerm = async () => {
    const granted = await requestNotificationPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      setLiveNotifFeedback('Notification permission granted');
      try {
        const allSchedules = await db.schedules.toArray();
        await refreshUnremovableClassNotification(allSchedules, persistentTheme);
      } catch (_) {}
      setTimeout(() => setLiveNotifFeedback(null), 3000);
    } else {
      setLiveNotifFeedback('Notification settings opened. Please toggle notifications on for SkwelaDabaw.');
      setTimeout(() => setLiveNotifFeedback(null), 4000);
    }
  };

  const handleRequestBatteryExemption = async () => {
    await requestBatteryExemption();
    setLiveNotifFeedback('Battery optimization settings requested. Select Allow or Unrestricted.');
    [1000, 2500, 4500].forEach((delay) => {
      setTimeout(async () => {
        const active = await isBatteryExemptionActive();
        setIsBatteryOptimizedExempt(active);
        if (active) {
          try {
            const allSchedules = await db.schedules.toArray();
            await refreshUnremovableClassNotification(allSchedules, persistentTheme);
          } catch (_) {}
        }
      }, delay);
    });
    setTimeout(() => setLiveNotifFeedback(null), 4000);
  };

  const handleTriggerLiveNotification = async () => {
    setIsTriggeringLiveNotif(true);
    try {
      const allSchedules = await db.schedules.toArray();
      await refreshUnremovableClassNotification(allSchedules, persistentTheme);
      setLiveNotifFeedback('Unremovable notification updated in status bar');
      setTimeout(() => setLiveNotifFeedback(null), 3000);
    } catch (_) {
      setLiveNotifFeedback('Failed to update notification');
      setTimeout(() => setLiveNotifFeedback(null), 3000);
    } finally {
      setIsTriggeringLiveNotif(false);
    }
  };

  const handleTogglePersistentNextClass = async (enabled: boolean) => {
    setPersistentNextClass(enabled);
    localStorage.setItem('skweladabaw_persistent_next_class', enabled ? 'true' : 'false');
    queueCloudSync();
    if (enabled) {
      try {
        const hasPerm = await checkNotificationPermission();
        if (!hasPerm) {
          await requestNotificationPermission();
        }
        const allSchedules = await db.schedules.toArray();
        await refreshUnremovableClassNotification(allSchedules, persistentTheme);
      } catch (_) {}
    } else {
      await cancelPersistentNextClassNotification();
    }
  };

  const handleSelectPersistentTheme = async (themeKey: string) => {
    setPersistentTheme(themeKey);
    localStorage.setItem('skweladabaw_persistent_theme', themeKey);
    queueCloudSync();
    if (persistentNextClass) {
      try {
        const allSchedules = await db.schedules.toArray();
        await refreshUnremovableClassNotification(allSchedules, themeKey);
      } catch (_) {}
    }
  };

  const handleUpdateReminderTiming = async (newVal: number) => {
    setDefaultReminderTiming(newVal);
    localStorage.setItem('skweladabaw_reminder_timing', String(newVal));
    queueCloudSync();
    try {
      const allSchedules = await db.schedules.toArray();
      for (const s of allSchedules) {
        if (s.id) {
          await db.schedules.update(s.id, { reminderMinutes: newVal });
        }
      }
      const updatedSchedules = await db.schedules.toArray();
      await scheduleAllClassSchedulesReminders(updatedSchedules);
      await refreshUnremovableClassNotification(updatedSchedules, persistentTheme);
      await syncScheduleToWidgets(updatedSchedules);
    } catch (e) {
      console.warn('Error applying default reminder to schedules:', e);
    }
  };

  const handleToggleEagleOverlay = async (enabled: boolean) => {
    if (enabled) {
      const permitted = await isOverlayPermitted();
      if (!permitted) {
        const res = await requestOverlayPerm();
        if (res.granted) {
          setIsOverlayPermGranted(true);
          await startEagleOverlay();
        }
      } else {
        setIsOverlayPermGranted(true);
        await startEagleOverlay();
      }
      setEagleOverlayEnabled(true);
      setEagleOverlayEnabledPref(true);
    } else {
      await stopEagleOverlay();
      setEagleOverlayEnabled(false);
      setEagleOverlayEnabledPref(false);
    }
    try {
      window.dispatchEvent(new CustomEvent('skweladabaw_eagle_overlay_toggled', { detail: { enabled } }));
    } catch (_) {}
  };

  const handleRequestOverlayPerm = async () => {
    const res = await requestOverlayPerm();
    if (res.granted) {
      setIsOverlayPermGranted(true);
    }
  };

  const handleResetEaglePosition = () => {
    localStorage.removeItem('skweladabaw_eagle_overlay_position');
    try {
      window.dispatchEvent(new CustomEvent('skweladabaw_eagle_overlay_reset_pos'));
    } catch (_) {}
    setEagleResetFeedback('Position reset to default');
    setTimeout(() => setEagleResetFeedback(null), 2500);
  };

  const handleSyncOverlayNow = async () => {
    await autoSyncCurrentStateToOverlay();
    setEagleResetFeedback('Schedule & weather pushed to overlay');
    setTimeout(() => setEagleResetFeedback(null), 2500);
  };

  const handleManualCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      await flushPendingSync();
      if (userSession.isLoggedIn) {
        const res = await syncCloudDataBiDirectional();
        if (res.success) {
          setCloudSyncFeedback('All student data & timetables synchronized to cloud');
        } else {
          setCloudSyncFeedback(res.message || 'Sync completed locally offline');
        }
      } else {
        setCloudSyncFeedback('Local changes preserved offline (Guest mode)');
      }
      await refreshTaskMetrics();
    } catch (err: any) {
      setCloudSyncFeedback('Sync note: ' + (err?.message || 'Check connection'));
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setCloudSyncFeedback(null), 3500);
    }
  };

  const currentCampus = DAVAO_CAMPUSES.find((c) => c.id === userSession.campusId) || DAVAO_CAMPUSES[0];

  // Calculate 7-day cooldown
  const lastChange = userSession.lastUsernameChange;
  const cooldownDays = 7;
  let isUnderCooldown = false;
  let daysRemaining = 0;

  if (lastChange) {
    const lastChangeTime = new Date(lastChange).getTime();
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    const diff = Date.now() - lastChangeTime;
    if (diff < cooldownMs) {
      isUnderCooldown = true;
      daysRemaining = Math.ceil((cooldownMs - diff) / (24 * 60 * 60 * 1000));
    }
  }

  // Comprehensive Edit Profile Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [editDisplayName, setEditDisplayName] = useState<string>(userSession.name || '');
  const [editCampusId, setEditCampusId] = useState<string>(userSession.campusId || 'addu-jacinto');
  const [editYearLevel, setEditYearLevel] = useState<string>(userSession.yearLevel || 'Freshman');
  const [editCourse, setEditCourse] = useState<string>(userSession.course || '');
  const [editAge, setEditAge] = useState<number | string>(userSession.age || 20);
  const [editGender, setEditGender] = useState<string>(userSession.gender || 'Prefer not to say');
  const [editRole, setEditRole] = useState<'student' | 'teacher' | 'admin'>(userSession.role || 'student');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccessToast, setProfileSuccessToast] = useState<string | null>(null);

  const handleOpenEditProfile = () => {
    setEditDisplayName(userSession.name || '');
    setEditCampusId(userSession.campusId || 'addu-jacinto');
    setEditYearLevel(userSession.yearLevel || 'Freshman');
    setEditCourse(userSession.course || '');
    setEditAge(userSession.age || 20);
    setEditGender(userSession.gender || 'Prefer not to say');
    setEditRole(userSession.role || 'student');
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated: UserSession = {
        ...userSession,
        name: editDisplayName.trim() || 'Davao Student',
        campusId: editCampusId,
        yearLevel: editYearLevel,
        course: editCourse.trim() || 'Enrolled Student',
        age: Number(editAge) || 20,
        gender: editGender,
        role: editRole
      };
      saveSession(updated);
      onUpdateSession(updated);
      localStorage.setItem('skweladabaw_profile_dirty', 'true');
      localStorage.setItem('skweladabaw_profile_updated_at', String(Date.now()));
      await saveUserProfile(updated);
      if (userSession.uid) {
        await updateUserProfileFields(userSession.uid, {
          displayName: updated.name,
          campusId: updated.campusId,
          course: updated.course,
          yearLevel: updated.yearLevel,
          age: updated.age,
          gender: updated.gender
        }).catch(() => {});
      }
      syncLocalDataToCloud(updated).catch(() => {});
      setIsEditProfileOpen(false);
      setProfileSuccessToast('Profile updated successfully!');
      setTimeout(() => setProfileSuccessToast(null), 3500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [liveUserRecord, setLiveUserRecord] = useState<UserAccountRecord | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | null>(null);

  useEffect(() => {
    const clean = newUsernameInput.trim().toLowerCase();
    if (!clean || clean === (userSession.username || '').toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameFeedback('');
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('taken');
      setUsernameFeedback('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      setUsernameStatus('taken');
      setUsernameFeedback('Only letters, numbers, and underscores are allowed.');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailable(clean, userSession.uid);
      if (result.available) {
        setUsernameStatus('available');
        setUsernameFeedback(`@${clean} is available!`);
      } else {
        setUsernameStatus('taken');
        setUsernameFeedback(result.reason || 'Username is already taken.');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [newUsernameInput, userSession.username, userSession.uid]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginErrorToast(null);
    try {
      const googleSession = await signInWithGoogle(userSession.campusId);
      if (!googleSession) {
        setIsLoggingIn(false);
        return;
      }

      // Check if this Google account already exists in MySQL
      const checkResult = await checkExistingUserDetailed(googleSession.uid || '', googleSession.email || '');
      const existingCloud = checkResult.user;
      const hasCloudData = Boolean(
        existingCloud &&
        ((existingCloud.username && existingCloud.username.trim().length > 0) ||
         (existingCloud.displayName && existingCloud.displayName.trim().length > 0) ||
         existingCloud.isSetupComplete)
      );

      if (hasCloudData && existingCloud) {
        // Existing account detected! Count local schedules and prompt user for resolution
        const count = await db.schedules.count();
        setPendingCloudUser(existingCloud);
        setPendingGoogleSession(googleSession);
        setPendingScheduleCount(count);
        setIsAccountLinkSyncModalOpen(true);
        setIsLoggingIn(false);
        return;
      }

      // If new account or no cloud data conflict, adopt guest profile into the account
      const merged: StudentAuthSession = {
        ...googleSession,
        campusId: userSession.campusId,
        course: userSession.course || 'Enrolled Student',
        yearLevel: userSession.yearLevel || 'College Student',
        studentId: userSession.studentId || ''
      };
      saveSession(merged);
      await saveUserProfile(merged);
      await syncLocalDataToCloud(merged);
      onUpdateSession(merged);
    } catch (err) {
      console.error('Google login error:', err);
      setLoginErrorToast('Google Sign-in was cancelled or could not connect.');
      setTimeout(() => setLoginErrorToast(null), 4000);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRestoreCloudAccount = async () => {
    if (!pendingCloudUser || !pendingGoogleSession) return;
    setIsResolvingSyncConflict(true);
    try {
      const restored: StudentAuthSession = {
        isLoggedIn: true,
        uid: pendingCloudUser.uid,
        name: pendingCloudUser.displayName || pendingGoogleSession.name,
        username: pendingCloudUser.username,
        email: pendingCloudUser.email || pendingGoogleSession.email,
        avatar: pendingCloudUser.avatar || pendingGoogleSession.avatar,
        campusId: pendingCloudUser.campusId || pendingGoogleSession.campusId,
        studentId: '',
        course: pendingCloudUser.course || 'Enrolled Student',
        yearLevel: pendingCloudUser.yearLevel || 'College Student',
        role: pendingCloudUser.role || 'student',
        age: pendingCloudUser.age,
        gender: pendingCloudUser.gender
      };
      saveSession(restored);
      saveLocalUserRecord(pendingCloudUser);
      sessionStorage.setItem('skwela_session_checked', 'true');
      await syncUserSchedules(pendingCloudUser.uid);
      onUpdateSession(restored);
      setIsAccountLinkSyncModalOpen(false);
    } catch (e) {
      console.error('Restore cloud account error:', e);
    } finally {
      setIsResolvingSyncConflict(false);
    }
  };

  const handleSyncGuestProfileToCloud = async () => {
    if (!pendingCloudUser || !pendingGoogleSession) return;
    setIsResolvingSyncConflict(true);
    try {
      const merged: StudentAuthSession = {
        isLoggedIn: true,
        // CRITICAL RULE: Display Name and Username remain strictly locked to existing account database values
        name: pendingCloudUser.displayName || pendingGoogleSession.name,
        username: pendingCloudUser.username || pendingGoogleSession.username,
        email: pendingCloudUser.email || pendingGoogleSession.email,
        avatar: pendingGoogleSession.avatar || pendingCloudUser.avatar || userSession.avatar,
        campusId: userSession.campusId || pendingCloudUser.campusId,
        studentId: userSession.studentId || '',
        course: userSession.course || pendingCloudUser.course || 'Enrolled Student',
        yearLevel: userSession.yearLevel || pendingCloudUser.yearLevel || 'College Student',
        role: pendingCloudUser.role || 'student',
        age: userSession.age ?? pendingCloudUser.age,
        gender: userSession.gender ?? pendingCloudUser.gender
      };
      saveSession(merged);
      saveLocalUserRecord(merged as any);
      sessionStorage.setItem('skwela_session_checked', 'true');
      await saveUserProfile(merged);
      await syncLocalDataToCloud(merged);
      onUpdateSession(merged);
      setIsAccountLinkSyncModalOpen(false);
    } catch (e) {
      console.error('Sync guest profile error:', e);
    } finally {
      setIsResolvingSyncConflict(false);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    const reset = await signOutUser();
    setOnboardingCompleted(false);
    onUpdateSession(reset);
    if (onReplayOnboarding) {
      onReplayOnboarding();
    }
  };

  const handleSaveUsername = async () => {
    if (isUnderCooldown || usernameStatus !== 'available') return;
    setIsSavingUsername(true);

    try {
      const result = await updateUsername(
        userSession.email || userSession.name,
        newUsernameInput,
        userSession.lastUsernameChange
      );

      if (result.success) {
        const now = new Date().toISOString();
        const updated = {
          ...userSession,
          username: newUsernameInput.trim().toLowerCase(),
          lastUsernameChange: now
        };
        onUpdateSession(updated);
        setUsernameToast('Username updated successfully!');
        setIsEditingUsername(false);
        setTimeout(() => setUsernameToast(null), 3000);
      } else {
        setUsernameFeedback(result.message);
      }
    } catch (err) {
      console.error('Error saving username:', err);
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleExportData = async () => {
    const schedules = await db.schedules.toArray();
    const tasks = await db.tasks.toArray();
    const grades = await db.grades.toArray();
    const expenses = await db.expenses.toArray();

    const exportBundle = {
      exportDate: new Date().toISOString(),
      schedules,
      tasks,
      grades,
      expenses
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkwelaDabaw_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmReset = async () => {
    setIsResetModalOpen(false);
    await db.delete();
    await db.open();
    await initializeDatabaseWithSeedData();
    setResetSuccessToast(true);
    setTimeout(() => setResetSuccessToast(false), 3000);
  };

  const handleUpdateTapSettings = (
    style?: TapEffectStyle, 
    sound?: TapSoundType, 
    speed?: 'snappy' | 'normal' | 'gentle', 
    enabled?: boolean
  ) => {
    if (style !== undefined) {
      setTapStyle(style);
      localStorage.setItem('skweladabaw_tap_fx_style', style);
    }
    if (sound !== undefined) {
      setTapSound(sound);
      localStorage.setItem('skweladabaw_tap_fx_sound', sound);
    }
    if (speed !== undefined) {
      setTapSpeed(speed);
      localStorage.setItem('skweladabaw_tap_fx_speed', speed);
    }
    if (enabled !== undefined) {
      setTapEnabled(enabled);
      localStorage.setItem('skweladabaw_tap_fx_enabled', enabled ? 'true' : 'false');
    }
    notifyTapSettingsChange();
    queueCloudSync();
  };

  const handleToggleTheme = (newTheme: string) => {
    setSelectedTheme(newTheme);
    applyTheme(newTheme);
    if (onChangeTheme) {
      onChangeTheme(newTheme);
    }
    queueCloudSync();
  };

  const isVerified = Boolean(liveUserRecord?.isVerified || userSession.isVerified);
  const customTag = liveUserRecord?.customTag || userSession.customTag;
  const customTagBg = liveUserRecord?.customTagBg || userSession.customTagBg || '#F59E0B';
  const customTagColor = liveUserRecord?.customTagColor || userSession.customTagColor || '#000000';

  const isViewingSubpage = activeCategory !== null;
  const activeCategoryOption = activeCategory !== null
    ? (SETTINGS_CATEGORIES.find((c) => c.id === activeCategory) || SETTINGS_CATEGORIES[0])
    : SETTINGS_CATEGORIES[0];
  const ActiveCategoryIcon = activeCategoryOption.icon;

  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col animate-fade-in select-none w-full pb-28">
      {/* Top Header with Discord-Style Navigation */}
      <header className="sticky top-0 z-40 bg-[var(--header-bg)] backdrop-blur-xl border-b border-[var(--card-border)] px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isViewingSubpage ? (
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--nested-bg)] transition-all pressable cursor-pointer shrink-0"
                title="Back to Settings Menu"
              >
                <ArrowLeft className="w-4 h-4 text-[var(--text-primary)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">Settings</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--nested-bg)] transition-all pressable shrink-0 cursor-pointer"
                title="Back to App"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            )}

            <div className="min-w-0">
              <h1 className="text-base font-bold text-[var(--text-primary)] truncate leading-tight">
                {isViewingSubpage ? activeCategoryOption.label : 'Settings'}
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)] truncate leading-tight mt-0.5">
                {isViewingSubpage ? activeCategoryOption.description : 'Personalization, companion tools & preferences'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAbout && (
              <button
                type="button"
                onClick={onOpenAbout}
                className="p-2 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--nested-bg)] text-[var(--text-primary)] transition-all pressable shrink-0 cursor-pointer"
                title="About SkwelaDabaw"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {resetSuccessToast && (
          <div className="p-3.5 rounded-2xl bg-[#282828] border border-[#38383A] text-white font-semibold text-xs flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#30D158]" />
              <span>Davao campus database reloaded successfully!</span>
            </span>
          </div>
        )}

        {usernameToast && (
          <div className="p-3.5 rounded-2xl bg-[#282828] border border-[#38383A] text-white font-semibold text-xs flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#30D158]" />
              <span>{usernameToast}</span>
            </span>
          </div>
        )}

        {profileSuccessToast && (
          <div className="p-3.5 rounded-2xl bg-[#282828] border border-[#30D158] text-white font-semibold text-xs flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#30D158]" />
              <span>{profileSuccessToast}</span>
            </span>
          </div>
        )}

        {loginErrorToast && (
          <div className="p-3.5 rounded-2xl bg-[#282828] border border-[#FF453A] text-white font-semibold text-xs flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF453A]" />
              <span>{loginErrorToast}</span>
            </span>
          </div>
        )}

        {/* DISCORD-STYLE SETTINGS OVERVIEW MENU */}
        {!isViewingSubpage && (
          <div className="space-y-6 animate-fade-in">
            {/* User Profile Mini Banner */}
            <div 
              onClick={() => setActiveCategory('account')}
              className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] transition-all flex items-center justify-between gap-4 cursor-pointer pressable shadow-xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-full p-0.5 border-2 border-[var(--card-border)] shrink-0 overflow-hidden relative">
                  <CachedAvatar
                    src={userSession.avatar}
                    name={userSession.name}
                    username={userSession.username}
                    size="lg"
                    className="w-full h-full"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-base text-[var(--text-primary)] truncate">
                      {userSession.name}
                    </span>
                    {isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                    @{userSession.username || 'student_user'}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 opacity-80">
                    {currentCampus.shortName} • {userSession.course || 'Enrolled Student'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-block text-xs font-semibold text-[var(--text-secondary)]">
                  Account Settings
                </span>
                <div className="w-8 h-8 rounded-xl bg-[var(--nested-bg)] flex items-center justify-center text-[var(--text-secondary)]">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Menu Sections (Discord Settings style) */}
            <div className="space-y-4">
              {/* SECTION: USER & PROFILE */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-2">
                  User Settings
                </div>
                <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden divide-y divide-[var(--card-border)] shadow-xs">
                  {[
                    SETTINGS_CATEGORIES.find(c => c.id === 'account')!
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--nested-bg)] transition-colors pressable cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {cat.label}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                              {cat.description}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: APP EXPERIENCE & CUSTOMIZATION */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-2">
                  Appearance &amp; Experience
                </div>
                <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden divide-y divide-[var(--card-border)] shadow-xs">
                  {[
                    SETTINGS_CATEGORIES.find(c => c.id === 'theme')!,
                    SETTINGS_CATEGORIES.find(c => c.id === 'tap_fx')!,
                    ...(Capacitor.isNativePlatform() ? [SETTINGS_CATEGORIES.find(c => c.id === 'overlay')!] : [])
                  ].filter(Boolean).map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--nested-bg)] transition-colors pressable cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {cat.label}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                              {cat.description}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: STUDENT TOOLS & SCHEDULE */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-2">
                  Academic &amp; Student Tools
                </div>
                <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden divide-y divide-[var(--card-border)] shadow-xs">
                  {[
                    SETTINGS_CATEGORIES.find(c => c.id === 'academic')!,
                    SETTINGS_CATEGORIES.find(c => c.id === 'notifications')!,
                    SETTINGS_CATEGORIES.find(c => c.id === 'sync')!
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--nested-bg)] transition-colors pressable cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {cat.label}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                              {cat.description}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: SYSTEM & ABOUT */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-2">
                  System &amp; Support
                </div>
                <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden divide-y divide-[var(--card-border)] shadow-xs">
                  {[
                    SETTINGS_CATEGORIES.find(c => c.id === 'about')!
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--nested-bg)] transition-colors pressable cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {cat.label}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                              {cat.description}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: ACCOUNT & PROFILE */}
        {(activeCategory === 'account' || activeCategory === 'general') && (
          <div className="space-y-4 animate-fade-in flex flex-col min-h-[60vh]">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              Account &amp; Profile
            </div>

            {/* Clean Student Identity Card */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-18 h-18 rounded-full p-1 border-2 border-[var(--card-border)] shadow-xs overflow-hidden shrink-0 relative">
                    <CachedAvatar
                      src={userSession.avatar}
                      name={userSession.name}
                      username={userSession.username}
                      className="w-full h-full text-2xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        {userSession.name}
                      </h2>
                      {isVerified && (
                        <span title="Verified Davao Student" className="inline-flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      @{userSession.username || 'student_user'}
                    </p>
                  </div>
                </div>

                {/* Google Auth Status Badge / Link Action */}
                <div className="shrink-0">
                  {!userSession.isLoggedIn ? (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold text-xs shadow-xs pressable flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{isLoggingIn ? 'Signing In...' : 'Link Google Account'}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Google Account Linked</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Tags and Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Campus Badge */}
                <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span>{currentCampus.shortName} • {currentCampus.name}</span>
                </span>

                {/* Course or Year */}
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  • {userSession.course ? `${userSession.course} (${userSession.yearLevel || 'Student'})` : (userSession.yearLevel || 'Student')}
                </span>

                {/* Gender Identity */}
                {userSession.gender && userSession.gender !== 'Prefer not to say' && (
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    • {userSession.gender}
                  </span>
                )}

                {/* Custom User Flair Tag */}
                {customTag && (
                  <span 
                    style={{ backgroundColor: customTagBg, color: customTagColor }}
                    className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  >
                    {customTag}
                  </span>
                )}
              </div>

              {/* Action Buttons: Pure Profile Actions */}
              <div className="pt-3 border-t border-[var(--card-border)] flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold text-xs flex items-center gap-1.5 pressable shadow-xs cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingUsername(!isEditingUsername)}
                  className="px-4 py-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Change Username</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCampusPickerOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  <School className="w-3.5 h-3.5" />
                  <span>Change Campus</span>
                </button>
              </div>
            </div>

            {/* Change Username Inset Card (Collapsible / Active) */}
            {isEditingUsername && (
              <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3 animate-slide-up">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[var(--text-primary)]" />
                      <span>Change Unique Username</span>
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Usernames must be unique. 7-day cooldown period applies between changes.
                    </p>
                  </div>

                  {isUnderCooldown ? (
                    <span className="text-xs font-semibold text-[#FF9F0A] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A]" />
                      Cooldown: {daysRemaining}d left
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#30D158] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
                      Available
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold text-xs">@</span>
                      <input
                        type="text"
                        disabled={isUnderCooldown}
                        value={newUsernameInput}
                        onChange={(e) => setNewUsernameInput(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        placeholder="new_username"
                        className="w-full pl-8 pr-10 py-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold"
                      />
                      {usernameStatus === 'checking' && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-primary)]">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </span>
                      )}
                      {usernameStatus === 'available' && !isUnderCooldown && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#30D158]">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveUsername}
                      disabled={isUnderCooldown || usernameStatus !== 'available' || isSavingUsername}
                      className="px-5 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable disabled:opacity-40 cursor-pointer"
                    >
                      <span>{isSavingUsername ? 'Saving...' : 'Update'}</span>
                    </button>
                  </div>

                  {usernameFeedback && (
                    <p className={`text-xs ${usernameStatus === 'available' ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                      {usernameFeedback}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Log Out Button at the Very Bottom of Profile */}
            {userSession.isLoggedIn && (
              <div className="pt-6 mt-auto">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] hover:border-red-500/40 text-[#FF453A] font-bold text-xs pressable flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4 text-[#FF453A]" />
                  <span>Log Out of SkwelaDabaw</span>
                </button>
                <p className="text-[11px] text-[var(--text-secondary)] text-center mt-2 opacity-75">
                  Your class schedules stay saved on your device even after logging out.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CATEGORY: APPEARANCE & THEMES */}
        {activeCategory === 'theme' && (
          <div className="space-y-4 animate-fade-in flex flex-col min-h-[60vh]">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              Appearance &amp; Themes
            </div>

            {/* Interactive Modular Theme Switcher */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[var(--text-primary)]" />
                  <span>Theme &amp; Display Appearance</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Choose your preferred appearance mode for study sessions and campus commutes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {AVAILABLE_THEMES.map((t) => {
                  const isSelected = selectedTheme === t.id || (selectedTheme === 'bw-light' && t.id === 'light') || (selectedTheme === 'bw-dark' && t.id === 'dark');
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleTheme(t.id)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 pressable cursor-pointer ${
                        isSelected
                          ? 'border-[var(--text-primary)] bg-[var(--card-bg)] shadow-md ring-2 ring-[var(--text-primary)]/20'
                          : 'border-[var(--card-border)] bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs"
                          style={{
                            backgroundColor: t.variables['--canvas-bg'],
                            color: t.variables['--text-primary'],
                            border: `1px solid ${t.variables['--card-border']}`
                          }}
                        >
                          {t.isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]">
                            Active
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">{t.name}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{t.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tri-Lingual Language Selector Card */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-500" />
                  <span>{t('settings.langHeading', language)}</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {t('settings.langDesc', language)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'ceb' as AppLanguage, name: 'Davao Bisaya', desc: 'Davao Binisaya', flag: '🦅' },
                  { id: 'tl' as AppLanguage, name: 'Modern Tagalog', desc: 'Filipino', flag: '🇵🇭' },
                  { id: 'en' as AppLanguage, name: 'English', desc: 'Standard', flag: '🌐' }
                ].map((l) => {
                  const isSelected = language === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setLanguage(l.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer pressable flex flex-col justify-between ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500/60 shadow-xs ring-1 ring-sky-500/30'
                          : 'bg-[var(--nested-bg)] border-[var(--nested-border)] hover:border-[var(--card-hover-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-base">{l.flag}</span>
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-[var(--card-border)]'}`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs font-bold text-[var(--text-primary)] leading-tight">{l.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{l.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: TOUCH EFFECTS & SOUND */}
        {activeCategory === 'tap_fx' && (
          <div className="space-y-4 animate-fade-in flex flex-col min-h-[60vh]">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              Touch Effects &amp; Sound
            </div>

            {/* Particle Bursts Section */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Screen Touch Particle Bursts</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Render animated micro-particles on screen tap and gesture touches.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={tapEnabled}
                    onChange={(e) => handleUpdateTapSettings(undefined, undefined, undefined, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--nested-border)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
                </label>
              </div>

              {tapEnabled && (
                <div className="space-y-4 pt-3 border-t border-[var(--card-border)] animate-fade-in">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)]">
                      Particle Style:
                    </label>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Select your favorite micro-particle burst theme.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {TAP_STYLE_OPTIONS.map((style) => {
                      const isSelected = tapStyle === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            handleUpdateTapSettings(style.id);
                            playTapSound(tapSound, style.id);
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer pressable flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-[var(--text-primary)] bg-[var(--nested-bg)] ring-2 ring-[var(--text-primary)]/20 shadow-xs'
                              : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-hover-border)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl shrink-0">{style.icon}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{style.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{style.desc}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-[var(--text-primary)] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Particle Burst Speed */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">
                      Animation Duration &amp; Velocity:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {TAP_SPEED_OPTIONS.map((speed) => {
                        const isSelected = tapSpeed === speed.id;
                        return (
                          <button
                            key={speed.id}
                            type="button"
                            onClick={() => handleUpdateTapSettings(undefined, undefined, speed.id)}
                            className={`p-2.5 rounded-xl border text-center text-xs transition-all pressable cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--card-border)]'
                                : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="font-bold">{speed.name}</div>
                            <div className="text-[9px] opacity-75 mt-0.5">{speed.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Effects Section */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                    <Volume2 className="w-4 h-4 text-sky-500" />
                    <span>Mascot Audio Chimes &amp; Tap Sounds</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Play responsive synth chimes and audio feedback for tap actions and buttons.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setSoundEnabledState(enabled);
                      setAudioEnabled(enabled);
                      queueCloudSync();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--nested-border)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
                </label>
              </div>

              {soundEnabled && (
                <div className="space-y-4 pt-3 border-t border-[var(--card-border)] animate-fade-in">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)]">
                      Sound Feedback Type:
                    </label>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Tap a sound option to preview audio feedback.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {TAP_SOUND_OPTIONS.map((snd) => {
                      const isSelected = tapSound === snd.id;
                      return (
                        <button
                          key={snd.id}
                          type="button"
                          onClick={() => {
                            handleUpdateTapSettings(undefined, snd.id);
                            playTapSound(snd.id, tapStyle);
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer pressable flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-[var(--text-primary)] bg-[var(--nested-bg)] ring-2 ring-[var(--text-primary)]/20 shadow-xs'
                              : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-hover-border)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl shrink-0">{snd.icon}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{snd.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{snd.desc}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-[var(--text-primary)] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Tap & Sound Test Arena */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Interactive Test Arena</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Tap or click repeatedly anywhere inside this arena to test your configured particles and audio tone!
                </p>
              </div>

              <div
                onClick={() => {
                  playTapSound(tapSound, tapStyle);
                }}
                className="w-full h-36 rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--nested-bg)] hover:border-[var(--text-primary)] transition-all flex flex-col items-center justify-center p-4 cursor-pointer pressable text-center select-none"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-2xl shadow-xs mb-2 pointer-events-none">
                  🦅
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)] pointer-events-none">
                  Tap Here to Test Particles &amp; Sounds
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 pointer-events-none">
                  Active Style: {TAP_STYLE_OPTIONS.find(s => s.id === tapStyle)?.name || 'Feathers'} • Sound: {TAP_SOUND_OPTIONS.find(s => s.id === tapSound)?.name || 'Auto'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 2: EAGLE OVERLAY */}
        {activeCategory === 'overlay' && (
          <div className="space-y-4 animate-fade-in flex flex-col min-h-[60vh]">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              Eagle Assistive Overlay
            </div>

            {/* Eagle Floating Service Card */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[var(--btn-primary-bg,#3b82f6)]" />
                      <span>Eagle Floating Overlay</span>
                    </h3>
                    {isOverlayPermGranted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Granted</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOverlayPerm}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/25 transition-all pressable cursor-pointer"
                        title="Click to grant overlay permission in Android Settings"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Permission Required</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Android system-wide floating companion rendered above all applications via WindowManager. Quick glance at live Davao weather, heat index, and ongoing classes.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={eagleOverlayEnabled}
                    onChange={(e) => handleToggleEagleOverlay(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--nested-bg)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
                </label>
              </div>

              {/* Gesture Physics & Dismiss Specifications */}
              <div className="space-y-2 pt-3 border-t border-[var(--card-border)]">
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Motion &amp; Interaction Physics
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <MoveHorizontal className="w-3.5 h-3.5 text-[#30D158]" />
                      <span>Edge Snapping</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                      Snaps smoothly to left or right display border upon drag release.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <X className="w-3.5 h-3.5 text-[#FF453A]" />
                      <span>Bottom Dismiss</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                      Drag into bottom dismiss zone to terminate overlay service cleanly.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quick Card</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                      Single tap expands live cached weather, heat index, and next class.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncOverlayNow}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] pressable flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--btn-primary-bg,#3b82f6)]" />
                  <span>Push Current Timetable &amp; Weather</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetEaglePosition}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] pressable flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Reset Bubble Position</span>
                </button>
                {eagleResetFeedback && (
                  <span className="text-xs text-[#30D158] font-medium animate-fade-in">
                    {eagleResetFeedback}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY: TASKS & SYNC */}
        {(activeCategory === 'sync' || activeCategory === 'tasks') && (
          <div className="space-y-4 animate-fade-in flex flex-col min-h-[60vh]">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              Tasks &amp; Sync Engine
            </div>

            {/* Offline-First Dexie Task Engine Metrics */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[var(--btn-primary-bg,#3b82f6)]" />
                  <span>Offline-First Task Management</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Instant 0ms latency with IndexedDB Dexie storage and silent background MySQL synchronization.
                </p>
              </div>

              {/* Live Metric Cards Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-center space-y-0.5">
                  <div className="text-xl font-black text-[var(--text-primary)]">
                    {taskMetrics.total}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Local Tasks
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-center space-y-0.5">
                  <div className={`text-xl font-black ${taskMetrics.pending > 0 ? 'text-amber-400' : 'text-[#30D158]'}`}>
                    {taskMetrics.pending}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Pending Sync
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-center space-y-0.5">
                  <div className="text-xl font-black text-[#30D158]">
                    {taskMetrics.synced}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Cloud Synced
                  </div>
                </div>
              </div>
            </div>

            {/* Silent Background Sync & Cloud Controls */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[var(--text-primary)]" />
                    <span>Silent Background MySQL Sync</span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Tasks and schedules synchronize automatically when connected. Offline actions never show blocking errors.
                  </p>
                </div>
                {navigator.onLine ? (
                  <span className="text-xs font-semibold text-[#30D158] flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Offline Safe</span>
                  </span>
                )}
              </div>

              <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualCloudSync}
                  disabled={isSyncingCloud}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-2 transition-all pressable cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCloud ? 'Flushing pending updates...' : 'Sync Local Data to Cloud'}</span>
                </button>
                {cloudSyncFeedback && (
                  <span className="text-xs text-[var(--text-primary)] font-medium animate-fade-in shrink-0">
                    {cloudSyncFeedback}
                  </span>
                )}
                {typeof window !== 'undefined' && localStorage.getItem(LAST_SYNC_KEY) && (
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                    Last cloud sync: {new Date(localStorage.getItem(LAST_SYNC_KEY)!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* Offline Database Backup & Restore Card */}
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[var(--text-primary)]" />
                  <span>Offline Database Backup &amp; Restore</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Export all your local schedules, tasks, and budgets into a JSON file or restore from backup.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Export JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Import (JSON / QR)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 3: ACADEMIC & SCHEDULE */}
        {activeCategory === 'academic' && (
          <div className="space-y-4 animate-fade-in flex flex-col min-h-[60vh]">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              Academic &amp; Schedule
            </div>

            {/* Timetable & Schedule Preferences Card */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--text-primary)]" />
                  <span>Timetable Preferences</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Configure default timetable view, class reminders, and baon budget connection.
                </p>
              </div>

              {/* Default View Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                  <span>Default Schedule View on Launch</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultScheduleView('today');
                      localStorage.setItem('skweladabaw_default_view', 'today');
                      queueCloudSync();
                    }}
                    className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      defaultScheduleView === 'today'
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--card-border)]'
                        : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <ListOrdered className="w-4 h-4 mb-1" />
                    <div>Daily Agenda</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDefaultScheduleView('weekly');
                      localStorage.setItem('skweladabaw_default_view', 'weekly');
                      queueCloudSync();
                    }}
                    className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      defaultScheduleView === 'weekly'
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--card-border)]'
                        : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4 mb-1" />
                    <div>Weekly Grid</div>
                  </button>
                </div>
              </div>

              {/* Default Class Reminder Timing */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                  <span>Default Class Reminder Timing</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { val: 0, label: 'At Start' },
                    { val: 10, label: '10m before' },
                    { val: 15, label: '15m before' },
                    { val: 30, label: '30m before' },
                    { val: 60, label: '1h before' }
                  ].map((item) => {
                    const isSelected = defaultReminderTiming === item.val;
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => handleUpdateReminderTiming(item.val)}
                        className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all pressable cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--card-border)]'
                            : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Connect Allowance to Schedule Toggle */}
              <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <Wallet className="w-4 h-4 text-[var(--text-primary)]" />
                    <span>Connect Allowance to Schedule</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Show today's remaining baon and quick expense tracking right inside your timetable.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={connectAllowance}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setConnectAllowance(enabled);
                      localStorage.setItem('skweladabaw_connect_allowance', enabled ? 'true' : 'false');
                      queueCloudSync();
                      try {
                        window.dispatchEvent(new CustomEvent('skweladabaw_allowance_toggled', { detail: { enabled } }));
                      } catch (_) {}
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--nested-border)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY 5: NOTIFICATIONS & ALERTS */}
        {activeCategory === 'notifications' && (
          <div className="space-y-4 animate-fade-in flex flex-col min-h-[60vh]">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              Notifications &amp; Alerts
            </div>

            {/* Individual Class Alarms Info Card */}
            <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Bell className="w-3.5 h-3.5 text-[#30D158]" />
                <span>Class Alarms (Per-Subject Custom Choice)</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Class alarms trigger strictly based on the reminder timing configured when adding or editing that subject in your timetable. Classes set to <strong>None</strong> will never ring, preventing duplicate notifications.
              </p>
            </div>

            {/* Unremovable Status Bar Card */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                    <span>Unremovable Status Bar Card</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Pins an ongoing status card on Android status bar that cannot be swiped away or cleared.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={persistentNextClass}
                    onChange={(e) => handleTogglePersistentNextClass(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--nested-border)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
                </label>
              </div>

              {persistentNextClass && (
                <div className="space-y-4 pt-2 border-t border-[var(--card-border)] animate-fade-in">
                  {!hasNotificationPermission && (
                    <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-amber-500/40 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Notification Permission Needed</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Grant permission to allow the ongoing card to show on your status bar.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestNotificationPerm}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-bold shrink-0 pressable"
                      >
                        Grant
                      </button>
                    </div>
                  )}

                  {/* Android Background Execution / Battery Exemption */}
                  <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#30D158]" />
                        <span>Background Execution &amp; Battery Exemption</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {isBatteryOptimizedExempt 
                          ? 'Battery optimization exempt. App can update ongoing card and widgets in background.' 
                          : 'Exempt SkwelaDabaw from battery saver so notification stays pinned without OS stopping it.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestBatteryExemption}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all pressable ${
                        isBatteryOptimizedExempt
                          ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40'
                          : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      }`}
                    >
                      {isBatteryOptimizedExempt ? 'Exempt' : 'Request'}
                    </button>
                  </div>

                  {/* Notification Theme Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Status Bar Card Theme:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.values(NOTIFICATION_THEMES).map((theme) => {
                        const isSelected = persistentTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => handleSelectPersistentTheme(theme.id)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[var(--text-primary)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                                : 'border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--card-hover-border)]'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                              style={{ backgroundColor: theme.accentHex }}
                            />
                            <span className="text-xs truncate">{theme.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Shade Preview */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Live Status Bar Shade Preview:
                    </label>
                    {(() => {
                      const activeTheme = NOTIFICATION_THEMES[persistentTheme] || NOTIFICATION_THEMES.midnight;
                      return (
                        <div
                          className="p-3.5 rounded-2xl border transition-all select-none"
                          style={{
                            backgroundColor: activeTheme.bgHex,
                            borderColor: activeTheme.borderHex,
                            color: activeTheme.textHex
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${activeTheme.accentHex}25`,
                                  color: activeTheme.accentHex,
                                  border: `1px solid ${activeTheme.accentHex}50`
                                }}
                              >
                                Next Class
                              </span>
                              <span className="text-xs font-semibold opacity-75">
                                09:00 AM • Lab 402
                              </span>
                            </div>
                            <span className="text-[10px] font-medium opacity-60">Status Bar</span>
                          </div>
                          <div className="mt-2 text-sm font-bold truncate">
                            IT 311 • Systems Integration and Architecture
                          </div>
                          <div className="mt-0.5 text-xs opacity-75 flex items-center gap-2">
                            <span>Finster Hall</span>
                            <span>•</span>
                            <span>Starts in 25 minutes</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Manual Test & Refresh Button */}
                  <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerLiveNotification}
                      disabled={isTriggeringLiveNotif}
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-2 transition-all pressable cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringLiveNotif ? 'animate-spin' : ''}`} />
                      <span>{isTriggeringLiveNotif ? 'Updating status bar...' : 'Update Status Bar Notification Now'}</span>
                    </button>
                    {liveNotifFeedback && (
                      <span className="text-xs text-[#30D158] font-medium animate-fade-in shrink-0">
                        {liveNotifFeedback}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Davao Weather & Commuter Advisories Toggle */}
            <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CloudSun className="w-3.5 h-3.5 text-sky-400" />
                  <span>Davao Weather &amp; Commuter Advisories</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Local notifications for extreme heat index (≥ 40°C) and afternoon commute rainstorms (max 1 alert per day).
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={weatherAlertsEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setWeatherAlertsEnabled(val);
                    localStorage.setItem('skweladabaw_weather_alerts_enabled', val ? 'true' : 'false');
                    queueCloudSync();
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--nested-border)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
              </label>
            </div>

            {/* Send Test Notification Button */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-2">
              <button
                type="button"
                disabled={isTestingNotif}
                onClick={async () => {
                  setIsTestingNotif(true);
                  setNotifTestStatus(null);
                  try {
                    const res = await sendTestNotification();
                    setNotifTestStatus(res.message);
                  } catch (e: any) {
                    setNotifTestStatus(`Error: ${e?.message || 'Failed'}`);
                  } finally {
                    setIsTestingNotif(false);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 pressable cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>{isTestingNotif ? 'Sending Test Notification...' : 'Send Test Notification'}</span>
              </button>
              {notifTestStatus && (
                <div className="mt-2 p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                  <span>{notifTestStatus}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY 6: ABOUT & SYSTEM */}
        {activeCategory === 'about' && (
          <div className="space-y-4 animate-fade-in flex flex-col min-h-[60vh]">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              About &amp; System
            </div>

            {/* Application Version & Cloud Updates Card */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[var(--text-primary)]" />
                  <span>Application Version &amp; Updates</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  SkwelaDabaw v{CURRENT_APP_VERSION} • Davao City Student System
                </p>
              </div>

              {updateStatusMessage && (
                <p className="text-[11px] font-semibold text-center text-[var(--text-primary)] py-1">
                  {updateStatusMessage}
                </p>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  disabled={isCheckingUpdate}
                  onClick={async () => {
                    setIsCheckingUpdate(true);
                    setUpdateStatusMessage(null);
                    try {
                      const res = await checkForAppUpdate();
                      if (res.hasUpdate) {
                        setFoundUpdateModal(res);
                        setUpdateStatusMessage(`Version ${res.latestVersion} available!`);
                      } else {
                        setUpdateStatusMessage(`Up to date • v${CURRENT_APP_VERSION}`);
                      }
                    } catch {
                      setUpdateStatusMessage('Could not connect to update server.');
                    } finally {
                      setIsCheckingUpdate(false);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 pressable cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'Checking for Updates...' : 'Check for Updates'}</span>
                </button>
              </div>
            </div>

            {/* Offline Database & Backup Card */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[var(--text-primary)]" />
                  <span>Offline Database &amp; Backup</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Export all your local schedules, tasks, and budgets into a JSON file or restore default records.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Export Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Import (JSON / QR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-semibold text-[#FF453A] flex items-center justify-center gap-2 hover:border-[var(--card-hover-border)] pressable cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>Reset Data</span>
                </button>
              </div>
            </div>

            {/* Support & Community Shortcuts */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Support &amp; Community</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Help improve SkwelaDabaw or review app release notes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {onOpenFeedback && (
                  <button
                    type="button"
                    onClick={onOpenFeedback}
                    className="py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-sky-500" />
                      <span>Send Feedback</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                )}

                {onOpenChangelog && (
                  <button
                    type="button"
                    onClick={onOpenChangelog}
                    className="py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>What's New / Changelog</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                )}

                {onOpenAbout && (
                  <button
                    type="button"
                    onClick={onOpenAbout}
                    className="py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-indigo-500" />
                      <span>About SkwelaDabaw</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                )}

                {onReplayOnboarding && (
                  <button
                    type="button"
                    onClick={onReplayOnboarding}
                    className="py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between pressable cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <School className="w-4 h-4 text-emerald-500" />
                      <span>Replay Onboarding Guide</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                )}
              </div>
            </div>

            {/* Legal & Privacy Policies Card */}
            <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-3">
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--text-primary)]" />
                  <span>Legal &amp; Privacy Policies</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Compliant with RA 10173 Data Privacy Act and RA 11313 Safe Spaces Act
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setLegalModalTab('terms')}
                  className="py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between pressable cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--text-primary)]" />
                    <span>Terms of Service</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>

                <button
                  type="button"
                  onClick={() => setLegalModalTab('privacy')}
                  className="py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:border-[var(--card-hover-border)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between pressable cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#30D158]" />
                    <span>Privacy Policy • DPA</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* University Picker Modal */}
      <CampusPickerModal
        isOpen={isCampusPickerOpen}
        onClose={() => setIsCampusPickerOpen(false)}
        selectedCampusId={userSession.campusId}
        onSelectCampus={async (newCampusId) => {
          const updated: UserSession = { ...userSession, campusId: newCampusId };
          saveSession(updated);
          onUpdateSession(updated);
          localStorage.setItem('skweladabaw_profile_dirty', 'true');
          localStorage.setItem('skweladabaw_profile_updated_at', String(Date.now()));
          if (userSession.uid) {
            updateUserProfileFields(userSession.uid, { campusId: newCampusId }).catch(() => {});
          }
          queueCloudSync(updated);
          syncLocalDataToCloud(updated).catch(() => {});
          setProfileSuccessToast('Campus updated successfully!');
          setTimeout(() => setProfileSuccessToast(null), 3000);
        }}
      />

      {/* Comprehensive Edit Profile Modal */}
      {isEditProfileOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setIsEditProfileOpen(false)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-lg rounded-3xl p-6 border border-[var(--card-border)] shadow-2xl space-y-5 sheet-enter-spring max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--card-border)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    Edit Profile
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Display Name / Nickname */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="e.g. DavaoStudent, EagleWings"
                  required
                  maxLength={30}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-medium focus:outline-hidden focus:border-[var(--text-primary)] transition-all"
                />
              </div>

              {/* School / Campus Selection with SelectWithOther */}
              <SelectWithOther
                label="School / Campus"
                options={DAVAO_CAMPUSES.map((campus) => ({
                  value: campus.id,
                  label: `${campus.name} • ${campus.shortName}`
                }))}
                value={editCampusId}
                onChange={(val) => setEditCampusId(val)}
                otherPlaceholder="Enter university or campus name"
                otherOptionLabel="Other Campus"
                selectClassName="bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-primary)]"
              />

              {/* Year Level & Academic Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectWithOther
                  label="College Year Level"
                  options={[
                    { value: 'Freshman', label: 'Freshman • 1st Year' },
                    { value: 'Sophomore', label: 'Sophomore • 2nd Year' },
                    { value: 'Junior', label: 'Junior • 3rd Year' },
                    { value: 'Senior', label: 'Senior • 4th Year' },
                    { value: '5th Year / Irregular', label: '5th Year / Irregular' },
                    { value: 'Post-Graduate', label: 'Post-Graduate / Law / Med' },
                    { value: 'Faculty Member', label: 'Faculty Member' }
                  ]}
                  value={editYearLevel}
                  onChange={(val) => setEditYearLevel(val)}
                  otherPlaceholder="Enter custom year level"
                  otherOptionLabel="Other Year Level"
                  selectClassName="bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-primary)]"
                />

                <div className="space-y-1.5">
                  <CustomSelect
                    label="Academic Role"
                    value={editRole}
                    onChange={(val) => setEditRole(val as 'student' | 'teacher')}
                    options={[
                      { value: 'student', label: 'Student' },
                      { value: 'teacher', label: 'Faculty / Teacher' }
                    ]}
                    triggerClassName="bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-primary)] rounded-2xl px-4 py-2.5"
                  />
                </div>
              </div>

              {/* Course / Program */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Degree Program / Course
                </label>
                <input
                  type="text"
                  value={editCourse}
                  onChange={(e) => setEditCourse(e.target.value)}
                  placeholder="e.g. BS Computer Science, BS Nursing"
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-medium focus:outline-hidden focus:border-[var(--text-primary)] transition-all"
                />
              </div>

              {/* Age & Gender Identity (Anti-Impersonation Safeguard) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Age
                  </label>
                  <input
                    type="number"
                    min={12}
                    max={80}
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-medium focus:outline-hidden focus:border-[var(--text-primary)] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <CustomSelect
                    label="Gender Identity"
                    value={editGender}
                    onChange={(val) => setEditGender(val)}
                    options={[
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Non-binary', label: 'Non-binary' },
                      { value: 'Prefer not to say', label: 'Prefer not to say' }
                    ]}
                    triggerClassName="bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-primary)] rounded-2xl px-4 py-2.5"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--card-border)] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 pressable shadow-sm flex items-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Log Out Confirmation Modal */}
      {isLogoutModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setIsLogoutModalOpen(false)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl p-6 border border-[var(--card-border)] shadow-2xl space-y-4 sheet-enter-spring max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[#FF453A] flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Sign out of SkwelaDabaw?
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {userSession.email || userSession.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Your Google session will disconnect. Your local offline schedules will remain stored safely on this device.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#FF453A] text-white pressable shadow-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Database Modal */}
      {isResetModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setIsResetModalOpen(false)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-sm rounded-3xl p-6 border border-[var(--card-border)] shadow-2xl space-y-4 sheet-enter-spring max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[#FF9F0A] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Reset Davao Database?
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Reload default sample schedules
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              This will reset local database tables and reload default Davao campus schedules, jeeps, and hotlines.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#FF453A] text-white pressable shadow-sm"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* In-App Update Modal */}
      {foundUpdateModal && (
        <AppUpdateModal
          updateInfo={foundUpdateModal}
          onClose={() => setFoundUpdateModal(null)}
        />
      )}

      {/* Legal & Privacy Modal */}
      <LegalModal
        isOpen={legalModalTab !== null}
        onClose={() => setLegalModalTab(null)}
        initialTab={legalModalTab || 'terms'}
      />

      {/* Schedule Import Modal (JSON / QR) */}
      <ScheduleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Class Reminders & Status Bar Notification Modal */}
      {isNotifSettingsModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sheet-backdrop-enter select-none"
          onClick={() => setIsNotifSettingsModalOpen(false)}
        >
          <div 
            className="bg-[var(--modal-bg)] w-full max-w-lg rounded-3xl p-6 border border-[var(--card-border)] shadow-2xl space-y-4 sheet-enter-spring max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--card-border)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    Class Reminders &amp; Status Bar
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Notification alarms and persistent status card
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifSettingsModalOpen(false)}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nested-bg)] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Individual Class Alarms (User Custom / Choice) */}
              <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Bell className="w-3.5 h-3.5 text-[#30D158]" />
                  <span>Class Alarms (Per-Subject Custom Choice)</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Class alarms trigger strictly based on the reminder timing (e.g. 10m, 15m, 30m, 1h) configured when adding or editing that subject in your timetable. Classes set to <strong>None</strong> will never ring, preventing duplicate notifications.
                </p>
              </div>

              {/* Unremovable Status Bar Card Toggle */}
              <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                    <span>Unremovable Status Bar Card</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Pins an ongoing status card on Android status bar that cannot be swiped away or cleared.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={persistentNextClass}
                    onChange={(e) => handleTogglePersistentNextClass(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--nested-border)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
                </label>
              </div>

              {persistentNextClass && (
                <div className="space-y-4 pt-2 border-t border-[var(--card-border)] animate-fade-in">
                  {/* Notification Permission Prompt if not granted */}
                  {!hasNotificationPermission && (
                    <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-amber-500/40 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Notification Permission Needed</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Grant permission to allow the ongoing card to show on your status bar.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestNotificationPerm}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-bold shrink-0 pressable"
                      >
                        Grant
                      </button>
                    </div>
                  )}

                  {/* Android Background Execution / Battery Exemption */}
                  <div className="p-3.5 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#30D158]" />
                        <span>Background Execution &amp; Battery Exemption</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {isBatteryOptimizedExempt 
                          ? 'Battery optimization exempt. App can update ongoing card and widgets in background.' 
                          : 'Exempt SkwelaDabaw from battery saver so notification stays pinned without OS stopping it.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestBatteryExemption}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all pressable ${
                        isBatteryOptimizedExempt
                          ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40'
                          : 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                      }`}
                    >
                      {isBatteryOptimizedExempt ? 'Exempt' : 'Request'}
                    </button>
                  </div>

                  {/* Notification Theme Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Status Bar Card Theme:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.values(NOTIFICATION_THEMES).map((theme) => {
                        const isSelected = persistentTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => handleSelectPersistentTheme(theme.id)}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[var(--text-primary)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs'
                                : 'border-[var(--card-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--card-hover-border)]'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                              style={{ backgroundColor: theme.accentHex }}
                            />
                            <span className="text-xs truncate">{theme.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Live Status Card Preview */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Live Status Bar Shade Preview:
                    </label>
                    {(() => {
                      const activeTheme = NOTIFICATION_THEMES[persistentTheme] || NOTIFICATION_THEMES.midnight;
                      return (
                        <div
                          className="p-3.5 rounded-2xl border transition-all select-none"
                          style={{
                            backgroundColor: activeTheme.bgHex,
                            borderColor: activeTheme.borderHex,
                            color: activeTheme.textHex
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${activeTheme.accentHex}25`,
                                  color: activeTheme.accentHex,
                                  border: `1px solid ${activeTheme.accentHex}50`
                                }}
                              >
                                Next Class
                              </span>
                              <span className="text-xs font-semibold opacity-75">
                                09:00 AM • Lab 402
                              </span>
                            </div>
                            <span className="text-[10px] font-medium opacity-60">Status Bar</span>
                          </div>
                          <div className="mt-2 text-sm font-bold truncate">
                            IT 311 • Systems Integration and Architecture
                          </div>
                          <div className="mt-0.5 text-xs opacity-75 flex items-center gap-2">
                            <span>Finster Hall</span>
                            <span>•</span>
                            <span>Starts in 25 minutes</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Manual Test & Refresh Button */}
                  <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerLiveNotification}
                      disabled={isTriggeringLiveNotif}
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-2 transition-all pressable"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringLiveNotif ? 'animate-spin' : ''}`} />
                      <span>{isTriggeringLiveNotif ? 'Updating status bar...' : 'Update Status Bar Notification Now'}</span>
                    </button>
                    {liveNotifFeedback && (
                      <span className="text-xs text-[#30D158] font-medium animate-fade-in shrink-0">
                        {liveNotifFeedback}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Davao Weather & Commuter Advisories Toggle */}
              <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <CloudSun className="w-3.5 h-3.5 text-sky-400" />
                    <span>Davao Weather &amp; Commuter Advisories</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Local notifications for extreme heat index (≥ 40°C) and afternoon commute rainstorms (max 1 alert per day).
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={weatherAlertsEnabled}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setWeatherAlertsEnabled(val);
                      localStorage.setItem('skweladabaw_weather_alerts_enabled', val ? 'true' : 'false');
                    queueCloudSync();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--nested-border)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
                </label>
              </div>

              {/* Send Test Notification Button */}
              <div className="pt-2 border-t border-[var(--card-border)]">
                <button
                  type="button"
                  disabled={isTestingNotif}
                  onClick={async () => {
                    setIsTestingNotif(true);
                    setNotifTestStatus(null);
                    try {
                      const res = await sendTestNotification();
                      setNotifTestStatus(res.message);
                    } catch (e: any) {
                      setNotifTestStatus(`Error: ${e?.message || 'Failed'}`);
                    } finally {
                      setIsTestingNotif(false);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 pressable"
                >
                  <Bell className="w-4 h-4" />
                  <span>{isTestingNotif ? 'Sending Test Notification...' : 'Send Test Notification'}</span>
                </button>
                {notifTestStatus && (
                  <div className="mt-2 p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                    <span>{notifTestStatus}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--card-border)] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsNotifSettingsModalOpen(false)}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] pressable"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Account Link Conflict Resolution Modal */}
      {pendingCloudUser && pendingGoogleSession && (
        <AccountLinkSyncModal
          isOpen={isAccountLinkSyncModalOpen}
          onClose={() => setIsAccountLinkSyncModalOpen(false)}
          cloudUser={pendingCloudUser}
          guestSession={userSession}
          localScheduleCount={pendingScheduleCount}
          onRestoreCloud={handleRestoreCloudAccount}
          onSyncGuest={handleSyncGuestProfileToCloud}
          isProcessing={isResolvingSyncConflict}
        />
      )}

      {/* Global Processing Spinner Overlay */}
      <ProcessingOverlay
        isOpen={isLoggingIn}
        message="Authenticating • Please wait"
        submessage="Connecting securely to SkwelaDabaw cloud"
      />
    </div>
  );
};
