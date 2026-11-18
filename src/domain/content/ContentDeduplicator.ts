import type { ContentRecord } from '../../shared/validation/contentSchemas';
import { canonicalizeUrl } from '../../shared/validation/urlValidation';
import { computeContentFingerprint } from './Content';

function recordRichnessScore(record: ContentRecord): number {
  let score = record.blocks.length * 10;
  if (record.isAiEnriched) score += 40;
  if (record.visual.imageUrl) score += 15;
  if (record.qualityStatus === 'approved') score += 20;
  return score;
}

/**
 * Deduplicates content items by ID, canonical URL, and normalized title+publisher fingerprint.
 * When duplicates collide, retains the richer / already-enriched record to save AI calls.
 */
export function deduplicateContentRecords(records: ContentRecord[]): ContentRecord[] {
  const byId = new Map<string, ContentRecord>();
  const urlToId = new Map<string, string>();
  const fingerprintToId = new Map<string, string>();

  for (const record of records) {
    const canonicalUrl = canonicalizeUrl(record.source.url);
    const fingerprint = computeContentFingerprint(record.title, record.source.publisher);

    const existingId =
      (byId.has(record.id) ? record.id : undefined) ??
      urlToId.get(canonicalUrl) ??
      fingerprintToId.get(fingerprint);

    if (!existingId) {
      byId.set(record.id, record);
      urlToId.set(canonicalUrl, record.id);
      fingerprintToId.set(fingerprint, record.id);
      continue;
    }

    const existing = byId.get(existingId);
    if (existing && recordRichnessScore(record) > recordRichnessScore(existing)) {
      byId.delete(existingId);
      byId.set(record.id, record);
      urlToId.set(canonicalUrl, record.id);
      fingerprintToId.set(fingerprint, record.id);
    }
  }

  return Array.from(byId.values());
}
