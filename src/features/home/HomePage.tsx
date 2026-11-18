import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Heart,
  Loader2,
  Plus,
  Sparkles,
  ThumbsDown,
  Wand2,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import type { GeneratedFeed } from '../../domain/feed/Feed';
import { getFriendlyErrorMessage } from '../../shared/errors/firebaseErrorMapper';
import { formatMastheadDate, getTimeOfDayGreeting } from '../../shared/utils/time';
import {
  CATEGORY_METADATA,
  type ContentCategory,
  type ContentRecord,
  type SavedCollection,
} from '../../shared/validation/contentSchemas';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import '../feed/components/FeedbackActionBar.css';
import './HomePage.css';
import { CardSkeleton } from '../feed/components/CardSkeleton';
import { DiscoveryCardDispatcher } from '../feed/components/DiscoveryCardDispatcher';
import { ModalDialog } from '../feed/components/ModalDialog';

export function HomePage() {
  const {
    userId,
    authUser,
    isSignedIn,
    authError,
    clearAuthError,
    services,
    preferences,
  } = useCurioApp();
  const navigate = useNavigate();

  const [feed, setFeed] = useState<GeneratedFeed | null>(null);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [saveTarget, setSaveTarget] = useState<ContentRecord | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  const loadFeedBatch = useCallback(
    async (excludeIds: string[] = [], batchSize: 5 | 10 = 10) => {
      const result = await services.generateFeed.execute({
        userId,
        durationMinutes: batchSize,
        excludeContentIds: excludeIds,
      });

      if (result.status === 'ready' && result.feed) {
        return result.feed;
      }

      throw new Error(result.error?.message ?? 'Could not load discoveries right now.');
    },
    [services, userId]
  );

  // Initial load: restore active feed batch if available, otherwise generate a fresh visual feed
  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      setLoadingFeed(true);
      setErrorMsg(null);
      try {
        const [overview, library] = await Promise.all([
          services.getFeed.execute(userId),
          services.getSavedLibrary.execute(userId),
        ]);
        if (!active) return;

        setCollections(library.collections);
        setSavedIds(library.savedContentIds);

        if (overview.activeSession) {
          const loaded = await services.getSession.execute(userId, overview.activeSession.id);
          if (active && loaded?.feed && loaded.feed.items.length > 0) {
            setFeed(loaded.feed);
            setLoadingFeed(false);
            return;
          }
        }

        const fresh = await loadFeedBatch();
        if (active) {
          setFeed(fresh);
        }
      } catch (error: unknown) {
        if (active) {
          setErrorMsg(getFriendlyErrorMessage(error, 'firestore'));
        }
      } finally {
        if (active) {
          setLoadingFeed(false);
        }
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [loadFeedBatch, services, userId]);

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setErrorMsg(null);
    const existingItems = feed?.items ?? [];
    const existingIds = new Set(existingItems.map((item) => item.id));
    try {
      const next = await loadFeedBatch(Array.from(existingIds), 5);
      const uniqueNew = next.items.filter((item) => !existingIds.has(item.id));
      if (uniqueNew.length > 0) {
        setFeed({
          ...next,
          items: [...existingItems, ...uniqueNew],
        });
      } else {
        // Every item in the current pool has been shown — start a fresh shuffled set at top
        const cycled = await loadFeedBatch([], 10);
        setDismissedIds(new Set());
        setFeed(cycled);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: unknown) {
      setErrorMsg(getFriendlyErrorMessage(error, 'firestore'));
    } finally {
      setLoadingMore(false);
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
      } else if (result.error) {
        flashToast(result.error.message);
      }
    } catch (error: unknown) {
      flashToast(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleToggleLike = async (record: ContentRecord) => {
    setLikedIds((prev) => new Set(prev).add(record.id));
    try {
      await services.recordInteraction.execute({
        userId,
        contentId: record.id,
        sessionId: feed?.session.id,
        action: 'liked',
      });
      flashToast('Liked — more discoveries like this coming up.');
    } catch (error: unknown) {
      flashToast(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleNotInterested = async (record: ContentRecord) => {
    setDismissedIds((prev) => new Set(prev).add(record.id));
    try {
      await services.recordInteraction.execute({
        userId,
        contentId: record.id,
        sessionId: feed?.session.id,
        action: 'not_interested',
      });
      flashToast('Hidden — we will dial back similar topics.');
    } catch (error: unknown) {
      flashToast(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleToggleSave = async (record: ContentRecord) => {
    if (savedIds.has(record.id)) {
      try {
        await services.saveContent.remove(userId, record.id);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });
        flashToast('Removed from Saved');
      } catch (error: unknown) {
        flashToast(getFriendlyErrorMessage(error, 'firestore'));
      }
    } else {
      setSaveTarget(record);
    }
  };

  const handleSaveToCollection = async (collectionId: string) => {
    if (!saveTarget) return;
    try {
      await services.saveContent.save(userId, saveTarget, collectionId, feed?.session.id);
      setSavedIds((prev) => new Set(prev).add(saveTarget.id));
      const colName = collections.find((c) => c.id === collectionId)?.name ?? 'Saved Library';
      setSaveTarget(null);
      flashToast(`Saved to "${colName}"`);
    } catch (error: unknown) {
      setSaveTarget(null);
      flashToast(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const greeting = getTimeOfDayGreeting();
  const displayName =
    preferences?.displayName ?? authUser?.displayName?.split(/\s+/)[0];
  const visibleItems = (feed?.items ?? []).filter((item) => !dismissedIds.has(item.id));

  return (
    <main className="curio-main curio-main--reading stack-lg">
      {/* Auth Feedback Banner */}
      {authError && (
        <div
          role="alert"
          className="curio-card curio-card--padded row-between fade-in-card"
          style={{
            padding: '14px 18px',
            borderColor: 'var(--accent-ochre)',
            background: 'var(--accent-ochre-soft)',
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>{authError}</span>
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            onClick={clearAuthError}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Immersive Full-Bleed Editorial Cover Card */}
      <section className="hero-cover" aria-label="Curio Daily Edition Hero">
        <img src="/images/hero/edition.jpg" alt="" className="hero-cover-bg" />
        <div className="hero-cover-scrim" aria-hidden="true" />

        <div className="hero-cover-content">
          <div className="hero-cover-top">
            <span className="hero-cover-date">{formatMastheadDate()}</span>

            {isSignedIn ? (
              <span className="hero-cover-pill">
                <span className="sync-dot" aria-hidden="true" />
                Synced
              </span>
            ) : preferences && preferences.interests.length > 0 ? (
              <span className="hero-cover-thumbs" aria-hidden="true">
                {preferences.interests.slice(0, 3).map((cat) => (
                  <img key={cat} src={CATEGORY_METADATA[cat].coverImage} alt="" />
                ))}
              </span>
            ) : null}
          </div>

          <div className="hero-cover-copy">
            <h1 className="hero-cover-headline">
              {greeting}
              {displayName ? `, ${displayName}` : ''}.
            </h1>
            <p className="hero-cover-tagline">Less scrolling. More discovering.</p>
          </div>

          <div className="hero-cover-actions">
            <Link to="/onboarding" className="curio-btn curio-btn--accent hero-primary-cta">
              <Wand2 size={15} aria-hidden="true" />
              <span>Personalize your interests</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {toastMsg && (
        <div role="status" className="curio-toast fade-in-card">
          {toastMsg}
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="curio-card curio-card--padded row-between"
          style={{
            borderColor: 'var(--accent-danger)',
            background: 'var(--accent-danger-soft)',
            color: 'var(--accent-danger)',
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            className="curio-btn curio-btn--secondary curio-btn--sm"
            onClick={() => void handleLoadMore()}
          >
            Try again
          </button>
        </div>
      )}

      {/* Visual For-You Discovery Feed */}
      <section aria-label="For You discovery feed" className="stack-lg">
        {loadingFeed ? (
          <>
            <CardSkeleton statusLabel="Loading your feed…" />
            <CardSkeleton statusLabel="Preparing interactive cards…" />
          </>
        ) : (
          visibleItems.map((item) => {
            const isSaved = savedIds.has(item.id);
            const isLiked = likedIds.has(item.id);

            return (
              <DiscoveryCardDispatcher
                key={item.id}
                record={item}
                handlers={{
                  onStartRabbitHole: (topic, category) =>
                    void handleStartRabbitHole(topic, category),
                }}
                footer={
                  <div
                    className="feedback-bar"
                    role="toolbar"
                    aria-label={`Actions for ${item.title}`}
                  >
                    <div className="feedback-group">
                      <button
                        type="button"
                        className={`curio-btn curio-btn--sm ${
                          isLiked ? 'curio-btn--accent' : 'curio-btn--secondary'
                        }`}
                        aria-pressed={isLiked}
                        onClick={() => void handleToggleLike(item)}
                      >
                        <Heart size={15} />
                        {isLiked ? 'Liked' : 'Like'}
                      </button>

                      <button
                        type="button"
                        className={`curio-btn curio-btn--sm ${
                          isSaved ? 'curio-btn--primary' : 'curio-btn--secondary'
                        }`}
                        aria-pressed={isSaved}
                        onClick={() => void handleToggleSave(item)}
                      >
                        {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="curio-btn curio-btn--ghost curio-btn--sm"
                      title="Show fewer items like this"
                      onClick={() => void handleNotInterested(item)}
                    >
                      <ThumbsDown size={15} />
                      <span className="hide-on-xs">Less like this</span>
                    </button>
                  </div>
                }
              />
            );
          })
        )}

        {/* Calm "All Caught Up" Boundary Card */}
        {!loadingFeed && (
          <section
            className="curio-card caught-up-card fade-in-card"
            aria-label="All caught up"
          >
            <span className="caught-up-emblem" aria-hidden="true">
              <Check size={20} strokeWidth={2.5} />
            </span>
            <h2 className="caught-up-title">You’re all caught up</h2>
            <p className="caught-up-subcopy">
              You’ve seen the latest picks for now.
            </p>
            <div className="caught-up-actions">
              <button
                type="button"
                className="curio-btn caught-up-primary-btn"
                disabled={loadingMore}
                onClick={() => void handleLoadMore()}
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={16} className="curio-spin" aria-hidden="true" />
                    <span>Loading…</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} strokeWidth={2.3} aria-hidden="true" />
                    <span>Load more</span>
                  </>
                )}
              </button>
              <Link to="/explore" className="caught-up-link">
                <span>Explore themes</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}
      </section>

      {/* Personalize & Sync Section */}
      {preferences && (
        <section
          className="curio-card curio-card--padded stack-md"
          aria-label="Personalize your edition"
        >
          <div className="stack-xs">
            <span className="curio-eyebrow row-wrap" style={{ gap: 6 }}>
              <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
              Personalize
            </span>
            <h2 style={{ fontSize: '1.35rem' }}>Make Curio yours</h2>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
              {isSignedIn
                ? 'Your curiosity profile and saved collections stay synced across your devices.'
                : 'Tailor your topics or sign in with Google to keep your profile and saved library synced.'}
            </p>
          </div>

          {preferences.interests.length > 0 && (
            <div className="row-wrap">
              {preferences.interests.map((cat) => (
                <span key={cat} className="curio-chip">
                  {CATEGORY_METADATA[cat].shortLabel}
                </span>
              ))}
            </div>
          )}

          <div className="row-wrap" style={{ gap: 10, paddingTop: 2 }}>
            {!isSignedIn && <GoogleSignInButton label="Continue with Google" />}
            <Link to="/onboarding" className="curio-btn curio-btn--secondary">
              <Wand2 size={15} aria-hidden="true" />
              Customize interests
            </Link>
          </div>
        </section>
      )}

      {/* Save to Collection Sheet / Modal */}
      <ModalDialog
        open={Boolean(saveTarget)}
        title="Save to a collection"
        onClose={() => setSaveTarget(null)}
      >
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Choose where to keep "{saveTarget?.title}".
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
