import { AskContentQuestionUseCase } from '../../application/ai/AskContentQuestion';
import { FeedOrchestrator } from '../../application/feed/FeedOrchestrator';
import { GenerateFeedUseCase } from '../../application/feed/GenerateFeed';
import { GetFeedUseCase } from '../../application/feed/GetFeed';
import { GetSessionUseCase } from '../../application/feed/GetSession';
import { UpdateSessionProgressUseCase } from '../../application/feed/UpdateSessionProgress';
import { RecordInteractionUseCase } from '../../application/interactions/RecordInteraction';
import {
  GetSavedLibraryUseCase,
  SaveContentUseCase,
} from '../../application/library/SavedLibraryUseCases';
import type {
  AIEnrichmentProvider,
  ContentProvider,
  ContentRepository,
  FeedExecutor,
  InteractionRepository,
  SavedLibraryRepository,
  SessionRepository,
  UserPreferencesRepository,
  VisualAssetRepository,
} from '../../application/ports';
import {
  GetPreferencesUseCase,
  ResetPersonalizationUseCase,
  UpdatePreferencesUseCase,
} from '../../application/preferences/PreferencesUseCases';
import { GeminiProvider } from '../../infrastructure/ai/GeminiProvider';
import { LocalFallbackAIProvider } from '../../infrastructure/ai/LocalFallbackAIProvider';
import { VisualAssetService } from '../../infrastructure/assets/VisualAssetService';
import { CompositeContentProvider } from '../../infrastructure/content/CompositeContentProvider';
import { GeneratedFeedProvider } from '../../infrastructure/content/GeneratedFeedProvider';
import { NasaContentProvider } from '../../infrastructure/content/NasaContentProvider';
import { RssContentProvider } from '../../infrastructure/content/RssContentProvider';
import { OnDemandFeedExecutor } from '../../infrastructure/execution/OnDemandFeedExecutor';
import { getFirebaseRuntime } from '../../infrastructure/firebase/firebaseClient';
import {
  FirestoreContentRepository,
  FirestoreInteractionRepository,
  FirestoreSavedLibraryRepository,
  FirestoreSessionRepository,
  FirestoreUserRepository,
  FirestoreVisualAssetRepository,
} from '../../infrastructure/persistence/FirestoreRepositories';
import { createClearedUserPreferences } from '../../domain/user/UserPreferences';
import {
  clearLocalUserData,
  LocalContentRepository,
  LocalInteractionRepository,
  LocalSavedLibraryRepository,
  LocalSessionRepository,
  LocalUserRepository,
  LocalVisualAssetRepository,
} from '../../infrastructure/persistence/LocalRepositories';
import { SafeKeyValueStore } from '../../infrastructure/persistence/LocalStorageStore';
import {
  GeneratedPuzzleProvider,
  type PuzzleProvider,
} from '../../infrastructure/puzzles/PuzzleProvider';
import type { UserPreferences } from '../../shared/validation/contentSchemas';

export interface CurioServices {
  readonly mode: 'firebase' | 'local';
  readonly aiMode: 'gemini_firebase_ai' | 'local_grounded';
  readonly aiModelName: string;
  readonly feedExecutor: FeedExecutor;
  readonly generateFeed: GenerateFeedUseCase;
  readonly getSession: GetSessionUseCase;
  readonly getFeed: GetFeedUseCase;
  readonly updateSessionProgress: UpdateSessionProgressUseCase;
  readonly recordInteraction: RecordInteractionUseCase;
  readonly saveContent: SaveContentUseCase;
  readonly getSavedLibrary: GetSavedLibraryUseCase;
  readonly askContentQuestion: AskContentQuestionUseCase;
  readonly getPreferences: GetPreferencesUseCase;
  readonly updatePreferences: UpdatePreferencesUseCase;
  readonly resetPersonalization: ResetPersonalizationUseCase;
  readonly clearLocalGuestProfile: (guestUserId: string) => Promise<UserPreferences>;
  readonly contentRepository: ContentRepository;
  readonly puzzleProvider: PuzzleProvider;
}

export function buildCurioServices(options?: {
  forceLocalStore?: SafeKeyValueStore;
  useCloudFirestore?: boolean;
  contentProvider?: ContentProvider;
  puzzleProvider?: PuzzleProvider;
}): CurioServices {
  const runtime = options?.forceLocalStore ? null : getFirebaseRuntime();
  const useFirebase = Boolean(runtime && options?.useCloudFirestore !== false);
  const localStore = options?.forceLocalStore ?? new SafeKeyValueStore('curio_v1', true);

  let contentRepository: ContentRepository;
  let sessionRepository: SessionRepository;
  let preferencesRepository: UserPreferencesRepository;
  let interactionRepository: InteractionRepository;
  let savedLibraryRepository: SavedLibraryRepository;
  let visualAssetRepository: VisualAssetRepository;

  if (useFirebase && runtime) {
    contentRepository = new FirestoreContentRepository(runtime.firestore);
    sessionRepository = new FirestoreSessionRepository(runtime.firestore);
    preferencesRepository = new FirestoreUserRepository(runtime.firestore);
    interactionRepository = new FirestoreInteractionRepository(runtime.firestore);
    savedLibraryRepository = new FirestoreSavedLibraryRepository(runtime.firestore);
    visualAssetRepository = new FirestoreVisualAssetRepository(runtime.firestore);
  } else {
    contentRepository = new LocalContentRepository(localStore);
    sessionRepository = new LocalSessionRepository(localStore);
    preferencesRepository = new LocalUserRepository(localStore);
    interactionRepository = new LocalInteractionRepository(localStore);
    savedLibraryRepository = new LocalSavedLibraryRepository(localStore);
    visualAssetRepository = new LocalVisualAssetRepository(localStore);
  }

  const aiProvider: AIEnrichmentProvider =
    runtime?.ai != null
      ? new GeminiProvider(runtime.ai, runtime.geminiModelName)
      : new LocalFallbackAIProvider();

  const liveDiscoveryEnabled = import.meta.env.VITE_ENABLE_LIVE_DISCOVERY === 'true';
  const contentProvider: ContentProvider =
    options?.contentProvider ??
    new CompositeContentProvider([
      new GeneratedFeedProvider({
        enableRemoteGenerated: !options?.forceLocalStore,
      }),
      new NasaContentProvider(liveDiscoveryEnabled),
      new RssContentProvider(undefined, liveDiscoveryEnabled),
    ]);

  const visualAssetResolver = new VisualAssetService(visualAssetRepository);

  const orchestrator = new FeedOrchestrator({
    contentProvider,
    contentRepository,
    sessionRepository,
    preferencesRepository,
    interactionRepository,
    aiProvider,
    visualAssetResolver,
    generationMode: 'on_demand',
  });

  const feedExecutor = new OnDemandFeedExecutor(orchestrator);
  const puzzleProvider: PuzzleProvider =
    options?.puzzleProvider ??
    new GeneratedPuzzleProvider(localStore, {
      enableRemoteGenerated: !options?.forceLocalStore,
    });

  return {
    mode: useFirebase ? 'firebase' : 'local',
    aiMode: aiProvider.isRemoteAI ? 'gemini_firebase_ai' : 'local_grounded',
    aiModelName: aiProvider.modelName,
    feedExecutor,
    generateFeed: new GenerateFeedUseCase(feedExecutor, sessionRepository),
    getSession: new GetSessionUseCase(sessionRepository, contentRepository),
    getFeed: new GetFeedUseCase(sessionRepository),
    updateSessionProgress: new UpdateSessionProgressUseCase(sessionRepository),
    recordInteraction: new RecordInteractionUseCase(interactionRepository),
    saveContent: new SaveContentUseCase(
      savedLibraryRepository,
      contentRepository,
      interactionRepository
    ),
    getSavedLibrary: new GetSavedLibraryUseCase(
      savedLibraryRepository,
      contentRepository
    ),
    askContentQuestion: new AskContentQuestionUseCase(aiProvider),
    getPreferences: new GetPreferencesUseCase(preferencesRepository),
    updatePreferences: new UpdatePreferencesUseCase(preferencesRepository),
    resetPersonalization: new ResetPersonalizationUseCase(
      preferencesRepository,
      interactionRepository
    ),
    clearLocalGuestProfile: async (guestUserId: string) => {
      clearLocalUserData(localStore, guestUserId);
      await puzzleProvider.clearSolved(guestUserId);
      const cleared = createClearedUserPreferences(guestUserId);
      await new LocalUserRepository(localStore).save(cleared);
      return cleared;
    },
    contentRepository,
    puzzleProvider,
  };
}
