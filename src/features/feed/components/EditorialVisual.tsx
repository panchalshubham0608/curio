import { useState } from 'react';
import {
  CATEGORY_METADATA,
  type ContentCategory,
  type VisualReference,
} from '../../../shared/validation/contentSchemas';
import { isSafeImageUrl } from '../../../shared/validation/urlValidation';

interface EditorialVisualProps {
  visual: VisualReference;
  category: ContentCategory;
  title: string;
}

/**
 * Renders verified stock/open-collection or first-party editorial imagery with
 * full attribution captions. Gracefully falls back to the category cover photograph
 * and finally to a bespoke first-party SVG graphic if offline or unavailable.
 */
export function EditorialVisual({ visual, category, title }: EditorialVisualProps) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  const categoryMeta = CATEGORY_METADATA[category];
  const accent = visual.accentColor ?? categoryMeta.accentHex;

  const primaryUrl =
    visual.imageUrl && isSafeImageUrl(visual.imageUrl) ? visual.imageUrl : undefined;

  const activeUrl =
    !primaryFailed && primaryUrl
      ? primaryUrl
      : !fallbackFailed && isSafeImageUrl(categoryMeta.coverImage)
        ? categoryMeta.coverImage
        : undefined;

  if (activeUrl) {
    const isUsingCategoryFallback = activeUrl !== primaryUrl;
    return (
      <figure className="visual-banner" style={{ margin: '0 0 20px' }}>
        <img
          src={activeUrl}
          alt={visual.alt || title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (!primaryFailed && primaryUrl) {
              setPrimaryFailed(true);
            } else {
              setFallbackFailed(true);
            }
          }}
        />
        <figcaption className="visual-caption">
          <span>
            {isUsingCategoryFallback
              ? `Curio Editorial · ${categoryMeta.shortLabel}`
              : (visual.attribution ?? visual.provider ?? 'Curio Editorial')}
          </span>
          {visual.license && !isUsingCategoryFallback && <span>{visual.license}</span>}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure
      className="visual-banner"
      aria-label={visual.alt || title}
      style={{
        margin: '0 0 20px',
        background: `linear-gradient(135deg, ${accent} 0%, #1d1b18 100%)`,
      }}
    >
      <svg
        viewBox="0 0 640 360"
        width="100%"
        height="100%"
        role="img"
        aria-label={visual.alt || title}
        style={{ display: 'block' }}
      >
        <defs>
          <pattern
            id={`grid-${category}`}
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.09"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="640" height="360" fill={`url(#grid-${category})`} />
        <circle cx="510" cy="95" r="115" fill="#ffffff" fillOpacity="0.07" />
        <circle cx="510" cy="95" r="72" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" fill="none" />
        <path
          d="M 510 58 L 518 87 L 547 95 L 518 103 L 510 132 L 502 103 L 473 95 L 502 87 Z"
          fill="#faf8f4"
          fillOpacity="0.88"
        />
      </svg>
      <figcaption className="visual-caption">
        <span>{visual.attribution ?? 'Curio Editorial Graphics'}</span>
        <span>{visual.license ?? 'First-party SVG'}</span>
      </figcaption>
    </figure>
  );
}
