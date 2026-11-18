import { createDefaultCollections } from '../../domain/library/SavedLibrary';
import { createSecureId } from '../../shared/utils/ids';
import {
  SavedCollectionSchema,
  SavedItemSchema,
  type ContentRecord,
  type SavedCollection,
  type SavedItem,
} from '../../shared/validation/contentSchemas';
import type {
  ContentRepository,
  InteractionRepository,
  SavedLibraryRepository,
} from '../ports';
import { RecordInteractionUseCase } from '../interactions/RecordInteraction';

export interface ResolvedSavedEntry {
  savedItem: SavedItem;
  content: ContentRecord;
}

export interface SavedLibrarySnapshot {
  collections: SavedCollection[];
  entries: ResolvedSavedEntry[];
  savedContentIds: Set<string>;
}

export class SaveContentUseCase {
  private readonly savedLibraryRepository: SavedLibraryRepository;
  private readonly contentRepository: ContentRepository;
  private readonly recordInteraction: RecordInteractionUseCase;

  constructor(
    savedLibraryRepository: SavedLibraryRepository,
    contentRepository: ContentRepository,
    interactionRepository: InteractionRepository
  ) {
    this.savedLibraryRepository = savedLibraryRepository;
    this.contentRepository = contentRepository;
    this.recordInteraction = new RecordInteractionUseCase(interactionRepository);
  }

  public async save(
    userId: string,
    content: ContentRecord,
    collectionId: string,
    sessionId?: string
  ): Promise<SavedItem> {
    await this.contentRepository.saveMany([content]);
    const item = SavedItemSchema.parse({
      id: `save_${content.id}`,
      contentId: content.id,
      collectionId,
      savedAt: new Date().toISOString(),
    });
    await this.savedLibraryRepository.saveItem(userId, item);
    await this.recordInteraction.execute({
      userId,
      contentId: content.id,
      sessionId,
      action: 'saved',
    });
    return item;
  }

  public async remove(userId: string, contentId: string): Promise<void> {
    await this.savedLibraryRepository.removeItem(userId, contentId);
  }

  public async createCollection(
    userId: string,
    name: string,
    description?: string
  ): Promise<SavedCollection> {
    const collection = SavedCollectionSchema.parse({
      id: createSecureId('col'),
      name: name.trim(),
      description: description?.trim() || undefined,
      isDefault: false,
      createdAt: new Date().toISOString(),
    });
    await this.savedLibraryRepository.createCollection(userId, collection);
    return collection;
  }
}

export class GetSavedLibraryUseCase {
  private readonly savedLibraryRepository: SavedLibraryRepository;
  private readonly contentRepository: ContentRepository;

  constructor(
    savedLibraryRepository: SavedLibraryRepository,
    contentRepository: ContentRepository
  ) {
    this.savedLibraryRepository = savedLibraryRepository;
    this.contentRepository = contentRepository;
  }

  public async execute(userId: string): Promise<SavedLibrarySnapshot> {
    let collections = await this.savedLibraryRepository.listCollections(userId);
    if (collections.length === 0) {
      const defaults = createDefaultCollections();
      for (const col of defaults) {
        await this.savedLibraryRepository.createCollection(userId, col);
      }
      collections = defaults;
    }

    const savedItems = await this.savedLibraryRepository.listSavedItems(userId);
    const records = await this.contentRepository.getByIds(
      savedItems.map((item) => item.contentId)
    );
    const byId = new Map(records.map((item) => [item.id, item]));

    const entries: ResolvedSavedEntry[] = [];
    for (const savedItem of savedItems) {
      const content = byId.get(savedItem.contentId);
      if (content) {
        entries.push({ savedItem, content });
      }
    }

    entries.sort((a, b) => b.savedItem.savedAt.localeCompare(a.savedItem.savedAt));

    return {
      collections,
      entries,
      savedContentIds: new Set(entries.map((entry) => entry.content.id)),
    };
  }
}
