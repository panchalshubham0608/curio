import type { GeneratedFeed } from '../../domain/feed/Feed';
import type { ContentRecord, FeedSession } from '../../shared/validation/contentSchemas';
import type { ContentRepository, SessionRepository } from '../ports';

export interface LoadedSession {
  session: FeedSession;
  feed?: GeneratedFeed;
}

export class GetSessionUseCase {
  private readonly sessionRepository: SessionRepository;
  private readonly contentRepository: ContentRepository;

  constructor(
    sessionRepository: SessionRepository,
    contentRepository: ContentRepository
  ) {
    this.sessionRepository = sessionRepository;
    this.contentRepository = contentRepository;
  }

  public async execute(userId: string, sessionId: string): Promise<LoadedSession | null> {
    const session = await this.sessionRepository.getById(userId, sessionId);
    if (!session) {
      return null;
    }

    if (session.status !== 'ready') {
      return { session };
    }

    const sortedRefs = [...session.itemRefs].sort((a, b) => a.position - b.position);
    const records = await this.contentRepository.getByIds(
      sortedRefs.map((ref) => ref.contentId)
    );
    const byId = new Map(records.map((item) => [item.id, item]));
    const orderedItems = sortedRefs
      .map((ref) => byId.get(ref.contentId))
      .filter((item): item is ContentRecord => item !== undefined);

    const totalEstimatedSeconds = orderedItems.reduce(
      (sum, item) => sum + item.estimatedDurationSeconds,
      0
    );
    const categoriesCovered = Array.from(new Set(orderedItems.map((item) => item.category)));

    return {
      session,
      feed: {
        session,
        items: orderedItems,
        totalEstimatedSeconds,
        categoriesCovered,
      },
    };
  }
}
