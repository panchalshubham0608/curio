import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  CATEGORY_METADATA,
  type ContentCategory,
  type ContentMix,
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
