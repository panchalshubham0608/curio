import type { ContentMix } from '../../../shared/validation/contentSchemas';
import { DISCOVERY_VIBE_OPTIONS } from '../discoveryVibeOptions';
import './DiscoveryVibePicker.css';

interface DiscoveryVibePickerProps {
  value: ContentMix;
  onChange: (next: ContentMix) => void;
}

/**
 * Shared visual discovery vibe cards with cadence visualizer bars and descriptions.
 * Used across both the Onboarding journey and Profile settings.
 */
export function DiscoveryVibePicker({ value, onChange }: DiscoveryVibePickerProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 12,
      }}
    >
      {DISCOVERY_VIBE_OPTIONS.map((option) => {
        const active = value === option.id;
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
            onClick={() => onChange(option.id)}
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
  );
}
