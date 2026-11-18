/**
 * Generates cryptographically strong identifiers using Web Crypto API.
 * Never uses Math.random() for session or record identifiers.
 */
export function createSecureId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}
