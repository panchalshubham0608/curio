import {
  CATEGORY_METADATA,
  ContentRecordSchema,
  CURRENT_CONTENT_SCHEMA_VERSION,
  type ContentRecord,
} from '../../shared/validation/contentSchemas';
import { createSecureId } from '../../shared/utils/ids';
import { stripHtmlToPlainText, truncateText } from '../../shared/utils/sanitize';
import { isSafeHttpsUrl, isSafeImageUrl } from '../../shared/validation/urlValidation';
import { estimateDurationSeconds, type ContentCandidate } from './Content';

/**
 * Normalizes an external ContentCandidate into a schema-validated ContentRecord.
 * Returns null if the candidate fails strict URL or schema validation.
 */
export function normalizeCandidateToContentRecord(
  candidate: ContentCandidate,
  nowIso = new Date().toISOString()
): ContentRecord | null {
  if (candidate.preEnrichedRecord) {
    const validated = ContentRecordSchema.safeParse(candidate.preEnrichedRecord);
    return validated.success ? validated.data : null;
  }

  if (!isSafeHttpsUrl(candidate.source.url)) {
    return null;
  }

  const cleanTitle = truncateText(stripHtmlToPlainText(candidate.title), 210);
  const cleanSummary = truncateText(
    stripHtmlToPlainText(candidate.summary || candidate.rawText || candidate.title),
    880
  );
  const cleanSubtitle = candidate.subtitle
    ? truncateText(stripHtmlToPlainText(candidate.subtitle), 260)
    : undefined;

  if (cleanTitle.length < 2 || cleanSummary.length < 5) {
    return null;
  }

  const cleanTopics = Array.from(
    new Set(
      candidate.topics
        .map((t) => stripHtmlToPlainText(t).toLowerCase().slice(0, 50))
        .filter((t) => t.length > 0)
    )
  ).slice(0, 10);

  if (cleanTopics.length === 0) {
    cleanTopics.push(candidate.category);
  }

  const categoryMeta = CATEGORY_METADATA[candidate.category];
  const candidateImageUrl =
    candidate.visual?.imageUrl && isSafeImageUrl(candidate.visual.imageUrl)
      ? candidate.visual.imageUrl
      : undefined;

  const estimatedDuration =
    candidate.estimatedDurationSeconds ??
    estimateDurationSeconds(`${cleanTitle} ${cleanSummary} ${candidate.rawText ?? ''}`, 0);

  const rawRecord: ContentRecord = {
    id: candidate.id ?? createSecureId('cnt'),
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: candidate.contentType,
    cardVariant: candidate.cardVariant ?? (candidateImageUrl ? 'hero_image' : 'article'),
    title: cleanTitle,
    subtitle: cleanSubtitle,
    category: candidate.category,
    region: candidate.region ?? 'global',
    topics: cleanTopics,
    estimatedDurationSeconds: Math.min(900, Math.max(25, Math.round(estimatedDuration))),
    source: {
      publisher: truncateText(stripHtmlToPlainText(candidate.source.publisher) || 'Curated Source', 130),
      title: candidate.source.title
        ? truncateText(stripHtmlToPlainText(candidate.source.title), 220)
        : cleanTitle,
      url: candidate.source.url.trim(),
      publishedAt: candidate.source.publishedAt,
      retrievedAt: candidate.source.retrievedAt || nowIso,
    },
    summary: cleanSummary,
    blocks: [
      {
        type: 'paragraph',
        text: cleanSummary,
      },
    ],
    visual: {
      type: candidateImageUrl
        ? (candidate.visual?.type ?? 'open_collection')
        : 'gradient_emblem',
      query: candidate.visual?.query ?? `${candidate.category} ${cleanTopics[0] ?? ''}`.trim(),
      assetId: candidate.visual?.assetId ?? null,
      imageUrl: candidateImageUrl,
      alt: candidate.visual?.alt
        ? truncateText(stripHtmlToPlainText(candidate.visual.alt), 220)
        : `${cleanTitle} — ${categoryMeta.shortLabel}`,
      attribution: candidate.visual?.attribution,
      license: candidate.visual?.license,
      provider: candidate.visual?.provider,
      accentColor: candidate.visual?.accentColor ?? categoryMeta.accentHex,
    },
    followUps: [
      `Why does "${truncateText(cleanTitle, 70)}" matter today?`,
      `Can you explain the core idea behind this more simply?`,
    ],
    isAiEnriched: false,
    qualityStatus: 'approved',
    createdAt: nowIso,
  };

  const parsed = ContentRecordSchema.safeParse(rawRecord);
  return parsed.success ? parsed.data : null;
}
