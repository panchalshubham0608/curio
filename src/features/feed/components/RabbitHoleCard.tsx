import { Compass, ArrowRight } from 'lucide-react';
import type {
  ContentCategory,
  RabbitHoleBlock,
} from '../../../shared/validation/contentSchemas';
import './RabbitHoleCard.css';

interface RabbitHoleCardProps {
  block: RabbitHoleBlock;
  onStartRabbitHole?: (topic: string, category: ContentCategory) => void;
}

export function RabbitHoleCard({ block, onStartRabbitHole }: RabbitHoleCardProps) {
  return (
    <aside className="rabbit-hole-card" aria-label="Related curiosity detour">
      <div className="stack-xs" style={{ flex: '1 1 240px' }}>
        <div className="row-wrap" style={{ gap: 6, color: 'var(--accent-sage)' }}>
          <Compass size={15} aria-hidden="true" />
          <span className="curio-eyebrow" style={{ color: 'var(--accent-sage)' }}>
            Curiosity Detour
          </span>
        </div>
        <h4 style={{ fontSize: '1.02rem' }}>{block.prompt}</h4>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          {block.description}
        </p>
      </div>

      {onStartRabbitHole && (
        <button
          type="button"
          className="curio-btn curio-btn--primary curio-btn--sm"
          onClick={() => onStartRabbitHole(block.topic, block.category)}
        >
          Explore topic
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      )}
    </aside>
  );
}
