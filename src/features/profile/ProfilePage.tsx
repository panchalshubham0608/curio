import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookmarkCheck,
  ChevronRight,
  Cloud,
  Compass,
  LogOut,
  Moon,
  Puzzle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  UserX,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import { normalizeTopicList } from '../../domain/user/UserPreferences';
import { getFriendlyErrorMessage } from '../../shared/errors/firebaseErrorMapper';
import { maskDisplayIdentifier } from '../../shared/utils/sanitize';
import {
  CATEGORY_METADATA,
  CONTENT_CATEGORIES,
  type ContentCategory,
  type ContentMix,
} from '../../shared/validation/contentSchemas';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { ModalDialog } from '../feed/components/ModalDialog';
import {
  DISCOVERY_VIBE_OPTIONS,
  getDiscoveryVibeTitle,
} from '../preferences/discoveryVibeOptions';
import {
  DiscoveryVibeModal,
  VisualInterestsModal,
} from './components/PreferencesFlowModal';
import '../preferences/components/DiscoveryVibePicker.css';
import './ProfilePage.css';

export function ProfilePage() {
  const {
    userId,
    authUser,
    isSignedIn,
    authBusy,
    authError,
    signOutAccount,
    clearLocalGuestProfile,
    services,
    preferences,
    setPreferencesState,
    theme,
    toggleTheme,
  } = useCurioApp();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(preferences?.displayName ?? '');
  const [interests, setInterests] = useState<ContentCategory[]>(
    preferences?.interests ?? ['facts', 'science']
  );
  const [keywordsText, setKeywordsText] = useState(
    preferences?.topicKeywords.join(', ') ?? ''
  );
  const [excludedText, setExcludedText] = useState(
    preferences?.excludedTopics.join(', ') ?? ''
  );
  const [preferredMix, setPreferredMix] = useState<ContentMix>(
    preferences?.preferredMix ?? 'balanced'
  );

  const [completedSessions, setCompletedSessions] = useState(0);
  const [savedItemsCount, setSavedItemsCount] = useState(0);
  const [solvedPuzzlesCount, setSolvedPuzzlesCount] = useState(0);
  const [totalPuzzlesCount, setTotalPuzzlesCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [interestsModalOpen, setInterestsModalOpen] = useState(false);
  const [vibeModalOpen, setVibeModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [clearGuestModalOpen, setClearGuestModalOpen] = useState(false);

  useEffect(() => {
    if (!preferences) return;
    setDisplayName(preferences.displayName ?? '');
    setInterests(preferences.interests);
    setKeywordsText(preferences.topicKeywords.join(', '));
    setExcludedText(preferences.excludedTopics.join(', '));
    setPreferredMix(preferences.preferredMix);
  }, [preferences]);

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      try {
        const [overview, library, puzzles, solvedPuzzles] = await Promise.all([
          services.getFeed.execute(userId),
          services.getSavedLibrary.execute(userId),
          services.puzzleProvider.listPuzzles(),
          services.puzzleProvider.getSolvedIds(userId),
        ]);
        if (!mounted) return;
        setCompletedSessions(overview.completedSessionsCount);
        setSavedItemsCount(library.entries.length);
        setTotalPuzzlesCount(puzzles.length);
        setSolvedPuzzlesCount(solvedPuzzles.size);
      } catch {
        // Non-blocking overview stats
      }
    };
    void loadStats();
    return () => {
      mounted = false;
    };
  }, [services, userId]);

  const handleSaveInterests = async (nextInterests: ContentCategory[]) => {
    setSaving(true);
    setStatusBanner(null);
    setErrorBanner(null);
    try {
      const updated = await services.updatePreferences.execute(userId, {
        interests: nextInterests,
        onboardingCompleted: true,
      });
      setPreferencesState(updated);
      setInterests(updated.interests);
      setInterestsModalOpen(false);
      setStatusBanner('Visual interests updated.');
    } catch (error: unknown) {
      setInterestsModalOpen(false);
      setErrorBanner(getFriendlyErrorMessage(error, 'firestore'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVibe = async (nextMix: ContentMix) => {
    setSaving(true);
    setStatusBanner(null);
    setErrorBanner(null);
    try {
      const updated = await services.updatePreferences.execute(userId, {
        preferredMix: nextMix,
        onboardingCompleted: true,
      });
      setPreferencesState(updated);
      setPreferredMix(updated.preferredMix);
      setVibeModalOpen(false);
      setStatusBanner('Discovery vibe updated.');
    } catch (error: unknown) {
      setVibeModalOpen(false);
      setErrorBanner(getFriendlyErrorMessage(error, 'firestore'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReaderDetails = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatusBanner(null);
    setErrorBanner(null);
    try {
      const updated = await services.updatePreferences.execute(userId, {
        displayName: displayName.trim() || undefined,
        topicKeywords: normalizeTopicList(keywordsText),
        excludedTopics: normalizeTopicList(excludedText),
        onboardingCompleted: true,
      });
      setPreferencesState(updated);
      setDetailsModalOpen(false);
      setStatusBanner('Reader details saved.');
    } catch (error: unknown) {
      setDetailsModalOpen(false);
      setErrorBanner(getFriendlyErrorMessage(error, 'firestore'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    setErrorBanner(null);
    try {
      const resetPrefs = await services.resetPersonalization.execute(userId);
      setPreferencesState(resetPrefs);
      setResetModalOpen(false);
      setStatusBanner('Personalization signals and interaction history have been reset.');
    } catch (error: unknown) {
      setResetModalOpen(false);
      setErrorBanner(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleConfirmClearGuestProfile = async () => {
    setErrorBanner(null);
    try {
      const freshPrefs = await clearLocalGuestProfile();
      setDisplayName(freshPrefs.displayName ?? '');
      setInterests(freshPrefs.interests);
      setKeywordsText('');
      setExcludedText('');
      setPreferredMix(freshPrefs.preferredMix);
      setCompletedSessions(0);
      setSavedItemsCount(0);
      setSolvedPuzzlesCount(0);
      setClearGuestModalOpen(false);
      setStatusBanner('Local guest profile cleared. You are starting fresh on this device.');
    } catch (error: unknown) {
      setClearGuestModalOpen(false);
      setErrorBanner(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleClearCache = async () => {
    setErrorBanner(null);
    try {
      await services.contentRepository.clearCache?.();
      setStatusBanner('Cached discoveries cleared. Fresh cards will load on your next refresh.');
    } catch (error: unknown) {
      setErrorBanner(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleSignOut = async () => {
    await signOutAccount();
    navigate('/', { replace: true });
  };

  const activeVibe =
    DISCOVERY_VIBE_OPTIONS.find((option) => option.id === preferredMix) ??
    DISCOVERY_VIBE_OPTIONS[1];
  const interestsSummary = interests
    .slice(0, 4)
    .map((cat) => CATEGORY_METADATA[cat].shortLabel)
    .join(' · ');
  const extraInterestsCount = Math.max(0, interests.length - 4);
  const heroDisplayName =
    displayName.trim() ||
    (isSignedIn ? (authUser?.displayName ?? 'Curious Reader') : 'Curious Reader');
  const avatarInitial = heroDisplayName.charAt(0).toUpperCase();
  const puzzleProgressPct =
    totalPuzzlesCount > 0 ? Math.min(100, Math.round((solvedPuzzlesCount / totalPuzzlesCount) * 100)) : 0;
  const interestProgressPct = Math.round((interests.length / CONTENT_CATEGORIES.length) * 100);

  return (
    <main className="curio-main curio-main--reading stack-lg">
      {/* Slim Editorial Top Bar */}
      <header className="profile-topbar">
        <h1 className="profile-topbar-title">Profile</h1>

        <div className="profile-theme-switch" role="group" aria-label="Color theme">
          <button
            type="button"
            className={`profile-theme-option${theme === 'light' ? ' profile-theme-option--active' : ''}`}
            aria-pressed={theme === 'light'}
            onClick={() => {
              if (theme !== 'light') toggleTheme();
            }}
          >
            <Sun size={14} aria-hidden="true" />
            <span>Light</span>
          </button>
          <button
            type="button"
            className={`profile-theme-option${theme === 'dark' ? ' profile-theme-option--active' : ''}`}
            aria-pressed={theme === 'dark'}
            onClick={() => {
              if (theme !== 'dark') toggleTheme();
            }}
          >
            <Moon size={14} aria-hidden="true" />
            <span>Dark</span>
          </button>
        </div>
      </header>

      {/* Editorial User Identity Hero Card */}
      <section className="profile-hero-card fade-in-card" aria-label="Account and sync">
        <div className="profile-hero-top">
          <div className="profile-hero-identity">
            {authUser?.photoURL ? (
              <img
                src={authUser.photoURL}
                alt=""
                className="profile-hero-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="profile-hero-avatar" aria-hidden="true">
                {avatarInitial}
              </span>
            )}
            <div className="stack-xs" style={{ gap: 6, minWidth: 0 }}>
              <h2 className="profile-hero-name">{heroDisplayName}</h2>
              <div className="profile-hero-meta">
                {isSignedIn ? (
                  <>
                    <span className="profile-status-pill profile-status-pill--synced">
                      <span className="sync-dot" aria-hidden="true" />
                      Synced
                    </span>
                    {authUser?.email && (
                      <span className="profile-hero-email">
                        {maskDisplayIdentifier(authUser.email)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="profile-status-pill profile-status-pill--local">
                    <Smartphone size={12} aria-hidden="true" />
                    On this device
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-hero-action">
            {isSignedIn ? (
              <button
                type="button"
                className="curio-btn curio-btn--sm profile-hero-signout"
                disabled={authBusy}
                onClick={() => void handleSignOut()}
              >
                <LogOut size={14} />
                Sign out
              </button>
            ) : (
              <GoogleSignInButton label="Sign in with Google" compact />
            )}
          </div>
        </div>

        <div className="profile-hero-footer">
          <span className="profile-hero-vibe">
            Current vibe: <strong>{getDiscoveryVibeTitle(preferredMix)}</strong>
          </span>
          {interests.length > 0 ? (
            <div className="palette-tray" aria-hidden="true">
              {interests.slice(0, 5).map((cat) => (
                <img
                  key={cat}
                  src={CATEGORY_METADATA[cat].coverImage}
                  alt=""
                  className="palette-thumb"
                  style={{ width: 28, height: 28, borderColor: '#26211c' }}
                />
              ))}
              {interests.length > 5 && (
                <span className="profile-hero-more-pill">+{interests.length - 5}</span>
              )}
            </div>
          ) : (
            <span className="profile-hero-vibe">No themes selected</span>
          )}
        </div>

        {authError && (
          <p role="alert" style={{ color: '#f7c59f', fontSize: '0.86rem' }}>
            {authError}
          </p>
        )}
      </section>

      {statusBanner && (
        <div
          role="status"
          className="curio-card curio-card--padded fade-in-card"
          style={{
            padding: '14px 18px',
            background: 'var(--accent-sage-soft)',
            borderColor: 'var(--accent-sage)',
            color: 'var(--accent-sage)',
            fontWeight: 500,
          }}
        >
          {statusBanner}
        </div>
      )}

      {errorBanner && (
        <div
          role="alert"
          className="curio-card curio-card--padded fade-in-card"
          style={{
            padding: '14px 18px',
            background: 'var(--accent-danger-soft)',
            borderColor: 'var(--accent-danger)',
            color: 'var(--accent-danger)',
            fontWeight: 500,
          }}
        >
          {errorBanner}
        </div>
      )}

      {/* Tactile 2x2 / 4-Column Personal Discovery Bento Statistics */}
      <section className="profile-stats-grid" aria-label="Personal discovery overview">
        <Link to="/explore" className="profile-stat-card profile-stat-card--terracotta">
          <div className="profile-stat-head">
            <span
              className="profile-stat-icon"
              style={{
                background: 'var(--accent-primary-soft)',
                color: 'var(--accent-primary)',
              }}
              aria-hidden="true"
            >
              <Compass size={17} />
            </span>
            <ArrowUpRight size={15} className="profile-stat-arrow" aria-hidden="true" />
          </div>
          <div className="profile-stat-body">
            <strong className="profile-stat-value">{completedSessions}</strong>
            <span className="profile-stat-label">Mixes explored</span>
            <span className="profile-stat-hint">Explore topics</span>
          </div>
        </Link>

        <Link to="/library" className="profile-stat-card profile-stat-card--indigo">
          <div className="profile-stat-head">
            <span
              className="profile-stat-icon"
              style={{
                background: 'var(--accent-indigo-soft)',
                color: 'var(--accent-indigo)',
              }}
              aria-hidden="true"
            >
              <BookmarkCheck size={17} />
            </span>
            <ArrowUpRight size={15} className="profile-stat-arrow" aria-hidden="true" />
          </div>
          <div className="profile-stat-body">
            <strong className="profile-stat-value">{savedItemsCount}</strong>
            <span className="profile-stat-label">Saved stories</span>
            <span className="profile-stat-hint">Open library</span>
          </div>
        </Link>

        <Link to="/puzzles" className="profile-stat-card profile-stat-card--sage">
          <div className="profile-stat-head">
            <span
              className="profile-stat-icon"
              style={{
                background: 'var(--accent-sage-soft)',
                color: 'var(--accent-sage)',
              }}
              aria-hidden="true"
            >
              <Puzzle size={17} />
            </span>
            <ArrowUpRight size={15} className="profile-stat-arrow" aria-hidden="true" />
          </div>
          <div className="profile-stat-body">
            <strong className="profile-stat-value">
              {solvedPuzzlesCount}
              {totalPuzzlesCount > 0 && (
                <span className="profile-stat-denom">/ {totalPuzzlesCount}</span>
              )}
            </strong>
            <span className="profile-stat-label">Puzzles solved</span>
            <div className="profile-stat-bar" aria-hidden="true">
              <div
                className="profile-stat-bar-fill"
                style={{
                  width: `${puzzleProgressPct}%`,
                  background: 'var(--accent-sage)',
                }}
              />
            </div>
          </div>
        </Link>

        <button
          type="button"
          className="profile-stat-card profile-stat-card--ochre"
          onClick={() => setInterestsModalOpen(true)}
        >
          <div className="profile-stat-head">
            <span
              className="profile-stat-icon"
              style={{
                background: 'var(--accent-ochre-soft)',
                color: 'var(--accent-ochre)',
              }}
              aria-hidden="true"
            >
              <Sparkles size={17} />
            </span>
            <ArrowUpRight size={15} className="profile-stat-arrow" aria-hidden="true" />
          </div>
          <div className="profile-stat-body">
            <strong className="profile-stat-value">
              {interests.length}
              <span className="profile-stat-denom">/ {CONTENT_CATEGORIES.length}</span>
            </strong>
            <span className="profile-stat-label">Active themes</span>
            <div className="profile-stat-bar" aria-hidden="true">
              <div
                className="profile-stat-bar-fill"
                style={{
                  width: `${interestProgressPct}%`,
                  background: 'var(--accent-ochre)',
                }}
              />
            </div>
          </div>
        </button>
      </section>

      {/* Clean Interactive Personalization Summary Rows -> Independent Modals */}
      <section
        className="curio-card curio-card--padded stack-sm"
        aria-label="Personalization preferences"
      >
        <div className="stack-xs" style={{ gap: 2 }}>
          <h2 style={{ fontSize: '1.3rem' }}>Personalization</h2>
          <p className="text-secondary" style={{ fontSize: '0.88rem' }}>
            Tap any option below to update it anytime.
          </p>
        </div>

        <div className="profile-settings-list">
          {/* Row 1: Visual Interests -> opens standalone interests modal */}
          <button
            type="button"
            className="profile-setting-row"
            onClick={() => setInterestsModalOpen(true)}
          >
            <div className="profile-setting-row-main">
              <span className="profile-setting-row-title">Visual interests</span>
              <span className="profile-setting-row-sub">
                {interests.length > 0 ? (
                  <>
                    {interestsSummary}
                    {extraInterestsCount > 0 ? ` +${extraInterestsCount} more` : ''}
                  </>
                ) : (
                  'No themes selected yet'
                )}
              </span>
            </div>

            <div className="profile-setting-row-right">
              {interests.length > 0 && (
                <div className="palette-tray" aria-hidden="true">
                  {interests.slice(0, 4).map((cat) => (
                    <img
                      key={cat}
                      src={CATEGORY_METADATA[cat].coverImage}
                      alt=""
                      className="palette-thumb"
                      style={{ width: 28, height: 28 }}
                    />
                  ))}
                </div>
              )}
              <ChevronRight size={18} aria-hidden="true" />
            </div>
          </button>

          {/* Row 2: Discovery Vibe -> opens standalone vibe modal */}
          <button
            type="button"
            className="profile-setting-row"
            onClick={() => setVibeModalOpen(true)}
          >
            <div className="profile-setting-row-main">
              <span className="profile-setting-row-title">Discovery vibe</span>
              <span className="profile-setting-row-sub">
                {getDiscoveryVibeTitle(preferredMix)}
              </span>
            </div>

            <div className="profile-setting-row-right">
              <div className="cadence-bars" aria-hidden="true">
                {activeVibe.bars.map((height, bIdx) => (
                  <span
                    key={bIdx}
                    className="cadence-bar"
                    style={{
                      height: Math.round(height * 0.8),
                      background: 'var(--accent-primary)',
                    }}
                  />
                ))}
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </div>
          </button>

          {/* Row 3: Reader Name & Topic Filters -> opens compact details modal */}
          <button
            type="button"
            className="profile-setting-row"
            onClick={() => setDetailsModalOpen(true)}
          >
            <div className="profile-setting-row-main">
              <span className="profile-setting-row-title">Reader name &amp; topic filters</span>
              <span className="profile-setting-row-sub">
                {displayName.trim() ? displayName.trim() : 'Set your greeting name'}
                {keywordsText.trim() ? ` · Priority: ${keywordsText.trim()}` : ''}
              </span>
            </div>

            <div className="profile-setting-row-right">
              <ChevronRight size={18} aria-hidden="true" />
            </div>
          </button>
        </div>
      </section>

      {/* Reworked Data & Privacy Controls */}
      <section className="curio-card curio-card--padded stack-sm" aria-label="Data and privacy">
        <div className="profile-section-header">
          <span
            className="profile-stat-icon"
            style={{
              background: 'var(--accent-indigo-soft)',
              color: 'var(--accent-indigo)',
            }}
            aria-hidden="true"
          >
            <ShieldCheck size={17} />
          </span>
          <div className="stack-xs" style={{ gap: 2 }}>
            <h2 style={{ fontSize: '1.25rem' }}>Data &amp; Privacy</h2>
            <p className="text-secondary" style={{ fontSize: '0.86rem' }}>
              Private by default — no ad tracking or public profile.
            </p>
          </div>
        </div>

        <div className="profile-privacy-banner">
          <span
            className="profile-privacy-banner-icon"
            style={{
              color: isSignedIn ? 'var(--accent-sage)' : 'var(--accent-ochre)',
            }}
            aria-hidden="true"
          >
            {isSignedIn ? <Cloud size={16} /> : <Smartphone size={16} />}
          </span>
          <div className="profile-privacy-banner-text">
            <strong>
              {isSignedIn
                ? 'Synced privately to your Google account'
                : 'Stored privately on this device'}
            </strong>
            <span>
              {isSignedIn
                ? 'Your interests, saved library, and puzzle progress stay private across your devices.'
                : 'Your interests, saved stories, and puzzle progress stay right here until you choose to sign in.'}
            </span>
          </div>
        </div>

        <div className="profile-settings-list">
          {services.contentRepository.clearCache && (
            <button
              type="button"
              className="profile-setting-row profile-privacy-row"
              onClick={() => void handleClearCache()}
            >
              <span className="profile-privacy-row-icon" aria-hidden="true">
                <RefreshCw size={16} />
              </span>
              <div className="profile-setting-row-main">
                <span className="profile-setting-row-title">Clear cached stories</span>
                <span className="profile-setting-row-sub">
                  Loads fresh discoveries next time. Saved stories and interests stay untouched.
                </span>
              </div>
              <div className="profile-setting-row-right">
                <span className="profile-privacy-action-pill">Clear</span>
              </div>
            </button>
          )}

          <button
            type="button"
            className="profile-setting-row profile-privacy-row"
            onClick={() => setResetModalOpen(true)}
          >
            <span
              className="profile-privacy-row-icon profile-privacy-row-icon--warn"
              aria-hidden="true"
            >
              <RotateCcw size={16} />
            </span>
            <div className="profile-setting-row-main">
              <span className="profile-setting-row-title">Reset recommendations</span>
              <span className="profile-setting-row-sub">
                Clears likes, skips, and topic signals for a fresh start. Your saved library stays safe.
              </span>
            </div>
            <div className="profile-setting-row-right">
              <ChevronRight size={18} aria-hidden="true" />
            </div>
          </button>

          {!isSignedIn && (
            <button
              type="button"
              className="profile-setting-row profile-privacy-row profile-privacy-row--danger"
              onClick={() => setClearGuestModalOpen(true)}
            >
              <span
                className="profile-privacy-row-icon profile-privacy-row-icon--danger"
                aria-hidden="true"
              >
                <UserX size={16} />
              </span>
              <div className="profile-setting-row-main">
                <span className="profile-setting-row-title">Clear local guest profile</span>
                <span className="profile-setting-row-sub">
                  Removes your local name, interests, saved library, mixes, and puzzle progress from this device.
                </span>
              </div>
              <div className="profile-setting-row-right">
                <ChevronRight size={18} aria-hidden="true" />
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Independent Visual Interests Modal */}
      <VisualInterestsModal
        open={interestsModalOpen}
        initialInterests={interests}
        saving={saving}
        onClose={() => setInterestsModalOpen(false)}
        onSave={handleSaveInterests}
      />

      {/* Independent Discovery Vibe Modal */}
      <DiscoveryVibeModal
        open={vibeModalOpen}
        initialMix={preferredMix}
        saving={saving}
        onClose={() => setVibeModalOpen(false)}
        onSave={handleSaveVibe}
      />

      {/* Focused Reader Name & Topic Filters Modal */}
      <ModalDialog
        open={detailsModalOpen}
        title="Reader name & topic filters"
        maxWidth={500}
        onClose={() => setDetailsModalOpen(false)}
      >
        <form onSubmit={(e) => void handleSaveReaderDetails(e)} className="stack-md">
          <div className="stack-xs">
            <label htmlFor="pref-name" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
              Reader name
            </label>
            <input
              id="pref-name"
              type="text"
              className="curio-input"
              maxLength={60}
              placeholder="Optional greeting name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="stack-xs">
            <label htmlFor="pref-keywords" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Priority topics (optional, comma-separated)
            </label>
            <input
              id="pref-keywords"
              type="text"
              className="curio-input"
              placeholder="e.g., neuroscience, japan, linguistics"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
            />
          </div>

          <div className="stack-xs">
            <label htmlFor="pref-excluded" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Topics to skip (optional, comma-separated)
            </label>
            <input
              id="pref-excluded"
              type="text"
              className="curio-input"
              placeholder="Topics you prefer not to see"
              value={excludedText}
              onChange={(e) => setExcludedText(e.target.value)}
            />
          </div>

          <div className="journey-step-actions" style={{ paddingTop: 4 }}>
            <button
              type="submit"
              className="curio-btn curio-btn--accent journey-dock-next"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Reset Recommendations Confirmation Modal */}
      <ModalDialog
        open={resetModalOpen}
        title="Reset personalization signals?"
        onClose={() => setResetModalOpen(false)}
      >
        <p className="text-secondary" style={{ fontSize: '0.93rem' }}>
          This clears your like, skip, and not-interested history and restores default interest
          settings. Your saved library collections will stay intact.
        </p>
        <div className="row-between" style={{ paddingTop: 6 }}>
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            onClick={() => setResetModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="curio-btn curio-btn--accent curio-btn--sm"
            onClick={() => void handleConfirmReset()}
          >
            Confirm reset
          </button>
        </div>
      </ModalDialog>

      {/* Clear Local Guest Profile Confirmation Modal */}
      <ModalDialog
        open={clearGuestModalOpen}
        title="Clear local guest profile?"
        onClose={() => setClearGuestModalOpen(false)}
      >
        <p className="text-secondary" style={{ fontSize: '0.93rem' }}>
          This permanently removes your local reader name, chosen interests, saved library,
          explored mixes, and puzzle progress from this browser.
        </p>
        <div className="row-between" style={{ paddingTop: 6 }}>
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            onClick={() => setClearGuestModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="curio-btn curio-btn--accent curio-btn--sm"
            onClick={() => void handleConfirmClearGuestProfile()}
          >
            Clear guest profile
          </button>
        </div>
      </ModalDialog>
    </main>
  );
}
