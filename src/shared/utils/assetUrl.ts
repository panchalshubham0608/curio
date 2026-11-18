/**
 * Prefixes a first-party public asset or static JSON path with Vite's configured
 * `BASE_URL` (e.g., `/curio/`), preserving absolute HTTPS URLs and preventing double prefixing.
 */
export function withBasePath(assetPath: string): string {
  if (!assetPath || /^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const rawBase = import.meta.env.BASE_URL || '/';
  const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;

  if (normalizedBase !== '/' && normalizedPath.startsWith(normalizedBase)) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath.slice(1)}`;
}

/**
 * Returns the React Router `basename` derived from Vite's configured `BASE_URL`
 * (e.g., `/curio` without a trailing slash, or `/` at root).
 */
export function getRouterBasename(): string {
  const rawBase = import.meta.env.BASE_URL || '/';
  const trimmed = rawBase.replace(/\/+$/, '');
  return trimmed || '/';
}
