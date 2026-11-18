import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  PUZZLE_KIND_METADATA,
  type Puzzle,
} from '../../../shared/validation/puzzleSchemas';
import { ModalDialog } from '../../feed/components/ModalDialog';
import { InteractiveGridBoard } from './InteractiveGridBoard';
import { OrderSequenceBoard } from './OrderSequenceBoard';
import { SanitizedSvgDiagram } from './SanitizedSvgDiagram';
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
 * Supports choice teasers, deductive reasoning clues, fact checks, tap-to-order sequences,
 * sanitized declarative SVG diagrams, and playable interactive grid boards.
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
  const [boardResult, setBoardResult] = useState<'correct' | 'wrong' | null>(null);
  const [checkedClues, setCheckedClues] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);

  const kindMeta = PUZZLE_KIND_METADATA[puzzle.kind];
  const isInteractiveBoard =
    puzzle.kind === 'order_sequence' || puzzle.kind === 'interactive_grid';
  const answered = isInteractiveBoard ? boardResult !== null : selectedIndex !== null;
  const isCorrect = isInteractiveBoard
    ? boardResult === 'correct'
    : selectedIndex === puzzle.correctIndex;

  const handleSelectOption = (index: number) => {
    if (answered) return;
    setSelectedIndex(index);
    if (index === puzzle.correctIndex) {
      onSolved(puzzle.id);
    }
  };

  const handleBoardComplete = (solved: boolean) => {
    if (answered) return;
    setBoardResult(solved ? 'correct' : 'wrong');
    if (solved) {
      onSolved(puzzle.id);
    }
  };

  const toggleClueChecked = (idx: number) => {
    setCheckedClues((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const optionsLayoutClass =
    puzzle.kind === 'odd_one_out' || puzzle.kind === 'true_or_myth'
      ? 'puzzle-options-grid'
      : 'puzzle-options-list';

  return (
    <ModalDialog open title={puzzle.title} maxWidth={560} onClose={onClose}>
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
        </div>

        {/* Prompt */}
        <p className="puzzle-popup-prompt">{puzzle.prompt}</p>

        {/* Deductive Reasoning Clues (tappable to check off while reasoning) */}
        {puzzle.clues && puzzle.clues.length > 0 && (
          <div className="puzzle-clues-list" role="group" aria-label="Reasoning clues">
            {puzzle.clues.map((clue, idx) => {
              const checked = checkedClues.has(idx);
              return (
                <button
                  key={`${puzzle.id}-clue-${idx}`}
                  type="button"
                  aria-pressed={checked}
                  className={`puzzle-clue-card ${checked ? 'puzzle-clue-card--checked' : ''}`}
                  onClick={() => toggleClueChecked(idx)}
                >
                  <span className="puzzle-clue-num" aria-hidden="true">
                    {idx + 1}
                  </span>
                  <span className="puzzle-clue-text">{clue}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sanitized Declarative SVG Visual Diagram */}
        {puzzle.svgDiagram && (
          <SanitizedSvgDiagram diagram={puzzle.svgDiagram} title={puzzle.title} />
        )}

        {/* Pattern Sequence Tiles */}
        {puzzle.sequenceItems && puzzle.sequenceItems.length > 0 && (
          <div className="puzzle-sequence-strip" aria-label="Pattern sequence">
            {puzzle.sequenceItems.map((token, idx) => {
              const isBlank = token === '?';
              const revealedToken =
                typeof puzzle.correctIndex === 'number'
                  ? puzzle.options?.[puzzle.correctIndex] ?? token
                  : token;
              return (
                <span
                  key={`${puzzle.id}-seq-${idx}`}
                  className={`puzzle-sequence-tile ${
                    isBlank ? 'puzzle-sequence-tile--blank' : ''
                  }`}
                >
                  {isBlank && answered ? revealedToken : token}
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

        {/* Interactive Board Mechanics OR Choice Options */}
        {puzzle.kind === 'order_sequence' && puzzle.orderItems && puzzle.correctOrder ? (
          <OrderSequenceBoard
            items={puzzle.orderItems}
            correctOrder={puzzle.correctOrder}
            answered={answered}
            onComplete={handleBoardComplete}
          />
        ) : puzzle.kind === 'interactive_grid' && puzzle.gridPuzzle ? (
          <InteractiveGridBoard
            grid={puzzle.gridPuzzle}
            answered={answered}
            onComplete={handleBoardComplete}
          />
        ) : puzzle.options && puzzle.options.length > 0 ? (
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
        ) : null}

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
