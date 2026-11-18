import type { Puzzle, PuzzleDifficulty, PuzzleKind } from '../../src/shared/validation/puzzleSchemas';

export declare const PUZZLE_SCHEMA_VERSION: 1;
export declare const PUZZLE_KINDS: readonly PuzzleKind[];
export declare const PUZZLE_DIFFICULTIES: readonly PuzzleDifficulty[];

export interface GeneratedPuzzlesEnvelope {
  schemaVersion: 1;
  generatedAt: string;
  generator: string;
  model: string;
  itemCount: number;
  items: Puzzle[];
}

export declare function selectPuzzleBatchKinds(
  existingPuzzles: ReadonlyArray<{ kind?: string }>,
  batchSize: number
): PuzzleKind[];

export declare function buildPuzzlesPrompt(options: {
  kinds: readonly PuzzleKind[];
  batchSize: number;
  recentTitles?: readonly string[];
}): string;

export declare function validateAndNormalizeGeneratedPuzzles(
  rawPayload: unknown,
  nowIso?: string
): {
  puzzles: Puzzle[];
  rejectedCount: number;
};

export declare function mergeGeneratedPuzzles(
  existingEnvelope: { items?: ReadonlyArray<Partial<Puzzle>> } | null | undefined,
  newPuzzles: readonly Partial<Puzzle>[],
  options?: { maxItems?: number; nowIso?: string; modelName?: string }
): { addedCount: number; envelope: GeneratedPuzzlesEnvelope };
