import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  LogOut,
  Moon,
  RotateCcw,
  Shield,
  Sun,
  Trash2,
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

export function ProfilePage() {
  const {
    userId,
    authUser,
    isSignedIn,
    authBusy,
    authError,
    signOutAccount,
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
  const [saving, setSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [interestsModalOpen, setInterestsModalOpen] = useState(false);
  const [vibeModalOpen, setVibeModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

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
        const [overview, library] = await Promise.all([
          services.getFeed.execute(userId),
          services.getSavedLibrary.execute(userId),
        ]);
        if (!mounted) return;
        setCompletedSessions(overview.completedSessionsCount);
        setSavedItemsCount(library.entries.length);
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

  return (
    <main className="curio-main curio-main--reading stack-lg">
      <header className="masthead">
        <div className="row-between">
          <div>
            <span className="curio-eyebrow">Editorial Controls</span>
            <h1 className="masthead-headline" style={{ marginTop: 6 }}>
              Preferences & Profile
            </h1>
          </div>

          <button
            type="button"
            className="curio-btn curio-btn--secondary curio-btn--sm"
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            {theme === 'light' ? 'Evening Ink' : 'Archival Paper'}
          </button>
        </div>
        <p className="masthead-prompt">
          You stay in full control of what Curio selects. Update interests, choose your vibe,
          sync with Google, or reset your personalization signals anytime.
        </p>
      </header>

      {/* Google Account & Cloud Sync Card */}
      <section className="curio-card curio-card--padded stack-sm" aria-label="Account and sync">
        <div className="row-between">
          <div className="row-wrap" style={{ gap: 12 }}>
            {authUser?.photoURL ? (
              <img
                src={authUser.photoURL}
                alt=""
                className="account-avatar"
                style={{ width: 44, height: 44 }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="account-avatar"
                style={{ width: 44, height: 44, fontSize: '1.15rem' }}
                aria-hidden="true"
              >
                {(displayName || 'C').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="stack-xs" style={{ gap: 2 }}>
              <strong style={{ fontSize: '1.05rem' }}>
                {isSignedIn ? (authUser?.displayName ?? 'Signed-in Reader') : 'Guest Local Reader'}
              </strong>
              <span className="mono-meta">
                {isSignedIn && authUser?.email
                  ? `${maskDisplayIdentifier(authUser.email)} · Synced across devices`
                  : 'Sign in with Google to sync your profile and saved library'}
              </span>
            </div>
          </div>

          {isSignedIn ? (
            <button
              type="button"
              className="curio-btn curio-btn--secondary curio-btn--sm"
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
        {authError && (
          <p role="alert" style={{ color: 'var(--accent-ochre)', fontSize: '0.86rem' }}>
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

      {/* Healthy Personal Discovery Metrics */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
        }}
        aria-label="Personal discovery overview"
      >
        <div className="curio-card curio-card--padded stack-xs" style={{ padding: 18 }}>
          <span className="curio-eyebrow">Mixes Explored</span>
          <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem' }}>
            {completedSessions}
          </strong>
        </div>
        <div className="curio-card curio-card--padded stack-xs" style={{ padding: 18 }}>
          <span className="curio-eyebrow">Discoveries Saved</span>
          <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem' }}>
            {savedItemsCount}
          </strong>
        </div>
        <div className="curio-card curio-card--padded stack-xs" style={{ padding: 18 }}>
          <span className="curio-eyebrow">Active Interests</span>
          <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem' }}>
            {interests.length} / {CONTENT_CATEGORIES.length}
          </strong>
        </div>
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
                {interestsSummary}
                {extraInterestsCount > 0 ? ` +${extraInterestsCount} more` : ''}
              </span>
            </div>

            <div className="profile-setting-row-right">
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

      {/* Data & Privacy Controls */}
      <section className="curio-card curio-card--padded stack-sm">
        <div className="row-wrap" style={{ gap: 7 }}>
          <Shield size={16} style={{ color: 'var(--accent-indigo)' }} aria-hidden="true" />
          <h2 style={{ fontSize: '1.2rem' }}>Data & Privacy</h2>
        </div>

        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          {services.mode === 'firebase'
            ? 'Your interests, history, and saved collections are synced privately to your account.'
            : 'Your interests and saved collections are currently stored privately on this device.'}
        </p>

        <div className="row-wrap" style={{ paddingTop: 6 }}>
          {services.contentRepository.clearCache && (
            <button
              type="button"
              className="curio-btn curio-btn--secondary curio-btn--sm"
              onClick={() => void handleClearCache()}
            >
              <Trash2 size={14} />
              Clear cached stories
            </button>
          )}

          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            style={{ color: 'var(--accent-danger)' }}
            onClick={() => setResetModalOpen(true)}
          >
            <RotateCcw size={14} />
            Reset recommendations
          </button>
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

      {/* Reset Confirmation Modal */}
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
    </main>
  );
}
