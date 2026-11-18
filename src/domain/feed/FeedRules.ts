import type {
  FeedStatus,
  SessionDurationMinutes,
} from '../../shared/validation/contentSchemas';

export interface SessionDurationTarget {
  durationMinutes: SessionDurationMinutes;
  minItems: number;
  maxItems: number;
  targetSeconds: number;
  maxSeconds: number;
}

export const SESSION_DURATION_TARGETS: Record<SessionDurationMinutes, SessionDurationTarget> = {
  5: {
    durationMinutes: 5,
    minItems: 5,
    maxItems: 7,
    targetSeconds: 300,
    maxSeconds: 420,
  },
  10: {
    durationMinutes: 10,
    minItems: 9,
    maxItems: 12,
    targetSeconds: 600,
    maxSeconds: 780,
  },
  15: {
    durationMinutes: 15,
    minItems: 12,
    maxItems: 15,
    targetSeconds: 900,
    maxSeconds: 1120,
  },
};

export const FEED_POLICY = {
  /** Maximum fraction of items from one category in a general multi-interest session */
  maxSingleCategoryRatio: 0.4,
  /** Target fraction of session items reserved for adjacent/exploration topics */
  explorationSlotRatio: 0.2,
  /** Minimum exploration items in a general multi-interest session when available */
  minExplorationItems: 1,
  /** Days before recently shown content stops incurring recency penalty */
  recencyWindowDays: 14,
} as const;

const VALID_STATUS_TRANSITIONS: Record<FeedStatus, readonly FeedStatus[]> = {
  pending: ['processing', 'failed'],
  processing: ['ready', 'failed'],
  ready: ['ready'],
  failed: ['pending', 'processing'],
};

export function isValidFeedStatusTransition(from: FeedStatus, to: FeedStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

export function getMaxCategoryCount(targetItemCount: number, isFocusedJourney: boolean): number {
  if (isFocusedJourney) {
    return targetItemCount;
  }
  return Math.max(2, Math.floor(targetItemCount * FEED_POLICY.maxSingleCategoryRatio));
}

export function getExplorationSlotCount(targetItemCount: number, isFocusedJourney: boolean): number {
  if (isFocusedJourney) {
    return 0;
  }
  return Math.max(
    FEED_POLICY.minExplorationItems,
    Math.round(targetItemCount * FEED_POLICY.explorationSlotRatio)
  );
}
