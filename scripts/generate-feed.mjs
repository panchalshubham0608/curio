#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildTextualFeedPrompt,
  mergeGeneratedFeed,
  parseBoundedInt,
  parseRegionList,
  planRegionalGenerationBatches,
  requestGeminiTextualFeed,
  resolveSafeOutputPath,
  selectBatchCategories,
  validateAndNormalizeGeneratedBatch,
  validateModelName,
} from './lib/feedGenerator.mjs';
import {
  createFirestoreAdminClient,
  mergeExistingItemsForPool,
  readActiveUserRegions,
  readFirestoreCollectionItems,
  readSeenContentIds,
  writeFirestoreCollectionItems,
} from './lib/firestoreAdmin.mjs';

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
  const modelName = validateModelName(process.env.GEMINI_MODEL || 'gemini-flash-latest');
  const globalBatchSize = parseBoundedInt(process.env.FEED_BATCH_SIZE, 4, 1, 8);
  const regionalBatchSize = parseBoundedInt(process.env.FEED_REGIONAL_BATCH_SIZE, 2, 1, 4);
  const globalMinThreshold = parseBoundedInt(process.env.FEED_MIN_THRESHOLD, 12, 1, 60);
  const regionalMinThreshold = parseBoundedInt(process.env.FEED_REGIONAL_MIN_THRESHOLD, 6, 1, 30);
  const maxItems = parseBoundedInt(process.env.FEED_MAX_ITEMS, 80, globalMinThreshold, 160);
  const freshWindowHours = parseBoundedInt(process.env.FEED_FRESH_WINDOW_HOURS, 24, 1, 168);
  const forceGenerate = process.env.FORCE_GENERATE === 'true';
  const envTargetRegions = parseRegionList(process.env.FEED_TARGET_REGIONS || '');
  const outputFileName = process.env.FEED_OUTPUT_FILE || 'feed.json';

  const { allowedDir, outputPath } = resolveSafeOutputPath(REPO_ROOT, outputFileName);
  const existingEnvelope = await readExistingFeed(outputPath);
  const localItems = Array.isArray(existingEnvelope.items) ? existingEnvelope.items : [];

  const firestoreAdmin = await createFirestoreAdminClient();
  let firestoreItems = [];
  let seenContentIds = new Set();
  let firestoreActiveRegions = [];

  if (firestoreAdmin) {
    [firestoreItems, seenContentIds, firestoreActiveRegions] = await Promise.all([
      readFirestoreCollectionItems(firestoreAdmin.db, 'content', { limit: maxItems }),
      readSeenContentIds(firestoreAdmin.db),
      readActiveUserRegions(firestoreAdmin.db),
    ]);
    console.info(
      `[Curio Feed Generator] Connected to Firestore (project=${firestoreAdmin.projectId}, existing=${firestoreItems.length}, seen=${seenContentIds.size}, activeRegions=${firestoreActiveRegions.join(',') || 'none'}).`
    );
  }

  const existingItems = mergeExistingItemsForPool(firestoreItems, localItems);
  const activeRegions = parseRegionList([...firestoreActiveRegions, ...envTargetRegions]);

  const plans = planRegionalGenerationBatches({
    existingItems,
    seenIds: seenContentIds,
    activeRegions,
    fallbackTimestamp: existingEnvelope.generatedAt,
    globalMinThreshold,
    regionalMinThreshold,
    globalBatchSize,
    regionalBatchSize,
    freshWindowHours,
    forceGenerate,
  });

  const duePlans = plans.filter((plan) => plan.decision.shouldGenerate);
  if (duePlans.length === 0) {
    const summary = plans
      .map((p) => `${p.region}=${p.decision.freshUnseenCount}/${p.minThreshold}`)
      .join(', ');
    console.info(
      `[Curio Feed Generator] Skipping Gemini API call: all editions meet unseen thresholds (${summary}).`
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

  const nowIso = new Date().toISOString();
  const allNewRecords = [];
  let totalRejected = 0;

  const recentTitles = existingItems
    .slice(0, 32)
    .map((item) => (typeof item?.title === 'string' ? item.title : ''))
    .filter(Boolean);

  for (const plan of duePlans) {
    const targetCount = plan.decision.itemsToGenerate;
    const targetCategories = selectBatchCategories(plan.existingRegionItems, targetCount);
    const prompt = buildTextualFeedPrompt({
      categories: targetCategories,
      batchSize: targetCount,
      recentTitles: [...recentTitles, ...allNewRecords.map((r) => r.title)],
      region: plan.region,
    });

    console.info(
      `[Curio Feed Generator] Requesting ${targetCount} textual items for region=${plan.region} (unseen=${plan.decision.freshUnseenCount}/${plan.minThreshold}) from ${modelName} for categories: ${targetCategories.join(', ')}`
    );

    const rawPayload = await requestGeminiTextualFeed({
      apiKey,
      modelName,
      prompt,
    });

    const { records, rejectedCount } = validateAndNormalizeGeneratedBatch(rawPayload, nowIso, {
      region: plan.region,
    });
    totalRejected += rejectedCount;
    allNewRecords.push(...records);
  }

  if (allNewRecords.length === 0) {
    throw new Error(
      `Gemini returned 0 schema-valid textual feed items (${totalRejected} rejected).`
    );
  }

  let firestoreWritten = 0;
  if (firestoreAdmin) {
    const result = await writeFirestoreCollectionItems(
      firestoreAdmin.db,
      'content',
      allNewRecords
    );
    firestoreWritten = result.writtenCount;
  }

  const { addedCount, envelope } = mergeGeneratedFeed(existingEnvelope, allNewRecords, {
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
    `[Curio Feed Generator] Done: added=${addedCount}, rejected=${totalRejected}, firestoreWritten=${firestoreWritten}, totalLocal=${envelope.itemCount}, file=public/generated/${path.basename(outputPath)}`
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unexpected feed generation error.';
  console.error(`[Curio Feed Generator] Failed: ${message}`);
  process.exitCode = 1;
});
