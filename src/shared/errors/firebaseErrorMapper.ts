import { TimeoutError } from '../utils/retry';

export type FirebaseErrorContext = 'auth' | 'firestore' | 'ai' | 'general';

export interface FriendlyFirebaseError {
  code: string;
  title: string;
  message: string;
  category: 'auth' | 'firestore' | 'ai' | 'network' | 'unknown';
  recoverable: boolean;
  /** True when the user intentionally cancelled an action (e.g., closed popup) */
  silent: boolean;
}

const AUTH_ERROR_MESSAGES: Record<
  string,
  Omit<FriendlyFirebaseError, 'code' | 'category'>
> = {
  'auth/popup-closed-by-user': {
    title: 'Sign-in cancelled',
    message: 'Sign-in was closed before finishing. Tap Google Sign-In whenever you are ready.',
    recoverable: true,
    silent: true,
  },
  'auth/cancelled-popup-request': {
    title: 'Sign-in interrupted',
    message: 'Only one sign-in window can be open at a time. Please try again.',
    recoverable: true,
    silent: true,
  },
  'auth/popup-blocked': {
    title: 'Pop-up blocked',
    message:
      'Your browser blocked the Google sign-in window. Please allow pop-ups for Curio and try again.',
    recoverable: true,
    silent: false,
  },
  'auth/unauthorized-domain': {
    title: 'Sign-in not enabled for this address',
    message:
      'Google sign-in is not yet authorized for this web address. You can continue exploring Curio in local mode for now.',
    recoverable: false,
    silent: false,
  },
  'auth/operation-not-allowed': {
    title: 'Google sign-in unavailable',
    message:
      'Google sign-in is not turned on for Curio right now. You can keep reading on this device in the meantime.',
    recoverable: false,
    silent: false,
  },
  'auth/network-request-failed': {
    title: 'Connection unavailable',
    message:
      'We could not reach Google Sign-In. Please check your internet connection and try again.',
    recoverable: true,
    silent: false,
  },
  'auth/too-many-requests': {
    title: 'Please wait a moment',
    message:
      'Too many sign-in attempts happened in a short time. Wait a minute and try signing in again.',
    recoverable: true,
    silent: false,
  },
  'auth/user-disabled': {
    title: 'Account unavailable',
    message:
      'This Google account is currently disabled for Curio. Try a different account or continue on this device.',
    recoverable: false,
    silent: false,
  },
  'auth/account-exists-with-different-credential': {
    title: 'Account already exists',
    message:
      'An account with this email already exists using a different sign-in method.',
    recoverable: true,
    silent: false,
  },
  'auth/user-token-expired': {
    title: 'Session expired',
    message: 'Your sign-in session expired. Please sign in with Google again to keep syncing.',
    recoverable: true,
    silent: false,
  },
  'auth/invalid-user-token': {
    title: 'Sign-in refresh needed',
    message: 'Your sign-in needs a quick refresh. Please sign in with Google again.',
    recoverable: true,
    silent: false,
  },
  'auth/requires-recent-login': {
    title: 'Fresh sign-in required',
    message: 'For your security, please sign in with Google again before completing this action.',
    recoverable: true,
    silent: false,
  },
  'auth/web-storage-unsupported': {
    title: 'Browser storage restricted',
    message:
      'This browser mode restricts sign-in storage (such as strict private browsing). Try a standard tab or continue on this device.',
    recoverable: false,
    silent: false,
  },
  'auth/operation-not-supported-in-this-environment': {
    title: 'Sign-in unavailable here',
    message:
      'Google sign-in is not supported in this embedded browser. Try opening Curio in your main browser.',
    recoverable: false,
    silent: false,
  },
  'auth/invalid-api-key': {
    title: 'Sign-in temporarily unavailable',
    message:
      'Google sign-in is temporarily unavailable right now. You can keep reading on this device.',
    recoverable: false,
    silent: false,
  },
  'auth/app-not-authorized': {
    title: 'Sign-in temporarily unavailable',
    message:
      'Google sign-in could not be authorized right now. You can continue exploring on this device.',
    recoverable: false,
    silent: false,
  },
  'auth/configuration-not-found': {
    title: 'Sign-in unavailable right now',
    message: 'Google sign-in is not ready yet. You can keep reading on this device.',
    recoverable: false,
    silent: false,
  },
  'auth/internal-error': {
    title: 'Temporary sign-in issue',
    message: 'Google sign-in ran into a temporary hiccup. Please try again in a moment.',
    recoverable: true,
    silent: false,
  },
};

const FIRESTORE_ERROR_MESSAGES: Record<
  string,
  Omit<FriendlyFirebaseError, 'code' | 'category'>
> = {
  'permission-denied': {
    title: 'Sync paused on this account',
    message:
      'Account syncing is not available right now. Curio switched to saving on this device so you can keep reading uninterrupted.',
    recoverable: false,
    silent: false,
  },
  unauthenticated: {
    title: 'Sign-in needed to sync',
    message: 'Please sign in with Google again to sync your profile, sessions, and saved library.',
    recoverable: true,
    silent: false,
  },
  unavailable: {
    title: 'Sync is currently offline',
    message:
      'We could not sync right now. Check your internet connection and try again shortly.',
    recoverable: true,
    silent: false,
  },
  'deadline-exceeded': {
    title: 'Request timed out',
    message: 'Syncing took too long to respond. Please check your connection and try again.',
    recoverable: true,
    silent: false,
  },
  'resource-exhausted': {
    title: 'Sync limit reached',
    message:
      'Syncing has reached its temporary limit. Please try again later or keep reading on this device.',
    recoverable: true,
    silent: false,
  },
  'failed-precondition': {
    title: 'Getting your library ready',
    message: 'Your synced library is still finishing setup. Please try again in a moment.',
    recoverable: true,
    silent: false,
  },
  'not-found': {
    title: 'Not found',
    message: 'We could not find that saved item or session.',
    recoverable: false,
    silent: false,
  },
  'already-exists': {
    title: 'Already saved',
    message: 'This item is already in your library.',
    recoverable: true,
    silent: false,
  },
  aborted: {
    title: 'Update conflict',
    message: 'Another update finished at the same time. Please try that action once more.',
    recoverable: true,
    silent: false,
  },
  cancelled: {
    title: 'Sync interrupted',
    message: 'That save request was cancelled before finishing. Please try again.',
    recoverable: true,
    silent: false,
  },
  'invalid-argument': {
    title: 'Invalid input',
    message: 'Some details were not in the expected format. Please check your entries and try again.',
    recoverable: true,
    silent: false,
  },
  'out-of-range': {
    title: 'Value out of range',
    message: 'One of the selected values was outside the allowed range. Please adjust and retry.',
    recoverable: true,
    silent: false,
  },
  'data-loss': {
    title: 'Temporary storage issue',
    message: 'We ran into a temporary syncing hiccup. Please refresh and try again.',
    recoverable: true,
    silent: false,
  },
  internal: {
    title: 'Temporary sync issue',
    message: 'Syncing hit a temporary issue. Please try again in a moment.',
    recoverable: true,
    silent: false,
  },
};

const AI_ERROR_MESSAGES: Record<
  string,
  Omit<FriendlyFirebaseError, 'code' | 'category'>
> = {
  'ai/quota-exceeded': {
    title: 'Curio AI is busy',
    message:
      'Curio AI is temporarily at capacity. Please try again shortly or read the original source.',
    recoverable: true,
    silent: false,
  },
  'ai/api-not-enabled': {
    title: 'Curio AI unavailable',
    message: 'Curio AI is temporarily offline. Showing a summary directly from the source instead.',
    recoverable: false,
    silent: false,
  },
  'ai/fetch-error': {
    title: 'Connection interrupted',
    message: 'Could not reach Curio AI right now. Check your connection and try again.',
    recoverable: true,
    silent: false,
  },
  'ai/response-blocked': {
    title: 'Response unavailable',
    message:
      'Curio could not generate a reply for that phrasing. Try asking your question another way.',
    recoverable: true,
    silent: false,
  },
};

/**
 * Extracts a normalized Firebase error code (e.g. `auth/popup-blocked`, `permission-denied`, `ai/fetch-error`)
 * from unknown thrown errors without exposing raw internal messages.
 */
export function extractFirebaseErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === 'string' && maybeCode.trim().length > 0) {
      return maybeCode.trim().toLowerCase();
    }
    const cause = (error as { cause?: unknown }).cause;
    if (cause) {
      return extractFirebaseErrorCode(cause);
    }
  }
  return '';
}

export function isFirestorePermissionError(error: unknown): boolean {
  const code = extractFirebaseErrorCode(error).replace(/^firestore\//, '');
  return code === 'permission-denied' || code === 'unauthenticated';
}

export function isNetworkError(error: unknown): boolean {
  const code = extractFirebaseErrorCode(error).replace(/^firestore\//, '');
  if (
    code === 'auth/network-request-failed' ||
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'ai/fetch-error'
  ) {
    return true;
  }
  if (error instanceof TimeoutError) {
    return true;
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return true;
  }
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Converts Firebase Auth, Cloud Firestore, Firebase AI, and network errors
 * into calm, human-friendly messages while never leaking raw internal stack traces.
 */
export function mapFirebaseError(
  error: unknown,
  context: FirebaseErrorContext = 'general'
): FriendlyFirebaseError {
  const rawCode = extractFirebaseErrorCode(error);

  // 1. Firebase Auth errors
  if (rawCode.startsWith('auth/') && AUTH_ERROR_MESSAGES[rawCode]) {
    return {
      code: rawCode,
      category: 'auth',
      ...AUTH_ERROR_MESSAGES[rawCode],
    };
  }

  // 2. Cloud Firestore errors (codes may appear as `permission-denied` or `firestore/permission-denied`)
  const normalizedFsCode = rawCode.replace(/^firestore\//, '');
  if (normalizedFsCode && FIRESTORE_ERROR_MESSAGES[normalizedFsCode]) {
    return {
      code: rawCode || normalizedFsCode,
      category: 'firestore',
      ...FIRESTORE_ERROR_MESSAGES[normalizedFsCode],
    };
  }

  // 3. Firebase AI Logic / Vertex AI errors
  const normalizedAiCode = rawCode.replace(/^vertexai\//, 'ai/');
  if (normalizedAiCode && AI_ERROR_MESSAGES[normalizedAiCode]) {
    return {
      code: rawCode,
      category: 'ai',
      ...AI_ERROR_MESSAGES[normalizedAiCode],
    };
  }

  // 4. Timeout / Offline / Network errors
  if (error instanceof TimeoutError) {
    return {
      code: 'timeout',
      title: 'Request timed out',
      message: 'This took longer than expected. Please check your connection and try again.',
      category: 'network',
      recoverable: true,
      silent: false,
    };
  }

  if (isNetworkError(error)) {
    return {
      code: rawCode || 'network-offline',
      title: 'You appear to be offline',
      message:
        'Please check your internet connection. You can still browse cached discoveries locally.',
      category: 'network',
      recoverable: true,
      silent: false,
    };
  }

  // 5. Context-aware safe fallbacks (never echo raw FirebaseError internals to users)
  switch (context) {
    case 'auth':
      return {
        code: rawCode || 'auth/unknown',
        title: 'Sign-in unavailable',
        message: 'We could not complete sign-in right now. Please try again in a moment.',
        category: 'auth',
        recoverable: true,
        silent: false,
      };
    case 'firestore':
      return {
        code: rawCode || 'firestore/unknown',
        title: 'Sync issue',
        message: 'We could not sync your changes right now. Please try again shortly.',
        category: 'firestore',
        recoverable: true,
        silent: false,
      };
    case 'ai':
      return {
        code: rawCode || 'ai/unknown',
        title: 'AI explanation unavailable',
        message: 'Curio could not answer that right now. Please try again in a moment.',
        category: 'ai',
        recoverable: true,
        silent: false,
      };
    case 'general':
    default:
      return {
        code: rawCode || 'unknown',
        title: 'Something went wrong',
        message: 'We ran into a temporary issue. Please try again in a moment.',
        category: 'unknown',
        recoverable: true,
        silent: false,
      };
  }
}

export function getFriendlyErrorMessage(
  error: unknown,
  context: FirebaseErrorContext = 'general'
): string {
  return mapFirebaseError(error, context).message;
}
