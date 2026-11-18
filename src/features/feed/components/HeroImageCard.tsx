import type { ReactNode } from 'react';
import {
  CATEGORY_METADATA,
  type ContentFormat,
  type ContentRecord,
} from '../../../shared/validation/contentSchemas';
import {
  RegisteredBlockRenderer,
  type BlockRenderHandlers,
} from './ComponentRegistry';
import { EditorialVisual } from './EditorialVisual';
import { SourceAttributionRow } from './SourceAttributionRow';

const FORMAT_LABELS: Record<ContentFormat, string> = {
  quick_bite: 'Insight',
  short_story: 'Short Story',
  deep_dive: 'Deep Dive',
  quiz_challenge: 'Quiz',
  visual_explainer: 'Visual Story',
  interactive_fact: 'Interactive',
};

interface DiscoveryCardProps {
  record: ContentRecord;
  handlers?: BlockRenderHandlers;
  footer?: ReactNode;
}

/**
 * Image-led Hero discovery card for visual stories and editorial features.
 */
export function HeroImageCard({ record, handlers, footer }: DiscoveryCardProps) {
  const categoryMeta = CATEGORY_METADATA[record.category];

  return (
    <article className="curio-card curio-card--discovery fade-in-card">
      <div className="discovery-card-body">
        <EditorialVisual
          visual={record.visual}
          category={record.category}
          title={record.title}
        />

        <div className="row-between" style={{ marginBottom: 12 }}>
          <span
            className="curio-chip"
            style={{
              borderColor: categoryMeta.accentHex,
              color: categoryMeta.accentHex,
              background: 'transparent',
            }}
          >
            {categoryMeta.shortLabel}
          </span>
          <span className="mono-meta">{FORMAT_LABELS[record.contentType]}</span>
        </div>

        <h2 style={{ fontSize: 'clamp(1.38rem, 3.4vw, 1.85rem)', marginBottom: 10 }}>
          {record.title}
        </h2>

        {record.subtitle && (
          <p className="text-secondary" style={{ fontSize: '1.02rem', marginBottom: 8 }}>
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
