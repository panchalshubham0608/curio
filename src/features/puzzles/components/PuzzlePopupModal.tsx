import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { CATEGORY_METADATA } from '../../../shared/validation/contentSchemas';
import {
  PUZZLE_KIND_METADATA,
  type Puzzle,
} from '../../../shared/validation/puzzleSchemas';
import { ModalDialog } from '../../feed/components/ModalDialog';
import './PuzzlePopupModal.css';

interface PuzzlePopupModalProps {
  puzzle: Puzzle | null;
  onClose: () => void;
  onSolved: (puzzleId: string) => void;
  onNextPuzzle: () => void;
  loadingNext?: boolean;
}

/**
 * Interactive puzzle popup dialog (mobile slide-up sheet / desktop centered modal).
 * Keyed by `puzzle.id` from the caller or reset internally when the puzzle switches.
 */
export function PuzzlePopupModal({
  puzzle,
  onClose,
  onSolved,
  onNextPuzzle,
  loadingNext = false,
}: PuzzlePopupModalProps) {
  if (!puzzle) return null;

  return (
    <PuzzlePopupBody
      key={puzzle.id}
      puzzle={puzzle}
      onClose={onClose}
      onSolved={onSolved}
      onNextPuzzle={onNextPuzzle}
      loadingNext={loadingNext}
    />
  );
}

interface PuzzlePopupBodyProps {
  puzzle: Puzzle;
  onClose: () => void;
  onSolved: (puzzleId: string) => void;
  onNextPuzzle: () => void;
  loadingNext: boolean;
}

function PuzzlePopupBody({
  puzzle,
  onClose,
  onSolved,
  onNextPuzzle,
  loadingNext,
}: PuzzlePopupBodyProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const kindMeta = PUZZLE_KIND_METADATA[puzzle.kind];
  const categoryMeta = CATEGORY_METADATA[puzzle.category];
  const answered = selectedIndex !== null;
  const isCorrect = selectedIndex === puzzle.correctIndex;

  const handleSelectOption = (index: number) => {
    if (answered) return;
    setSelectedIndex(index);
    if (index === puzzle.correctIndex) {
      onSolved(puzzle.id);
    }
  };

  const optionsLayoutClass =
    puzzle.kind === 'odd_one_out' || puzzle.kind === 'true_or_myth'
      ? 'puzzle-options-grid'
      : 'puzzle-options-list';

  return (
    <ModalDialog open title={puzzle.title} maxWidth={540} onClose={onClose}>
      <div className="stack-md">
        {/* Top Metadata Pills */}
        <div className="row-wrap" style={{ gap: 8 }}>
          <span
            className="curio-chip"
            style={{
              background: kindMeta.softVar,
              borderColor: `color-mix(in srgb, ${kindMeta.accentVar} 34%, transparent)`,
              color: kindMeta.accentVar,
              fontWeight: 600,
            }}
          >
            {kindMeta.label}
          </span>
          <span className="curio-chip">{puzzle.difficulty}</span>
          <span className="mono-meta" style={{ marginLeft: 'auto' }}>
            {categoryMeta.shortLabel}
          </span>
        </div>

        {/* Prompt */}
        <p className="puzzle-popup-prompt">{puzzle.prompt}</p>

        {/* Pattern Sequence Tiles */}
        {puzzle.sequenceItems && puzzle.sequenceItems.length > 0 && (
          <div className="puzzle-sequence-strip" aria-label="Pattern sequence">
            {puzzle.sequenceItems.map((token, idx) => {
              const isBlank = token === '?';
              return (
                <span
                  key={`${puzzle.id}-seq-${idx}`}
                  className={`puzzle-sequence-tile ${
                    isBlank ? 'puzzle-sequence-tile--blank' : ''
                  }`}
                >
                  {isBlank && answered ? puzzle.options[puzzle.correctIndex] : token}
                </span>
              );
            })}
          </div>
        )}

        {/* Optional Hint Reveal */}
        {puzzle.hint && !answered && (
          <div>
            {showHint ? (
              <div className="puzzle-hint-box fade-in-card" role="note">
                <Lightbulb size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{puzzle.hint}</span>
              </div>
            ) : (
              <button
                type="button"
                className="puzzle-hint-trigger"
                onClick={() => setShowHint(true)}
              >
                <Lightbulb size={14} aria-hidden="true" />
                <span>Need a hint?</span>
              </button>
            )}
          </div>
        )}

        {/* Interactive Options */}
        <div className={optionsLayoutClass} role="radiogroup" aria-label={puzzle.title}>
          {puzzle.options.map((option, index) => {
            const isChoice = selectedIndex === index;
            const isAnswer = index === puzzle.correctIndex;
            let stateClass = '';
            if (answered && isAnswer) stateClass = 'puzzle-option--correct';
            else if (answered && isChoice && !isAnswer) stateClass = 'puzzle-option--wrong';

            return (
              <button
                key={`${puzzle.id}-opt-${index}`}
                type="button"
                role="radio"
                aria-checked={isChoice}
                disabled={answered}
                className={`puzzle-option ${stateClass}`}
                onClick={() => handleSelectOption(index)}
              >
                <span>{option}</span>
                {answered && isAnswer && (
                  <CheckCircle2 size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
                )}
                {answered && isChoice && !isAnswer && (
                  <XCircle size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Result & Explanation */}
        {answered && (
          <div
            className={`puzzle-result-box fade-in-card ${
              isCorrect ? 'puzzle-result-box--correct' : 'puzzle-result-box--try'
            }`}
            role="status"
          >
            <div className="row-wrap" style={{ gap: 7 }}>
              <Sparkles size={15} aria-hidden="true" />
              <strong>{isCorrect ? 'Spot on!' : 'Good try — here’s the twist'}</strong>
            </div>
            <p>{puzzle.explanation}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="row-between" style={{ paddingTop: 4 }}>
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="curio-btn curio-btn--accent"
            disabled={loadingNext}
            onClick={onNextPuzzle}
          >
            <span>{loadingNext ? 'Loading…' : answered ? 'Next puzzle' : 'Try another'}</span>
            <ArrowRight size={15} className="btn-arrow" aria-hidden="true" />
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
