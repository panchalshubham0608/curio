import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../providers/AppContainer';
import { buildCurioServices } from '../providers/curioServices';
import { AppRoutes } from '../routes/AppRoutes';
import { SafeKeyValueStore } from '../../infrastructure/persistence/LocalStorageStore';

describe('Project Curio Phase 1 end-to-end user journeys', () => {
  it('starts directly on HomePage with a clean hero, scrollable visual feed, and interactive Profile Journey', async () => {
    window.scrollTo = vi.fn();

    const store = new SafeKeyValueStore('e2e_journey_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    // 1. User lands directly on HomePage with a clean visual feed (no timers or vibe/mix pills)
    expect(
      await screen.findByRole('heading', { name: /You’re all caught up/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Daily Mix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Quick Sparks/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fresh mix/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /5 min/i })).not.toBeInTheDocument();

    // Top navbar stays clean; Hero Cover has only "Personalize your interests"; Sign-In lives in Personalize
    const header = document.querySelector('header');
    expect(header?.textContent).not.toMatch(/Sign in/i);
    const heroSection = screen.getByLabelText(/Curio Daily Edition Hero/i);
    expect(heroSection.textContent).not.toMatch(/Continue with Google/i);
    expect(heroSection.textContent).not.toMatch(/Open swipe deck/i);
    expect(
      within(heroSection).getByRole('link', { name: /Personalize your interests/i })
    ).toBeInTheDocument();

    const personalizeSection = screen.getByLabelText(/Personalize your edition/i);
    expect(personalizeSection.textContent).toMatch(/Continue with Google/i);
    expect(
      screen.getByRole('button', { name: /Continue with Google/i })
    ).toBeInTheDocument();

    // 2. User launches the interactive Profile & Interest Creation Journey
    await user.click(
      within(heroSection).getByRole('link', { name: /Personalize your interests/i })
    );

    // Step 1: Sign-in comes first — "What should Curio call you?" is hidden until sign-in / guest opt-in
    expect(
      await screen.findByRole('heading', {
        name: /Let’s set up your personal Curio profile\./i,
      })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/What should Curio call you/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continue without signing in/i }));
    await user.type(screen.getByLabelText(/What should Curio call you/i), 'Sam');
    await user.click(screen.getByRole('button', { name: /Choose visual interests/i }));

    // Step 2: Visual Interest Gallery -> straight to Discovery Vibe (Step 3 of 3)
    expect(
      screen.getByRole('heading', { name: /What sparks your curiosity\?/i })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Travel & Food/i }));
    await user.click(screen.getByRole('button', { name: /Pick your discovery vibe/i }));

    // Step 3: Discovery Vibe + Live Reader Pass Preview (no minute-duration selectors)
    expect(
      screen.getByRole('heading', { name: /Choose your favorite feed vibe/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /5 minutes/i })).not.toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(screen.queryByText(/Curio Reader Pass/i)).not.toBeInTheDocument();

    // Launch first personalized swipe deck straight from the Reader Pass reveal
    await user.click(screen.getByRole('button', { name: /Start discovering/i }));

    // 3. Swipe deck opens with story-style progress indicator ("Card 1 of ...") and no countdown timer or Ask Curio button
    expect(await screen.findByText(/Card 1 of \d+/i)).toBeInTheDocument();
    expect(screen.queryByText(/min left/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ask Curio/i })).not.toBeInTheDocument();

    // Save the current item to a collection
    await user.click(screen.getByRole('button', { name: /^Save$/i }));
    await user.click(
      await screen.findByRole('button', { name: /Interesting Things I've Learned/i })
    );
    expect(await screen.findByRole('button', { name: /^Saved$/i })).toBeInTheDocument();

    // Step through the swipe deck to the end
    for (let guard = 0; guard < 10; guard += 1) {
      const finishBtn = screen.queryByRole('button', { name: /Finish Mix/i });
      if (finishBtn) {
        await user.click(finishBtn);
        break;
      }
      await user.click(screen.getByRole('button', { name: /Next discovery/i }));
    }

    // 4. All Caught Up completion screen appears
    expect(
      await screen.findByRole('heading', { name: /You’ve explored this whole mix\./i })
    ).toBeInTheDocument();

    // Save optional quick note
    await user.type(
      screen.getByLabelText(/Quick note/i),
      'Loved learning how passive cooling worked in Kyoto.'
    );
    await user.click(screen.getByRole('button', { name: /Save note/i }));
    expect(await screen.findByText(/Note saved\./i)).toBeInTheDocument();

    // 5. Navigate to Saved Library and verify the saved item is listed
    await user.click(screen.getByRole('button', { name: /Saved Library/i }));
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Saved Library/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/All Saved \(1\)/i)).toBeInTheDocument();
  });

  it('lets visitors save a card directly from the Home feed and load more discoveries', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('e2e_guest_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(
      await screen.findByRole('heading', { name: /You’re all caught up/i })
    ).toBeInTheDocument();

    // Save the very first card right inside the Home feed (action bar attached inside the card)
    const feedRegion = screen.getByLabelText(/For You discovery feed/i);
    const initialCardCount = within(feedRegion).getAllByRole('article').length;
    const firstCard = within(feedRegion).getAllByRole('article')[0];
    expect(within(firstCard).getByRole('toolbar')).toBeInTheDocument();
    await user.click(within(firstCard).getByRole('button', { name: /^Save$/i }));
    await user.click(
      await screen.findByRole('button', { name: /Interesting Things I've Learned/i })
    );
    expect(
      await within(firstCard).findByRole('button', { name: /^Saved$/i })
    ).toBeInTheDocument();

    // Load more appends fresh cards in place without wiping the feed
    await user.click(screen.getByRole('button', { name: /^Load more$/i }));
    await waitFor(() => {
      expect(within(feedRegion).getAllByRole('article').length).toBeGreaterThan(initialCardCount);
    });
  });

  it('supports controlled horizontal touch swipe navigation in the swipe deck while ignoring vertical scrolls', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('e2e_swipe_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    const { container } = render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/explore']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    const categoriesSection = await screen.findByLabelText(/All categories/i);
    const themeButton = within(categoriesSection).getByRole('button', { name: /Science/i });
    await user.click(themeButton);
    expect(await screen.findByText(/Card 1 of \d+/i)).toBeInTheDocument();

    const mainEl = container.querySelector('main')!;

    // Vertical scroll gesture must NOT advance the card
    fireEvent.touchStart(mainEl, { touches: [{ clientX: 200, clientY: 400 }] });
    fireEvent.touchEnd(mainEl, { changedTouches: [{ clientX: 170, clientY: 120 }] });
    expect(screen.getByText(/Card 1 of \d+/i)).toBeInTheDocument();

    // Clear horizontal swipe left advances to Card 2
    fireEvent.touchStart(mainEl, { touches: [{ clientX: 300, clientY: 250 }] });
    fireEvent.touchEnd(mainEl, { changedTouches: [{ clientX: 180, clientY: 260 }] });
    expect(await screen.findByText(/Card 2 of \d+/i)).toBeInTheDocument();

    // Horizontal swipe right returns to Card 1
    fireEvent.touchStart(mainEl, { touches: [{ clientX: 120, clientY: 250 }] });
    fireEvent.touchEnd(mainEl, { changedTouches: [{ clientX: 250, clientY: 255 }] });
    expect(await screen.findByText(/Card 1 of \d+/i)).toBeInTheDocument();
  });
});
