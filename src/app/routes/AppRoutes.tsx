import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { ExplorePage } from '../../features/explore/ExplorePage';
import { SessionPage } from '../../features/feed/SessionPage';
import { HomePage } from '../../features/home/HomePage';
import { LibraryPage } from '../../features/library/LibraryPage';
import { OnboardingPage } from '../../features/onboarding/OnboardingPage';
import { ProfilePage } from '../../features/profile/ProfilePage';

/**
 * Starts directly on the Home editorial screen without a hard onboarding redirect wall.
 * The interactive Profile & Interest Journey lives at `/onboarding` and can be launched
 * from Home, post-Google sign-in, or Profile settings at any time.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
