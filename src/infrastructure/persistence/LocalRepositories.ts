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
import type { SafeKeyValueStore } from './LocalStorageStore';

export class LocalContentRepository implements ContentRepository {
  private readonly store: SafeKeyValueStore;
  private readonly key = 'content_pool';

  constructor(store: SafeKeyValueStore) {
    this.store = store;
  }

  private readMap(): Record<string, ContentRecord> {
    const raw = this.store.getJson<Record<string, unknown>>(this.key) ?? {};
    const valid: Record<string, ContentRecord> = {};
    for (const [id, entry] of Object.entries(raw)) {
      const parsed = ContentRecordSchema.safeParse(entry);
      if (parsed.success) {
        valid[id] = parsed.data;
      }
    }
    return valid;
  }

  public async findCandidates(input: CandidateQuery): Promise<ContentRecord[]> {
    let items = Object.values(this.readMap());
    if (input.categories && input.categories.length > 0) {
      const allowed = new Set(input.categories);
      items = items.filter((item) => allowed.has(item.category));
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return typeof input.limit === 'number' ? items.slice(0, input.limit) : items;
  }

  public async getById(id: string): Promise<ContentRecord | null> {
    return this.readMap()[id] ?? null;
  }

  public async getByIds(ids: string[]): Promise<ContentRecord[]> {
    const map = this.readMap();
    return ids
      .map((id) => map[id])
      .filter((item): item is ContentRecord => item !== undefined);
  }

  public async saveMany(items: ContentRecord[]): Promise<void> {
    const map = this.readMap();
    for (const item of items) {
      const parsed = ContentRecordSchema.safeParse(item);
      if (parsed.success) {
        map[parsed.data.id] = parsed.data;
      }
    }
    // Keep cache bounded to 150 most recent items
    const boundedEntries = Object.values(map)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 150);
    const nextMap: Record<string, ContentRecord> = {};
    for (const entry of boundedEntries) {
      nextMap[entry.id] = entry;
    }
    this.store.setJson(this.key, nextMap);
  }

  public async clearCache(): Promise<void> {
    this.store.remove(this.key);
  }
}

export class LocalSessionRepository implements SessionRepository {
  private readonly store: SafeKeyValueStore;

  constructor(store: SafeKeyValueStore) {
    this.store = store;
  }

  private userKey(userId: string): string {
    return `sessions:${userId}`;
  }

  private readMap(userId: string): Record<string, FeedSession> {
    const raw = this.store.getJson<Record<string, unknown>>(this.userKey(userId)) ?? {};
    const valid: Record<string, FeedSession> = {};
    for (const [id, entry] of Object.entries(raw)) {
      const parsed = FeedSessionSchema.safeParse(entry);
      if (parsed.success) {
        valid[id] = parsed.data;
      }
    }
    return valid;
  }

  public async create(session: FeedSession): Promise<void> {
    const parsed = FeedSessionSchema.parse(session);
    const map = this.readMap(parsed.userId);
    if (!map[parsed.id]) {
      map[parsed.id] = parsed;
      this.store.setJson(this.userKey(parsed.userId), map);
    }
  }

  public async getById(userId: string, sessionId: string): Promise<FeedSession | null> {
    return this.readMap(userId)[sessionId] ?? null;
  }

  public async getLatestActive(userId: string): Promise<FeedSession | null> {
    const sessions = Object.values(this.readMap(userId))
      .filter((s) => s.status === 'ready' && !s.completedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sessions[0] ?? null;
  }

  public async listRecent(userId: string, limit = 20): Promise<FeedSession[]> {
    return Object.values(this.readMap(userId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  public async update(
    userId: string,
    sessionId: string,
    patch: Partial<FeedSession>
  ): Promise<void> {
    const map = this.readMap(userId);
    const existing = map[sessionId];
    if (!existing) return;
    const merged = FeedSessionSchema.parse({
      ...existing,
      ...patch,
      id: existing.id,
      userId: existing.userId,
    });
    map[sessionId] = merged;
    this.store.setJson(this.userKey(userId), map);
  }
}

export class LocalUserRepository implements UserPreferencesRepository {
  private readonly store: SafeKeyValueStore;

  constructor(store: SafeKeyValueStore) {
    this.store = store;
  }

  private userKey(userId: string): string {
    return `preferences:${userId}`;
  }

  public async get(userId: string): Promise<UserPreferences> {
    const raw = this.store.getJson<unknown>(this.userKey(userId));
    const parsed = UserPreferencesSchema.safeParse(raw);
    if (parsed.success) {
      return parsed.data;
    }
    const defaults = createDefaultUserPreferences(userId);
    this.store.setJson(this.userKey(userId), defaults);
    return defaults;
  }

  public async save(preferences: UserPreferences): Promise<void> {
    const parsed = UserPreferencesSchema.parse(preferences);
    this.store.setJson(this.userKey(parsed.userId), parsed);
  }

  public async reset(userId: string): Promise<UserPreferences> {
    const current = await this.get(userId);
    const fresh = createDefaultUserPreferences(userId);
    const preserved: UserPreferences = {
      ...fresh,
      displayName: current.displayName,
      onboardingCompleted: current.onboardingCompleted,
    };
    this.store.setJson(this.userKey(userId), preserved);
    return preserved;
  }
}

export class LocalInteractionRepository implements InteractionRepository {
  private readonly store: SafeKeyValueStore;

  constructor(store: SafeKeyValueStore) {
    this.store = store;
  }

  private userKey(userId: string): string {
    return `interactions:${userId}`;
  }

  private readList(userId: string): UserInteraction[] {
    const raw = this.store.getJson<unknown[]>(this.userKey(userId)) ?? [];
    const valid: UserInteraction[] = [];
    for (const item of raw) {
      const parsed = UserInteractionSchema.safeParse(item);
      if (parsed.success) {
        valid.push(parsed.data);
      }
    }
    return valid;
  }

  public async record(interaction: UserInteraction): Promise<void> {
    const parsed = UserInteractionSchema.parse(interaction);
    const list = this.readList(parsed.userId);
    list.push(parsed);
    // Append-oriented bounded history for Phase 1 local storage
    this.store.setJson(this.userKey(parsed.userId), list.slice(-500));
  }

  public async listRecent(userId: string, limit = 120): Promise<UserInteraction[]> {
    const list = this.readList(userId);
    return list.slice(-limit).reverse();
  }

  public async clearForUser(userId: string): Promise<void> {
    this.store.remove(this.userKey(userId));
  }
}

export class LocalSavedLibraryRepository implements SavedLibraryRepository {
  private readonly store: SafeKeyValueStore;

  constructor(store: SafeKeyValueStore) {
    this.store = store;
  }

  private collectionsKey(userId: string): string {
    return `saved_collections:${userId}`;
  }

  private itemsKey(userId: string): string {
    return `saved_items:${userId}`;
  }

  public async listCollections(userId: string): Promise<SavedCollection[]> {
    const raw = this.store.getJson<unknown[]>(this.collectionsKey(userId)) ?? [];
    return raw
      .map((entry) => SavedCollectionSchema.safeParse(entry))
      .filter((r): r is { success: true; data: SavedCollection } => r.success)
      .map((r) => r.data);
  }

  public async createCollection(userId: string, collection: SavedCollection): Promise<void> {
    const parsed = SavedCollectionSchema.parse(collection);
    const list = await this.listCollections(userId);
    if (!list.some((col) => col.id === parsed.id)) {
      list.push(parsed);
      this.store.setJson(this.collectionsKey(userId), list);
    }
  }

  public async listSavedItems(userId: string): Promise<SavedItem[]> {
    const raw = this.store.getJson<unknown[]>(this.itemsKey(userId)) ?? [];
    return raw
      .map((entry) => SavedItemSchema.safeParse(entry))
      .filter((r): r is { success: true; data: SavedItem } => r.success)
      .map((r) => r.data);
  }

  public async saveItem(userId: string, item: SavedItem): Promise<void> {
    const parsed = SavedItemSchema.parse(item);
    const list = (await this.listSavedItems(userId)).filter(
      (entry) => entry.contentId !== parsed.contentId
    );
    list.push(parsed);
    this.store.setJson(this.itemsKey(userId), list);
  }

  public async removeItem(userId: string, contentId: string): Promise<void> {
    const list = (await this.listSavedItems(userId)).filter(
      (entry) => entry.contentId !== contentId
    );
    this.store.setJson(this.itemsKey(userId), list);
  }
}

export class LocalVisualAssetRepository implements VisualAssetRepository {
  private readonly store: SafeKeyValueStore;
  private readonly key = 'visual_assets';

  constructor(store: SafeKeyValueStore) {
    this.store = store;
  }

  private readMap(): Record<string, VisualAssetRecord> {
    const raw = this.store.getJson<Record<string, unknown>>(this.key) ?? {};
    const valid: Record<string, VisualAssetRecord> = {};
    for (const [k, entry] of Object.entries(raw)) {
      const parsed = VisualAssetRecordSchema.safeParse(entry);
      if (parsed.success) {
        valid[k] = parsed.data;
      }
    }
    return valid;
  }

  public async findByQueryKey(queryKey: string): Promise<VisualAssetRecord | null> {
    return this.readMap()[queryKey] ?? null;
  }

  public async save(asset: VisualAssetRecord): Promise<void> {
    const parsed = VisualAssetRecordSchema.parse(asset);
    const map = this.readMap();
    map[parsed.queryKey] = parsed;
    this.store.setJson(this.key, map);
  }
}

/**
 * Removes all local persistence records belonging to a specific local/guest user.
 */
export function clearLocalUserData(store: SafeKeyValueStore, userId: string): void {
  store.remove(`preferences:${userId}`);
  store.remove(`sessions:${userId}`);
  store.remove(`interactions:${userId}`);
  store.remove(`saved_collections:${userId}`);
  store.remove(`saved_items:${userId}`);
  store.remove('content_pool');
}
