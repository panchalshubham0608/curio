import { deduplicateContentRecords } from '../../domain/content/ContentDeduplicator';
import { normalizeCandidateToContentRecord } from '../../domain/content/ContentNormalizer';
import { selectSessionContent } from '../../domain/content/ContentSelector';
import type {
  FeedGenerationRequest,
  FeedGenerationResult,
  GeneratedFeed,
} from '../../domain/feed/Feed';
import { SESSION_DURATION_TARGETS } from '../../domain/feed/FeedRules';
import { mapFirebaseError } from '../../shared/errors/firebaseErrorMapper';
import { logInfo, logWarn } from '../../shared/utils/logger';
import { withRetry, withTimeout } from '../../shared/utils/retry';
import {
  CURRENT_FEED_VERSION,
  type ContentCategory,
  type ContentRecord,
  type FeedSession,
} from '../../shared/validation/contentSchemas';
import type {
  AIEnrichmentProvider,
  ContentProvider,
  ContentRepository,
  InteractionRepository,
  SessionRepository,
  UserPreferencesRepository,
  VisualAssetResolver,
} from '../ports';

export interface FeedOrchestratorDeps {
  contentProvider: ContentProvider;
  contentRepository: ContentRepository;
  sessionRepository: SessionRepository;
  preferencesRepository: UserPreferencesRepository;
  interactionRepository: InteractionRepository;
  aiProvider: AIEnrichmentProvider;
  visualAssetResolver: VisualAssetResolver;
  generationMode: 'on_demand' | 'background';
}

const DISCOVERY_TIMEOUT_MS = 6_000;
const ENRICHMENT_TIMEOUT_MS = 10_000;
const GENERATION_VERSION = 'curio-phase1-v1';

/**
 * Shared feed generation workflow usable by both Phase 1 OnDemandFeedExecutor
 * and a future Phase 2 BackgroundFeedExecutor without diverging business rules.
 */
export class FeedOrchestrator {
  private readonly deps: FeedOrchestratorDeps;

  constructor(deps: FeedOrchestratorDeps) {
    this.deps = deps;
  }

  public async execute(request: FeedGenerationRequest): Promise<FeedGenerationResult> {
    const startedMs = Date.now();
    const nowIso = new Date(startedMs).toISOString();

    // Idempotency guard: if this sessionId already exists and is ready or in-flight, do not duplicate it.
    const existing = await this.deps.sessionRepository.getById(
      request.userId,
      request.sessionId
    );
    if (existing) {
      if (existing.status === 'ready') {
        const items = await this.loadOrderedSessionItems(existing);
        return {
          sessionId: existing.id,
          status: 'ready',
          feed: this.buildGeneratedFeed(existing, items),
        };
      }
      if (existing.status === 'processing' || existing.status === 'pending') {
        return {
          sessionId: existing.id,
          status: existing.status,
        };
      }
      // If previously failed, allow idempotent retry on the same sessionId
      await this.deps.sessionRepository.update(request.userId, existing.id, {
        status: 'pending',
        error: undefined,
      });
    } else {
      const initialSession: FeedSession = {
        id: request.sessionId,
        userId: request.userId,
        status: 'pending',
        generationMode: this.deps.generationMode,
        durationMinutes: request.durationMinutes,
        feedVersion: CURRENT_FEED_VERSION,
        topicFocus: request.topicFocus,
        categoryFocus: request.categoryFocus,
        itemRefs: [],
        currentIndex: 0,
        completedItemIds: [],
        createdAt: nowIso,
      };
      await this.deps.sessionRepository.create(initialSession);
    }

    try {
      await this.deps.sessionRepository.update(request.userId, request.sessionId, {
        status: 'processing',
        startedAt: new Date().toISOString(),
      });

      const [preferences, interactions, cachedPool] = await Promise.all([
        this.deps.preferencesRepository.get(request.userId),
        this.deps.interactionRepository.listRecent(request.userId, 120),
        this.deps.contentRepository.findCandidates({ limit: 80 }),
      ]);

      const target = SESSION_DURATION_TARGETS[request.durationMinutes];
      const desiredPoolSize = Math.max(target.maxItems * 2, 20);
      let servedFromFallback = false;
      let discoveredRecords: ContentRecord[] = [];

      const categoriesToDiscover: ContentCategory[] = request.categoryFocus
        ? [request.categoryFocus]
        : preferences.interests;

      const needsDiscovery =
        cachedPool.length < desiredPoolSize ||
        Boolean(request.topicFocus) ||
        Boolean(request.categoryFocus);

      if (needsDiscovery) {
        try {
          const candidates = await withRetry(
            () =>
              withTimeout(
                () =>
                  this.deps.contentProvider.discover({
                    categories: categoriesToDiscover,
                    topicKeywords: preferences.topicKeywords,
                    limit: 30,
                    topicFocus: request.topicFocus,
                  }),
                DISCOVERY_TIMEOUT_MS
              ),
            { maxAttempts: 2, baseDelayMs: 250 }
          );

          discoveredRecords = candidates
            .map((candidate) => normalizeCandidateToContentRecord(candidate))
            .filter((record): record is ContentRecord => record !== null);
        } catch {
          // Graceful fallback: rely on cached/previously enriched pool if live discovery fails
          servedFromFallback = true;
          logWarn('Live content discovery failed; falling back to cached content pool');
        }
      }

      const mergedCandidates = deduplicateContentRecords([
        ...cachedPool,
        ...discoveredRecords,
      ]);

      const selection = selectSessionContent({
        candidates: mergedCandidates,
        preferences,
        interactions,
        durationMinutes: request.durationMinutes,
        excludeContentIds: request.excludeContentIds,
        topicFocus: request.topicFocus,
        categoryFocus: request.categoryFocus,
      });

      if (selection.selected.length === 0) {
        const errorInfo = {
          code: 'EMPTY_CANDIDATE_POOL',
          message: 'No eligible discoveries matched your current filters. Try adjusting excluded topics.',
        };
        await this.deps.sessionRepository.update(request.userId, request.sessionId, {
          status: 'failed',
          error: errorInfo,
        });
        return {
          sessionId: request.sessionId,
          status: 'failed',
          error: errorInfo,
        };
      }

      // Per-item enrichment & visual resolution with fault isolation:
      // one failing item never breaks the entire session.
      const finalizedItems: ContentRecord[] = await Promise.all(
        selection.selected.map(async (item) => {
          let workingItem = item;
          if (!workingItem.isAiEnriched) {
            try {
              workingItem = await withTimeout(
                () => this.deps.aiProvider.enrich({ record: workingItem }),
                ENRICHMENT_TIMEOUT_MS
              );
            } catch {
              servedFromFallback = true;
              logWarn('AI enrichment failed for content item; using base structured record', {
                contentId: workingItem.id,
              });
            }
          }

          try {
            const resolvedVisual = await this.deps.visualAssetResolver.resolve(workingItem);
            workingItem = {
              ...workingItem,
              visual: resolvedVisual,
              visualAssetId: resolvedVisual.assetId ?? workingItem.visualAssetId,
            };
          } catch {
            logWarn('Visual asset resolution failed; preserving fallback visual', {
              contentId: workingItem.id,
            });
          }

          return workingItem;
        })
      );

      // Persist all newly discovered & enriched content records to the shared cache pool
      const toPersist = deduplicateContentRecords([...discoveredRecords, ...finalizedItems]);
      await this.deps.contentRepository.saveMany(toPersist);

      const itemRefs = finalizedItems.map((item, position) => ({
        contentId: item.id,
        position,
      }));

      const latencyMs = Date.now() - startedMs;
      const metadata: FeedSession['metadata'] = {
        candidateCount: mergedCandidates.length,
        selectedCount: finalizedItems.length,
        model: this.deps.aiProvider.modelName,
        generationVersion: GENERATION_VERSION,
        servedFromFallback,
        latencyMs,
      };

      await this.deps.sessionRepository.update(request.userId, request.sessionId, {
        status: 'ready',
        itemRefs,
        metadata,
        error: undefined,
      });

      const updatedSession = await this.deps.sessionRepository.getById(
        request.userId,
        request.sessionId
      );

      const readySession: FeedSession = updatedSession ?? {
        id: request.sessionId,
        userId: request.userId,
        status: 'ready',
        generationMode: this.deps.generationMode,
        durationMinutes: request.durationMinutes,
        feedVersion: CURRENT_FEED_VERSION,
        topicFocus: request.topicFocus,
        categoryFocus: request.categoryFocus,
        itemRefs,
        currentIndex: 0,
        completedItemIds: [],
        createdAt: nowIso,
        startedAt: nowIso,
        metadata,
      };

      logInfo('Feed session generated', {
        durationMinutes: request.durationMinutes,
        selectedCount: finalizedItems.length,
        latencyMs,
      });

      return {
        sessionId: readySession.id,
        status: 'ready',
        feed: this.buildGeneratedFeed(readySession, finalizedItems),
      };
    } catch (error: unknown) {
      const mapped = mapFirebaseError(error, 'firestore');
      const errorInfo = {
        code: mapped.code || 'FEED_GENERATION_FAILED',
        message: mapped.message,
      };
      try {
        await this.deps.sessionRepository.update(request.userId, request.sessionId, {
          status: 'failed',
          error: errorInfo,
        });
      } catch {
        logWarn('Could not persist failed session state to repository', {
          code: mapped.code,
        });
      }
      return {
        sessionId: request.sessionId,
        status: 'failed',
        error: errorInfo,
      };
    }
  }

  private async loadOrderedSessionItems(session: FeedSession): Promise<ContentRecord[]> {
    const sortedRefs = [...session.itemRefs].sort((a, b) => a.position - b.position);
    const records = await this.deps.contentRepository.getByIds(
      sortedRefs.map((ref) => ref.contentId)
    );
    const byId = new Map(records.map((item) => [item.id, item]));
    return sortedRefs
      .map((ref) => byId.get(ref.contentId))
      .filter((item): item is ContentRecord => item !== undefined);
  }

  private buildGeneratedFeed(session: FeedSession, items: ContentRecord[]): GeneratedFeed {
    const totalEstimatedSeconds = items.reduce(
      (sum, item) => sum + item.estimatedDurationSeconds,
      0
    );
    const categoriesCovered = Array.from(new Set(items.map((item) => item.category)));

    return {
      session,
      items,
      totalEstimatedSeconds,
      categoriesCovered,
    };
  }
}
