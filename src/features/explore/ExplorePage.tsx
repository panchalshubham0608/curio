import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Search } from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import { getFriendlyErrorMessage } from '../../shared/errors/firebaseErrorMapper';
import {
  CATEGORY_METADATA,
  CONTENT_CATEGORIES,
  type ContentCategory,
} from '../../shared/validation/contentSchemas';

interface CuratedCollectionPreset {
  id: string;
  title: string;
  topicFocus: string;
  category: ContentCategory;
  description: string;
}

const CURATED_COLLECTIONS: readonly CuratedCollectionPreset[] = [
  {
    id: 'journey_cosmos',
    title: 'Deep Space & Biological Clocks',
    topicFocus: 'space neuroscience',
    category: 'science',
    description: 'From Voyager’s interstellar whisper to why dreams evaporate upon waking.',
  },
  {
    id: 'journey_models',
    title: 'Sharper Mental Models',
    topicFocus: 'mental models learning',
    category: 'growth',
    description: 'Chesterton’s Fence, Goodhart’s Law, and active retrieval made vivid.',
  },
  {
    id: 'journey_infrastructure',
    title: 'Hidden Engineering Around Us',
    topicFocus: 'infrastructure algorithms ai',
    category: 'technology',
    description: 'Undersea fiber cables, error-correcting QR codes, and compact AI systems.',
  },
  {
    id: 'journey_culinary',
    title: 'Architecture, Taste & Culture',
    topicFocus: 'architecture food history',
    category: 'travel_food',
    description: 'Kyoto’s passive-cooled machiya houses, culinary umami synergy, and global food origins.',
  },
];

/**
 * Visual topic discovery hub — browse themes and curated mixes without clinical timers.
 */
export function ExplorePage() {
  const { userId, services } = useCurioApp();
  const navigate = useNavigate();

  const [customTopic, setCustomTopic] = useState('');
  const [launchingKey, setLaunchingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const launchTopicDeck = async (
    key: string,
    options: { categoryFocus?: ContentCategory; topicFocus?: string }
  ) => {
    setLaunchingKey(key);
    setErrorMsg(null);
    try {
      const result = await services.generateFeed.execute({
        userId,
        durationMinutes: 5,
        categoryFocus: options.categoryFocus,
        topicFocus: options.topicFocus,
      });
      if (result.status === 'ready') {
        navigate(`/session/${result.sessionId}`);
      } else {
        setErrorMsg(result.error?.message ?? 'Could not open that topic right now.');
        setLaunchingKey(null);
      }
    } catch (error: unknown) {
      setErrorMsg(getFriendlyErrorMessage(error, 'firestore'));
      setLaunchingKey(null);
    }
  };

  const handleCustomSubmit = (event: FormEvent) => {
    event.preventDefault();
    const cleaned = customTopic.trim();
    if (cleaned.length < 2) return;
    void launchTopicDeck('custom', { topicFocus: cleaned });
  };

  return (
    <main className="curio-main stack-lg">
      <header className="masthead">
        <span className="curio-eyebrow">Discover</span>
        <h1 className="masthead-headline" style={{ marginTop: 6 }}>
          Explore Themes & Mixes
        </h1>
        <p className="masthead-prompt">
          Follow any curiosity—search a topic, pick a curated mix, or dive into a visual category.
        </p>
      </header>

      {errorMsg && (
        <p role="alert" style={{ color: 'var(--accent-danger)', fontWeight: 500 }}>
          {errorMsg}
        </p>
      )}

      {/* Custom Topic Search */}
      <form
        onSubmit={handleCustomSubmit}
        className="curio-card curio-card--padded stack-sm"
        aria-label="Explore a custom topic"
      >
        <label htmlFor="explore-topic-input" className="curio-eyebrow">
          Jump into any curiosity
        </label>
        <div className="row-wrap" style={{ gap: 10 }}>
          <div style={{ flex: '1 1 240px' }}>
            <input
              id="explore-topic-input"
              type="text"
              className="curio-input"
              maxLength={80}
              placeholder="Try: space, maps, architecture, etymology, sleep, energy…"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              disabled={launchingKey !== null}
            />
          </div>
          <button
            type="submit"
            className="curio-btn curio-btn--primary"
            disabled={customTopic.trim().length < 2 || launchingKey !== null}
          >
            <Search size={15} />
            {launchingKey === 'custom' ? 'Opening…' : 'Explore'}
          </button>
        </div>
      </form>

      {/* Curated Visual Mixes */}
      <section className="stack-sm" aria-label="Curated mixes">
        <div>
          <span className="curio-eyebrow">Editors’ Picks</span>
          <h2 style={{ fontSize: '1.45rem', marginTop: 4 }}>Curated mixes</h2>
        </div>

        <div className="spotlight-grid spotlight-grid--journeys">
          {CURATED_COLLECTIONS.map((mix) => {
            const catMeta = CATEGORY_METADATA[mix.category];
            const isBusy = launchingKey === mix.id;
            return (
              <button
                key={mix.id}
                type="button"
                disabled={launchingKey !== null}
                className="spotlight-card"
                onClick={() =>
                  void launchTopicDeck(mix.id, {
                    categoryFocus: mix.category,
                    topicFocus: mix.topicFocus,
                  })
                }
              >
                <div className="spotlight-media">
                  <img src={catMeta.coverImage} alt={mix.title} loading="lazy" />
                  <span className="spotlight-tag">
                    <Compass size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {catMeta.shortLabel}
                  </span>
                </div>
                <div className="spotlight-content">
                  <h3 style={{ fontSize: '1.12rem' }}>{mix.title}</h3>
                  <p className="text-secondary" style={{ fontSize: '0.87rem' }}>
                    {mix.description}
                  </p>
                  <span
                    className="row-wrap"
                    style={{
                      marginTop: 'auto',
                      paddingTop: 8,
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: catMeta.accentHex,
                    }}
                  >
                    {isBusy ? 'Opening…' : 'Dive in'}
                    <ArrowRight size={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Visual Category Directory */}
      <section className="stack-sm" aria-label="All categories">
        <div>
          <span className="curio-eyebrow">Worlds</span>
          <h2 style={{ fontSize: '1.45rem', marginTop: 4 }}>Browse by theme</h2>
        </div>

        <div className="interest-grid">
          {CONTENT_CATEGORIES.map((categoryId, idx) => {
            const meta = CATEGORY_METADATA[categoryId];
            const isBusy = launchingKey === categoryId;
            return (
              <button
                key={categoryId}
                type="button"
                disabled={launchingKey !== null}
                className="interest-tile"
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => void launchTopicDeck(categoryId, { categoryFocus: categoryId })}
              >
                <img src={meta.coverImage} alt="" loading="lazy" />
                <div className="interest-tile-scrim">
                  <span
                    className="spotlight-tag"
                    style={{ position: 'static', alignSelf: 'flex-start' }}
                  >
                    {isBusy ? 'Opening…' : 'Explore'}
                  </span>
                  <div className="stack-xs" style={{ gap: 3 }}>
                    <h3 style={{ fontSize: '1.08rem', color: '#faf8f4' }}>{meta.shortLabel}</h3>
                    <span
                      className="interest-tile-desc"
                      style={{ fontSize: '0.8rem', color: 'rgba(250, 248, 244, 0.85)' }}
                    >
                      {meta.description}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
