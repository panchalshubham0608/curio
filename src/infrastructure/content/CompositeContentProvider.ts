import type { ContentDiscoveryRequest, ContentProvider } from '../../application/ports';
import type { ContentCandidate } from '../../domain/content/Content';
import { logWarn } from '../../shared/utils/logger';

/**
 * Combines multiple ContentProviders with per-provider fault isolation
 * so a single failing external source never blocks discovery.
 */
export class CompositeContentProvider implements ContentProvider {
  public readonly name = 'composite_content_provider';
  private readonly providers: ContentProvider[];

  constructor(providers: ContentProvider[]) {
    this.providers = providers;
  }

  public async discover(input: ContentDiscoveryRequest): Promise<ContentCandidate[]> {
    const settled = await Promise.allSettled(
      this.providers.map((provider) => provider.discover(input))
    );

    const collected: ContentCandidate[] = [];
    settled.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        collected.push(...outcome.value);
      } else {
        logWarn('Content provider failed during discovery', {
          provider: this.providers[index]?.name ?? 'unknown',
        });
      }
    });

    return collected;
  }
}
