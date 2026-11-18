import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import type { ContentDiscoveryRequest, ContentProvider } from '../../application/ports';
import type { ContentCandidate } from '../../domain/content/Content';
import { withBasePath } from '../../shared/utils/assetUrl';
import {
  ContentRecordSchema,
  type ContentRecord,
} from '../../shared/validation/contentSchemas';

interface GeneratedFeedEnvelope {
  items?: unknown[];
}

const FEED_ENDPOINT = withBasePath('/generated/feed.json');
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Loads scheduled AI textual feed items from live Firestore `/content` (published via
 * Firebase Admin SDK) with graceful fallback to static `/curio/generated/feed.json`.
 * Validates every record strictly against ContentRecordSchema.
 */
export class GeneratedFeedProvider implements ContentProvider {
  public readonly name = 'scheduled_gemini_textual_feed';
  private readonly firestore: Firestore | null;
  private readonly loadFromFirestoreOverride: (() => Promise<unknown[]>) | null;
  private readonly fetchImpl: typeof fetch | null;
  private readonly enableRemoteGenerated: boolean;
  private readonly hasCustomFetch: boolean;
  private cachedRecords: ContentRecord[] | null = null;
  private cachedAtMs = 0;

  constructor(options?: {
    firestore?: Firestore | null;
    loadFromFirestore?: () => Promise<unknown[]>;
    fetchImpl?: typeof fetch;
    enableRemoteGenerated?: boolean;
  }) {
    this.firestore = options?.firestore ?? null;
    this.loadFromFirestoreOverride = options?.loadFromFirestore ?? null;
    this.hasCustomFetch = Boolean(options?.fetchImpl);
    this.fetchImpl =
      options?.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.enableRemoteGenerated = options?.enableRemoteGenerated ?? true;
  }

  private async readRawFirestoreRecords(): Promise<unknown[]> {
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

    const colRef = collection(this.firestore, 'content');
    try {
      const snap = await getDocs(query(colRef, orderBy('createdAt', 'desc'), fsLimit(80)));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    } catch {
      return [];
    }
  }

  private async readRawStaticRecords(): Promise<unknown[]> {
    if (!this.enableRemoteGenerated || !this.fetchImpl) {
      return [];
    }

    let requestUrl = FEED_ENDPOINT;
    if (this.hasCustomFetch) {
      requestUrl = `https://curio.local${FEED_ENDPOINT}`;
    } else if (typeof window !== 'undefined') {
      const origin = window.location?.origin;
      if (!origin || origin === 'null' || !/^https?:\/\//i.test(origin)) {
        return [];
      }
      requestUrl = `${origin}${FEED_ENDPOINT}`;
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
      const envelope = (await response.json()) as GeneratedFeedEnvelope;
      return Array.isArray(envelope?.items) ? envelope.items : [];
    } catch {
      return [];
    }
  }

  private async loadValidatedRecords(): Promise<ContentRecord[]> {
    if (
      this.cachedRecords &&
      this.cachedRecords.length > 0 &&
      Date.now() - this.cachedAtMs < CACHE_TTL_MS
    ) {
      return this.cachedRecords;
    }

    const [firestoreRaw, staticRaw] = await Promise.all([
      this.readRawFirestoreRecords(),
      this.readRawStaticRecords(),
    ]);

    const validated: ContentRecord[] = [];
    const seenIds = new Set<string>();

    // Prefer live Firestore content first, then merge static fallback entries
    for (const rawItem of [...firestoreRaw, ...staticRaw]) {
      const parsed = ContentRecordSchema.safeParse(rawItem);
      if (parsed.success && !seenIds.has(parsed.data.id)) {
        seenIds.add(parsed.data.id);
        validated.push(parsed.data);
      }
    }

    if (validated.length > 0) {
      this.cachedRecords = validated;
      this.cachedAtMs = Date.now();
    } else {
      this.cachedRecords = null;
    }
    return validated;
  }

  public async discover(input: ContentDiscoveryRequest): Promise<ContentCandidate[]> {
    const records = await this.loadValidatedRecords();
    if (records.length === 0) return [];

    const focus = input.topicFocus?.toLowerCase();
    const ordered = [...records].sort((a, b) => {
      if (focus) {
        const aHit = `${a.title} ${a.topics.join(' ')} ${a.summary}`.toLowerCase().includes(focus)
          ? 1
          : 0;
        const bHit = `${b.title} ${b.topics.join(' ')} ${b.summary}`.toLowerCase().includes(focus)
          ? 1
          : 0;
        if (aHit !== bHit) return bHit - aHit;
      }
      const aCat = input.categories.includes(a.category) ? 1 : 0;
      const bCat = input.categories.includes(b.category) ? 1 : 0;
      if (aCat !== bCat) return bCat - aCat;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return ordered.slice(0, Math.max(input.limit, records.length)).map((record) => ({
      id: record.id,
      title: record.title,
      subtitle: record.subtitle,
      category: record.category,
      topics: record.topics,
      contentType: record.contentType,
      cardVariant: record.cardVariant,
      summary: record.summary,
      source: record.source,
      visual: record.visual,
      estimatedDurationSeconds: record.estimatedDurationSeconds,
      preEnrichedRecord: record,
    }));
  }
}
