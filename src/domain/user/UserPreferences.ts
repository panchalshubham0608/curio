import type {
  ContentCategory,
  ContentFormat,
  ContentMix,
  UserPreferences,
} from '../../shared/validation/contentSchemas';

export const DEFAULT_INTERESTS: ContentCategory[] = ['facts', 'science', 'technology', 'history'];

export function getPreferredFormatsForMix(mix: ContentMix): ContentFormat[] {
  switch (mix) {
    case 'quick':
      return ['quick_bite', 'interactive_fact', 'quiz_challenge'];
    case 'deeper':
      return ['deep_dive', 'short_story', 'visual_explainer'];
    case 'balanced':
    default:
      return ['quick_bite', 'interactive_fact', 'short_story', 'quiz_challenge', 'visual_explainer'];
  }
}

export function createDefaultUserPreferences(
  userId: string,
  nowIso = new Date().toISOString()
): UserPreferences {
  return {
    userId,
    displayName: undefined,
    interests: [...DEFAULT_INTERESTS],
    topicKeywords: [],
    excludedTopics: [],
    preferredMix: 'balanced',
    preferredFormats: getPreferredFormatsForMix('balanced'),
    defaultSessionDuration: 5,
    onboardingCompleted: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Blank profile state after a local guest explicitly clears their profile on this device.
 */
export function createClearedUserPreferences(
  userId: string,
  nowIso = new Date().toISOString()
): UserPreferences {
  return {
    ...createDefaultUserPreferences(userId, nowIso),
    interests: [],
  };
}

export function normalizeTopicList(rawInput: string): string[] {
  return Array.from(
    new Set(
      rawInput
        .split(/[,;\n]/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length >= 2 && item.length <= 50)
    )
  ).slice(0, 30);
}
