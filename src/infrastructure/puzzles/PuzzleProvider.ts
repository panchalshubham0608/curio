import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import {
  PuzzleSchema,
  type Puzzle,
  type PuzzleKind,
} from '../../shared/validation/puzzleSchemas';
import { withBasePath } from '../../shared/utils/assetUrl';
import type { ContentCategory } from '../../shared/validation/contentSchemas';
import type { SafeKeyValueStore } from '../persistence/LocalStorageStore';

export interface PuzzleQueryOptions {
  kind?: PuzzleKind;
  category?: ContentCategory;
  excludeIds?: readonly string[];
}

/**
 * Provider interface for Curio's interactive puzzle section.
 * Serves schema-validated AI-generated puzzles and tracks per-user solved state.
 */
export interface PuzzleProvider {
  listPuzzles(options?: PuzzleQueryOptions): Promise<Puzzle[]>;
  generateNextPuzzle(options?: PuzzleQueryOptions): Promise<Puzzle | null>;
  getSolvedIds(userId: string): Promise<Set<string>>;
  markSolved(userId: string, puzzleId: string): Promise<Set<string>>;
  clearSolved(userId: string): Promise<void>;
}

interface GeneratedPuzzlesEnvelope {
  items?: unknown[];
}

const GENERATED_PUZZLES_ENDPOINT = withBasePath('/generated/puzzles.json');
const PUZZLE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Curio puzzle provider backed by live Firestore `/puzzles` (published via Firebase Admin SDK)
 * with graceful fallback to static `/curio/generated/puzzles.json` and Zod runtime validation.
 */
export class GeneratedPuzzleProvider implements PuzzleProvider {
  private readonly store: SafeKeyValueStore;
  private readonly firestore: Firestore | null;
  private readonly loadFromFirestoreOverride: (() => Promise<unknown[]>) | null;
  private readonly fetchImpl: typeof fetch | null;
  private readonly enableRemoteGenerated: boolean;
  private readonly hasCustomFetch: boolean;
  private cachedGenerated: Puzzle[] | null = null;
  private cachedAtMs = 0;

  constructor(
    store: SafeKeyValueStore,
    options?: {
      firestore?: Firestore | null;
      loadFromFirestore?: () => Promise<unknown[]>;
      fetchImpl?: typeof fetch;
      enableRemoteGenerated?: boolean;
    }
  ) {
    this.store = store;
    this.firestore = options?.firestore ?? null;
    this.loadFromFirestoreOverride = options?.loadFromFirestore ?? null;
    this.hasCustomFetch = Boolean(options?.fetchImpl);
    this.fetchImpl =
      options?.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.enableRemoteGenerated = options?.enableRemoteGenerated ?? true;
  }

  private solvedKey(userId: string): string {
    return `puzzles_solved_${userId}`;
  }

  private async readRawFirestorePuzzles(): Promise<unknown[]> {
    if (this.loadFromFirestoreOverride) {
      try {
        return await this.loadFromFirestoreOverride();
      } catch {
        return [];
      }
    }

    if (!this.firestore) {
      return [];
    }

    const colRef = collection(this.firestore, 'puzzles');
    try {
      const snap = await getDocs(query(colRef, orderBy('createdAt', 'desc'), fsLimit(80)));
      if (snap.docs.length > 0) {
        return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      }
      // Fallback if existing docs were written without createdAt
      const fallbackSnap = await getDocs(query(colRef, fsLimit(80)));
      return fallbackSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
    } catch {
      try {
        const fallbackSnap = await getDocs(query(colRef, fsLimit(80)));
        return fallbackSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
      } catch {
        return [];
      }
    }
  }

  private async readRawStaticPuzzles(): Promise<unknown[]> {
    if (!this.enableRemoteGenerated || !this.fetchImpl) {
      return [];
    }

    let requestUrl = GENERATED_PUZZLES_ENDPOINT;
    if (this.hasCustomFetch) {
      requestUrl = `https://curio.local${GENERATED_PUZZLES_ENDPOINT}`;
    } else if (typeof window !== 'undefined') {
      const origin = window.location?.origin;
      if (!origin || origin === 'null' || !/^https?:\/\//i.test(origin)) {
        return [];
      }
      requestUrl = `${origin}${GENERATED_PUZZLES_ENDPOINT}`;
    } else {
      return [];
    }

    try {
      const response = await this.fetchImpl(requestUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return [];
      }
      const envelope = (await response.json()) as GeneratedPuzzlesEnvelope;
      return Array.isArray(envelope?.items) ? envelope.items : [];
    } catch {
      return [];
    }
  }

  private async loadGeneratedPuzzles(): Promise<Puzzle[]> {
    if (
      this.cachedGenerated &&
      this.cachedGenerated.length > 0 &&
      Date.now() - this.cachedAtMs < PUZZLE_CACHE_TTL_MS
    ) {
      return this.cachedGenerated;
    }

    const [firestoreRaw, staticRaw] = await Promise.all([
      this.readRawFirestorePuzzles(),
      this.readRawStaticPuzzles(),
    ]);

    const valid: Puzzle[] = [];
    const seenIds = new Set<string>();

    // Prefer live Firestore puzzles first, then merge any static fallback items
    for (const item of [...firestoreRaw, ...staticRaw]) {
      const parsed = PuzzleSchema.safeParse(item);
      if (parsed.success && !seenIds.has(parsed.data.id)) {
        seenIds.add(parsed.data.id);
        valid.push(parsed.data);
      }
    }

    valid.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

    if (valid.length > 0) {
      this.cachedGenerated = valid;
      this.cachedAtMs = Date.now();
    } else {
      this.cachedGenerated = null;
    }
    return valid;
  }

  async listPuzzles(options?: PuzzleQueryOptions): Promise<Puzzle[]> {
    const excludeSet = new Set(options?.excludeIds ?? []);
    const pool = await this.loadGeneratedPuzzles();
    return pool.filter((puzzle) => {
      if (options?.kind && puzzle.kind !== options.kind) return false;
      if (options?.category && puzzle.category !== options.category) return false;
      if (excludeSet.has(puzzle.id)) return false;
      return true;
    });
  }

  async generateNextPuzzle(options?: PuzzleQueryOptions): Promise<Puzzle | null> {
    const candidates = await this.listPuzzles(options);
    if (candidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      return candidates[randomIndex] ?? null;
    }

    // Fallback when all puzzles in the current pool were excluded/solved: pick any matching puzzle
    const fallbackPool = await this.listPuzzles({
      kind: options?.kind,
      category: options?.category,
    });
    if (fallbackPool.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * fallbackPool.length);
    return fallbackPool[randomIndex] ?? null;
  }

  async getSolvedIds(userId: string): Promise<Set<string>> {
    const saved = this.store.getJson<string[]>(this.solvedKey(userId)) ?? [];
    return new Set(saved.filter((id) => typeof id === 'string'));
  }

  async markSolved(userId: string, puzzleId: string): Promise<Set<string>> {
    const current = await this.getSolvedIds(userId);
    current.add(puzzleId);
    this.store.setJson(this.solvedKey(userId), Array.from(current));
    return current;
  }

  async clearSolved(userId: string): Promise<void> {
    this.store.remove(this.solvedKey(userId));
  }
}
