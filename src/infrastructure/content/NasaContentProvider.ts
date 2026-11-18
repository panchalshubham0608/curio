import type { ContentDiscoveryRequest, ContentProvider } from '../../application/ports';
import type { ContentCandidate } from '../../domain/content/Content';
import { logWarn } from '../../shared/utils/logger';
import { stripHtmlToPlainText, truncateText } from '../../shared/utils/sanitize';
import { isSafeImageUrl } from '../../shared/validation/urlValidation';

interface NasaLibraryResponse {
  collection?: {
    items?: Array<{
      data?: Array<{
        nasa_id?: string;
        title?: string;
        description?: string;
        date_created?: string;
        keywords?: string[];
      }>;
      links?: Array<{
        href?: string;
        rel?: string;
      }>;
    }>;
  };
}

/**
 * Public open-access NASA Image Library discovery adapter.
 * Requires no private API keys and preserves NASA public-domain attribution metadata.
 */
export class NasaContentProvider implements ContentProvider {
  public readonly name = 'nasa_open_library';
  private readonly enabled: boolean;

  constructor(enabled = false) {
    this.enabled = enabled;
  }

  public async discover(input: ContentDiscoveryRequest): Promise<ContentCandidate[]> {
    if (!this.enabled) return [];

    const wantsScience =
      input.categories.includes('science') ||
      input.categories.includes('facts') ||
      Boolean(input.topicFocus && /space|nasa|planet|star|cosmos|moon|mars/i.test(input.topicFocus));

    if (!wantsScience) return [];

    const searchQuery = encodeURIComponent(input.topicFocus || 'james webb telescope');
    const endpoint = `https://images-api.nasa.gov/search?q=${searchQuery}&media_type=image&page_size=6`;

    try {
      const response = await fetch(endpoint, { method: 'GET' });
      if (!response.ok) return [];
      const payload = (await response.json()) as NasaLibraryResponse;
      const items = payload.collection?.items ?? [];
      const nowIso = new Date().toISOString();
      const candidates: ContentCandidate[] = [];

      for (const item of items) {
        const meta = item.data?.[0];
        const previewHref = item.links?.find((l) => l.rel === 'preview')?.href;
        if (!meta?.title || !meta.nasa_id) continue;

        const cleanTitle = truncateText(stripHtmlToPlainText(meta.title), 180);
        const cleanDesc = truncateText(
          stripHtmlToPlainText(meta.description ?? meta.title),
          650
        );
        const safeImage = previewHref && isSafeImageUrl(previewHref) ? previewHref : undefined;

        candidates.push({
          title: cleanTitle,
          category: 'science',
          topics: (meta.keywords ?? ['space', 'nasa']).slice(0, 4).map((k) => k.toLowerCase()),
          contentType: 'visual_explainer',
          cardVariant: safeImage ? 'hero_image' : 'article',
          summary: cleanDesc,
          source: {
            publisher: 'NASA Image & Video Library',
            title: cleanTitle,
            url: `https://images.nasa.gov/details/${encodeURIComponent(meta.nasa_id)}`,
            publishedAt: meta.date_created,
            retrievedAt: nowIso,
          },
          visual: {
            type: safeImage ? 'open_collection' : 'gradient_emblem',
            query: `nasa ${cleanTitle.slice(0, 60)}`,
            imageUrl: safeImage,
            alt: cleanTitle,
            attribution: 'NASA Open Imagery Archive',
            license: 'NASA Media Usage Guidelines (Public Domain)',
            provider: 'NASA',
          },
        });
      }

      return candidates.slice(0, input.limit);
    } catch {
      logWarn('NASA open library fetch failed; relying on cached/evergreen content');
      return [];
    }
  }
}
