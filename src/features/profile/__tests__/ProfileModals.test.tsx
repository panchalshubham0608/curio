import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../../app/providers/AppContainer';
import { buildCurioServices } from '../../../app/providers/curioServices';
import { AppRoutes } from '../../../app/routes/AppRoutes';
import { SafeKeyValueStore } from '../../../infrastructure/persistence/LocalStorageStore';

describe('ProfilePage independent personalization modals', () => {
  it('updates Visual Interests and Discovery Vibe independently via their own modals', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('profile_modal_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/profile']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Profile$/i })
    ).toBeInTheDocument();

    // 1. Update Visual Interests independently
    await user.click(screen.getByRole('button', { name: /Visual interests/i }));
    const interestsDialog = await screen.findByRole('dialog');
    expect(
      within(interestsDialog).getByRole('heading', { name: /Choose your visual interests/i })
    ).toBeInTheDocument();
    expect(within(interestsDialog).queryByText(/Step 1 of 2/i)).not.toBeInTheDocument();

    await user.click(within(interestsDialog).getByRole('button', { name: /Travel & Food/i }));
    await user.click(within(interestsDialog).getByRole('button', { name: /Save interests/i }));

    expect(await screen.findByText(/Visual interests updated\./i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 2. Update Discovery Vibe independently
    await user.click(screen.getByRole('button', { name: /Discovery vibe/i }));
    const vibeDialog = await screen.findByRole('dialog');
    expect(
      within(vibeDialog).getByRole('heading', { name: /Choose your discovery vibe/i })
    ).toBeInTheDocument();
    expect(within(vibeDialog).queryByText(/Step 2 of 2/i)).not.toBeInTheDocument();

    await user.click(within(vibeDialog).getByRole('button', { name: /Deep Cuts/i }));
    await user.click(within(vibeDialog).getByRole('button', { name: /Save vibe/i }));

    expect(await screen.findByText(/Discovery vibe updated\./i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discovery vibe.*Deep Cuts/i })).toBeInTheDocument();
  });

  it('opens Reader name & topic filters modal and persists greeting name', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('profile_details_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/profile']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Profile$/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reader name & topic filters/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Reader name/i), 'Maya');
    await user.click(within(dialog).getByRole('button', { name: /Save details/i }));

    expect(await screen.findByText(/Reader details saved\./i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reader name & topic filters.*Maya/i })).toBeInTheDocument();
  });

  it('renders the slim top bar, upgraded user hero card, bento statistics, and reworked Data & Privacy controls', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('profile_hero_stats_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/profile']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(await screen.findByRole('heading', { level: 1, name: /^Profile$/i })).toBeInTheDocument();
    const themeGroup = screen.getByRole('group', { name: /Color theme/i });
    expect(within(themeGroup).getByRole('button', { name: /Light/i })).toBeInTheDocument();
    expect(within(themeGroup).getByRole('button', { name: /Dark/i })).toBeInTheDocument();

    const accountSection = screen.getByRole('region', { name: /Account and sync/i });
    expect(within(accountSection).getByText('On this device')).toBeInTheDocument();
    expect(
      within(accountSection).queryByRole('button', { name: /Edit reader name/i })
    ).not.toBeInTheDocument();

    const statsSection = screen.getByRole('region', { name: /Personal discovery overview/i });
    expect(within(statsSection).getByText(/Mixes explored/i)).toBeInTheDocument();
    expect(within(statsSection).getByText(/Saved stories/i)).toBeInTheDocument();
    expect(within(statsSection).getByText(/Puzzles solved/i)).toBeInTheDocument();
    expect(within(statsSection).getByText(/Active themes/i)).toBeInTheDocument();

    // Tapping Active themes bento card opens Visual Interests modal
    await user.click(within(statsSection).getByRole('button', { name: /Active themes/i }));
    const interestsDialog = await screen.findByRole('dialog');
    expect(
      within(interestsDialog).getByRole('heading', { name: /Choose your visual interests/i })
    ).toBeInTheDocument();
    await user.click(within(interestsDialog).getByRole('button', { name: /Close modal/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reworked Data & Privacy section opens confirmation modal on Reset recommendations
    const privacySection = screen.getByRole('region', { name: /Data and privacy/i });
    expect(within(privacySection).getByText(/Stored privately on this device/i)).toBeInTheDocument();
    await user.click(within(privacySection).getByRole('button', { name: /Reset recommendations/i }));
    const resetDialog = await screen.findByRole('dialog');
    expect(
      within(resetDialog).getByRole('heading', { name: /Reset personalization signals\?/i })
    ).toBeInTheDocument();
  });

  it('clears the local guest profile (name, puzzle progress, preferences) after confirmation', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('profile_clear_guest_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    // Seed local guest preferences and a solved puzzle before mounting
    await services.updatePreferences.execute('personal_local_reader', {
      displayName: 'Aarav',
      interests: ['facts', 'science', 'history', 'travel_food'],
      preferredMix: 'deeper',
      onboardingCompleted: true,
    });
    await services.puzzleProvider.markSolved('personal_local_reader', 'puz_odd_planets');

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/profile']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    const accountSection = await screen.findByRole('region', { name: /Account and sync/i });
    expect(
      await within(accountSection).findByRole('heading', { name: 'Aarav' })
    ).toBeInTheDocument();

    const privacySection = screen.getByRole('region', { name: /Data and privacy/i });
    await user.click(
      within(privacySection).getByRole('button', { name: /Clear local guest profile/i })
    );

    const confirmDialog = await screen.findByRole('dialog');
    expect(
      within(confirmDialog).getByRole('heading', { name: /Clear local guest profile\?/i })
    ).toBeInTheDocument();

    await user.click(within(confirmDialog).getByRole('button', { name: /Clear guest profile/i }));

    expect(await screen.findByText(/Local guest profile cleared/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      within(accountSection).getByRole('heading', { name: 'Curious Reader' })
    ).toBeInTheDocument();

    const statsSection = screen.getByRole('region', { name: /Personal discovery overview/i });
    expect(
      within(statsSection).getByRole('button', { name: /0\s*\/\s*8\s*Active themes/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/No themes selected yet/i)).toBeInTheDocument();

    const persistedAfterClear = await services.getPreferences.execute('personal_local_reader');
    expect(persistedAfterClear.interests).toEqual([]);

    const solvedAfterClear = await services.puzzleProvider.getSolvedIds('personal_local_reader');
    expect(solvedAfterClear.size).toBe(0);
  });
});
