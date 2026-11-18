import {
  PuzzleSchema,
  type Puzzle,
  type PuzzleKind,
} from '../../shared/validation/puzzleSchemas';
import type { ContentCategory } from '../../shared/validation/contentSchemas';
import type { SafeKeyValueStore } from '../persistence/LocalStorageStore';

export interface PuzzleQueryOptions {
  kind?: PuzzleKind;
  category?: ContentCategory;
  excludeIds?: readonly string[];
}

/**
 * Provider boundary for interactive Curio puzzles.
 * Ships with `CuratedPuzzleProvider` today and allows plugging in an AI-backed
 * generator (validated by `PuzzleSchema`) later with zero UI refactoring.
 */
export interface PuzzleProvider {
  listPuzzles(options?: PuzzleQueryOptions): Promise<Puzzle[]>;
  generateNextPuzzle(options?: PuzzleQueryOptions): Promise<Puzzle | null>;
  getSolvedIds(userId: string): Promise<Set<string>>;
  markSolved(userId: string, puzzleId: string): Promise<Set<string>>;
  clearSolved(userId: string): Promise<void>;
}

const RAW_CURATED_PUZZLES: readonly unknown[] = [
  {
    schemaVersion: 1,
    id: 'puz_odd_planets',
    kind: 'odd_one_out',
    title: 'Solar Spin',
    category: 'science',
    difficulty: 'Warm-up',
    prompt: 'Three of these planets spin in the same direction. Which one rotates backward?',
    hint: 'On this planet, the Sun rises in the west and sets in the east.',
    options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
    correctIndex: 1,
    explanation:
      'Venus exhibits retrograde rotation—it spins clockwise on its axis when viewed from above Earth’s North Pole, opposite to Mercury, Mars, and Jupiter.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_pattern_steps',
    kind: 'pattern_sequence',
    title: 'Growing Gaps',
    category: 'facts',
    difficulty: 'Warm-up',
    prompt: 'What number comes next in this sequence?',
    sequenceItems: ['2', '6', '12', '20', '30', '?'],
    hint: 'Look at the difference between each pair of neighbors: +4, +6, +8…',
    options: ['38', '40', '42', '44'],
    correctIndex: 2,
    explanation:
      'Each step adds the next even number (+4, +6, +8, +10, +12). It’s also n × (n + 1): 6 × 7 = 42.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_myth_goldfish',
    kind: 'true_or_myth',
    title: 'Three-Second Memory?',
    category: 'science',
    difficulty: 'Warm-up',
    prompt: 'Goldfish really only have a three-second memory span.',
    hint: 'Think about whether fish can learn where and when food appears.',
    options: ['True Fact', 'Pure Myth'],
    correctIndex: 1,
    explanation:
      'Pure myth! Controlled behavioral experiments show goldfish can remember feeding routines, colors, and maze routes for months.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_riddle_maps',
    kind: 'lateral_riddle',
    title: 'Borderless Cities',
    category: 'travel_food',
    difficulty: 'Warm-up',
    prompt: 'I have cities without houses, forests without trees, and oceans without water. What am I?',
    hint: 'Travelers used to fold me neatly into gloveboxes.',
    options: ['A mirage', 'A map', 'A postcard', 'A compass'],
    correctIndex: 1,
    explanation:
      'A map displays labeled cities, green forests, and blue oceans—all printed flat on paper or glass with none of the physical originals.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_odd_fruits',
    kind: 'odd_one_out',
    title: 'Botanical Impostor',
    category: 'travel_food',
    difficulty: 'Clever',
    prompt: 'Botanically speaking, three of these are true berries. Which one is NOT a berry?',
    hint: 'Look closely at where the seeds sit on the fruit.',
    options: ['Banana', 'Strawberry', 'Kiwi', 'Tomato'],
    correctIndex: 1,
    explanation:
      'Bananas, kiwis, and tomatoes all develop from a single ovary with seeds inside—true botanical berries. Strawberries are aggregate accessory fruits with seeds on the outside.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_pattern_letters',
    kind: 'pattern_sequence',
    title: 'Hidden Initials',
    category: 'facts',
    difficulty: 'Clever',
    prompt: 'What letter completes this familiar sequence?',
    sequenceItems: ['O', 'T', 'T', 'F', 'F', 'S', '?'],
    hint: 'Try counting quietly out loud starting from 1.',
    options: ['E', 'N', 'S', 'T'],
    correctIndex: 2,
    explanation:
      'They are the first letters of One, Two, Three, Four, Five, Six—so the next letter is S for Seven!',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_myth_oxford',
    kind: 'true_or_myth',
    title: 'Older Than an Empire',
    category: 'history',
    difficulty: 'Clever',
    prompt: 'Teaching began at Oxford University centuries before the Aztec Empire was founded.',
    hint: 'Compare the late 1000s in England with the founding of Tenochtitlan in 1325.',
    options: ['True Fact', 'Pure Myth'],
    correctIndex: 0,
    explanation:
      'True! Evidence of teaching at Oxford dates back to 1096, whereas Tenochtitlan was founded in 1325 and the Aztec Triple Alliance formed in 1428.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_riddle_clock',
    kind: 'lateral_riddle',
    title: 'The Quiet Helper',
    category: 'growth',
    difficulty: 'Clever',
    prompt: 'The more of it you take away, the larger it becomes. What is it?',
    hint: 'Picture digging in soft sand on a beach.',
    options: ['A shadow', 'A hole', 'A debt', 'A secret'],
    correctIndex: 1,
    explanation:
      'Every scoop of dirt or sand you remove makes a hole bigger rather than smaller.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_odd_tech',
    kind: 'odd_one_out',
    title: 'Silicon Outliers',
    category: 'technology',
    difficulty: 'Clever',
    prompt: 'Three of these technologies were invented in the 19th century. Which one came later?',
    hint: 'One of these waited until the mid-20th century at Bell Labs.',
    options: ['Telephone', 'Morse Telegraph', 'Transistor', 'Light Bulb'],
    correctIndex: 2,
    explanation:
      'The telegraph (1830s), telephone (1876), and practical incandescent bulb (1879) are all 1800s breakthroughs. The transistor was invented in 1947.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_pattern_fibonacci_twist',
    kind: 'pattern_sequence',
    title: 'Double & Nudge',
    category: 'technology',
    difficulty: 'Tricky',
    prompt: 'Spot the rule and choose the missing number.',
    sequenceItems: ['3', '7', '15', '31', '63', '?'],
    hint: 'Double each number and add 1—or compare them to powers of 2.',
    options: ['95', '125', '127', '129'],
    correctIndex: 2,
    explanation:
      'Each term is 2× the previous number plus 1 (or 2ⁿ − 1, the Mersenne numbers): 63 × 2 + 1 = 127.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_myth_honey',
    kind: 'true_or_myth',
    title: 'Timeless Jar',
    category: 'travel_food',
    difficulty: 'Warm-up',
    prompt: 'Sealed natural honey can remain edible for thousands of years without spoiling.',
    hint: 'Think about honey’s low water content and natural acidity.',
    options: ['True Fact', 'Pure Myth'],
    correctIndex: 0,
    explanation:
      'True! Honey’s very low moisture, acidic pH, and trace hydrogen peroxide make it virtually inhospitable to spoilage bacteria when sealed dry.',
    origin: 'curated',
  },
  {
    schemaVersion: 1,
    id: 'puz_riddle_echo',
    kind: 'lateral_riddle',
    title: 'Mountain Voice',
    category: 'humour',
    difficulty: 'Tricky',
    prompt: 'I speak without a mouth and hear without ears. I have no body, yet I come alive with wind and canyon walls. What am I?',
    hint: 'Call out across a quiet valley and wait a second.',
    options: ['A breeze', 'An echo', 'A radio wave', 'A rumor'],
    correctIndex: 1,
    explanation:
      'An echo reflects sound waves off canyon walls or large halls, answering back without a mouth or ears of its own.',
    origin: 'curated',
  },
];

const VALIDATED_CURATED_PUZZLES: readonly Puzzle[] = RAW_CURATED_PUZZLES.flatMap((raw) => {
  const parsed = PuzzleSchema.safeParse(raw);
  return parsed.success ? [parsed.data] : [];
});

/**
 * Curated local puzzle provider backed by Zod-validated seed puzzles and local solved state.
 */
export class CuratedPuzzleProvider implements PuzzleProvider {
  private readonly store: SafeKeyValueStore;

  constructor(store: SafeKeyValueStore) {
    this.store = store;
  }

  private solvedKey(userId: string): string {
    return `puzzles_solved_${userId}`;
  }

  async listPuzzles(options?: PuzzleQueryOptions): Promise<Puzzle[]> {
    const exclude = new Set(options?.excludeIds ?? []);
    return VALIDATED_CURATED_PUZZLES.filter((puzzle) => {
      if (exclude.has(puzzle.id)) return false;
      if (options?.kind && puzzle.kind !== options.kind) return false;
      if (options?.category && puzzle.category !== options.category) return false;
      return true;
    });
  }

  async generateNextPuzzle(options?: PuzzleQueryOptions): Promise<Puzzle | null> {
    const candidates = await this.listPuzzles(options);
    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx] ?? candidates[0] ?? null;
    }

    // Fall back to any puzzle matching the kind if all unseen puzzles were exhausted
    const fallbackPool = await this.listPuzzles({
      kind: options?.kind,
      category: options?.category,
    });
    if (fallbackPool.length === 0) return null;
    const idx = Math.floor(Math.random() * fallbackPool.length);
    return fallbackPool[idx] ?? fallbackPool[0] ?? null;
  }

  async getSolvedIds(userId: string): Promise<Set<string>> {
    const raw = this.store.getJson<string[]>(this.solvedKey(userId));
    return new Set(Array.isArray(raw) ? raw : []);
  }

  async markSolved(userId: string, puzzleId: string): Promise<Set<string>> {
    const existing = await this.getSolvedIds(userId);
    existing.add(puzzleId);
    this.store.setJson(this.solvedKey(userId), Array.from(existing));
    return existing;
  }

  async clearSolved(userId: string): Promise<void> {
    this.store.remove(this.solvedKey(userId));
  }
}
