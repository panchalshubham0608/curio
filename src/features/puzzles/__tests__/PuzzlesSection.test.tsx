import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../../app/providers/AppContainer';
import { buildCurioServices } from '../../../app/providers/curioServices';
import { AppRoutes } from '../../../app/routes/AppRoutes';
import { SafeKeyValueStore } from '../../../infrastructure/persistence/LocalStorageStore';
import { PuzzleSchema } from '../../../shared/validation/puzzleSchemas';

describe('Curio Puzzles section and interactive popup modal', () => {
  it('rejects malformed AI puzzle payloads whose correctIndex is out of bounds', () => {
    const result = PuzzleSchema.safeParse({
      schemaVersion: 1,
      id: 'bad_ai_puzzle',
      kind: 'odd_one_out',
      title: 'Broken Puzzle',
      category: 'science',
      difficulty: 'Warm-up',
      prompt: 'Which option does not fit here?',
      options: ['Alpha', 'Beta'],
      correctIndex: 3,
      explanation: 'This should fail schema validation before reaching UI.',
      origin: 'ai',
    });

    expect(result.success).toBe(false);
  });

  it('opens a puzzle popup from PuzzlesPage, reveals hints, grades answers, persists solved state, and chains to the next puzzle', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('puzzles_ui_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/puzzles']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(
      await screen.findByRole('heading', { name: /Curio Puzzles/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/0 of 12 solved/i)
    ).toBeInTheDocument();

    // Open the "Solar Spin" puzzle popup
    await user.click(screen.getByRole('button', { name: /Solar Spin/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /Solar Spin/i })).toBeInTheDocument();

    // Reveal hint inside the popup
    await user.click(within(dialog).getByRole('button', { name: /Need a hint\?/i }));
    expect(
      within(dialog).getByText(/Sun rises in the west/i)
    ).toBeInTheDocument();

    // Select the right answer ("Venus")
    await user.click(within(dialog).getByRole('radio', { name: 'Venus' }));
    expect(within(dialog).getByText(/Spot on!/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/retrograde rotation/i)).toBeInTheDocument();

    // Solved count updates immediately
    expect(await screen.findByText(/1 of 12 solved/i)).toBeInTheDocument();

    // Chain directly to the next puzzle inside the popup
    await user.click(within(dialog).getByRole('button', { name: /Next puzzle/i }));
    expect(
      within(screen.getByRole('dialog')).queryByRole('heading', { name: /Solar Spin/i })
    ).not.toBeInTheDocument();

    // Close popup cleanly
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters puzzles by type and supports Surprise me popup launch', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('puzzles_filter_test', false);
    const services = buildCurioServices({ forceLocalStore: store });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/puzzles']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(
      await screen.findByRole('heading', { name: /Curio Puzzles/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Patterns/i }));
    const listSection = screen.getByLabelText(/Available puzzles/i);
    expect(within(listSection).getAllByRole('button').length).toBe(3);

    await user.click(screen.getByRole('button', { name: /Surprise me/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/Pattern sequence/i)).toBeInTheDocument();
  });
});
