#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildTextualFeedPrompt,
  evaluateGenerationNeed,
  mergeGeneratedFeed,
  parseBoundedInt,
  requestGeminiTextualFeed,
  resolveSafeOutputPath,
  selectBatchCategories,
  validateAndNormalizeGeneratedBatch,
  validateModelName,
} from './lib/feedGenerator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

async function readExistingFeed(outputPath) {
  try {
    const raw = await readFile(outputPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { items: [] };
  } catch {
    return { items: [] };
  }
}

async function run() {
  const modelName = validateModelName(process.env.GEMINI_MODEL || 'gemini-2.5-flash');
  const batchSize = parseBoundedInt(process.env.FEED_BATCH_SIZE, 4, 1, 8);
  const minThreshold = parseBoundedInt(process.env.FEED_MIN_THRESHOLD, 12, 1, 60);
  const maxItems = parseBoundedInt(process.env.FEED_MAX_ITEMS, 60, minThreshold, 120);
  const freshWindowHours = parseBoundedInt(process.env.FEED_FRESH_WINDOW_HOURS, 24, 1, 168);
  const forceGenerate = process.env.FORCE_GENERATE === 'true';
  const outputFileName = process.env.FEED_OUTPUT_FILE || 'feed.json';

  const { allowedDir, outputPath } = resolveSafeOutputPath(REPO_ROOT, outputFileName);
  const existingEnvelope = await readExistingFeed(outputPath);
  const existingItems = Array.isArray(existingEnvelope.items) ? existingEnvelope.items : [];

  const decision = evaluateGenerationNeed({
    existingItems,
    fallbackTimestamp: existingEnvelope.generatedAt,
    minThreshold,
    batchSize,
    freshWindowHours,
    forceGenerate,
  });

  if (!decision.shouldGenerate) {
    console.info(
      `[Curio Feed Generator] Skipping Gemini API call: ${decision.freshUnseenCount} fresh unseen items already ready (minimum threshold: ${minThreshold}).`
    );
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      '[Curio Feed Generator] Missing GEMINI_API_KEY environment variable. Set it in GitHub Actions Secrets or your local shell before running.'
    );
    process.exitCode = 1;
    return;
  }

  const targetCount = decision.itemsToGenerate;
  const targetCategories = selectBatchCategories(existingItems, targetCount);
  const recentTitles = existingItems
    .slice(0, 24)
    .map((item) => (typeof item?.title === 'string' ? item.title : ''))
    .filter(Boolean);

  const prompt = buildTextualFeedPrompt({
    categories: targetCategories,
    batchSize: targetCount,
    recentTitles,
  });

  console.info(
    `[Curio Feed Generator] Requesting ${targetCount} textual items (unseen=${decision.freshUnseenCount}/${minThreshold}) from ${modelName} for categories: ${targetCategories.join(', ')}`
  );

  const rawPayload = await requestGeminiTextualFeed({
    apiKey,
    modelName,
    prompt,
  });

  const nowIso = new Date().toISOString();
  const { records, rejectedCount } = validateAndNormalizeGeneratedBatch(rawPayload, nowIso);

  if (records.length === 0) {
    throw new Error(
      `Gemini returned 0 schema-valid textual feed items (${rejectedCount} rejected).`
    );
  }

  const { addedCount, envelope } = mergeGeneratedFeed(existingEnvelope, records, {
    maxItems,
    nowIso,
    modelName,
  });

  await mkdir(allowedDir, { recursive: true });
  const tempPath = path.join(allowedDir, `.${path.basename(outputPath)}.tmp`);
  if (!tempPath.startsWith(allowedDir + path.sep)) {
    throw new Error('Temporary write path escaped public/generated directory.');
  }

  await writeFile(tempPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  await rename(tempPath, outputPath);

  console.info(
    `[Curio Feed Generator] Done: added=${addedCount}, rejected=${rejectedCount}, total=${envelope.itemCount}, file=public/generated/${path.basename(outputPath)}`
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unexpected feed generation error.';
  console.error(`[Curio Feed Generator] Failed: ${message}`);
  process.exitCode = 1;
});
