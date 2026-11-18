import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../../app/providers/AppContainer';
import { buildCurioServices } from '../../../app/providers/curioServices';
import { AppRoutes } from '../../../app/routes/AppRoutes';
import { SafeKeyValueStore } from '../../../infrastructure/persistence/LocalStorageStore';
import { GeneratedPuzzleProvider } from '../../../infrastructure/puzzles/PuzzleProvider';
import { PuzzleSchema } from '../../../shared/validation/puzzleSchemas';
import { createTestPuzzles } from '../../../test/fixtures';

function createMockAIPuzzleProvider(store: SafeKeyValueStore) {
  const items = createTestPuzzles();
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ schemaVersion: 1, items }),
  }) as unknown as typeof fetch;
  return new GeneratedPuzzleProvider(store, { fetchImpl: mockFetch });
}

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

  it('renders a calm editorial empty state when no AI puzzles have been published yet', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('puzzles_empty_ai_test', false);
    const services = buildCurioServices({ forceLocalStore: store });

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/puzzles']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(
      await screen.findByRole('heading', { name: /No puzzles published yet/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/0 of 0 solved/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Surprise me/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Check for puzzles/i })).toBeInTheDocument();
  });

  it('opens an AI puzzle popup from PuzzlesPage, reveals hints, grades answers, persists solved state, and chains to the next puzzle', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('puzzles_ui_test', false);
    const services = buildCurioServices({
      forceLocalStore: store,
      puzzleProvider: createMockAIPuzzleProvider(store),
    });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/puzzles']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Puzzles$/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/0 of 5 solved/i)
    ).toBeInTheDocument();

    // Open the "Solar Spin" puzzle popup
    await user.click(screen.getByRole('button', { name: /Solar Spin/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /Solar Spin/i })).toBeInTheDocument();
    expect(within(dialog).queryByText(/^Science$/i)).not.toBeInTheDocument();

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
    expect(await screen.findByText(/1 of 5 solved/i)).toBeInTheDocument();

    // Chain directly to the next puzzle inside the popup
    await user.click(within(dialog).getByRole('button', { name: /Next puzzle/i }));
    expect(
      within(screen.getByRole('dialog')).queryByRole('heading', { name: /Solar Spin/i })
    ).not.toBeInTheDocument();

    // Close popup cleanly
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Solved puzzle ("Solar Spin") moves down below the remaining unsolved puzzles
    expect(screen.getByText(/Solved \(1\)/i)).toBeInTheDocument();
    const listSection = screen.getByLabelText(/Available puzzles/i);
    const puzzleButtons = within(listSection)
      .getAllByRole('button')
      .filter((btn) => !/Pick an unsolved puzzle/i.test(btn.textContent ?? ''));
    expect(puzzleButtons[puzzleButtons.length - 1]?.textContent).toMatch(/Solar Spin/i);
    expect(puzzleButtons[0]?.textContent).not.toMatch(/Solar Spin/i);

    // End-of-puzzles caught-up card renders cleanly
    expect(screen.getByRole('heading', { name: /You’re all caught up/i })).toBeInTheDocument();
  });

  it('hides puzzle category filter tabs and topic tags while launching a teaser from Surprise me', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('puzzles_surprise_test', false);
    const services = buildCurioServices({
      forceLocalStore: store,
      puzzleProvider: createMockAIPuzzleProvider(store),
    });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/puzzles']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Puzzles$/i })
    ).toBeInTheDocument();

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    const listSection = await screen.findByLabelText(/Available puzzles/i);
    const puzzleCards = within(listSection)
      .getAllByRole('button')
      .filter((btn) => !/Pick an unsolved puzzle/i.test(btn.textContent ?? ''));
    expect(puzzleCards.length).toBe(5);
    expect(within(listSection).queryByText(/^Science$/i)).not.toBeInTheDocument();
    expect(within(listSection).queryByText(/^Tech & AI$/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Surprise me/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toBeInTheDocument();
    const hasInteractiveSurface =
      Boolean(within(dialog).queryByRole('radiogroup')) ||
      Boolean(within(dialog).queryByRole('group'));
    expect(hasInteractiveSurface).toBe(true);
  });

  it('plays reasoning clues, tap-to-order sequence, sanitized SVG visual diagram, and interactive sum grid puzzles', async () => {
    window.scrollTo = vi.fn();
    const store = new SafeKeyValueStore('puzzles_advanced_mechanics_test', false);
    const services = buildCurioServices({
      forceLocalStore: store,
      puzzleProvider: createMockAIPuzzleProvider(store),
    });
    const user = userEvent.setup();

    render(
      <AppProvider overrideServices={services}>
        <MemoryRouter initialEntries={['/puzzles']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProvider>
    );

    await screen.findByText(/0 of 5 solved/i);

    // 1. Logic Reasoning (check-off deductive clues + solve)
    await user.click(screen.getByRole('button', { name: /The Four-Seat Express/i }));
    let dialog = await screen.findByRole('dialog');
    const firstClue = within(dialog).getByRole('button', { name: /Aria sits immediately to the left/i });
    await user.click(firstClue);
    expect(firstClue).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(dialog).getByRole('radio', { name: 'Ben' }));
    expect(within(dialog).getByText(/Spot on!/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^Close$/i }));

    // 2. Order Sequence (tap-to-order chronology)
    await user.click(screen.getByRole('button', { name: /Timeline of Breakthroughs/i }));
    dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Magnetic compass/i }));
    await user.click(within(dialog).getByRole('button', { name: /Movable-type printing press/i }));
    await user.click(within(dialog).getByRole('button', { name: /Practical incandescent light bulb/i }));
    await user.click(within(dialog).getByRole('button', { name: /World Wide Web/i }));
    await user.click(within(dialog).getByRole('button', { name: /Check order/i }));
    expect(within(dialog).getByText(/Spot on!/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^Close$/i }));

    // 3. Visual Logic (declarative React JSX SVG rendering)
    await user.click(screen.getByRole('button', { name: /Hidden Triangles/i }));
    dialog = await screen.findByRole('dialog');
    const svg = dialog.querySelector('svg.puzzle-svg-canvas');
    expect(svg).not.toBeNull();
    expect(svg?.querySelectorAll('polygon').length).toBe(1);
    expect(svg?.querySelectorAll('line').length).toBe(2);
    await user.click(within(dialog).getByRole('radio', { name: '6' }));
    expect(within(dialog).getByText(/Spot on!/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^Close$/i }));

    // 4. Interactive Board (target_sum playable grid)
    await user.click(screen.getByRole('button', { name: /Sum to Twenty-Four/i }));
    dialog = await screen.findByRole('dialog');
    const gridGroup = within(dialog).getByRole('group', { name: /Interactive puzzle grid/i });
    await user.click(within(gridGroup).getByRole('button', { name: '13' }));
    await user.click(within(gridGroup).getByRole('button', { name: '9' }));
    await user.click(within(gridGroup).getByRole('button', { name: '2' }));
    expect(within(dialog).getByText(/Sum: 24 \/ 24/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Check board/i }));
    expect(within(dialog).getByText(/Spot on!/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^Close$/i }));

    expect(await screen.findByText(/4 of 5 solved/i)).toBeInTheDocument();
  });
});
