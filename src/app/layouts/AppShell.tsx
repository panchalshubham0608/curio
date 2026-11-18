import { Link, NavLink, Outlet, useMatch } from 'react-router-dom';
import { Bookmark, Compass, Home, Puzzle, SlidersHorizontal } from 'lucide-react';
import { useCurioApp } from '../providers/appContext';
import './AppShell.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/puzzles', label: 'Puzzles', icon: Puzzle, end: false },
  { to: '/explore', label: 'Explore', icon: Compass, end: false },
  { to: '/library', label: 'Saved', icon: Bookmark, end: false },
  { to: '/profile', label: 'Profile', icon: SlidersHorizontal, end: false },
] as const;

export function AppShell() {
  const { authUser, isSignedIn, preferences, cloudNotice, clearCloudNotice } = useCurioApp();
  const isSessionRoute = Boolean(useMatch('/session/:sessionId'));

  const displayInitial = (
    authUser?.displayName ||
    preferences?.displayName ||
    'C'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className={`curio-shell ${isSessionRoute ? 'curio-shell--session-focus' : ''}`}>
      <header className="curio-topbar">
        <div className="curio-topbar-inner">
          <Link to="/" className="curio-brand" aria-label="Curio Home">
            <img
              src="/curio-icon.svg"
              alt=""
              className="curio-brand-mark"
              width={30}
              height={30}
            />
            <span className="curio-brand-title">Curio</span>
            <span className="curio-brand-tagline">Less scrolling. More discovering.</span>
          </Link>

          <nav className="curio-desktop-nav" aria-label="Primary navigation">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className="curio-nav-link">
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {isSignedIn && authUser && (
            <Link to="/profile" className="account-pill" aria-label="Account profile">
              {authUser.photoURL ? (
                <img
                  src={authUser.photoURL}
                  alt=""
                  className="account-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="account-avatar" aria-hidden="true">
                  {displayInitial}
                </span>
              )}
              <span className="hide-on-xs">
                {authUser.displayName?.split(/\s+/)[0] ?? 'Reader'}
              </span>
              <span className="sync-dot" title="Synced across devices" />
            </Link>
          )}
        </div>
      </header>

      {cloudNotice && !isSessionRoute && (
        <div
          role="status"
          style={{
            maxWidth: 1040,
            width: '100%',
            margin: '12px auto 0',
            padding: '0 16px',
          }}
        >
          <div
            className="curio-card row-between fade-in-card"
            style={{
              padding: '12px 16px',
              background: 'var(--accent-ochre-soft)',
              borderColor:
                'color-mix(in srgb, var(--accent-ochre) 45%, var(--border-hairline))',
              fontSize: '0.88rem',
            }}
          >
            <span>{cloudNotice}</span>
            <button
              type="button"
              className="curio-btn curio-btn--ghost curio-btn--sm"
              onClick={clearCloudNotice}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Outlet />

      <nav className="curio-bottom-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="curio-bottom-nav-item">
            <span className="bottom-nav-icon-wrap" aria-hidden="true">
              <Icon size={20} strokeWidth={2.1} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
