import type { ContentCandidate } from '../../domain/content/Content';
import type {
  FeedGenerationRequest,
  FeedGenerationResult,
} from '../../domain/feed/Feed';
import type {
  AIAnswer,
  ContentCategory,
  ContentRecord,
  ContentRegion,
  FeedSession,
  SavedCollection,
  SavedItem,
  UserInteraction,
  UserPreferences,
  VisualAssetRecord,
  VisualReference,
} from '../../shared/validation/contentSchemas';

export interface ContentDiscoveryRequest {
  categories: ContentCategory[];
  topicKeywords: string[];
  limit: number;
  topicFocus?: string;
  region?: ContentRegion;
}

export interface ContentProvider {
  readonly name: string;
  discover(input: ContentDiscoveryRequest): Promise<ContentCandidate[]>;
}

export interface CandidateQuery {
  categories?: ContentCategory[];
  limit?: number;
}

export interface ContentRepository {
  findCandidates(input: CandidateQuery): Promise<ContentRecord[]>;
  getById(id: string): Promise<ContentRecord | null>;
  getByIds(ids: string[]): Promise<ContentRecord[]>;
  saveMany(items: ContentRecord[]): Promise<void>;
  clearCache?(): Promise<void>;
}

export interface SessionRepository {
  create(session: FeedSession): Promise<void>;
  getById(userId: string, sessionId: string): Promise<FeedSession | null>;
  getLatestActive(userId: string): Promise<FeedSession | null>;
  listRecent(userId: string, limit?: number): Promise<FeedSession[]>;
  update(userId: string, sessionId: string, patch: Partial<FeedSession>): Promise<void>;
}

export interface UserPreferencesRepository {
  get(userId: string): Promise<UserPreferences>;
  save(preferences: UserPreferences): Promise<void>;
  reset(userId: string): Promise<UserPreferences>;
}

export interface InteractionRepository {
  record(interaction: UserInteraction): Promise<void>;
  listRecent(userId: string, limit?: number): Promise<UserInteraction[]>;
  clearForUser(userId: string): Promise<void>;
}

export interface SavedLibraryRepository {
  listCollections(userId: string): Promise<SavedCollection[]>;
  createCollection(userId: string, collection: SavedCollection): Promise<void>;
  listSavedItems(userId: string): Promise<SavedItem[]>;
  saveItem(userId: string, item: SavedItem): Promise<void>;
  removeItem(userId: string, contentId: string): Promise<void>;
}

export interface VisualAssetRepository {
  findByQueryKey(queryKey: string): Promise<VisualAssetRecord | null>;
  save(asset: VisualAssetRecord): Promise<void>;
}

export interface VisualAssetResolver {
  resolve(record: ContentRecord): Promise<VisualReference>;
}

export type QuickAIPromptAction =
  | 'explain_simply'
  | 'give_analogy'
  | 'why_it_matters'
  | 'related_concepts'
  | 'generate_quiz'
  | 'custom';

export interface EnrichmentRequest {
  record: ContentRecord;
}

export interface ContentQuestionRequest {
  record: ContentRecord;
  action: QuickAIPromptAction;
  customQuestion?: string;
}

export interface AIEnrichmentProvider {
  readonly modelName: string;
  readonly isRemoteAI: boolean;
  enrich(input: EnrichmentRequest): Promise<ContentRecord>;
  answerQuestion(input: ContentQuestionRequest): Promise<AIAnswer>;
}

export interface FeedExecutor {
  generate(request: FeedGenerationRequest): Promise<FeedGenerationResult>;
}
