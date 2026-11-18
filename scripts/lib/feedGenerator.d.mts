import type { ContentCategory, ContentRecord } from '../../src/shared/validation/contentSchemas';

export declare const CURRENT_CONTENT_SCHEMA_VERSION: 1;
export declare const CONTENT_CATEGORIES: readonly ContentCategory[];
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
export declare function selectBatchCategories(
  existingItems: ReadonlyArray<{ category?: string }>,
  batchSize: number
): ContentCategory[];
export declare function buildTextualFeedPrompt(options: {
  categories: readonly ContentCategory[];
  batchSize: number;
  recentTitles?: readonly string[];
}): string;
export declare function extractJsonPayload(rawText: string): unknown;
export declare function normalizeTitleKey(title: string): string;
export declare function validateAndNormalizeGeneratedBatch(
  rawPayload: unknown,
  nowIso?: string
): { records: ContentRecord[]; rejectedCount: number };
export declare function mergeGeneratedFeed(
  existingEnvelope: { items?: ReadonlyArray<Partial<ContentRecord>> } | null | undefined,
  newRecords: readonly Partial<ContentRecord>[],
  options?: { maxItems?: number; nowIso?: string; modelName?: string }
): { addedCount: number; envelope: GeneratedFeedEnvelope };
export declare function requestGeminiTextualFeed(options: {
  apiKey: string;
  modelName?: string;
  prompt: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<unknown>;
