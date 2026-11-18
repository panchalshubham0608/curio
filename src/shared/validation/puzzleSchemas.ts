import { z } from 'zod';
import { CONTENT_CATEGORIES } from './contentSchemas';

export const PUZZLE_KINDS = [
  'odd_one_out',
  'lateral_riddle',
  'pattern_sequence',
  'true_or_myth',
  'logic_reasoning',
  'order_sequence',
  'visual_diagram',
  'interactive_grid',
] as const;

export const PuzzleKindSchema = z.enum(PUZZLE_KINDS);
export type PuzzleKind = z.infer<typeof PuzzleKindSchema>;

export const PUZZLE_DIFFICULTIES = ['Warm-up', 'Clever', 'Tricky'] as const;
export const PuzzleDifficultySchema = z.enum(PUZZLE_DIFFICULTIES);
export type PuzzleDifficulty = z.infer<typeof PuzzleDifficultySchema>;

const SAFE_COLOR_REGEX = /^(?:#[0-9a-fA-F]{6}|none)$/;
const SafeSvgColorSchema = z.string().trim().regex(SAFE_COLOR_REGEX);

export const SvgRectShapeSchema = z.object({
  shape: z.literal('rect'),
  x: z.number().finite().min(0).max(320),
  y: z.number().finite().min(0).max(200),
  width: z.number().finite().min(1).max(320),
  height: z.number().finite().min(1).max(200),
  rx: z.number().finite().min(0).max(40).optional(),
  fill: SafeSvgColorSchema.optional(),
  stroke: SafeSvgColorSchema.optional(),
  strokeWidth: z.number().finite().min(0).max(8).optional(),
});

export const SvgCircleShapeSchema = z.object({
  shape: z.literal('circle'),
  cx: z.number().finite().min(0).max(320),
  cy: z.number().finite().min(0).max(200),
  r: z.number().finite().min(1).max(100),
  fill: SafeSvgColorSchema.optional(),
  stroke: SafeSvgColorSchema.optional(),
  strokeWidth: z.number().finite().min(0).max(8).optional(),
});

export const SvgLineShapeSchema = z.object({
  shape: z.literal('line'),
  x1: z.number().finite().min(0).max(320),
  y1: z.number().finite().min(0).max(200),
  x2: z.number().finite().min(0).max(320),
  y2: z.number().finite().min(0).max(200),
  stroke: SafeSvgColorSchema.optional(),
  strokeWidth: z.number().finite().min(0.5).max(8).optional(),
});

export const SvgPolygonShapeSchema = z.object({
  shape: z.literal('polygon'),
  points: z
    .array(
      z.tuple([
        z.number().finite().min(0).max(320),
        z.number().finite().min(0).max(200),
      ])
    )
    .min(3)
    .max(8),
  fill: SafeSvgColorSchema.optional(),
  stroke: SafeSvgColorSchema.optional(),
  strokeWidth: z.number().finite().min(0).max(8).optional(),
});

export const SvgTextShapeSchema = z.object({
  shape: z.literal('text'),
  x: z.number().finite().min(0).max(320),
  y: z.number().finite().min(0).max(200),
  text: z.string().trim().min(1).max(36),
  fontSize: z.number().finite().min(10).max(28).default(14),
  fill: SafeSvgColorSchema.optional(),
  anchor: z.enum(['start', 'middle', 'end']).default('middle'),
});

export const SvgShapeSchema = z.discriminatedUnion('shape', [
  SvgRectShapeSchema,
  SvgCircleShapeSchema,
  SvgLineShapeSchema,
  SvgPolygonShapeSchema,
  SvgTextShapeSchema,
]);
export type SvgShape = z.infer<typeof SvgShapeSchema>;

/**
 * Strictly declarative SVG geometry blueprint rendered safely via React JSX
 * (never innerHTML / dangerouslySetInnerHTML).
 */
export const SvgDiagramSchema = z.object({
  caption: z.string().trim().min(2).max(120).optional(),
  background: SafeSvgColorSchema.optional(),
  shapes: z.array(SvgShapeSchema).min(1).max(24),
});
export type SvgDiagram = z.infer<typeof SvgDiagramSchema>;

export const GridCellSchema = z.object({
  label: z.string().trim().min(1).max(16),
  value: z.number().finite().min(-999).max(999).optional(),
  initialOn: z.boolean().default(false),
});
export type GridCell = z.infer<typeof GridCellSchema>;

/**
 * Playable interactive grid puzzle specification executed safely by Curio's
 * first-party React state engine (zero eval / arbitrary JS).
 */
export const GridPuzzleSchema = z.object({
  mode: z.enum(['lights_out', 'target_sum', 'select_cells']),
  rows: z.number().int().min(2).max(4),
  cols: z.number().int().min(2).max(4),
  instruction: z.string().trim().min(4).max(180),
  cells: z.array(GridCellSchema).min(4).max(16),
  targetSum: z.number().finite().min(-9999).max(9999).optional(),
  exactCount: z.number().int().min(1).max(16).optional(),
  goalState: z.enum(['all_on', 'all_off']).default('all_on'),
  solutionIndices: z.array(z.number().int().min(0).max(15)).max(16).optional(),
});
export type GridPuzzle = z.infer<typeof GridPuzzleSchema>;

/**
 * Strict runtime schema for Curio puzzles (`schemaVersion: 1`).
 * Covers classic multiple-choice teasers, reasoning clue decks, fact checks,
 * tap-to-order sequences, sanitized SVG diagrams, and playable interactive grids.
 */
export const PuzzleSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().trim().min(3).max(80),
    kind: PuzzleKindSchema,
    title: z.string().trim().min(3).max(90),
    category: z.enum(CONTENT_CATEGORIES),
    difficulty: PuzzleDifficultySchema,
    prompt: z.string().trim().min(8).max(420),
    clues: z.array(z.string().trim().min(4).max(220)).min(2).max(5).optional(),
    sequenceItems: z.array(z.string().trim().min(1).max(32)).min(3).max(7).optional(),
    orderItems: z.array(z.string().trim().min(1).max(120)).min(3).max(5).optional(),
    correctOrder: z.array(z.number().int().min(0).max(4)).min(3).max(5).optional(),
    svgDiagram: SvgDiagramSchema.optional(),
    gridPuzzle: GridPuzzleSchema.optional(),
    hint: z.string().trim().min(4).max(220).optional(),
    options: z.array(z.string().trim().min(1).max(140)).min(2).max(4).optional(),
    correctIndex: z.number().int().min(0).max(3).optional(),
    explanation: z.string().trim().min(10).max(480),
    origin: z.enum(['curated', 'ai']).default('curated'),
    createdAt: z.string().datetime().optional(),
  })
  .superRefine((puzzle, ctx) => {
    const isInteractiveBoard =
      puzzle.kind === 'order_sequence' || puzzle.kind === 'interactive_grid';

    if (!isInteractiveBoard) {
      if (!puzzle.options || puzzle.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choice-based puzzles require 2 to 4 options',
          path: ['options'],
        });
      } else if (
        typeof puzzle.correctIndex !== 'number' ||
        puzzle.correctIndex < 0 ||
        puzzle.correctIndex >= puzzle.options.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'correctIndex must point to an existing option',
          path: ['correctIndex'],
        });
      }
    }

    if (puzzle.kind === 'pattern_sequence' && (!puzzle.sequenceItems || puzzle.sequenceItems.length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pattern_sequence requires sequenceItems',
        path: ['sequenceItems'],
      });
    }

    if (puzzle.kind === 'logic_reasoning' && (!puzzle.clues || puzzle.clues.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'logic_reasoning requires at least 2 deductive clues',
        path: ['clues'],
      });
    }

    if (puzzle.kind === 'order_sequence') {
      const items = puzzle.orderItems ?? [];
      const order = puzzle.correctOrder ?? [];
      const uniqueOrder = new Set(order);
      const validPermutation =
        items.length >= 3 &&
        order.length === items.length &&
        uniqueOrder.size === items.length &&
        order.every((idx) => idx >= 0 && idx < items.length);
      if (!validPermutation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'order_sequence requires matching orderItems and valid correctOrder permutation',
          path: ['correctOrder'],
        });
      }
    }

    if (puzzle.kind === 'visual_diagram' && !puzzle.svgDiagram) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'visual_diagram requires a validated svgDiagram',
        path: ['svgDiagram'],
      });
    }

    if (puzzle.kind === 'interactive_grid') {
      const grid = puzzle.gridPuzzle;
      if (!grid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'interactive_grid requires gridPuzzle',
          path: ['gridPuzzle'],
        });
        return;
      }
      const expectedCells = grid.rows * grid.cols;
      if (grid.cells.length !== expectedCells) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `gridPuzzle.cells must contain exactly ${expectedCells} cells`,
          path: ['gridPuzzle', 'cells'],
        });
      }
      if (grid.mode === 'target_sum' && typeof grid.targetSum !== 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'target_sum grid requires targetSum',
          path: ['gridPuzzle', 'targetSum'],
        });
      }
      if (grid.mode === 'select_cells') {
        const sol = grid.solutionIndices ?? [];
        const validSol =
          sol.length > 0 && sol.every((idx) => idx >= 0 && idx < expectedCells);
        if (!validSol) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'select_cells grid requires valid solutionIndices within cell bounds',
            path: ['gridPuzzle', 'solutionIndices'],
          });
        }
      }
    }
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
    label: 'Fact Check',
    pluralLabel: 'Fact Checks',
    accentVar: 'var(--accent-sage)',
    softVar: 'var(--accent-sage-soft)',
    teaserPrompt: 'Verify the claim',
  },
  logic_reasoning: {
    id: 'logic_reasoning',
    label: 'Reasoning',
    pluralLabel: 'Reasoning',
    accentVar: 'var(--accent-indigo)',
    softVar: 'var(--accent-indigo-soft)',
    teaserPrompt: 'Connect the clues',
  },
  order_sequence: {
    id: 'order_sequence',
    label: 'Put in Order',
    pluralLabel: 'Ordering',
    accentVar: 'var(--accent-ochre)',
    softVar: 'var(--accent-ochre-soft)',
    teaserPrompt: 'Rank step by step',
  },
  visual_diagram: {
    id: 'visual_diagram',
    label: 'Visual Logic',
    pluralLabel: 'Visual Logic',
    accentVar: 'var(--accent-primary)',
    softVar: 'var(--accent-primary-soft)',
    teaserPrompt: 'Inspect the diagram',
  },
  interactive_grid: {
    id: 'interactive_grid',
    label: 'Interactive Board',
    pluralLabel: 'Interactive Boards',
    accentVar: 'var(--accent-sage)',
    softVar: 'var(--accent-sage-soft)',
    teaserPrompt: 'Play the live grid',
  },
};
