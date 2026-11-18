import './ProgressIndicator.css';

interface ProgressIndicatorProps {
  currentIndex: number;
  totalItems: number;
  completedIds: ReadonlySet<string>;
  itemIds: string[];
  sessionLabel?: string;
}

/**
 * Clean story-style segmented progress indicator without countdown timers.
 */
export function ProgressIndicator({
  currentIndex,
  totalItems,
  completedIds,
  itemIds,
  sessionLabel,
}: ProgressIndicatorProps) {
  return (
    <div aria-label="Deck progress">
      <div className="row-between">
        <span className="curio-eyebrow">
          {sessionLabel ? `${sessionLabel} · ` : ''}
          Card {Math.min(currentIndex + 1, totalItems)} of {totalItems}
        </span>
      </div>
      <div
        className="session-progress-track"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, totalItems)}, 1fr)` }}
        role="progressbar"
        aria-valuenow={Math.min(currentIndex + 1, totalItems)}
        aria-valuemin={1}
        aria-valuemax={Math.max(1, totalItems)}
      >
        {itemIds.map((id, idx) => {
          let modifier = '';
          if (idx === currentIndex) {
            modifier = 'session-progress-segment--active';
          } else if (completedIds.has(id) || idx < currentIndex) {
            modifier = 'session-progress-segment--done';
          }
          return <div key={id} className={`session-progress-segment ${modifier}`} />;
        })}
      </div>
    </div>
  );
}
