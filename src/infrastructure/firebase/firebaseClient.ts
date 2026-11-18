import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';
import { logInfo, logWarn } from '../../shared/utils/logger';

export interface FirebaseRuntime {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  ai: AI | null;
  geminiModelName: string;
}

interface FirebasePublicWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

function readPublicFirebaseConfig(): FirebasePublicWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
    appId,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || undefined,
  };
}

let cachedRuntime: FirebaseRuntime | null | undefined;

/**
 * Initializes Firebase client services only when public Firebase web configuration is present.
 * Never embeds hardcoded API keys or private secrets.
 */
export function getFirebaseRuntime(): FirebaseRuntime | null {
  if (cachedRuntime !== undefined) {
    return cachedRuntime;
  }

  const config = readPublicFirebaseConfig();
  if (!config) {
    cachedRuntime = null;
    logInfo('Firebase config not provided; running in Local Ready Mode');
    return null;
  }

  try {
    const existingApps = getApps();
    const app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
    const firestore = getFirestore(app);
    const auth = getAuth(app);

    const enableAI = import.meta.env.VITE_ENABLE_FIREBASE_AI === 'true';
    const geminiModelName = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

    let ai: AI | null = null;
    if (enableAI) {
      ai = getAI(app, { backend: new GoogleAIBackend() });
    }

    cachedRuntime = {
      app,
      firestore,
      auth,
      ai,
      geminiModelName,
    };

    logInfo('Firebase runtime initialized', { aiEnabled: Boolean(ai) });
    return cachedRuntime;
  } catch {
    logWarn('Failed to initialize Firebase runtime; falling back to Local Ready Mode');
    cachedRuntime = null;
    return null;
  }
}
