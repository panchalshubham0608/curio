import type { SavedCollection } from '../../shared/validation/contentSchemas';

export const DEFAULT_SAVED_COLLECTIONS: ReadonlyArray<{
  id: string;
  name: string;
  description: string;
}> = [
  {
    id: 'col_learned',
    name: "Interesting Things I've Learned",
    description: 'Facts, mental models, and insights worth remembering.',
  },
  {
    id: 'col_tech',
    name: 'Technology to Explore',
    description: 'AI breakthroughs, engineering ideas, and tools to investigate.',
  },
  {
    id: 'col_places',
    name: 'Places I Want to Visit',
    description: 'Destinations, culinary traditions, and travel inspiration.',
  },
  {
    id: 'col_read_later',
    name: 'Read Later',
    description: 'Longer essays and deep dives saved for a quiet moment.',
  },
];

export function createDefaultCollections(nowIso = new Date().toISOString()): SavedCollection[] {
  return DEFAULT_SAVED_COLLECTIONS.map((col) => ({
    id: col.id,
    name: col.name,
    description: col.description,
    isDefault: true,
    createdAt: nowIso,
  }));
}
