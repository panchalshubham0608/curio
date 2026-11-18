import type { FeedSession } from '../../shared/validation/contentSchemas';
import type { SessionRepository } from '../ports';

export interface SessionProgressPatch {
  currentIndex?: number;
  markCompletedContentId?: string;
  markSessionComplete?: boolean;
  reflectionNote?: string;
}

export class UpdateSessionProgressUseCase {
  private readonly sessionRepository: SessionRepository;

  constructor(sessionRepository: SessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  public async execute(
    userId: string,
    sessionId: string,
    patch: SessionProgressPatch
  ): Promise<FeedSession | null> {
    const existing = await this.sessionRepository.getById(userId, sessionId);
    if (!existing) return null;

    const completedSet = new Set(existing.completedItemIds);
    if (patch.markCompletedContentId) {
      completedSet.add(patch.markCompletedContentId);
    }

    const updatePayload: Partial<FeedSession> = {
      completedItemIds: Array.from(completedSet),
    };

    if (typeof patch.currentIndex === 'number') {
      updatePayload.currentIndex = Math.max(
        0,
        Math.min(Math.max(0, existing.itemRefs.length - 1), patch.currentIndex)
      );
    }

    if (patch.markSessionComplete && !existing.completedAt) {
      updatePayload.completedAt = new Date().toISOString();
    }

    if (typeof patch.reflectionNote === 'string') {
      updatePayload.reflectionNote = patch.reflectionNote.trim().slice(0, 500);
    }

    await this.sessionRepository.update(userId, sessionId, updatePayload);
    return this.sessionRepository.getById(userId, sessionId);
  }
}
