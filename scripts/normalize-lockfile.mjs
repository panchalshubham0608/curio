#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_NPM_REGISTRY = 'https://registry.npmjs.org';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const LOCKFILE_PATH = path.join(REPO_ROOT, 'package-lock.json');

/**
 * Rewrites a proxy-hosted or non-canonical npm tarball URL into the canonical
 * public registry.npmjs.org URL while preserving package aliases and versions.
 *
 * Examples:
 * - http://proxy/path/@scope/pkg/-/@scope/pkg-1.0.0.tgz
 *   -> https://registry.npmjs.org/@scope/pkg/-/pkg-1.0.0.tgz
 * - http://proxy/path/pkg/-/pkg-1.0.0.tgz
 *   -> https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz
 */
export function normalizeResolvedTarballUrl(resolvedUrl) {
  if (typeof resolvedUrl !== 'string' || !resolvedUrl.trim()) {
    return resolvedUrl;
  }

  let parsed;
  try {
    parsed = new URL(resolvedUrl);
  } catch {
    return resolvedUrl;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return resolvedUrl;
  }

  const separatorIndex = parsed.pathname.indexOf('/-/');
  if (separatorIndex === -1) {
    return resolvedUrl;
  }

  const packageSegments = parsed.pathname
    .slice(0, separatorIndex)
    .split('/')
    .filter(Boolean);
  const tarballPath = parsed.pathname.slice(separatorIndex + 3);
  const tarballSegments = tarballPath.split('/').filter(Boolean);
  const tarballFilename = tarballSegments[tarballSegments.length - 1];

  if (packageSegments.length === 0 || !tarballFilename || !tarballFilename.endsWith('.tgz')) {
    return resolvedUrl;
  }

  const pkgShortName = packageSegments[packageSegments.length - 1];
  const maybeScope =
    packageSegments.length >= 2 ? packageSegments[packageSegments.length - 2] : null;
  const packagePath =
    maybeScope && maybeScope.startsWith('@')
      ? `${maybeScope}/${pkgShortName}`
      : pkgShortName;

  return `${PUBLIC_NPM_REGISTRY}/${packagePath}/-/${tarballFilename}`;
}

export function normalizeLockfileObject(lockfile) {
  let changedCount = 0;
  const nonPublicUrls = [];

  if (lockfile && typeof lockfile === 'object' && lockfile.packages && typeof lockfile.packages === 'object') {
    for (const [pkgKey, entry] of Object.entries(lockfile.packages)) {
      if (!entry || typeof entry !== 'object' || typeof entry.resolved !== 'string') {
        continue;
      }
      const normalized = normalizeResolvedTarballUrl(entry.resolved);
      if (normalized !== entry.resolved) {
        changedCount += 1;
        nonPublicUrls.push({ pkgKey, from: entry.resolved, to: normalized });
        entry.resolved = normalized;
      }
    }
  }

  return { changedCount, nonPublicUrls };
}

function main() {
  const checkOnly = process.argv.includes('--check');

  if (!fs.existsSync(LOCKFILE_PATH)) {
    console.error(`[Curio Lockfile] Could not find ${LOCKFILE_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(LOCKFILE_PATH, 'utf8');
  const lockfile = JSON.parse(raw);
  const { changedCount, nonPublicUrls } = normalizeLockfileObject(lockfile);

  if (checkOnly) {
    if (changedCount > 0) {
      console.error(
        `[Curio Lockfile] Found ${changedCount} non-canonical resolved URL(s) in package-lock.json (first: ${nonPublicUrls[0].from}).`
      );
      console.error('[Curio Lockfile] Run `npm run lockfile:normalize` before committing.');
      process.exit(1);
    }
    console.log('[Curio Lockfile] OK — all resolved URLs point to https://registry.npmjs.org/.');
    return;
  }

  if (changedCount === 0) {
    console.log('[Curio Lockfile] package-lock.json is already normalized.');
    return;
  }

  fs.writeFileSync(LOCKFILE_PATH, `${JSON.stringify(lockfile, null, 2)}\n`, 'utf8');
  console.log(
    `[Curio Lockfile] Normalized ${changedCount} resolved URL(s) in package-lock.json to ${PUBLIC_NPM_REGISTRY}.`
  );
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main();
}
