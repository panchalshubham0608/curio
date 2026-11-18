interface CardSkeletonProps {
  statusLabel?: string;
}

export function CardSkeleton({
  statusLabel = 'Curating fresh discoveries…',
}: CardSkeletonProps) {
  return (
    <section
      className="curio-card curio-card--padded stack-md"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="curio-eyebrow">{statusLabel}</span>
      <div className="skeleton" style={{ height: 210, width: '100%' }} />
      <div className="skeleton" style={{ height: 30, width: '78%' }} />
      <div className="skeleton" style={{ height: 18, width: '92%' }} />
      <div className="skeleton" style={{ height: 18, width: '85%' }} />
      <div className="skeleton" style={{ height: 76, width: '100%' }} />
    </section>
  );
}
