import type {
  ContentCategory,
  ContentFormat,
  ContentMix,
  ContentRegion,
  UserPreferences,
} from '../../shared/validation/contentSchemas';

export const DEFAULT_INTERESTS: ContentCategory[] = ['facts', 'science', 'technology', 'history'];

/**
 * Privacy-safe client-side edition suggestion derived strictly from browser timezone
 * and locale (never requests GPS location or external IP geolocation).
 */
export function detectSuggestedRegion(
  timeZone?: string,
  locale?: string
): ContentRegion {
  const tz =
    timeZone ??
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      : '');
  const lang =
    locale ??
    (typeof navigator !== 'undefined' ? navigator.language || '' : '');

  const tzLower = tz.toLowerCase();
  const langUpper = lang.toUpperCase();

  if (tzLower === 'asia/kolkata' || tzLower === 'asia/calcutta' || langUpper.endsWith('-IN')) {
    return 'IN';
  }
  if (tzLower === 'europe/london' || langUpper.endsWith('-GB')) {
    return 'UK';
  }
  if (tzLower === 'asia/tokyo' || langUpper === 'JA' || langUpper.endsWith('-JP')) {
    return 'JP';
  }
  if (tzLower.startsWith('australia/') || langUpper.endsWith('-AU')) {
    return 'AU';
  }
  if (
    tzLower === 'america/toronto' ||
    tzLower === 'america/vancouver' ||
    tzLower === 'america/montreal' ||
    tzLower === 'america/edmonton' ||
    tzLower === 'america/winnipeg' ||
    tzLower === 'america/halifax' ||
    langUpper.endsWith('-CA')
  ) {
    return 'CA';
  }
  if (
    tzLower.startsWith('america/new_york') ||
    tzLower.startsWith('america/chicago') ||
    tzLower.startsWith('america/denver') ||
    tzLower.startsWith('america/los_angeles') ||
    tzLower.startsWith('america/phoenix') ||
    tzLower.startsWith('pacific/honolulu') ||
    langUpper.endsWith('-US')
  ) {
    return 'US';
  }
  if (tzLower.startsWith('europe/')) {
    return 'EU';
  }
  return 'global';
}

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
    region: 'global',
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
