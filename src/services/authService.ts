import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
  signInAnonymously,
  EmailAuthProvider,
  signInWithEmailAndPassword,
  linkWithCredential,
  updatePassword,
  RecaptchaVerifier,
  signInWithPhoneNumber as webSignInWithPhoneNumber
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { NativeGoogleAuth, NativeGoogleSignInResult } from './nativeGoogleAuth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';
import { switchAccountSchedules, snapshotAccountBackup, clearAccountBackup } from './userService';
import { hasPendingLocalSync, syncLocalDataToCloud } from './cloudSyncService';
import { imageCacheService } from './imageCacheService';

let webConfirmationResult: any = null;
let nativePhoneCodeListener: any = null;
let activeAuthTransactionCount = 0;
let isDeferredGuestChoicePending = false;

export const setDeferredGuestChoicePending = (pending: boolean): void => {
  isDeferredGuestChoicePending = pending;
};

export const ensureFirebaseAuth = async (): Promise<string | null> => {
  if (!isFirebaseConfigured || !auth) return null;
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (err) {
    console.warn('Anonymous auth note:', err);
    return null;
  }
};

export interface StudentAuthSession {
  isLoggedIn: boolean;
  uid?: string;
  name: string;
  username?: string;
  email: string;
  phoneNumber?: string;
  avatar: string;
  campusId: string;
  studentId?: string;
  course?: string;
  yearLevel?: string;
  role?: 'student' | 'teacher' | 'admin';
  age?: number;
  gender?: string;
  lastUsernameChange?: string;
}

const STORAGE_KEY = 'skweladabaw_user_session';
const ONBOARDING_KEY = 'skweladabaw_onboarding_completed';

export const DEFAULT_GUEST_SESSION: StudentAuthSession = {
  isLoggedIn: false,
  name: 'Student',
  email: '',
  avatar: '',
  campusId: '',
  studentId: '',
  course: 'Enrolled Student',
  yearLevel: 'Freshman',
  role: 'student'
};

export const getSavedSession = (): StudentAuthSession => {
  try {
    // If running on web and server injected verified cookie session
    if (typeof window !== 'undefined' && (window as any).__SKWELA_INITIAL_USER__) {
      const serverUser = (window as any).__SKWELA_INITIAL_USER__;
      if (serverUser && (serverUser.user_id || serverUser.uid)) {
        const uid = serverUser.user_id || serverUser.uid;
        const currentLocal = localStorage.getItem(STORAGE_KEY);
        const parsedLocal = currentLocal ? JSON.parse(currentLocal) : null;
        
        // Only override if local session is guest or different user
        if (!parsedLocal || !parsedLocal.isLoggedIn || parsedLocal.uid !== uid) {
          const session: StudentAuthSession = {
            isLoggedIn: true,
            uid: uid,
            name: serverUser.display_name || serverUser.username || 'Student',
            username: serverUser.username || '',
            email: serverUser.email || '',
            avatar: serverUser.avatar_url || '',
            campusId: serverUser.campus_id || '',
            course: serverUser.course || 'Enrolled Student',
            role: serverUser.role || 'student'
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
          localStorage.setItem(ONBOARDING_KEY, 'true');
          return session;
        }
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_GUEST_SESSION, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Failed to load saved session:', err);
  }
  return DEFAULT_GUEST_SESSION;
};

export const saveSession = (session: StudentAuthSession): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    // Pre-cache user avatar locally in persistent storage
    if (session.avatar && session.avatar.startsWith('http')) {
      imageCacheService.getImageUrl(session.avatar).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save session:', err);
  }
};

export const hasCompletedOnboarding = (): boolean => {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
};

export const setOnboardingCompleted = (completed = true): void => {
  localStorage.setItem(ONBOARDING_KEY, completed ? 'true' : 'false');
};

const AUTH_TIMEOUT_MS = 20000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

const GOOGLE_WEB_CLIENT_ID = '981655805429-f16f8mrme8snjr02mnapmj27ln3ofb2a.apps.googleusercontent.com';

async function preparePreviousSessionBeforeSwitch(prevSession: StudentAuthSession): Promise<void> {
  if (!prevSession?.isLoggedIn || !prevSession.uid) return;
  try {
    const hasPending = await hasPendingLocalSync(prevSession.uid);
    if (!hasPending) return;

    if (typeof navigator === 'undefined' || navigator.onLine) {
      const pushed = await syncLocalDataToCloud(prevSession);
      if (pushed) {
        clearAccountBackup(prevSession.uid);
        return;
      }
    }
    await snapshotAccountBackup(prevSession.uid, true);
  } catch (err) {
    console.warn('Pre-switch backup fallback note:', err);
    await snapshotAccountBackup(prevSession.uid, true).catch(() => {});
  }
}

export const rollbackFailedAuth = async (prevSession?: StudentAuthSession): Promise<StudentAuthSession> => {
  const restoredSession = prevSession ? { ...prevSession } : { ...DEFAULT_GUEST_SESSION };
  const wasAlreadyLoggedIn = Boolean(restoredSession.isLoggedIn && restoredSession.uid);
  const wasOnboardingAlreadyDone = hasCompletedOnboarding();
  isDeferredGuestChoicePending = false;
  activeAuthTransactionCount++;
  try {
    await withTimeout(
      Promise.allSettled([
        Capacitor.isNativePlatform()
          ? NativeGoogleAuth.signOut({ webClientId: GOOGLE_WEB_CLIENT_ID }).catch(() => {})
          : Promise.resolve(),
        Capacitor.isNativePlatform()
          ? FirebaseAuthentication.signOut().catch(() => {})
          : Promise.resolve(),
        isFirebaseConfigured && auth ? signOut(auth).catch(() => {}) : Promise.resolve()
      ]),
      1000,
      'Rollback timeout'
    ).catch(() => {});

    try { localStorage.removeItem('skweladabaw_auth_token'); } catch (_) {}
    if (!wasAlreadyLoggedIn) {
      localStorage.removeItem('skwela_password_set');
      sessionStorage.removeItem('skwela_session_checked');
      if (!wasOnboardingAlreadyDone) {
        setOnboardingCompleted(false);
      }
    }
    saveSession(restoredSession);
    return restoredSession;
  } finally {
    activeAuthTransactionCount = Math.max(0, activeAuthTransactionCount - 1);
  }
};

const performGoogleSignIn = async (
  currentCampusId: string,
  options?: { deferGuestMigration?: boolean }
): Promise<StudentAuthSession | null> => {
  const prevSession = getSavedSession();
  const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;

  // Flush or snapshot any existing logged-in account while its Firebase token is still active
  await preparePreviousSessionBeforeSwitch(prevSession);

  // 1. Native Android Google Sign-In (Interactive picker has NO artificial timeout; post-picker network steps do)
  if (Capacitor.isNativePlatform()) {
    let nativeResult: NativeGoogleSignInResult | null = null;

    try {
      nativeResult = await NativeGoogleAuth.signIn({ webClientId: GOOGLE_WEB_CLIENT_ID });
    } catch (nativeErr: any) {
      const errMsg = String(nativeErr?.message || nativeErr || '');
      const lowerErrMsg = errMsg.toLowerCase();
      const isCancellation =
        lowerErrMsg.includes('cancelled') ||
        lowerErrMsg.includes('canceled') ||
        lowerErrMsg.includes('dismissed');

      if (isCancellation) {
        console.info('Google Sign-In was cancelled by user.');
        return null;
      }

      console.warn('NativeGoogleAuth bridge note:', nativeErr);

      // Avoid retrying Play Services GoogleSignIn when the web OAuth fallback already reported a clear failure
      const isWebOAuthFailure =
        lowerErrMsg.includes('via browser') ||
        lowerErrMsg.includes('browser sign-in') ||
        lowerErrMsg.includes('compatible web browser') ||
        lowerErrMsg.includes('sign-in window is already open');

      if (isWebOAuthFailure) {
        throw nativeErr;
      }

      // Secondary fallback to @capacitor-firebase/authentication if native bridge encountered an unexpected platform issue
      try {
        const fallbackRes = await FirebaseAuthentication.signInWithGoogle();
        const fallbackIdToken = fallbackRes?.credential?.idToken || '';
        const fallbackAccessToken = fallbackRes?.credential?.accessToken || undefined;
        const fallbackUid = fallbackRes?.user?.uid || undefined;

        if (fallbackIdToken || fallbackAccessToken || fallbackUid) {
          nativeResult = {
            idToken: fallbackIdToken,
            accessToken: fallbackAccessToken,
            uid: fallbackUid,
            email: fallbackRes.user?.email || undefined,
            displayName: fallbackRes.user?.displayName || undefined,
            photoUrl: fallbackRes.user?.photoUrl || undefined
          };
        } else {
          throw nativeErr;
        }
      } catch (fbErr: any) {
        console.error('All native Google sign-in attempts failed:', fbErr);
        throw nativeErr;
      }
    }

    if (!nativeResult || (!nativeResult.idToken && !nativeResult.accessToken && !nativeResult.uid)) {
      throw new Error('Google Sign-In did not return valid account credentials. Please try again.');
    }

    if (!auth) {
      throw new Error('Authentication service is not configured on this build.');
    }

    // Shared post-login completion handler for GMS native Sign-In and non-GMS Firebase web OAuth
    const finalizeNativeGoogleSession = async (identity: {
      uid: string;
      email: string;
      displayName: string;
      photoUrl: string;
      firebaseIdToken?: string;
    }): Promise<StudentAuthSession> => {
      const isSameOrGuest = !prevUid || prevUid === identity.uid;
      const deferGuest = Boolean(!prevUid && options?.deferGuestMigration);
      const inheritPrevProfile = isSameOrGuest && !deferGuest;

      if (deferGuest) {
        isDeferredGuestChoicePending = true;
      }

      const resolvedNativeEmail =
        identity.email ||
        (inheritPrevProfile ? prevSession.email : '') ||
        '';

      const session: StudentAuthSession = {
        isLoggedIn: true,
        uid: identity.uid,
        name: identity.displayName || (inheritPrevProfile ? prevSession.name : '') || 'Student',
        email: resolvedNativeEmail,
        avatar: identity.photoUrl || (inheritPrevProfile ? prevSession.avatar : '') || '',
        campusId: deferGuest ? '' : (currentCampusId || (isSameOrGuest ? prevSession.campusId : '') || ''),
        studentId: inheritPrevProfile ? (prevSession.studentId || '') : '',
        course: inheritPrevProfile ? (prevSession.course || 'Enrolled Student') : 'Enrolled Student',
        yearLevel: inheritPrevProfile ? (prevSession.yearLevel || 'College Student') : 'Freshman',
        role: inheritPrevProfile ? (prevSession.role || 'student') : 'student',
        age: inheritPrevProfile ? prevSession.age : undefined,
        gender: inheritPrevProfile ? prevSession.gender : undefined
      };
      try { localStorage.removeItem('skweladabaw_auth_token'); } catch (_) {}
      saveSession(session);

      // Always use canonical Firebase ID token (never Google GIS sub) so backend never relinks/duplicates rows
      const switchRes = await switchAccountSchedules(
        prevUid,
        identity.uid,
        prevSession,
        identity.firebaseIdToken,
        options
      );
      if (!switchRes.success) {
        await rollbackFailedAuth(prevSession);
        throw new Error(switchRes.message || 'Please connect to the internet to back up unsynced data before switching accounts.');
      }
      return session;
    };

    activeAuthTransactionCount++;
    try {
      return await withTimeout(
        (async () => {
          let resolvedUid = nativeResult!.uid || '';
          let resolvedEmail = nativeResult!.email || '';
          let resolvedDisplayName = nativeResult!.displayName || '';
          let resolvedPhotoUrl = nativeResult!.photoUrl || '';
          let firebaseIdToken: string | undefined = nativeResult!.firebaseIdToken || undefined;

          if (nativeResult!.idToken || nativeResult!.accessToken) {
            const credential = GoogleAuthProvider.credential(
              nativeResult!.idToken || null,
              nativeResult!.accessToken || null
            );
            try {
              const userCred = await signInWithCredential(auth!, credential);
              const firebaseUser = userCred.user;
              resolvedUid = firebaseUser.uid;
              resolvedEmail =
                firebaseUser.email ||
                firebaseUser.providerData?.find((p) => Boolean(p?.email))?.email ||
                resolvedEmail;
              resolvedDisplayName = firebaseUser.displayName || resolvedDisplayName;
              resolvedPhotoUrl = firebaseUser.photoURL || resolvedPhotoUrl;
              firebaseIdToken = (await firebaseUser.getIdToken(false).catch(() => undefined)) || firebaseIdToken;
            } catch (credErr) {
              // If native Firebase Auth already completed via web OAuth with a verified UID & Firebase ID token,
              // keep Web JS SDK clean and continue through the exact same native Firebase session pipeline.
              if (nativeResult!.authFlow === 'firebase_web_oauth' && resolvedUid) {
                console.warn('Web Firebase JS credential sync fallback to native Firebase session:', credErr);
                if (auth!.currentUser && auth!.currentUser.uid !== resolvedUid) {
                  await signOut(auth!).catch(() => {});
                }
                if (!firebaseIdToken) {
                  firebaseIdToken = await FirebaseAuthentication.getIdToken()
                    .then((res) => res?.token || undefined)
                    .catch(() => undefined);
                }
              } else {
                throw credErr;
              }
            }
          } else if (resolvedUid) {
            // Native Firebase web OAuth authenticated FirebaseUser directly without exposing a raw OAuth token.
            // Clear any mismatched Web JS SDK user so cloudSyncService uses native FirebaseAuthentication.getIdToken().
            if (auth!.currentUser && auth!.currentUser.uid !== resolvedUid) {
              await signOut(auth!).catch(() => {});
            }
            if (!firebaseIdToken) {
              firebaseIdToken = await FirebaseAuthentication.getIdToken()
                .then((res) => res?.token || undefined)
                .catch(() => undefined);
            }
          }

          if (!resolvedUid) {
            throw new Error('Google Sign-In completed, but your account ID could not be resolved. Please try again.');
          }
          if (!firebaseIdToken) {
            firebaseIdToken = await FirebaseAuthentication.getIdToken({ forceRefresh: true })
              .then((res) => res?.token || undefined)
              .catch(() => undefined);
          }

          return await finalizeNativeGoogleSession({
            uid: resolvedUid,
            email: resolvedEmail,
            displayName: resolvedDisplayName,
            photoUrl: resolvedPhotoUrl,
            firebaseIdToken
          });
        })(),
        AUTH_TIMEOUT_MS,
        'Authentication timeout • Network response took too long'
      );
    } catch (syncErr: any) {
      await rollbackFailedAuth(prevSession);
      throw syncErr;
    } finally {
      activeAuthTransactionCount = Math.max(0, activeAuthTransactionCount - 1);
    }
  }

  // 2. Web Browser ONLY (Desktop/Browser dev testing)
  if (isFirebaseConfigured && auth) {
    const deferGuest = Boolean(!prevUid && options?.deferGuestMigration);
    if (deferGuest) {
      isDeferredGuestChoicePending = true;
    }
    let result;
    try {
      result = await signInWithPopup(auth, googleProvider);
    } catch (popupErr) {
      if (deferGuest) {
        isDeferredGuestChoicePending = false;
      }
      throw popupErr;
    }
    const user = result.user;
    const isSameOrGuest = !prevUid || prevUid === user.uid;
    const inheritPrevProfile = isSameOrGuest && !deferGuest;

    activeAuthTransactionCount++;
    try {
      return await withTimeout(
        (async () => {
          const resolvedWebEmail =
            user.email ||
            user.providerData?.find((p) => Boolean(p?.email))?.email ||
            (inheritPrevProfile ? prevSession.email : '') ||
            '';

          const session: StudentAuthSession = {
            isLoggedIn: true,
            uid: user.uid,
            name: user.displayName || (inheritPrevProfile ? prevSession.name : '') || 'Student',
            email: resolvedWebEmail,
            avatar: user.photoURL || (inheritPrevProfile ? prevSession.avatar : '') || '',
            campusId: deferGuest ? '' : (currentCampusId || (isSameOrGuest ? prevSession.campusId : '') || ''),
            studentId: inheritPrevProfile ? (prevSession.studentId || '') : '',
            course: inheritPrevProfile ? (prevSession.course || 'Enrolled Student') : 'Enrolled Student',
            yearLevel: inheritPrevProfile ? (prevSession.yearLevel || 'College Student') : 'Freshman',
            role: inheritPrevProfile ? (prevSession.role || 'student') : 'student',
            age: inheritPrevProfile ? prevSession.age : undefined,
            gender: inheritPrevProfile ? prevSession.gender : undefined
          };
          try { localStorage.removeItem('skweladabaw_auth_token'); } catch (_) {}
          saveSession(session);
          const idToken = await user.getIdToken(false).catch(() => undefined);
          const switchRes = await switchAccountSchedules(
            prevUid,
            user.uid,
            prevSession,
            idToken,
            options
          );
          if (!switchRes.success) {
            await rollbackFailedAuth(prevSession);
            throw new Error(switchRes.message || 'Please connect to the internet to back up unsynced data before switching accounts.');
          }
          return session;
        })(),
        AUTH_TIMEOUT_MS,
        'Authentication timeout • Network response took too long'
      );
    } catch (syncErr: any) {
      await rollbackFailedAuth(prevSession);
      throw syncErr;
    } finally {
      activeAuthTransactionCount = Math.max(0, activeAuthTransactionCount - 1);
    }
  }

  return null;
};

export const signInWithGoogle = async (
  currentCampusId?: string,
  options?: { deferGuestMigration?: boolean }
): Promise<StudentAuthSession | null> => {
  const resolvedCampus = currentCampusId || getSavedSession().campusId || '';
  try {
    const session = await performGoogleSignIn(resolvedCampus, options);
    return session;
  } catch (err: any) {
    const isCancellation =
      err?.code === 'auth/popup-closed-by-user' ||
      err?.message?.includes('closed') ||
      err?.message?.includes('canceled') ||
      err?.message?.includes('cancelled') ||
      err?.message?.includes('dismissed');

    if (isCancellation) {
      return null;
    }

    console.warn('Google sign-in error:', err);
    throw err;
  }
};

const SMS_OTP_API_URL = 'https://skweladabaw.kurzyrio.site/api/sms_otp.php';

/**
 * Request SMS OTP Verification Code via SkwelaDabaw SMS API PH Gateway
 */
export const sendPhoneOtp = async (phoneNumber: string): Promise<{ verificationId: string }> => {
  let formatted = phoneNumber.trim().replace(/[\s-()]/g, '');
  if (formatted.startsWith('09')) {
    formatted = '+63' + formatted.substring(1);
  } else if (formatted.startsWith('9') && formatted.length === 10) {
    formatted = '+63' + formatted;
  } else if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }

  // Save pending phone for verification
  try {
    sessionStorage.setItem('pending_phone_number', formatted);
  } catch (_) {}

  // Dispatch SMS via SkwelaDabaw SMS API PH Gateway
  try {
    const response = await fetch(`${SMS_OTP_API_URL}?action=send_otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: formatted })
    });

    const data = await response.json();
    if (data.success && data.verificationId) {
      return { verificationId: data.verificationId };
    }

    if (data.error) {
      throw new Error(data.error);
    }
  } catch (backendErr: any) {
    console.warn('SMS API PH gateway notice:', backendErr);
    if (backendErr?.message && (backendErr.message.includes('Too many') || backendErr.message.includes('valid 11-digit'))) {
      throw backendErr;
    }
    if (backendErr?.message) {
      throw backendErr;
    }
  }

  throw new Error('Unable to send verification SMS. Please check your connection and try again.');
};

/**
 * Confirm 6-digit SMS OTP Code and finalize student session
 */
export const verifyPhoneOtpCode = async (
  verificationId: string,
  verificationCode: string,
  campusId?: string
): Promise<StudentAuthSession> => {
  const code = verificationCode.trim();
  const effectiveCampusId = campusId || getSavedSession().campusId || '';
  let pendingPhone = '';
  try {
    pendingPhone = sessionStorage.getItem('pending_phone_number') || '';
  } catch (_) {}

  // 1. Verify via SkwelaDabaw SMS API PH Gateway
  if (verificationId.startsWith('smsapiph_') || pendingPhone) {
    const response = await fetch(`${SMS_OTP_API_URL}?action=verify_otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: pendingPhone,
        code: code,
        campusId: effectiveCampusId
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Invalid verification code. Please try again.');
    }

    const session: StudentAuthSession = {
      isLoggedIn: true,
      uid: data.uid || ('phone_' + pendingPhone.replace(/[^0-9]/g, '')),
      name: data.name || 'Student',
      username: data.username || '',
      email: data.email || (pendingPhone.replace(/[^0-9]/g, '') + '@phone.skweladabaw.local'),
      phoneNumber: data.phoneNumber || pendingPhone,
      avatar: '',
      campusId: data.campusId || campusId,
      studentId: '',
      course: data.course || 'Enrolled Student',
      yearLevel: data.yearLevel || 'Freshman',
      role: data.role || 'student'
    };

    const prevSession = getSavedSession();
    const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;
    if (prevSession.isLoggedIn && prevSession.uid && prevSession.uid !== session.uid) {
      await preparePreviousSessionBeforeSwitch(prevSession);
    }

    if (data.token) {
      try {
        localStorage.setItem('skweladabaw_auth_token', data.token);
      } catch (_) {}
    }

    saveSession(session);
    const switchRes = await switchAccountSchedules(prevUid, session.uid, prevSession.isLoggedIn ? prevSession : undefined);
    if (!switchRes.success) {
      saveSession(prevSession);
      throw new Error(switchRes.message || 'Please connect to the internet to back up unsynced data before switching accounts.');
    }

    return session;
  }

  // 2. Fallback to Firebase Confirmation Result (if applicable)
  const prevSession = getSavedSession();
  const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;
  await preparePreviousSessionBeforeSwitch(prevSession);
  activeAuthTransactionCount++;
  try {
    let user: any = null;
    if (Capacitor.isNativePlatform()) {
      const res = await FirebaseAuthentication.confirmVerificationCode({
        verificationId,
        verificationCode: code
      });
      user = res.user;
    } else if (webConfirmationResult) {
      const res = await webConfirmationResult.confirm(code);
      user = res.user;
    }

    if (!user || !user.uid) {
      throw new Error('Phone verification succeeded but student account could not be resolved.');
    }

    const rawPhone = user.phoneNumber || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const syntheticEmail = cleanPhone ? `${cleanPhone}@phone.skweladabaw.local` : '';

    const session: StudentAuthSession = {
      isLoggedIn: true,
      uid: user.uid,
      name: user.displayName || 'Student',
      email: user.email || syntheticEmail,
      phoneNumber: rawPhone,
      avatar: user.photoUrl || user.photoURL || '',
      campusId: campusId || prevSession.campusId || '',
      studentId: '',
      course: 'Enrolled Student',
      yearLevel: 'Freshman',
      role: 'student'
    };

    try { localStorage.removeItem('skweladabaw_auth_token'); } catch (_) {}
    saveSession(session);
    const switchRes = await switchAccountSchedules(prevUid, user.uid, prevSession.isLoggedIn ? prevSession : undefined);
    if (!switchRes.success) {
      await rollbackFailedAuth(prevSession);
      throw new Error(switchRes.message || 'Please connect to the internet to back up unsynced data before switching accounts.');
    }

    return session;
  } catch (err) {
    await rollbackFailedAuth(prevSession);
    throw err;
  } finally {
    activeAuthTransactionCount = Math.max(0, activeAuthTransactionCount - 1);
  }
};

export const checkUserHasFirebasePassword = async (): Promise<boolean> => {
  if (localStorage.getItem('skwela_password_set') === 'true') {
    return true;
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await FirebaseAuthentication.getCurrentUser();
      const providers = res.user?.providerData || [];
      const has = providers.some((p: any) => p.providerId === 'password');
      if (has) {
        localStorage.setItem('skwela_password_set', 'true');
      }
      return has;
    } catch (_) {
      return false;
    }
  } else if (isFirebaseConfigured && auth && auth.currentUser) {
    const has = auth.currentUser.providerData.some((p) => p.providerId === 'password');
    if (has) {
      localStorage.setItem('skwela_password_set', 'true');
    }
    return has;
  }
  return false;
};

export const verifyFirebasePassword = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  let userEmail = email;
  if (!userEmail) {
    if (Capacitor.isNativePlatform()) {
      try {
        const cur = await FirebaseAuthentication.getCurrentUser();
        userEmail = cur.user?.email || '';
      } catch (_) {}
    } else if (isFirebaseConfigured && auth?.currentUser?.email) {
      userEmail = auth.currentUser.email;
    }
  }

  if (!userEmail || !password) {
    return { success: false, error: 'Please enter your account password.' };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signInWithEmailAndPassword({ email: userEmail, password });
      localStorage.setItem('skwela_password_set', 'true');
      return { success: true };
    } catch (err: any) {
      console.warn('Native verify password error:', err);
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('password') || msg.includes('credential') || msg.includes('user-not-found')) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
      return { success: false, error: 'Unable to verify password. Please check your connection.' };
    }
  } else if (isFirebaseConfigured && auth) {
    try {
      await signInWithEmailAndPassword(auth, userEmail, password);
      localStorage.setItem('skwela_password_set', 'true');
      return { success: true };
    } catch (err: any) {
      console.warn('Web verify password error:', err);
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found') {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
      return { success: false, error: err?.message || 'Unable to verify password.' };
    }
  }
  return { success: true };
};

export const linkFirebasePassword = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  let userEmail = email;
  if (!userEmail) {
    if (Capacitor.isNativePlatform()) {
      try {
        const cur = await FirebaseAuthentication.getCurrentUser();
        userEmail = cur.user?.email || '';
      } catch (_) {}
    } else if (isFirebaseConfigured && auth?.currentUser?.email) {
      userEmail = auth.currentUser.email;
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.linkWithEmailAndPassword({ email: userEmail, password });
      localStorage.setItem('skwela_password_set', 'true');
      return { success: true };
    } catch (linkErr: any) {
      console.warn('Native linkWithEmailAndPassword note, attempting updatePassword:', linkErr);
      try {
        await FirebaseAuthentication.updatePassword({ newPassword: password });
        localStorage.setItem('skwela_password_set', 'true');
        return { success: true };
      } catch (upErr: any) {
        console.warn('Native updatePassword note:', upErr);
        return { success: false, error: upErr?.message || 'Failed to save password to Firebase.' };
      }
    }
  } else if (isFirebaseConfigured && auth && auth.currentUser) {
    try {
      const credential = EmailAuthProvider.credential(userEmail || auth.currentUser.email || '', password);
      await linkWithCredential(auth.currentUser, credential);
      localStorage.setItem('skwela_password_set', 'true');
      return { success: true };
    } catch (linkErr: any) {
      console.warn('Web linkWithCredential note, attempting updatePassword:', linkErr);
      try {
        await updatePassword(auth.currentUser, password);
        localStorage.setItem('skwela_password_set', 'true');
        return { success: true };
      } catch (upErr: any) {
        console.warn('Web updatePassword note:', upErr);
        return { success: false, error: upErr?.message || 'Failed to save password to Firebase.' };
      }
    }
  }
  return { success: true };
};

export const signOutUser = async (
  currentUid?: string,
  options?: { skipAccountSync?: boolean }
): Promise<StudentAuthSession> => {
  isDeferredGuestChoicePending = false;
  activeAuthTransactionCount++;
  try {
    const activeSession = getSavedSession();
    const uid = currentUid || (activeSession.isLoggedIn ? activeSession.uid : undefined);
    if (uid && !options?.skipAccountSync) {
      await switchAccountSchedules(uid, undefined, activeSession).catch((e) => {
        console.warn('Error resetting client workspace on logout:', e);
      });
    }

    // Disconnect native/web SDKs in parallel with a 1200ms cap so Play Services never blocks logout navigation
    await withTimeout(
      Promise.allSettled([
        Capacitor.isNativePlatform()
          ? NativeGoogleAuth.signOut({ webClientId: GOOGLE_WEB_CLIENT_ID }).catch(() => {})
          : Promise.resolve(),
        Capacitor.isNativePlatform()
          ? FirebaseAuthentication.signOut().catch((e) => console.warn('Native signOut error:', e))
          : Promise.resolve(),
        isFirebaseConfigured && auth
          ? signOut(auth).catch((err) => console.warn('Firebase signOut error:', err))
          : Promise.resolve()
      ]),
      1200,
      'SDK sign-out timeout'
    ).catch(() => {});

    try { localStorage.removeItem('skweladabaw_auth_token'); } catch (_) {}
    localStorage.removeItem('skwela_password_set');
    sessionStorage.removeItem('skwela_session_checked');
    setOnboardingCompleted(false);
    const resetSession = { ...DEFAULT_GUEST_SESSION };
    saveSession(resetSession);
    return resetSession;
  } finally {
    activeAuthTransactionCount = Math.max(0, activeAuthTransactionCount - 1);
  }
};

export const subscribeToAuthChanges = (callback: (session: StudentAuthSession) => void) => {
  if (!isFirebaseConfigured || !auth) {
    callback(getSavedSession());
    return () => {};
  }

  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    // Ignore intermediate Firebase auth transitions while an explicit login/logout transaction or guest link choice is active
    if (activeAuthTransactionCount > 0 || isDeferredGuestChoicePending) {
      return;
    }

    const current = getSavedSession();
    if (firebaseUser && !firebaseUser.isAnonymous) {
      // Only hydrate/sync a persisted Firebase user when the local session actually completed login for it;
      // prevents rolled-back or partially failed logins from auto-signing in on restart.
      if (!current.isLoggedIn && !hasCompletedOnboarding()) {
        return;
      }
      if (current.isLoggedIn && current.uid && current.uid !== firebaseUser.uid) {
        return;
      }

      const updated: StudentAuthSession = {
        ...current,
        isLoggedIn: true,
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || current.name || 'Student',
        email: firebaseUser.email || current.email,
        avatar: firebaseUser.photoURL || current.avatar
      };
      saveSession(updated);
      callback(updated);
    } else {
      // Keep saved student session (prevents anonymous tokens from resetting user profile)
      callback(current);
    }
  });
};
