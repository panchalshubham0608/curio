import { describe, expect, it, vi } from 'vitest';
import { AskContentQuestionUseCase, RateLimitExceededError } from '../ai/AskContentQuestion';
import { FeedOrchestrator } from '../feed/FeedOrchestrator';
import { GetSessionUseCase } from '../feed/GetSession';
import {
  GetSavedLibraryUseCase,
  SaveContentUseCase,
} from '../library/SavedLibraryUseCases';
import type { AIEnrichmentProvider, ContentProvider } from '../ports';
import { LocalFallbackAIProvider } from '../../infrastructure/ai/LocalFallbackAIProvider';
import { VisualAssetService } from '../../infrastructure/assets/VisualAssetService';
import {
  createTestContentRecords,
  TestContentProvider,
} from '../../test/fixtures';
import { parseRssXmlSafely } from '../../infrastructure/content/RssContentProvider';
import { OnDemandFeedExecutor } from '../../infrastructure/execution/OnDemandFeedExecutor';
import {
  LocalContentRepository,
  LocalInteractionRepository,
  LocalSavedLibraryRepository,
  LocalSessionRepository,
  LocalUserRepository,
  LocalVisualAssetRepository,
} from '../../infrastructure/persistence/LocalRepositories';
import { SafeKeyValueStore } from '../../infrastructure/persistence/LocalStorageStore';
import { RateLimiter } from '../../shared/utils/rateLimiter';

function createInMemoryRepos() {
  const store = new SafeKeyValueStore('test_suite', false);
  return {
    contentRepo: new LocalContentRepository(store),
    sessionRepo: new LocalSessionRepository(store),
    userRepo: new LocalUserRepository(store),
    interactionRepo: new LocalInteractionRepository(store),
    libraryRepo: new LocalSavedLibraryRepository(store),
    visualRepo: new LocalVisualAssetRepository(store),
  };
}

describe('OnDemandFeedExecutor & FeedOrchestrator workflow', () => {
  it('generates an idempotent finite session and restores it cleanly across refreshes', async () => {
    const repos = createInMemoryRepos();
    const orchestrator = new FeedOrchestrator({
      contentProvider: new TestContentProvider(),
      contentRepository: repos.contentRepo,
      sessionRepository: repos.sessionRepo,
      preferencesRepository: repos.userRepo,
      interactionRepository: repos.interactionRepo,
      aiProvider: new LocalFallbackAIProvider(),
      visualAssetResolver: new VisualAssetService(repos.visualRepo),
      generationMode: 'on_demand',
    });
    const executor = new OnDemandFeedExecutor(orchestrator);

    const request = {
      userId: 'reader_1',
      sessionId: 'sess_idempotent_001',
      durationMinutes: 5 as const,
      excludeContentIds: [],
    };

    // Concurrent calls with identical sessionId coalesce into one execution
    const [first, second] = await Promise.all([
      executor.generate(request),
      executor.generate(request),
    ]);

    expect(first.status).toBe('ready');
    expect(second.status).toBe('ready');
    expect(first.feed?.items.length).toBeGreaterThanOrEqual(5);
    expect(second.feed?.items.map((i) => i.id)).toEqual(first.feed?.items.map((i) => i.id));

    // Subsequent call with same sessionId returns persisted session without creating duplicates
    const third = await executor.generate(request);
    expect(third.feed?.items.map((i) => i.id)).toEqual(first.feed?.items.map((i) => i.id));

    const recentSessions = await repos.sessionRepo.listRecent('reader_1');
    expect(recentSessions).toHaveLength(1);

    // GetSessionUseCase reconstructs the persisted session cleanly (refresh resilience)
    const getSession = new GetSessionUseCase(repos.sessionRepo, repos.contentRepo);
    const restored = await getSession.execute('reader_1', 'sess_idempotent_001');
    expect(restored?.session.status).toBe('ready');
    expect(restored?.feed?.items.map((i) => i.id)).toEqual(first.feed?.items.map((i) => i.id));
  });

  it('falls back gracefully to cached content when live discovery and single-item AI enrichment fail', async () => {
    const repos = createInMemoryRepos();
    // Seed cache with unenriched records so enrichment gets exercised
    const cachedRecords = createTestContentRecords()
      .slice(0, 8)
      .map((item) => ({ ...item, isAiEnriched: false }));
    await repos.contentRepo.saveMany(cachedRecords);

    const failingDiscoveryProvider: ContentProvider = {
      name: 'broken_live_source',
      discover: vi.fn().mockRejectedValue(new Error('Network offline')),
    };

    let enrichCalls = 0;
    const flakyAIProvider: AIEnrichmentProvider = {
      modelName: 'flaky-test-model',
      isRemoteAI: true,
      enrich: vi.fn(async ({ record }) => {
        enrichCalls += 1;
        if (enrichCalls === 1) {
          throw new Error('Single item AI timeout');
        }
        return { ...record, isAiEnriched: true, enrichedAt: new Date().toISOString() };
      }),
      answerQuestion: new LocalFallbackAIProvider().answerQuestion.bind(
        new LocalFallbackAIProvider()
      ),
    };

    const orchestrator = new FeedOrchestrator({
      contentProvider: failingDiscoveryProvider,
      contentRepository: repos.contentRepo,
      sessionRepository: repos.sessionRepo,
      preferencesRepository: repos.userRepo,
      interactionRepository: repos.interactionRepo,
      aiProvider: flakyAIProvider,
      visualAssetResolver: new VisualAssetService(repos.visualRepo),
      generationMode: 'on_demand',
    });

    const result = await orchestrator.execute({
      userId: 'reader_fallback',
      sessionId: 'sess_fallback_001',
      durationMinutes: 5,
      excludeContentIds: [],
    });

    expect(result.status).toBe('ready');
    expect(result.feed?.items.length).toBeGreaterThanOrEqual(5);
    expect(result.feed?.session.metadata?.servedFromFallback).toBe(true);
  });
});

describe('AskContentQuestion, SavedLibrary, and Safe RSS parsing', () => {
  it('returns grounded answers, flags out-of-scope questions, and enforces rate limits', async () => {
    const record = createTestContentRecords()[0]!;
    const askUseCase = new AskContentQuestionUseCase(
      new LocalFallbackAIProvider(),
      new RateLimiter(2, 60_000)
    );

    const simple = await askUseCase.execute({
      userId: 'u1',
      record,
      action: 'explain_simply',
    });
    expect(simple.groundedInSource).toBe(true);
    expect(simple.references[0]?.url).toBe(record.source.url);

    const outOfScope = await askUseCase.execute({
      userId: 'u1',
      record,
      action: 'custom',
      customQuestion: 'What is the GDP of Mars in 2099?',
    });
    expect(outOfScope.groundedInSource).toBe(false);
    expect(outOfScope.uncertaintyNote).toBeTruthy();

    await expect(
      askUseCase.execute({
        userId: 'u1',
        record,
        action: 'why_it_matters',
      })
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it('seeds default collections and supports saving, creating collections, and removing items', async () => {
    const repos = createInMemoryRepos();
    const getLibrary = new GetSavedLibraryUseCase(repos.libraryRepo, repos.contentRepo);
    const saveContent = new SaveContentUseCase(
      repos.libraryRepo,
      repos.contentRepo,
      repos.interactionRepo
    );

    const initial = await getLibrary.execute('u1');
    expect(initial.collections.map((c) => c.name)).toContain("Interesting Things I've Learned");
    expect(initial.collections.map((c) => c.name)).toContain('Read Later');

    const record = createTestContentRecords()[0]!;
    await saveContent.save('u1', record, 'col_learned', 'sess_1');
    const customCol = await saveContent.createCollection('u1', 'Weekend Deep Dives');

    const afterSave = await getLibrary.execute('u1');
    expect(afterSave.entries).toHaveLength(1);
    expect(afterSave.collections.some((c) => c.id === customCol.id)).toBe(true);

    await saveContent.remove('u1', record.id);
    const afterRemove = await getLibrary.execute('u1');
    expect(afterRemove.entries).toHaveLength(0);
  });

  it('safely parses RSS XML, strips HTML, and rejects javascript/http links', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0"><channel>
        <item>
          <title>Safe &lt;b&gt;Space&lt;/b&gt; Story</title>
          <link>https://www.nasa.gov/missions/safe-story</link>
          <description><![CDATA[<p>Valid summary<script>alert(1)</script></p>]]></description>
        </item>
        <item>
          <title>Malicious Link Item</title>
          <link>javascript:alert(1)</link>
          <description>Should be dropped</description>
        </item>
      </channel></rss>`;

    const items = parseRssXmlSafely(xml, {
      publisher: 'NASA Breaking News',
      url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
      category: 'science',
      defaultTopics: ['space'],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('Safe Space Story');
    expect(items[0]?.summary).not.toContain('<script>');
    expect(items[0]?.source.url).toBe('https://www.nasa.gov/missions/safe-story');
  });
});
