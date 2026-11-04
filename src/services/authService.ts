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
import { NativeGoogleAuth } from './nativeGoogleAuth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';
import { switchAccountSchedules } from './userService';
import { imageCacheService } from './imageCacheService';

let webConfirmationResult: any = null;
let nativePhoneCodeListener: any = null;

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
  campusId: 'addu-jacinto',
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
            campusId: serverUser.campus_id || 'addu-jacinto',
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

const performGoogleSignIn = async (currentCampusId: string): Promise<StudentAuthSession | null> => {
  // 1. Native Android Google Sign-In (Xiaomi HyperOS / MIUI hardened native bridge)
  if (Capacitor.isNativePlatform()) {
    let nativeResult: {
      idToken: string;
      uid?: string;
      email?: string;
      displayName?: string;
      photoUrl?: string;
    } | null = null;

    try {
      nativeResult = await NativeGoogleAuth.signIn({ webClientId: GOOGLE_WEB_CLIENT_ID });
    } catch (nativeErr: any) {
      const errMsg = String(nativeErr?.message || nativeErr || '');
      const isCancellation = 
        errMsg.includes('cancelled') ||
        errMsg.includes('canceled') ||
        errMsg.includes('dismissed');

      if (isCancellation) {
        console.info('Google Sign-In was cancelled by user.');
        return null;
      }

      console.warn('NativeGoogleAuth bridge note:', nativeErr);

      // Secondary fallback to @capacitor-firebase/authentication if native bridge encountered an unexpected platform issue
      try {
        const fallbackRes = await FirebaseAuthentication.signInWithGoogle();
        if (fallbackRes?.credential?.idToken) {
          nativeResult = {
            idToken: fallbackRes.credential.idToken,
            uid: fallbackRes.user?.uid,
            email: fallbackRes.user?.email || undefined,
            displayName: fallbackRes.user?.displayName || undefined,
            photoUrl: fallbackRes.user?.photoUrl || undefined
          };
        }
      } catch (fbErr: any) {
        console.error('All native Google sign-in attempts failed:', fbErr);
        throw nativeErr;
      }
    }

    if (nativeResult?.idToken) {
      if (auth) {
        try {
          const credential = GoogleAuthProvider.credential(nativeResult.idToken);
          const userCred = await signInWithCredential(auth, credential);
          const firebaseUser = userCred.user;

          const session: StudentAuthSession = {
            isLoggedIn: true,
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || nativeResult.displayName || 'Student',
            email: firebaseUser.email || nativeResult.email || '',
            avatar: firebaseUser.photoURL || nativeResult.photoUrl || '',
            campusId: currentCampusId,
            studentId: '',
            course: 'Enrolled Student',
            yearLevel: 'College Student',
            role: 'student'
          };
          const prevSession = getSavedSession();
          const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;
          saveSession(session);
          try {
            const idToken = nativeResult.idToken || (await firebaseUser.getIdToken(false).catch(() => undefined));
            await switchAccountSchedules(prevUid, firebaseUser.uid, prevSession.isLoggedIn ? prevSession : undefined, idToken);
          } catch (_) {}
          return session;
        } catch (syncErr: any) {
          console.warn('Firebase JS SDK signInWithCredential warning (falling back to native user session):', syncErr);
          // Fallback session using native Google credentials so user login never loops or breaks
          const uid = nativeResult.uid || ('usr_' + Date.now());
          const session: StudentAuthSession = {
            isLoggedIn: true,
            uid: uid,
            name: nativeResult.displayName || 'Student',
            email: nativeResult.email || '',
            avatar: nativeResult.photoUrl || '',
            campusId: currentCampusId,
            studentId: '',
            course: 'Enrolled Student',
            yearLevel: 'College Student',
            role: 'student'
          };
          const prevSession = getSavedSession();
          const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;
          saveSession(session);
          try {
            await switchAccountSchedules(prevUid, uid, prevSession.isLoggedIn ? prevSession : undefined, nativeResult.idToken);
          } catch (_) {}
          return session;
        }
      } else {
        // Fallback session if web auth instance is uninitialized
        const session: StudentAuthSession = {
          isLoggedIn: true,
          uid: nativeResult.uid || 'usr_' + Date.now(),
          name: nativeResult.displayName || 'Student',
          email: nativeResult.email || '',
          avatar: nativeResult.photoUrl || '',
          campusId: currentCampusId,
          studentId: '',
          course: 'Enrolled Student',
          yearLevel: 'College Student',
          role: 'student'
        };
        const prevSession = getSavedSession();
        const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;
        saveSession(session);
        try {
          await switchAccountSchedules(prevUid, session.uid, prevSession.isLoggedIn ? prevSession : undefined, nativeResult.idToken);
        } catch (_) {}
        return session;
      }
    }
    return null;
  }

  // 2. Web Browser ONLY (Desktop/Browser dev testing)
  if (isFirebaseConfigured && auth) {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const session: StudentAuthSession = {
      isLoggedIn: true,
      uid: user.uid,
      name: user.displayName || 'Student',
      email: user.email || '',
      avatar: user.photoURL || '',
      campusId: currentCampusId,
      studentId: '',
      course: 'Enrolled Student',
      yearLevel: 'College Student',
      role: 'student'
    };
    const prevSession = getSavedSession();
    const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;
    saveSession(session);
    try {
      const idToken = await user.getIdToken(false).catch(() => undefined);
      await switchAccountSchedules(prevUid, user.uid, prevSession.isLoggedIn ? prevSession : undefined, idToken);
    } catch (_) {}
    return session;
  }

  return null;
};

export const signInWithGoogle = async (currentCampusId = 'addu-jacinto'): Promise<StudentAuthSession | null> => {
  try {
    const session = await withTimeout(
      performGoogleSignIn(currentCampusId),
      AUTH_TIMEOUT_MS,
      'Authentication timeout • Network response took too long'
    );
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
  campusId = 'addu-jacinto'
): Promise<StudentAuthSession> => {
  const code = verificationCode.trim();
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
        campusId: campusId
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

    if (data.token) {
      try {
        localStorage.setItem('skweladabaw_auth_token', data.token);
      } catch (_) {}
    }

    const prevSession = getSavedSession();
    const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;
    saveSession(session);
    try {
      await switchAccountSchedules(prevUid, session.uid, prevSession.isLoggedIn ? prevSession : undefined);
    } catch (_) {}

    return session;
  }

  // 2. Fallback to Firebase Confirmation Result (if applicable)
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
    campusId: campusId || 'addu-jacinto',
    studentId: '',
    course: 'Enrolled Student',
    yearLevel: 'Freshman',
    role: 'student'
  };

  const prevSession = getSavedSession();
  const prevUid = prevSession.isLoggedIn ? prevSession.uid : undefined;
  saveSession(session);
  try {
    await switchAccountSchedules(prevUid, user.uid, prevSession.isLoggedIn ? prevSession : undefined);
  } catch (_) {}

  return session;
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

export const signOutUser = async (currentUid?: string): Promise<StudentAuthSession> => {
  const activeSession = getSavedSession();
  const uid = currentUid || (activeSession.isLoggedIn ? activeSession.uid : undefined);
  if (uid) {
    try {
      await switchAccountSchedules(uid, undefined, activeSession);
    } catch (e) {
      console.warn('Error during schedule isolation on logout:', e);
    }
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await NativeGoogleAuth.signOut({ webClientId: GOOGLE_WEB_CLIENT_ID });
    } catch (_) {}
    try {
      await FirebaseAuthentication.signOut();
    } catch (e) {
      console.warn('Native signOut error:', e);
    }
  }
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }
  }
  localStorage.removeItem('skwela_password_set');
  setOnboardingCompleted(false);
  const resetSession = { ...DEFAULT_GUEST_SESSION };
  saveSession(resetSession);
  return resetSession;
};

export const subscribeToAuthChanges = (callback: (session: StudentAuthSession) => void) => {
  if (!isFirebaseConfigured || !auth) {
    callback(getSavedSession());
    return () => {};
  }

  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    const current = getSavedSession();
    if (firebaseUser && !firebaseUser.isAnonymous) {
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
