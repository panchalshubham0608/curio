import { createSecureId } from '../../shared/utils/ids';
import {
  UserInteractionSchema,
  type InteractionAction,
  type UserInteraction,
} from '../../shared/validation/contentSchemas';
import type { InteractionRepository } from '../ports';

export interface RecordInteractionInput {
  userId: string;
  contentId: string;
  sessionId?: string;
  action: InteractionAction;
}

export class RecordInteractionUseCase {
  private readonly interactionRepository: InteractionRepository;

  constructor(interactionRepository: InteractionRepository) {
    this.interactionRepository = interactionRepository;
  }

  public async execute(input: RecordInteractionInput): Promise<UserInteraction> {
    const record = UserInteractionSchema.parse({
      id: createSecureId('int'),
      userId: input.userId,
      contentId: input.contentId,
      sessionId: input.sessionId,
      action: input.action,
      createdAt: new Date().toISOString(),
    });

    await this.interactionRepository.record(record);
    return record;
  }
}
