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
      await screen.findByRole('heading', { name: /Preferences & Profile/i })
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
      await screen.findByRole('heading', { name: /Preferences & Profile/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reader name & topic filters/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Reader name/i), 'Maya');
    await user.click(within(dialog).getByRole('button', { name: /Save details/i }));

    expect(await screen.findByText(/Reader details saved\./i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reader name & topic filters.*Maya/i })).toBeInTheDocument();
  });
});
