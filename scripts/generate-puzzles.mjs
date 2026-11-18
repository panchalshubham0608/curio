#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateGenerationNeed,
  parseBoundedInt,
  requestGeminiTextualFeed,
  resolveSafeOutputPath,
  validateModelName,
} from './lib/feedGenerator.mjs';
import {
  createFirestoreAdminClient,
  mergeExistingItemsForPool,
  readFirestoreCollectionItems,
  writeFirestoreCollectionItems,
} from './lib/firestoreAdmin.mjs';
import {
  buildPuzzlesPrompt,
  mergeGeneratedPuzzles,
  selectPuzzleBatchKinds,
  validateAndNormalizeGeneratedPuzzles,
} from './lib/puzzleGenerator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

async function readExistingPuzzles(outputPath) {
  try {
    const raw = await readFile(outputPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { items: [] };
  } catch {
    return { items: [] };
  }
}

async function run() {
  const modelName = validateModelName(process.env.GEMINI_MODEL || 'gemini-flash-latest');
  const batchSize = parseBoundedInt(process.env.PUZZLES_BATCH_SIZE, 3, 1, 8);
  const minThreshold = parseBoundedInt(process.env.PUZZLES_MIN_THRESHOLD, 12, 1, 60);
  const maxItems = parseBoundedInt(process.env.PUZZLES_MAX_ITEMS, 48, minThreshold, 100);
  const freshWindowHours = parseBoundedInt(process.env.PUZZLES_FRESH_WINDOW_HOURS, 24, 1, 168);
  const forceGenerate = process.env.FORCE_GENERATE === 'true';
  const outputFileName = process.env.PUZZLES_OUTPUT_FILE || 'puzzles.json';

  const { allowedDir, outputPath } = resolveSafeOutputPath(REPO_ROOT, outputFileName);
  const existingEnvelope = await readExistingPuzzles(outputPath);
  const localItems = Array.isArray(existingEnvelope.items) ? existingEnvelope.items : [];

  const firestoreAdmin = await createFirestoreAdminClient();
  let firestoreItems = [];
  if (firestoreAdmin) {
    firestoreItems = await readFirestoreCollectionItems(firestoreAdmin.db, 'puzzles', {
      limit: maxItems,
    });
    console.info(
      `[Curio Puzzle Generator] Connected to Firestore (project=${firestoreAdmin.projectId}, existing=${firestoreItems.length}).`
    );
  }

  const existingItems = mergeExistingItemsForPool(firestoreItems, localItems);

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
      `[Curio Puzzle Generator] Skipping Gemini API call: ${decision.freshUnseenCount} fresh unseen puzzles already ready (minimum threshold: ${minThreshold}).`
    );
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      '[Curio Puzzle Generator] Missing GEMINI_API_KEY environment variable. Set it in GitHub Actions Secrets or your local shell before running.'
    );
    process.exitCode = 1;
    return;
  }

  const targetCount = decision.itemsToGenerate;
  const targetKinds = selectPuzzleBatchKinds(existingItems, targetCount);
  const recentTitles = existingItems
    .slice(0, 30)
    .map((item) => (typeof item?.title === 'string' ? item.title : ''))
    .filter(Boolean);

  const prompt = buildPuzzlesPrompt({
    kinds: targetKinds,
    batchSize: targetCount,
    recentTitles,
  });

  console.info(
    `[Curio Puzzle Generator] Requesting ${targetCount} puzzles (unseen=${decision.freshUnseenCount}/${minThreshold}) from ${modelName} for kinds: ${targetKinds.join(', ')}`
  );

  const rawPayload = await requestGeminiTextualFeed({
    apiKey,
    modelName,
    prompt,
  });

  const nowIso = new Date().toISOString();
  const { puzzles, rejectedCount, rejectionReasons } = validateAndNormalizeGeneratedPuzzles(
    rawPayload,
    nowIso
  );

  if (rejectionReasons.length > 0) {
    console.warn(
      `[Curio Puzzle Generator] Rejected ${rejectedCount} puzzle(s): ${rejectionReasons.join(' | ')}`
    );
  }

  if (puzzles.length === 0) {
    throw new Error(
      `Gemini returned 0 schema-valid puzzles (${rejectedCount} rejected).`
    );
  }

  let firestoreWritten = 0;
  if (firestoreAdmin) {
    const result = await writeFirestoreCollectionItems(firestoreAdmin.db, 'puzzles', puzzles);
    firestoreWritten = result.writtenCount;
  }

  const { addedCount, envelope } = mergeGeneratedPuzzles(existingEnvelope, puzzles, {
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
    `[Curio Puzzle Generator] Done: added=${addedCount}, rejected=${rejectedCount}, firestoreWritten=${firestoreWritten}, totalLocal=${envelope.itemCount}, file=public/generated/${path.basename(outputPath)}`
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unexpected puzzle generation error.';
  console.error(`[Curio Puzzle Generator] Failed: ${message}`);
  process.exitCode = 1;
});
