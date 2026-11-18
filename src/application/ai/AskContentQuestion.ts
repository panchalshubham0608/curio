import { RateLimiter } from '../../shared/utils/rateLimiter';
import { withTimeout } from '../../shared/utils/retry';
import {
  AIAnswerSchema,
  type AIAnswer,
  type ContentRecord,
} from '../../shared/validation/contentSchemas';
import type { AIEnrichmentProvider, QuickAIPromptAction } from '../ports';

export interface AskContentQuestionInput {
  userId: string;
  record: ContentRecord;
  action: QuickAIPromptAction;
  customQuestion?: string;
}

export class RateLimitExceededError extends Error {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    super(`Too many questions in a short window. Please wait ${seconds}s before asking again.`);
    this.name = 'RateLimitExceededError';
    this.retryAfterSeconds = seconds;
  }
}

const QUESTION_TIMEOUT_MS = 12_000;

export class AskContentQuestionUseCase {
  private readonly aiProvider: AIEnrichmentProvider;
  private readonly rateLimiter: RateLimiter;

  constructor(
    aiProvider: AIEnrichmentProvider,
    rateLimiter = new RateLimiter(12, 60_000)
  ) {
    this.aiProvider = aiProvider;
    this.rateLimiter = rateLimiter;
  }

  public async execute(input: AskContentQuestionInput): Promise<AIAnswer> {
    const quota = this.rateLimiter.tryConsume(input.userId);
    if (!quota.allowed) {
      throw new RateLimitExceededError(quota.retryAfterMs);
    }

    const trimmedQuestion = input.customQuestion?.trim().slice(0, 320);
    if (input.action === 'custom' && (!trimmedQuestion || trimmedQuestion.length < 3)) {
      throw new Error('Please enter a question with at least 3 characters.');
    }

    const answer = await withTimeout(
      () =>
        this.aiProvider.answerQuestion({
          record: input.record,
          action: input.action,
          customQuestion: trimmedQuestion,
        }),
      QUESTION_TIMEOUT_MS
    );

    return AIAnswerSchema.parse(answer);
  }
}
