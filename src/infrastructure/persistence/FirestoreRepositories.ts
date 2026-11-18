import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type {
  CandidateQuery,
  ContentRepository,
  InteractionRepository,
  SavedLibraryRepository,
  SessionRepository,
  UserPreferencesRepository,
  VisualAssetRepository,
} from '../../application/ports';
import { createDefaultUserPreferences } from '../../domain/user/UserPreferences';
import {
  ContentRecordSchema,
  FeedSessionSchema,
  SavedCollectionSchema,
  SavedItemSchema,
  UserInteractionSchema,
  UserPreferencesSchema,
  VisualAssetRecordSchema,
  type ContentRecord,
  type FeedSession,
  type SavedCollection,
  type SavedItem,
  type UserInteraction,
  type UserPreferences,
  type VisualAssetRecord,
} from '../../shared/validation/contentSchemas';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Read-only Firestore content catalog backed by an optional device-local cache.
 * Shared `/content` documents are written exclusively by server-side background jobs
 * via the Firebase Admin SDK; client apps never write to `/content`.
 */
export class FirestoreContentRepository implements ContentRepository {
  private readonly db: Firestore;
  private readonly localCache?: ContentRepository;

  constructor(db: Firestore, localCache?: ContentRepository) {
    this.db = db;
    this.localCache = localCache;
  }

  public async findCandidates(input: CandidateQuery): Promise<ContentRecord[]> {
    const colRef = collection(this.db, 'content');
    const q = query(colRef, orderBy('createdAt', 'desc'), fsLimit(input.limit ?? 80));
    const snap = await getDocs(q);
    const allowed = input.categories ? new Set(input.categories) : null;

    const merged = new Map<string, ContentRecord>();
    for (const d of snap.docs) {
      const parsed = ContentRecordSchema.safeParse({ ...d.data(), id: d.id });
      if (parsed.success && (!allowed || allowed.has(parsed.data.category))) {
        merged.set(parsed.data.id, parsed.data);
      }
    }

    if (this.localCache) {
      const cached = await this.localCache.findCandidates(input);
      for (const item of cached) {
        if (!merged.has(item.id)) {
          merged.set(item.id, item);
        }
      }
    }

    const results = Array.from(merged.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    return typeof input.limit === 'number' ? results.slice(0, input.limit) : results;
  }

  public async getById(id: string): Promise<ContentRecord | null> {
    const snap = await getDoc(doc(this.db, 'content', id));
    if (snap.exists()) {
      const parsed = ContentRecordSchema.safeParse({ ...snap.data(), id: snap.id });
      if (parsed.success) return parsed.data;
    }
    if (this.localCache) {
      return this.localCache.getById(id);
    }
    return null;
  }

  public async getByIds(ids: string[]): Promise<ContentRecord[]> {
    const uniqueIds = Array.from(new Set(ids));
    const items = await Promise.all(uniqueIds.map((id) => this.getById(id)));
    return items.filter((item): item is ContentRecord => item !== null);
  }

  public async saveMany(items: ContentRecord[]): Promise<void> {
    if (items.length === 0 || !this.localCache) return;
    await this.localCache.saveMany(items);
  }

  public async clearCache(): Promise<void> {
    await this.localCache?.clearCache?.();
  }
}

export class FirestoreSessionRepository implements SessionRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  public async create(session: FeedSession): Promise<void> {
    const parsed = FeedSessionSchema.parse(session);
    const ref = doc(this.db, 'users', parsed.userId, 'sessions', parsed.id);
    // Transaction-guarded idempotent creation so retries never overwrite an existing session
    await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, stripUndefined(parsed));
      }
    });
  }

  public async getById(userId: string, sessionId: string): Promise<FeedSession | null> {
    const snap = await getDoc(doc(this.db, 'users', userId, 'sessions', sessionId));
    if (!snap.exists()) return null;
    const parsed = FeedSessionSchema.safeParse({ ...snap.data(), id: snap.id, userId });
    return parsed.success ? parsed.data : null;
  }

  public async getLatestActive(userId: string): Promise<FeedSession | null> {
    const recent = await this.listRecent(userId, 10);
    return recent.find((s) => s.status === 'ready' && !s.completedAt) ?? null;
  }

  public async listRecent(userId: string, limitCount = 20): Promise<FeedSession[]> {
    const colRef = collection(this.db, 'users', userId, 'sessions');
    const q = query(colRef, orderBy('createdAt', 'desc'), fsLimit(limitCount));
    const snap = await getDocs(q);
    const sessions: FeedSession[] = [];
    for (const d of snap.docs) {
      const parsed = FeedSessionSchema.safeParse({ ...d.data(), id: d.id, userId });
      if (parsed.success) {
        sessions.push(parsed.data);
      }
    }
    return sessions;
  }

  public async update(
    userId: string,
    sessionId: string,
    patch: Partial<FeedSession>
  ): Promise<void> {
    const ref = doc(this.db, 'users', userId, 'sessions', sessionId);
    await setDoc(ref, stripUndefined(patch as Record<string, unknown>), { merge: true });
  }
}

export class FirestoreUserRepository implements UserPreferencesRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  public async get(userId: string): Promise<UserPreferences> {
    const ref = doc(this.db, 'users', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const parsed = UserPreferencesSchema.safeParse({ ...snap.data(), userId });
      if (parsed.success) {
        return parsed.data;
      }
    }
    const defaults = createDefaultUserPreferences(userId);
    await setDoc(ref, stripUndefined(defaults));
    return defaults;
  }

  public async save(preferences: UserPreferences): Promise<void> {
    const parsed = UserPreferencesSchema.parse(preferences);
    await setDoc(doc(this.db, 'users', parsed.userId), stripUndefined(parsed), {
      merge: true,
    });
  }

  public async reset(userId: string): Promise<UserPreferences> {
    const current = await this.get(userId);
    const fresh: UserPreferences = {
      ...createDefaultUserPreferences(userId),
      displayName: current.displayName,
      onboardingCompleted: current.onboardingCompleted,
    };
    await this.save(fresh);
    return fresh;
  }
}

export class FirestoreInteractionRepository implements InteractionRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  public async record(interaction: UserInteraction): Promise<void> {
    const parsed = UserInteractionSchema.parse(interaction);
    const ref = doc(this.db, 'users', parsed.userId, 'interactions', parsed.id);
    await setDoc(ref, stripUndefined(parsed));
  }

  public async listRecent(userId: string, limitCount = 120): Promise<UserInteraction[]> {
    const colRef = collection(this.db, 'users', userId, 'interactions');
    const q = query(colRef, orderBy('createdAt', 'desc'), fsLimit(limitCount));
    const snap = await getDocs(q);
    const items: UserInteraction[] = [];
    for (const d of snap.docs) {
      const parsed = UserInteractionSchema.safeParse({ ...d.data(), id: d.id, userId });
      if (parsed.success) {
        items.push(parsed.data);
      }
    }
    return items;
  }

  public async clearForUser(userId: string): Promise<void> {
    const colRef = collection(this.db, 'users', userId, 'interactions');
    const snap = await getDocs(colRef);
    const batch = writeBatch(this.db);
    for (const d of snap.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}

export class FirestoreSavedLibraryRepository implements SavedLibraryRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  public async listCollections(userId: string): Promise<SavedCollection[]> {
    const colRef = collection(this.db, 'users', userId, 'savedCollections');
    const snap = await getDocs(colRef);
    const list: SavedCollection[] = [];
    for (const d of snap.docs) {
      const parsed = SavedCollectionSchema.safeParse({ ...d.data(), id: d.id });
      if (parsed.success) list.push(parsed.data);
    }
    return list;
  }

  public async createCollection(userId: string, col: SavedCollection): Promise<void> {
    const parsed = SavedCollectionSchema.parse(col);
    await setDoc(
      doc(this.db, 'users', userId, 'savedCollections', parsed.id),
      stripUndefined(parsed),
      { merge: true }
    );
  }

  public async listSavedItems(userId: string): Promise<SavedItem[]> {
    const colRef = collection(this.db, 'users', userId, 'savedItems');
    const snap = await getDocs(colRef);
    const list: SavedItem[] = [];
    for (const d of snap.docs) {
      const parsed = SavedItemSchema.safeParse({ ...d.data(), id: d.id });
      if (parsed.success) list.push(parsed.data);
    }
    return list;
  }

  public async saveItem(userId: string, item: SavedItem): Promise<void> {
    const parsed = SavedItemSchema.parse(item);
    await setDoc(
      doc(this.db, 'users', userId, 'savedItems', parsed.id),
      stripUndefined(parsed),
      { merge: true }
    );
  }

  public async removeItem(userId: string, contentId: string): Promise<void> {
    const colRef = collection(this.db, 'users', userId, 'savedItems');
    const q = query(colRef, where('contentId', '==', contentId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
}

export class FirestoreVisualAssetRepository implements VisualAssetRepository {
  private readonly db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  public async findByQueryKey(queryKey: string): Promise<VisualAssetRecord | null> {
    const docId = queryKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 100);
    const snap = await getDoc(doc(this.db, 'visualAssets', docId));
    if (!snap.exists()) return null;
    const parsed = VisualAssetRecordSchema.safeParse({ ...snap.data(), id: snap.id });
    return parsed.success ? parsed.data : null;
  }

  public async save(asset: VisualAssetRecord): Promise<void> {
    const parsed = VisualAssetRecordSchema.parse(asset);
    const docId = parsed.queryKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 100);
    await setDoc(doc(this.db, 'visualAssets', docId), stripUndefined(parsed), { merge: true });
  }
}
