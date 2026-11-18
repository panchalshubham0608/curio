import { describe, expect, it, vi } from 'vitest';
import {
  createFirestoreAdminClient,
  mergeExistingItemsForPool,
  parseServiceAccountConfig,
  readFirestoreCollectionItems,
  readSeenContentIds,
  readSolvedPuzzleIds,
  stripUndefinedDeep,
  writeFirestoreCollectionItems,
  type FirestoreLikeDb,
} from '../../../../scripts/lib/firestoreAdmin.mjs';
import { GeneratedFeedProvider } from '../../content/GeneratedFeedProvider';
import { SafeKeyValueStore } from '../../persistence/LocalStorageStore';
import {
  GeneratedPuzzleProvider,
  type RemoteSolvedPuzzlesAdapter,
} from '../../puzzles/PuzzleProvider';
import { createTestContentRecords, createTestPuzzles } from '../../../test/fixtures';

describe('Firebase Admin Firestore publisher & live client readers', () => {
  it('parses raw and base64 service account JSON cleanly and normalizes private_key newlines', () => {
    const raw = JSON.stringify({
      project_id: 'curio-prod',
      client_email: 'generator@curio-prod.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nABC123\\n-----END PRIVATE KEY-----\\n',
    });

    const parsedRaw = parseServiceAccountConfig(raw);
    expect(parsedRaw.projectId).toBe('curio-prod');
    expect(parsedRaw.clientEmail).toBe('generator@curio-prod.iam.gserviceaccount.com');
    expect(parsedRaw.privateKey).toContain('\nABC123\n');

    const b64 = Buffer.from(raw, 'utf8').toString('base64');
    const parsedB64 = parseServiceAccountConfig(b64);
    expect(parsedB64).toEqual(parsedRaw);

    expect(() => parseServiceAccountConfig('{"project_id":"only"}')).toThrow(
      /project_id, client_email, and private_key/i
    );
  });

  it('returns null when no admin credentials are configured and fails closed when REQUIRE_FIRESTORE=true', async () => {
    expect(await createFirestoreAdminClient({ env: {} })).toBeNull();
    await expect(
      createFirestoreAdminClient({ env: { REQUIRE_FIRESTORE: 'true' } })
    ).rejects.toThrow(/REQUIRE_FIRESTORE=true/i);
  });

  it('recursively strips undefined properties, enforces collection allow-list, and writes batches cleanly', async () => {
    const cleaned = stripUndefinedDeep({
      id: 'puz_ai_1234',
      hint: undefined,
      svgDiagram: {
        caption: 'Geometry',
        background: undefined,
        shapes: [{ shape: 'circle', cx: 10, cy: 10, r: 5, fill: undefined, stroke: '#3B4F75' }],
      },
    });
    expect(cleaned).toEqual({
      id: 'puz_ai_1234',
      svgDiagram: {
        caption: 'Geometry',
        shapes: [{ shape: 'circle', cx: 10, cy: 10, r: 5, stroke: '#3B4F75' }],
      },
    });

    const setCalls: Array<{ ref: unknown; data: Record<string, unknown>; options?: { merge?: boolean } }> = [];
    const commitMock = vi.fn().mockResolvedValue(undefined);
    const mockDb: FirestoreLikeDb = {
      collection: (name: string) => ({
        doc: (id: string) => `${name}/${id}`,
        orderBy: () => ({
          limit: () => ({
            get: async () => ({
              docs: [
                {
                  id: 'puz_ai_existing',
                  data: () => ({ title: 'Existing Firestore Puzzle', createdAt: '2026-11-18T10:00:00.000Z' }),
                },
              ],
            }),
          }),
        }),
        limit: () => ({
          get: async () => ({ docs: [] }),
        }),
      }),
      collectionGroup: (name: string) => ({
        limit: () => ({
          get: async () => ({
            docs:
              name === 'solvedPuzzles'
                ? [{ id: 'puz_ai_existing', data: () => ({ puzzleId: 'puz_ai_existing' }) }]
                : [{ id: 'int_1', data: () => ({ contentId: 'curio_gen_001' }) }],
          }),
        }),
      }),
      batch: () => ({
        set: (ref, data, options) => {
          setCalls.push({ ref, data, options });
        },
        commit: commitMock,
      }),
    };

    // Disallowed collection is rejected
    await expect(
      writeFirestoreCollectionItems(mockDb, 'users' as 'puzzles', [{ id: 'puz_1' }])
    ).rejects.toThrow(/Unsupported Firestore collection/i);

    const written = await writeFirestoreCollectionItems(mockDb, 'puzzles', [
      { id: 'puz_ai_valid123', title: 'Valid Puzzle', hint: undefined },
      { id: '../escape', title: 'Malicious ID should be skipped' },
    ]);

    expect(written.writtenCount).toBe(1);
    expect(commitMock).toHaveBeenCalledTimes(1);
    expect(setCalls[0]).toEqual({
      ref: 'puzzles/puz_ai_valid123',
      data: { id: 'puz_ai_valid123', title: 'Valid Puzzle' },
      options: { merge: true },
    });

    const readBack = await readFirestoreCollectionItems(mockDb, 'puzzles');
    expect(readBack).toEqual([
      {
        id: 'puz_ai_existing',
        title: 'Existing Firestore Puzzle',
        createdAt: '2026-11-18T10:00:00.000Z',
      },
    ]);

    expect(Array.from(await readSolvedPuzzleIds(mockDb))).toEqual(['puz_ai_existing']);
    expect(Array.from(await readSeenContentIds(mockDb))).toEqual(['curio_gen_001']);

    const mergedPool = mergeExistingItemsForPool(readBack, [
      { id: 'puz_ai_existing', title: 'Stale Local Copy' },
      { id: 'puz_ai_local_only', title: 'Local Backup' },
    ]);
    expect(mergedPool.map((item) => item.id)).toEqual(['puz_ai_existing', 'puz_ai_local_only']);
    expect(mergedPool[0]?.title).toBe('Existing Firestore Puzzle');
  });

  it('merges live Firestore puzzles and feed records ahead of static JSON fallback with Zod validation', async () => {
    const store = new SafeKeyValueStore('firestore_live_merge_test', false);
    const [puzzleA, puzzleB] = createTestPuzzles();
    const [feedA, feedB] = createTestContentRecords();

    const puzzleProvider = new GeneratedPuzzleProvider(store, {
      loadFromFirestore: async () => [
        { ...puzzleA, createdAt: '2026-11-18T14:00:00.000Z' },
        { id: 'bad_firestore_puzzle', kind: 'odd_one_out', options: [] },
      ],
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          items: [
            { ...puzzleA, title: 'Older Duplicate' },
            { ...puzzleB, createdAt: '2026-11-18T12:00:00.000Z' },
          ],
        }),
      }) as unknown as typeof fetch,
    });

    const puzzles = await puzzleProvider.listPuzzles();
    expect(puzzles).toHaveLength(2);
    expect(puzzles[0]?.id).toBe(puzzleA.id);
    expect(puzzles[0]?.title).toBe(puzzleA.title); // Live Firestore wins over static duplicate
    expect(puzzles[1]?.id).toBe(puzzleB.id);

    const feedProvider = new GeneratedFeedProvider({
      loadFromFirestore: async () => [feedA, { id: 'bad_doc', title: '' }],
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          items: [{ ...feedA, title: 'Stale Static Title' }, feedB],
        }),
      }) as unknown as typeof fetch,
    });

    const candidates = await feedProvider.discover({
      categories: ['science'],
      topicKeywords: [],
      limit: 10,
    });
    expect(candidates).toHaveLength(2);
    const firstMatch = candidates.find((c) => c.id === feedA.id);
    expect(firstMatch?.title).toBe(feedA.title); // Live Firestore wins over static duplicate
  });

  it('syncs per-user solved puzzles with Firestore remote adapter and falls back gracefully if offline', async () => {
    const store = new SafeKeyValueStore('firestore_solved_sync_test', false);
    const remoteRecords = new Set<string>(['puz_remote_01']);

    const remoteAdapter: RemoteSolvedPuzzlesAdapter = {
      listSolvedIds: vi.fn(async () => Array.from(remoteRecords)),
      saveSolvedId: vi.fn(async (_uid, puzzleId) => {
        remoteRecords.add(puzzleId);
      }),
      clearSolvedIds: vi.fn(async () => {
        remoteRecords.clear();
      }),
    };

    const provider = new GeneratedPuzzleProvider(store, {
      enableRemoteGenerated: false,
      remoteProgressAdapter: remoteAdapter,
    });

    // Merges remote Firestore solved IDs into local cache
    const initial = await provider.getSolvedIds('user_abc');
    expect(initial.has('puz_remote_01')).toBe(true);

    // Marks solved both locally and in Firestore
    const updated = await provider.markSolved('user_abc', 'puz_new_02');
    expect(updated.has('puz_remote_01')).toBe(true);
    expect(updated.has('puz_new_02')).toBe(true);
    expect(remoteAdapter.saveSolvedId).toHaveBeenCalledWith(
      'user_abc',
      'puz_new_02',
      expect.any(String)
    );

    // Clears both local and remote solved progress
    await provider.clearSolved('user_abc');
    expect((await provider.getSolvedIds('user_abc')).size).toBe(0);
    expect(remoteAdapter.clearSolvedIds).toHaveBeenCalledWith('user_abc');

    // Graceful offline fallback when remote throws
    const offlineProvider = new GeneratedPuzzleProvider(store, {
      enableRemoteGenerated: false,
      remoteProgressAdapter: {
        listSolvedIds: vi.fn().mockRejectedValue(new Error('permission-denied')),
        saveSolvedId: vi.fn().mockRejectedValue(new Error('permission-denied')),
        clearSolvedIds: vi.fn().mockRejectedValue(new Error('permission-denied')),
      },
    });
    const offlineSolved = await offlineProvider.markSolved('user_abc', 'puz_offline_03');
    expect(offlineSolved.has('puz_offline_03')).toBe(true);
    expect((await offlineProvider.getSolvedIds('user_abc')).has('puz_offline_03')).toBe(true);
  });
});
