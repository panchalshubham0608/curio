import { Clock } from 'lucide-react';
import type { TimelineBlock } from '../../../shared/validation/contentSchemas';
import './TimelineCard.css';

interface TimelineCardProps {
  block: TimelineBlock;
}

export function TimelineCard({ block }: TimelineCardProps) {
  return (
    <section className="timeline-card" aria-label={block.heading ?? 'Chronological timeline'}>
      <div className="row-wrap" style={{ gap: 7 }}>
        <Clock size={15} style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
        <span className="curio-eyebrow">{block.heading ?? 'Timeline'}</span>
      </div>

      <ol className="timeline-list">
        {block.events.map((event, idx) => (
          <li key={`${event.year}-${idx}`} className="timeline-item stack-xs">
            <span className="mono-meta" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
              {event.year}
            </span>
            <h4 style={{ fontSize: '1.02rem' }}>{event.title}</h4>
            <p className="text-secondary" style={{ fontSize: '0.93rem' }}>
              {event.detail}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
