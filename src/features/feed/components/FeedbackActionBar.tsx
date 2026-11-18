import {
  Bookmark,
  BookmarkCheck,
  Heart,
  SkipForward,
  Sparkles,
  ThumbsDown,
} from 'lucide-react';
import './FeedbackActionBar.css';

interface FeedbackActionBarProps {
  isSaved: boolean;
  isLiked: boolean;
  isNotInterested: boolean;
  askOpen: boolean;
  showAskButton?: boolean;
  onToggleSave: () => void;
  onLike: () => void;
  onNotInterested: () => void;
  onSkip: () => void;
  onToggleAsk: () => void;
}

export function FeedbackActionBar({
  isSaved,
  isLiked,
  isNotInterested,
  askOpen,
  showAskButton = false,
  onToggleSave,
  onLike,
  onNotInterested,
  onSkip,
  onToggleAsk,
}: FeedbackActionBarProps) {
  return (
    <div className="feedback-bar" role="toolbar" aria-label="Item actions">
      <div className="feedback-group">
        <button
          type="button"
          className={`curio-btn curio-btn--sm ${
            isSaved ? 'curio-btn--primary' : 'curio-btn--secondary'
          }`}
          aria-pressed={isSaved}
          onClick={onToggleSave}
        >
          {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          {isSaved ? 'Saved' : 'Save'}
        </button>

        <button
          type="button"
          className={`curio-btn curio-btn--sm ${
            isLiked ? 'curio-btn--accent' : 'curio-btn--secondary'
          }`}
          aria-pressed={isLiked}
          onClick={onLike}
        >
          <Heart size={15} />
          {isLiked ? 'Liked' : 'Like'}
        </button>

        <button
          type="button"
          className="curio-btn curio-btn--ghost curio-btn--sm"
          aria-pressed={isNotInterested}
          onClick={onNotInterested}
          title="Show fewer items like this"
        >
          <ThumbsDown size={15} />
          {isNotInterested ? 'Noted' : 'Less like this'}
        </button>

        <button
          type="button"
          className="curio-btn curio-btn--ghost curio-btn--sm"
          onClick={onSkip}
        >
          <SkipForward size={15} />
          Skip
        </button>
      </div>

      {showAskButton && (
        <button
          type="button"
          className={`curio-btn curio-btn--sm ${
            askOpen ? 'curio-btn--primary' : 'curio-btn--indigo'
          }`}
          aria-expanded={askOpen}
          onClick={onToggleAsk}
        >
          <Sparkles size={15} />
          Ask Curio
        </button>
      )}
    </div>
  );
}
