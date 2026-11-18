import { z } from 'zod';
import { withBasePath } from '../utils/assetUrl';
import { isSafeHttpsUrl, isSafeImageUrl } from './urlValidation';

export const CURRENT_CONTENT_SCHEMA_VERSION = 1 as const;
export const CURRENT_FEED_VERSION = 1 as const;

export const CONTENT_CATEGORIES = [
  'facts',
  'technology',
  'travel_food',
  'news',
  'humour',
  'history',
  'growth',
  'science',
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

export interface CategoryMeta {
  id: ContentCategory;
  label: string;
  shortLabel: string;
  description: string;
  accentHex: string;
  coverImage: string;
  suggestedTopics: readonly string[];
}

export const CATEGORY_METADATA: Record<ContentCategory, CategoryMeta> = {
  facts: {
    id: 'facts',
    label: 'Interesting Facts & Discoveries',
    shortLabel: 'Facts',
    description: 'Surprising phenomena, clever trivia, and overlooked truths.',
    accentHex: '#C84B31',
    coverImage: withBasePath('/images/categories/facts.jpg'),
    suggestedTopics: ['fractals', 'weather', 'antiquity', 'myths'],
  },
  technology: {
    id: 'technology',
    label: 'Technology & AI',
    shortLabel: 'Tech & AI',
    description: 'Computing breakthroughs, artificial intelligence, and design craft.',
    accentHex: '#2E5EAA',
    coverImage: withBasePath('/images/categories/technology.jpg'),
    suggestedTopics: ['ai', 'infrastructure', 'algorithms', 'edge computing'],
  },
  travel_food: {
    id: 'travel_food',
    label: 'Travel, Food & Lifestyle',
    shortLabel: 'Travel & Food',
    description: 'Culinary origins, remarkable places, and cultural traditions.',
    accentHex: '#B86B27',
    coverImage: withBasePath('/images/categories/travel_food.jpg'),
    suggestedTopics: ['architecture', 'japan', 'food science', 'culinary'],
  },
  news: {
    id: 'news',
    label: 'News & Current Affairs',
    shortLabel: 'Current Affairs',
    description: 'Clear, grounded context behind major global developments.',
    accentHex: '#335C67',
    coverImage: withBasePath('/images/categories/news.jpg'),
    suggestedTopics: ['energy', 'global trade', 'fintech', 'economics'],
  },
  humour: {
    id: 'humour',
    label: 'Humour & Entertainment',
    shortLabel: 'Culture & Wit',
    description: 'Clever comedy history, wordplay, games, and creative curiosities.',
    accentHex: '#8E4A6B',
    coverImage: withBasePath('/images/categories/humour.jpg'),
    suggestedTopics: ['cinema', 'etymology', 'cartography', 'wordplay'],
  },
  history: {
    id: 'history',
    label: 'History & Storytelling',
    shortLabel: 'History',
    description: 'Forgotten turning points, biographies, and vivid timelines.',
    accentHex: '#7A5438',
    coverImage: withBasePath('/images/categories/history.jpg'),
    suggestedTopics: ['archaeology', 'medicine', 'railroads', 'ancient greece'],
  },
  growth: {
    id: 'growth',
    label: 'Personal Growth & Learning',
    shortLabel: 'Learning',
    description: 'Mental models, decision frameworks, and evidence-based habits.',
    accentHex: '#2D6A4F',
    coverImage: withBasePath('/images/categories/growth.jpg'),
    suggestedTopics: ['mental models', 'memory', 'psychology', 'decision making'],
  },
  science: {
    id: 'science',
    label: 'Science, Nature & Space',
    shortLabel: 'Science',
    description: 'Cosmos, biology, physics, and how the natural world works.',
    accentHex: '#3B4F75',
    coverImage: withBasePath('/images/categories/science.jpg'),
    suggestedTopics: ['space', 'neuroscience', 'ocean', 'astronomy'],
  },
};

export const CONTENT_FORMATS = [
  'quick_bite',
  'short_story',
  'deep_dive',
  'quiz_challenge',
  'visual_explainer',
  'interactive_fact',
] as const;

export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const CONTENT_MIX_OPTIONS = ['quick', 'balanced', 'deeper'] as const;
export type ContentMix = (typeof CONTENT_MIX_OPTIONS)[number];

export const SESSION_DURATIONS = [5, 10, 15] as const;
export type SessionDurationMinutes = (typeof SESSION_DURATIONS)[number];

export const FEED_STATUSES = ['pending', 'processing', 'ready', 'failed'] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

export const INTERACTION_ACTIONS = [
  'opened',
  'completed',
  'saved',
  'liked',
  'skipped',
  'not_interested',
] as const;
export type InteractionAction = (typeof INTERACTION_ACTIONS)[number];

export const SafeHttpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeHttpsUrl, { message: 'URL must be a valid public HTTPS URL' });

export const SafeImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeImageUrl, { message: 'Image URL must be an approved HTTPS or local asset URL' });

// Versioned structured interactive blocks — ONLY registered component types allowed.
export const ParagraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string().trim().min(1).max(2000),
});

export const FactRevealBlockSchema = z.object({
  type: z.literal('fact_reveal'),
  label: z.string().trim().min(1).max(140),
  text: z.string().trim().min(1).max(1000),
});

export const QuizBlockSchema = z
  .object({
    type: z.literal('quiz'),
    question: z.string().trim().min(4).max(400),
    options: z.array(z.string().trim().min(1).max(220)).min(2).max(5),
    correctOptionIndex: z.number().int().min(0),
    explanation: z.string().trim().min(1).max(900),
  })
  .refine((data) => data.correctOptionIndex < data.options.length, {
    message: 'correctOptionIndex must point to an existing quiz option',
    path: ['correctOptionIndex'],
  });

export const TimelineEventSchema = z.object({
  year: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(140),
  detail: z.string().trim().min(1).max(500),
});

export const TimelineBlockSchema = z.object({
  type: z.literal('timeline'),
  heading: z.string().trim().min(1).max(160).optional(),
  events: z.array(TimelineEventSchema).min(2).max(8),
});

export const ComparisonItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  subtitle: z.string().trim().min(1).max(140).optional(),
  points: z.array(z.string().trim().min(1).max(260)).min(1).max(5),
});

export const ComparisonBlockSchema = z.object({
  type: z.literal('comparison'),
  heading: z.string().trim().min(1).max(160).optional(),
  items: z.array(ComparisonItemSchema).min(2).max(4),
  verdict: z.string().trim().min(1).max(400).optional(),
});

export const RabbitHoleBlockSchema = z.object({
  type: z.literal('rabbit_hole'),
  prompt: z.string().trim().min(1).max(180),
  topic: z.string().trim().min(1).max(100),
  category: z.enum(CONTENT_CATEGORIES),
  description: z.string().trim().min(1).max(320),
  estimatedMinutes: z.number().int().min(3).max(5).default(5),
});

export const KeyTakeawayBlockSchema = z.object({
  type: z.literal('key_takeaway'),
  heading: z.string().trim().min(1).max(140).optional(),
  points: z.array(z.string().trim().min(1).max(280)).min(1).max(5),
});

export const ContentBlockSchema = z.union([
  ParagraphBlockSchema,
  FactRevealBlockSchema,
  QuizBlockSchema,
  TimelineBlockSchema,
  ComparisonBlockSchema,
  RabbitHoleBlockSchema,
  KeyTakeawayBlockSchema,
]);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type ParagraphBlock = z.infer<typeof ParagraphBlockSchema>;
export type FactRevealBlock = z.infer<typeof FactRevealBlockSchema>;
export type QuizBlock = z.infer<typeof QuizBlockSchema>;
export type TimelineBlock = z.infer<typeof TimelineBlockSchema>;
export type ComparisonBlock = z.infer<typeof ComparisonBlockSchema>;
export type RabbitHoleBlock = z.infer<typeof RabbitHoleBlockSchema>;
export type KeyTakeawayBlock = z.infer<typeof KeyTakeawayBlockSchema>;

export const ContentSourceSchema = z.object({
  publisher: z.string().trim().min(1).max(140),
  title: z.string().trim().min(1).max(240).optional(),
  url: SafeHttpsUrlSchema,
  publishedAt: z.string().trim().max(64).optional(),
  retrievedAt: z.string().trim().min(1).max(64),
});

export type ContentSource = z.infer<typeof ContentSourceSchema>;

export const VisualReferenceSchema = z.object({
  type: z.enum(['stock_photo', 'open_collection', 'editorial_illustration', 'gradient_emblem']),
  query: z.string().trim().max(160).optional(),
  assetId: z.string().trim().max(120).nullable().optional(),
  imageUrl: SafeImageUrlSchema.optional(),
  alt: z.string().trim().min(1).max(240),
  attribution: z.string().trim().max(240).optional(),
  license: z.string().trim().max(120).optional(),
  provider: z.string().trim().max(100).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export type VisualReference = z.infer<typeof VisualReferenceSchema>;

export const ContentRecordSchema = z.object({
  id: z.string().trim().min(1).max(128),
  schemaVersion: z.literal(CURRENT_CONTENT_SCHEMA_VERSION),
  contentType: z.enum(CONTENT_FORMATS),
  cardVariant: z.enum(['hero_image', 'article', 'interactive_feature']).default('interactive_feature'),
  title: z.string().trim().min(2).max(220),
  subtitle: z.string().trim().max(280).optional(),
  category: z.enum(CONTENT_CATEGORIES),
  topics: z.array(z.string().trim().min(1).max(60)).min(1).max(12),
  estimatedDurationSeconds: z.number().int().min(20).max(900),
  source: ContentSourceSchema,
  summary: z.string().trim().min(1).max(900),
  blocks: z.array(ContentBlockSchema).min(1).max(12),
  visual: VisualReferenceSchema,
  visualAssetId: z.string().trim().max(120).optional(),
  followUps: z.array(z.string().trim().min(2).max(180)).max(6).default([]),
  isAiEnriched: z.boolean().default(false),
  enrichmentNotice: z.string().trim().max(240).optional(),
  qualityStatus: z.enum(['unreviewed', 'approved', 'rejected']).default('approved'),
  createdAt: z.string().trim().min(1).max(64),
  enrichedAt: z.string().trim().max(64).optional(),
});

export type ContentRecord = z.infer<typeof ContentRecordSchema>;

export const AIEnrichmentPayloadSchema = z.object({
  schemaVersion: z.literal(CURRENT_CONTENT_SCHEMA_VERSION),
  summary: z.string().trim().min(10).max(900),
  blocks: z.array(z.unknown()).min(1).max(12),
  followUps: z.array(z.string().trim().min(3).max(180)).max(5).default([]),
  enrichmentNotice: z
    .string()
    .trim()
    .max(240)
    .default('Interactive blocks synthesized by AI from the attributed source.'),
});

export interface ValidatedAIEnrichment {
  schemaVersion: typeof CURRENT_CONTENT_SCHEMA_VERSION;
  summary: string;
  blocks: ContentBlock[];
  rejectedBlockCount: number;
  followUps: string[];
  enrichmentNotice: string;
}

/**
 * Validates AI enrichment output defensively:
 * - Requires schemaVersion === 1 and valid summary
 * - Validates each block individually so unknown or malformed blocks are safely dropped
 *   rather than crashing or injecting unvalidated shapes.
 */
export function validateAIEnrichmentSafely(raw: unknown): ValidatedAIEnrichment | null {
  const envelope = AIEnrichmentPayloadSchema.safeParse(raw);
  if (!envelope.success) {
    return null;
  }

  const validBlocks: ContentBlock[] = [];
  let rejectedBlockCount = 0;

  for (const candidateBlock of envelope.data.blocks) {
    const parsedBlock = ContentBlockSchema.safeParse(candidateBlock);
    if (parsedBlock.success) {
      validBlocks.push(parsedBlock.data);
    } else {
      rejectedBlockCount += 1;
    }
  }

  if (validBlocks.length === 0) {
    return null;
  }

  return {
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    summary: envelope.data.summary,
    blocks: validBlocks,
    rejectedBlockCount,
    followUps: envelope.data.followUps,
    enrichmentNotice: envelope.data.enrichmentNotice,
  };
}

export const AIAnswerReferenceSchema = z.object({
  title: z.string().trim().min(1).max(180),
  url: SafeHttpsUrlSchema,
});

export const AIAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(2500),
  groundedInSource: z.boolean(),
  uncertaintyNote: z.string().trim().max(400).optional(),
  references: z.array(AIAnswerReferenceSchema).max(5).default([]),
  followUpSuggestions: z.array(z.string().trim().min(2).max(180)).max(4).default([]),
  generatedQuiz: QuizBlockSchema.optional(),
});

export type AIAnswer = z.infer<typeof AIAnswerSchema>;

export const UserPreferencesSchema = z.object({
  userId: z.string().trim().min(1).max(128),
  displayName: z.string().trim().max(80).optional(),
  interests: z.array(z.enum(CONTENT_CATEGORIES)).max(8).default([]),
  topicKeywords: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  excludedTopics: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  preferredMix: z.enum(CONTENT_MIX_OPTIONS).default('balanced'),
  preferredFormats: z.array(z.enum(CONTENT_FORMATS)).max(6).default([]),
  defaultSessionDuration: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(5),
  onboardingCompleted: z.boolean().default(false),
  createdAt: z.string().trim().min(1).max(64),
  updatedAt: z.string().trim().min(1).max(64),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const SessionItemRefSchema = z.object({
  contentId: z.string().trim().min(1).max(128),
  position: z.number().int().min(0).max(50),
});

export const FeedSessionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  userId: z.string().trim().min(1).max(128),
  status: z.enum(FEED_STATUSES),
  generationMode: z.enum(['on_demand', 'background']),
  durationMinutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  feedVersion: z.number().int().min(1),
  topicFocus: z.string().trim().max(100).optional(),
  categoryFocus: z.enum(CONTENT_CATEGORIES).optional(),
  itemRefs: z.array(SessionItemRefSchema).max(20),
  currentIndex: z.number().int().min(0).max(20).default(0),
  completedItemIds: z.array(z.string().trim().min(1).max(128)).max(20).default([]),
  reflectionNote: z.string().trim().max(500).optional(),
  createdAt: z.string().trim().min(1).max(64),
  startedAt: z.string().trim().max(64).optional(),
  completedAt: z.string().trim().max(64).optional(),
  metadata: z
    .object({
      candidateCount: z.number().int().min(0).optional(),
      selectedCount: z.number().int().min(0).optional(),
      model: z.string().trim().max(80).optional(),
      generationVersion: z.string().trim().max(40).optional(),
      servedFromFallback: z.boolean().optional(),
      latencyMs: z.number().int().min(0).optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.string().trim().min(1).max(80),
      message: z.string().trim().min(1).max(400),
    })
    .optional(),
});

export type FeedSession = z.infer<typeof FeedSessionSchema>;

export const UserInteractionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  userId: z.string().trim().min(1).max(128),
  contentId: z.string().trim().min(1).max(128),
  sessionId: z.string().trim().max(128).optional(),
  action: z.enum(INTERACTION_ACTIONS),
  createdAt: z.string().trim().min(1).max(64),
});

export type UserInteraction = z.infer<typeof UserInteractionSchema>;

export const SavedCollectionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.string().trim().min(1).max(64),
});

export type SavedCollection = z.infer<typeof SavedCollectionSchema>;

export const SavedItemSchema = z.object({
  id: z.string().trim().min(1).max(128),
  contentId: z.string().trim().min(1).max(128),
  collectionId: z.string().trim().min(1).max(128),
  savedAt: z.string().trim().min(1).max(64),
});

export type SavedItem = z.infer<typeof SavedItemSchema>;

export const VisualAssetRecordSchema = z.object({
  id: z.string().trim().min(1).max(128),
  queryKey: z.string().trim().min(1).max(180),
  imageUrl: SafeImageUrlSchema.optional(),
  alt: z.string().trim().min(1).max(240),
  provider: z.string().trim().min(1).max(100),
  attribution: z.string().trim().min(1).max(240),
  license: z.string().trim().min(1).max(120),
  sourceUrl: SafeHttpsUrlSchema.optional(),
  cachedAt: z.string().trim().min(1).max(64),
});

export type VisualAssetRecord = z.infer<typeof VisualAssetRecordSchema>;
