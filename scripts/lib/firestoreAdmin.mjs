const ALLOWED_COLLECTIONS = new Set(['content', 'puzzles']);
const SAFE_DOC_ID_REGEX = /^[a-zA-Z0-9_-]{3,120}$/;
const MAX_BATCH_WRITES = 400;

/**
 * Recursively strips `undefined` properties from plain objects so Firestore Admin
 * accepts nested structured payloads (e.g., `svgDiagram`, `gridPuzzle`, `blocks`).
 */
export function stripUndefinedDeep(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedDeep(entry));
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const cleaned = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        cleaned[key] = stripUndefinedDeep(entry);
      }
    }
    return cleaned;
  }
  return value;
}

/**
 * Parses and validates a Firebase Service Account JSON string (raw JSON or base64-encoded JSON).
 * Never includes private key material in thrown error messages.
 */
export function parseServiceAccountConfig(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is empty.');
  }

  const trimmed = rawValue.trim();
  let jsonText = trimmed;
  if (!trimmed.startsWith('{')) {
    try {
      jsonText = Buffer.from(trimmed, 'base64').toString('utf8').trim();
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is neither valid JSON nor valid base64.');
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON could not be parsed as JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must decode to an object.');
  }

  const projectId =
    typeof parsed.project_id === 'string' && parsed.project_id.trim()
      ? parsed.project_id.trim()
      : '';
  const clientEmail =
    typeof parsed.client_email === 'string' && parsed.client_email.trim()
      ? parsed.client_email.trim()
      : '';
  const rawPrivateKey =
    typeof parsed.private_key === 'string' && parsed.private_key.trim()
      ? parsed.private_key.trim()
      : '';

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON must include project_id, client_email, and private_key.'
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: rawPrivateKey.replace(/\\n/g, '\n'),
  };
}

/**
 * Merges live Firestore items ahead of local JSON archive items (deduplicated by id)
 * so threshold checks and prompt deduplication see the full active pool.
 */
export function mergeExistingItemsForPool(firestoreItems = [], localItems = []) {
  const seenIds = new Set();
  const merged = [];

  for (const source of [firestoreItems, localItems]) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) {
        continue;
      }
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      merged.push(item);
    }
  }

  return merged;
}

/**
 * Initializes a server-side Firebase Admin Firestore client when either
 * `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` is configured.
 * Returns `null` when no admin credentials are present (unless `REQUIRE_FIRESTORE=true`).
 */
export async function createFirestoreAdminClient({
  env = process.env,
  appName = 'curio-content-generator',
} = {}) {
  const serviceAccountRaw = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const adcPath = env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const requireFirestore = env.REQUIRE_FIRESTORE === 'true';

  if (!serviceAccountRaw && !adcPath) {
    if (requireFirestore) {
      throw new Error(
        'Firestore publishing is required (REQUIRE_FIRESTORE=true) but neither FIREBASE_SERVICE_ACCOUNT_JSON nor GOOGLE_APPLICATION_CREDENTIALS is set.'
      );
    }
    return null;
  }

  const [{ applicationDefault, cert, getApps, initializeApp }, { getFirestore }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/firestore'),
  ]);

  let app = getApps().find((candidate) => candidate.name === appName);
  const configuredProjectId =
    env.FIREBASE_PROJECT_ID?.trim() || env.VITE_FIREBASE_PROJECT_ID?.trim() || '';
  let projectId = configuredProjectId || 'default';

  if (!app) {
    if (serviceAccountRaw) {
      const sa = parseServiceAccountConfig(serviceAccountRaw);
      projectId = sa.projectId;
      app = initializeApp(
        {
          credential: cert({
            projectId: sa.projectId,
            clientEmail: sa.clientEmail,
            privateKey: sa.privateKey,
          }),
          projectId: sa.projectId,
        },
        appName
      );
    } else {
      app = initializeApp(
        {
          credential: applicationDefault(),
          ...(configuredProjectId ? { projectId: configuredProjectId } : {}),
        },
        appName
      );
    }
  } else if (app.options.projectId) {
    projectId = app.options.projectId;
  }

  const db = getFirestore(app);
  return { db, projectId };
}

function assertAllowedCollection(collectionName) {
  if (!ALLOWED_COLLECTIONS.has(collectionName)) {
    throw new Error(`Unsupported Firestore collection "${collectionName}".`);
  }
}

/**
 * Reads recent documents from an allow-listed Firestore collection (`content` or `puzzles`).
 */
export async function readFirestoreCollectionItems(db, collectionName, { limit = 120 } = {}) {
  assertAllowedCollection(collectionName);
  const boundedLimit = Math.min(200, Math.max(1, Number(limit) || 120));
  const colRef = db.collection(collectionName);

  let snap;
  try {
    snap = await colRef.orderBy('createdAt', 'desc').limit(boundedLimit).get();
  } catch {
    snap = await colRef.limit(boundedLimit).get();
  }

  return snap.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
  }));
}

/**
 * Writes schema-validated generated records into an allow-listed Firestore collection
 * using chunked atomic write batches with `merge: true`.
 */
export async function writeFirestoreCollectionItems(db, collectionName, items) {
  assertAllowedCollection(collectionName);
  if (!Array.isArray(items) || items.length === 0) {
    return { writtenCount: 0 };
  }

  const validItems = items.filter(
    (item) => item && typeof item === 'object' && typeof item.id === 'string' && SAFE_DOC_ID_REGEX.test(item.id)
  );

  let writtenCount = 0;
  for (let offset = 0; offset < validItems.length; offset += MAX_BATCH_WRITES) {
    const chunk = validItems.slice(offset, offset + MAX_BATCH_WRITES);
    const batch = db.batch();
    for (const item of chunk) {
      const ref = db.collection(collectionName).doc(item.id);
      batch.set(ref, stripUndefinedDeep(item), { merge: true });
      writtenCount += 1;
    }
    await batch.commit();
  }

  return { writtenCount };
}

/**
 * Reads puzzle IDs already solved by users across `/users/{uid}/solvedPuzzles/{puzzleId}`
 * so the scheduled generator replenishes fresh unseen puzzles automatically.
 */
export async function readSolvedPuzzleIds(db, { limit = 500 } = {}) {
  const boundedLimit = Math.min(1000, Math.max(1, Number(limit) || 500));
  try {
    const snap = await db.collectionGroup('solvedPuzzles').limit(boundedLimit).get();
    const seen = new Set();
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const id = typeof data?.puzzleId === 'string' && data.puzzleId.trim()
        ? data.puzzleId.trim()
        : docSnap.id;
      if (SAFE_DOC_ID_REGEX.test(id)) {
        seen.add(id);
      }
    }
    return seen;
  } catch {
    return new Set();
  }
}

/**
 * Reads content IDs already interacted with by users across `/users/{uid}/interactions/{id}`
 * so the scheduled feed generator replenishes fresh unseen stories automatically.
 */
export async function readSeenContentIds(db, { limit = 500 } = {}) {
  const boundedLimit = Math.min(1000, Math.max(1, Number(limit) || 500));
  try {
    const snap = await db.collectionGroup('interactions').limit(boundedLimit).get();
    const seen = new Set();
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (typeof data?.contentId === 'string' && SAFE_DOC_ID_REGEX.test(data.contentId.trim())) {
        seen.add(data.contentId.trim());
      }
    }
    return seen;
  } catch {
    return new Set();
  }
}

const VALID_USER_REGIONS = new Set(['IN', 'US', 'UK', 'EU', 'JP', 'AU', 'CA']);

/**
 * Reads distinct non-global Edition/Region codes actively selected across `/users/*`
 * so the scheduled generator only creates localized batches for regions with real readers.
 */
export async function readActiveUserRegions(db, { limit = 500 } = {}) {
  const boundedLimit = Math.min(1000, Math.max(1, Number(limit) || 500));
  try {
    const snap = await db.collection('users').limit(boundedLimit).get();
    const regions = new Set();
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const raw = typeof data?.region === 'string' ? data.region.trim().toUpperCase() : '';
      if (VALID_USER_REGIONS.has(raw)) {
        regions.add(raw);
      }
    }
    return Array.from(regions).sort();
  } catch {
    return [];
  }
}
