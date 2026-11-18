import { useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

interface OrderSequenceBoardProps {
  items: readonly string[];
  correctOrder: readonly number[];
  answered: boolean;
  onComplete: (isCorrect: boolean) => void;
}

/**
 * Interactive tap-to-order board for sequence and chronological ranking puzzles.
 */
export function OrderSequenceBoard({
  items,
  correctOrder,
  answered,
  onComplete,
}: OrderSequenceBoardProps) {
  const [pickedOrder, setPickedOrder] = useState<number[]>([]);

  const handleToggleItem = (itemIndex: number) => {
    if (answered) return;
    setPickedOrder((prev) => {
      if (prev.includes(itemIndex)) {
        return prev.filter((idx) => idx !== itemIndex);
      }
      return [...prev, itemIndex];
    });
  };

  const handleSubmitOrder = () => {
    if (answered || pickedOrder.length !== items.length) return;
    const isCorrect = pickedOrder.every((itemIdx, pos) => correctOrder[pos] === itemIdx);
    onComplete(isCorrect);
  };

  return (
    <div className="stack-sm">
      <div className="row-between">
        <span className="mono-meta">Tap items from 1st to {items.length}th</span>
        {!answered && pickedOrder.length > 0 && (
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            onClick={() => setPickedOrder([])}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="puzzle-order-list" role="group" aria-label="Items to order">
        {items.map((label, idx) => {
          const pickedPos = pickedOrder.indexOf(idx);
          const correctPos = correctOrder.indexOf(idx);
          const isPicked = pickedPos !== -1;

          let stateClass = '';
          if (answered) {
            stateClass =
              pickedPos === correctPos ? 'puzzle-option--correct' : 'puzzle-option--wrong';
          } else if (isPicked) {
            stateClass = 'puzzle-order-item--selected';
          }

          return (
            <button
              key={`order-item-${idx}`}
              type="button"
              disabled={answered}
              aria-pressed={isPicked}
              className={`puzzle-option puzzle-order-item ${stateClass}`}
              onClick={() => handleToggleItem(idx)}
            >
              <span className="puzzle-order-main">
                <span className="puzzle-order-badge" aria-hidden="true">
                  {answered ? correctPos + 1 : isPicked ? pickedPos + 1 : '·'}
                </span>
                <span>{label}</span>
              </span>

              {answered && pickedPos === correctPos && (
                <CheckCircle2 size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
              )}
              {answered && pickedPos !== correctPos && (
                <XCircle size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="row-between" style={{ paddingTop: 2 }}>
          <span className="mono-meta">
            {pickedOrder.length} of {items.length} placed
          </span>
          <button
            type="button"
            className="curio-btn curio-btn--primary curio-btn--sm"
            disabled={pickedOrder.length !== items.length}
            onClick={handleSubmitOrder}
          >
            Check order
          </button>
        </div>
      )}
    </div>
  );
}
