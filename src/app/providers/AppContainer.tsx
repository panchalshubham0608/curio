import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseRuntime } from '../../infrastructure/firebase/firebaseClient';
import {
  extractFirebaseErrorCode,
  isFirestorePermissionError,
  mapFirebaseError,
} from '../../shared/errors/firebaseErrorMapper';
import { logInfo, logWarn } from '../../shared/utils/logger';
import type { UserPreferences } from '../../shared/validation/contentSchemas';
import { isSafeImageUrl } from '../../shared/validation/urlValidation';
import {
  AppContext,
  type AppContextValue,
  type AuthUserView,
  type SignInOutcome,
  type ThemeMode,
} from './appContext';
import { buildCurioServices, type CurioServices } from './curioServices';

const LOCAL_GUEST_USER_ID = 'personal_local_reader';

function toAuthUserView(user: User | null): AuthUserView | null {
  if (!user || user.isAnonymous) return null;
  const safePhoto =
    user.photoURL && isSafeImageUrl(user.photoURL) ? user.photoURL : null;
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: safePhoto,
  };
}

interface AppProviderProps {
  children: ReactNode;
  overrideServices?: CurioServices;
}

export function AppProvider({ children, overrideServices }: AppProviderProps) {
  const runtime = useMemo(
    () => (overrideServices ? null : getFirebaseRuntime()),
    [overrideServices]
  );
  const firebaseConfigured = Boolean(runtime);

  const [authUser, setAuthUser] = useState<AuthUserView | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(!firebaseConfigured);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [cloudFallbackActive, setCloudFallbackActive] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage?.getItem('curio_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Use Cloud Firestore when signed in with Firebase Auth unless Firestore rules/connectivity forced graceful local fallback
  const services = useMemo<CurioServices>(() => {
    if (overrideServices) return overrideServices;
    return buildCurioServices({
      useCloudFirestore: Boolean(authUser) && !cloudFallbackActive,
    });
  }, [overrideServices, authUser, cloudFallbackActive]);

  const userId = authUser?.uid ?? LOCAL_GUEST_USER_ID;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage?.setItem('curio_theme', theme);
    } catch {
      // Ignore storage restriction
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Listen to Firebase Auth state & resolve any pending Google redirect sign-in
  useEffect(() => {
    if (!runtime) {
      setAuthReady(true);
      return;
    }

    void getRedirectResult(runtime.auth).catch((error: unknown) => {
      const mapped = mapFirebaseError(error, 'auth');
      if (!mapped.silent) {
        setAuthError(mapped.message);
      }
      logWarn('Google redirect sign-in check failed', { code: mapped.code });
    });

    const unsubscribe = onAuthStateChanged(runtime.auth, (user) => {
      const nextUser = toAuthUserView(user);
      setAuthUser(nextUser);
      if (nextUser) {
        setCloudFallbackActive(false);
        setCloudNotice(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [runtime]);

  const refreshPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    try {
      const loaded = await services.getPreferences.execute(userId);
      if (authUser?.displayName && !loaded.displayName) {
        const firstName = authUser.displayName.split(/\s+/)[0] ?? authUser.displayName;
        const enriched = await services.updatePreferences.execute(userId, {
          displayName: firstName,
        });
        setPreferences(enriched);
      } else {
        setPreferences(loaded);
      }
    } catch (error: unknown) {
      const mapped = mapFirebaseError(error, 'firestore');
      logWarn('Failed to load preferences from active repository', { code: mapped.code });

      // Graceful degradation: if Cloud Firestore fails (e.g., rules not deployed yet or offline),
      // surface a clear friendly notice and switch to local persistence so the app remains usable.
      if (services.mode === 'firebase') {
        setCloudNotice(mapped.message);
        setCloudFallbackActive(true);
        const localFallback = buildCurioServices({ useCloudFirestore: false });
        try {
          const localPrefs = await localFallback.getPreferences.execute(userId);
          setPreferences(localPrefs);
        } catch {
          // Leave existing state intact if local fallback also fails
        }
      } else {
        setCloudNotice(mapped.message);
      }
    } finally {
      setPreferencesLoading(false);
    }
  }, [authUser?.displayName, services, userId]);

  useEffect(() => {
    if (!authReady) return;
    void refreshPreferences();
  }, [authReady, refreshPreferences]);

  const signInWithGoogle = useCallback(async (): Promise<SignInOutcome> => {
    if (!runtime) {
      setAuthError(
        'Cloud sign-in is not configured in this environment. You can continue using Curio locally.'
      );
      return { signedIn: false, shouldPromptOnboarding: false };
    }

    setAuthBusy(true);
    setAuthError(null);
    setCloudNotice(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const credential = await signInWithPopup(runtime.auth, provider);
      const signedUser = toAuthUserView(credential.user);
      setAuthUser(signedUser);
      setCloudFallbackActive(false);
      logInfo('Google sign-in completed');

      if (signedUser) {
        const cloudServices = buildCurioServices({ useCloudFirestore: true });
        try {
          const prefs = await cloudServices.getPreferences.execute(signedUser.uid);
          return {
            signedIn: true,
            shouldPromptOnboarding: !prefs.onboardingCompleted,
          };
        } catch (fsError: unknown) {
          const fsMapped = mapFirebaseError(fsError, 'firestore');
          setCloudNotice(fsMapped.message);
          if (isFirestorePermissionError(fsError)) {
            setCloudFallbackActive(true);
          }
          logWarn('Post-signin Firestore profile read fell back', { code: fsMapped.code });
          return { signedIn: true, shouldPromptOnboarding: false };
        }
      }
      return { signedIn: false, shouldPromptOnboarding: false };
    } catch (error: unknown) {
      const code = extractFirebaseErrorCode(error);

      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(runtime.auth, provider);
          return { signedIn: false, shouldPromptOnboarding: false };
        } catch (redirectError: unknown) {
          const mapped = mapFirebaseError(redirectError, 'auth');
          setAuthError(mapped.message);
          logWarn('Google redirect fallback failed', { code: mapped.code });
          return { signedIn: false, shouldPromptOnboarding: false };
        }
      }

      const mapped = mapFirebaseError(error, 'auth');
      if (!mapped.silent) {
        setAuthError(mapped.message);
      } else {
        setAuthError(null);
      }
      logWarn('Google sign-in interrupted', { code: mapped.code });
      return { signedIn: false, shouldPromptOnboarding: false };
    } finally {
      setAuthBusy(false);
    }
  }, [runtime]);

  const signOutAccount = useCallback(async (): Promise<void> => {
    setAuthBusy(true);
    setAuthError(null);
    setCloudNotice(null);
    try {
      if (runtime) {
        await signOut(runtime.auth);
      }
      // Security guideline: clear client-side user state on logout
      setAuthUser(null);
      setCloudFallbackActive(false);
      setPreferences(null);
    } catch (error: unknown) {
      const mapped = mapFirebaseError(error, 'auth');
      setAuthError(mapped.message);
      logWarn('Sign-out failed', { code: mapped.code });
    } finally {
      setAuthBusy(false);
    }
  }, [runtime]);

  const clearLocalGuestProfile = useCallback(async (): Promise<UserPreferences> => {
    const freshPrefs = await services.clearLocalGuestProfile(LOCAL_GUEST_USER_ID);
    if (!authUser) {
      setPreferences(freshPrefs);
    }
    logInfo('Cleared local guest profile');
    return freshPrefs;
  }, [authUser, services]);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const clearCloudNotice = useCallback(() => setCloudNotice(null), []);

  const value = useMemo<AppContextValue>(
    () => ({
      userId,
      authUser,
      isSignedIn: Boolean(authUser),
      firebaseConfigured,
      authBusy,
      authError,
      cloudNotice,
      signInWithGoogle,
      signOutAccount,
      clearLocalGuestProfile,
      clearAuthError,
      clearCloudNotice,
      services,
      preferences,
      preferencesLoading,
      refreshPreferences,
      setPreferencesState: setPreferences,
      theme,
      toggleTheme,
    }),
    [
      userId,
      authUser,
      firebaseConfigured,
      authBusy,
      authError,
      cloudNotice,
      signInWithGoogle,
      signOutAccount,
      clearLocalGuestProfile,
      clearAuthError,
      clearCloudNotice,
      services,
      preferences,
      preferencesLoading,
      refreshPreferences,
      theme,
      toggleTheme,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
