import type { ContentDiscoveryRequest, ContentProvider } from '../../application/ports';
import type { ContentCandidate } from '../../domain/content/Content';
import { logWarn } from '../../shared/utils/logger';
import { stripHtmlToPlainText, truncateText } from '../../shared/utils/sanitize';
import { isSafeHttpsUrl } from '../../shared/validation/urlValidation';
import type { ContentCategory } from '../../shared/validation/contentSchemas';

export interface CuratedRssFeed {
  publisher: string;
  url: string;
  category: ContentCategory;
  defaultTopics: string[];
}

// Strictly allowlisted HTTPS feeds — never fetch arbitrary user-supplied URLs from the browser
export const ALLOWLISTED_RSS_FEEDS: readonly CuratedRssFeed[] = [
  {
    publisher: 'NASA Breaking News',
    url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    category: 'science',
    defaultTopics: ['space', 'nasa', 'astronomy'],
  },
];

/**
 * Safely parses RSS/Atom XML text into normalized ContentCandidates using DOMParser
 * (never innerHTML, never executes scripts, strictly validates every URL).
 */
export function parseRssXmlSafely(
  xmlText: string,
  feedMeta: CuratedRssFeed,
  nowIso = new Date().toISOString()
): ContentCandidate[] {
  if (typeof DOMParser === 'undefined' || !xmlText.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    return [];
  }

  const itemNodes = Array.from(doc.querySelectorAll('item, entry')).slice(0, 12);
  const candidates: ContentCandidate[] = [];

  for (const node of itemNodes) {
    const rawTitle = node.querySelector('title')?.textContent ?? '';
    const linkEl = node.querySelector('link');
    const rawLink = linkEl?.getAttribute('href') ?? linkEl?.textContent ?? '';
    const rawDesc =
      node.querySelector('description')?.textContent ??
      node.querySelector('summary')?.textContent ??
      '';
    const rawPubDate =
      node.querySelector('pubDate')?.textContent ??
      node.querySelector('updated')?.textContent ??
      undefined;

    const cleanTitle = truncateText(stripHtmlToPlainText(rawTitle), 200);
    const cleanSummary = truncateText(stripHtmlToPlainText(rawDesc), 700);
    const trimmedLink = rawLink.trim();

    if (!cleanTitle || !isSafeHttpsUrl(trimmedLink)) {
      continue;
    }

    let publishedAt: string | undefined;
    if (rawPubDate) {
      const parsedDate = new Date(rawPubDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate.toISOString();
      }
    }

    candidates.push({
      title: cleanTitle,
      category: feedMeta.category,
      topics: feedMeta.defaultTopics,
      contentType: 'quick_bite',
      cardVariant: 'article',
      summary: cleanSummary || cleanTitle,
      source: {
        publisher: feedMeta.publisher,
        title: cleanTitle,
        url: trimmedLink,
        publishedAt,
        retrievedAt: nowIso,
      },
    });
  }

  return candidates;
}

export class RssContentProvider implements ContentProvider {
  public readonly name = 'rss_content_provider';
  private readonly feeds: readonly CuratedRssFeed[];
  private readonly enabled: boolean;

  constructor(feeds: readonly CuratedRssFeed[] = ALLOWLISTED_RSS_FEEDS, enabled = false) {
    this.feeds = feeds;
    this.enabled = enabled;
  }

  public async discover(input: ContentDiscoveryRequest): Promise<ContentCandidate[]> {
    if (!this.enabled) {
      return [];
    }

    const categorySet = new Set(input.categories);
    const matchingFeeds = this.feeds.filter((feed) => categorySet.has(feed.category));
    const results: ContentCandidate[] = [];

    for (const feed of matchingFeeds) {
      if (!isSafeHttpsUrl(feed.url)) continue;
      try {
        const response = await fetch(feed.url, { method: 'GET' });
        if (!response.ok) continue;
        const xmlText = await response.text();
        results.push(...parseRssXmlSafely(xmlText, feed));
      } catch {
        logWarn('RSS discovery skipped due to network or CORS restriction', {
          publisher: feed.publisher,
        });
      }
    }

    return results.slice(0, input.limit);
  }
}
