import type { ContentMix } from '../../shared/validation/contentSchemas';

export interface DiscoveryVibeOption {
  readonly id: ContentMix;
  readonly title: string;
  readonly subtitle: string;
  readonly bars: readonly number[];
}

export const DISCOVERY_VIBE_OPTIONS: readonly DiscoveryVibeOption[] = [
  {
    id: 'quick',
    title: 'Quick Sparks',
    subtitle: 'Crisp bite-sized facts, tap-to-reveal twists, and playful quizzes.',
    bars: [9, 12, 10, 14, 11],
  },
  {
    id: 'balanced',
    title: 'Balanced Mix',
    subtitle: 'A magazine blend of quick insights, visual timelines, and short stories.',
    bars: [10, 18, 13, 22, 14],
  },
  {
    id: 'deeper',
    title: 'Deep Cuts',
    subtitle: 'Rich historical narratives, structured comparisons, and mental models.',
    bars: [16, 22, 20, 24, 19],
  },
];

export function getDiscoveryVibeTitle(mix: ContentMix): string {
  return (
    DISCOVERY_VIBE_OPTIONS.find((option) => option.id === mix)?.title ?? 'Balanced Mix'
  );
}
