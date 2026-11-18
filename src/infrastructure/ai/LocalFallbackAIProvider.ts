import type {
  AIEnrichmentProvider,
  ContentQuestionRequest,
  EnrichmentRequest,
} from '../../application/ports';
import {
  AIAnswerSchema,
  CATEGORY_METADATA,
  type AIAnswer,
  type ContentBlock,
  type ContentRecord,
  type QuizBlock,
} from '../../shared/validation/contentSchemas';

/**
 * Grounded deterministic fallback AI provider used when Firebase AI Logic (Gemini)
 * is unconfigured, offline, or returns malformed output.
 * Always stays grounded in the supplied ContentRecord and communicates uncertainty clearly.
 */
export class LocalFallbackAIProvider implements AIEnrichmentProvider {
  public readonly modelName = 'curio-grounded-local-v1';
  public readonly isRemoteAI = false;

  public async enrich(input: EnrichmentRequest): Promise<ContentRecord> {
    const { record } = input;
    if (record.isAiEnriched && record.blocks.length >= 2) {
      return record;
    }

    const blocks: ContentBlock[] = [...record.blocks];
    const hasTakeaway = blocks.some((b) => b.type === 'key_takeaway');
    if (!hasTakeaway) {
      blocks.push({
        type: 'key_takeaway',
        heading: 'Core insight',
        points: [
          record.summary,
          `Attributed to ${record.source.publisher} — follow the original link for complete context.`,
        ],
      });
    }

    return {
      ...record,
      blocks,
      isAiEnriched: true,
      enrichmentNotice:
        'Structured reading summary prepared locally from the attributed source.',
      enrichedAt: new Date().toISOString(),
    };
  }

  public async answerQuestion(input: ContentQuestionRequest): Promise<AIAnswer> {
    const { record, action, customQuestion } = input;
    const categoryLabel = CATEGORY_METADATA[record.category].label;
    const factBlock = record.blocks.find((b) => b.type === 'fact_reveal');
    const takeawayBlock = record.blocks.find((b) => b.type === 'key_takeaway');
    const primaryFact =
      factBlock && factBlock.type === 'fact_reveal' ? factBlock.text : record.summary;

    const references = [
      {
        title: record.source.title ?? record.title,
        url: record.source.url,
      },
    ];

    switch (action) {
      case 'explain_simply':
        return AIAnswerSchema.parse({
          answer: `In plain terms: ${record.summary} The most notable takeaway from ${record.source.publisher} is that ${primaryFact.charAt(0).toLowerCase()}${primaryFact.slice(1)}`,
          groundedInSource: true,
          references,
          followUpSuggestions: [
            'Give me an everyday analogy',
            'Why does this matter in practice?',
          ],
        });

      case 'give_analogy':
        return AIAnswerSchema.parse({
          answer: `Think of "${record.title}" like a relay system where small, overlooked parts shape the whole outcome: ${record.summary} Looking at it this way helps connect ${record.topics.slice(0, 2).join(' and ')} to everyday decision-making.`,
          groundedInSource: true,
          uncertaintyNote:
            'Analogy is an illustrative framing generated from the item summary, not a quote from the publisher.',
          references,
          followUpSuggestions: [
            'Explain the core mechanism more simply',
            'What related concepts connect to this?',
          ],
        });

      case 'why_it_matters': {
        const keyPoint =
          takeawayBlock && takeawayBlock.type === 'key_takeaway' && takeawayBlock.points[0]
            ? takeawayBlock.points[0]
            : record.summary;
        return AIAnswerSchema.parse({
          answer: `Why this matters within ${categoryLabel}: ${keyPoint} Understanding topics like ${record.topics.slice(0, 3).join(', ')} gives you a sharper lens for spotting similar patterns elsewhere.`,
          groundedInSource: true,
          references,
          followUpSuggestions: [
            'Test me with a short quiz',
            'Show related concepts',
          ],
        });
      }

      case 'related_concepts':
        return AIAnswerSchema.parse({
          answer: `Key neighboring concepts connected to "${record.title}" include: ${record.topics.map((t) => `#${t}`).join(', ')}. Within ${categoryLabel}, exploring how these ideas interact reveals why ${record.source.publisher}'s coverage stands out.`,
          groundedInSource: true,
          references,
          followUpSuggestions: record.followUps.slice(0, 2),
        });

      case 'generate_quiz': {
        const existingQuiz = record.blocks.find(
          (b): b is QuizBlock => b.type === 'quiz'
        );
        const generatedQuiz: QuizBlock = existingQuiz ?? {
          type: 'quiz',
          question: `Which publisher/source is attributed for "${record.title}"?`,
          options: [
            record.source.publisher,
            'An unattributed social post',
            'A fictional archive',
          ],
          correctOptionIndex: 0,
          explanation: `This discovery is sourced from ${record.source.publisher}. Curio always preserves source attribution so you can inspect the original material.`,
        };

        return AIAnswerSchema.parse({
          answer: 'Here is a quick knowledge check grounded in this discovery:',
          groundedInSource: true,
          references,
          followUpSuggestions: ['Explain why this matters', 'Show related concepts'],
          generatedQuiz,
        });
      }

      case 'custom':
      default: {
        const q = customQuestion ?? '';
        const qTokens = q
          .toLowerCase()
          .split(/\W+/)
          .filter((token) => token.length >= 4);
        const sourceCorpus = [
          record.title,
          record.summary,
          ...record.blocks.map((block) => {
            if (block.type === 'paragraph') return block.text;
            if (block.type === 'fact_reveal') return `${block.label} ${block.text}`;
            if (block.type === 'key_takeaway') return block.points.join(' ');
            if (block.type === 'timeline')
              return block.events.map((e) => `${e.year} ${e.title} ${e.detail}`).join(' ');
            if (block.type === 'comparison')
              return block.items.map((i) => `${i.name} ${i.points.join(' ')}`).join(' ');
            return '';
          }),
        ]
          .join(' ')
          .toLowerCase();

        const hasOverlap = qTokens.some((token) => sourceCorpus.includes(token));

        if (hasOverlap) {
          return AIAnswerSchema.parse({
            answer: `Based on the supplied source (${record.source.publisher}): ${record.summary} ${primaryFact !== record.summary ? primaryFact : ''}`.trim(),
            groundedInSource: true,
            uncertaintyNote: 'Summarized directly from the attributed article excerpt above.',
            references,
            followUpSuggestions: record.followUps.slice(0, 2),
          });
        }

        return AIAnswerSchema.parse({
          answer: `Your question ("${q}") goes beyond what is explicitly stated in this item's excerpt from ${record.source.publisher}. What the source directly covers is: ${record.summary}`,
          groundedInSource: false,
          uncertaintyNote:
            'The supplied source excerpt does not directly answer this angle. Check the original reference link for more detail.',
          references,
          followUpSuggestions: record.followUps.slice(0, 2),
        });
      }
    }
  }
}
