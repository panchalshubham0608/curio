import { ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { formatEditorialDate } from '../../../shared/utils/time';
import type { ContentRecord } from '../../../shared/validation/contentSchemas';
import { isSafeHttpsUrl } from '../../../shared/validation/urlValidation';

interface SourceAttributionRowProps {
  record: ContentRecord;
}

/**
 * Displays verified source publisher, publication date, original HTTPS link,
 * and explicitly distinguishes reported source facts from AI-enriched interactive layers.
 */
export function SourceAttributionRow({ record }: SourceAttributionRowProps) {
  const safeUrl = isSafeHttpsUrl(record.source.url) ? record.source.url : null;

  return (
    <footer className="source-row" aria-label="Source attribution">
      <div className="stack-xs">
        <div className="row-wrap">
          <span className="row-wrap" style={{ gap: 5, fontWeight: 600, color: 'var(--ink-primary)' }}>
            <ShieldCheck size={14} aria-hidden="true" />
            {record.source.publisher}
          </span>
          <span>·</span>
          <span>{formatEditorialDate(record.source.publishedAt)}</span>
        </div>

        {record.isAiEnriched && (
          <div className="row-wrap" style={{ gap: 5, fontSize: '0.78rem' }}>
            <Sparkles size={13} aria-hidden="true" style={{ color: 'var(--accent-indigo)' }} />
            <span>
              {record.enrichmentNotice ??
                'Interactive structure synthesized from the attributed source above.'}
            </span>
          </div>
        )}
      </div>

      {safeUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          Read original source
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
    </footer>
  );
}
