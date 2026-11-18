import type { ReactNode } from 'react';
import { Newspaper } from 'lucide-react';
import { formatEditorialDate } from '../../../shared/utils/time';
import {
  CATEGORY_METADATA,
  type ContentRecord,
} from '../../../shared/validation/contentSchemas';
import {
  RegisteredBlockRenderer,
  type BlockRenderHandlers,
} from './ComponentRegistry';
import { EditorialVisual } from './EditorialVisual';
import { SourceAttributionRow } from './SourceAttributionRow';
import './DiscoveryCard.css';

interface ArticleCardProps {
  record: ContentRecord;
  handlers?: BlockRenderHandlers;
  footer?: ReactNode;
}

/**
 * Editorial article / briefing card emphasizing publisher attribution,
 * visual craft, and concise structured interactive blocks.
 */
export function ArticleCard({ record, handlers, footer }: ArticleCardProps) {
  const categoryMeta = CATEGORY_METADATA[record.category];

  return (
    <article className="curio-card curio-card--discovery fade-in-card">
      <div className="discovery-card-body">
        <div
          className="row-between"
          style={{
            paddingBottom: 12,
            marginBottom: 16,
            borderBottom: `2px solid ${categoryMeta.accentHex}`,
          }}
        >
          <div className="row-wrap" style={{ gap: 8 }}>
            <Newspaper size={15} style={{ color: categoryMeta.accentHex }} aria-hidden="true" />
            <span className="curio-eyebrow" style={{ color: categoryMeta.accentHex }}>
              {categoryMeta.shortLabel} · {record.source.publisher}
            </span>
          </div>
          <span className="mono-meta">{formatEditorialDate(record.source.publishedAt)}</span>
        </div>

        {record.visual.imageUrl && (
          <EditorialVisual
            visual={record.visual}
            category={record.category}
            title={record.title}
          />
        )}

        <h2 style={{ fontSize: 'clamp(1.35rem, 3.2vw, 1.8rem)', marginBottom: 10 }}>
          {record.title}
        </h2>

        {record.subtitle && (
          <p className="text-secondary" style={{ fontSize: '1rem', marginBottom: 6 }}>
            {record.subtitle}
          </p>
        )}

        <div className="blocks-stack">
          {record.blocks.map((block, index) => (
            <RegisteredBlockRenderer
              key={`${record.id}-block-${index}`}
              block={block}
              handlers={handlers}
            />
          ))}
        </div>

        <SourceAttributionRow record={record} />
      </div>

      {footer && <div className="discovery-card-footer">{footer}</div>}
    </article>
  );
}
