import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import { computeSessionSummary, type GeneratedFeed } from '../../domain/feed/Feed';
import { getFriendlyErrorMessage } from '../../shared/errors/firebaseErrorMapper';
import {
  CATEGORY_METADATA,
  type ContentCategory,
  type FeedSession,
  type SavedCollection,
} from '../../shared/validation/contentSchemas';
import { AIExplanationPanel } from './components/AIExplanationPanel';
import { CardSkeleton } from './components/CardSkeleton';
import { DiscoveryCardDispatcher } from './components/DiscoveryCardDispatcher';
import { FeedbackActionBar } from './components/FeedbackActionBar';
import { ModalDialog } from './components/ModalDialog';
import { ProgressIndicator } from './components/ProgressIndicator';
import { SessionCompletionView } from './components/SessionCompletionView';

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { userId, services } = useCurioApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<FeedSession | null>(null);
  const [feed, setFeed] = useState<GeneratedFeed | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [notInterestedIds, setNotInterestedIds] = useState<Set<string>>(new Set());
  const [askOpen, setAskOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [loaded, library] = await Promise.all([
        services.getSession.execute(userId, sessionId),
        services.getSavedLibrary.execute(userId),
      ]);

      setCollections(library.collections);
      setSavedIds(library.savedContentIds);

      if (!loaded) {
        setSession(null);
        setFeed(null);
        return;
      }

      setSession(loaded.session);
      setFeed(loaded.feed ?? null);
      setCurrentIndex(loaded.session.currentIndex ?? 0);
      setShowCompletion(Boolean(loaded.session.completedAt));
    } finally {
      setLoading(false);
    }
  }, [services, sessionId, userId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  // Phase 2 readiness: poll gently if session is pending/processing
  useEffect(() => {
    if (!session || (session.status !== 'pending' && session.status !== 'processing')) {
      return;
    }
    const timer = setInterval(() => {
      void loadSession();
    }, 1500);
    return () => clearInterval(timer);
  }, [session, loadSession]);

  const currentItem = feed?.items[currentIndex] ?? null;

  useEffect(() => {
    if (!currentItem || !session || showCompletion) return;
    setAskOpen(false);
    void services.recordInteraction.execute({
      userId,
      contentId: currentItem.id,
      sessionId: session.id,
      action: 'opened',
    });
  }, [currentItem, session, showCompletion, services, userId]);

  const handleGoToIndex = useCallback(
    async (nextIndex: number, markCurrentCompleted = false) => {
      if (!feed || !session) return;
      const clamped = Math.max(0, Math.min(feed.items.length - 1, nextIndex));
      const completedId = markCurrentCompleted ? feed.items[currentIndex]?.id : undefined;

      setCurrentIndex(clamped);
      const updated = await services.updateSessionProgress.execute(userId, session.id, {
        currentIndex: clamped,
        markCompletedContentId: completedId,
      });
      if (updated) {
        setSession(updated);
      }
      if (completedId) {
        void services.recordInteraction.execute({
          userId,
          contentId: completedId,
          sessionId: session.id,
          action: 'completed',
        });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentIndex, feed, services, session, userId]
  );

  const handleCompleteSession = useCallback(async () => {
    if (!feed || !session) return;
    const lastItemId = feed.items[currentIndex]?.id;
    const updated = await services.updateSessionProgress.execute(userId, session.id, {
      markCompletedContentId: lastItemId,
      markSessionComplete: true,
    });
    if (updated) {
      setSession(updated);
    }
    if (lastItemId) {
      void services.recordInteraction.execute({
        userId,
        contentId: lastItemId,
        sessionId: session.id,
        action: 'completed',
      });
    }
    setShowCompletion(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex, feed, services, session, userId]);

  // Keyboard arrow navigation
  useEffect(() => {
    if (!feed || showCompletion || saveModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (event.key === 'ArrowRight') {
        if (currentIndex < feed.items.length - 1) {
          void handleGoToIndex(currentIndex + 1, true);
        }
      } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        void handleGoToIndex(currentIndex - 1, false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentIndex, feed, handleGoToIndex, saveModalOpen, showCompletion]);

  // Controlled horizontal swipe gesture for mobile reading (strictly ignores vertical scroll)
  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (askOpen || saveModalOpen || showCompletion) return;
    const touch = event.touches[0];
    if (!touch) return;
    touchOriginRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const origin = touchOriginRef.current;
    touchOriginRef.current = null;
    if (!origin || !feed || askOpen || saveModalOpen || showCompletion) return;

    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;

    // Require clear horizontal intent (>64px and >1.6x vertical drift) so scrolling never misfires
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.6) {
      return;
    }

    if (dx < 0) {
      if (currentIndex < feed.items.length - 1) {
        void handleGoToIndex(currentIndex + 1, true);
      } else {
        void handleCompleteSession();
      }
    } else if (dx > 0 && currentIndex > 0) {
      void handleGoToIndex(currentIndex - 1, false);
    }
  };

  const handleRetryFailedSession = async () => {
    if (!session) return;
    setRetrying(true);
    try {
      const result = await services.generateFeed.execute({
        userId,
        sessionId: session.id,
        durationMinutes: session.durationMinutes,
        topicFocus: session.topicFocus,
        categoryFocus: session.categoryFocus,
      });
      if (result.feed) {
        setSession(result.feed.session);
        setFeed(result.feed);
        setCurrentIndex(0);
      } else {
        await loadSession();
      }
    } catch (error: unknown) {
      flashToast(getFriendlyErrorMessage(error, 'firestore'));
    } finally {
      setRetrying(false);
    }
  };

  const handleStartRabbitHole = async (topic: string, category: ContentCategory) => {
    try {
      const result = await services.generateFeed.execute({
        userId,
        durationMinutes: 5,
        topicFocus: topic,
        categoryFocus: category,
      });
      if (result.status === 'ready') {
        navigate(`/session/${result.sessionId}`);
      } else {
        flashToast(result.error?.message ?? 'Could not start topic journey right now.');
      }
    } catch (error: unknown) {
      flashToast(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleStartFreshSession = async () => {
    try {
      const result = await services.generateFeed.execute({
        userId,
        durationMinutes: 5,
      });
      if (result.status === 'ready') {
        navigate(`/session/${result.sessionId}`);
      } else if (result.error) {
        flashToast(result.error.message);
      }
    } catch (error: unknown) {
      flashToast(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleSaveToCollection = async (collectionId: string) => {
    if (!currentItem || !session) return;
    try {
      await services.saveContent.save(userId, currentItem, collectionId, session.id);
      setSavedIds((prev) => new Set(prev).add(currentItem.id));
      setSaveModalOpen(false);
      const colName =
        collections.find((c) => c.id === collectionId)?.name ?? 'Saved Library';
      flashToast(`Saved to "${colName}"`);
    } catch (error: unknown) {
      setSaveModalOpen(false);
      flashToast(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleToggleSave = async () => {
    if (!currentItem) return;
    if (savedIds.has(currentItem.id)) {
      try {
        await services.saveContent.remove(userId, currentItem.id);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(currentItem.id);
          return next;
        });
        flashToast('Removed from Saved Library');
      } catch (error: unknown) {
        flashToast(getFriendlyErrorMessage(error, 'firestore'));
      }
    } else {
      setSaveModalOpen(true);
    }
  };

  const handleLike = async () => {
    if (!currentItem || !session) return;
    setLikedIds((prev) => new Set(prev).add(currentItem.id));
    await services.recordInteraction.execute({
      userId,
      contentId: currentItem.id,
      sessionId: session.id,
      action: 'liked',
    });
    flashToast('Thanks! We will bring more discoveries with this flavor.');
  };

  const handleNotInterested = async () => {
    if (!currentItem || !session || !feed) return;
    setNotInterestedIds((prev) => new Set(prev).add(currentItem.id));
    await services.recordInteraction.execute({
      userId,
      contentId: currentItem.id,
      sessionId: session.id,
      action: 'not_interested',
    });
    flashToast('Noted — we will dial back similar items.');
    if (currentIndex < feed.items.length - 1) {
      void handleGoToIndex(currentIndex + 1, false);
    }
  };

  const handleSkip = async () => {
    if (!currentItem || !session || !feed) return;
    await services.recordInteraction.execute({
      userId,
      contentId: currentItem.id,
      sessionId: session.id,
      action: 'skipped',
    });
    if (currentIndex < feed.items.length - 1) {
      void handleGoToIndex(currentIndex + 1, false);
    } else {
      void handleCompleteSession();
    }
  };

  if (loading) {
    return (
      <main className="curio-main curio-main--reading">
        <CardSkeleton statusLabel="Loading your Curio mix…" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="curio-main curio-main--reading">
        <section className="curio-card curio-card--padded stack-md">
          <span className="curio-eyebrow">Mix Not Found</span>
          <h1>We couldn’t find that discovery mix</h1>
          <p className="text-secondary">
            It may have been cleared from local storage or belong to another reader profile.
          </p>
          <div>
            <button
              type="button"
              className="curio-btn curio-btn--primary"
              onClick={() => navigate('/')}
            >
              Return Home
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (session.status === 'pending' || session.status === 'processing') {
    return (
      <main className="curio-main curio-main--reading">
        <CardSkeleton
          statusLabel={
            session.status === 'pending'
              ? 'Preparing your fresh discoveries…'
              : 'Curating your discovery mix…'
          }
        />
      </main>
    );
  }

  if (session.status === 'failed' || !feed || feed.items.length === 0) {
    return (
      <main className="curio-main curio-main--reading">
        <section className="curio-card curio-card--padded stack-md" role="alert">
          <div className="row-wrap" style={{ color: 'var(--accent-danger)' }}>
            <AlertCircle size={20} />
            <span className="curio-eyebrow" style={{ color: 'var(--accent-danger)' }}>
              Session Generation Interrupted
            </span>
          </div>
          <h1>We hit a snag assembling this edition</h1>
          <p className="text-secondary">
            {session.error?.message ?? 'No eligible items were available for this session.'}
          </p>
          <div className="row-wrap">
            <button
              type="button"
              className="curio-btn curio-btn--primary"
              disabled={retrying}
              onClick={() => void handleRetryFailedSession()}
            >
              <RefreshCw size={15} />
              {retrying ? 'Retrying…' : 'Retry session'}
            </button>
            <button
              type="button"
              className="curio-btn curio-btn--secondary"
              onClick={() => navigate('/')}
            >
              Return Home
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (showCompletion) {
    const summary = computeSessionSummary(session, feed.items, savedIds);
    return (
      <main className="curio-main curio-main--reading">
        <SessionCompletionView
          summary={summary}
          initialReflection={session.reflectionNote}
          onSaveReflection={async (note) => {
            const updated = await services.updateSessionProgress.execute(userId, session.id, {
              reflectionNote: note,
            });
            if (updated) setSession(updated);
          }}
          onGoHome={() => navigate('/')}
          onGoLibrary={() => navigate('/library')}
          onStartNextTopic={(topic, category) => void handleStartRabbitHole(topic, category)}
          onStartFreshSession={() => void handleStartFreshSession()}
        />
      </main>
    );
  }

  const completedSet = new Set(session.completedItemIds);
  const isLastItem = currentIndex === feed.items.length - 1;
  const sessionLabel = session.topicFocus
    ? session.topicFocus
    : session.categoryFocus
      ? CATEGORY_METADATA[session.categoryFocus].shortLabel
      : 'Curio Mix';

  return (
    <main
      className="curio-main curio-main--reading curio-main--session stack-md"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Native-style Sticky Reading Header */}
      <div className="session-sticky-header">
        <button
          type="button"
          className="session-back-btn"
          aria-label="Exit deck to Home"
          onClick={() => navigate('/')}
        >
          <ChevronLeft size={20} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <ProgressIndicator
            currentIndex={currentIndex}
            totalItems={feed.items.length}
            completedIds={completedSet}
            itemIds={feed.items.map((i) => i.id)}
            sessionLabel={sessionLabel}
          />
        </div>
      </div>

      {session.metadata?.servedFromFallback && (
        <p className="mono-meta">
          Showing saved discoveries while offline.
        </p>
      )}

      {toastMsg && (
        <div role="status" className="curio-toast fade-in-card">
          {toastMsg}
        </div>
      )}

      {/* Registered Schema-Driven Card */}
      {currentItem && (
        <>
          <DiscoveryCardDispatcher
            key={currentItem.id}
            record={currentItem}
            handlers={{
              onStartRabbitHole: (topic, category) =>
                void handleStartRabbitHole(topic, category),
            }}
            footer={
              <FeedbackActionBar
                isSaved={savedIds.has(currentItem.id)}
                isLiked={likedIds.has(currentItem.id)}
                isNotInterested={notInterestedIds.has(currentItem.id)}
                askOpen={askOpen}
                onToggleSave={() => void handleToggleSave()}
                onLike={() => void handleLike()}
                onNotInterested={() => void handleNotInterested()}
                onSkip={() => void handleSkip()}
                onToggleAsk={() => setAskOpen((prev) => !prev)}
              />
            }
          />

          {askOpen && (
            <AIExplanationPanel
              record={currentItem}
              onClose={() => setAskOpen(false)}
            />
          )}
        </>
      )}

      {/* Thumb-Zone Sticky Mobile Dock / Inline Desktop Navigation */}
      <nav className="session-nav-dock" aria-label="Session item navigation">
        <button
          type="button"
          className="curio-btn curio-btn--secondary"
          disabled={currentIndex === 0}
          onClick={() => void handleGoToIndex(currentIndex - 1, false)}
        >
          <ArrowLeft size={16} />
          <span>Previous</span>
        </button>

        <span className="mono-meta show-on-mobile">
          Swipe ← → · {currentIndex + 1}/{feed.items.length}
        </span>

        {isLastItem ? (
          <button
            type="button"
            className="curio-btn curio-btn--accent"
            onClick={() => void handleCompleteSession()}
          >
            <CheckCircle2 size={17} />
            <span>Finish Mix</span>
          </button>
        ) : (
          <button
            type="button"
            className="curio-btn curio-btn--primary"
            onClick={() => void handleGoToIndex(currentIndex + 1, true)}
          >
            <span>Next discovery</span>
            <ArrowRight size={16} />
          </button>
        )}
      </nav>

      {/* Save to Collection Modal / Mobile Bottom Sheet */}
      <ModalDialog
        open={saveModalOpen}
        title="Save to a collection"
        onClose={() => setSaveModalOpen(false)}
      >
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Choose where to keep "{currentItem?.title}".
        </p>
        <div className="stack-xs">
          {collections.map((col) => (
            <button
              key={col.id}
              type="button"
              className="entry-card"
              style={{ padding: '13px 16px' }}
              onClick={() => void handleSaveToCollection(col.id)}
            >
              <strong>{col.name}</strong>
              {col.description && (
                <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                  {col.description}
                </span>
              )}
            </button>
          ))}
        </div>
      </ModalDialog>
    </main>
  );
}
