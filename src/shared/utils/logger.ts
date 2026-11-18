// Safe structured logger that strips sensitive keys and avoids printing raw user profiles or credentials.

const SENSITIVE_KEY_PATTERN = /(token|secret|password|apikey|api_key|authorization|cookie|email|credential)/i;

function redactMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 240) {
      sanitized[key] = `${value.slice(0, 240)}…`;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = '[Object]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function logInfo(event: string, meta?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info(`[Curio] ${event}`, redactMeta(meta) ?? '');
  }
}

export function logWarn(event: string, meta?: Record<string, unknown>): void {
  console.warn(`[Curio] ${event}`, redactMeta(meta) ?? '');
}

export function logError(event: string, code?: string): void {
  console.error(`[Curio] ${event}${code ? ` (${code})` : ''}`);
}
