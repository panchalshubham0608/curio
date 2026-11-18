import { describe, expect, it, vi } from 'vitest';
import { ContentRecordSchema } from '../../../shared/validation/contentSchemas';
import {
  buildTextualFeedPrompt,
  mergeGeneratedFeed,
  requestGeminiTextualFeed,
  resolveSafeOutputPath,
  selectBatchCategories,
  validateAndNormalizeGeneratedBatch,
  validateModelName,
} from '../../../../scripts/lib/feedGenerator.mjs';

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
});
