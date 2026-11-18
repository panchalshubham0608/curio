// Plain-text normalization, prompt-injection boundary helpers, and PII masking.

const BASIC_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * Converts untrusted markup/feed text into plain text without touching innerHTML.
 */
export function stripHtmlToPlainText(input: string): string {
  if (!input) return '';
  let result = '';
  let inTag = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '<') {
      inTag = true;
      result += ' ';
      continue;
    }
    if (ch === '>') {
      inTag = false;
      continue;
    }
    if (!inTag) {
      result += ch;
    }
  }

  result = result.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => BASIC_ENTITY_MAP[entity] ?? entity);
  return result.replace(/\s+/g, ' ').trim();
}

export function truncateText(text: string, maxLength: number): string {
  const clean = text.trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/**
 * Sanitizes untrusted external content before wrapping it in prompt delimiters
 * so embedded instructions cannot break out of source data boundaries.
 */
export function sanitizePromptInput(input: string, maxLength = 1800): string {
  const withoutControl = input
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join('');

  const neutralized = withoutControl
    .replaceAll('<untrusted_source_content>', '[source_tag]')
    .replaceAll('</untrusted_source_content>', '[/source_tag]')
    .replaceAll('<user_question>', '[question_tag]')
    .replaceAll('</user_question>', '[/question_tag]');

  return truncateText(neutralized.replace(/\s+/g, ' '), maxLength);
}

/**
 * Masks email or identifier PII before displaying in UI labels.
 */
export function maskDisplayIdentifier(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes('@')) {
    const [localPart, domain] = trimmed.split('@');
    const visible = localPart.slice(0, 2);
    return `${visible}***@${domain ?? '***'}`;
  }
  if (trimmed.length <= 4) {
    return '***';
  }
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}
