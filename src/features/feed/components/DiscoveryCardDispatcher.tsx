import type { ReactNode } from 'react';
import {
  CATEGORY_METADATA,
  type ContentFormat,
  type ContentRecord,
} from '../../../shared/validation/contentSchemas';
import { ArticleCard } from './ArticleCard';
import {
  RegisteredBlockRenderer,
  type BlockRenderHandlers,
} from './ComponentRegistry';
import { EditorialVisual } from './EditorialVisual';
import { HeroImageCard } from './HeroImageCard';
import { SourceAttributionRow } from './SourceAttributionRow';
import './DiscoveryCard.css';

const FORMAT_LABELS: Record<ContentFormat, string> = {
  quick_bite: 'Insight',
  short_story: 'Short Story',
  deep_dive: 'Deep Dive',
  quiz_challenge: 'Quiz',
  visual_explainer: 'Visual Story',
  interactive_fact: 'Interactive',
};

interface DiscoveryCardDispatcherProps {
  record: ContentRecord;
  handlers?: BlockRenderHandlers;
  footer?: ReactNode;
}

/**
 * Dispatches validated ContentRecords to registered top-level editorial card layouts
 * (`HeroImageCard`, `ArticleCard`, or `interactive_feature`).
 */
export function DiscoveryCardDispatcher({
  record,
  handlers,
  footer,
}: DiscoveryCardDispatcherProps) {
  if (record.cardVariant === 'hero_image') {
    return <HeroImageCard record={record} handlers={handlers} footer={footer} />;
  }

  if (record.cardVariant === 'article') {
    return <ArticleCard record={record} handlers={handlers} footer={footer} />;
  }

  const categoryMeta = CATEGORY_METADATA[record.category];
  return (
    <article className="curio-card curio-card--discovery fade-in-card">
      <div className="discovery-card-body">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <span
            className="curio-chip"
            style={{
              background: 'var(--bg-subtle)',
              borderColor: categoryMeta.accentHex,
              color: categoryMeta.accentHex,
            }}
          >
            {categoryMeta.shortLabel}
          </span>
          <span className="mono-meta">{FORMAT_LABELS[record.contentType]}</span>
        </div>

        <EditorialVisual
          visual={record.visual}
          category={record.category}
          title={record.title}
        />

        <h2 style={{ fontSize: 'clamp(1.38rem, 3.4vw, 1.85rem)', marginBottom: 10 }}>
          {record.title}
        </h2>

        {record.subtitle && (
          <p className="text-secondary" style={{ fontSize: '1.02rem', marginBottom: 14 }}>
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
