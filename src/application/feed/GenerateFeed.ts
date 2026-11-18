import type {
  FeedGenerationRequest,
  FeedGenerationResult,
} from '../../domain/feed/Feed';
import { createSecureId } from '../../shared/utils/ids';
import type {
  ContentCategory,
  SessionDurationMinutes,
} from '../../shared/validation/contentSchemas';
import type { FeedExecutor, SessionRepository } from '../ports';

export interface GenerateFeedInput {
  userId: string;
  durationMinutes: SessionDurationMinutes;
  sessionId?: string;
  topicFocus?: string;
  categoryFocus?: ContentCategory;
  excludeContentIds?: string[];
}

export class GenerateFeedUseCase {
  private readonly executor: FeedExecutor;
  private readonly sessionRepository: SessionRepository;

  constructor(executor: FeedExecutor, sessionRepository: SessionRepository) {
    this.executor = executor;
    this.sessionRepository = sessionRepository;
  }

  public async execute(input: GenerateFeedInput): Promise<FeedGenerationResult> {
    const sessionId = input.sessionId ?? createSecureId('sess');

    // Automatically gather recently presented items from recent sessions to avoid immediate repeats
    const recentSessions = await this.sessionRepository.listRecent(input.userId, 3);
    const recentContentIds = recentSessions
      .filter((s) => s.id !== sessionId)
      .flatMap((s) => s.itemRefs.map((ref) => ref.contentId));

    const excludeContentIds = Array.from(
      new Set([...(input.excludeContentIds ?? []), ...recentContentIds])
    );

    const request: FeedGenerationRequest = {
      userId: input.userId,
      sessionId,
      durationMinutes: input.durationMinutes,
      excludeContentIds,
      topicFocus: input.topicFocus,
      categoryFocus: input.categoryFocus,
    };

    return this.executor.generate(request);
  }
}
