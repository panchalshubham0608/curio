import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisteredBlockRenderer } from '../components/ComponentRegistry';
import { SourceAttributionRow } from '../components/SourceAttributionRow';
import { createTestContentRecords } from '../../../test/fixtures';

describe('Schema-driven ComponentRegistry & safe rendering', () => {
  it('safely omits unknown or malicious block types without executing or injecting HTML', () => {
    const { container } = render(
      <RegisteredBlockRenderer
        block={{
          type: 'unsafe_html',
          html: '<img src=x onerror=alert(1)><script>window.__xss=true</script>',
        }}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders interactive FactRevealCard and toggles reveal content on click', async () => {
    const user = userEvent.setup();
    render(
      <RegisteredBlockRenderer
        block={{
          type: 'fact_reveal',
          label: 'Tap for a hidden detail',
          text: 'Octopuses have three hearts and blue copper-based blood.',
        }}
      />
    );

    expect(
      screen.queryByText(/Octopuses have three hearts/i)
    ).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /Tap for a hidden detail/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Octopuses have three hearts/i)).toBeInTheDocument();
  });

  it('renders interactive QuizCard, grades answer, and shows explanation', async () => {
    const user = userEvent.setup();
    render(
      <RegisteredBlockRenderer
        block={{
          type: 'quiz',
          question: 'Which stage of sleep is most linked to vivid dreams?',
          options: ['REM sleep', 'Awake only'],
          correctOptionIndex: 0,
          explanation: 'REM sleep is closely associated with vivid narrative dreaming.',
        }}
      />
    );

    const remOption = screen.getByRole('radio', { name: 'REM sleep' });
    await user.click(remOption);

    expect(screen.getByText(/Spot on\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/REM sleep is closely associated with vivid narrative dreaming/i)
    ).toBeInTheDocument();
    expect(remOption).toBeDisabled();
  });

  it('renders TimelineCard, ComparisonCard, and RabbitHoleCard with callback', async () => {
    const user = userEvent.setup();
    const onStartRabbitHole = vi.fn();

    render(
      <>
        <RegisteredBlockRenderer
          block={{
            type: 'timeline',
            heading: 'Space Milestones',
            events: [
              { year: '1977', title: 'Launch', detail: 'Voyager launches.' },
              { year: '2012', title: 'Interstellar', detail: 'Crosses heliopause.' },
            ],
          }}
        />
        <RegisteredBlockRenderer
          block={{
            type: 'comparison',
            heading: 'Compare Two Approaches',
            items: [
              { name: 'Option A', points: ['Fast'] },
              { name: 'Option B', points: ['Thorough'] },
            ],
            verdict: 'Pick based on task.',
          }}
        />
        <RegisteredBlockRenderer
          block={{
            type: 'rabbit_hole',
            prompt: 'Explore orbital mechanics',
            topic: 'orbital mechanics',
            category: 'science',
            description: 'A finite 5-minute journey.',
            estimatedMinutes: 5,
          }}
          handlers={{ onStartRabbitHole }}
        />
      </>
    );

    expect(screen.getByText('Space Milestones')).toBeInTheDocument();
    expect(screen.getByText('Compare Two Approaches')).toBeInTheDocument();
    expect(screen.getByText('Pick based on task.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Explore topic/i }));
    expect(onStartRabbitHole).toHaveBeenCalledWith('orbital mechanics', 'science');
  });

  it('renders SourceAttributionRow with safe target=_blank rel=noopener noreferrer link', () => {
    const record = createTestContentRecords()[0]!;
    render(<SourceAttributionRow record={record} />);

    const link = screen.getByRole('link', { name: /Read original source/i });
    expect(link).toHaveAttribute('href', record.source.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
