import type { FeedOrchestrator } from '../../application/feed/FeedOrchestrator';
import type { FeedExecutor } from '../../application/ports';
import type {
  FeedGenerationRequest,
  FeedGenerationResult,
} from '../../domain/feed/Feed';

/**
 * Phase 1 Execution Adapter.
 * Executes feed generation synchronously on demand while preserving the exact
 * FeedExecutor contract and session lifecycle (`pending | processing | ready | failed`)
 * so Phase 2 can introduce a `BackgroundFeedExecutor` without changing any UI code.
 */
export class OnDemandFeedExecutor implements FeedExecutor {
  private readonly orchestrator: FeedOrchestrator;
  private readonly inflightRequests = new Map<string, Promise<FeedGenerationResult>>();

  constructor(orchestrator: FeedOrchestrator) {
    this.orchestrator = orchestrator;
  }

  public async generate(request: FeedGenerationRequest): Promise<FeedGenerationResult> {
    const dedupeKey = `${request.userId}::${request.sessionId}`;
    const existing = this.inflightRequests.get(dedupeKey);
    if (existing) {
      return existing;
    }

    const promise = this.orchestrator.execute(request).finally(() => {
      this.inflightRequests.delete(dedupeKey);
    });

    this.inflightRequests.set(dedupeKey, promise);
    return promise;
  }
}
