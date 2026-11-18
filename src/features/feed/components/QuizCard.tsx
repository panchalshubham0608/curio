import { useState } from 'react';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import type { QuizBlock } from '../../../shared/validation/contentSchemas';

interface QuizCardProps {
  block: QuizBlock;
}

export function QuizCard({ block }: QuizCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const answered = selectedIndex !== null;
  const isCorrect = selectedIndex === block.correctOptionIndex;

  return (
    <section className="quiz-card" aria-label="Quick knowledge check">
      <div className="row-wrap" style={{ gap: 7, marginBottom: 8 }}>
        <HelpCircle size={16} style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
        <span className="curio-eyebrow">Quick Check</span>
      </div>

      <h3 style={{ fontSize: '1.1rem', lineHeight: 1.35 }}>{block.question}</h3>

      <div className="quiz-options" role="radiogroup" aria-label={block.question}>
        {block.options.map((option, idx) => {
          let className = 'quiz-option';
          if (answered) {
            if (idx === block.correctOptionIndex) {
              className += ' quiz-option--correct';
            } else if (idx === selectedIndex) {
              className += ' quiz-option--wrong';
            }
          }

          return (
            <button
              key={`${idx}-${option}`}
              type="button"
              role="radio"
              aria-checked={selectedIndex === idx}
              disabled={answered}
              className={className}
              onClick={() => setSelectedIndex(idx)}
            >
              <span>{option}</span>
              {answered && idx === block.correctOptionIndex && (
                <CheckCircle2 size={18} aria-hidden="true" />
              )}
              {answered && idx === selectedIndex && idx !== block.correctOptionIndex && (
                <XCircle size={18} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className="fade-in-card"
          role="status"
          style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            background: isCorrect ? 'var(--accent-sage-soft)' : 'var(--bg-subtle)',
            fontSize: '0.92rem',
          }}
        >
          <strong style={{ color: isCorrect ? 'var(--accent-sage)' : 'var(--ink-primary)' }}>
            {isCorrect ? 'Spot on. ' : 'Good guess — here is why: '}
          </strong>
          <span>{block.explanation}</span>
        </div>
      )}
    </section>
  );
}
