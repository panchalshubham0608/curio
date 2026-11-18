export interface ParsedServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface FirestoreLikeDoc {
  id: string;
  data(): Record<string, unknown>;
}

export interface FirestoreLikeBatch {
  set(ref: unknown, data: Record<string, unknown>, options?: { merge?: boolean }): unknown;
  commit(): Promise<unknown>;
}

export interface FirestoreLikeDb {
  collection(name: string): {
    doc(id: string): unknown;
    orderBy(field: string, direction?: 'asc' | 'desc'): {
      limit(n: number): { get(): Promise<{ docs: FirestoreLikeDoc[] }> };
    };
    limit(n: number): { get(): Promise<{ docs: FirestoreLikeDoc[] }> };
  };
  batch(): FirestoreLikeBatch;
}

export declare function stripUndefinedDeep<T>(value: T): T;

export declare function parseServiceAccountConfig(rawValue: string): ParsedServiceAccount;

export declare function mergeExistingItemsForPool<T extends { id?: string }>(
  firestoreItems?: readonly T[],
  localItems?: readonly T[]
): T[];

export declare function createFirestoreAdminClient(options?: {
  env?: Record<string, string | undefined>;
  appName?: string;
}): Promise<{ db: FirestoreLikeDb; projectId: string } | null>;

export declare function readFirestoreCollectionItems(
  db: FirestoreLikeDb,
  collectionName: 'content' | 'puzzles',
  options?: { limit?: number }
): Promise<Array<Record<string, unknown> & { id: string }>>;

export declare function writeFirestoreCollectionItems(
  db: FirestoreLikeDb,
  collectionName: 'content' | 'puzzles',
  items: ReadonlyArray<Record<string, unknown> & { id: string }>
): Promise<{ writtenCount: number }>;
