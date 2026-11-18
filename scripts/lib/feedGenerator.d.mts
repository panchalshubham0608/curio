import type {
  ContentCategory,
  ContentRecord,
  ContentRegion,
} from '../../src/shared/validation/contentSchemas';

export declare const CURRENT_CONTENT_SCHEMA_VERSION: 1;
export declare const CONTENT_CATEGORIES: readonly ContentCategory[];
export declare const CONTENT_REGIONS: readonly ContentRegion[];
export declare const REGION_PROMPT_GUIDANCE: Record<ContentRegion, string>;
export declare const TEXTUAL_CONTENT_FORMATS: readonly string[];
export declare const CATEGORY_ACCENTS: Record<ContentCategory, string>;

export interface GeneratedFeedEnvelope {
  schemaVersion: 1;
  generatedAt: string;
  generator: string;
  model: string;
  itemCount: number;
  items: ContentRecord[];
}

export declare function sanitizeText(value: unknown, maxLength?: number): string;
export declare function validateModelName(rawModel: unknown): string;
export declare function parseBoundedInt(
  rawValue: unknown,
  fallback: number,
  min: number,
  max: number
): number;
export declare function resolveSafeOutputPath(
  repoRoot: string,
  fileName?: string
): { allowedDir: string; outputPath: string };
export declare function normalizeSafeSourceUrl(rawUrl: unknown, fallbackTopic: string): string;
export declare function normalizeRegionCode(
  rawRegion: unknown,
  fallback?: ContentRegion | ''
): ContentRegion | '';
export declare function parseRegionList(rawList: unknown): Exclude<ContentRegion, 'global'>[];
export declare function selectBatchCategories(
  existingItems: ReadonlyArray<{ category?: string }>,
  batchSize: number
): ContentCategory[];
export declare function buildTextualFeedPrompt(options: {
  categories: readonly ContentCategory[];
  batchSize: number;
  recentTitles?: readonly string[];
  region?: ContentRegion;
}): string;
export declare function extractJsonPayload(rawText: string): unknown;
export declare function normalizeTitleKey(title: string): string;
export declare function validateAndNormalizeGeneratedBatch(
  rawPayload: unknown,
  nowIso?: string,
  options?: { region?: ContentRegion }
): { records: ContentRecord[]; rejectedCount: number };
export declare function mergeGeneratedFeed(
  existingEnvelope: { items?: ReadonlyArray<Partial<ContentRecord>> } | null | undefined,
  newRecords: readonly Partial<ContentRecord>[],
  options?: { maxItems?: number; nowIso?: string; modelName?: string }
): { addedCount: number; envelope: GeneratedFeedEnvelope };

export interface GenerationNeedDecision {
  shouldGenerate: boolean;
  itemsToGenerate: number;
  freshUnseenCount: number;
  deficit: number;
  reason: 'threshold_met' | 'below_threshold' | 'forced';
}

export interface RegionalGenerationPlan {
  region: ContentRegion;
  minThreshold: number;
  existingRegionItems: Array<{
    id?: string;
    region?: string;
    category?: string;
    title?: string;
    createdAt?: string;
  }>;
  decision: GenerationNeedDecision;
}

export declare function evaluateGenerationNeed(options?: {
  existingItems?: ReadonlyArray<{
    id?: string;
    createdAt?: string;
    generatedAt?: string;
    seenAt?: string;
    seenCount?: number;
  }>;
  seenIds?: ReadonlySet<string> | readonly string[];
  fallbackTimestamp?: string;
  minThreshold?: number;
  batchSize?: number;
  freshWindowHours?: number;
  nowMs?: number;
  forceGenerate?: boolean;
}): GenerationNeedDecision;

export declare function planRegionalGenerationBatches(options?: {
  existingItems?: ReadonlyArray<{
    id?: string;
    region?: string;
    category?: string;
    title?: string;
    createdAt?: string;
    generatedAt?: string;
    seenAt?: string;
    seenCount?: number;
  }>;
  seenIds?: ReadonlySet<string> | readonly string[];
  activeRegions?: readonly string[] | string;
  fallbackTimestamp?: string;
  globalMinThreshold?: number;
  regionalMinThreshold?: number;
  globalBatchSize?: number;
  regionalBatchSize?: number;
  freshWindowHours?: number;
  nowMs?: number;
  forceGenerate?: boolean;
  maxRegionsPerRun?: number;
}): RegionalGenerationPlan[];

export declare function requestGeminiTextualFeed(options: {
  apiKey: string;
  modelName?: string;
  prompt: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<unknown>;
