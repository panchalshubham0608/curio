import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

export const CURRENT_CONTENT_SCHEMA_VERSION = 1;

export const CONTENT_CATEGORIES = [
  'facts',
  'technology',
  'travel_food',
  'news',
  'humour',
  'history',
  'growth',
  'science',
];

export const TEXTUAL_CONTENT_FORMATS = [
  'quick_bite',
  'short_story',
  'deep_dive',
  'interactive_fact',
  'quiz_challenge',
  'visual_explainer',
];

export const CATEGORY_ACCENTS = {
  facts: '#B45309',
  technology: '#2563EB',
  travel_food: '#0F766E',
  news: '#C84B31',
  humour: '#9333EA',
  history: '#7C2D12',
  growth: '#2D6A4F',
  science: '#3B4F75',
};

const MODEL_NAME_REGEX = /^[a-zA-Z0-9._-]{3,64}$/;
const FILENAME_REGEX = /^[a-zA-Z0-9._-]+\.json$/;
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Strips HTML angle-bracket tags and ASCII control characters from untrusted AI text.
 */
export function sanitizeText(value, maxLength = 2000) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates model identifier against an allow-list to prevent URL path injection.
 */
export function validateModelName(rawModel) {
  const candidate = typeof rawModel === 'string' ? rawModel.trim() : '';
  if (!MODEL_NAME_REGEX.test(candidate)) {
    throw new Error(
      'Invalid GEMINI_MODEL value. Only alphanumeric characters, dots, underscores, and hyphens are allowed.'
    );
  }
  return candidate;
}

/**
 * Clamps integer configuration values strictly within [min, max].
 */
export function parseBoundedInt(rawValue, fallback, min, max) {
  const parsed = Number.parseInt(String(rawValue ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Resolves the generated feed file path strictly inside <repoRoot>/public/generated/
 * to defend against path traversal attacks.
 */
export function resolveSafeOutputPath(repoRoot, fileName = 'feed.json') {
  const safeBase = path.basename(String(fileName || 'feed.json'));
  if (!FILENAME_REGEX.test(safeBase) || safeBase !== String(fileName || 'feed.json')) {
    throw new Error('Invalid output filename. Must be a plain .json filename without path segments.');
  }

  const allowedDir = path.resolve(repoRoot, 'public', 'generated');
  const resolved = path.resolve(allowedDir, safeBase);

  if (!resolved.startsWith(allowedDir + path.sep)) {
    throw new Error('Output path escaped the allowed public/generated directory.');
  }

  return { allowedDir, outputPath: resolved };
}

/**
 * Verifies a source URL is strictly public HTTPS (no credentials, localhost, or raw IPs).
 * Falls back to a safe Wikipedia search URL for the topic if absent or unsafe.
 */
export function normalizeSafeSourceUrl(rawUrl, fallbackTopic) {
  const fallback = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(
    sanitizeText(fallbackTopic, 100) || 'Curiosity'
  )}`;

  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return fallback;
  }

  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase();
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.includes(':') ||
      IPV4_REGEX.test(host) ||
      !host.includes('.')
    ) {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

const ParagraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string().trim().min(12).max(2000),
});

const FactRevealBlockSchema = z.object({
  type: z.literal('fact_reveal'),
  label: z.string().trim().min(2).max(160),
  text: z.string().trim().min(10).max(1200),
});

const QuizBlockSchema = z
  .object({
    type: z.literal('quiz'),
    question: z.string().trim().min(6).max(320),
    options: z.array(z.string().trim().min(1).max(180)).min(2).max(4),
    correctOptionIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(6).max(600),
  })
  .refine((val) => val.correctOptionIndex < val.options.length, {
    message: 'correctOptionIndex out of range',
  });

const KeyTakeawayBlockSchema = z.object({
  type: z.literal('key_takeaway'),
  heading: z.string().trim().min(2).max(120).optional(),
  points: z.array(z.string().trim().min(4).max(260)).min(1).max(5),
});

const TimelineBlockSchema = z.object({
  type: z.literal('timeline'),
  heading: z.string().trim().min(2).max(120).optional(),
  events: z
    .array(
      z.object({
        year: z.string().trim().min(1).max(40),
        title: z.string().trim().min(2).max(140),
        detail: z.string().trim().min(4).max(400),
      })
    )
    .min(2)
    .max(6),
});

const ComparisonBlockSchema = z.object({
  type: z.literal('comparison'),
  heading: z.string().trim().min(2).max(120).optional(),
  leftTitle: z.string().trim().min(1).max(80),
  rightTitle: z.string().trim().min(1).max(80),
  leftPoints: z.array(z.string().trim().min(2).max(220)).min(1).max(5),
  rightPoints: z.array(z.string().trim().min(2).max(220)).min(1).max(5),
});

const ContentBlockSchema = z.union([
  ParagraphBlockSchema,
  FactRevealBlockSchema,
  QuizBlockSchema,
  KeyTakeawayBlockSchema,
  TimelineBlockSchema,
  ComparisonBlockSchema,
]);

const RawGeneratedItemSchema = z.object({
  title: z.string().trim().min(6).max(220),
  subtitle: z.string().trim().max(280).optional(),
  category: z.enum(CONTENT_CATEGORIES),
  contentType: z.enum(TEXTUAL_CONTENT_FORMATS).default('interactive_fact'),
  topics: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
  estimatedDurationSeconds: z.number().int().min(45).max(300).default(120),
  summary: z.string().trim().min(20).max(900),
  blocks: z.array(z.unknown()).min(2).max(8),
  followUps: z.array(z.string().trim().min(4).max(180)).max(4).default([]),
  sourcePublisher: z.string().trim().min(2).max(140).optional(),
  sourceTitle: z.string().trim().min(2).max(240).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
});

function sanitizeRawBlock(rawBlock) {
  if (!rawBlock || typeof rawBlock !== 'object') return null;
  const type = rawBlock.type;
  switch (type) {
    case 'paragraph':
      return { type: 'paragraph', text: sanitizeText(rawBlock.text, 2000) };
    case 'fact_reveal':
      return {
        type: 'fact_reveal',
        label: sanitizeText(rawBlock.label, 160),
        text: sanitizeText(rawBlock.text, 1200),
      };
    case 'quiz':
      return {
        type: 'quiz',
        question: sanitizeText(rawBlock.question, 320),
        options: Array.isArray(rawBlock.options)
          ? rawBlock.options.map((opt) => sanitizeText(opt, 180)).filter(Boolean)
          : [],
        correctOptionIndex: Number(rawBlock.correctOptionIndex),
        explanation: sanitizeText(rawBlock.explanation, 600),
      };
    case 'key_takeaway':
      return {
        type: 'key_takeaway',
        heading: rawBlock.heading ? sanitizeText(rawBlock.heading, 120) : undefined,
        points: Array.isArray(rawBlock.points)
          ? rawBlock.points.map((pt) => sanitizeText(pt, 260)).filter(Boolean)
          : [],
      };
    case 'timeline':
      return {
        type: 'timeline',
        heading: rawBlock.heading ? sanitizeText(rawBlock.heading, 120) : undefined,
        events: Array.isArray(rawBlock.events)
          ? rawBlock.events
              .filter((ev) => ev && typeof ev === 'object')
              .map((ev) => ({
                year: sanitizeText(ev.year, 40),
                title: sanitizeText(ev.title, 140),
                detail: sanitizeText(ev.detail, 400),
              }))
          : [],
      };
    case 'comparison':
      return {
        type: 'comparison',
        heading: rawBlock.heading ? sanitizeText(rawBlock.heading, 120) : undefined,
        leftTitle: sanitizeText(rawBlock.leftTitle, 80),
        rightTitle: sanitizeText(rawBlock.rightTitle, 80),
        leftPoints: Array.isArray(rawBlock.leftPoints)
          ? rawBlock.leftPoints.map((pt) => sanitizeText(pt, 220)).filter(Boolean)
          : [],
        rightPoints: Array.isArray(rawBlock.rightPoints)
          ? rawBlock.rightPoints.map((pt) => sanitizeText(pt, 220)).filter(Boolean)
          : [],
      };
    default:
      return null;
  }
}

/**
 * Selects categories with the fewest existing items first to keep the rolling feed balanced.
 */
export function selectBatchCategories(existingItems, batchSize) {
  const counts = new Map(CONTENT_CATEGORIES.map((cat) => [cat, 0]));
  for (const item of existingItems) {
    if (item && typeof item.category === 'string' && counts.has(item.category)) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
  }

  const ordered = [...CONTENT_CATEGORIES].sort((a, b) => {
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
 * Builds the structured prompt instructing Gemini to generate pure textual Curio feed items.
 */
export function buildTextualFeedPrompt({ categories, batchSize, recentTitles = [] }) {
  const safeTitles = recentTitles
    .slice(0, 24)
    .map((t) => sanitizeText(t, 120))
    .filter(Boolean);

  return [
    'You are Curio, a warm, factual, magazine-grade curiosity editor.',
    `Generate exactly ${batchSize} brand-new, self-contained TEXTUAL-ONLY discovery feed items.`,
    `Assign categories in order using this exact list: ${JSON.stringify(categories)}.`,
    'Rules:',
    '- Textual content ONLY: do NOT include image URLs, HTML tags, JSX, Markdown formatting, or code fences.',
    '- Write genuinely fascinating, accurate, verifiable real-world stories, facts, mental models, clever history, science, tech, food/travel culture, or witty insights.',
    '- Each item must include 2 to 4 rich textual blocks using allowed block types:',
    '  1. {"type":"paragraph","text":"..."} (always include at least one crisp opening paragraph)',
    '  2. {"type":"fact_reveal","label":"Short intriguing teaser","text":"The surprising reveal"}',
    '  3. {"type":"quiz","question":"...","options":["A","B","C"],"correctOptionIndex":0,"explanation":"..."}',
    '  4. {"type":"key_takeaway","heading":"Takeaway","points":["...","..."]}',
    '  5. {"type":"timeline","heading":"...","events":[{"year":"...","title":"...","detail":"..."}]}',
    '  6. {"type":"comparison","heading":"...","leftTitle":"...","rightTitle":"...","leftPoints":["..."],"rightPoints":["..."]}',
    '- Include a trustworthy public reference publisher name (e.g. "Smithsonian Magazine", "NASA", "Britannica", "Wikipedia") and an optional real public HTTPS URL (omit sourceUrl if unsure).',
    '- Return strictly valid JSON with shape: { "items": [ ... ] }',
    'Item JSON schema:',
    '{ "title": string, "subtitle": string, "category": string, "contentType": "quick_bite"|"short_story"|"deep_dive"|"interactive_fact"|"quiz_challenge", "topics": string[], "estimatedDurationSeconds": number (60-210), "summary": string, "blocks": Block[], "followUps": string[], "sourcePublisher": string, "sourceTitle": string, "sourceUrl"?: string }',
    safeTitles.length > 0
      ? `Avoid repeating any of these recent topics or titles:\n<existing_titles>\n${safeTitles.join('\n')}\n</existing_titles>`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Strips optional markdown JSON fences and parses JSON safely.
 */
export function extractJsonPayload(rawText) {
  const trimmed = String(rawText ?? '').trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(withoutFences);
}

/**
 * Normalizes a title for duplicate comparison.
 */
export function normalizeTitleKey(title) {
  return sanitizeText(title, 220)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Validates and sanitizes raw Gemini batch JSON into Curio ContentRecord objects.
 */
export function validateAndNormalizeGeneratedBatch(rawPayload, nowIso = new Date().toISOString()) {
  const rawItems = Array.isArray(rawPayload?.items)
    ? rawPayload.items
    : Array.isArray(rawPayload)
      ? rawPayload
      : [];

  const records = [];
  let rejectedCount = 0;

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== 'object') {
      rejectedCount += 1;
      continue;
    }

    const sanitizedInput = {
      title: sanitizeText(rawItem.title, 220),
      subtitle: rawItem.subtitle ? sanitizeText(rawItem.subtitle, 280) : undefined,
      category: rawItem.category,
      contentType: rawItem.contentType ?? 'interactive_fact',
      topics: Array.isArray(rawItem.topics)
        ? rawItem.topics.map((t) => sanitizeText(t, 60).toLowerCase()).filter(Boolean).slice(0, 8)
        : [],
      estimatedDurationSeconds: Number.isFinite(Number(rawItem.estimatedDurationSeconds))
        ? Math.round(Number(rawItem.estimatedDurationSeconds))
        : 120,
      summary: sanitizeText(rawItem.summary, 900),
      blocks: Array.isArray(rawItem.blocks) ? rawItem.blocks : [],
      followUps: Array.isArray(rawItem.followUps)
        ? rawItem.followUps.map((f) => sanitizeText(f, 180)).filter(Boolean).slice(0, 4)
        : [],
      sourcePublisher: rawItem.sourcePublisher
        ? sanitizeText(rawItem.sourcePublisher, 140)
        : 'Curio Editorial Reference',
      sourceTitle: rawItem.sourceTitle ? sanitizeText(rawItem.sourceTitle, 240) : undefined,
      sourceUrl: typeof rawItem.sourceUrl === 'string' ? rawItem.sourceUrl : undefined,
    };

    const parsedItem = RawGeneratedItemSchema.safeParse(sanitizedInput);
    if (!parsedItem.success) {
      rejectedCount += 1;
      continue;
    }

    const validBlocks = [];
    for (const candidateBlock of parsedItem.data.blocks) {
      const sanitizedBlock = sanitizeRawBlock(candidateBlock);
      const parsedBlock = ContentBlockSchema.safeParse(sanitizedBlock);
      if (parsedBlock.success) {
        validBlocks.push(parsedBlock.data);
      }
    }

    if (validBlocks.length === 0) {
      rejectedCount += 1;
      continue;
    }

    const data = parsedItem.data;
    const digest = createHash('sha256')
      .update(`${data.category}:${normalizeTitleKey(data.title)}`)
      .digest('hex')
      .slice(0, 12);

    const cardVariant =
      data.contentType === 'deep_dive' || data.contentType === 'short_story'
        ? 'article'
        : 'interactive_feature';

    records.push({
      id: `curio_gen_${digest}`,
      schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
      contentType: data.contentType,
      cardVariant,
      title: data.title,
      subtitle: data.subtitle,
      category: data.category,
      topics: data.topics,
      estimatedDurationSeconds: data.estimatedDurationSeconds,
      source: {
        publisher: data.sourcePublisher ?? 'Curio Editorial Reference',
        title: data.sourceTitle ?? data.title,
        url: normalizeSafeSourceUrl(data.sourceUrl, data.title),
        publishedAt: nowIso,
        retrievedAt: nowIso,
      },
      summary: data.summary,
      blocks: validBlocks,
      // Textual-only run: use lightweight local editorial fallback graphics with no external image URLs.
      visual: {
        type: 'editorial_illustration',
        alt: `${data.title} editorial card`,
        attribution: 'Curio Editorial',
        license: 'First-party',
        provider: 'Curio Design System',
        accentColor: CATEGORY_ACCENTS[data.category] ?? '#C84B31',
      },
      followUps: data.followUps,
      isAiEnriched: true,
      enrichmentNotice: 'Textual edition generated via Curio scheduled Gemini feed pipeline.',
      qualityStatus: 'approved',
      createdAt: nowIso,
      enrichedAt: nowIso,
    });
  }

  return { records, rejectedCount };
}

/**
 * Merges newly generated records ahead of existing items with ID + normalized-title deduplication
 * and enforces a bounded archive size.
 */
export function mergeGeneratedFeed(
  existingEnvelope,
  newRecords,
  { maxItems = 60, nowIso = new Date().toISOString(), modelName = 'gemini-2.5-flash' } = {}
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
  for (const record of newRecords) {
    const titleKey = normalizeTitleKey(record.title);
    if (seenIds.has(record.id) || seenTitles.has(titleKey)) {
      continue;
    }
    seenIds.add(record.id);
    seenTitles.add(titleKey);
    merged.push(record);
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
      schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
      generatedAt: nowIso,
      generator: 'gemini-textual-feed',
      model: modelName,
      itemCount: bounded.length,
      items: bounded,
    },
  };
}

/**
 * Evaluates whether scheduled generation should call Gemini or skip to save quota
 * because at least `minThreshold` fresh, unseen entries are already ready in the pool.
 */
export function evaluateGenerationNeed({
  existingItems = [],
  seenIds = new Set(),
  fallbackTimestamp,
  minThreshold = 12,
  batchSize = 4,
  freshWindowHours = 24,
  nowMs = Date.now(),
  forceGenerate = false,
} = {}) {
  const seenSet = seenIds instanceof Set ? seenIds : new Set(seenIds);
  const windowMs = Math.max(1, freshWindowHours) * 60 * 60 * 1000;
  let freshUnseenCount = 0;

  for (const item of existingItems) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item.id === 'string' ? item.id : '';
    const alreadySeen =
      (id && seenSet.has(id)) ||
      Boolean(item.seenAt) ||
      (typeof item.seenCount === 'number' && item.seenCount > 0);
    if (alreadySeen) continue;

    const tsRaw = item.createdAt ?? item.generatedAt ?? fallbackTimestamp;
    const parsedMs = typeof tsRaw === 'string' ? Date.parse(tsRaw) : Number.NaN;
    const isFresh = Number.isNaN(parsedMs) ? true : nowMs - parsedMs <= windowMs;
    if (isFresh) {
      freshUnseenCount += 1;
    }
  }

  const deficit = Math.max(0, minThreshold - freshUnseenCount);

  if (!forceGenerate && freshUnseenCount >= minThreshold) {
    return {
      shouldGenerate: false,
      itemsToGenerate: 0,
      freshUnseenCount,
      deficit: 0,
      reason: 'threshold_met',
    };
  }

  const itemsToGenerate = forceGenerate
    ? Math.max(1, batchSize)
    : Math.min(Math.max(1, batchSize), Math.max(1, deficit));

  return {
    shouldGenerate: true,
    itemsToGenerate,
    freshUnseenCount,
    deficit,
    reason: forceGenerate ? 'forced' : 'below_threshold',
  };
}

/**
 * Calls the Gemini REST API over HTTPS with the API key passed strictly in the
 * `x-goog-api-key` header (never in URL query parameters).
 */
export async function requestGeminiTextualFeed({
  apiKey,
  modelName = 'gemini-2.5-flash',
  prompt,
  fetchImpl = fetch,
  timeoutMs = 45_000,
}) {
  const cleanKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!cleanKey) {
    throw new Error('GEMINI_API_KEY environment variable is required to generate feed content.');
  }

  const validModel = validateModelName(modelName);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${validModel}:generateContent`;

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': cleanKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: [
              'You are Curio, a factual editorial curiosity assistant.',
              'Return strictly valid JSON only. Never return HTML, JSX, CSS, scripts, or Markdown code fences.',
              'Generate textual content only; do not invent image URLs.',
            ].join(' '),
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    // Do not include headers or API key in thrown error details.
    throw new Error(`Gemini API request failed with HTTP status ${response.status}.`);
  }

  const body = await response.json();
  const parts = body?.candidates?.[0]?.content?.parts;
  const combinedText = Array.isArray(parts)
    ? parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('')
        .trim()
    : '';

  if (!combinedText) {
    throw new Error('Gemini API returned an empty response payload.');
  }

  return extractJsonPayload(combinedText);
}
