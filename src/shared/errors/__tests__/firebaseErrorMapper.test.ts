import { describe, expect, it } from 'vitest';
import { TimeoutError } from '../../utils/retry';
import {
  extractFirebaseErrorCode,
  getFriendlyErrorMessage,
  isFirestorePermissionError,
  mapFirebaseError,
} from '../firebaseErrorMapper';

describe('firebaseErrorMapper', () => {
  it('treats intentional Google popup cancellation as silent and non-alarming', () => {
    const closed = mapFirebaseError({ code: 'auth/popup-closed-by-user' }, 'auth');
    expect(closed.silent).toBe(true);
    expect(closed.category).toBe('auth');

    const cancelled = mapFirebaseError({ code: 'auth/cancelled-popup-request' }, 'auth');
    expect(cancelled.silent).toBe(true);
  });

  it('maps common Firebase Auth error codes to plain human-friendly messages without technical jargon', () => {
    const cases = [
      'auth/popup-blocked',
      'auth/unauthorized-domain',
      'auth/operation-not-allowed',
      'auth/network-request-failed',
      'auth/too-many-requests',
      'auth/user-disabled',
      'auth/account-exists-with-different-credential',
      'auth/user-token-expired',
      'auth/web-storage-unsupported',
      'auth/invalid-api-key',
    ];

    for (const code of cases) {
      const mapped = mapFirebaseError({ code }, 'auth');
      expect(mapped.silent).toBe(false);
      expect(mapped.message.length).toBeGreaterThan(15);
      expect(mapped.message).not.toMatch(/firestore|firebase|stack|exception/i);
    }
  });

  it('maps Firestore error codes with or without firestore/ prefix and detects permission errors', () => {
    const perm = mapFirebaseError({ code: 'permission-denied' }, 'firestore');
    expect(perm.category).toBe('firestore');
    expect(perm.message).not.toMatch(/firestore|firebase/i);
    expect(isFirestorePermissionError({ code: 'firestore/permission-denied' })).toBe(true);
    expect(isFirestorePermissionError({ code: 'unauthenticated' })).toBe(true);
    expect(isFirestorePermissionError({ code: 'unavailable' })).toBe(false);

    const prefixed = mapFirebaseError({ code: 'firestore/unavailable' }, 'firestore');
    expect(prefixed.category).toBe('firestore');
    expect(prefixed.recoverable).toBe(true);

    const quota = mapFirebaseError({ code: 'resource-exhausted' }, 'firestore');
    expect(quota.message).toMatch(/limit/i);
  });

  it('maps Firebase AI / Vertex AI codes and TimeoutError cleanly', () => {
    const aiQuota = mapFirebaseError({ code: 'ai/quota-exceeded' }, 'ai');
    expect(aiQuota.category).toBe('ai');
    expect(aiQuota.message).not.toMatch(/firebase|vertex/i);

    const vertexBlocked = mapFirebaseError({ code: 'vertexai/response-blocked' }, 'ai');
    expect(vertexBlocked.category).toBe('ai');

    const timeout = mapFirebaseError(new TimeoutError('Operation exceeded 6000ms'), 'general');
    expect(timeout.category).toBe('network');
    expect(timeout.code).toBe('timeout');
  });

  it('extracts nested error codes and never leaks raw unknown internal error text', () => {
    const nested = { cause: { code: 'auth/too-many-requests' } };
    expect(extractFirebaseErrorCode(nested)).toBe('auth/too-many-requests');

    const opaque = new Error('INTERNAL_SQL_TOKEN_LEAK: raw stack detail');
    const friendly = getFriendlyErrorMessage(opaque, 'firestore');
    expect(friendly).not.toContain('INTERNAL_SQL_TOKEN_LEAK');
    expect(friendly).toMatch(/sync/i);
  });
});
