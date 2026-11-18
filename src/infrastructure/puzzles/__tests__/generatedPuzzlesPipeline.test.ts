import { describe, expect, it, vi } from 'vitest';
import { PuzzleSchema } from '../../../shared/validation/puzzleSchemas';
import { SafeKeyValueStore } from '../../persistence/LocalStorageStore';
import { GeneratedPuzzleProvider } from '../PuzzleProvider';
import {
  buildPuzzlesPrompt,
  mergeGeneratedPuzzles,
  selectPuzzleBatchKinds,
  validateAndNormalizeGeneratedPuzzles,
} from '../../../../scripts/lib/puzzleGenerator.mjs';

describe('Scheduled Gemini textual puzzle generator pipeline', () => {
  it('sanitizes untrusted AI puzzle payloads, drops malformed entries, and conforms strictly to PuzzleSchema', () => {
    const rawPayload = {
      puzzles: [
        {
          kind: 'pattern_sequence',
          title: '<b>Prime Jumps</b>',
          category: 'science',
          difficulty: 'Clever',
          prompt: '<script>alert(1)</script>What number completes this prime sequence?',
          sequenceItems: ['2', '3', '5', '7', '11', '?'],
          hint: 'Each entry is only divisible by 1 and itself.',
          options: ['12', '13', '14', '15'],
          correctIndex: 1,
          explanation: 'After 11, the next prime number is 13.',
        },
        {
          // Invalid: pattern_sequence missing sequenceItems
          kind: 'pattern_sequence',
          title: 'Broken Pattern',
          category: 'facts',
          difficulty: 'Warm-up',
          prompt: 'Missing sequence strip here',
          options: ['1', '2'],
          correctIndex: 0,
          explanation: 'Should be rejected because sequenceItems is missing.',
        },
        {
          // Invalid: correctIndex out of range
          kind: 'odd_one_out',
          title: 'Out Of Bounds',
          category: 'facts',
          difficulty: 'Warm-up',
          prompt: 'Which option does not belong?',
          options: ['Red', 'Blue'],
          correctIndex: 3,
          explanation: 'Should be rejected because correctIndex exceeds options length.',
        },
      ],
    };

    const { puzzles, rejectedCount } = validateAndNormalizeGeneratedPuzzles(rawPayload);

    expect(rejectedCount).toBe(2);
    expect(puzzles).toHaveLength(1);

    const validated = PuzzleSchema.parse(puzzles[0]);
    expect(validated.id).toMatch(/^puz_ai_[0-9a-f]{12}$/);
    expect(validated.title).toBe('Prime Jumps');
    expect(validated.prompt).not.toContain('<script>');
    expect(validated.origin).toBe('ai');
    expect(validated.sequenceItems).toEqual(['2', '3', '5', '7', '11', '?']);
  });

  it('sanitizes and validates expanded reasoning, ordering, declarative SVG, and interactive grid puzzles while rejecting unsafe or malformed payloads', () => {
    const rawPayload = {
      puzzles: [
        {
          kind: 'logic_reasoning',
          title: 'Key Locker Logic',
          category: 'growth',
          difficulty: 'Clever',
          prompt: 'Three lockers hold a map, a key, and a compass. Which locker holds the key?',
          clues: [
            '<b>Clue 1:</b> Locker 1 does not hold the key.',
            'Locker 3 holds the compass.',
            'The map is immediately left of the key.',
          ],
          options: ['Locker 1', 'Locker 2', 'Locker 3'],
          correctIndex: 1,
          explanation: 'Locker 3 has the compass, so the map is in Locker 1 and the key is in Locker 2.',
        },
        {
          kind: 'order_sequence',
          title: 'Metric Sizes',
          category: 'science',
          difficulty: 'Warm-up',
          prompt: 'Order these units from smallest to largest.',
          orderItems: ['Kilometer', 'Millimeter', 'Meter'],
          correctOrder: [1, 2, 0],
          explanation: 'A millimeter is 1/1000 of a meter, and a kilometer is 1000 meters.',
        },
        {
          kind: 'visual_diagram',
          title: 'Nested Circles',
          category: 'science',
          difficulty: 'Clever',
          prompt: 'How many circles appear in the blueprint?',
          svgDiagram: {
            caption: '<img src=x onerror=alert(1)>Three concentric rings',
            background: 'url(javascript:alert(1))',
            shapes: [
              {
                shape: 'circle',
                cx: 160,
                cy: 100,
                r: 60,
                fill: 'expression(alert(1))',
                stroke: '#3B4F75',
                strokeWidth: 3,
              },
              {
                shape: 'script',
                code: 'alert(1)',
              },
              {
                shape: 'text',
                x: 160,
                y: 105,
                text: '<script>x</script>3x',
                fontSize: 16,
                fill: '#C84B31',
              },
            ],
          },
          options: ['1', '2', '3', '4'],
          correctIndex: 0,
          explanation: 'Only one sanitized circle shape and one text label survive strict allow-listing.',
        },
        {
          kind: 'interactive_grid',
          title: 'Make Ten',
          category: 'facts',
          difficulty: 'Warm-up',
          prompt: 'Pick 2 tiles summing to 10.',
          gridPuzzle: {
            mode: 'target_sum',
            rows: 2,
            cols: 2,
            instruction: 'Pick 2 tiles totaling 10',
            targetSum: 10,
            exactCount: 2,
            cells: [
              { label: '4', value: 4, initialOn: false },
              { label: '6', value: 6, initialOn: false },
              { label: '3', value: 3, initialOn: false },
              { label: '9', value: 9, initialOn: false },
            ],
          },
          explanation: '4 + 6 = 10.',
        },
        {
          // Invalid: interactive_grid cell count mismatch (rows*cols = 4, only 2 cells)
          kind: 'interactive_grid',
          title: 'Broken Grid',
          category: 'facts',
          difficulty: 'Warm-up',
          prompt: 'This grid has too few cells.',
          gridPuzzle: {
            mode: 'target_sum',
            rows: 2,
            cols: 2,
            instruction: 'Invalid grid',
            targetSum: 5,
            cells: [
              { label: '2', value: 2, initialOn: false },
              { label: '3', value: 3, initialOn: false },
            ],
          },
          explanation: 'Should be rejected cleanly.',
        },
      ],
    };

    const { puzzles, rejectedCount } = validateAndNormalizeGeneratedPuzzles(
      rawPayload,
      '2026-11-18T12:00:00.000Z'
    );

    expect(rejectedCount).toBe(1);
    expect(puzzles).toHaveLength(4);
    for (const p of puzzles) {
      const parsed = PuzzleSchema.parse(p);
      expect(parsed.createdAt).toBe('2026-11-18T12:00:00.000Z');
    }

    const svgPuzzle = puzzles.find((p) => p.kind === 'visual_diagram');
    expect(svgPuzzle?.svgDiagram?.background).toBeUndefined();
    expect(svgPuzzle?.svgDiagram?.caption).toBe('Three concentric rings');
    expect(svgPuzzle?.svgDiagram?.shapes).toHaveLength(2);
    expect(svgPuzzle?.svgDiagram?.shapes[0]).toMatchObject({
      shape: 'circle',
      stroke: '#3B4F75',
    });
    expect((svgPuzzle?.svgDiagram?.shapes[0] as { fill?: string }).fill).toBeUndefined();
    expect(svgPuzzle?.svgDiagram?.shapes[1]).toMatchObject({
      shape: 'text',
      text: 'x 3x',
    });
  });

  it('balances underrepresented puzzle kinds across all 8 categories, deduplicates by title, and enforces rolling maxItems', () => {
    const existing = [
      { id: 'puz_ai_1', kind: 'odd_one_out' as const, title: 'Prime Jumps' },
      { id: 'puz_ai_2', kind: 'lateral_riddle' as const, title: 'The Silent Clock' },
    ];

    const kinds = selectPuzzleBatchKinds(existing, 2);
    expect(kinds).toEqual(['interactive_grid', 'logic_reasoning']);

    const prompt = buildPuzzlesPrompt({
      kinds,
      batchSize: 2,
      recentTitles: existing.map((p) => p.title),
    });
    expect(prompt).toContain('NEVER return HTML tags, raw <svg> markup');
    expect(prompt).toContain('<existing_puzzle_titles>');

    const merged = mergeGeneratedPuzzles(
      { items: existing },
      [
        { id: 'puz_ai_dup', kind: 'odd_one_out' as const, title: 'prime jumps!' },
        { id: 'puz_ai_new', kind: 'true_or_myth' as const, title: 'Bananas Are Berries' },
      ],
      { maxItems: 2, nowIso: '2026-11-18T12:30:00.000Z', modelName: 'gemini-2.5-flash' }
    );

    expect(merged.addedCount).toBe(1);
    expect(merged.envelope.items).toHaveLength(2);
    expect(merged.envelope.items[0].id).toBe('puz_ai_new');
    expect(merged.envelope.items[0].createdAt).toBe('2026-11-18T12:30:00.000Z');
    expect(merged.envelope.items[1].id).toBe('puz_ai_1');
  });

  it('serves strictly valid AI-generated puzzles from /curio/generated/puzzles.json with zero hardcoded defaults while dropping malformed records', async () => {
    const store = new SafeKeyValueStore('puzzle_provider_ai_only_test', false);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        items: [
          {
            schemaVersion: 1,
            id: 'puz_ai_valid001',
            kind: 'true_or_myth',
            title: 'Bananas Are Berries',
            category: 'science',
            difficulty: 'Warm-up',
            prompt: 'Botanically speaking, bananas are berries while strawberries are not.',
            hint: 'Botanists count ovaries and seeds differently than grocery stores.',
            options: ['True — Real Fact', 'Myth — False'],
            correctIndex: 0,
            explanation:
              'Bananas develop from a single flower with one ovary, meeting the botanical definition of a berry.',
            origin: 'ai',
          },
          {
            // Malformed payload should be dropped safely
            schemaVersion: 1,
            id: 'puz_ai_bad',
            kind: 'odd_one_out',
            title: 'Bad',
            category: 'science',
            difficulty: 'Warm-up',
            prompt: 'Bad options',
            options: ['Only one'],
            correctIndex: 0,
            explanation: 'Too short',
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const provider = new GeneratedPuzzleProvider(store, { fetchImpl: mockFetch });
    const all = await provider.listPuzzles();

    // Only the 1 valid AI puzzle is returned — zero hardcoded default puzzles
    expect(all.length).toBe(1);
    expect(all[0]?.id).toBe('puz_ai_valid001');
    expect(all[0]?.origin).toBe('ai');
    expect(all.some((p) => p.id === 'puz_ai_bad')).toBe(false);

    // Empty generated JSON returns empty array and null next puzzle without crashing
    const emptyFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ schemaVersion: 1, items: [] }),
    }) as unknown as typeof fetch;
    const emptyProvider = new GeneratedPuzzleProvider(store, { fetchImpl: emptyFetch });
    expect(await emptyProvider.listPuzzles()).toEqual([]);
    expect(await emptyProvider.generateNextPuzzle()).toBeNull();
  });
});
