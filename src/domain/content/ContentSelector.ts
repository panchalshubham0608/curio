import type {
  ContentCategory,
  ContentFormat,
  ContentRecord,
  SessionDurationMinutes,
  UserInteraction,
  UserPreferences,
} from '../../shared/validation/contentSchemas';
import {
  getExplorationSlotCount,
  getMaxCategoryCount,
  SESSION_DURATION_TARGETS,
} from '../feed/FeedRules';
import {
  buildInteractionProfile,
  scoreCandidate,
  type RankingContext,
  type ScoredCandidate,
} from '../personalization/RankingEngine';

export interface SelectionInput {
  candidates: ContentRecord[];
  preferences: UserPreferences;
  interactions: UserInteraction[];
  durationMinutes: SessionDurationMinutes;
  excludeContentIds: string[];
  topicFocus?: string;
  categoryFocus?: ContentCategory;
  nowMs?: number;
}

export interface SelectionResult {
  selected: ContentRecord[];
  scoredSelected: ScoredCandidate[];
  eligibleCount: number;
  totalEstimatedSeconds: number;
}

function matchesExcludedTopics(record: ContentRecord, excludedTopics: string[]): boolean {
  if (excludedTopics.length === 0) return false;
  const searchable = `${record.title} ${record.subtitle ?? ''} ${record.summary} ${record.topics.join(' ')} ${record.category}`.toLowerCase();
  return excludedTopics.some((term) => {
    const clean = term.trim().toLowerCase();
    return clean.length >= 2 && searchable.includes(clean);
  });
}

function compareScoredCandidates(a: ScoredCandidate, b: ScoredCandidate): number {
  if (b.breakdown.totalScore !== a.breakdown.totalScore) {
    return b.breakdown.totalScore - a.breakdown.totalScore;
  }
  return a.record.id.localeCompare(b.record.id);
}

/**
 * Selects a finite, varied, duration-aware set of ContentRecords for a session.
 * - Filters rejected, excluded, and explicitly not-interested items
 * - Enforces category diversity caps (unless running a focused category/topic journey)
 * - Reserves exploration capacity for surprising topics beyond explicit interests
 * - Adapts session length to target duration rather than blindly over- or under-filling
 */
export function selectSessionContent(input: SelectionInput): SelectionResult {
  const nowMs = input.nowMs ?? Date.now();
  const target = SESSION_DURATION_TARGETS[input.durationMinutes];
  const isFocusedJourney = Boolean(input.categoryFocus || input.topicFocus);

  const catalog = new Map<string, ContentRecord>();
  for (const candidate of input.candidates) {
    catalog.set(candidate.id, candidate);
  }

  const profile = buildInteractionProfile(input.interactions, catalog, nowMs);
  const excludedIds = new Set<string>([
    ...input.excludeContentIds,
    ...profile.notInterestedContentIds,
  ]);

  const eligible = input.candidates.filter((record) => {
    if (record.qualityStatus === 'rejected') return false;
    if (excludedIds.has(record.id)) return false;
    if (matchesExcludedTopics(record, input.preferences.excludedTopics)) return false;
    return true;
  });

  // If the strict exclusion filter left too few items (small personal pool on repeat sessions),
  // gracefully re-allow previously seen items except explicit not_interested & excluded topics.
  const workingPool =
    eligible.length >= Math.min(3, target.minItems)
      ? eligible
      : input.candidates.filter((record) => {
          if (record.qualityStatus === 'rejected') return false;
          if (profile.notInterestedContentIds.has(record.id)) return false;
          if (matchesExcludedTopics(record, input.preferences.excludedTopics)) return false;
          return true;
        });

  const rankingContext: RankingContext = {
    preferences: input.preferences,
    interactions: input.interactions,
    recentContentCatalog: catalog,
    topicFocus: input.topicFocus,
    categoryFocus: input.categoryFocus,
    nowMs,
  };

  const remaining = new Map<string, ContentRecord>(workingPool.map((item) => [item.id, item]));
  const selected: ScoredCandidate[] = [];
  const categoryCounts = new Map<ContentCategory, number>();
  const formatCounts = new Map<ContentFormat, number>();

  const maxCategoryCount = getMaxCategoryCount(target.maxItems, isFocusedJourney);
  const targetExplorationSlots = getExplorationSlotCount(target.minItems, isFocusedJourney);
  let explorationSelected = 0;
  let accumulatedSeconds = 0;

  const canAddMore = (): boolean => {
    if (remaining.size === 0) return false;
    if (selected.length >= target.maxItems) return false;
    if (selected.length >= target.minItems && accumulatedSeconds >= target.targetSeconds) {
      return false;
    }
    return true;
  };

  const pickBestFrom = (
    pool: ContentRecord[],
    enforceCategoryCap: boolean
  ): ScoredCandidate | undefined => {
    const filtered = enforceCategoryCap
      ? pool.filter((item) => (categoryCounts.get(item.category) ?? 0) < maxCategoryCount)
      : pool;

    if (filtered.length === 0) return undefined;

    const scored = filtered
      .map((record) =>
        scoreCandidate(record, rankingContext, profile, categoryCounts, formatCounts)
      )
      .sort(compareScoredCandidates);

    return scored[0];
  };

  while (canAddMore()) {
    const poolArray = Array.from(remaining.values());

    // Reserve later-middle slots for exploration so sessions open strong and introduce surprise
    const shouldTryExploration =
      !isFocusedJourney &&
      explorationSelected < targetExplorationSlots &&
      selected.length >= 2;

    let chosen: ScoredCandidate | undefined;

    if (shouldTryExploration) {
      const explorationPool = poolArray.filter(
        (item) => !input.preferences.interests.includes(item.category)
      );
      chosen = pickBestFrom(explorationPool, true);
      if (chosen) {
        explorationSelected += 1;
      }
    }

    if (!chosen) {
      // Respect duration budget gently once we have reached minItems
      const durationFittingPool =
        selected.length >= target.minItems
          ? poolArray.filter(
              (item) => accumulatedSeconds + item.estimatedDurationSeconds <= target.maxSeconds
            )
          : poolArray;

      const candidatePool = durationFittingPool.length > 0 ? durationFittingPool : poolArray;
      chosen = pickBestFrom(candidatePool, true) ?? pickBestFrom(candidatePool, false);
    }

    if (!chosen) break;

    selected.push(chosen);
    remaining.delete(chosen.record.id);
    categoryCounts.set(
      chosen.record.category,
      (categoryCounts.get(chosen.record.category) ?? 0) + 1
    );
    formatCounts.set(
      chosen.record.contentType,
      (formatCounts.get(chosen.record.contentType) ?? 0) + 1
    );
    accumulatedSeconds += chosen.record.estimatedDurationSeconds;
  }

  return {
    selected: selected.map((entry) => entry.record),
    scoredSelected: selected,
    eligibleCount: workingPool.length,
    totalEstimatedSeconds: accumulatedSeconds,
  };
}
