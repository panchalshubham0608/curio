import type { FeedSession } from '../../shared/validation/contentSchemas';
import type { SessionRepository } from '../ports';

export interface HomeFeedOverview {
  activeSession: FeedSession | null;
  recentSessions: FeedSession[];
  completedSessionsCount: number;
}

export class GetFeedUseCase {
  private readonly sessionRepository: SessionRepository;

  constructor(sessionRepository: SessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  public async execute(userId: string): Promise<HomeFeedOverview> {
    const [activeSession, recentSessions] = await Promise.all([
      this.sessionRepository.getLatestActive(userId),
      this.sessionRepository.listRecent(userId, 20),
    ]);

    const completedSessionsCount = recentSessions.filter((s) => Boolean(s.completedAt)).length;

    return {
      activeSession,
      recentSessions,
      completedSessionsCount,
    };
  }
}
