import { createContext, useContext } from 'react';
import type { UserPreferences } from '../../shared/validation/contentSchemas';
import type { CurioServices } from './curioServices';

export type ThemeMode = 'light' | 'dark';

export interface AuthUserView {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface SignInOutcome {
  signedIn: boolean;
  shouldPromptOnboarding: boolean;
}

export interface AppContextValue {
  userId: string;
  authUser: AuthUserView | null;
  isSignedIn: boolean;
  firebaseConfigured: boolean;
  authBusy: boolean;
  authError: string | null;
  cloudNotice: string | null;
  signInWithGoogle: () => Promise<SignInOutcome>;
  signOutAccount: () => Promise<void>;
  clearAuthError: () => void;
  clearCloudNotice: () => void;
  services: CurioServices;
  preferences: UserPreferences | null;
  preferencesLoading: boolean;
  refreshPreferences: () => Promise<void>;
  setPreferencesState: (next: UserPreferences) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useCurioApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useCurioApp must be used inside AppProvider');
  }
  return ctx;
}
