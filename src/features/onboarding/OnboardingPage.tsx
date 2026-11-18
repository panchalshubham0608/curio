import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import { getFriendlyErrorMessage } from '../../shared/errors/firebaseErrorMapper';
import {
  CATEGORY_METADATA,
  type ContentCategory,
  type ContentMix,
} from '../../shared/validation/contentSchemas';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { DiscoveryVibePicker } from '../preferences/components/DiscoveryVibePicker';
import { InterestGalleryPicker } from '../preferences/components/InterestGalleryPicker';
import { getDiscoveryVibeTitle } from '../preferences/discoveryVibeOptions';

/**
 * Interactive 3-step Profile & Interest Creation Journey with visual category photography,
 * spring micro-animations, discovery vibe selection, and live preview card.
 */
export function OnboardingPage() {
  const {
    userId,
    authUser,
    isSignedIn,
    authError,
    services,
    preferences,
    setPreferencesState,
  } = useCurioApp();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [guestOptedIn, setGuestOptedIn] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState(
    preferences?.displayName ?? authUser?.displayName?.split(/\s+/)[0] ?? ''
  );
  const [selectedInterests, setSelectedInterests] = useState<ContentCategory[]>(
    preferences?.interests ?? ['science', 'technology', 'facts', 'history']
  );
  const [preferredMix, setPreferredMix] = useState<ContentMix>(
    preferences?.preferredMix ?? 'balanced'
  );
  const [launchingFirst, setLaunchingFirst] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canPersonalizeName = isSignedIn || guestOptedIn;

  // Populate reader's first name automatically right after Google sign-in if not typed yet
  const googleFirstName = authUser?.displayName?.split(/\s+/)[0] ?? '';
  const displayedNameInput = displayName || (isSignedIn ? googleFirstName : '');

  const toggleInterest = (category: ContentCategory) => {
    setSelectedInterests((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const persistProfile = async () => {
    if (selectedInterests.length === 0) {
      setErrorMsg('Pick at least one visual theme to craft your feed.');
      setStep(2);
      return null;
    }

    const updated = await services.updatePreferences.execute(userId, {
      displayName: displayedNameInput.trim() || undefined,
      interests: selectedInterests,
      preferredMix,
      onboardingCompleted: true,
    });
    setPreferencesState(updated);
    return updated;
  };

  const handleSaveAndLaunchSession = async () => {
    setLaunchingFirst(true);
    setErrorMsg(null);
    try {
      const saved = await persistProfile();
      if (!saved) {
        setLaunchingFirst(false);
        return;
      }
      const result = await services.generateFeed.execute({
        userId,
        durationMinutes: 5,
      });
      if (result.status === 'ready') {
        navigate(`/session/${result.sessionId}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error: unknown) {
      setErrorMsg(getFriendlyErrorMessage(error, 'firestore'));
      setLaunchingFirst(false);
    }
  };

  const progressPercent = (step / 3) * 100;
  const effectiveName = displayedNameInput.trim() || 'Curious Reader';
  const activeMixLabel = getDiscoveryVibeTitle(preferredMix);

  return (
    <div className="journey-shell">
      <header className="journey-header">
        {step > 1 ? (
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back</span>
          </button>
        ) : (
          <Link to="/" className="curio-brand" aria-label="Curio Home">
            <img
              src="/curio-icon.svg"
              alt=""
              className="curio-brand-mark"
              width={28}
              height={28}
            />
            <span className="curio-brand-title">Curio</span>
          </Link>
        )}

        <span className="mono-meta">Step {step} of 3</span>

        <Link to="/" className="curio-btn curio-btn--ghost curio-btn--sm">
          <X size={15} />
          <span>Home</span>
        </Link>
      </header>

      <div
        className="journey-rail"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={3}
      >
        <div className="journey-rail-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <main className="journey-stage">
        {errorMsg && (
          <div
            role="alert"
            className="curio-card curio-card--padded"
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderColor: 'var(--accent-danger)',
              background: 'var(--accent-danger-soft)',
              color: 'var(--accent-danger)',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Sign in with Google first, then personalize reader name */}
        {step === 1 && (
          <section key="step-1" className="curio-card curio-card--padded stack-lg journey-panel">
            <div className="stack-xs">
              <span className="curio-eyebrow row-wrap" style={{ gap: 6 }}>
                <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                Profile Setup · Step 1
              </span>
              <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.35rem)' }}>
                {isSignedIn
                  ? `Welcome${googleFirstName ? `, ${googleFirstName}` : ''}!`
                  : 'Let’s set up your personal Curio profile.'}
              </h1>
              <p className="text-secondary" style={{ maxWidth: '58ch' }}>
                {isSignedIn
                  ? 'Confirm how you’d like Curio to greet you, then pick the topics that spark your curiosity.'
                  : 'Sign in with Google to save your interests, bookmarks, and reflections across all your devices.'}
              </p>
            </div>

            {!isSignedIn ? (
              <div className="stack-md">
                <div
                  className="timeline-card stack-sm"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <div className="row-between">
                    <div className="stack-xs">
                      <strong>Sign in with your Google account</strong>
                      <span className="text-muted" style={{ fontSize: '0.86rem' }}>
                        Your interests, saved collections, and feed vibe stay seamlessly synced.
                      </span>
                    </div>
                    <GoogleSignInButton
                      label="Continue with Google"
                      redirectToOnboardingIfNew={false}
                    />
                  </div>
                  {authError && (
                    <p role="alert" style={{ color: 'var(--accent-ochre)', fontSize: '0.84rem' }}>
                      {authError}
                    </p>
                  )}
                </div>

                {guestOptedIn && (
                  <div className="stack-xs fade-in-card" style={{ maxWidth: 440 }}>
                    <label htmlFor="journey-name" style={{ fontWeight: 600, fontSize: '0.94rem' }}>
                      What should Curio call you?
                    </label>
                    <input
                      id="journey-name"
                      type="text"
                      className="curio-input"
                      maxLength={60}
                      placeholder="Your first name or nickname"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                )}

                <div className="journey-step-actions" style={{ paddingTop: 4 }}>
                  {!guestOptedIn && (
                    <button
                      type="button"
                      className="curio-btn curio-btn--ghost"
                      onClick={() => setGuestOptedIn(true)}
                    >
                      Continue without signing in
                    </button>
                  )}

                  {canPersonalizeName && (
                    <button
                      type="button"
                      className="curio-btn curio-btn--accent journey-dock-next"
                      onClick={() => setStep(2)}
                    >
                      <span>Choose visual interests</span>
                      <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="stack-md fade-in-card">
                <div
                  className="timeline-card row-between"
                  style={{
                    background: 'var(--accent-sage-soft)',
                    borderColor: 'var(--accent-sage)',
                  }}
                >
                  <div className="row-wrap" style={{ gap: 10 }}>
                    {authUser?.photoURL && (
                      <img
                        src={authUser.photoURL}
                        alt=""
                        className="account-avatar"
                        style={{ width: 36, height: 36 }}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="stack-xs" style={{ gap: 2 }}>
                      <strong style={{ color: 'var(--accent-sage)' }}>
                        Signed in as {authUser?.displayName ?? 'Reader'}
                      </strong>
                      <span className="mono-meta">Synced across your devices</span>
                    </div>
                  </div>
                  <Check size={18} style={{ color: 'var(--accent-sage)' }} />
                </div>

                <div className="stack-xs" style={{ maxWidth: 440 }}>
                  <label htmlFor="journey-name" style={{ fontWeight: 600, fontSize: '0.94rem' }}>
                    What should Curio call you?
                  </label>
                  <input
                    id="journey-name"
                    type="text"
                    className="curio-input"
                    maxLength={60}
                    placeholder="Your first name or nickname"
                    value={displayedNameInput}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className="journey-step-actions" style={{ paddingTop: 4 }}>
                  <button
                    type="button"
                    className="curio-btn curio-btn--accent journey-dock-next"
                    onClick={() => setStep(2)}
                  >
                    <span>Choose visual interests</span>
                    <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* STEP 2: Interactive Visual Interest Gallery */}
        {step === 2 && (
          <section key="step-2" className="stack-md journey-panel">
            <div className="stack-xs">
              <span className="curio-eyebrow">Step 2 · Visual Interest Gallery</span>
              <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.35rem)' }}>
                What sparks your curiosity?
              </h1>
              <p className="text-secondary">
                Tap the worlds you love exploring. Curio blends your picks with occasional
                surprising detours so your feed always feels fresh.
              </p>
            </div>

            <InterestGalleryPicker
              selectedInterests={selectedInterests}
              onToggle={toggleInterest}
            />

            {/* Live Curiosity Palette Dock (sticks to bottom thumb zone on mobile) */}
            <div className="curio-card journey-sticky-footer journey-dock">
              <div className="journey-dock-summary">
                <div className="palette-tray" aria-hidden="true">
                  {selectedInterests.slice(0, 5).map((cat) => (
                    <img
                      key={cat}
                      src={CATEGORY_METADATA[cat].coverImage}
                      alt=""
                      className="palette-thumb"
                    />
                  ))}
                </div>
                <div className="journey-dock-meta">
                  <strong>
                    {selectedInterests.length} theme{selectedInterests.length === 1 ? '' : 's'}{' '}
                    selected
                  </strong>
                  <span className="mono-meta">
                    {selectedInterests.length >= 3
                      ? 'Good selection — great variety'
                      : 'Pick 3+ for more variety'}
                  </span>
                </div>
              </div>

              <div className="journey-dock-actions">
                <button
                  type="button"
                  className="curio-btn curio-btn--accent journey-dock-next"
                  disabled={selectedInterests.length === 0}
                  onClick={() => {
                    setErrorMsg(null);
                    setStep(3);
                  }}
                >
                  <span>Pick your discovery vibe</span>
                  <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: Discovery Vibe + Live Preview */}
        {step === 3 && (
          <section key="step-3" className="stack-lg journey-panel">
            <div className="curio-card curio-card--padded stack-md">
              <div className="stack-xs">
                <span className="curio-eyebrow">Step 3 · Discovery Vibe</span>
                <h1 style={{ fontSize: 'clamp(1.65rem, 3.8vw, 2.2rem)' }}>
                  Choose your favorite feed vibe
                </h1>
                <p className="text-secondary">
                  Pick the kind of discoveries you reach for most often. You can update this
                  anytime in Profile.
                </p>
              </div>

              <DiscoveryVibePicker value={preferredMix} onChange={setPreferredMix} />
            </div>

            {/* Live Editorial Reader Pass Preview */}
            <aside className="reader-pass" aria-label="Your personalized feed preview">
              <div className="row-between">
                <div className="row-wrap" style={{ gap: 10 }}>
                  <img
                    src="/curio-icon.svg"
                    alt=""
                    width={32}
                    height={32}
                    style={{ borderRadius: 8 }}
                  />
                  <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem' }}>
                    {effectiveName}
                  </strong>
                </div>
                <span
                  className="curio-chip"
                  style={{
                    background: 'rgba(250, 248, 244, 0.12)',
                    borderColor: 'rgba(250, 248, 244, 0.2)',
                    color: '#faf8f4',
                  }}
                >
                  {activeMixLabel}
                </span>
              </div>

              <div className="reader-pass-strip">
                {selectedInterests.slice(0, 4).map((cat) => (
                  <img
                    key={cat}
                    src={CATEGORY_METADATA[cat].coverImage}
                    alt={CATEGORY_METADATA[cat].shortLabel}
                  />
                ))}
              </div>

              <div className="row-between">
                <span style={{ fontSize: '0.84rem', color: 'rgba(250, 248, 244, 0.76)' }}>
                  {selectedInterests.map((c) => CATEGORY_METADATA[c].shortLabel).join(' · ')}
                </span>
                <span className="mono-meta" style={{ color: 'rgba(250, 248, 244, 0.68)' }}>
                  {isSignedIn ? 'Cloud Synced' : 'Local Mode'}
                </span>
              </div>
            </aside>

            <div className="journey-step-actions">
              <button
                type="button"
                className="curio-btn curio-btn--accent journey-dock-next"
                disabled={launchingFirst}
                onClick={() => void handleSaveAndLaunchSession()}
              >
                <span>{launchingFirst ? 'Curating…' : 'Start discovering'}</span>
                <ArrowRight size={16} className="btn-arrow" aria-hidden="true" />
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
