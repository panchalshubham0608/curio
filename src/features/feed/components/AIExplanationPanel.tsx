import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Send,
  Sparkles,
  CheckCircle,
  X,
} from 'lucide-react';
import { RateLimitExceededError } from '../../../application/ai/AskContentQuestion';
import type { QuickAIPromptAction } from '../../../application/ports';
import { useCurioApp } from '../../../app/providers/appContext';
import { getFriendlyErrorMessage } from '../../../shared/errors/firebaseErrorMapper';
import './SourceAttributionRow.css';
import './AIExplanationPanel.css';
import type {
  AIAnswer,
  ContentRecord,
} from '../../../shared/validation/contentSchemas';
import { isSafeHttpsUrl } from '../../../shared/validation/urlValidation';
import { QuizCard } from './QuizCard';

interface AIExplanationPanelProps {
  record: ContentRecord;
  onClose: () => void;
}

const QUICK_ACTIONS: ReadonlyArray<{
  action: Exclude<QuickAIPromptAction, 'custom'>;
  label: string;
}> = [
  { action: 'explain_simply', label: 'Explain more simply' },
  { action: 'give_analogy', label: 'Give an analogy' },
  { action: 'why_it_matters', label: 'Why it matters' },
  { action: 'related_concepts', label: 'Related concepts' },
  { action: 'generate_quiz', label: 'Short quiz' },
];

/**
 * Contextual "Ask Curio" AI panel grounded in the current discovery item.
 * Renders as a native slide-up bottom sheet on mobile screens and an inline
 * editorial panel on tablet/desktop.
 */
export function AIExplanationPanel({ record, onClose }: AIExplanationPanelProps) {
  const { userId, services } = useCurioApp();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activePromptLabel, setActivePromptLabel] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AIAnswer | null>(null);

  const runPrompt = async (
    action: QuickAIPromptAction,
    label: string,
    customQuestion?: string
  ) => {
    setLoading(true);
    setErrorMsg(null);
    setActivePromptLabel(label);
    try {
      const response = await services.askContentQuestion.execute({
        userId,
        record,
        action,
        customQuestion,
      });
      setAnswer(response);
      if (action === 'custom') {
        setQuestion('');
      }
    } catch (err) {
      if (err instanceof RateLimitExceededError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(getFriendlyErrorMessage(err, 'ai'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3) {
      setErrorMsg('Please type a question (at least 3 characters).');
      return;
    }
    void runPrompt('custom', trimmed, trimmed);
  };

  return (
    <div
      className="ai-sheet-wrapper"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="ai-panel stack-sm" aria-label="Ask Curio contextual AI panel">
        <div className="sheet-handle" aria-hidden="true" />
        <div className="row-between">
          <div className="row-wrap" style={{ gap: 7, color: 'var(--accent-indigo)' }}>
            <Sparkles size={17} aria-hidden="true" />
            <h3 style={{ fontSize: '1.08rem', color: 'var(--accent-indigo)' }}>Ask Curio</h3>
            <span className="mono-meta">Source-grounded</span>
          </div>
          <button
            type="button"
            className="curio-btn curio-btn--ghost curio-btn--sm"
            onClick={onClose}
            aria-label="Close Ask Curio panel"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-secondary" style={{ fontSize: '0.88rem' }}>
          Explore this discovery deeper. Answers stay grounded in the attributed source and clearly
          flag when something goes beyond it.
        </p>

        <div className="tabs-scroll-strip">
          {QUICK_ACTIONS.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={loading}
              className="curio-btn curio-btn--secondary curio-btn--sm"
              style={{ flexShrink: 0 }}
              onClick={() => void runPrompt(item.action, item.label)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {record.followUps.length > 0 && (
          <div className="stack-xs">
            <span className="curio-eyebrow">Suggested follow-ups</span>
            <div className="row-wrap">
              {record.followUps.slice(0, 3).map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  className="curio-chip curio-chip--selectable"
                  style={{ fontSize: '0.82rem', padding: '6px 12px', textAlign: 'left' }}
                  onClick={() => void runPrompt('custom', promptText, promptText)}
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="row-wrap" style={{ gap: 8 }}>
          <label
            htmlFor="curio-custom-question"
            className="curio-eyebrow"
            style={{ width: '100%' }}
          >
            Ask a custom question
          </label>
          <input
            id="curio-custom-question"
            type="text"
            className="curio-input"
            style={{ flex: '1 1 200px' }}
            placeholder="What else would you like clarified?"
            maxLength={320}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="curio-btn curio-btn--primary curio-btn--sm"
            disabled={loading}
          >
            <Send size={14} aria-hidden="true" />
            Ask
          </button>
        </form>

        {errorMsg && (
          <p
            role="alert"
            style={{
              color: 'var(--accent-danger)',
              fontSize: '0.88rem',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </p>
        )}

        {loading && (
          <div className="stack-xs" aria-busy="true">
            <div className="skeleton" style={{ height: 14, width: '42%' }} />
            <div className="skeleton" style={{ height: 54, width: '100%' }} />
          </div>
        )}

        {answer && !loading && (
          <div
            className="curio-card curio-card--padded stack-sm fade-in-card"
            style={{ padding: 16 }}
            aria-live="polite"
          >
            <div className="row-between">
              <span className="curio-eyebrow">{activePromptLabel ?? 'Curio Response'}</span>
              <span
                className="curio-chip"
                style={{
                  background: answer.groundedInSource
                    ? 'var(--accent-sage-soft)'
                    : 'var(--accent-ochre-soft)',
                  color: answer.groundedInSource ? 'var(--accent-sage)' : 'var(--accent-ochre)',
                  borderColor: 'transparent',
                }}
              >
                {answer.groundedInSource ? (
                  <>
                    <CheckCircle size={13} aria-hidden="true" />
                    Grounded in source
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} aria-hidden="true" />
                    Beyond source excerpt
                  </>
                )}
              </span>
            </div>

            <p style={{ fontSize: '0.95rem', lineHeight: 1.65 }}>{answer.answer}</p>

            {answer.uncertaintyNote && (
              <p
                className="text-muted"
                style={{
                  fontSize: '0.82rem',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-subtle)',
                }}
              >
                Note: {answer.uncertaintyNote}
              </p>
            )}

            {answer.generatedQuiz && <QuizCard block={answer.generatedQuiz} />}

            {answer.references.length > 0 && (
              <div className="row-wrap" style={{ fontSize: '0.82rem' }}>
                <span className="text-muted">Sources:</span>
                {answer.references
                  .filter((ref) => isSafeHttpsUrl(ref.url))
                  .map((ref, idx) => (
                    <a
                      key={idx}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      {ref.title}
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
