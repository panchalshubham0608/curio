import { z } from 'zod';
import { CONTENT_CATEGORIES } from './contentSchemas';

export const PUZZLE_KINDS = [
  'odd_one_out',
  'lateral_riddle',
  'pattern_sequence',
  'true_or_myth',
] as const;

export const PuzzleKindSchema = z.enum(PUZZLE_KINDS);
export type PuzzleKind = z.infer<typeof PuzzleKindSchema>;

export const PUZZLE_DIFFICULTIES = ['Warm-up', 'Clever', 'Tricky'] as const;
export const PuzzleDifficultySchema = z.enum(PUZZLE_DIFFICULTIES);
export type PuzzleDifficulty = z.infer<typeof PuzzleDifficultySchema>;

/**
 * Strict runtime schema for Curio puzzles (`schemaVersion: 1`).
 * Used both for curated puzzles today and for validating future AI-generated puzzles
 * before rendering them in the popup UI.
 */
export const PuzzleSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().trim().min(3).max(80),
    kind: PuzzleKindSchema,
    title: z.string().trim().min(3).max(90),
    category: z.enum(CONTENT_CATEGORIES),
    difficulty: PuzzleDifficultySchema,
    prompt: z.string().trim().min(8).max(400),
    sequenceItems: z.array(z.string().trim().min(1).max(32)).min(3).max(7).optional(),
    hint: z.string().trim().min(4).max(220).optional(),
    options: z.array(z.string().trim().min(1).max(140)).min(2).max(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(10).max(460),
    origin: z.enum(['curated', 'ai']).default('curated'),
  })
  .refine((puzzle) => puzzle.correctIndex < puzzle.options.length, {
    message: 'correctIndex must point to an existing option',
    path: ['correctIndex'],
  });

export type Puzzle = z.infer<typeof PuzzleSchema>;

export interface PuzzleKindMeta {
  readonly id: PuzzleKind;
  readonly label: string;
  readonly pluralLabel: string;
  readonly accentVar: string;
  readonly softVar: string;
  readonly teaserPrompt: string;
}

export const PUZZLE_KIND_METADATA: Record<PuzzleKind, PuzzleKindMeta> = {
  odd_one_out: {
    id: 'odd_one_out',
    label: 'Odd One Out',
    pluralLabel: 'Odd One Out',
    accentVar: 'var(--accent-primary)',
    softVar: 'var(--accent-primary-soft)',
    teaserPrompt: 'Spot the hidden link',
  },
  lateral_riddle: {
    id: 'lateral_riddle',
    label: 'Quick Riddle',
    pluralLabel: 'Quick Riddles',
    accentVar: 'var(--accent-indigo)',
    softVar: 'var(--accent-indigo-soft)',
    teaserPrompt: 'Think sideways',
  },
  pattern_sequence: {
    id: 'pattern_sequence',
    label: 'Next in Pattern',
    pluralLabel: 'Patterns',
    accentVar: 'var(--accent-ochre)',
    softVar: 'var(--accent-ochre-soft)',
    teaserPrompt: 'Crack the sequence',
  },
  true_or_myth: {
    id: 'true_or_myth',
    label: 'Fact or Myth',
    pluralLabel: 'Fact or Myth',
    accentVar: 'var(--accent-sage)',
    softVar: 'var(--accent-sage-soft)',
    teaserPrompt: 'Trust your instinct',
  },
};
