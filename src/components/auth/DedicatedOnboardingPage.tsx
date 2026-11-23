import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  School, 
  User, 
  Navigation, 
  Camera, 
  FileJson, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Volume2, 
  Vibrate, 
  Calendar, 
  Wallet, 
  Clock, 
  LayoutGrid, 
  ListOrdered,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Bell,
  ExternalLink,
  Bus,
  GraduationCap
} from 'lucide-react';
import { IconBrandGoogle } from '@tabler/icons-react';
import { db } from '../../db';
import { EagleBuddy } from '../common/EagleBuddy';
import { CachedAvatar } from '../common/CachedAvatar';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { 
  StudentAuthSession, 
  signInWithGoogle, 
  rollbackFailedAuth,
  saveSession, 
  getSavedSession, 
  hasCompletedOnboarding,
  setOnboardingCompleted,
  setDeferredGuestChoicePending
} from '../../services/authService';
import {
  checkExistingUserDetailed,
  saveLocalUserRecord,
  saveUserProfile,
  checkUsernameAvailable,
  UserAccountRecord,
  getPendingGuestDataCounts,
  hasPendingGuestSnapshot,
  restorePendingGuestDataToDexie,
  clearPendingGuestData,
  PendingGuestDataCounts
} from '../../services/userService';
import { restoreUserData, syncLocalDataToCloud, syncCloudDataBiDirectional, hasPendingLocalSync } from '../../services/cloudSyncService';
import { flushPendingSync } from '../../services/taskSyncService';
import { 
  requestNotificationPermission, 
  sendTestNotification, 
  NOTIFICATION_THEMES,
  refreshUnremovableClassNotification,
  cancelPersistentNextClassNotification,
  cancelAllAccountReminders,
  syncIngatNotificationsForLiveToggle
} from '../../services/notificationService';
import { syncScheduleToWidgets, syncTasksToWidgets, syncRoutinesToWidgets } from '../../services/widgetService';
import { CampusPickerModal } from '../common/CampusPickerModal';
import { ScheduleImportModal } from '../schedule/ScheduleImportModal';
import { ProcessingOverlay } from '../common/ProcessingOverlay';
import { AccountLinkSyncModal } from './AccountLinkSyncModal';
import { useProcessingOverlay } from '../../contexts/ProcessingOverlayContext';
import { TalkingMascot, MascotMood } from '../common/TalkingMascot';
import { useBackHandler, BackPriority } from '../../hooks/useBackHandler';
import { 
  getBayaniLanguage, 
  setBayaniLanguage, 
  BayaniLanguage, 
  BAYANI_ONBOARDING_SCRIPTS 
} from '../../utils/bayaniDialogues';
import { useAppLanguage, setAppLanguage, AppLanguage, fromBayaniLanguage, t } from '../../services/languageService';
import { playEagleSound } from '../../utils/audio';
import confetti from 'canvas-confetti';

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

export interface DedicatedOnboardingPageProps {
  onComplete: (session: StudentAuthSession) => void;
  currentTheme?: string;
  onChangeTheme?: (theme: string) => void;
  initialGoogleSession?: StudentAuthSession | null;
}

const suggestUsernameFromGoogle = (session?: StudentAuthSession | null): string => {
  if (!session) return '';
  const raw = session.email
    ? session.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
    : (session.name || '').toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
  const trimmed = raw.slice(0, 20);
  if (trimmed.length >= 3) return trimmed;
  return trimmed ? `${trimmed}_dvo` : 'student_user';
};

export const DedicatedOnboardingPage: React.FC<DedicatedOnboardingPageProps> = ({ 
  onComplete,
  currentTheme,
  onChangeTheme,
  initialGoogleSession
}) => {
  const { withProcessing } = useProcessingOverlay();
  const [step, setStep] = useState<number>(initialGoogleSession ? 2 : 1);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const totalSteps = 8;

  // App & Bayani Companion Language State
  const { language, setLanguage } = useAppLanguage();
  const bayaniLanguage: BayaniLanguage = language === 'en' ? 'english' : language === 'tl' ? 'tagalog' : 'bisaya';

  const handleSelectLanguage = (targetBayaniLang: BayaniLanguage) => {
    const appLang = fromBayaniLanguage(targetBayaniLang);
    setLanguage(appLang);
    setBayaniLanguage(targetBayaniLang);
  };

  // Loading & Modal States
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [isCampusPickerOpen, setIsCampusPickerOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Guest-to-Account Choice Modal State
  const prevGuestSessionRef = useRef<StudentAuthSession | null>(null);
  const [isAccountLinkSyncModalOpen, setIsAccountLinkSyncModalOpen] = useState<boolean>(false);
  const [accountLinkMode, setAccountLinkMode] = useState<'existing-account' | 'new-account'>('existing-account');
  const [pendingCloudUser, setPendingCloudUser] = useState<UserAccountRecord | null>(null);
  const [pendingGoogleSession, setPendingGoogleSession] = useState<StudentAuthSession | null>(null);
  const [pendingGuestSessionSnapshot, setPendingGuestSessionSnapshot] = useState<StudentAuthSession | null>(null);
  const [pendingGuestCounts, setPendingGuestCounts] = useState<PendingGuestDataCounts>({
    schedules: 0,
    tasks: 0,
    routines: 0,
    expenses: 0,
    grades: 0,
    total: 0
  });
  const [isResolvingGuestLink, setIsResolvingGuestLink] = useState<boolean>(false);

  // Form State
  const [username, setUsername] = useState<string>(() =>
    initialGoogleSession ? suggestUsernameFromGoogle(initialGoogleSession) : ''
  );
  const [displayName, setDisplayName] = useState<string>(initialGoogleSession?.name || '');
  const [campusId, setCampusId] = useState<string>(() => {
    if (initialGoogleSession) return '';
    try {
      const saved = localStorage.getItem('skweladabaw_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.campusId) return parsed.campusId;
      }
    } catch (_) {}
    return '';
  });
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [course, setCourse] = useState<string>('');
  const [yearLevel, setYearLevel] = useState<string>('Freshman');
  const [isLoggedInWithGoogle, setIsLoggedInWithGoogle] = useState<boolean>(Boolean(initialGoogleSession));
  const [userAvatar, setUserAvatar] = useState<string>(initialGoogleSession?.avatar || '');
  const [userEmail, setUserEmail] = useState<string>(initialGoogleSession?.email || '');
  const [userUid, setUserUid] = useState<string>(initialGoogleSession?.uid || '');

  // Terms of Service agreement
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(Boolean(initialGoogleSession));
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (initialGoogleSession) {
      setIsLoggedInWithGoogle(true);
      setAgreedToTerms(true);
      setDisplayName(initialGoogleSession.name || '');
      setUserEmail(initialGoogleSession.email || '');
      setUserAvatar(initialGoogleSession.avatar || '');
      setUserUid(initialGoogleSession.uid || `user-${Date.now()}`);
      setCampusId('');
      setCourse('');
      setYearLevel('Freshman');
      setRole('student');
      setUsername(suggestUsernameFromGoogle(initialGoogleSession));
      setStep(2);
    }
  }, [initialGoogleSession]);

  useEffect(() => {
    return () => {
      setDeferredGuestChoicePending(false);
    };
  }, []);

  // Age & Gender verification state (minimum 13)
  const [age, setAge] = useState<number>(18);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [gender, setGender] = useState<string>('Male');

  // Step 5: Notification timing & Widget preference
  const [reminderTiming, setReminderTiming] = useState<number>(15);
  const [isCustomReminder, setIsCustomReminder] = useState<boolean>(false);
  const [preferredLayout, setPreferredLayout] = useState<'today' | 'grid'>('today');
  const [persistentNextClass, setPersistentNextClass] = useState<boolean>(false);
  const [persistentTheme, setPersistentTheme] = useState<string>('midnight');

  // Step 6: Sound & Vibration
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [isTestingSound, setIsTestingSound] = useState<boolean>(false);

  // Step 7: Baon Budget
  const [baonFrequency, setBaonFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [baonAmount, setBaonAmount] = useState<number>(150);
  const [baonInput, setBaonInput] = useState<string>('150');

  // Step 8: Telemetry & Crash Reporting Consent
  const [telemetryConsent, setTelemetryConsent] = useState<boolean>(true);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');

  // Notification test state
  const [notificationTestStatus, setNotificationTestStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');

  const selectedCampus = DAVAO_CAMPUSES.find(c => c.id === campusId) || null;

  // Step navigation with slide direction tracking
  const goToStep = (newStep: number) => {
    setSlideDirection(newStep > step ? 'right' : 'left');
    setStep(newStep);
  };

  useBackHandler(
    step > 1 && !isCampusPickerOpen && !isImportModalOpen && !isAccountLinkSyncModalOpen,
    () => goToStep(step - 1),
    BackPriority.SUBVIEW,
    'onboarding_step_back'
  );

  // Debounced real-time Firestore username check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    const clean = username.trim().toLowerCase();
    if (clean.length < 3) {
      setUsernameStatus('taken');
      setUsernameMessage('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      setUsernameStatus('taken');
      setUsernameMessage('Only letters, numbers, and underscores are allowed.');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailable(clean, userUid);
      if (result.available) {
        setUsernameStatus('available');
        setUsernameMessage(`@${clean} is available!`);
      } else {
        setUsernameStatus('taken');
        setUsernameMessage(result.reason || 'Username is already taken.');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [username, userUid]);

  // Tri-lingual Mascot Messages by Step with Explicit Student Guidance & Privacy Warnings
  const getMascotProps = (): { mood: MascotMood; message: string; subMessage: string } => {
    const scripts: Record<number, Record<BayaniLanguage, { mood: MascotMood; message: string; subMessage: string }>> = {
      1: {
        bisaya: {
          mood: 'waving',
          message: 'Maayong pag-abot sa SkwelaDabaw!',
          subMessage: 'Mag-sign in gamit ang Google account aron awtomatikong ma-sync imong schedule ug profile sa cloud.'
        },
        tagalog: {
          mood: 'waving',
          message: 'Maligayang pagdating sa SkwelaDabaw!',
          subMessage: 'Mag-sign in gamit ang Google account upang awtomatikong ma-sync ang iyong schedule at profile sa cloud.'
        },
        english: {
          mood: 'waving',
          message: 'Welcome to SkwelaDabaw!',
          subMessage: 'Sign in with your Google account to automatically sync your schedule and student profile securely.'
        }
      },
      2: {
        bisaya: {
          mood: 'excited',
          message: 'Student Privacy Tip: Ayaw gamita imong full name!',
          subMessage: 'Ayaw gamita imong tinuod nga tibuok ngalan o student ID number. Paggamit og alias, nickname, o handle aron mapanalipdan imong identity subay sa Data Privacy Act RA 10173.'
        },
        tagalog: {
          mood: 'excited',
          message: 'Student Privacy Tip: Huwag gamitin ang buong pangalan!',
          subMessage: 'Huwag gamitin ang iyong totoong buong pangalan o student ID number. Gumamit ng alias o palayaw upang maprotektahan ang iyong identity alinsunod sa Data Privacy Act RA 10173.'
        },
        english: {
          mood: 'excited',
          message: 'Student Privacy Tip: Do not use your real full name!',
          subMessage: 'Avoid using your full legal name or student ID number. Use a nickname or handle to protect your identity under the Data Privacy Act RA 10173.'
        }
      },
      3: {
        bisaya: {
          mood: 'happy',
          message: 'Pilia imong Davao campus ug academic role',
          subMessage: 'AdDU, USEP, UM, UIC, o uban pa. Pilia imong eskwelahan aron ma-tailor imong ruta sa jeep ug study spots.'
        },
        tagalog: {
          mood: 'happy',
          message: 'Piliin ang iyong Davao campus at academic role',
          subMessage: 'AdDU, USEP, UM, UIC, o iba pa. Piliin ang iyong paaralan para ma-tailor ang iyong ruta ng jeep at study spots.'
        },
        english: {
          mood: 'happy',
          message: 'Select your Davao campus and academic role',
          subMessage: 'AdDU, USEP, UM, UIC, or others. Choose your school to tailor your jeepney routes and study spots.'
        }
      },
      4: {
        bisaya: {
          mood: 'thinking',
          message: 'I-import o i-scan imong study load karon',
          subMessage: 'Mahimo nimo gamiton ang Camera OCR aron basahon imong study load card, o i-import ang JSON schedule backup, o laktawi para manu-manong i-add.'
        },
        tagalog: {
          mood: 'thinking',
          message: 'I-import o i-scan ang iyong study load ngayon',
          subMessage: 'Maaari mong gamitin ang Camera OCR upang basahin ang study load card, mag-import ng JSON schedule backup, o laktawan para manual na ilagay.'
        },
        english: {
          mood: 'thinking',
          message: 'Import or scan your study load now',
          subMessage: 'You can use Camera OCR to scan your study load card, import a JSON schedule backup, or skip to add subjects manually.'
        }
      },
      5: {
        bisaya: {
          mood: 'alarm',
          message: 'Kanus-a ka gusto pahibaloon una ang klase?',
          subMessage: 'Pilia kung pila ka minuto una ang meeting time aron dili ka ma-late sa imong lecture o laboratory.'
        },
        tagalog: {
          mood: 'alarm',
          message: 'Kailan mo gustong maabisuhan bago ang klase?',
          subMessage: 'Piliin kung ilang minuto bago ang meeting time upang hindi ka mahuli sa iyong lecture o laboratory.'
        },
        english: {
          mood: 'alarm',
          message: 'When would you like to be notified before class?',
          subMessage: 'Choose how many minutes before class start time so you never miss a lecture or laboratory.'
        }
      },
      6: {
        bisaya: {
          mood: 'alarm',
          message: 'Sulayi ang chime sound ug tingog ni Bayani',
          subMessage: 'Pindota ang test button para masiguro nga klaro ang audio alarm sa imong klase.'
        },
        tagalog: {
          mood: 'alarm',
          message: 'Subukan ang chime sound at boses ni Bayani',
          subMessage: 'Pindutin ang test button upang matiyak na malinaw ang audio alarm ng iyong klase.'
        },
        english: {
          mood: 'alarm',
          message: 'Test the chime sound and Bayani voice',
          subMessage: 'Press the test button to ensure class reminder alarms and eagle chimes are crisp and clear.'
        }
      },
      7: {
        bisaya: {
          mood: 'budget',
          message: 'Pila imong allowance o baon budget?',
          subMessage: 'I-input imong binuwan o senemanang baon. Atong kuwentahon ang imong adlaw-adlaw nga budget para sa plete ug pagkaon.'
        },
        tagalog: {
          mood: 'budget',
          message: 'Magkano ang iyong allowance o baon budget?',
          subMessage: 'I-input ang iyong buwanan o lingguhang baon. Ating kukuwentahin ang iyong pang-araw-araw na budget para sa pamasahe at pagkain.'
        },
        english: {
          mood: 'budget',
          message: 'What is your allowance or baon budget?',
          subMessage: 'Enter your monthly or weekly allowance. We will calculate your daily budget for jeepney fares and meals.'
        }
      },
      8: {
        bisaya: {
          mood: 'shield',
          message: 'Dabawenyo Safety Shield: Central 911',
          subMessage: 'Andam na ang tanan! Naa kay 1-tap distress emergency beacon kon magkinahanglan ka og dinaliang tabang sa biyahe.'
        },
        tagalog: {
          mood: 'shield',
          message: 'Dabawenyo Safety Shield: Central 911',
          subMessage: 'Handa na ang lahat! Mayroon kang 1-tap distress emergency beacon kung mangailangan ka ng tulong sa biyahe.'
        },
        english: {
          mood: 'shield',
          message: 'Dabawenyo Safety Shield: Central 911',
          subMessage: 'Everything is set! You have a 1-tap emergency beacon if you ever need urgent help during your commute.'
        }
      }
    };

    const stepScript = scripts[step]?.[bayaniLanguage] || scripts[step]?.bisaya;
    if (stepScript) {
      return stepScript;
    }

    return {
      mood: 'happy',
      message: 'Welcome to SkwelaDabaw!',
      subMessage: 'Your all-in-one Davao student companion.'
    };
  };

  const runBoundedCloudSync = async (syncTask: () => Promise<unknown>, maxWaitMs = 8000): Promise<void> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      await Promise.race([
        syncTask().catch((err) => {
          console.warn('Bounded post-commit cloud sync note:', err);
        }),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, maxWaitMs);
        })
      ]);
    } finally {
      if (timer !== null) {
        clearTimeout(timer);
      }
    }
  };

  // STEP 1: Google Login or Guest
  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      setGoogleAuthError('Please agree to the Terms of Service before signing in.');
      return;
    }

    setIsLoggingIn(true);
    setGoogleAuthError(null);
    const prevSessionBeforeLogin = getSavedSession();
    const isFromActiveGuest = !prevSessionBeforeLogin.isLoggedIn && hasCompletedOnboarding();
    prevGuestSessionRef.current = prevSessionBeforeLogin;

    try {
      const session = await signInWithGoogle(campusId, {
        deferGuestMigration: isFromActiveGuest
      });
      if (!session) {
        setDeferredGuestChoicePending(false);
        return;
      }

      // Deep account check with strict 4-state discrimination
      const checkResult = await checkExistingUserDetailed(session.uid || '', session.email || '');

      if (checkResult.state === 'NETWORK_OR_DB_ERROR') {
        await rollbackFailedAuth(prevSessionBeforeLogin);
        if (isFromActiveGuest && hasPendingGuestSnapshot()) {
          await restorePendingGuestDataToDexie({ markPendingForSync: false }).catch(() => {});
          clearPendingGuestData();
        }
        setGoogleAuthError('Unable to verify account with server. Please check your connection and tap Sign In again.');
        return;
      }

      // Check both `user.php` lookup and session/Dexie data already hydrated by `restoreUserData` inside `signInWithGoogle`
      const hydratedSession = getSavedSession();
      let hydratedScheduleCount = 0;
      try {
        hydratedScheduleCount = await db.schedules.count();
      } catch (_) {}

      const existing = checkResult.user;
      const rawUsername = (existing?.username || hydratedSession?.username || '').trim();
      const isAutoGenerated = /^student_[a-f0-9]{6,16}$/i.test(rawUsername);
      const resolvedExistingName = (existing?.displayName || hydratedSession?.name || session.name || '').trim();
      const isPlaceholderName = !resolvedExistingName || resolvedExistingName === 'Davao Student' || resolvedExistingName === 'Student';

      const isRealReturningUser = Boolean(
        checkResult.state === 'PROFILE_COMPLETE' &&
        existing &&
        rawUsername.length >= 3 &&
        !isAutoGenerated &&
        !isPlaceholderName &&
        existing.isSetupComplete === true
      );

      const hasHydratedCloudAccount = Boolean(
        (hydratedSession?.isLoggedIn && hydratedSession?.uid === session.uid && (
          (hydratedSession.username && !/^student_[a-f0-9]{6,16}$/i.test(hydratedSession.username)) ||
          Boolean(hydratedSession.campusId) ||
          (hydratedSession.age && hydratedSession.age > 0) ||
          Boolean(hydratedSession.gender) ||
          hydratedScheduleCount > 0
        ))
      );

      const isReturningExistingAccount = Boolean(
        isRealReturningUser ||
        (checkResult.isReturningAccount && existing) ||
        hasHydratedCloudAccount
      );

      // Active Guest routed here (e.g. from Community Posts or Campus Chat) -> ALWAYS let them explicitly choose
      if (isFromActiveGuest) {
        const guestCounts = getPendingGuestDataCounts();
        setPendingGuestCounts(guestCounts);
        setPendingGuestSessionSnapshot(prevSessionBeforeLogin);
        setPendingGoogleSession(session);

        if (isReturningExistingAccount) {
          const cloudRecord: UserAccountRecord = existing || {
            uid: hydratedSession?.uid || session.uid || '',
            email: hydratedSession?.email || session.email || '',
            username: hydratedSession?.username || '',
            displayName: hydratedSession?.name || session.name || 'Student',
            avatar: hydratedSession?.avatar || session.avatar || '',
            campusId: hydratedSession?.campusId || '',
            course: hydratedSession?.course || 'Enrolled Student',
            yearLevel: hydratedSession?.yearLevel || 'College Student',
            role: (hydratedSession?.role as any) || 'student',
            createdAt: '',
            updatedAt: '',
            age: hydratedSession?.age,
            gender: hydratedSession?.gender
          };
          setPendingCloudUser(cloudRecord);
          setAccountLinkMode('existing-account');
        } else {
          setPendingCloudUser(null);
          setAccountLinkMode('new-account');
        }
        setIsAccountLinkSyncModalOpen(true);
        return;
      }

      setDeferredGuestChoicePending(false);

      if (isReturningExistingAccount) {
        // Returning student with existing account: restore local device storage & enter the main app directly!
        const targetUid = hydratedSession?.uid || session.uid || existing?.uid || '';
        const resolvedUsername = (!isAutoGenerated && rawUsername)
          ? rawUsername
          : (existing?.username || hydratedSession?.username || '');
        const resolvedDisplayName = !isPlaceholderName
          ? resolvedExistingName
          : (existing?.displayName || hydratedSession?.name || session.name || 'Student');

        const restoredSession: StudentAuthSession = {
          isLoggedIn: true,
          uid: targetUid,
          name: resolvedDisplayName,
          username: resolvedUsername,
          email: existing?.email || hydratedSession?.email || session.email,
          avatar: existing?.avatar || hydratedSession?.avatar || session.avatar,
          campusId: existing?.campusId || hydratedSession?.campusId || campusId,
          studentId: '',
          course: existing?.course || hydratedSession?.course || 'Enrolled Student',
          yearLevel: existing?.yearLevel || hydratedSession?.yearLevel || 'College Student',
          role: existing?.role || hydratedSession?.role || 'student',
          age: existing?.age ?? hydratedSession?.age,
          gender: existing?.gender ?? hydratedSession?.gender
        };

        saveSession(restoredSession);
        if (existing) {
          saveLocalUserRecord(existing);
        }
        setOnboardingCompleted(true);

        // Skip in-app prompt if core personal & handle fields are complete; otherwise let App.tsx prompt cleanly
        const needsInAppMissingModal = Boolean(
          !restoredSession.username ||
          /^student_[a-f0-9]{6,16}$/i.test(restoredSession.username) ||
          !restoredSession.gender ||
          !restoredSession.age ||
          restoredSession.age <= 0
        );
        if (!needsInAppMissingModal) {
          sessionStorage.setItem('skwela_session_checked', 'true');
        } else {
          sessionStorage.removeItem('skwela_session_checked');
        }

        // switchAccountSchedules inside signInWithGoogle already calls restoreUserData(session.uid);
        // flush any restored account-backup deletions/mutations now that onboarding is completed.
        if (targetUid && targetUid !== session.uid) {
          restoreUserData(targetUid).catch(() => {});
        } else if (targetUid) {
          hasPendingLocalSync(targetUid).then((pending) => {
            if (pending) {
              flushPendingSync().catch(() => {});
              syncLocalDataToCloud(restoredSession).catch(() => {});
            }
          }).catch(() => {});
        }

        onComplete(restoredSession);
        return;
      }

      // Confirmed BRAND NEW ACCOUNT: proceed cleanly to Step 2 onboarding (prefilling any available data)
      setIsLoggedInWithGoogle(true);
      setDisplayName(!isPlaceholderName ? resolvedExistingName : session.name);
      setUserEmail(session.email);
      if (session.avatar) setUserAvatar(session.avatar);
      setUserUid(session.uid || `user-${Date.now()}`);
      if (existing?.campusId) setCampusId(existing.campusId);
      if (existing?.course) setCourse(existing.course);
      if (existing?.yearLevel) setYearLevel(existing.yearLevel);
      if (existing?.age && existing.age >= 13) setAge(existing.age);
      if (existing?.gender) setGender(existing.gender);
      if (existing?.role === 'teacher' || existing?.role === 'student') setRole(existing.role);

      if (!username) {
        const suggested = (!isAutoGenerated && rawUsername) || suggestUsernameFromGoogle(session);
        setUsername(suggested || 'student_user');
      }

      goToStep(2);
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      await rollbackFailedAuth(prevSessionBeforeLogin).catch(() => {});
      if (isFromActiveGuest && hasPendingGuestSnapshot()) {
        await restorePendingGuestDataToDexie({ markPendingForSync: false }).catch(() => {});
        clearPendingGuestData();
      }
      const msg = String(err?.message || err || '');
      if (msg.includes('Code 10') || msg.includes('Developer Error') || msg.includes('SHA-1')) {
        setGoogleAuthError('Google Sign-In setup error (Code 10). App SHA-1 must be registered in Firebase Console.');
      } else if (msg.includes('Code 12500')) {
        setGoogleAuthError('Google Play Services sign-in error (Code 12500). Check connection and Play Services.');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('timeout') || msg.includes('unsynced') || msg.includes('back them up')) {
        setGoogleAuthError(msg.includes('unsynced') ? msg : (msg || 'Network connection error. Please check internet and try again.'));
      } else {
        setGoogleAuthError(msg || 'Unable to sign in with Google right now. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCancelGuestLinkModal = async () => {
    if (isResolvingGuestLink) return;
    setIsResolvingGuestLink(true);
    try {
      await withProcessing({
        message: 'Restoring Guest Session • Please wait',
        submessage: 'Returning to your offline guest workspace',
        minVisibleMs: 250
      }, async () => {
        const prevGuest = prevGuestSessionRef.current || pendingGuestSessionSnapshot || getSavedSession();
        await rollbackFailedAuth(prevGuest);
        if (hasPendingGuestSnapshot()) {
          await restorePendingGuestDataToDexie({ markPendingForSync: false });
        }
        clearPendingGuestData();
        setIsAccountLinkSyncModalOpen(false);
        setPendingCloudUser(null);
        setPendingGoogleSession(null);
        setPendingGuestSessionSnapshot(null);
      });
    } catch (e) {
      console.error('Cancel guest link error:', e);
      setDeferredGuestChoicePending(false);
      setIsAccountLinkSyncModalOpen(false);
    } finally {
      setIsResolvingGuestLink(false);
    }
  };

  const handleKeepGuestNewAccount = async () => {
    if (!pendingGoogleSession || isResolvingGuestLink) return;
    setIsResolvingGuestLink(true);
    try {
      await withProcessing({
        message: 'Syncing Guest Data • Please wait',
        submessage: 'Transferring your guest timetable, tasks, and preferences to cloud',
        timeoutMs: 20000,
        minVisibleMs: 300
      }, async () => {
        const guestProfile = prevGuestSessionRef.current || pendingGuestSessionSnapshot || getSavedSession();
        const guestUsername = (guestProfile.username || '').trim().toLowerCase();
        const hasRealUsername = Boolean(
          guestUsername &&
          guestUsername.length >= 3 &&
          guestUsername !== 'guest_student' &&
          !/^student_[a-f0-9]{6,16}$/i.test(guestUsername)
        );
        const resolvedUsername = hasRealUsername ? guestUsername : '';

        const merged: StudentAuthSession = {
          isLoggedIn: true,
          uid: pendingGoogleSession.uid,
          name: pendingGoogleSession.name || guestProfile.name || 'Student',
          username: resolvedUsername,
          email: pendingGoogleSession.email || '',
          avatar: pendingGoogleSession.avatar || guestProfile.avatar || '',
          campusId: guestProfile.campusId || '',
          studentId: guestProfile.studentId || '',
          course: guestProfile.course || 'Enrolled Student',
          yearLevel: guestProfile.yearLevel || 'Freshman',
          role: guestProfile.role || 'student',
          age: guestProfile.age,
          gender: guestProfile.gender
        };

        saveSession(merged);
        setOnboardingCompleted(true);
        await restorePendingGuestDataToDexie({ markPendingForSync: true });

        const needsProfileCompletion = !resolvedUsername || !merged.gender || !merged.age || merged.age <= 0;
        if (needsProfileCompletion) {
          sessionStorage.removeItem('skwela_session_checked');
        } else {
          sessionStorage.setItem('skwela_session_checked', 'true');
        }

        await runBoundedCloudSync(async () => {
          await saveUserProfile(merged);
          await syncLocalDataToCloud(merged);
        }, 8000);

        clearPendingGuestData();
        setDeferredGuestChoicePending(false);
        setIsAccountLinkSyncModalOpen(false);
        setPendingCloudUser(null);
        setPendingGoogleSession(null);
        setPendingGuestSessionSnapshot(null);
        onComplete(merged);
      });
    } catch (e: any) {
      console.error('Keep guest new account error:', e);
      setGoogleAuthError(e?.message || 'Could not sync guest data to cloud. Please try again.');
    } finally {
      setIsResolvingGuestLink(false);
    }
  };

  const handleSyncGuestExistingAccount = async () => {
    if (!pendingCloudUser || !pendingGoogleSession || isResolvingGuestLink) return;
    setIsResolvingGuestLink(true);
    try {
      await withProcessing({
        message: 'Syncing Guest Data • Please wait',
        submessage: 'Uploading guest data to your linked account',
        timeoutMs: 20000,
        minVisibleMs: 300
      }, async () => {
        const guestProfile = prevGuestSessionRef.current || pendingGuestSessionSnapshot || getSavedSession();
        const targetUid = pendingCloudUser.uid || pendingGoogleSession.uid;

        const merged: StudentAuthSession = {
          isLoggedIn: true,
          uid: targetUid,
          name: pendingCloudUser.displayName || pendingGoogleSession.name,
          username: pendingCloudUser.username || pendingGoogleSession.username,
          email: pendingCloudUser.email || pendingGoogleSession.email,
          avatar: pendingGoogleSession.avatar || pendingCloudUser.avatar || guestProfile.avatar,
          campusId: guestProfile.campusId || pendingCloudUser.campusId,
          studentId: guestProfile.studentId || '',
          course: guestProfile.course || pendingCloudUser.course || 'Enrolled Student',
          yearLevel: guestProfile.yearLevel || pendingCloudUser.yearLevel || 'College Student',
          role: pendingCloudUser.role || 'student',
          age: guestProfile.age ?? pendingCloudUser.age,
          gender: guestProfile.gender ?? pendingCloudUser.gender
        };

        saveSession(merged);
        saveLocalUserRecord({
          ...pendingCloudUser,
          campusId: merged.campusId,
          course: merged.course || pendingCloudUser.course,
          yearLevel: merged.yearLevel || pendingCloudUser.yearLevel,
          age: merged.age,
          gender: merged.gender
        });
        setOnboardingCompleted(true);
        sessionStorage.setItem('skwela_session_checked', 'true');

        await restorePendingGuestDataToDexie({
          markPendingForSync: true,
          tombstoneExistingForUid: targetUid
        });

        await runBoundedCloudSync(async () => {
          await saveUserProfile(merged);
          await syncLocalDataToCloud(merged);
        }, 8000);

        clearPendingGuestData();
        setDeferredGuestChoicePending(false);
        setIsAccountLinkSyncModalOpen(false);
        setPendingCloudUser(null);
        setPendingGoogleSession(null);
        setPendingGuestSessionSnapshot(null);
        onComplete(merged);
      });
    } catch (e: any) {
      console.error('Sync guest existing account error:', e);
      setGoogleAuthError(e?.message || 'Could not sync guest data. Please try again.');
    } finally {
      setIsResolvingGuestLink(false);
    }
  };

  const handleRestoreCloudFromGuest = async () => {
    if (!pendingCloudUser || !pendingGoogleSession || isResolvingGuestLink) return;
    setIsResolvingGuestLink(true);
    try {
      await withProcessing({
        message: 'Restoring Cloud Account • Please wait',
        submessage: 'Loading your saved timetable and preferences from database',
        timeoutMs: 20000,
        minVisibleMs: 300
      }, async () => {
        const restoredSession: StudentAuthSession = {
          isLoggedIn: true,
          uid: pendingCloudUser.uid || pendingGoogleSession.uid,
          name: pendingCloudUser.displayName || pendingGoogleSession.name,
          username: pendingCloudUser.username || pendingGoogleSession.username || '',
          email: pendingCloudUser.email || pendingGoogleSession.email,
          avatar: pendingCloudUser.avatar || pendingGoogleSession.avatar,
          campusId: pendingCloudUser.campusId || pendingGoogleSession.campusId || '',
          studentId: '',
          course: pendingCloudUser.course || 'Enrolled Student',
          yearLevel: pendingCloudUser.yearLevel || 'College Student',
          role: pendingCloudUser.role || 'student',
          age: pendingCloudUser.age,
          gender: pendingCloudUser.gender
        };

        saveSession(restoredSession);
        saveLocalUserRecord(pendingCloudUser);
        setOnboardingCompleted(true);

        const needsInAppMissingModal = Boolean(
          !restoredSession.username ||
          /^student_[a-f0-9]{6,16}$/i.test(restoredSession.username) ||
          !restoredSession.gender ||
          !restoredSession.age ||
          restoredSession.age <= 0
        );
        if (!needsInAppMissingModal) {
          sessionStorage.setItem('skwela_session_checked', 'true');
        } else {
          sessionStorage.removeItem('skwela_session_checked');
        }

        await runBoundedCloudSync(() => syncCloudDataBiDirectional(), 8000);

        clearPendingGuestData();
        setDeferredGuestChoicePending(false);
        setIsAccountLinkSyncModalOpen(false);
        setPendingCloudUser(null);
        setPendingGoogleSession(null);
        setPendingGuestSessionSnapshot(null);
        onComplete(restoredSession);
      });
    } catch (e: any) {
      console.error('Restore cloud account error:', e);
      setGoogleAuthError(e?.message || 'Could not restore cloud account. Please try again.');
    } finally {
      setIsResolvingGuestLink(false);
    }
  };

  const handleStartFreshFromGuest = async () => {
    if (!pendingGoogleSession || isResolvingGuestLink) return;
    setIsResolvingGuestLink(true);
    try {
      await withProcessing({
        message: 'Preparing Fresh Onboarding • Please wait',
        submessage: 'Clearing temporary guest data for a fresh start',
        minVisibleMs: 300
      }, async () => {
        clearPendingGuestData();

        await db.transaction(
          'rw',
          [db.schedules, db.tasks, db.dayReminders, db.expenses, db.grades],
          async () => {
            await Promise.all([
              db.schedules.clear(),
              db.tasks.clear(),
              db.dayReminders.clear(),
              db.expenses.clear(),
              db.grades.clear()
            ]);
          }
        );

        const guestCacheKeys = [
          'skweladabaw_cached_schedules_guest',
          'skweladabaw_cached_tasks_guest',
          'skweladabaw_cached_routines_guest',
          'skweladabaw_cached_expenses_guest',
          'skweladabaw_cached_grades_guest',
          'skweladabaw_has_pending_cloud_sync',
          'skweladabaw_pending_sync',
          'skweladabaw_profile_dirty'
        ];
        for (const key of guestCacheKeys) {
          try { localStorage.removeItem(key); } catch (_) {}
        }

        await cancelAllAccountReminders().catch(() => {});
        syncScheduleToWidgets([]);
        syncTasksToWidgets([]);
        syncRoutinesToWidgets([]);

        const freshGoogleSession: StudentAuthSession = {
          isLoggedIn: true,
          uid: pendingGoogleSession.uid,
          name: pendingGoogleSession.name || '',
          username: '',
          email: pendingGoogleSession.email || '',
          avatar: pendingGoogleSession.avatar || '',
          campusId: '',
          studentId: '',
          course: '',
          yearLevel: 'Freshman',
          role: 'student',
          age: undefined,
          gender: undefined
        };

        setOnboardingCompleted(false);
        sessionStorage.removeItem('skwela_session_checked');
        saveSession(freshGoogleSession);
        setDeferredGuestChoicePending(false);

        setIsLoggedInWithGoogle(true);
        setDisplayName(freshGoogleSession.name);
        setUserEmail(freshGoogleSession.email);
        setUserAvatar(freshGoogleSession.avatar);
        setUserUid(freshGoogleSession.uid || `user-${Date.now()}`);
        setCampusId('');
        setCourse('');
        setYearLevel('Freshman');
        setRole('student');
        setAge(18);
        setGender('Male');
        setUsername(suggestUsernameFromGoogle(freshGoogleSession));

        setIsAccountLinkSyncModalOpen(false);
        setPendingCloudUser(null);
        setPendingGoogleSession(null);
        setPendingGuestSessionSnapshot(null);
        goToStep(2);
      });
    } catch (e: any) {
      console.error('Start fresh onboarding error:', e);
      setGoogleAuthError(e?.message || 'Could not start fresh onboarding. Please try again.');
    } finally {
      setIsResolvingGuestLink(false);
    }
  };

  const handleContinueAsGuest = () => {
    if (!agreedToTerms) {
      setGoogleAuthError('Please certify the Student Honor Pledge & Anti-Impersonation Agreement before proceeding.');
      return;
    }
    setIsLoggedInWithGoogle(false);
    setDisplayName('Student');
    setUserUid(`guest-${Date.now()}`);
    if (!username) setUsername('guest_student');
    goToStep(2);
  };

  // STEP 6: Interactive Sound & Vibration Test
  const handleTestSoundAndVibration = () => {
    setIsTestingSound(true);

    try {
      playEagleSound('alert');
    } catch (e) {
      console.warn('Audio chime test error:', e);
    }

    if (navigator.vibrate) {
      try {
        navigator.vibrate([120, 80, 120]);
      } catch (_) {}
    }

    setTimeout(() => {
      setIsTestingSound(false);
    }, 800);
  };

  // STEP 8: Request GPS (Non-blocking background location grab)
  const handleFinishWithGps = () => {
    if (isFinishing) return;
    setIsFinishing(true);

    if (navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            try {
              localStorage.setItem('skweladabaw_last_known_lat', String(pos.coords.latitude));
              localStorage.setItem('skweladabaw_last_known_lng', String(pos.coords.longitude));
            } catch {}
          },
          () => {},
          { timeout: 1500, maximumAge: 60000 }
        );
      } catch {}
    }

    handleFinishOnboarding();
  };

  // FINISH ONBOARDING (Instant Zero-Lag Transition)
  const handleFinishOnboarding = () => {
    if (isFinishing) return;
    setIsFinishing(true);

    try {
      localStorage.setItem('skweladabaw_baon_budget', String(baonAmount));
      localStorage.setItem('skweladabaw_baon_frequency', baonFrequency);
      localStorage.setItem('skweladabaw_default_view', preferredLayout);
      localStorage.setItem('skweladabaw_reminder_timing', String(reminderTiming));
      localStorage.setItem('skwela_telemetry_enabled', String(telemetryConsent));
      localStorage.setItem('skwela_telemetry_allow_cellular', 'false');
    } catch {}

    const finalSession: StudentAuthSession = {
      isLoggedIn: isLoggedInWithGoogle,
      uid: userUid || `user-${Date.now()}`,
      name: displayName || username || 'Student',
      username: username || displayName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''),
      email: userEmail || '',
      avatar: isLoggedInWithGoogle && userAvatar ? userAvatar : '',
      campusId,
      studentId: '',
      course: course.trim() || 'Enrolled Student',
      yearLevel: yearLevel || 'Freshman',
      role,
      age,
      gender
    };

    saveSession(finalSession);
    sessionStorage.setItem('skwela_session_checked', 'true');
    setOnboardingCompleted(true);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}

    // Complete immediately so UI transitions with ZERO delay!
    onComplete(finalSession);

    // Persist profile & cloud sync immediately in background (not skipped by component unmount)
    Promise.resolve().then(async () => {
      try {
        await requestNotificationPermission();
      } catch {}
      try {
        await saveUserProfile(finalSession);
        if (finalSession.isLoggedIn) {
          await syncLocalDataToCloud(finalSession);
        }
      } catch {}
    });
  };

  const mascotProps = getMascotProps();

  // STEP 1: Standalone Clean, Non-Scrollable (100dvh) Welcome & Google Sign-In View
  if (step === 1) {
    return (
      <div 
        className="min-h-[100dvh] w-full overflow-y-auto bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col justify-between px-4 sm:px-6 select-none relative animate-fade-in"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
        }}
      >
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between">
          {/* Top Section: Branding & Segmented Language Toggle */}
          <div className="space-y-2 pt-1">
            <div className="text-center space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3" />
                <span>Davao Student Companion</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                SkwelaDabaw!
              </h1>
            </div>

            {/* Sleek Segmented Pill Language Toggle */}
            <div className="inline-flex w-full p-1 bg-[var(--nested-bg)] border border-[var(--nested-border)] rounded-2xl">
              {[
                { id: 'ceb' as AppLanguage, label: 'Bisaya', flag: '🦅' },
                { id: 'tl' as AppLanguage, label: 'Tagalog', flag: '🇵🇭' },
                { id: 'en' as AppLanguage, label: 'English', flag: '🌐' }
              ].map((l) => {
                const active = language === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id)}
                    className={`flex-1 py-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer pressable ${
                      active
                        ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs border border-[var(--card-border)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="text-xs">{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Middle Section: Compact Bayani Mascot Greeting + 4 Aesthetic Feature Cards */}
          <div className="my-auto py-2 space-y-2.5 select-none">
            {/* Mascot & Speech Header */}
            <div className="flex items-center justify-center gap-3">
              <div className="relative shrink-0">
                <EagleBuddy
                  mood="friendly"
                  width={48}
                  height={54}
                  showSpeech={false}
                  isAnimated={true}
                  isLoading={false}
                />
              </div>
              <div className="relative p-2 px-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xs max-w-[260px]">
                <p className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight">
                  {language === 'en'
                    ? 'Welcome! Ready for your Davao campus commute?'
                    : language === 'tl'
                    ? 'Maligayang pagdating! Handa na ba sa biyahe?'
                    : 'Maayong pag-abot! Andam na sa imong klase?'}
                </p>
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[var(--card-bg)] border-l border-b border-[var(--card-border)] rotate-45" />
              </div>
            </div>

            {/* 4 Feature Cards (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Card 1: Smart Timetable */}
              <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 uppercase tracking-wider">
                    Offline
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">Smart Timetable</div>
                  <div className="text-[9px] text-[var(--text-secondary)] leading-tight truncate">Class alarms &amp; countdowns</div>
                </div>
              </div>

              {/* Card 2: Davao PUJ & Bus */}
              <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <Bus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 uppercase tracking-wider">
                    Transit
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">Davao PUJ &amp; Bus</div>
                  <div className="text-[9px] text-[var(--text-secondary)] leading-tight truncate">Toril, Mintal, Buhangin fares</div>
                </div>
              </div>

              {/* Card 3: Eagle Companion */}
              <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                    Bayani AI
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">Eagle Companion</div>
                  <div className="text-[9px] text-[var(--text-secondary)] leading-tight truncate">Daily student commuter tips</div>
                </div>
              </div>

              {/* Card 4: Central 911 Shield */}
              <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex flex-col justify-between shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 uppercase tracking-wider">
                    Safety
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">Central 911 Shield</div>
                  <div className="text-[9px] text-[var(--text-secondary)] leading-tight truncate">1-tap Davao emergency hotline</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Compact Honor Pledge + Error Toast + Pinned Buttons */}
          <div className="space-y-2.5 pb-2">
            {googleAuthError && (
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs font-semibold flex items-center gap-2 text-left animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1 leading-tight">{googleAuthError}</span>
              </div>
            )}

            <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--card-bg)] border border-emerald-500/30 text-left">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    setGoogleAuthError(null);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 bg-transparent border-2 border-emerald-500/60 accent-emerald-500 shrink-0 cursor-pointer"
                />
                <span className="text-[11px] text-[var(--text-secondary)] leading-tight">
                  I certify I am an enrolled student &amp; pledge not to impersonate others. Agree to{' '}
                  <a href="https://skweladabaw.kurzyrio.site/terms.php" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold inline-flex items-center gap-0.5">
                    Terms <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  &amp;{' '}
                  <a href="https://skweladabaw.kurzyrio.site/privacy.php" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold inline-flex items-center gap-0.5">
                    Privacy <ExternalLink className="w-2.5 h-2.5" />
                  </a>.
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn || !agreedToTerms}
                className="btn-primary-ios relative group/btn w-full py-3 px-4 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed pressable"
              >
                <IconBrandGoogle className="w-4 h-4 shrink-0" />
                <span>{isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google Account'}</span>
                <BottomGradient />
              </button>

              <button
                type="button"
                onClick={handleContinueAsGuest}
                disabled={!agreedToTerms}
                className="w-full py-2.5 px-4 rounded-2xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed pressable"
              >
                <span>Continue as Guest: Offline Access</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Guest-to-Account Choice Modal */}
        {pendingGoogleSession && (accountLinkMode === 'new-account' || pendingCloudUser) && (
          <AccountLinkSyncModal
            isOpen={isAccountLinkSyncModalOpen}
            onClose={handleCancelGuestLinkModal}
            mode={accountLinkMode}
            cloudUser={pendingCloudUser}
            googleSession={pendingGoogleSession}
            guestSession={pendingGuestSessionSnapshot || prevGuestSessionRef.current || getSavedSession()}
            localScheduleCount={pendingGuestCounts.schedules}
            guestDataCounts={pendingGuestCounts}
            onRestoreCloud={handleRestoreCloudFromGuest}
            onSyncGuest={accountLinkMode === 'new-account' ? handleKeepGuestNewAccount : handleSyncGuestExistingAccount}
            onStartFresh={handleStartFreshFromGuest}
            isProcessing={isResolvingGuestLink}
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
  }

  // MULTI-STEP ONBOARDING VIEW (Steps 2 - 8)
  return (
    <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col justify-start select-none relative overflow-x-hidden animate-fade-in pb-12">
      {/* Top Fixed Header Bar */}
      <header className="sticky top-0 z-30 w-full pt-[env(safe-area-inset-top)] bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--card-border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[var(--nested-bg)] text-[var(--text-primary)] border border-[var(--nested-border)]">
              SkwelaDabaw
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Step {step} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-[var(--nested-bg)] h-1.5 overflow-hidden">
          <div 
            className="bg-[var(--btn-primary-bg)] h-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 space-y-5 relative z-10">
        <TalkingMascot
          mood={mascotProps.mood}
          message={mascotProps.message}
          subMessage={mascotProps.subMessage}
          enableProactiveHelper={false}
        />

        {/* Animated Step Container with Smooth Sliding Transitions */}
        <div 
          key={step} 
          className={`w-full ${slideDirection === 'right' ? 'animate-step-next' : 'animate-step-prev'}`}
        >
        {/* STEP 2: Name, Username, Age with Privacy Safety Shield */}
        {step === 2 && (
          <div className="max-w-md w-full mx-auto p-6 sm:p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-5 animate-fade-in shadow-sm">
            {/* Student Privacy Warning Shield */}
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-blue-300">
                  Student Alias and Privacy Shield
                </p>
                <p className="text-[11px] text-blue-200/80 leading-relaxed font-medium">
                  Do <strong>NOT</strong> use your real full legal name, student ID number, or phone number. Choose a student alias or nickname to keep yourself safe online.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Display Name or Student Alias</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Maya, DabawStudent, or CodeEagle"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-semibold placeholder:text-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--btn-primary-bg)] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                  <span>Unique Username</span>
                </span>
                {usernameStatus === 'checking' && (
                  <span className="text-[11px] text-[var(--text-primary)] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold text-xs">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="juandelacruz"
                  className="w-full pl-8 pr-10 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-semibold focus:outline-hidden focus:border-[var(--btn-primary-bg)]"
                />
                {usernameStatus === 'available' && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#30D158]">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>
              {usernameMessage && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {usernameMessage}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                  <span>Student Age • Minimum 13</span>
                </span>
                {age >= 13 ? (
                  <span className="text-[11px] text-[#30D158]">Eligible</span>
                ) : (
                  <span className="text-[11px] text-[#FF453A]">Must be 13 or older</span>
                )}
              </label>
              <input
                type="number"
                min={13}
                max={100}
                required
                value={age}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAge(val);
                  if (val < 13) {
                    setAgeError('You must be at least 13 years old to use SkwelaDabaw.');
                  } else {
                    setAgeError(null);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-semibold focus:outline-hidden focus:border-[var(--btn-primary-bg)]"
              />
              {ageError && (
                <p className="text-xs text-[#FF453A] font-semibold">{ageError}</p>
              )}
            </div>

            {/* Gender Identity Selection (Anti-Impersonation Safeguard) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Gender Identity</span>
                </label>
                <span className="text-[10px] text-blue-500 dark:text-blue-400 font-bold tracking-tight">
                  Anti-Impersonation
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Male', label: 'Male' },
                  { id: 'Female', label: 'Female' },
                  { id: 'Non-binary', label: 'Non-binary' },
                  { id: 'Prefer not to say', label: 'Prefer not to say' }
                ].map((opt) => {
                  const isSelected = gender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGender(opt.id)}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer pressable ${
                        isSelected
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--card-border)] shadow-xs'
                          : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-tight pt-0.5">
                Helps verify your student identity and prevents impersonation across campus lounges.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (age < 13) return;
                  goToStep(3);
                }}
                disabled={usernameStatus === 'taken' || usernameStatus === 'checking' || age < 13}
                className="px-6 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Role, Campus, Course & Year Level */}
        {step === 3 && (
          <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Primary Role</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all ${
                    role === 'student'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--btn-primary-bg)]'
                      : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all ${
                    role === 'teacher'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--btn-primary-bg)]'
                      : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Teacher / Faculty
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>Davao University / Campus</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCampusPickerOpen(true)}
                className="w-full p-3 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] text-left flex items-center justify-between text-[var(--text-primary)]"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-xs block truncate">{selectedCampus ? selectedCampus.name : 'Select Your Campus'}</span>
                  <span className="text-[11px] text-[var(--text-secondary)] block truncate">{selectedCampus ? selectedCampus.address : 'Tap here to choose your college or university'}</span>
                </div>
                <span className="text-xs text-[var(--text-primary)] font-semibold shrink-0">{selectedCampus ? 'Change' : 'Choose'}</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                <span>Degree Program / Course</span>
              </label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. BS Computer Science, BS Nursing, AB Comm"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] text-xs font-semibold placeholder:text-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--btn-primary-bg)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Year Level</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  'Freshman',
                  'Sophomore',
                  'Junior',
                  'Senior',
                  '5th Year / Irreg',
                  'Post-Grad'
                ].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setYearLevel(yr)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer pressable ${
                      yearLevel === yr
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--card-border)] shadow-xs'
                        : 'bg-[var(--nested-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goToStep(4)}
                className="px-6 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Schedule Import */}
        {step === 4 && (
          <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-left space-y-2 pressable"
              >
                <Camera className="w-5 h-5 text-[var(--text-primary)]" />
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">Scan Study Load / QR</h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">Snap photo or scan classmate QR code.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-left space-y-2 pressable"
              >
                <FileJson className="w-5 h-5 text-[var(--text-primary)]" />
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">Import JSON Backup</h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">Load timetable from backup file.</p>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goToStep(5)}
                className="px-6 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
              >
                Skip for Now
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Notification Timing & Ongoing Next Class */}
        {step === 5 && (
          <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>Class Reminder Timing</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: 15, label: '15m' },
                  { val: 30, label: '30m' },
                  { val: 60, label: '1h' }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      setIsCustomReminder(false);
                      setReminderTiming(item.val);
                    }}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      !isCustomReminder && reminderTiming === item.val
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--btn-primary-bg)]'
                        : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomReminder(true);
                    if ([15, 30, 60].includes(reminderTiming)) {
                      setReminderTiming(10);
                    }
                  }}
                  className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isCustomReminder
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--btn-primary-bg)]'
                      : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomReminder && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--nested-bg)] border border-[var(--nested-border)] mt-2 animate-fade-in">
                  <span className="text-xs text-[var(--text-secondary)] shrink-0">Notify me</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={reminderTiming || 10}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(180, Number(e.target.value) || 1));
                      setReminderTiming(val);
                    }}
                    className="w-20 px-2 py-1 text-xs font-bold text-center rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] focus:outline-hidden focus:border-[var(--btn-primary-bg)]"
                  />
                  <span className="text-xs text-[var(--text-secondary)]">minutes before class</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>Default Schedule View</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreferredLayout('today')}
                  className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all ${
                    preferredLayout === 'today'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--btn-primary-bg)]'
                      : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ListOrdered className="w-4 h-4 mb-1" />
                  <div>Daily Agenda</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredLayout('grid')}
                  className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all ${
                    preferredLayout === 'grid'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--btn-primary-bg)]'
                      : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 mb-1" />
                  <div>Weekly Grid</div>
                </button>
              </div>
            </div>

            {/* Persistent Next Class Notification Card */}
            <div className="pt-3 border-t border-[var(--card-border)] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                    <span>Persistent Next Class Card</span>
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Show an ongoing status bar card with your next class and room.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={persistentNextClass}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setPersistentNextClass(val);
                      localStorage.setItem('skweladabaw_persistent_next_class', val ? 'true' : 'false');
                      window.dispatchEvent(new Event('skweladabaw_persistent_notif_changed'));
                      if (val) {
                        try {
                          await refreshUnremovableClassNotification(undefined, persistentTheme);
                          await syncIngatNotificationsForLiveToggle(true);
                        } catch (_) {}
                      } else {
                        await cancelPersistentNextClassNotification();
                        await syncIngatNotificationsForLiveToggle(false).catch(() => {});
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--nested-border)] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--btn-primary-bg)]"></div>
                </label>
              </div>

              {persistentNextClass && (
                <div className="space-y-2.5 pt-2 animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {Object.values(NOTIFICATION_THEMES).map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={async () => {
                          setPersistentTheme(th.id);
                          localStorage.setItem('skweladabaw_persistent_theme', th.id);
                          if (persistentNextClass) {
                            try {
                              await refreshUnremovableClassNotification(undefined, th.id);
                            } catch (_) {}
                          }
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          persistentTheme === th.id
                            ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold'
                            : 'border-[var(--nested-border)] bg-[var(--nested-bg)] text-[var(--text-primary)] hover:border-[var(--card-hover-border)]'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: th.accentHex }}
                        />
                        <span className="text-[11px] truncate">{th.name}</span>
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const activeTheme = NOTIFICATION_THEMES[persistentTheme] || NOTIFICATION_THEMES.midnight;
                    return (
                      <div
                        className="p-3 rounded-xl border transition-all text-left"
                        style={{
                          backgroundColor: activeTheme.bgHex,
                          borderColor: activeTheme.borderHex,
                          color: activeTheme.textHex
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: `${activeTheme.accentHex}25`,
                              color: activeTheme.accentHex,
                              border: `1px solid ${activeTheme.accentHex}50`
                            }}
                          >
                            Next Class
                          </span>
                          <span className="text-[10px] opacity-60">Status Shade</span>
                        </div>
                        <div className="mt-1 text-xs font-bold truncate">
                          IT 311 • Systems Integration
                        </div>
                        <div className="text-[11px] opacity-75">
                          09:00 AM • Lab 402 Finster Hall
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => goToStep(4)}
                className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('skweladabaw_reminder_timing', String(reminderTiming));
                  localStorage.setItem('skweladabaw_default_view', preferredLayout === 'grid' ? 'weekly' : 'today');
                  localStorage.setItem('skweladabaw_persistent_next_class', persistentNextClass ? 'true' : 'false');
                  localStorage.setItem('skweladabaw_persistent_theme', persistentTheme);
                  window.dispatchEvent(new Event('skweladabaw_persistent_notif_changed'));
                  if (persistentNextClass) {
                    refreshUnremovableClassNotification(undefined, persistentTheme).catch(() => {});
                    syncIngatNotificationsForLiveToggle(true).catch(() => {});
                  } else {
                    syncIngatNotificationsForLiveToggle(false).catch(() => {});
                  }
                  goToStep(6);
                }}
                className="px-6 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Sound & Mascot Language */}
        {step === 6 && (
          <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Bayani Dialogue Language</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bisaya' as BayaniLanguage, label: 'Bisaya' },
                  { id: 'tagalog' as BayaniLanguage, label: 'Tagalog' },
                  { id: 'english' as BayaniLanguage, label: 'English' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.id)}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none pressable flex items-center justify-center ${
                      bayaniLanguage === lang.id
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--btn-primary-bg)] shadow-xs'
                        : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSoundAndVibration}
              className="w-full min-h-[44px] py-3 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-2 pressable cursor-pointer select-none"
            >
              <Volume2 className="w-4 h-4 text-[var(--text-primary)]" />
              <span>{isTestingSound ? 'Testing Audio...' : 'Test Audio Chime'}</span>
            </button>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => goToStep(5)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] pressable cursor-pointer select-none flex items-center justify-center"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goToStep(7)}
                className="min-h-[44px] px-6 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable cursor-pointer select-none flex items-center justify-center"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: Baon Budget */}
        {step === 7 && (
          <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                <span>Allowance Period</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setBaonFrequency(item.id as any);
                      if (item.id === 'weekly' && baonAmount < 500) {
                        setBaonAmount(750);
                        setBaonInput('750');
                      } else if (item.id === 'monthly' && baonAmount < 1500) {
                        setBaonAmount(3000);
                        setBaonInput('3000');
                      } else if (item.id === 'daily' && baonAmount > 400) {
                        setBaonAmount(150);
                        setBaonInput('150');
                      }
                    }}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      baonFrequency === item.id
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold border-[var(--btn-primary-bg)]'
                        : 'bg-[var(--nested-bg)] border-[var(--nested-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Target Amount (PHP ₱)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--text-secondary)] text-sm">₱</span>
                <input
                  type="number"
                  min={20}
                  step={10}
                  placeholder="150"
                  value={baonInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setBaonInput(raw);
                    if (raw.trim() !== '') {
                      const num = Number(raw);
                      if (!isNaN(num) && num >= 0) {
                        setBaonAmount(num);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (baonInput.trim() === '' || Number(baonInput) <= 0) {
                      const fallback = baonFrequency === 'monthly' ? 3000 : (baonFrequency === 'weekly' ? 750 : 150);
                      setBaonAmount(fallback);
                      setBaonInput(String(fallback));
                    } else {
                      setBaonInput(String(baonAmount));
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--input-text)] font-bold text-sm focus:outline-hidden focus:border-[var(--btn-primary-bg)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => goToStep(6)}
                className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goToStep(8)}
                className="px-6 py-2.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm pressable"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 8: Central 911 Safety Beacon */}
        {step === 8 && (
          <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-4 animate-fade-in text-center">
            <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-red-500/40 text-left space-y-1.5">
              <h4 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Davao Central 911 Distress Beacon</span>
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                SkwelaDabaw includes a 1-tap beacon to transmit emergency coordinates to Davao Central 911 hotlines.
              </p>
            </div>

            {/* Anonymous Diagnostics & Stability Consent Card */}
            <div className="p-4 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-left space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-bold text-xs text-[var(--text-primary)]">
                    Anonymous Stability Reports
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={telemetryConsent}
                  onChange={(e) => setTelemetryConsent(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                />
              </div>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                No user personal information or data is used to improve the app.
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                Transmitted over Wi-Fi only (no mobile data used). Helps the developer catch bugs and crashes.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleFinishWithGps}
                disabled={isFinishing}
                className="w-full py-3.5 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs shadow-sm flex items-center justify-center gap-2 pressable disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFinishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                <span>{isFinishing ? 'Launching Dashboard...' : 'Enable Location & Finish'}</span>
              </button>

              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={isFinishing}
                className="w-full py-3 rounded-full bg-[var(--nested-bg)] border border-[var(--nested-border)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-2 pressable disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFinishing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isFinishing ? 'Launching Dashboard...' : 'Skip Location & Launch App'}</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </main>

      <CampusPickerModal
        isOpen={isCampusPickerOpen}
        onClose={() => setIsCampusPickerOpen(false)}
        selectedCampusId={campusId}
        onSelectCampus={(campId) => setCampusId(campId)}
      />

      <ScheduleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => goToStep(5)}
      />

      {/* Global Processing Spinner Overlay */}
      <ProcessingOverlay
        isOpen={isLoggingIn}
        message="Authenticating • Please wait"
        submessage="Connecting securely to SkwelaDabaw cloud"
      />
    </div>
  );
};
