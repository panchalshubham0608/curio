import { describe, expect, it, vi } from 'vitest';
import { ContentRecordSchema } from '../../../shared/validation/contentSchemas';
import {
  buildTextualFeedPrompt,
  evaluateGenerationNeed,
  mergeGeneratedFeed,
  parseRegionList,
  planRegionalGenerationBatches,
  requestGeminiTextualFeed,
  resolveSafeOutputPath,
  selectBatchCategories,
  validateAndNormalizeGeneratedBatch,
  validateModelName,
} from '../../../../scripts/lib/feedGenerator.mjs';
import { normalizeResolvedTarballUrl } from '../../../../scripts/normalize-lockfile.mjs';

describe('Scheduled Gemini textual feed generator pipeline', () => {
  it('sends GEMINI_API_KEY strictly via x-goog-api-key header (never URL params) and fails closed when missing', async () => {
    await expect(
      requestGeminiTextualFeed({
        apiKey: '',
        modelName: 'gemini-2.5-flash',
        prompt: 'Generate items',
      })
    ).rejects.toThrow(/GEMINI_API_KEY/i);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ items: [] }) }],
            },
          },
        ],
      }),
    });

    await requestGeminiTextualFeed({
      apiKey: 'test-secret-api-key-value',
      modelName: 'gemini-2.5-flash',
      prompt: 'Generate items',
      fetchImpl: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    );
    expect(calledUrl).not.toContain('test-secret-api-key-value');
    expect(calledUrl).not.toContain('key=');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(
      'test-secret-api-key-value'
    );
  });

  it('rejects model path injection and output path traversal attempts', () => {
    expect(() => validateModelName('../other-model')).toThrow(/Invalid GEMINI_MODEL/i);
    expect(() => validateModelName('gemini-2.5-flash?key=abc')).toThrow(/Invalid GEMINI_MODEL/i);
    expect(validateModelName('gemini-2.5-flash')).toBe('gemini-2.5-flash');

    expect(() => resolveSafeOutputPath('/repo', '../secrets.json')).toThrow(/Invalid output filename/i);
    expect(() => resolveSafeOutputPath('/repo', 'nested/feed.json')).toThrow(/Invalid output filename/i);
    expect(() => resolveSafeOutputPath('/repo', 'feed.js')).toThrow(/Invalid output filename/i);

    const safe = resolveSafeOutputPath('/repo', 'feed.json');
    expect(safe.outputPath).toBe('/repo/public/generated/feed.json');
  });

  it('sanitizes untrusted AI output, drops unsafe URLs/blocks, and produces ContentRecordSchema-valid textual records', () => {
    const rawGeminiOutput = {
      items: [
        {
          title: '<b>Why Octopuses</b> Edit Their Own RNA',
          subtitle: 'Cephalopods bend genetic rules in cold ocean water.',
          category: 'science',
          contentType: 'interactive_fact',
          topics: ['Biology', 'Ocean', 'Genetics'],
          estimatedDurationSeconds: 110,
          summary:
            '<script>alert(1)</script>Octopuses and squids rewrite RNA messages at far higher rates than mammals to adapt proteins quickly.',
          blocks: [
            {
              type: 'paragraph',
              text: 'Most animals rarely alter RNA once DNA is transcribed, yet coleoid cephalopods recode thousands of neural proteins on the fly.',
            },
            {
              type: 'fact_reveal',
              label: 'A chilly trigger',
              text: 'Lab studies show two-spot octopuses ramp up RNA editing within hours when water temperatures drop.',
            },
            {
              type: 'quiz',
              question: 'Broken quiz with out-of-range answer index',
              options: ['A', 'B'],
              correctOptionIndex: 5,
              explanation: 'Should be dropped safely while keeping valid blocks.',
            },
          ],
          followUps: ['How do cuttlefish coordinate camouflage?'],
          sourcePublisher: 'Marine Biological Laboratory',
          sourceTitle: 'Cephalopod RNA Editing',
          sourceUrl: 'javascript:alert(1)',
        },
        {
          // Invalid category -> must be rejected cleanly
          title: 'Invalid item',
          category: 'unknown_category',
          summary: 'Too short',
          blocks: [],
        },
      ],
    };

    const { records, rejectedCount } = validateAndNormalizeGeneratedBatch(
      rawGeminiOutput,
      '2026-11-18T12:00:00.000Z'
    );

    expect(rejectedCount).toBe(1);
    expect(records).toHaveLength(1);

    const record = ContentRecordSchema.parse(records[0]);
    expect(record.title).toBe('Why Octopuses Edit Their Own RNA');
    expect(record.summary).not.toContain('<script>');
    expect(record.blocks).toHaveLength(2); // malformed quiz block dropped safely
    expect(record.source.url).toMatch(/^https:\/\/en\.wikipedia\.org\/w\/index\.php\?search=/);
    expect(record.visual.imageUrl).toBeUndefined(); // textual-only run
    expect(record.visual.type).toBe('editorial_illustration');
  });

  it('balances underrepresented categories, deduplicates by title, and enforces maxItems', () => {
    const existing = [
      { id: 'curio_gen_1', title: 'Why Octopuses Edit Their Own RNA', category: 'science' as const },
      { id: 'curio_gen_2', title: 'How Coffee Houses Sparked London Finance', category: 'history' as const },
    ];

    const picked = selectBatchCategories(existing, 4);
    expect(picked).toHaveLength(4);
    expect(picked).not.toContain('science');
    expect(picked).not.toContain('history');

    const prompt = buildTextualFeedPrompt({
      categories: picked,
      batchSize: 4,
      recentTitles: existing.map((item) => item.title),
    });
    expect(prompt).toContain('TEXTUAL-ONLY');
    expect(prompt).toContain('<existing_titles>');

    const merged = mergeGeneratedFeed(
      { items: existing },
      [
        { id: 'curio_gen_dup', title: 'Why octopuses edit their own RNA!', category: 'science' as const },
        { id: 'curio_gen_new', title: 'The Physics Behind Singing Sand Dunes', category: 'facts' as const },
      ],
      { maxItems: 2, nowIso: '2026-11-18T12:30:00.000Z', modelName: 'gemini-2.5-flash' }
    );

    expect(merged.addedCount).toBe(1);
    expect(merged.envelope.items).toHaveLength(2);
    expect(merged.envelope.items[0].id).toBe('curio_gen_new');
    expect(merged.envelope.items[1].id).toBe('curio_gen_1');
  });

  it('skips Gemini generation when minimum fresh unseen threshold is met and only replenishes exact deficits', () => {
    const nowMs = Date.parse('2026-11-18T12:00:00.000Z');
    const freshTs = '2026-11-18T10:00:00.000Z';
    const staleTs = '2026-11-16T08:00:00.000Z';

    const freshItems = Array.from({ length: 12 }, (_, idx) => ({
      id: `item_${idx}`,
      createdAt: freshTs,
    }));

    // 1. Threshold already met -> skip API call completely
    const skipDecision = evaluateGenerationNeed({
      existingItems: freshItems,
      minThreshold: 12,
      batchSize: 4,
      freshWindowHours: 24,
      nowMs,
    });
    expect(skipDecision).toEqual({
      shouldGenerate: false,
      itemsToGenerate: 0,
      freshUnseenCount: 12,
      deficit: 0,
      reason: 'threshold_met',
    });

    // 2. Two items seen by users -> deficit is 2, so cap generation count to 2 (not full batchSize 4)
    const partialDecision = evaluateGenerationNeed({
      existingItems: freshItems,
      seenIds: new Set(['item_0', 'item_1']),
      minThreshold: 12,
      batchSize: 4,
      freshWindowHours: 24,
      nowMs,
    });
    expect(partialDecision).toEqual({
      shouldGenerate: true,
      itemsToGenerate: 2,
      freshUnseenCount: 10,
      deficit: 2,
      reason: 'below_threshold',
    });

    // 3. Items older than freshWindowHours or marked seenAt/seenCount do not count toward unseen pool
    const mixedItems = [
      { id: 'fresh_1', createdAt: freshTs },
      { id: 'seen_at', createdAt: freshTs, seenAt: '2026-11-18T11:00:00.000Z' },
      { id: 'seen_cnt', createdAt: freshTs, seenCount: 3 },
      { id: 'stale_1', createdAt: staleTs },
    ];
    const replenishDecision = evaluateGenerationNeed({
      existingItems: mixedItems,
      minThreshold: 6,
      batchSize: 4,
      freshWindowHours: 24,
      nowMs,
    });
    expect(replenishDecision).toEqual({
      shouldGenerate: true,
      itemsToGenerate: 4,
      freshUnseenCount: 1,
      deficit: 5,
      reason: 'below_threshold',
    });

    // 4. forceGenerate bypasses threshold check explicitly
    const forcedDecision = evaluateGenerationNeed({
      existingItems: freshItems,
      minThreshold: 12,
      batchSize: 3,
      freshWindowHours: 24,
      nowMs,
      forceGenerate: true,
    });
    expect(forcedDecision).toEqual({
      shouldGenerate: true,
      itemsToGenerate: 3,
      freshUnseenCount: 12,
      deficit: 0,
      reason: 'forced',
    });
  });

  it('plans demand-driven regional batches for global + active user editions and tags regional output', () => {
    const nowMs = Date.parse('2026-11-18T12:00:00.000Z');
    const freshTs = '2026-11-18T10:00:00.000Z';

    expect(parseRegionList('in, US, global, INVALID, uk, in')).toEqual(['IN', 'US', 'UK']);

    const promptIN = buildTextualFeedPrompt({
      categories: ['science', 'history'],
      batchSize: 2,
      recentTitles: [],
      region: 'IN',
    });
    expect(promptIN).toContain('India');

    const { records } = validateAndNormalizeGeneratedBatch(
      {
        items: [
          {
            title: 'How Stepwells Engineered Passive Cooling Across Western India',
            subtitle: 'Ancient stone geometry lowered summer temperatures by degrees.',
            category: 'history',
            contentType: 'short_story',
            topics: ['Architecture', 'India', 'Water'],
            estimatedDurationSeconds: 120,
            summary:
              'Stepwells in Gujarat and Rajasthan combined subterranean water tables with terraced stone shafts to cool travelers and store monsoon water.',
            blocks: [
              {
                type: 'paragraph',
                text: 'Descending hundreds of shaded steps created a microclimate noticeably cooler than the surface heat above.',
              },
              {
                type: 'fact_reveal',
                label: 'Built-in air conditioning',
                text: 'Air at the bottom of deep stepwells like Rani ki Vav can stay 5 to 6 degrees Celsius cooler than street level.',
              },
            ],
            followUps: ['How did Rani ki Vav survive centuries of silt?'],
            sourcePublisher: 'Curio Desk',
            sourceTitle: 'Indian Stepwell Engineering',
            sourceUrl: 'https://en.wikipedia.org/wiki/Stepwell',
          },
        ],
      },
      '2026-11-18T12:00:00.000Z',
      { region: 'IN' }
    );
    expect(records).toHaveLength(1);
    expect(ContentRecordSchema.parse(records[0]).region).toBe('IN');

    // Global already has 12 fresh items (skip); IN has 1/6 (generate 2); UK already has 6/6 (skip)
    const existingItems = [
      ...Array.from({ length: 12 }, (_, idx) => ({
        id: `global_${idx}`,
        region: 'global',
        createdAt: freshTs,
      })),
      { id: 'in_0', region: 'IN', createdAt: freshTs },
      ...Array.from({ length: 6 }, (_, idx) => ({
        id: `uk_${idx}`,
        region: 'UK',
        createdAt: freshTs,
      })),
    ];

    const plans = planRegionalGenerationBatches({
      existingItems,
      activeRegions: ['IN', 'UK', 'US', 'JP'],
      globalMinThreshold: 12,
      regionalMinThreshold: 6,
      globalBatchSize: 4,
      regionalBatchSize: 2,
      freshWindowHours: 24,
      nowMs,
      maxRegionsPerRun: 2, // global + at most 2 active non-global regions (IN, UK)
    });

    expect(plans.map((p) => p.region)).toEqual(['global', 'IN', 'UK']);
    expect(plans[0]?.decision.shouldGenerate).toBe(false);
    expect(plans[1]?.decision.shouldGenerate).toBe(true);
    expect(plans[1]?.decision.itemsToGenerate).toBe(2);
    expect(plans[2]?.decision.shouldGenerate).toBe(false);
  });

  it('normalizes proxy-hosted and scoped lockfile tarball URLs to public registry.npmjs.org', () => {
    expect(
      normalizeResolvedTarballUrl(
        'http://internal-proxy.example:999/npm/repo/@ampproject/remapping/-/@ampproject/remapping-2.3.0.tgz'
      )
    ).toBe('https://registry.npmjs.org/@ampproject/remapping/-/remapping-2.3.0.tgz');

    expect(
      normalizeResolvedTarballUrl(
        'http://internal-proxy.example:999/npm/repo/lru-cache/-/lru-cache-10.4.3.tgz'
      )
    ).toBe('https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz');

    expect(
      normalizeResolvedTarballUrl(
        'https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.7.tgz'
      )
    ).toBe('https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.7.tgz');
  });
});
