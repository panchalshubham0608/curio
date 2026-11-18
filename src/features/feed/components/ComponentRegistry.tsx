import { Lightbulb } from 'lucide-react';
import {
  ContentBlockSchema,
  type ContentCategory,
} from '../../../shared/validation/contentSchemas';
import { ComparisonCard } from './ComparisonCard';
import { FactRevealCard } from './FactRevealCard';
import { QuizCard } from './QuizCard';
import { RabbitHoleCard } from './RabbitHoleCard';
import { TimelineCard } from './TimelineCard';

export interface BlockRenderHandlers {
  onStartRabbitHole?: (topic: string, category: ContentCategory) => void;
}

/**
 * Schema-driven strict component registry.
 * Re-validates every block at the rendering boundary and renders ONLY approved
 * registered React components. Unknown or invalid blocks are safely omitted—never executed.
 */
export function RegisteredBlockRenderer({
  block,
  handlers,
}: {
  block: unknown;
  handlers?: BlockRenderHandlers;
}) {
  const parsed = ContentBlockSchema.safeParse(block);
  if (!parsed.success) {
    // Safely omit unknown or malformed blocks rather than rendering untrusted output
    return null;
  }

  const validBlock = parsed.data;

  switch (validBlock.type) {
    case 'paragraph':
      return <p className="editorial-paragraph">{validBlock.text}</p>;

    case 'fact_reveal':
      return <FactRevealCard block={validBlock} />;

    case 'quiz':
      return <QuizCard block={validBlock} />;

    case 'timeline':
      return <TimelineCard block={validBlock} />;

    case 'comparison':
      return <ComparisonCard block={validBlock} />;

    case 'rabbit_hole':
      return (
        <RabbitHoleCard
          block={validBlock}
          onStartRabbitHole={handlers?.onStartRabbitHole}
        />
      );

    case 'key_takeaway':
      return (
        <section
          className="timeline-card"
          style={{ background: 'var(--accent-ochre-soft)', borderColor: 'transparent' }}
          aria-label={validBlock.heading ?? 'Key takeaways'}
        >
          <div className="row-wrap" style={{ gap: 7, color: 'var(--accent-ochre)' }}>
            <Lightbulb size={15} aria-hidden="true" />
            <span className="curio-eyebrow" style={{ color: 'var(--accent-ochre)' }}>
              {validBlock.heading ?? 'Key Takeaways'}
            </span>
          </div>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
            {validBlock.points.map((point, idx) => (
              <li key={idx} style={{ fontSize: '0.95rem' }}>
                {point}
              </li>
            ))}
          </ul>
        </section>
      );

    default:
      return null;
  }
}
