import type {
  VisualAssetRepository,
  VisualAssetResolver,
} from '../../application/ports';
import { createSecureId } from '../../shared/utils/ids';
import {
  CATEGORY_METADATA,
  type ContentRecord,
  type VisualReference,
} from '../../shared/validation/contentSchemas';
import { isSafeImageUrl } from '../../shared/validation/urlValidation';

/**
 * Resolves and caches visual assets with strict host allowlist validation,
 * attribution preservation, and clean editorial visual fallbacks.
 * Never substitutes misleading generic stock photos for specific news or historical events.
 */
export class VisualAssetService implements VisualAssetResolver {
  private readonly repository: VisualAssetRepository;

  constructor(repository: VisualAssetRepository) {
    this.repository = repository;
  }

  public async resolve(record: ContentRecord): Promise<VisualReference> {
    const categoryMeta = CATEGORY_METADATA[record.category];
    const queryKey = (record.visual.query ?? `${record.category}:${record.topics[0] ?? 'general'}`)
      .toLowerCase()
      .trim();

    // 1. If the record already carries a verified image URL, cache its attribution and reuse it
    if (record.visual.imageUrl && isSafeImageUrl(record.visual.imageUrl)) {
      const assetId = record.visual.assetId ?? createSecureId('vis');
      await this.repository.save({
        id: assetId,
        queryKey,
        imageUrl: record.visual.imageUrl,
        alt: record.visual.alt,
        provider: record.visual.provider ?? 'Open Collection',
        attribution: record.visual.attribution ?? record.source.publisher,
        license: record.visual.license ?? 'Public / Open Access',
        sourceUrl: record.source.url,
        cachedAt: new Date().toISOString(),
      });

      return {
        ...record.visual,
        assetId,
        accentColor: record.visual.accentColor ?? categoryMeta.accentHex,
      };
    }

    // 2. Check cached visual asset pool — skip for specific current-affairs news to avoid misrepresenting events
    if (record.category !== 'news') {
      const cached = await this.repository.findByQueryKey(queryKey);
      if (cached && cached.imageUrl && isSafeImageUrl(cached.imageUrl)) {
        return {
          type: 'open_collection',
          query: queryKey,
          assetId: cached.id,
          imageUrl: cached.imageUrl,
          alt: record.visual.alt || cached.alt,
          attribution: cached.attribution,
          license: cached.license,
          provider: cached.provider,
          accentColor: record.visual.accentColor ?? categoryMeta.accentHex,
        };
      }
    }

    // 3. Editorial visual fallback: attach curated section cover photography for evergreen/feature items
    const sectionCover =
      record.category !== 'news' && isSafeImageUrl(categoryMeta.coverImage)
        ? categoryMeta.coverImage
        : undefined;

    return {
      type: sectionCover ? 'editorial_illustration' : 'gradient_emblem',
      query: queryKey,
      assetId: null,
      imageUrl: sectionCover,
      alt: record.visual.alt || `${record.title} — ${categoryMeta.shortLabel}`,
      attribution: sectionCover
        ? `Curio Editorial Photography · ${categoryMeta.shortLabel}`
        : 'Curio Editorial Graphics',
      license: 'First-party Curio Visual',
      provider: 'Curio Design System',
      accentColor: record.visual.accentColor ?? categoryMeta.accentHex,
    };
  }
}
