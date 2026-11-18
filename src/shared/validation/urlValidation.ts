// Strict URL validation & canonicalization utilities.
// Enforces HTTPS-only external links and allowlisted visual asset hosts to prevent XSS and unsafe navigation.

const APPROVED_IMAGE_HOSTS = new Set<string>([
  'lh3.googleusercontent.com',
  'upload.wikimedia.org',
  'images-assets.nasa.gov',
  'apod.nasa.gov',
  'images.unsplash.com',
  'images.pexels.com',
  'ids.si.edu',
]);

const TRACKING_PARAMS = new Set<string>([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
]);

function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '[::1]' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }

  // RFC1918 and link-local IPv4 ranges
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return false;
}

/**
 * Validates that a URL is a well-formed, public HTTPS URL without embedded credentials.
 * Strictly rejects javascript:, data:, vbscript:, file:, http:, and private/local addresses.
 */
export function isSafeHttpsUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0 || rawUrl.length > 2048) {
    return false;
  }
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return false;
    }
    if (isPrivateOrLocalHost(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that an image URL is either a safe first-party relative asset path
 * or an HTTPS URL on an approved stock/open-access image host.
 */
export function isSafeImageUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0 || rawUrl.length > 2048) {
    return false;
  }
  const trimmed = rawUrl.trim();

  // Allow strictly vetted first-party static assets without traversal sequences
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('..') && !trimmed.includes('\\')) {
    return /^\/[a-zA-Z0-9._/-]+\.(svg|png|jpg|jpeg|webp)$/.test(trimmed);
  }

  if (!isSafeHttpsUrl(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return APPROVED_IMAGE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Produces a canonical URL for reliable content deduplication across sources.
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.hash = '';

    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.searchParams.sort();

    let pathname = parsed.pathname.replace(/\/+$/, '');
    if (pathname === '') pathname = '/';
    parsed.pathname = pathname;

    return parsed.toString();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}
