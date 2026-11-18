import { useMemo, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { detectSuggestedRegion } from '../../../domain/user/UserPreferences';
import {
  CATEGORY_METADATA,
  CONTENT_REGIONS,
  REGION_METADATA,
  type ContentCategory,
  type ContentMix,
  type ContentRegion,
} from '../../../shared/validation/contentSchemas';
import { ModalDialog } from '../../feed/components/ModalDialog';
import { DiscoveryVibePicker } from '../../preferences/components/DiscoveryVibePicker';
import { InterestGalleryPicker } from '../../preferences/components/InterestGalleryPicker';
import './PreferencesFlowModal.css';

interface VisualInterestsModalProps {
  open: boolean;
  initialInterests: readonly ContentCategory[];
  saving: boolean;
  onClose: () => void;
  onSave: (interests: ContentCategory[]) => Promise<void>;
}

/**
 * Focused standalone modal for updating visual interests from Profile preferences.
 */
export function VisualInterestsModal({
  open,
  initialInterests,
  saving,
  onClose,
  onSave,
}: VisualInterestsModalProps) {
  if (!open) return null;

  return (
    <VisualInterestsModalBody
      key={initialInterests.join(',')}
      initialInterests={initialInterests}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function VisualInterestsModalBody({
  initialInterests,
  saving,
  onClose,
  onSave,
}: Omit<VisualInterestsModalProps, 'open'>) {
  const [draftInterests, setDraftInterests] = useState<ContentCategory[]>([...initialInterests]);

  const toggleInterest = (category: ContentCategory) => {
    setDraftInterests((prev) => {
      if (prev.includes(category)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  };

  return (
    <ModalDialog
      open
      title="Choose your visual interests"
      maxWidth={760}
      onClose={onClose}
    >
      <div className="stack-md fade-in-card">
        <p className="text-secondary" style={{ fontSize: '0.92rem' }}>
          Tap the worlds you love exploring. Pick at least one to shape your feed.
        </p>

        <InterestGalleryPicker
          selectedInterests={draftInterests}
          onToggle={toggleInterest}
        />

        <div className="profile-modal-footer">
          <div className="journey-dock-summary">
            <div className="palette-tray" aria-hidden="true">
              {draftInterests.slice(0, 5).map((cat) => (
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
                {draftInterests.length} theme{draftInterests.length === 1 ? '' : 's'} selected
              </strong>
              <span className="mono-meta">
                {draftInterests.length >= 3
                  ? 'Good selection — great variety'
                  : 'Pick 3+ for more variety'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="curio-btn curio-btn--accent journey-dock-next"
            disabled={draftInterests.length === 0 || saving}
            onClick={() => void onSave(draftInterests)}
          >
            <Check size={16} aria-hidden="true" />
            <span>{saving ? 'Saving…' : 'Save interests'}</span>
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

interface DiscoveryVibeModalProps {
  open: boolean;
  initialMix: ContentMix;
  saving: boolean;
  onClose: () => void;
  onSave: (preferredMix: ContentMix) => Promise<void>;
}

/**
 * Focused standalone modal for updating the discovery vibe from Profile preferences.
 */
export function DiscoveryVibeModal({
  open,
  initialMix,
  saving,
  onClose,
  onSave,
}: DiscoveryVibeModalProps) {
  if (!open) return null;

  return (
    <DiscoveryVibeModalBody
      key={initialMix}
      initialMix={initialMix}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function DiscoveryVibeModalBody({
  initialMix,
  saving,
  onClose,
  onSave,
}: Omit<DiscoveryVibeModalProps, 'open'>) {
  const [draftMix, setDraftMix] = useState<ContentMix>(initialMix);

  return (
    <ModalDialog
      open
      title="Choose your discovery vibe"
      maxWidth={640}
      onClose={onClose}
    >
      <div className="stack-md fade-in-card">
        <p className="text-secondary" style={{ fontSize: '0.92rem' }}>
          Pick the kind of discoveries you reach for most often.
        </p>

        <DiscoveryVibePicker value={draftMix} onChange={setDraftMix} />

        <div className="journey-step-actions" style={{ paddingTop: 6 }}>
          <button
            type="button"
            className="curio-btn curio-btn--accent journey-dock-next"
            disabled={saving}
            onClick={() => void onSave(draftMix)}
          >
            <Check size={16} aria-hidden="true" />
            <span>{saving ? 'Saving…' : 'Save vibe'}</span>
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

interface EditionRegionModalProps {
  open: boolean;
  initialRegion: ContentRegion;
  saving: boolean;
  onClose: () => void;
  onSave: (region: ContentRegion) => Promise<void>;
}

/**
 * Focused standalone modal for selecting a privacy-safe regional Curio edition.
 */
export function EditionRegionModal({
  open,
  initialRegion,
  saving,
  onClose,
  onSave,
}: EditionRegionModalProps) {
  if (!open) return null;

  return (
    <EditionRegionModalBody
      key={initialRegion}
      initialRegion={initialRegion}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EditionRegionModalBody({
  initialRegion,
  saving,
  onClose,
  onSave,
}: Omit<EditionRegionModalProps, 'open'>) {
  const [draftRegion, setDraftRegion] = useState<ContentRegion>(initialRegion);
  const suggestedRegion = useMemo(() => detectSuggestedRegion(), []);

  return (
    <ModalDialog
      open
      title="Choose your edition & region"
      maxWidth={640}
      onClose={onClose}
    >
      <div className="stack-md fade-in-card">
        <p className="text-secondary" style={{ fontSize: '0.92rem' }}>
          Pick a regional edition to blend local stories (~30%) with global discoveries. No GPS or
          precise location is ever collected.
        </p>

        <div className="edition-picker-grid" role="group" aria-label="Curio edition options">
          {CONTENT_REGIONS.map((regionId) => {
            const meta = REGION_METADATA[regionId];
            const isSelected = draftRegion === regionId;
            const isSuggested = suggestedRegion !== 'global' && suggestedRegion === regionId;

            return (
              <button
                key={regionId}
                type="button"
                className={`edition-picker-card${isSelected ? ' edition-picker-card--selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => setDraftRegion(regionId)}
              >
                <div className="edition-picker-card-head">
                  <span className="edition-picker-card-title">
                    <Globe size={15} aria-hidden="true" />
                    <span>{meta.label}</span>
                  </span>
                  <div className="row-wrap" style={{ gap: 6 }}>
                    {isSuggested && (
                      <span className="edition-suggested-pill">Suggested</span>
                    )}
                    {isSelected && (
                      <span className="edition-selected-check" aria-hidden="true">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                </div>
                <span className="edition-picker-card-desc">{meta.description}</span>
              </button>
            );
          })}
        </div>

        <div className="journey-step-actions" style={{ paddingTop: 6 }}>
          <button
            type="button"
            className="curio-btn curio-btn--accent journey-dock-next"
            disabled={saving}
            onClick={() => void onSave(draftRegion)}
          >
            <Check size={16} aria-hidden="true" />
            <span>{saving ? 'Saving…' : 'Save edition'}</span>
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
