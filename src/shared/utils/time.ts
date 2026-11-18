export function formatDurationCompact(seconds: number): string {
  const safeSeconds = Math.max(15, Math.round(seconds));
  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }
  const minutes = Math.round(safeSeconds / 60);
  return `${minutes} min`;
}

export function formatEditorialDate(isoDate?: string): string {
  if (!isoDate) return 'Evergreen';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return 'Evergreen';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export function getTimeOfDayGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatMastheadDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
}
