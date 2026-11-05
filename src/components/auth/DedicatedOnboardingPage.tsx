import React, { useState, useEffect } from 'react';
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
import { EagleBuddy } from '../common/EagleBuddy';
import { CachedAvatar } from '../common/CachedAvatar';
import { DAVAO_CAMPUSES } from '../../data/davaoCampuses';
import { 
  StudentAuthSession, 
  signInWithGoogle, 
  saveSession, 
  getSavedSession, 
  setOnboardingCompleted
} from '../../services/authService';
import { checkExistingUser, checkExistingUserDetailed, saveLocalUserRecord, syncUserSchedules, saveUserProfile, checkUsernameAvailable } from '../../services/userService';
import { restoreUserData, syncLocalDataToCloud } from '../../services/cloudSyncService';
import { 
  requestNotificationPermission, 
  sendTestNotification, 
  NOTIFICATION_THEMES,
  refreshUnremovableClassNotification,
  cancelPersistentNextClassNotification
} from '../../services/notificationService';
import { CampusPickerModal } from '../common/CampusPickerModal';
import { ScheduleImportModal } from '../schedule/ScheduleImportModal';
import { ProcessingOverlay } from '../common/ProcessingOverlay';
import { TalkingMascot, MascotMood } from '../common/TalkingMascot';
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
}

export const DedicatedOnboardingPage: React.FC<DedicatedOnboardingPageProps> = ({ 
  onComplete,
  currentTheme,
  onChangeTheme
}) => {
  const [step, setStep] = useState<number>(1);
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

  // Form State
  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [campusId, setCampusId] = useState<string>(() => {
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
  const [isLoggedInWithGoogle, setIsLoggedInWithGoogle] = useState<boolean>(false);
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userUid, setUserUid] = useState<string>('');

  // Terms of Service agreement
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

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

  // STEP 1: Google Login or Guest
  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      setGoogleAuthError('Please agree to the Terms of Service before signing in.');
      return;
    }

    setIsLoggingIn(true);
    setGoogleAuthError(null);
    try {
      const session = await signInWithGoogle(campusId);
      if (session) {
        // Deep account check with strict 4-state discrimination
        const checkResult = await checkExistingUserDetailed(session.uid || '', session.email || '');

        // Strict Returning User Validation:
        // A user only skips onboarding if they have a real custom username (not student_xxx),
        // confirmed display name, valid campus, and isSetupComplete === true.
        const existing = checkResult.user;
        const rawUsername = existing?.username ? String(existing.username).trim() : '';
        const isAutoGenerated = /^student_[a-f0-9]{6,16}$/i.test(rawUsername);
        const isRealReturningUser = Boolean(
          checkResult.state === 'PROFILE_COMPLETE' &&
          existing &&
          rawUsername.length >= 3 &&
          !isAutoGenerated &&
          existing.displayName &&
          String(existing.displayName).trim().length > 0 &&
          existing.isSetupComplete === true
        );

        if (isRealReturningUser && existing) {
          // Returning student with verified profile: Hydrate local device storage & finish immediately!
          const restoredSession: StudentAuthSession = {
            isLoggedIn: true,
            uid: existing.uid,
            name: existing.displayName || session.name,
            username: existing.username,
            email: existing.email || session.email,
            avatar: existing.avatar || session.avatar,
            campusId: existing.campusId || campusId,
            studentId: '',
            course: existing.course || 'Enrolled Student',
            yearLevel: existing.yearLevel || 'College Student',
            role: existing.role || 'student',
            age: existing.age,
            gender: existing.gender
          };

          saveSession(restoredSession);
          saveLocalUserRecord(existing);
          setOnboardingCompleted(true);
          sessionStorage.setItem('skwela_session_checked', 'true');

          restoreUserData(restoredSession.uid).catch(() => {});
          syncUserSchedules(existing.uid).catch(() => {});

          onComplete(restoredSession);
          return;
        }

        if (checkResult.state === 'NETWORK_OR_DB_ERROR') {
          // Do NOT treat as new account! Show connection error with retry.
          setGoogleAuthError('Unable to verify account with server. Please check your connection and tap Sign In again.');
          return;
        }

        // NEW ACCOUNT or INCOMPLETE PROFILE: Always proceed to Step 2 onboarding!
        setIsLoggedInWithGoogle(true);
        setDisplayName(existing?.displayName || session.name);
        setUserEmail(session.email);
        if (session.avatar) setUserAvatar(session.avatar);
        setUserUid(session.uid || `user-${Date.now()}`);

        if (!username) {
          const suggested = (!isAutoGenerated && rawUsername) || (session.email 
            ? session.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')
            : session.name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''));
          setUsername(suggested || 'student_user');
        }

        goToStep(2);
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      const msg = err?.message || 'Google Sign-In was cancelled or could not connect.';
      setGoogleAuthError(msg.includes('network') ? 'Network connection error. Check internet.' : 'Sign-in was cancelled or dismissed.');
    } finally {
      setIsLoggingIn(false);
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

    // Asynchronous background persistence (never blocks the UI)
    setTimeout(async () => {
      try {
        await requestNotificationPermission();
      } catch {}
      try {
        await saveUserProfile(finalSession);
        if (finalSession.isLoggedIn) {
          await syncLocalDataToCloud(finalSession);
        }
      } catch {}
    }, 150);
  };

  const mascotProps = getMascotProps();

  // STEP 1: Standalone Clean, Non-Scrollable (100dvh) Welcome & Google Sign-In View
  if (step === 1) {
    return (
      <div 
        className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[var(--canvas-bg)] text-[var(--text-primary)] flex flex-col justify-between px-4 sm:px-6 select-none relative animate-fade-in"
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

        {/* Global Processing Spinner Overlay */}

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
      <header className="sticky top-0 z-30 w-full bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--card-border)]">
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
                      if (val) {
                        try {
                          await refreshUnremovableClassNotification(undefined, persistentTheme);
                        } catch (_) {}
                      } else {
                        await cancelPersistentNextClassNotification();
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
                  if (persistentNextClass) {
                    refreshUnremovableClassNotification(undefined, persistentTheme).catch(() => {});
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
