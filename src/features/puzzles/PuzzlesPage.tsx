import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Dice5,
  HelpCircle,
  Puzzle as PuzzleIcon,
  Shapes,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import { CATEGORY_METADATA } from '../../shared/validation/contentSchemas';
import {
  PUZZLE_KINDS,
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
};

export function PuzzlesPage() {
  const { userId, services } = useCurioApp();

  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [selectedKind, setSelectedKind] = useState<'all' | PuzzleKind>('all');
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [allPuzzles, solved] = await Promise.all([
          services.puzzleProvider.listPuzzles(),
          services.puzzleProvider.getSolvedIds(userId),
        ]);
        if (!mounted) return;
        setPuzzles(allPuzzles);
        setSolvedIds(solved);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [services, userId]);

  const filteredPuzzles =
    selectedKind === 'all'
      ? puzzles
      : puzzles.filter((item) => item.kind === selectedKind);

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
        kind: selectedKind === 'all' ? undefined : selectedKind,
        excludeIds: exclude,
      });
      if (next) {
        setActivePuzzle(next);
      }
    } finally {
      setLoadingNext(false);
    }
  };

  return (
    <main className="curio-main stack-lg">
      <header className="masthead">
        <div className="row-between" style={{ alignItems: 'flex-end', gap: 14 }}>
          <div>
            <span className="curio-eyebrow">Play & Think</span>
            <h1 className="masthead-headline" style={{ marginTop: 6 }}>
              Curio Puzzles
            </h1>
          </div>

          <button
            type="button"
            className="curio-btn curio-btn--accent"
            disabled={loading || puzzles.length === 0 || loadingNext}
            onClick={() => void handleOpenRandomPuzzle()}
          >
            <Dice5 size={16} aria-hidden="true" />
            <span>Surprise me</span>
          </button>
        </div>

        <p className="masthead-prompt">
          Tap any card to pop open a quick brain teaser—patterns, riddles, odd-one-out challenges,
          and surprising myths.
        </p>

        <div className="row-wrap" style={{ marginTop: 12, gap: 10 }}>
          <span className="curio-chip">
            <CheckCircle2
              size={13}
              aria-hidden="true"
              style={{ color: 'var(--accent-sage)' }}
            />
            <span>
              {solvedIds.size} of {puzzles.length} solved
            </span>
          </span>
        </div>
      </header>

      {/* Puzzle Kind Filter Strip */}
      <div className="tabs-scroll-strip" role="tablist" aria-label="Puzzle types">
        <button
          type="button"
          role="tab"
          aria-selected={selectedKind === 'all'}
          className={`curio-chip curio-chip--selectable ${
            selectedKind === 'all' ? 'curio-chip--selected' : ''
          }`}
          style={{ flexShrink: 0 }}
          onClick={() => setSelectedKind('all')}
        >
          All Puzzles ({puzzles.length})
        </button>

        {PUZZLE_KINDS.map((kind) => {
          const meta = PUZZLE_KIND_METADATA[kind];
          const Icon = KIND_ICONS[kind];
          const active = selectedKind === kind;
          return (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={active}
              className={`curio-chip curio-chip--selectable ${
                active ? 'curio-chip--selected' : ''
              }`}
              style={{ flexShrink: 0 }}
              onClick={() => setSelectedKind(kind)}
            >
              <Icon size={13} aria-hidden="true" />
              <span>{meta.pluralLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Puzzle Card Grid */}
      {loading ? (
        <div className="puzzle-grid">
          <div className="skeleton" style={{ height: 156 }} />
          <div className="skeleton" style={{ height: 156 }} />
          <div className="skeleton" style={{ height: 156 }} />
          <div className="skeleton" style={{ height: 156 }} />
        </div>
      ) : (
        <section className="puzzle-grid" aria-label="Available puzzles">
          {filteredPuzzles.map((puzzle, idx) => {
            const kindMeta = PUZZLE_KIND_METADATA[puzzle.kind];
            const catMeta = CATEGORY_METADATA[puzzle.category];
            const Icon = KIND_ICONS[puzzle.kind];
            const isSolved = solvedIds.has(puzzle.id);

            return (
              <button
                key={puzzle.id}
                type="button"
                className={`curio-card puzzle-tile ${isSolved ? 'puzzle-tile--solved' : ''}`}
                style={{ animationDelay: `${idx * 35}ms` }}
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
                    <span className="mono-meta">{puzzle.difficulty}</span>
                  )}
                </div>

                <div className="stack-xs" style={{ gap: 5, textAlign: 'left', width: '100%' }}>
                  <h2 className="puzzle-tile-title">{puzzle.title}</h2>
                  <p className="puzzle-tile-prompt">{puzzle.prompt}</p>
                </div>

                <div className="row-between" style={{ width: '100%', marginTop: 'auto', paddingTop: 6 }}>
                  <span className="mono-meta">{catMeta.shortLabel}</span>
                  <span className="puzzle-tile-cta" style={{ color: kindMeta.accentVar }}>
                    {isSolved ? 'Play again' : 'Solve puzzle'} →
                  </span>
                </div>
              </button>
            );
          })}
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
