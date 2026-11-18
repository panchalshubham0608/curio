import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { useCurioApp } from '../../app/providers/appContext';
import type { ResolvedSavedEntry } from '../../application/library/SavedLibraryUseCases';
import { getFriendlyErrorMessage } from '../../shared/errors/firebaseErrorMapper';
import { formatEditorialDate } from '../../shared/utils/time';
import {
  CATEGORY_METADATA,
  type ContentCategory,
  type ContentRecord,
  type SavedCollection,
} from '../../shared/validation/contentSchemas';
import { DiscoveryCardDispatcher } from '../feed/components/DiscoveryCardDispatcher';
import { ModalDialog } from '../feed/components/ModalDialog';

export function LibraryPage() {
  const { userId, services } = useCurioApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [entries, setEntries] = useState<ResolvedSavedEntry[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [activeRecord, setActiveRecord] = useState<ContentRecord | null>(null);

  const [newColOpen, setNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const snapshot = await services.getSavedLibrary.execute(userId);
      setCollections(snapshot.collections);
      setEntries(snapshot.entries);
    } catch (error: unknown) {
      setPageError(getFriendlyErrorMessage(error, 'firestore'));
    } finally {
      setLoading(false);
    }
  }, [services, userId]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const filteredEntries = useMemo(() => {
    if (selectedCollectionId === 'all') return entries;
    return entries.filter((e) => e.savedItem.collectionId === selectedCollectionId);
  }, [entries, selectedCollectionId]);

  const handleCreateCollection = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newColName.trim();
    if (trimmed.length < 2) {
      setFormError('Collection name must be at least 2 characters.');
      return;
    }
    try {
      await services.saveContent.createCollection(userId, trimmed, newColDesc.trim());
      setNewColName('');
      setNewColDesc('');
      setFormError(null);
      setNewColOpen(false);
      await loadLibrary();
    } catch (error: unknown) {
      setFormError(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleMoveCollection = async (record: ContentRecord, nextCollectionId: string) => {
    setPageError(null);
    try {
      await services.saveContent.save(userId, record, nextCollectionId);
      await loadLibrary();
    } catch (error: unknown) {
      setPageError(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  const handleRemoveSaved = async (contentId: string) => {
    setPageError(null);
    try {
      await services.saveContent.remove(userId, contentId);
      if (activeRecord?.id === contentId) {
        setActiveRecord(null);
      }
      await loadLibrary();
    } catch (error: unknown) {
      setPageError(getFriendlyErrorMessage(error, 'firestore'));
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
        setPageError(result.error.message);
      }
    } catch (error: unknown) {
      setPageError(getFriendlyErrorMessage(error, 'firestore'));
    }
  };

  // Interactive Detail View for any saved discovery
  if (activeRecord) {
    return (
      <main className="curio-main curio-main--reading stack-md">
        <div className="row-between">
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            onClick={() => setActiveRecord(null)}
          >
            <ArrowLeft size={15} />
            Back to Saved Library
          </button>
        </div>

        <DiscoveryCardDispatcher
          record={activeRecord}
          handlers={{
            onStartRabbitHole: (topic, category) =>
              void handleStartRabbitHole(topic, category),
          }}
        />
      </main>
    );
  }

  return (
    <main className="curio-main stack-lg">
      <header className="masthead">
        <div className="row-between">
          <div>
            <span className="curio-eyebrow">Personal Archive</span>
            <h1 className="masthead-headline" style={{ marginTop: 6 }}>
              Saved Library
            </h1>
          </div>
          <button
            type="button"
            className="curio-btn curio-btn--secondary curio-btn--sm"
            onClick={() => setNewColOpen(true)}
          >
            <FolderPlus size={15} />
            New collection
          </button>
        </div>
        <p className="masthead-prompt">
          Ideas, articles, and interactive explainers you chose to keep—organized cleanly by
          collection.
        </p>
      </header>

      {pageError && (
        <div
          role="alert"
          className="curio-card curio-card--padded"
          style={{
            padding: '14px 18px',
            borderColor: 'var(--accent-danger)',
            background: 'var(--accent-danger-soft)',
            color: 'var(--accent-danger)',
          }}
        >
          {pageError}
        </div>
      )}

      {/* Collection Filters */}
      <div className="tabs-scroll-strip" role="tablist" aria-label="Collections">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCollectionId === 'all'}
          className={`curio-chip curio-chip--selectable ${
            selectedCollectionId === 'all' ? 'curio-chip--selected' : ''
          }`}
          style={{ flexShrink: 0 }}
          onClick={() => setSelectedCollectionId('all')}
        >
          All Saved ({entries.length})
        </button>

        {collections.map((col) => {
          const count = entries.filter((e) => e.savedItem.collectionId === col.id).length;
          const active = selectedCollectionId === col.id;
          return (
            <button
              key={col.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`curio-chip curio-chip--selectable ${
                active ? 'curio-chip--selected' : ''
              }`}
              style={{ flexShrink: 0 }}
              onClick={() => setSelectedCollectionId(col.id)}
            >
              {col.name} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="stack-sm">
          <div className="skeleton" style={{ height: 110 }} />
          <div className="skeleton" style={{ height: 110 }} />
        </div>
      ) : filteredEntries.length === 0 ? (
        <section className="curio-card curio-card--padded stack-sm">
          <div className="row-wrap" style={{ color: 'var(--accent-ochre)' }}>
            <Bookmark size={18} />
            <span className="curio-eyebrow" style={{ color: 'var(--accent-ochre)' }}>
              Empty Shelf
            </span>
          </div>
          <h2 style={{ fontSize: '1.35rem' }}>Nothing saved in this collection yet</h2>
          <p className="text-secondary">
            Tap <strong>Save</strong> on any discovery card to keep it here for easy revisiting
            anytime.
          </p>
          <div>
            <button
              type="button"
              className="curio-btn curio-btn--primary curio-btn--sm"
              onClick={() => navigate('/')}
            >
              Browse Home feed
            </button>
          </div>
        </section>
      ) : (
        <div className="stack-sm">
          {filteredEntries.map(({ savedItem, content }) => {
            const catMeta = CATEGORY_METADATA[content.category];
            return (
              <article
                key={savedItem.id}
                className="curio-card curio-card--padded stack-sm fade-in-card"
              >
                <div className="row-between">
                  <span
                    className="curio-eyebrow"
                    style={{ color: catMeta.accentHex }}
                  >
                    {catMeta.shortLabel} · {content.source.publisher}
                  </span>
                  <span className="mono-meta">
                    Saved {formatEditorialDate(savedItem.savedAt)}
                  </span>
                </div>

                <h2 style={{ fontSize: '1.28rem' }}>{content.title}</h2>
                <p className="text-secondary" style={{ fontSize: '0.94rem' }}>
                  {content.summary}
                </p>

                <div className="row-between" style={{ paddingTop: 6 }}>
                  <button
                    type="button"
                    className="curio-btn curio-btn--primary curio-btn--sm"
                    onClick={() => setActiveRecord(content)}
                  >
                    Open interactive view
                  </button>

                  <div className="row-wrap">
                    <label className="mono-meta" htmlFor={`move-${savedItem.id}`}>
                      Collection:
                    </label>
                    <select
                      id={`move-${savedItem.id}`}
                      className="curio-select"
                      style={{ width: 'auto', padding: '6px 10px', fontSize: '0.84rem' }}
                      value={savedItem.collectionId}
                      onChange={(e) => void handleMoveCollection(content, e.target.value)}
                    >
                      {collections.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="curio-btn curio-btn--ghost curio-btn--sm"
                      aria-label={`Remove ${content.title} from saved library`}
                      onClick={() => void handleRemoveSaved(content.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* New Collection Modal */}
      <ModalDialog
        open={newColOpen}
        title="Create a collection"
        onClose={() => {
          setNewColOpen(false);
          setFormError(null);
        }}
      >
        <form onSubmit={(e) => void handleCreateCollection(e)} className="stack-sm">
          <div className="stack-xs">
            <label htmlFor="new-col-name" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Collection name
            </label>
            <input
              id="new-col-name"
              type="text"
              className="curio-input"
              maxLength={80}
              placeholder="e.g., Weekend History Reads"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
            />
          </div>

          <div className="stack-xs">
            <label htmlFor="new-col-desc" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Short note (optional)
            </label>
            <input
              id="new-col-desc"
              type="text"
              className="curio-input"
              maxLength={180}
              placeholder="What belongs on this shelf?"
              value={newColDesc}
              onChange={(e) => setNewColDesc(e.target.value)}
            />
          </div>

          {formError && (
            <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: '0.86rem' }}>
              {formError}
            </p>
          )}

          <div className="row-between" style={{ paddingTop: 8 }}>
            <button
              type="button"
              className="curio-btn curio-btn--ghost curio-btn--sm"
              onClick={() => setNewColOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="curio-btn curio-btn--primary curio-btn--sm">
              Create collection
            </button>
          </div>
        </form>
      </ModalDialog>
    </main>
  );
}
