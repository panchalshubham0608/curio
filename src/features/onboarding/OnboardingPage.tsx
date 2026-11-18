import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import { normalizeTopicList } from '../../domain/user/UserPreferences';
import { getFriendlyErrorMessage } from '../../shared/errors/firebaseErrorMapper';
import {
  CATEGORY_METADATA,
  CONTENT_CATEGORIES,
  type ContentCategory,
  type ContentMix,
} from '../../shared/validation/contentSchemas';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';

const MIX_OPTIONS: ReadonlyArray<{
  id: ContentMix;
  title: string;
  subtitle: string;
  bars: number[];
}> = [
  {
    id: 'quick',
    title: 'Quick Sparks',
    subtitle: 'Crisp bite-sized facts, tap-to-reveal twists, and playful quizzes.',
    bars: [9, 12, 10, 14, 11],
  },
  {
    id: 'balanced',
    title: 'Balanced Mix',
    subtitle: 'A magazine blend of quick insights, visual timelines, and short stories.',
    bars: [10, 18, 13, 22, 14],
  },
  {
    id: 'deeper',
    title: 'Deep Cuts',
    subtitle: 'Rich historical narratives, structured comparisons, and mental models.',
    bars: [16, 22, 20, 24, 19],
  },
];

const QUICK_EXCLUSIONS = ['politics', 'celebrity gossip', 'crypto', 'sports'];

/**
 * Interactive 4-step Profile & Interest Creation Journey with visual category photography,
 * spring micro-animations, dynamic sub-topic discovery pills, and live Reader Pass reveal.
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

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [guestOptedIn, setGuestOptedIn] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState(
    preferences?.displayName ?? authUser?.displayName?.split(/\s+/)[0] ?? ''
  );
  const [selectedInterests, setSelectedInterests] = useState<ContentCategory[]>(
    preferences?.interests ?? ['science', 'technology', 'facts', 'history']
  );
  const [selectedSubTopics, setSelectedSubTopics] = useState<string[]>(
    preferences?.topicKeywords ?? []
  );
  const [customKeywordsText, setCustomKeywordsText] = useState('');
  const [excludedTopics, setExcludedTopics] = useState<string[]>(
    preferences?.excludedTopics ?? []
  );
  const [preferredMix, setPreferredMix] = useState<ContentMix>(
    preferences?.preferredMix ?? 'balanced'
  );
  const [saving, setSaving] = useState(false);
  const [launchingFirst, setLaunchingFirst] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canPersonalizeName = isSignedIn || guestOptedIn;

  // Populate reader's first name automatically right after Google sign-in if not typed yet
  const googleFirstName = authUser?.displayName?.split(/\s+/)[0] ?? '';
  const displayedNameInput = displayName || (isSignedIn ? googleFirstName : '');

  const availableSubTopics = useMemo(() => {
    const topics: Array<{ topic: string; category: ContentCategory }> = [];
    const seen = new Set<string>();
    for (const cat of selectedInterests) {
      for (const topic of CATEGORY_METADATA[cat].suggestedTopics) {
        if (!seen.has(topic)) {
          seen.add(topic);
          topics.push({ topic, category: cat });
        }
      }
    }
    return topics;
  }, [selectedInterests]);

  const toggleInterest = (category: ContentCategory) => {
    setSelectedInterests((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const toggleSubTopic = (topic: string) => {
    setSelectedSubTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((item) => item !== topic)
        : [...prev, topic]
    );
  };

  const toggleExclusion = (topic: string) => {
    setExcludedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((item) => item !== topic)
        : [...prev, topic]
    );
  };

  const persistProfile = async () => {
    if (selectedInterests.length === 0) {
      setErrorMsg('Pick at least one visual theme to craft your feed.');
      setStep(2);
      return null;
    }

    const mergedKeywords = Array.from(
      new Set([...selectedSubTopics, ...normalizeTopicList(customKeywordsText)])
    ).slice(0, 30);

    const updated = await services.updatePreferences.execute(userId, {
      displayName: displayedNameInput.trim() || undefined,
      interests: selectedInterests,
      topicKeywords: mergedKeywords,
      excludedTopics,
      preferredMix,
      onboardingCompleted: true,
    });
    setPreferencesState(updated);
    return updated;
  };

  const handleSaveAndGoHome = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const saved = await persistProfile();
      if (saved) navigate('/', { replace: true });
    } catch (error: unknown) {
      setErrorMsg(getFriendlyErrorMessage(error, 'firestore'));
    } finally {
      setSaving(false);
    }
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

  const progressPercent = (step / 4) * 100;
  const effectiveName = displayedNameInput.trim() || 'Curious Reader';
  const activeMixLabel =
    MIX_OPTIONS.find((option) => option.id === preferredMix)?.title ?? 'Balanced Mix';

  return (
    <div className="journey-shell">
      <header className="journey-header">
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

        <span className="mono-meta">Step {step} of 4</span>

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
        aria-valuemax={4}
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

                <div className="row-between" style={{ paddingTop: 4 }}>
                  {!guestOptedIn ? (
                    <button
                      type="button"
                      className="curio-btn curio-btn--ghost"
                      onClick={() => setGuestOptedIn(true)}
                    >
                      Continue without signing in
                    </button>
                  ) : (
                    <Link to="/" className="curio-btn curio-btn--ghost">
                      Back to Home
                    </Link>
                  )}

                  {canPersonalizeName && (
                    <button
                      type="button"
                      className="curio-btn curio-btn--primary"
                      onClick={() => setStep(2)}
                    >
                      Choose visual interests
                      <ArrowRight size={16} />
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

                <div className="row-between" style={{ paddingTop: 4 }}>
                  <Link to="/" className="curio-btn curio-btn--ghost">
                    Skip for now
                  </Link>
                  <button
                    type="button"
                    className="curio-btn curio-btn--primary"
                    onClick={() => setStep(2)}
                  >
                    Choose visual interests
                    <ArrowRight size={16} />
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
                surprising detours so sessions never feel stale.
              </p>
            </div>

            <div className="interest-grid">
              {CONTENT_CATEGORIES.map((categoryId, idx) => {
                const meta = CATEGORY_METADATA[categoryId];
                const isSelected = selectedInterests.includes(categoryId);
                return (
                  <button
                    key={categoryId}
                    type="button"
                    aria-pressed={isSelected}
                    className={`interest-tile ${isSelected ? 'interest-tile--selected' : ''}`}
                    style={{ animationDelay: `${idx * 45}ms` }}
                    onClick={() => toggleInterest(categoryId)}
                  >
                    <img src={meta.coverImage} alt="" loading="lazy" />
                    <div className="interest-tile-scrim">
                      <span className="interest-check-badge" aria-hidden="true">
                        {isSelected ? <Check size={15} strokeWidth={3} /> : null}
                      </span>
                      <div className="stack-xs" style={{ gap: 3 }}>
                        <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem' }}>
                          {meta.shortLabel}
                        </strong>
                        <span
                          className="interest-tile-desc"
                          style={{
                            fontSize: '0.79rem',
                            color: 'rgba(250, 248, 244, 0.84)',
                            lineHeight: 1.32,
                          }}
                        >
                          {meta.description}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Curiosity Palette Bar (sticks to bottom thumb zone on mobile) */}
            <div className="curio-card curio-card--padded row-between journey-sticky-footer" style={{ padding: '14px 18px' }}>
              <div className="row-wrap" style={{ gap: 12 }}>
                <div className="palette-tray" aria-hidden="true">
                  {selectedInterests.slice(0, 6).map((cat) => (
                    <img
                      key={cat}
                      src={CATEGORY_METADATA[cat].coverImage}
                      alt=""
                      className="palette-thumb"
                    />
                  ))}
                </div>
                <div className="stack-xs" style={{ gap: 2 }}>
                  <strong style={{ fontSize: '0.92rem' }}>
                    {selectedInterests.length} theme{selectedInterests.length === 1 ? '' : 's'}{' '}
                    selected
                  </strong>
                  <span className="mono-meta">
                    {selectedInterests.length >= 3
                      ? 'Great variety for balanced editions'
                      : 'Pick 3+ for maximum variety'}
                  </span>
                </div>
              </div>

              <div className="row-wrap">
                <button
                  type="button"
                  className="curio-btn curio-btn--ghost"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  className="curio-btn curio-btn--primary"
                  disabled={selectedInterests.length === 0}
                  onClick={() => {
                    setErrorMsg(null);
                    setStep(3);
                  }}
                >
                  Fine-tune topics
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: Interactive Sub-Topic Chips & Exclusions */}
        {step === 3 && (
          <section key="step-3" className="curio-card curio-card--padded stack-lg journey-panel">
            <div className="stack-xs">
              <span className="curio-eyebrow">Step 3 · Fine-Tune Your Curiosity</span>
              <h1 style={{ fontSize: 'clamp(1.65rem, 3.8vw, 2.2rem)' }}>
                Pick favorite threads (optional)
              </h1>
              <p className="text-secondary">
                Tap specific topics from your chosen themes to boost them higher in your editions.
              </p>
            </div>

            <div className="row-wrap" style={{ gap: 9 }}>
              {availableSubTopics.map(({ topic }) => {
                const active = selectedSubTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={active}
                    className={`curio-chip curio-chip--selectable ${
                      active ? 'curio-chip--selected' : ''
                    }`}
                    onClick={() => toggleSubTopic(topic)}
                  >
                    {active && <Check size={13} aria-hidden="true" />}
                    <span>{topic}</span>
                  </button>
                );
              })}
            </div>

            <div className="stack-xs">
              <label htmlFor="journey-custom-kw" style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                Add your own keywords (comma-separated)
              </label>
              <input
                id="journey-custom-kw"
                type="text"
                className="curio-input"
                placeholder="e.g., typography, deep sea, linguistics, urbanism"
                value={customKeywordsText}
                onChange={(e) => setCustomKeywordsText(e.target.value)}
              />
            </div>

            <div className="stack-xs">
              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                Anything you’d rather skip?
              </span>
              <div className="row-wrap">
                {QUICK_EXCLUSIONS.map((term) => {
                  const active = excludedTopics.includes(term);
                  return (
                    <button
                      key={term}
                      type="button"
                      aria-pressed={active}
                      className={`curio-chip curio-chip--selectable ${
                        active ? 'curio-chip--selected' : ''
                      }`}
                      onClick={() => toggleExclusion(term)}
                    >
                      {active ? `Excluded: ${term}` : `Hide ${term}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="row-between">
              <button
                type="button"
                className="curio-btn curio-btn--ghost"
                onClick={() => setStep(2)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                type="button"
                className="curio-btn curio-btn--primary"
                onClick={() => setStep(4)}
              >
                Pick your discovery vibe
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        {/* STEP 4: Discovery Vibe + Live Reader Pass Reveal */}
        {step === 4 && (
          <section key="step-4" className="stack-lg journey-panel">
            <div className="curio-card curio-card--padded stack-md">
              <div className="stack-xs">
                <span className="curio-eyebrow">Step 4 · Discovery Vibe</span>
                <h1 style={{ fontSize: 'clamp(1.65rem, 3.8vw, 2.2rem)' }}>
                  Choose your favorite feed vibe
                </h1>
                <p className="text-secondary">
                  Pick the kind of discoveries you reach for most often. You can switch vibes
                  anytime right on Home.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {MIX_OPTIONS.map((option) => {
                  const active = preferredMix === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      className={`entry-card ${active ? 'entry-card--active' : ''}`}
                      style={{
                        borderColor: active ? 'var(--accent-primary)' : undefined,
                        background: active ? 'var(--accent-primary-soft)' : undefined,
                      }}
                      onClick={() => setPreferredMix(option.id)}
                    >
                      <div className="row-between" style={{ width: '100%' }}>
                        <strong>{option.title}</strong>
                        <div className="cadence-bars" aria-hidden="true">
                          {option.bars.map((height, bIdx) => (
                            <span
                              key={bIdx}
                              className="cadence-bar"
                              style={{ height }}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-secondary" style={{ fontSize: '0.86rem' }}>
                        {option.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Editorial Reader Pass Preview */}
            <aside className="reader-pass" aria-label="Your personalized reader pass">
              <div className="row-between">
                <div className="row-wrap" style={{ gap: 10 }}>
                  <img
                    src="/curio-icon.svg"
                    alt=""
                    width={32}
                    height={32}
                    style={{ borderRadius: 8 }}
                  />
                  <div className="stack-xs" style={{ gap: 2 }}>
                    <span
                      className="curio-eyebrow"
                      style={{ color: 'rgba(250, 248, 244, 0.72)' }}
                    >
                      Curio Reader Pass
                    </span>
                    <strong style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem' }}>
                      {effectiveName}
                    </strong>
                  </div>
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

            <div className="row-between">
              <button
                type="button"
                className="curio-btn curio-btn--ghost"
                onClick={() => setStep(3)}
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <div className="row-wrap" style={{ gap: 10 }}>
                <button
                  type="button"
                  className="curio-btn curio-btn--secondary"
                  disabled={saving || launchingFirst}
                  onClick={() => void handleSaveAndGoHome()}
                >
                  {saving ? 'Saving…' : 'Go to Home feed'}
                </button>
                <button
                  type="button"
                  className="curio-btn curio-btn--accent"
                  disabled={saving || launchingFirst}
                  onClick={() => void handleSaveAndLaunchSession()}
                >
                  {launchingFirst ? 'Curating your first mix…' : 'Start discovering'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
