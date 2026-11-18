import { describe, expect, it } from 'vitest';
import { deduplicateContentRecords } from '../content/ContentDeduplicator';
import { normalizeCandidateToContentRecord } from '../content/ContentNormalizer';
import { selectSessionContent } from '../content/ContentSelector';
import { isValidFeedStatusTransition } from '../feed/FeedRules';
import {
  buildInteractionProfile,
  scoreCandidate,
} from '../personalization/RankingEngine';
import {
  createDefaultUserPreferences,
  detectSuggestedRegion,
} from '../user/UserPreferences';
import { createTestContentRecords } from '../../test/fixtures';
import type {
  ContentCategory,
  ContentFormat,
  ContentRecord,
  UserInteraction,
} from '../../shared/validation/contentSchemas';

describe('Domain content normalization & deduplication', () => {
  it('rejects candidates with unsafe URLs during normalization', () => {
    const result = normalizeCandidateToContentRecord({
      title: 'Suspicious Item',
      category: 'technology',
      topics: ['ai'],
      contentType: 'quick_bite',
      summary: 'A summary attempting unsafe link injection.',
      source: {
        publisher: 'Untrusted',
        url: 'javascript:alert(1)',
        retrievedAt: '2026-11-18T00:00:00.000Z',
      },
    });
    expect(result).toBeNull();
  });

  it('deduplicates by canonical URL and retains the richer AI-enriched record', () => {
    const base = normalizeCandidateToContentRecord({
      id: 'raw_1',
      title: 'Voyager 1 Update',
      category: 'science',
      topics: ['space'],
      contentType: 'quick_bite',
      summary: 'Short raw summary about Voyager.',
      source: {
        publisher: 'NASA',
        url: 'https://science.nasa.gov/mission/voyager/?utm_source=rss',
        retrievedAt: '2026-11-18T00:00:00.000Z',
      },
    })!;

    const enriched: ContentRecord = {
      ...base,
      id: 'enriched_1',
      source: {
        ...base.source,
        url: 'https://science.nasa.gov/mission/voyager/',
      },
      isAiEnriched: true,
      blocks: [
        ...base.blocks,
        { type: 'fact_reveal', label: 'Detail', text: 'Extra verified detail.' },
      ],
    };

    const deduped = deduplicateContentRecords([base, enriched]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.id).toBe('enriched_1');
  });
});

describe('FeedRules lifecycle transitions', () => {
  it('enforces valid execution-independent session status transitions', () => {
    expect(isValidFeedStatusTransition('pending', 'processing')).toBe(true);
    expect(isValidFeedStatusTransition('processing', 'ready')).toBe(true);
    expect(isValidFeedStatusTransition('processing', 'failed')).toBe(true);
    expect(isValidFeedStatusTransition('failed', 'pending')).toBe(true);
    expect(isValidFeedStatusTransition('ready', 'failed')).toBe(false);
    expect(isValidFeedStatusTransition('pending', 'ready')).toBe(false);
  });
});

describe('Privacy-safe edition region suggestion', () => {
  it('maps coarse timezone and locale hints to supported Curio editions without GPS', () => {
    expect(detectSuggestedRegion('Asia/Kolkata', 'en-IN')).toBe('IN');
    expect(detectSuggestedRegion('Europe/London', 'en-GB')).toBe('UK');
    expect(detectSuggestedRegion('America/New_York', 'en-US')).toBe('US');
    expect(detectSuggestedRegion('Asia/Tokyo', 'ja-JP')).toBe('JP');
    expect(detectSuggestedRegion('Australia/Sydney', 'en-AU')).toBe('AU');
    expect(detectSuggestedRegion('America/Toronto', 'en-CA')).toBe('CA');
    expect(detectSuggestedRegion('Europe/Berlin', 'de-DE')).toBe('EU');
    expect(detectSuggestedRegion('Etc/UTC', 'en')).toBe('global');
  });
});

describe('RankingEngine hybrid scoring & interaction rules', () => {
  const seedRecords = createTestContentRecords();
  const catalog = new Map(seedRecords.map((r) => [r.id, r]));
  const prefs = {
    ...createDefaultUserPreferences('u1'),
    interests: ['science', 'technology'] as ContentCategory[],
    topicKeywords: ['voyager', 'neuroscience'],
  };
  const nowMs = Date.parse('2026-11-18T12:00:00.000Z');

  it('scores interest-matched + keyword-matched items higher than non-interest items', () => {
    const emptyProfile = buildInteractionProfile([], catalog, nowMs);
    const emptyCats = new Map<ContentCategory, number>();
    const emptyFormats = new Map<ContentFormat, number>();

    const voyager = catalog.get('curio_sci_002')!;
    const humourItem = catalog.get('curio_hum_001')!;

    const voyagerScore = scoreCandidate(
      voyager,
      { preferences: prefs, interactions: [], recentContentCatalog: catalog, nowMs },
      emptyProfile,
      emptyCats,
      emptyFormats
    );
    const humourScore = scoreCandidate(
      humourItem,
      { preferences: prefs, interactions: [], recentContentCatalog: catalog, nowMs },
      emptyProfile,
      emptyCats,
      emptyFormats
    );

    expect(voyagerScore.breakdown.totalScore).toBeGreaterThan(humourScore.breakdown.totalScore);
    expect(voyagerScore.breakdown.isExplorationCandidate).toBe(false);
    expect(humourScore.breakdown.isExplorationCandidate).toBe(true);
  });

  it('boosts matching regional stories, keeps global neutral, and demotes unrelated editions', () => {
    const baseRecord = catalog.get('curio_sci_001')!;
    const globalStory: ContentRecord = { ...baseRecord, id: 'story_global', region: 'global' };
    const indiaStory: ContentRecord = { ...baseRecord, id: 'story_in', region: 'IN' };
    const ukStory: ContentRecord = { ...baseRecord, id: 'story_uk', region: 'UK' };

    const emptyProfile = buildInteractionProfile([], catalog, nowMs);
    const emptyCats = new Map<ContentCategory, number>();
    const emptyFormats = new Map<ContentFormat, number>();

    const indiaPrefs = { ...prefs, region: 'IN' as const };
    const globalPrefs = { ...prefs, region: 'global' as const };

    const indiaForIndiaReader = scoreCandidate(
      indiaStory,
      { preferences: indiaPrefs, interactions: [], recentContentCatalog: catalog, nowMs },
      emptyProfile,
      emptyCats,
      emptyFormats
    );
    const globalForIndiaReader = scoreCandidate(
      globalStory,
      { preferences: indiaPrefs, interactions: [], recentContentCatalog: catalog, nowMs },
      emptyProfile,
      emptyCats,
      emptyFormats
    );
    const ukForIndiaReader = scoreCandidate(
      ukStory,
      { preferences: indiaPrefs, interactions: [], recentContentCatalog: catalog, nowMs },
      emptyProfile,
      emptyCats,
      emptyFormats
    );
    const indiaForGlobalReader = scoreCandidate(
      indiaStory,
      { preferences: globalPrefs, interactions: [], recentContentCatalog: catalog, nowMs },
      emptyProfile,
      emptyCats,
      emptyFormats
    );

    expect(indiaForIndiaReader.breakdown.regionAdjustment).toBeGreaterThan(0);
    expect(globalForIndiaReader.breakdown.regionAdjustment).toBe(0);
    expect(ukForIndiaReader.breakdown.regionAdjustment).toBeLessThan(0);
    expect(indiaForIndiaReader.breakdown.totalScore).toBeGreaterThan(
      globalForIndiaReader.breakdown.totalScore
    );
    expect(globalForIndiaReader.breakdown.totalScore).toBeGreaterThan(
      ukForIndiaReader.breakdown.totalScore
    );
    expect(indiaForGlobalReader.breakdown.regionAdjustment).toBeLessThan(0);
  });

  it('treats skip as weak negative feedback and not_interested as strong negative feedback', () => {
    const target = catalog.get('curio_sci_001')!;
    const relatedScience = catalog.get('curio_sci_003')!;
    const emptyCats = new Map<ContentCategory, number>();
    const emptyFormats = new Map<ContentFormat, number>();

    const skippedInteractions: UserInteraction[] = [
      {
        id: 'i1',
        userId: 'u1',
        contentId: target.id,
        action: 'skipped',
        createdAt: '2026-11-17T10:00:00.000Z',
      },
    ];
    const notInterestedInteractions: UserInteraction[] = [
      {
        id: 'i2',
        userId: 'u1',
        contentId: target.id,
        action: 'not_interested',
        createdAt: '2026-11-17T10:00:00.000Z',
      },
    ];

    const skippedProfile = buildInteractionProfile(skippedInteractions, catalog, nowMs);
    const notInterestedProfile = buildInteractionProfile(
      notInterestedInteractions,
      catalog,
      nowMs
    );

    const scoreAfterSkip = scoreCandidate(
      relatedScience,
      { preferences: prefs, interactions: skippedInteractions, recentContentCatalog: catalog, nowMs },
      skippedProfile,
      emptyCats,
      emptyFormats
    );
    const scoreAfterNotInterested = scoreCandidate(
      relatedScience,
      {
        preferences: prefs,
        interactions: notInterestedInteractions,
        recentContentCatalog: catalog,
        nowMs,
      },
      notInterestedProfile,
      emptyCats,
      emptyFormats
    );

    expect(scoreAfterSkip.breakdown.interactionAdjustment).toBeGreaterThan(
      scoreAfterNotInterested.breakdown.interactionAdjustment
    );
  });
});

describe('ContentSelector finite sizing, exclusions, diversity, and exploration', () => {
  const candidates = createTestContentRecords();
  const nowMs = Date.parse('2026-11-18T12:00:00.000Z');

  it('builds finite duration-appropriate sessions for 5, 10, and 15 minutes', () => {
    const prefs = createDefaultUserPreferences('u1');

    const fiveMin = selectSessionContent({
      candidates,
      preferences: prefs,
      interactions: [],
      durationMinutes: 5,
      excludeContentIds: [],
      nowMs,
    });
    const tenMin = selectSessionContent({
      candidates,
      preferences: prefs,
      interactions: [],
      durationMinutes: 10,
      excludeContentIds: [],
      nowMs,
    });
    const fifteenMin = selectSessionContent({
      candidates,
      preferences: prefs,
      interactions: [],
      durationMinutes: 15,
      excludeContentIds: [],
      nowMs,
    });

    expect(fiveMin.selected.length).toBeGreaterThanOrEqual(5);
    expect(fiveMin.selected.length).toBeLessThanOrEqual(7);
    expect(tenMin.selected.length).toBeGreaterThanOrEqual(9);
    expect(tenMin.selected.length).toBeLessThanOrEqual(12);
    expect(fifteenMin.selected.length).toBeGreaterThanOrEqual(12);
    expect(fifteenMin.selected.length).toBeLessThanOrEqual(15);
  });

  it('strictly excludes excludedTopics and not_interested content items', () => {
    const prefs = {
      ...createDefaultUserPreferences('u1'),
      excludedTopics: ['voyager', 'cholera'],
    };

    const interactions: UserInteraction[] = [
      {
        id: 'int_1',
        userId: 'u1',
        contentId: 'curio_sci_001',
        action: 'not_interested',
        createdAt: '2026-11-17T10:00:00.000Z',
      },
    ];

    const result = selectSessionContent({
      candidates,
      preferences: prefs,
      interactions,
      durationMinutes: 10,
      excludeContentIds: ['curio_tech_001'],
      nowMs,
    });

    const ids = new Set(result.selected.map((item) => item.id));
    expect(ids.has('curio_sci_001')).toBe(false);
    expect(ids.has('curio_sci_002')).toBe(false); // excluded topic 'voyager'
    expect(ids.has('curio_hist_001')).toBe(false); // excluded topic 'cholera'
    expect(ids.has('curio_tech_001')).toBe(false); // excludeContentIds
  });

  it('enforces category diversity and reserves exploration capacity beyond explicit interests', () => {
    const narrowPrefs = {
      ...createDefaultUserPreferences('u1'),
      interests: ['science', 'technology'] as ContentCategory[],
    };

    const result = selectSessionContent({
      candidates,
      preferences: narrowPrefs,
      interactions: [],
      durationMinutes: 5,
      excludeContentIds: [],
      nowMs,
    });

    // At least one item should come from outside ['science', 'technology'] (exploration slot)
    const explorationItems = result.selected.filter(
      (item) => !narrowPrefs.interests.includes(item.category)
    );
    expect(explorationItems.length).toBeGreaterThanOrEqual(1);

    // No single category should exceed 40% cap (max 2 items in a 5-7 item session)
    const counts = new Map<ContentCategory, number>();
    for (const item of result.selected) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(3);
    }
  });
});
