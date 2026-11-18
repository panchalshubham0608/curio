import { useState, type FormEvent } from 'react';
import { ArrowRight, BookmarkCheck, Compass, Home, Sparkles } from 'lucide-react';
import type { SessionSummaryStats } from '../../../domain/feed/Feed';
import {
  CATEGORY_METADATA,
  type ContentCategory,
} from '../../../shared/validation/contentSchemas';
import './ComparisonCard.css';
import './RabbitHoleCard.css';

interface SessionCompletionViewProps {
  summary: SessionSummaryStats;
  initialReflection?: string;
  onSaveReflection: (note: string) => Promise<void>;
  onGoHome: () => void;
  onGoLibrary: () => void;
  onStartNextTopic?: (topic: string, category: ContentCategory) => void;
  onStartFreshSession: () => void;
}

/**
 * Warm, upbeat "All caught up" end-of-deck screen with optional note and fresh-mix launch.
 */
export function SessionCompletionView({
  summary,
  initialReflection = '',
  onSaveReflection,
  onGoHome,
  onGoLibrary,
  onStartNextTopic,
  onStartFreshSession,
}: SessionCompletionViewProps) {
  const [reflection, setReflection] = useState(initialReflection);
  const [savedReflection, setSavedReflection] = useState(Boolean(initialReflection));

  const handleReflectionSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reflection.trim()) return;
    await onSaveReflection(reflection.trim());
    setSavedReflection(true);
  };

  return (
    <section
      className="curio-card curio-card--padded stack-lg fade-in-card"
      aria-label="Deck complete"
    >
      <div className="stack-sm">
        <div className="row-wrap" style={{ gap: 8, color: 'var(--accent-sage)' }}>
          <Sparkles size={20} aria-hidden="true" />
          <span className="curio-eyebrow" style={{ color: 'var(--accent-sage)' }}>
            All Caught Up
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.65rem, 3.8vw, 2.25rem)' }}>
          You’ve explored this whole mix.
        </h1>
        <p className="text-secondary">
          Spin up a fresh batch whenever curiosity strikes, or revisit anything you saved.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
        }}
      >
        <div className="comparison-col stack-xs">
          <span className="curio-eyebrow">Explored</span>
          <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem' }}>
            {summary.completedCount} / {summary.totalItems}
          </strong>
        </div>
        <div className="comparison-col stack-xs">
          <span className="curio-eyebrow">Saved</span>
          <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem' }}>
            {summary.savedCount}
          </strong>
        </div>
        <div className="comparison-col stack-xs">
          <span className="curio-eyebrow">Themes</span>
          <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem' }}>
            {summary.categoriesExplored.length}
          </strong>
        </div>
      </div>

      <div className="stack-xs">
        <span className="curio-eyebrow">Themes Covered</span>
        <div className="row-wrap">
          {summary.categoriesExplored.map((cat) => (
            <span key={cat} className="curio-chip">
              {CATEGORY_METADATA[cat].shortLabel}
            </span>
          ))}
        </div>
      </div>

      {summary.keyTakeaways.length > 0 && (
        <div className="stack-xs">
          <span className="curio-eyebrow">Highlights</span>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            {summary.keyTakeaways.map((point, idx) => (
              <li key={idx} className="text-secondary" style={{ fontSize: '0.95rem' }}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={(e) => void handleReflectionSubmit(e)}
        className="timeline-card stack-sm"
      >
        <label htmlFor="curio-reflection" style={{ fontWeight: 600 }}>
          Quick note (optional): Favorite discovery from this mix?
        </label>
        <textarea
          id="curio-reflection"
          className="curio-textarea"
          rows={2}
          maxLength={500}
          placeholder="Jot down one idea you want to remember…"
          value={reflection}
          onChange={(e) => {
            setReflection(e.target.value);
            setSavedReflection(false);
          }}
        />
        <div className="row-between">
          <span className="mono-meta">
            {savedReflection ? 'Note saved.' : 'Kept privately with your history.'}
          </span>
          <button
            type="submit"
            className="curio-btn curio-btn--secondary curio-btn--sm"
            disabled={!reflection.trim() || savedReflection}
          >
            {savedReflection ? 'Saved' : 'Save note'}
          </button>
        </div>
      </form>

      {summary.suggestedNextTopic && onStartNextTopic && (
        <div className="rabbit-hole-card">
          <div className="stack-xs" style={{ flex: '1 1 220px' }}>
            <span className="curio-eyebrow" style={{ color: 'var(--accent-sage)' }}>
              Up Next
            </span>
            <strong style={{ fontSize: '1rem' }}>{summary.suggestedNextTopic.prompt}</strong>
          </div>
          <button
            type="button"
            className="curio-btn curio-btn--primary curio-btn--sm"
            onClick={() =>
              onStartNextTopic(
                summary.suggestedNextTopic!.topic,
                summary.suggestedNextTopic!.category
              )
            }
          >
            <Compass size={15} />
            Explore topic
          </button>
        </div>
      )}

      <div className="row-wrap" style={{ gap: 10 }}>
        <button type="button" className="curio-btn curio-btn--accent" onClick={onStartFreshSession}>
          Spin up a fresh mix
          <ArrowRight size={15} />
        </button>
        <button type="button" className="curio-btn curio-btn--primary" onClick={onGoHome}>
          <Home size={16} />
          Back to Home
        </button>
        <button type="button" className="curio-btn curio-btn--secondary" onClick={onGoLibrary}>
          <BookmarkCheck size={16} />
          Saved Library
        </button>
      </div>
    </section>
  );
}
