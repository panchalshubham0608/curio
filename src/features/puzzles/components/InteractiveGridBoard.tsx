import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { GridPuzzle } from '../../../shared/validation/puzzleSchemas';

interface InteractiveGridBoardProps {
  grid: GridPuzzle;
  answered: boolean;
  onComplete: (isCorrect: boolean) => void;
}

/**
 * Playable first-party React grid engine executing AI-generated declarative
 * grid specs (`lights_out`, `target_sum`, `select_cells`) with zero `eval`.
 */
export function InteractiveGridBoard({
  grid,
  answered,
  onComplete,
}: InteractiveGridBoardProps) {
  const initialStates = grid.cells.map((cell) => Boolean(cell.initialOn));
  const [activeStates, setActiveStates] = useState<boolean[]>(initialStates);
  const [moves, setMoves] = useState(0);

  const selectedIndices = activeStates
    .map((on, idx) => (on ? idx : -1))
    .filter((idx) => idx >= 0);

  const currentSum = selectedIndices.reduce(
    (sum, idx) => sum + (grid.cells[idx]?.value ?? 0),
    0
  );

  const handleCellTap = (index: number) => {
    if (answered) return;

    let nextStates: boolean[];
    if (grid.mode === 'lights_out') {
      nextStates = [...activeStates];
      const row = Math.floor(index / grid.cols);
      const col = index % grid.cols;
      const neighbors = [
        [row, col],
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      for (const [r, c] of neighbors) {
        if (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols) {
          const targetIdx = r * grid.cols + c;
          nextStates[targetIdx] = !nextStates[targetIdx];
        }
      }
    } else {
      nextStates = activeStates.map((on, idx) => (idx === index ? !on : on));
    }

    setActiveStates(nextStates);
    setMoves((m) => m + 1);

    // Auto-complete lights_out immediately when the goal state is reached
    if (grid.mode === 'lights_out') {
      const won =
        grid.goalState === 'all_off'
          ? nextStates.every((on) => !on)
          : nextStates.every((on) => on);
      if (won) {
        onComplete(true);
      }
    }
  };

  const handleCheckBoard = () => {
    if (answered) return;

    if (grid.mode === 'target_sum') {
      const matchesSum = currentSum === grid.targetSum;
      const matchesCount =
        typeof grid.exactCount === 'number'
          ? selectedIndices.length === grid.exactCount
          : selectedIndices.length > 0;
      onComplete(matchesSum && matchesCount);
      return;
    }

    if (grid.mode === 'select_cells') {
      const expected = [...(grid.solutionIndices ?? [])].sort((a, b) => a - b);
      const actual = [...selectedIndices].sort((a, b) => a - b);
      const isCorrect =
        expected.length === actual.length &&
        expected.every((val, i) => actual[i] === val);
      onComplete(isCorrect);
    }
  };

  const handleReset = () => {
    if (answered) return;
    setActiveStates(initialStates);
    setMoves(0);
  };

  return (
    <div className="stack-sm">
      <div className="puzzle-grid-hud">
        <span className="puzzle-grid-instruction">{grid.instruction}</span>
        <div className="row-wrap" style={{ gap: 8 }}>
          {grid.mode === 'target_sum' && (
            <span className="curio-chip">
              Sum: {currentSum} / {grid.targetSum}
            </span>
          )}
          {grid.mode === 'lights_out' && <span className="mono-meta">Moves: {moves}</span>}
          {!answered && (
            <button
              type="button"
              className="curio-btn curio-btn--ghost curio-btn--sm"
              onClick={handleReset}
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      <div
        className="puzzle-interactive-grid"
        role="group"
        aria-label="Interactive puzzle grid"
        style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}
      >
        {grid.cells.map((cell, idx) => {
          const isOn = activeStates[idx];
          const isSolutionCell = grid.solutionIndices?.includes(idx) ?? false;
          let extraClass = '';
          if (answered && grid.mode === 'select_cells' && isSolutionCell) {
            extraClass = 'puzzle-grid-cell--solution';
          }

          return (
            <button
              key={`grid-cell-${idx}`}
              type="button"
              disabled={answered}
              aria-pressed={isOn}
              className={`puzzle-grid-cell ${isOn ? 'puzzle-grid-cell--on' : ''} ${extraClass}`}
              onClick={() => handleCellTap(idx)}
            >
              {cell.label}
            </button>
          );
        })}
      </div>

      {!answered && grid.mode !== 'lights_out' && (
        <div className="row-between" style={{ paddingTop: 2 }}>
          <span className="mono-meta">
            {selectedIndices.length} cell{selectedIndices.length === 1 ? '' : 's'} selected
            {typeof grid.exactCount === 'number' ? ` (pick ${grid.exactCount})` : ''}
          </span>
          <button
            type="button"
            className="curio-btn curio-btn--primary curio-btn--sm"
            disabled={
              selectedIndices.length === 0 ||
              (typeof grid.exactCount === 'number' && selectedIndices.length !== grid.exactCount)
            }
            onClick={handleCheckBoard}
          >
            Check board
          </button>
        </div>
      )}
    </div>
  );
}
