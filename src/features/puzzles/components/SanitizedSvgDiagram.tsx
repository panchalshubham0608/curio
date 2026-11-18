import {
  SvgDiagramSchema,
  type SvgDiagram,
} from '../../../shared/validation/puzzleSchemas';

interface SanitizedSvgDiagramProps {
  diagram: SvgDiagram;
  title: string;
}

/**
 * Pure React JSX SVG renderer for AI-generated declarative geometry puzzles.
 * Re-validates the diagram payload defensively via Zod and renders strictly
 * allow-listed geometric primitives (`rect`, `circle`, `line`, `polygon`, `text`)
 * without `dangerouslySetInnerHTML`, `innerHTML`, event handlers, or external refs.
 */
export function SanitizedSvgDiagram({ diagram, title }: SanitizedSvgDiagramProps) {
  const parsed = SvgDiagramSchema.safeParse(diagram);
  if (!parsed.success) {
    return null;
  }

  const safeDiagram = parsed.data;
  const bg = safeDiagram.background ?? '#FAF8F4';

  return (
    <figure className="puzzle-svg-frame">
      <svg
        viewBox="0 0 320 200"
        width="100%"
        role="img"
        aria-label={safeDiagram.caption ?? `${title} diagram`}
        className="puzzle-svg-canvas"
        style={{ background: bg }}
      >
        {safeDiagram.shapes.map((item, idx) => {
          const key = `shape-${idx}`;
          switch (item.shape) {
            case 'rect':
              return (
                <rect
                  key={key}
                  x={item.x}
                  y={item.y}
                  width={item.width}
                  height={item.height}
                  rx={item.rx ?? 0}
                  fill={item.fill ?? 'none'}
                  stroke={item.stroke ?? '#171614'}
                  strokeWidth={item.strokeWidth ?? 2}
                />
              );
            case 'circle':
              return (
                <circle
                  key={key}
                  cx={item.cx}
                  cy={item.cy}
                  r={item.r}
                  fill={item.fill ?? 'none'}
                  stroke={item.stroke ?? '#171614'}
                  strokeWidth={item.strokeWidth ?? 2}
                />
              );
            case 'line':
              return (
                <line
                  key={key}
                  x1={item.x1}
                  y1={item.y1}
                  x2={item.x2}
                  y2={item.y2}
                  stroke={item.stroke ?? '#171614'}
                  strokeWidth={item.strokeWidth ?? 2}
                  strokeLinecap="round"
                />
              );
            case 'polygon':
              return (
                <polygon
                  key={key}
                  points={item.points.map(([px, py]) => `${px},${py}`).join(' ')}
                  fill={item.fill ?? 'none'}
                  stroke={item.stroke ?? '#171614'}
                  strokeWidth={item.strokeWidth ?? 2}
                  strokeLinejoin="round"
                />
              );
            case 'text':
              return (
                <text
                  key={key}
                  x={item.x}
                  y={item.y}
                  fontSize={item.fontSize}
                  fill={item.fill ?? '#171614'}
                  textAnchor={item.anchor}
                  fontFamily="var(--font-sans)"
                  fontWeight={600}
                >
                  {item.text}
                </text>
              );
            default:
              return null;
          }
        })}
      </svg>
      {safeDiagram.caption && (
        <figcaption className="puzzle-svg-caption">{safeDiagram.caption}</figcaption>
      )}
    </figure>
  );
}
