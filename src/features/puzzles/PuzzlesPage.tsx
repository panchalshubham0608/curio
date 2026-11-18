import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Dices,
  Eye,
  Grid3x3,
  HelpCircle,
  ListOrdered,
  Puzzle as PuzzleIcon,
  Shapes,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import {
  PUZZLE_KIND_METADATA,
  type Puzzle,
  type PuzzleKind,
} from '../../shared/validation/puzzleSchemas';
import { PuzzlePopupModal } from './components/PuzzlePopupModal';
import './PuzzlesPage.css';

const KIND_ICONS: Record<PuzzleKind, typeof PuzzleIcon> = {
  odd_one_out: Shapes,
  lateral_riddle: HelpCircle,
  pattern_sequence: Sparkles,
  true_or_myth: ShieldCheck,
  logic_reasoning: Brain,
  order_sequence: ListOrdered,
  visual_diagram: Eye,
  interactive_grid: Grid3x3,
};

export function PuzzlesPage() {
  const { userId, services } = useCurioApp();

  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);

  const loadPuzzles = useCallback(async () => {
    setLoading(true);
    try {
      const [allPuzzles, solved] = await Promise.all([
        services.puzzleProvider.listPuzzles(),
        services.puzzleProvider.getSolvedIds(userId),
      ]);
      setPuzzles(allPuzzles);
      setSolvedIds(solved);
    } finally {
      setLoading(false);
    }
  }, [services, userId]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      setLoading(true);
      try {
        const [allPuzzles, solved] = await Promise.all([
          services.puzzleProvider.listPuzzles(),
          services.puzzleProvider.getSolvedIds(userId),
        ]);
        if (!active) return;
        setPuzzles(allPuzzles);
        setSolvedIds(solved);
      } finally {
        if (active) setLoading(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [services, userId]);

  const { unsolvedPuzzles, solvedPuzzles } = useMemo(() => {
    const unsolved: Puzzle[] = [];
    const solved: Puzzle[] = [];
    for (const puzzle of puzzles) {
      if (solvedIds.has(puzzle.id)) {
        solved.push(puzzle);
      } else {
        unsolved.push(puzzle);
      }
    }
    return { unsolvedPuzzles: unsolved, solvedPuzzles: solved };
  }, [puzzles, solvedIds]);

  const handleMarkSolved = useCallback(
    (puzzleId: string) => {
      setSolvedIds((prev) => new Set(prev).add(puzzleId));
      void services.puzzleProvider.markSolved(userId, puzzleId).then((updated) => {
        setSolvedIds(updated);
      });
    },
    [services, userId]
  );

  const handleOpenRandomPuzzle = async () => {
    setLoadingNext(true);
    try {
      const exclude = Array.from(solvedIds);
      if (activePuzzle) exclude.push(activePuzzle.id);
      const next = await services.puzzleProvider.generateNextPuzzle({
        excludeIds: exclude,
      });
      if (next) {
        setActivePuzzle(next);
      }
    } finally {
      setLoadingNext(false);
    }
  };

  const totalCount = puzzles.length;
  const solvedCount = solvedPuzzles.length;
  const unsolvedCount = unsolvedPuzzles.length;
  const solvedPct = totalCount > 0 ? Math.min(100, Math.round((solvedCount / totalCount) * 100)) : 0;
  const allSolved = totalCount > 0 && unsolvedCount === 0;
  const isEmpty = !loading && totalCount === 0;

  const renderPuzzleCard = (puzzle: Puzzle, idx: number, isSolved: boolean) => {
    const kindMeta = PUZZLE_KIND_METADATA[puzzle.kind];
    const Icon = KIND_ICONS[puzzle.kind];

    return (
      <button
        key={puzzle.id}
        type="button"
        className={`curio-card puzzle-tile puzzle-tile--${puzzle.kind} ${
          isSolved ? 'puzzle-tile--solved' : ''
        }`}
        style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
        onClick={() => setActivePuzzle(puzzle)}
      >
        <div className="row-between" style={{ width: '100%', gap: 8 }}>
          <span
            className="puzzle-kind-badge"
            style={{
              background: kindMeta.softVar,
              color: kindMeta.accentVar,
            }}
          >
            <Icon size={13} aria-hidden="true" />
            <span>{kindMeta.label}</span>
          </span>

          {isSolved ? (
            <span className="puzzle-solved-tag">
              <CheckCircle2 size={14} aria-hidden="true" />
              <span>Solved</span>
            </span>
          ) : (
            <span className="puzzle-difficulty-pill">{puzzle.difficulty}</span>
          )}
        </div>

        <div className="stack-xs" style={{ gap: 6, textAlign: 'left', width: '100%' }}>
          <h2 className="puzzle-tile-title">{puzzle.title}</h2>
          <p className="puzzle-tile-prompt">{puzzle.prompt}</p>
        </div>

        <div className="puzzle-tile-footer">
          <span className="puzzle-tile-teaser">{kindMeta.teaserPrompt}</span>
          <span className="puzzle-tile-cta" style={{ color: kindMeta.accentVar }}>
            <span>{isSolved ? 'Play again' : 'Solve'}</span>
            <ArrowRight size={14} className="puzzle-tile-arrow" aria-hidden="true" />
          </span>
        </div>
      </button>
    );
  };

  return (
    <main className="curio-main stack-lg">
      {/* Slim Editorial Top Bar */}
      <header className="puzzles-topbar">
        <h1 className="puzzles-topbar-title">Puzzles</h1>

        <span
          className={`puzzles-score-pill ${allSolved ? 'puzzles-score-pill--done' : ''}`}
          aria-live="polite"
        >
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>
            {solvedCount} of {totalCount} solved
          </span>
        </span>
      </header>

      {/* Atmospheric Spotlight Hero with Fancy Surprise Me Launcher */}
      <section className="puzzles-hero-card fade-in-card" aria-label="Quick puzzle launcher">
        <div className="puzzles-hero-copy">
          <h2 className="puzzles-hero-headline">
            {isEmpty
              ? 'Fresh puzzles are on the way'
              : allSolved
                ? 'Every teaser solved!'
                : 'Ready for a quick brain teaser?'}
          </h2>
          <p className="puzzles-hero-sub">
            {isEmpty
              ? 'AI-crafted reasoning mysteries, fact checks, visual logic, and interactive boards appear here as new batches publish.'
              : allSolved
                ? 'You cracked the entire set. Roll a favorite again or revisit any card below.'
                : 'Patterns, riddles, and clever twists — pick any card below or roll a surprise.'}
          </p>
          <div className="puzzles-hero-progress" aria-hidden="true">
            <div className="puzzles-hero-progress-fill" style={{ width: `${solvedPct}%` }} />
          </div>
        </div>

        <button
          type="button"
          className={`surprise-btn ${loadingNext ? 'surprise-btn--rolling' : ''}`}
          disabled={loading || totalCount === 0 || loadingNext}
          onClick={() => void handleOpenRandomPuzzle()}
        >
          <span className="surprise-btn-sheen" aria-hidden="true" />
          <span className="surprise-btn-orb" aria-hidden="true">
            <Dices size={19} />
          </span>
          <span className="surprise-btn-text">
            <strong>{loadingNext ? 'Picking one…' : 'Surprise me'}</strong>
            <span>
              {isEmpty
                ? 'Waiting for first batch'
                : unsolvedCount > 0
                  ? `${unsolvedCount} unseen waiting`
                  : 'Replay a favorite'}
            </span>
          </span>
          <Sparkles size={16} className="surprise-btn-sparkle" aria-hidden="true" />
        </button>
      </section>

      {/* Interactive Puzzle Card Lists (Unsolved at top, Solved moved below) */}
      {loading ? (
        <div className="puzzle-grid">
          <div className="skeleton" style={{ height: 168 }} />
          <div className="skeleton" style={{ height: 168 }} />
          <div className="skeleton" style={{ height: 168 }} />
          <div className="skeleton" style={{ height: 168 }} />
        </div>
      ) : isEmpty ? (
        <section className="stack-lg" aria-label="Available puzzles">
          <div className="curio-card puzzles-caught-up-card fade-in-card" role="status">
            <span className="puzzles-caught-up-emblem" aria-hidden="true">
              <Sparkles size={20} strokeWidth={2.3} />
            </span>
            <h2 className="puzzles-caught-up-title">No puzzles published yet</h2>
            <p className="puzzles-caught-up-subcopy">
              New AI-generated puzzles appear here automatically once the scheduled generator
              publishes its next batch.
            </p>
            <button
              type="button"
              className="curio-btn curio-btn--accent curio-btn--sm"
              style={{ marginTop: 6 }}
              onClick={() => void loadPuzzles()}
            >
              <Sparkles size={14} aria-hidden="true" />
              <span>Check for puzzles</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="stack-lg" aria-label="Available puzzles">
          {unsolvedPuzzles.length > 0 && (
            <div className="puzzle-grid">
              {unsolvedPuzzles.map((puzzle, idx) => renderPuzzleCard(puzzle, idx, false))}
            </div>
          )}

          {allSolved && (
            <div className="curio-card puzzles-caught-up-card fade-in-card" role="status">
              <span className="puzzles-caught-up-emblem" aria-hidden="true">
                <Check size={20} strokeWidth={2.6} />
              </span>
              <h2 className="puzzles-caught-up-title">You’re all caught up</h2>
              <p className="puzzles-caught-up-subcopy">
                You’ve solved all {totalCount} puzzles in this deck. Replay any favorite below or
                roll a surprise anytime.
              </p>
            </div>
          )}

          {solvedPuzzles.length > 0 && (
            <div className="stack-sm">
              <div className="puzzles-section-divider">
                <span className="puzzles-section-divider-label">
                  <CheckCircle2 size={14} aria-hidden="true" />
                  <span>Solved ({solvedPuzzles.length})</span>
                </span>
                <span className="puzzles-section-divider-line" aria-hidden="true" />
              </div>

              <div className="puzzle-grid">
                {solvedPuzzles.map((puzzle, idx) => renderPuzzleCard(puzzle, idx, true))}
              </div>
            </div>
          )}

          {!allSolved && totalCount > 0 && (
            <div className="curio-card puzzles-caught-up-card fade-in-card">
              <span className="puzzles-caught-up-emblem" aria-hidden="true">
                <Check size={20} strokeWidth={2.6} />
              </span>
              <h2 className="puzzles-caught-up-title">You’re all caught up</h2>
              <p className="puzzles-caught-up-subcopy">
                You’ve reached the end of all {totalCount} puzzles. Still have {unsolvedCount}{' '}
                unseen {unsolvedCount === 1 ? 'teaser' : 'teasers'} waiting above.
              </p>
              <button
                type="button"
                className="curio-btn curio-btn--accent curio-btn--sm"
                style={{ marginTop: 6 }}
                disabled={loadingNext}
                onClick={() => void handleOpenRandomPuzzle()}
              >
                <Dices size={15} aria-hidden="true" />
                <span>Pick an unsolved puzzle</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Interactive Puzzle Popup */}
      <PuzzlePopupModal
        puzzle={activePuzzle}
        loadingNext={loadingNext}
        onClose={() => setActivePuzzle(null)}
        onSolved={handleMarkSolved}
        onNextPuzzle={() => void handleOpenRandomPuzzle()}
      />
    </main>
  );
}
