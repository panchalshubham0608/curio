import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { FactRevealBlock } from '../../../shared/validation/contentSchemas';
import './FactRevealCard.css';

interface FactRevealCardProps {
  block: FactRevealBlock;
}

export function FactRevealCard({ block }: FactRevealCardProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className={`fact-reveal-card ${revealed ? 'fact-reveal-card--open' : ''}`}
    >
      <button
        type="button"
        className="fact-reveal-trigger"
        aria-expanded={revealed}
        onClick={() => setRevealed((prev) => !prev)}
      >
        <span className="fact-reveal-header">
          <span className="fact-reveal-icon" aria-hidden="true">
            <Sparkles size={15} />
          </span>

          <span className="fact-reveal-heading">
            <span className="fact-reveal-label">{block.label}</span>
            {!revealed && (
              <span className="fact-reveal-hint">Tap to reveal</span>
            )}
          </span>
        </span>

        {!revealed && (
          <span className="fact-reveal-teaser" aria-hidden="true">
            <span className="fact-reveal-bar fact-reveal-bar--long" />
            <span className="fact-reveal-bar fact-reveal-bar--short" />
          </span>
        )}
      </button>

      {revealed && <p className="fact-reveal-body">{block.text}</p>}
    </div>
  );
}
