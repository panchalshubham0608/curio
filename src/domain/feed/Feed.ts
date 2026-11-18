import type {
  ContentCategory,
  ContentRecord,
  FeedSession,
  FeedStatus,
  SessionDurationMinutes,
} from '../../shared/validation/contentSchemas';

export interface GeneratedFeed {
  session: FeedSession;
  items: ContentRecord[];
  totalEstimatedSeconds: number;
  categoriesCovered: ContentCategory[];
}

export interface FeedGenerationRequest {
  userId: string;
  sessionId: string;
  durationMinutes: SessionDurationMinutes;
  excludeContentIds: string[];
  topicFocus?: string;
  categoryFocus?: ContentCategory;
}

export interface FeedGenerationResult {
  sessionId: string;
  status: FeedStatus;
  feed?: GeneratedFeed;
  error?: {
    code: string;
    message: string;
  };
}

export interface SessionSummaryStats {
  totalItems: number;
  completedCount: number;
  savedCount: number;
  categoriesExplored: ContentCategory[];
  keyTakeaways: string[];
  suggestedNextTopic?: {
    topic: string;
    category: ContentCategory;
    prompt: string;
  };
}

export function computeSessionSummary(
  session: FeedSession,
  items: ContentRecord[],
  savedContentIds: ReadonlySet<string>
): SessionSummaryStats {
  const completedSet = new Set(session.completedItemIds);
  const categoriesExplored = Array.from(new Set(items.map((item) => item.category)));
  const savedCount = items.filter((item) => savedContentIds.has(item.id)).length;

  const keyTakeaways: string[] = [];
  let suggestedNextTopic: SessionSummaryStats['suggestedNextTopic'];

  for (const item of items) {
    const takeawayBlock = item.blocks.find((block) => block.type === 'key_takeaway');
    if (takeawayBlock && takeawayBlock.type === 'key_takeaway' && takeawayBlock.points[0]) {
      keyTakeaways.push(takeawayBlock.points[0]);
    } else if (keyTakeaways.length < 3) {
      keyTakeaways.push(item.title);
    }

    if (!suggestedNextTopic) {
      const rabbitHole = item.blocks.find((block) => block.type === 'rabbit_hole');
      if (rabbitHole && rabbitHole.type === 'rabbit_hole') {
        suggestedNextTopic = {
          topic: rabbitHole.topic,
          category: rabbitHole.category,
          prompt: rabbitHole.prompt,
        };
      }
    }
  }

  return {
    totalItems: items.length,
    completedCount: Math.max(completedSet.size, session.completedAt ? items.length : 0),
    savedCount,
    categoriesExplored,
    keyTakeaways: keyTakeaways.slice(0, 4),
    suggestedNextTopic,
  };
}
