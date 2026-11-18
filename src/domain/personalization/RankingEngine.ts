import type {
  ContentCategory,
  ContentFormat,
  ContentRecord,
  UserInteraction,
  UserPreferences,
} from '../../shared/validation/contentSchemas';
import { FEED_POLICY } from '../feed/FeedRules';
import { getPreferredFormatsForMix } from '../user/UserPreferences';

export interface RankingContext {
  preferences: UserPreferences;
  interactions: UserInteraction[];
  recentContentCatalog?: ReadonlyMap<string, ContentRecord>;
  topicFocus?: string;
  categoryFocus?: ContentCategory;
  nowMs?: number;
}

export interface ScoreBreakdown {
  interestScore: number;
  formatScore: number;
  freshnessScore: number;
  noveltyScore: number;
  diversityScore: number;
  interactionAdjustment: number;
  recencyPenalty: number;
  totalScore: number;
  isExplorationCandidate: boolean;
}

export interface ScoredCandidate {
  record: ContentRecord;
  breakdown: ScoreBreakdown;
}

export const RANKING_WEIGHTS = {
  interest: 0.35,
  format: 0.2,
  freshness: 0.15,
  novelty: 0.15,
  diversity: 0.15,
} as const;

interface InteractionProfile {
  seenContentIds: Set<string>;
  recentContentIds: Set<string>;
  notInterestedContentIds: Set<string>;
  skippedContentIds: Set<string>;
  categoryAffinity: Map<ContentCategory, number>;
  topicAffinity: Map<string, number>;
  recentCategoryCount: Map<ContentCategory, number>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildInteractionProfile(
  interactions: UserInteraction[],
  catalog: ReadonlyMap<string, ContentRecord> | undefined,
  nowMs: number
): InteractionProfile {
  const seenContentIds = new Set<string>();
  const recentContentIds = new Set<string>();
  const notInterestedContentIds = new Set<string>();
  const skippedContentIds = new Set<string>();
  const categoryAffinity = new Map<ContentCategory, number>();
  const topicAffinity = new Map<string, number>();
  const recentCategoryCount = new Map<ContentCategory, number>();

  const recencyCutoffMs = nowMs - FEED_POLICY.recencyWindowDays * 24 * 60 * 60 * 1000;

  for (const interaction of interactions) {
    seenContentIds.add(interaction.contentId);
    const createdMs = Date.parse(interaction.createdAt);
    const isRecent = !Number.isNaN(createdMs) && createdMs >= recencyCutoffMs;
    if (isRecent) {
      recentContentIds.add(interaction.contentId);
    }

    if (interaction.action === 'not_interested') {
      notInterestedContentIds.add(interaction.contentId);
    } else if (interaction.action === 'skipped') {
      skippedContentIds.add(interaction.contentId);
    }

    const record = catalog?.get(interaction.contentId);
    if (!record) continue;

    if (isRecent && (interaction.action === 'opened' || interaction.action === 'completed')) {
      recentCategoryCount.set(
        record.category,
        (recentCategoryCount.get(record.category) ?? 0) + 1
      );
    }

    let signal = 0;
    switch (interaction.action) {
      case 'saved':
        signal = 0.08;
        break;
      case 'liked':
        signal = 0.1;
        break;
      case 'completed':
        signal = 0.05;
        break;
      case 'skipped':
        // Blueprint rule: a skip is weak negative feedback, not proof of dislike
        signal = -0.02;
        break;
      case 'not_interested':
        // Blueprint rule: explicit not_interested is stronger negative feedback
        signal = -0.18;
        break;
      case 'opened':
      default:
        // Blueprint rule: do not treat opening/dwell alone as positive preference
        signal = 0;
        break;
    }

    if (signal !== 0) {
      categoryAffinity.set(
        record.category,
        clamp((categoryAffinity.get(record.category) ?? 0) + signal, -0.35, 0.2)
      );
      for (const topic of record.topics) {
        const key = topic.toLowerCase();
        topicAffinity.set(key, clamp((topicAffinity.get(key) ?? 0) + signal, -0.35, 0.2));
      }
    }
  }

  return {
    seenContentIds,
    recentContentIds,
    notInterestedContentIds,
    skippedContentIds,
    categoryAffinity,
    topicAffinity,
    recentCategoryCount,
  };
}

function computeInterestScore(
  record: ContentRecord,
  context: RankingContext
): { score: number; isExploration: boolean } {
  const { preferences, categoryFocus, topicFocus } = context;
  const searchable = `${record.title} ${record.subtitle ?? ''} ${record.summary} ${record.topics.join(' ')}`.toLowerCase();

  if (categoryFocus && record.category === categoryFocus) {
    return { score: 1.0, isExploration: false };
  }

  if (topicFocus) {
    const tokens = topicFocus
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    if (tokens.length > 0 && tokens.some((token) => searchable.includes(token))) {
      return { score: 0.98, isExploration: false };
    }
  }

  const matchesCategory = preferences.interests.includes(record.category);
  const keywordHits = preferences.topicKeywords.filter((kw) =>
    searchable.includes(kw.toLowerCase())
  ).length;
  const keywordBoost = Math.min(0.25, keywordHits * 0.15);

  if (matchesCategory) {
    return {
      score: clamp(0.75 + keywordBoost, 0, 1),
      isExploration: false,
    };
  }

  if (keywordHits > 0) {
    return {
      score: clamp(0.55 + keywordBoost, 0, 1),
      isExploration: true,
    };
  }

  return {
    score: 0.25,
    isExploration: true,
  };
}

function computeFormatScore(record: ContentRecord, preferences: UserPreferences): number {
  const preferredFormats: ContentFormat[] =
    preferences.preferredFormats.length > 0
      ? preferences.preferredFormats
      : getPreferredFormatsForMix(preferences.preferredMix);

  const hasInteractiveBlocks = record.blocks.some(
    (block) =>
      block.type === 'quiz' ||
      block.type === 'fact_reveal' ||
      block.type === 'timeline' ||
      block.type === 'comparison'
  );

  if (preferredFormats.includes(record.contentType)) {
    return hasInteractiveBlocks ? 1.0 : 0.85;
  }

  return hasInteractiveBlocks ? 0.65 : 0.45;
}

function computeFreshnessScore(record: ContentRecord, nowMs: number): number {
  const dateStr = record.source.publishedAt ?? record.createdAt;
  const publishedMs = Date.parse(dateStr);
  if (Number.isNaN(publishedMs)) {
    return 0.65;
  }

  const ageDays = Math.max(0, (nowMs - publishedMs) / (24 * 60 * 60 * 1000));

  // Current affairs decays quicker; evergreen discovery decays slowly with a strong floor
  if (record.category === 'news') {
    return clamp(1 - ageDays / 21, 0.25, 1.0);
  }
  return clamp(1 - ageDays / 365, 0.6, 1.0);
}

function computeNoveltyScore(record: ContentRecord, profile: InteractionProfile): number {
  if (profile.seenContentIds.has(record.id)) {
    return 0.15;
  }
  const recentSameCategory = profile.recentCategoryCount.get(record.category) ?? 0;
  // Gentle decay if the user has seen a lot of this category recently
  return clamp(1.0 - recentSameCategory * 0.12, 0.35, 1.0);
}

export function computeDiversityScore(
  record: ContentRecord,
  selectedCategoryCounts: ReadonlyMap<ContentCategory, number>,
  selectedFormatCounts: ReadonlyMap<ContentFormat, number>
): number {
  const catCount = selectedCategoryCounts.get(record.category) ?? 0;
  const formatCount = selectedFormatCounts.get(record.contentType) ?? 0;

  const categoryComponent = catCount === 0 ? 1.0 : catCount === 1 ? 0.55 : 0.15;
  const formatComponent = formatCount === 0 ? 1.0 : formatCount === 1 ? 0.65 : 0.3;

  return clamp(categoryComponent * 0.7 + formatComponent * 0.3, 0, 1);
}

/**
 * Computes deterministic hybrid ranking score:
 * Score = 0.35*I + 0.20*F + 0.15*R + 0.15*N + 0.15*D + interactionAdjustment - recencyPenalty
 */
export function scoreCandidate(
  record: ContentRecord,
  context: RankingContext,
  profile: InteractionProfile,
  selectedCategoryCounts: ReadonlyMap<ContentCategory, number>,
  selectedFormatCounts: ReadonlyMap<ContentFormat, number>
): ScoredCandidate {
  const nowMs = context.nowMs ?? Date.now();
  const { score: interestScore, isExploration } = computeInterestScore(record, context);
  const formatScore = computeFormatScore(record, context.preferences);
  const freshnessScore = computeFreshnessScore(record, nowMs);
  const noveltyScore = computeNoveltyScore(record, profile);
  const diversityScore = computeDiversityScore(
    record,
    selectedCategoryCounts,
    selectedFormatCounts
  );

  const catAffinity = profile.categoryAffinity.get(record.category) ?? 0;
  const topicAffinities = record.topics.map(
    (topic) => profile.topicAffinity.get(topic.toLowerCase()) ?? 0
  );
  const avgTopicAffinity =
    topicAffinities.length > 0
      ? topicAffinities.reduce((acc, value) => acc + value, 0) / topicAffinities.length
      : 0;

  let interactionAdjustment = clamp(catAffinity * 0.6 + avgTopicAffinity * 0.4, -0.3, 0.2);
  if (profile.skippedContentIds.has(record.id)) {
    interactionAdjustment -= 0.06;
  }

  const recencyPenalty = profile.recentContentIds.has(record.id) ? 0.35 : 0;

  const baseScore =
    RANKING_WEIGHTS.interest * interestScore +
    RANKING_WEIGHTS.format * formatScore +
    RANKING_WEIGHTS.freshness * freshnessScore +
    RANKING_WEIGHTS.novelty * noveltyScore +
    RANKING_WEIGHTS.diversity * diversityScore;

  const totalScore = Number((baseScore + interactionAdjustment - recencyPenalty).toFixed(6));

  return {
    record,
    breakdown: {
      interestScore,
      formatScore,
      freshnessScore,
      noveltyScore,
      diversityScore,
      interactionAdjustment,
      recencyPenalty,
      totalScore,
      isExplorationCandidate: isExploration,
    },
  };
}
