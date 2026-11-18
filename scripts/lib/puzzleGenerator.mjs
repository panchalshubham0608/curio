import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  CONTENT_CATEGORIES,
  normalizeTitleKey,
  sanitizeText,
} from './feedGenerator.mjs';

export const PUZZLE_SCHEMA_VERSION = 1;

export const PUZZLE_KINDS = [
  'odd_one_out',
  'lateral_riddle',
  'pattern_sequence',
  'true_or_myth',
  'logic_reasoning',
  'order_sequence',
  'visual_diagram',
  'interactive_grid',
];

export const PUZZLE_DIFFICULTIES = ['Warm-up', 'Clever', 'Tricky'];

const SAFE_COLOR_REGEX = /^(?:#[0-9a-fA-F]{6}|none)$/;
const SafeSvgColorSchema = z.string().trim().regex(SAFE_COLOR_REGEX);

const SvgRectShapeSchema = z.object({
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

const SvgCircleShapeSchema = z.object({
  shape: z.literal('circle'),
  cx: z.number().finite().min(0).max(320),
  cy: z.number().finite().min(0).max(200),
  r: z.number().finite().min(1).max(100),
  fill: SafeSvgColorSchema.optional(),
  stroke: SafeSvgColorSchema.optional(),
  strokeWidth: z.number().finite().min(0).max(8).optional(),
});

const SvgLineShapeSchema = z.object({
  shape: z.literal('line'),
  x1: z.number().finite().min(0).max(320),
  y1: z.number().finite().min(0).max(200),
  x2: z.number().finite().min(0).max(320),
  y2: z.number().finite().min(0).max(200),
  stroke: SafeSvgColorSchema.optional(),
  strokeWidth: z.number().finite().min(0.5).max(8).optional(),
});

const SvgPolygonShapeSchema = z.object({
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

const SvgTextShapeSchema = z.object({
  shape: z.literal('text'),
  x: z.number().finite().min(0).max(320),
  y: z.number().finite().min(0).max(200),
  text: z.string().trim().min(1).max(36),
  fontSize: z.number().finite().min(10).max(28).default(14),
  fill: SafeSvgColorSchema.optional(),
  anchor: z.enum(['start', 'middle', 'end']).default('middle'),
});

const SvgShapeSchema = z.discriminatedUnion('shape', [
  SvgRectShapeSchema,
  SvgCircleShapeSchema,
  SvgLineShapeSchema,
  SvgPolygonShapeSchema,
  SvgTextShapeSchema,
]);

const SvgDiagramSchema = z.object({
  caption: z.string().trim().min(2).max(120).optional(),
  background: SafeSvgColorSchema.optional(),
  shapes: z.array(SvgShapeSchema).min(1).max(24),
});

const GridPuzzleSchema = z.object({
  mode: z.enum(['lights_out', 'target_sum', 'select_cells']),
  rows: z.number().int().min(2).max(4),
  cols: z.number().int().min(2).max(4),
  instruction: z.string().trim().min(4).max(180),
  cells: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(16),
        value: z.number().finite().min(-999).max(999).optional(),
        initialOn: z.boolean().default(false),
      })
    )
    .min(4)
    .max(16),
  targetSum: z.number().finite().min(-9999).max(9999).optional(),
  exactCount: z.number().int().min(1).max(16).optional(),
  goalState: z.enum(['all_on', 'all_off']).default('all_on'),
  solutionIndices: z.array(z.number().int().min(0).max(15)).max(16).optional(),
});

const RawGeneratedPuzzleSchema = z
  .object({
    kind: z.enum(PUZZLE_KINDS),
    title: z.string().trim().min(3).max(90),
    category: z.enum(CONTENT_CATEGORIES).default('facts'),
    difficulty: z.enum(PUZZLE_DIFFICULTIES).default('Clever'),
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
  })
  .superRefine((puzzle, ctx) => {
    const isInteractiveBoard =
      puzzle.kind === 'order_sequence' || puzzle.kind === 'interactive_grid';

    if (!isInteractiveBoard) {
      if (!puzzle.options || puzzle.options.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'options required' });
      } else if (
        typeof puzzle.correctIndex !== 'number' ||
        puzzle.correctIndex < 0 ||
        puzzle.correctIndex >= puzzle.options.length
      ) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'correctIndex out of range' });
      }
    }

    if (puzzle.kind === 'pattern_sequence' && (!puzzle.sequenceItems || puzzle.sequenceItems.length < 3)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'sequenceItems required' });
    }
    if (puzzle.kind === 'logic_reasoning' && (!puzzle.clues || puzzle.clues.length < 2)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'clues required' });
    }
    if (puzzle.kind === 'order_sequence') {
      const items = puzzle.orderItems ?? [];
      const order = puzzle.correctOrder ?? [];
      const valid =
        items.length >= 3 &&
        order.length === items.length &&
        new Set(order).size === items.length &&
        order.every((idx) => idx >= 0 && idx < items.length);
      if (!valid) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'valid correctOrder required' });
      }
    }
    if (puzzle.kind === 'visual_diagram' && !puzzle.svgDiagram) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'svgDiagram required' });
    }
    if (puzzle.kind === 'interactive_grid') {
      const grid = puzzle.gridPuzzle;
      if (!grid || grid.cells.length !== grid.rows * grid.cols) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'valid gridPuzzle required' });
        return;
      }
      if (grid.mode === 'target_sum' && typeof grid.targetSum !== 'number') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'targetSum required' });
      }
      if (grid.mode === 'select_cells') {
        const sol = grid.solutionIndices ?? [];
        if (sol.length === 0 || !sol.every((i) => i >= 0 && i < grid.cells.length)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'valid solutionIndices required' });
        }
      }
    }
  });

function sanitizeColor(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return SAFE_COLOR_REGEX.test(trimmed) ? trimmed : undefined;
}

/**
 * Strictly sanitizes AI-generated declarative SVG shape specs so no raw markup,
 * event attributes, CSS expressions, or external URLs can ever enter the diagram.
 */
function sanitizeRawSvgDiagram(rawDiagram) {
  if (!rawDiagram || typeof rawDiagram !== 'object' || !Array.isArray(rawDiagram.shapes)) {
    return undefined;
  }

  const cleanShapes = [];
  for (const rawShape of rawDiagram.shapes.slice(0, 24)) {
    if (!rawShape || typeof rawShape !== 'object') continue;
    const baseStroke = sanitizeColor(rawShape.stroke);
    const baseFill = sanitizeColor(rawShape.fill);
    const strokeWidth =
      typeof rawShape.strokeWidth === 'number' ? rawShape.strokeWidth : undefined;

    switch (rawShape.shape) {
      case 'rect':
        cleanShapes.push({
          shape: 'rect',
          x: Number(rawShape.x),
          y: Number(rawShape.y),
          width: Number(rawShape.width),
          height: Number(rawShape.height),
          rx: typeof rawShape.rx === 'number' ? rawShape.rx : undefined,
          fill: baseFill,
          stroke: baseStroke,
          strokeWidth,
        });
        break;
      case 'circle':
        cleanShapes.push({
          shape: 'circle',
          cx: Number(rawShape.cx),
          cy: Number(rawShape.cy),
          r: Number(rawShape.r),
          fill: baseFill,
          stroke: baseStroke,
          strokeWidth,
        });
        break;
      case 'line':
        cleanShapes.push({
          shape: 'line',
          x1: Number(rawShape.x1),
          y1: Number(rawShape.y1),
          x2: Number(rawShape.x2),
          y2: Number(rawShape.y2),
          stroke: baseStroke,
          strokeWidth,
        });
        break;
      case 'polygon':
        if (Array.isArray(rawShape.points)) {
          cleanShapes.push({
            shape: 'polygon',
            points: rawShape.points
              .filter((pt) => Array.isArray(pt) && pt.length === 2)
              .slice(0, 8)
              .map(([px, py]) => [Number(px), Number(py)]),
            fill: baseFill,
            stroke: baseStroke,
            strokeWidth,
          });
        }
        break;
      case 'text':
        cleanShapes.push({
          shape: 'text',
          x: Number(rawShape.x),
          y: Number(rawShape.y),
          text: sanitizeText(rawShape.text, 36),
          fontSize: typeof rawShape.fontSize === 'number' ? rawShape.fontSize : 14,
          fill: baseFill,
          anchor: ['start', 'middle', 'end'].includes(rawShape.anchor)
            ? rawShape.anchor
            : 'middle',
        });
        break;
      default:
        break;
    }
  }

  if (cleanShapes.length === 0) return undefined;

  return {
    caption: rawDiagram.caption ? sanitizeText(rawDiagram.caption, 120) : undefined,
    background: sanitizeColor(rawDiagram.background),
    shapes: cleanShapes,
  };
}

function sanitizeRawGridPuzzle(rawGrid) {
  if (!rawGrid || typeof rawGrid !== 'object' || !Array.isArray(rawGrid.cells)) {
    return undefined;
  }

  return {
    mode: rawGrid.mode,
    rows: Number(rawGrid.rows),
    cols: Number(rawGrid.cols),
    instruction: sanitizeText(rawGrid.instruction, 180),
    cells: rawGrid.cells.slice(0, 16).map((cell) => ({
      label: sanitizeText(cell?.label ?? '', 16),
      value: typeof cell?.value === 'number' && Number.isFinite(cell.value) ? cell.value : undefined,
      initialOn: Boolean(cell?.initialOn),
    })),
    targetSum:
      typeof rawGrid.targetSum === 'number' && Number.isFinite(rawGrid.targetSum)
        ? rawGrid.targetSum
        : undefined,
    exactCount:
      typeof rawGrid.exactCount === 'number' && Number.isFinite(rawGrid.exactCount)
        ? Math.round(rawGrid.exactCount)
        : undefined,
    goalState: rawGrid.goalState === 'all_off' ? 'all_off' : 'all_on',
    solutionIndices: Array.isArray(rawGrid.solutionIndices)
      ? rawGrid.solutionIndices.map((idx) => Number(idx)).filter((n) => Number.isInteger(n))
      : undefined,
  };
}

/**
 * Selects least-represented puzzle kinds first across all 8 puzzle categories.
 */
export function selectPuzzleBatchKinds(existingPuzzles, batchSize) {
  const counts = new Map(PUZZLE_KINDS.map((kind) => [kind, 0]));
  for (const puzzle of existingPuzzles) {
    if (puzzle && typeof puzzle.kind === 'string' && counts.has(puzzle.kind)) {
      counts.set(puzzle.kind, (counts.get(puzzle.kind) ?? 0) + 1);
    }
  }

  const ordered = [...PUZZLE_KINDS].sort((a, b) => {
    const diff = (counts.get(a) ?? 0) - (counts.get(b) ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const picked = [];
  for (let i = 0; i < batchSize; i += 1) {
    picked.push(ordered[i % ordered.length]);
  }
  return picked;
}

/**
 * Builds the structured prompt instructing Gemini to generate diverse reasoning, fact-check,
 * ordering, declarative SVG diagram, and playable interactive grid puzzles.
 */
export function buildPuzzlesPrompt({ kinds, batchSize, recentTitles = [] }) {
  const safeTitles = recentTitles
    .slice(0, 30)
    .map((t) => sanitizeText(t, 100))
    .filter(Boolean);

  return [
    'You are Curio, a brilliant puzzle designer crafting crisp, verifiable, 30-to-60-second brain teasers.',
    `Generate exactly ${batchSize} brand-new, original puzzles.`,
    `Assign puzzle kinds in order using this exact list: ${JSON.stringify(kinds)}.`,
    'CRITICAL SECURITY & FORMAT RULES:',
    '- Return strictly valid JSON only: { "puzzles": [ ... ] }',
    '- NEVER return HTML tags, raw <svg> markup, JavaScript code, Markdown formatting, or external URLs.',
    '- Every puzzle must be 100% logically verifiable and unambiguous.',
    'Kind specifications:',
    '1. "odd_one_out": 4 concise options where 3 share a clear factual property and 1 breaks it.',
    '2. "lateral_riddle": witty short riddle with 3-4 options + correctIndex.',
    '3. "pattern_sequence": include "sequenceItems" (4-6 short tokens ending with "?") and 4 options + correctIndex.',
    '4. "true_or_myth" (Fact Check): surprising verifiable claim with 2 options ["True — Real Fact", "Myth — False"] + correctIndex.',
    '5. "logic_reasoning": deductive mini-mystery with "clues" (3-4 short numbered clue sentences) and 4 options + correctIndex.',
    '6. "order_sequence": ranking/chronology puzzle with "orderItems" (4 shuffled strings) and "correctOrder" (array of 0-based indices from 1st to 4th; omit options/correctIndex).',
    '7. "visual_diagram": geometric/spatial visual puzzle with declarative "svgDiagram": { "caption": string, "background": "#FAF8F4", "shapes": Array<rect|circle|line|polygon|text> } inside a 320x200 canvas using ONLY 6-digit hex colors (e.g. "#C84B31", "#3B4F75", "#2D6A4F") plus 4 options + correctIndex.',
    '   Allowed shapes: {"shape":"rect","x":N,"y":N,"width":N,"height":N,"rx"?:N,"fill"?:HEX,"stroke"?:HEX,"strokeWidth"?:N}, {"shape":"circle","cx":N,"cy":N,"r":N,...}, {"shape":"line","x1":N,"y1":N,"x2":N,"y2":N,"stroke"?:HEX,"strokeWidth"?:N}, {"shape":"polygon","points":[[x,y],...],"fill"?:HEX,"stroke"?:HEX}, {"shape":"text","x":N,"y":N,"text":"short","fontSize":14,"fill":HEX,"anchor":"middle"}.',
    '8. "interactive_grid": playable live grid puzzle (omit options/correctIndex) with "gridPuzzle": { "mode": "target_sum"|"select_cells"|"lights_out", "rows": 3, "cols": 3, "instruction": string, "cells": [{"label": string, "value"?: number, "initialOn": boolean}], "targetSum"?: number, "exactCount"?: number, "goalState"?: "all_on"|"all_off", "solutionIndices"?: number[] }.',
    '   Ensure target_sum has at least one valid combination of exactCount cells summing to targetSum, and lights_out is solvable in 2-4 taps.',
    'Pick category from: ["facts","technology","travel_food","news","humour","history","growth","science"].',
    'Pick difficulty from: ["Warm-up","Clever","Tricky"].',
    safeTitles.length > 0
      ? `Avoid repeating any of these recent puzzle titles:\n<existing_puzzle_titles>\n${safeTitles.join('\n')}\n</existing_puzzle_titles>`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Validates and sanitizes raw Gemini puzzle output into strict Curio Puzzle objects.
 */
export function validateAndNormalizeGeneratedPuzzles(
  rawPayload,
  nowIso = new Date().toISOString()
) {
  const rawList = Array.isArray(rawPayload?.puzzles)
    ? rawPayload.puzzles
    : Array.isArray(rawPayload?.items)
      ? rawPayload.items
      : Array.isArray(rawPayload)
        ? rawPayload
        : [];

  const puzzles = [];
  let rejectedCount = 0;

  for (const rawItem of rawList) {
    if (!rawItem || typeof rawItem !== 'object') {
      rejectedCount += 1;
      continue;
    }

    const sanitizedOptions = Array.isArray(rawItem.options)
      ? rawItem.options.map((opt) => sanitizeText(opt, 140)).filter(Boolean).slice(0, 4)
      : undefined;

    const sanitizedClues = Array.isArray(rawItem.clues)
      ? rawItem.clues.map((c) => sanitizeText(c, 220)).filter(Boolean).slice(0, 5)
      : undefined;

    const sanitizedSequence =
      Array.isArray(rawItem.sequenceItems) && rawItem.sequenceItems.length > 0
        ? rawItem.sequenceItems.map((tok) => sanitizeText(tok, 32)).filter(Boolean).slice(0, 7)
        : undefined;

    const sanitizedOrderItems = Array.isArray(rawItem.orderItems)
      ? rawItem.orderItems.map((entry) => sanitizeText(entry, 120)).filter(Boolean).slice(0, 5)
      : undefined;

    const sanitizedCorrectOrder = Array.isArray(rawItem.correctOrder)
      ? rawItem.correctOrder.map((n) => Number(n)).filter((n) => Number.isInteger(n))
      : undefined;

    const isInteractiveBoard =
      rawItem.kind === 'order_sequence' || rawItem.kind === 'interactive_grid';

    const candidate = {
      kind: rawItem.kind,
      title: sanitizeText(rawItem.title, 90),
      category: CONTENT_CATEGORIES.includes(rawItem.category) ? rawItem.category : 'facts',
      difficulty: PUZZLE_DIFFICULTIES.includes(rawItem.difficulty) ? rawItem.difficulty : 'Clever',
      prompt: sanitizeText(rawItem.prompt, 420),
      clues: rawItem.kind === 'logic_reasoning' ? sanitizedClues : undefined,
      sequenceItems: rawItem.kind === 'pattern_sequence' ? sanitizedSequence : undefined,
      orderItems: rawItem.kind === 'order_sequence' ? sanitizedOrderItems : undefined,
      correctOrder: rawItem.kind === 'order_sequence' ? sanitizedCorrectOrder : undefined,
      svgDiagram:
        rawItem.kind === 'visual_diagram'
          ? sanitizeRawSvgDiagram(rawItem.svgDiagram)
          : undefined,
      gridPuzzle:
        rawItem.kind === 'interactive_grid'
          ? sanitizeRawGridPuzzle(rawItem.gridPuzzle)
          : undefined,
      hint: rawItem.hint ? sanitizeText(rawItem.hint, 220) : undefined,
      options: !isInteractiveBoard ? sanitizedOptions : undefined,
      correctIndex:
        !isInteractiveBoard && rawItem.correctIndex !== undefined
          ? Number(rawItem.correctIndex)
          : undefined,
      explanation: sanitizeText(rawItem.explanation, 480),
    };

    const parsed = RawGeneratedPuzzleSchema.safeParse(candidate);
    if (!parsed.success) {
      rejectedCount += 1;
      continue;
    }

    const data = parsed.data;
    const digest = createHash('sha256')
      .update(`${data.kind}:${normalizeTitleKey(data.title)}:${normalizeTitleKey(data.prompt)}`)
      .digest('hex')
      .slice(0, 12);

    puzzles.push({
      schemaVersion: PUZZLE_SCHEMA_VERSION,
      id: `puz_ai_${digest}`,
      kind: data.kind,
      title: data.title,
      category: data.category,
      difficulty: data.difficulty,
      prompt: data.prompt,
      ...(data.clues ? { clues: data.clues } : {}),
      ...(data.sequenceItems ? { sequenceItems: data.sequenceItems } : {}),
      ...(data.orderItems ? { orderItems: data.orderItems } : {}),
      ...(data.correctOrder ? { correctOrder: data.correctOrder } : {}),
      ...(data.svgDiagram ? { svgDiagram: data.svgDiagram } : {}),
      ...(data.gridPuzzle ? { gridPuzzle: data.gridPuzzle } : {}),
      ...(data.hint ? { hint: data.hint } : {}),
      ...(data.options ? { options: data.options } : {}),
      ...(typeof data.correctIndex === 'number' ? { correctIndex: data.correctIndex } : {}),
      explanation: data.explanation,
      origin: 'ai',
      createdAt: nowIso,
    });
  }

  return { puzzles, rejectedCount };
}

/**
 * Merges newly generated puzzles ahead of existing items with ID + title deduplication
 * and enforces a bounded rolling puzzle archive.
 */
export function mergeGeneratedPuzzles(
  existingEnvelope,
  newPuzzles,
  { maxItems = 48, nowIso = new Date().toISOString(), modelName = 'gemini-2.5-flash' } = {}
) {
  const existingItems = Array.isArray(existingEnvelope?.items) ? existingEnvelope.items : [];
  const seenIds = new Set();
  const seenTitles = new Set();
  const merged = [];

  for (const item of existingItems) {
    if (item && typeof item.id === 'string' && typeof item.title === 'string') {
      seenIds.add(item.id);
      seenTitles.add(normalizeTitleKey(item.title));
    }
  }

  let addedCount = 0;
  for (const puzzle of newPuzzles) {
    const titleKey = normalizeTitleKey(puzzle.title);
    if (seenIds.has(puzzle.id) || seenTitles.has(titleKey)) {
      continue;
    }
    seenIds.add(puzzle.id);
    seenTitles.add(titleKey);
    merged.push({
      ...puzzle,
      createdAt: typeof puzzle.createdAt === 'string' ? puzzle.createdAt : nowIso,
    });
    addedCount += 1;
  }

  for (const existing of existingItems) {
    if (merged.length >= maxItems) break;
    if (existing && typeof existing.id === 'string') {
      merged.push(existing);
    }
  }

  const bounded = merged.slice(0, maxItems);

  return {
    addedCount,
    envelope: {
      schemaVersion: PUZZLE_SCHEMA_VERSION,
      generatedAt: nowIso,
      generator: 'gemini-textual-puzzles',
      model: modelName,
      itemCount: bounded.length,
      items: bounded,
    },
  };
}
