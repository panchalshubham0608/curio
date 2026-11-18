import { Check } from 'lucide-react';
import {
  CATEGORY_METADATA,
  CONTENT_CATEGORIES,
  type ContentCategory,
} from '../../../shared/validation/contentSchemas';
import './InterestGalleryPicker.css';

interface InterestGalleryPickerProps {
  selectedInterests: readonly ContentCategory[];
  onToggle: (category: ContentCategory) => void;
}

/**
 * Shared editorial photography grid for selecting discovery interests.
 * Used across both the Onboarding journey and Profile settings.
 */
export function InterestGalleryPicker({
  selectedInterests,
  onToggle,
}: InterestGalleryPickerProps) {
  return (
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
            onClick={() => onToggle(categoryId)}
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
  );
}
