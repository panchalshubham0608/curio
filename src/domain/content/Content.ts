import type {
  ContentCategory,
  ContentFormat,
  ContentRecord,
  VisualReference,
} from '../../shared/validation/contentSchemas';

/**
 * Unenriched or partially structured discovery candidate returned by ContentProviders.
 */
export interface ContentCandidate {
  id?: string;
  title: string;
  subtitle?: string;
  category: ContentCategory;
  topics: string[];
  contentType: ContentFormat;
  cardVariant?: 'hero_image' | 'article' | 'interactive_feature';
  summary: string;
  rawText?: string;
  source: {
    publisher: string;
    title?: string;
    url: string;
    publishedAt?: string;
    retrievedAt: string;
  };
  visual?: Partial<VisualReference>;
  estimatedDurationSeconds?: number;
  preEnrichedRecord?: ContentRecord;
}

/**
 * Produces a normalized fingerprint from title + optional publisher to detect
 * near-duplicate items even when URLs differ.
 */
export function computeContentFingerprint(title: string, publisher?: string): string {
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedPublisher = (publisher ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

  return `${normalizedTitle}::${normalizedPublisher}`;
}

/**
 * Estimates reading and interaction time in seconds based on word count and interactive blocks.
 */
export function estimateDurationSeconds(text: string, interactiveBlockCount = 0): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // ~200 wpm reading speed + 25s per interactive block (quiz/reveal/comparison)
  const readingSeconds = Math.ceil((words / 200) * 60);
  const interactionSeconds = interactiveBlockCount * 25;
  return Math.min(600, Math.max(35, readingSeconds + interactionSeconds));
}
