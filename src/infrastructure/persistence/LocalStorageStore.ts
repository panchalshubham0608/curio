/**
 * Safe client storage wrapper for non-sensitive discovery state (preferences, cached public
 * articles, reading sessions, saved bookmarks).
 * SECURITY RULE: Never store authentication tokens, session secrets, or credentials here.
 */
export class SafeKeyValueStore {
  private readonly namespace: string;
  private readonly memoryFallback = new Map<string, string>();
  private readonly useBrowserStorage: boolean;

  constructor(namespace = 'curio_v1', useBrowserStorage = true) {
    this.namespace = namespace;
    this.useBrowserStorage = useBrowserStorage;
  }

  private buildKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  public getJson<T>(key: string): T | null {
    const fullKey = this.buildKey(key);
    let raw: string | null = null;

    if (this.useBrowserStorage && typeof window !== 'undefined' && window.localStorage) {
      try {
        raw = window.localStorage.getItem(fullKey);
      } catch {
        raw = this.memoryFallback.get(fullKey) ?? null;
      }
    } else {
      raw = this.memoryFallback.get(fullKey) ?? null;
    }

    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public setJson<T>(key: string, value: T): void {
    const fullKey = this.buildKey(key);
    const serialized = JSON.stringify(value);
    this.memoryFallback.set(fullKey, serialized);

    if (this.useBrowserStorage && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(fullKey, serialized);
      } catch {
        // Quota exceeded or restricted storage mode — memory fallback already updated
      }
    }
  }

  public remove(key: string): void {
    const fullKey = this.buildKey(key);
    this.memoryFallback.delete(fullKey);

    if (this.useBrowserStorage && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(fullKey);
      } catch {
        // Ignore storage errors
      }
    }
  }
}
