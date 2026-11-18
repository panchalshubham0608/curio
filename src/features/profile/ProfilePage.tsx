import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  LogOut,
  Moon,
  RotateCcw,
  Shield,
  Sun,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import { normalizeTopicList } from '../../domain/user/UserPreferences';
import { getFriendlyErrorMessage } from '../../shared/errors/firebaseErrorMapper';
import { maskDisplayIdentifier } from '../../shared/utils/sanitize';
import {
  CATEGORY_METADATA,
  CONTENT_CATEGORIES,
  CONTENT_MIX_OPTIONS,
  type ContentCategory,
  type ContentMix,
} from '../../shared/validation/contentSchemas';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { ModalDialog } from '../feed/components/ModalDialog';

const MIX_LABELS: Record<ContentMix, string> = {
  quick: 'Quick Sparks',
  balanced: 'Balanced Mix',
  deeper: 'Deep Cuts',
};

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

  const toggleInterest = (category: ContentCategory) => {
    setInterests((prev) => {
      if (prev.includes(category)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatusBanner(null);
    setErrorBanner(null);
    try {
      const updated = await services.updatePreferences.execute(userId, {
        displayName: displayName.trim() || undefined,
        interests,
        topicKeywords: normalizeTopicList(keywordsText),
        excludedTopics: normalizeTopicList(excludedText),
        preferredMix,
        onboardingCompleted: true,
      });
      setPreferencesState(updated);
      setStatusBanner('Preferences updated. Your next mix will reflect these choices.');
    } catch (error: unknown) {
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
      setStatusBanner('Cached discoveries cleared. Fresh cards will load on your next mix.');
    } catch (error: unknown) {
      setErrorBanner(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleSignOut = async () => {
    await signOutAccount();
    navigate('/', { replace: true });
  };

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

          <div className="row-wrap">
            <Link to="/onboarding" className="curio-btn curio-btn--secondary curio-btn--sm">
              <Wand2 size={14} />
              Visual Journey
            </Link>
            <button
              type="button"
              className="curio-btn curio-btn--secondary curio-btn--sm"
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              {theme === 'light' ? 'Evening Ink' : 'Archival Paper'}
            </button>
          </div>
        </div>
        <p className="masthead-prompt">
          You stay in full control of what Curio selects. Update interests, sync with Google,
          or reset your personalization signals anytime.
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

      {/* Editable Preferences Form */}
      <form
        onSubmit={(e) => void handleSave(e)}
        className="curio-card curio-card--padded stack-md"
      >
        <h2 style={{ fontSize: '1.35rem' }}>Personalization Settings</h2>

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
          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Broad interest categories</span>
          <div className="row-wrap">
            {CONTENT_CATEGORIES.map((catId) => {
              const selected = interests.includes(catId);
              return (
                <button
                  key={catId}
                  type="button"
                  aria-pressed={selected}
                  className={`curio-chip curio-chip--selectable ${
                    selected ? 'curio-chip--selected' : ''
                  }`}
                  onClick={() => toggleInterest(catId)}
                >
                  {selected && <Check size={13} aria-hidden="true" />}
                  {CATEGORY_METADATA[catId].shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="stack-xs">
          <label htmlFor="pref-keywords" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
            Topic keywords to prioritize (comma-separated)
          </label>
          <input
            id="pref-keywords"
            type="text"
            className="curio-input"
            placeholder="e.g., neuroscience, japan, linguistics, clean energy"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
          />
        </div>

        <div className="stack-xs">
          <label htmlFor="pref-excluded" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
            Excluded topics (comma-separated)
          </label>
          <input
            id="pref-excluded"
            type="text"
            className="curio-input"
            placeholder="Topics you never want Curio to include"
            value={excludedText}
            onChange={(e) => setExcludedText(e.target.value)}
          />
        </div>

        <div className="stack-xs">
          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Preferred feed vibe</span>
          <div className="row-wrap">
            {CONTENT_MIX_OPTIONS.map((mix) => (
              <button
                key={mix}
                type="button"
                aria-pressed={preferredMix === mix}
                className={`curio-chip curio-chip--selectable ${
                  preferredMix === mix ? 'curio-chip--selected' : ''
                }`}
                onClick={() => setPreferredMix(mix)}
              >
                {MIX_LABELS[mix]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button type="submit" className="curio-btn curio-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>

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
