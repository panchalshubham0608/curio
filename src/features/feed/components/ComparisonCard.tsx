import { Scale } from 'lucide-react';
import type { ComparisonBlock } from '../../../shared/validation/contentSchemas';
import './ComparisonCard.css';

interface ComparisonCardProps {
  block: ComparisonBlock;
}

export function ComparisonCard({ block }: ComparisonCardProps) {
  return (
    <section
      className="timeline-card"
      aria-label={block.heading ?? 'Comparison'}
    >
      <div className="row-wrap" style={{ gap: 7 }}>
        <Scale size={15} style={{ color: 'var(--accent-indigo)' }} aria-hidden="true" />
        <span className="curio-eyebrow">{block.heading ?? 'Side-by-Side Comparison'}</span>
      </div>

      <div className="comparison-grid">
        {block.items.map((item, idx) => (
          <div key={`${item.name}-${idx}`} className="comparison-col">
            <h4 style={{ fontSize: '1.02rem' }}>{item.name}</h4>
            {item.subtitle && (
              <p className="mono-meta" style={{ marginTop: 3 }}>
                {item.subtitle}
              </p>
            )}
            <ul>
              {item.points.map((point, pIdx) => (
                <li key={pIdx}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {block.verdict && (
        <p
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--border-hairline)',
            fontSize: '0.92rem',
            color: 'var(--ink-primary)',
          }}
        >
          <strong>Synthesis: </strong>
          {block.verdict}
        </p>
      )}
    </section>
  );
}
