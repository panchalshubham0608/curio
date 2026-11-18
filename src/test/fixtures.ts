import type { ContentDiscoveryRequest, ContentProvider } from '../application/ports';
import type { ContentCandidate } from '../domain/content/Content';
import { withBasePath } from '../shared/utils/assetUrl';
import {
  CATEGORY_METADATA,
  ContentRecordSchema,
  CURRENT_CONTENT_SCHEMA_VERSION,
  type ContentCategory,
  type ContentFormat,
  type ContentRecord,
} from '../shared/validation/contentSchemas';
import { PuzzleSchema, type Puzzle } from '../shared/validation/puzzleSchemas';

const FIXTURE_TIMESTAMP = '2026-11-18T08:00:00.000Z';

function buildFixtureRecord(input: {
  id: string;
  title: string;
  subtitle: string;
  category: ContentCategory;
  contentType: ContentFormat;
  topics: string[];
  summary: string;
  url: string;
  publisher: string;
  duration?: number;
}): ContentRecord {
  const meta = CATEGORY_METADATA[input.category];
  return ContentRecordSchema.parse({
    id: input.id,
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: input.contentType,
    cardVariant: 'article',
    title: input.title,
    subtitle: input.subtitle,
    category: input.category,
    topics: input.topics,
    estimatedDurationSeconds: input.duration ?? 95,
    source: {
      publisher: input.publisher,
      title: input.title,
      url: input.url,
      retrievedAt: FIXTURE_TIMESTAMP,
    },
    summary: input.summary,
    blocks: [
      { type: 'paragraph', text: input.summary },
      {
        type: 'fact_reveal',
        label: 'Key insight',
        text: `Verified editorial note on ${input.topics[0] ?? input.category}.`,
      },
    ],
    visual: {
      type: 'editorial_illustration',
      imageUrl: withBasePath(`/images/categories/${input.category}.jpg`),
      alt: `${input.title} illustration`,
      accentColor: meta.accentHex,
      provider: 'Curio AI Test Fixture',
      attribution: 'Curio Editorial',
      license: 'Test Fixture',
    },
    followUps: [`Tell me more about ${input.topics[0] ?? input.category}`],
    isAiEnriched: true,
    enrichedAt: FIXTURE_TIMESTAMP,
    qualityStatus: 'approved',
    createdAt: FIXTURE_TIMESTAMP,
  });
}

const TEST_CONTENT_RECORDS: readonly ContentRecord[] = [
  buildFixtureRecord({
    id: 'curio_sci_001',
    title: 'How Octopus Arms Process Touch Locally',
    subtitle: 'Distributed neural control beneath the waves.',
    category: 'science',
    contentType: 'interactive_fact',
    topics: ['neuroscience', 'ocean', 'biology'],
    summary:
      'Roughly two-thirds of an octopus’s neurons live inside its arms, enabling local tactile decisions without waiting on the central brain.',
    url: 'https://www.mbl.edu/news/octopus-arm-neurons',
    publisher: 'Marine Biological Laboratory',
  }),
  buildFixtureRecord({
    id: 'curio_sci_002',
    title: 'Voyager 1 Still Whispers From Interstellar Space',
    subtitle: 'More than 24 billion kilometers away and still answering Earth.',
    category: 'science',
    contentType: 'short_story',
    topics: ['voyager', 'space', 'astronomy'],
    summary:
      'Launched in 1977, Voyager 1 sends radio signals across interstellar space that take over 22 hours to reach NASA Deep Space Network dishes.',
    url: 'https://science.nasa.gov/mission/voyager/',
    publisher: 'NASA Jet Propulsion Laboratory',
  }),
  buildFixtureRecord({
    id: 'curio_sci_003',
    title: 'Why REM Sleep Replays Emotional Memories',
    subtitle: 'Nightly synaptic recalibration inside the sleeping brain.',
    category: 'science',
    contentType: 'deep_dive',
    topics: ['neuroscience', 'sleep', 'memory'],
    summary:
      'During REM sleep, the brain reactivates daytime memory traces while stress neurochemistry drops, softening emotional edges.',
    url: 'https://www.nih.gov/news-events/rem-sleep-memory',
    publisher: 'National Institutes of Health',
  }),
  buildFixtureRecord({
    id: 'curio_tech_001',
    title: 'How Subsea Fiber Cables Carry 98% of Global Data',
    subtitle: 'Glass strands thinner than a hair cross ocean trenches.',
    category: 'technology',
    contentType: 'visual_explainer',
    topics: ['infrastructure', 'networking', 'internet'],
    summary:
      'Over 500 undersea fiber-optic cables form the physical backbone of global finance, cloud services, and real-time messaging.',
    url: 'https://www.telegeography.com/subsea-cables',
    publisher: 'TeleGeography',
  }),
  buildFixtureRecord({
    id: 'curio_tech_002',
    title: 'Why QR Codes Still Scan When Partially Torn',
    subtitle: 'Reed-Solomon error correction hides mathematical redundancy in every square.',
    category: 'technology',
    contentType: 'quick_bite',
    topics: ['algorithms', 'coding theory', 'design'],
    summary:
      'QR codes embed Reed-Solomon error-correcting codewords so scanners can recover up to 30% damaged or obscured modules.',
    url: 'https://www.qrcode.com/en/about/error_correction.html',
    publisher: 'DENSO WAVE',
  }),
  buildFixtureRecord({
    id: 'curio_hist_001',
    title: 'John Snow’s 1854 Cholera Map Changed Epidemiology',
    subtitle: 'Plotting water pumps on paper proved disease spread through water.',
    category: 'history',
    contentType: 'short_story',
    topics: ['cholera', 'medicine', 'cartography'],
    summary:
      'By mapping London’s 1854 cholera cases around the Broad Street pump, physician John Snow helped pioneer modern data visualization and public health.',
    url: 'https://www.cdc.gov/principles-of-epidemiology/john-snow',
    publisher: 'CDC Public Health Archive',
  }),
  buildFixtureRecord({
    id: 'curio_hist_002',
    title: 'How Railway Timetables Invented Standard Time Zones',
    subtitle: 'Before 1883, neighboring towns kept completely different solar noon.',
    category: 'history',
    contentType: 'quick_bite',
    topics: ['railroads', 'timekeeping', 'history'],
    summary:
      'Coordinating high-speed trains forced rail operators to replace hundreds of local solar clocks with synchronized regional time zones.',
    url: 'https://www.smithsonianmag.com/history/standard-time-zones',
    publisher: 'Smithsonian Magazine',
  }),
  buildFixtureRecord({
    id: 'curio_facts_001',
    title: 'Why Coastlines Have No Single True Length',
    subtitle: 'The coastline paradox shows how measurement scale alters geometry.',
    category: 'facts',
    contentType: 'interactive_fact',
    topics: ['fractals', 'mathematics', 'geography'],
    summary:
      'Measuring a rugged coastline with shorter and shorter rulers captures finer coves and inlets, causing the measured perimeter to grow continually.',
    url: 'https://en.wikipedia.org/wiki/Coastline_paradox',
    publisher: 'Curio Math Desk',
  }),
  buildFixtureRecord({
    id: 'curio_facts_002',
    title: 'Why Clouds Weigh Hundreds of Tons Yet Still Float',
    subtitle: 'Microscopic droplets ride rising thermal currents across the sky.',
    category: 'facts',
    contentType: 'quick_bite',
    topics: ['weather', 'physics', 'atmosphere'],
    summary:
      'An average cumulus cloud holds roughly 500 metric tons of water spread across trillions of tiny droplets whose fall speed is slower than warm updrafts.',
    url: 'https://www.usgs.gov/special-topics/water-science-school/clouds',
    publisher: 'U.S. Geological Survey',
  }),
  buildFixtureRecord({
    id: 'curio_travel_001',
    title: 'How Kyoto’s Wooden Machiya Stay Cool Without AC',
    subtitle: 'Narrow courtyards and shaded lattices create natural thermal drafts.',
    category: 'travel_food',
    contentType: 'short_story',
    topics: ['architecture', 'japan', 'passive cooling'],
    summary:
      'Traditional Kyoto machiya townhouses pair interior tsuboniwa gardens with high vents to draw cool shaded air through the home in humid summers.',
    url: 'https://www.archdaily.com/kyoto-machiya-cooling',
    publisher: 'ArchDaily',
  }),
  buildFixtureRecord({
    id: 'curio_travel_002',
    title: 'Why Tomatoes and Parmesan Taste Richer Together',
    subtitle: 'Synergistic umami amplifies flavor perception exponentially.',
    category: 'travel_food',
    contentType: 'quick_bite',
    topics: ['food science', 'culinary', 'chemistry'],
    summary:
      'Combining glutamates with nucleotide-rich ingredients triggers taste-receptor synergy that makes savory dishes taste dramatically fuller.',
    url: 'https://www.seriouseats.com/umami-synergy-science',
    publisher: 'Serious Eats',
  }),
  buildFixtureRecord({
    id: 'curio_growth_001',
    title: 'Chesterton’s Fence: Understand Before Removing',
    subtitle: 'A mental model for smarter decisions in complex systems.',
    category: 'growth',
    contentType: 'deep_dive',
    topics: ['mental models', 'decision making', 'systems'],
    summary:
      'Before dismantling an unfamiliar rule or process, first learn why it was erected so you do not accidentally reintroduce the problem it solved.',
    url: 'https://fs.blog/chestertons-fence/',
    publisher: 'Farnam Street',
  }),
  buildFixtureRecord({
    id: 'curio_growth_002',
    title: 'Why Testing Yourself Beats Re-Reading Notes',
    subtitle: 'Active retrieval strengthens neural pathways faster than passive review.',
    category: 'growth',
    contentType: 'quiz_challenge',
    topics: ['memory', 'learning', 'psychology'],
    summary:
      'Cognitive studies consistently find that recalling answers from memory builds far more durable retention than highlighting or re-reading.',
    url: 'https://www.apa.org/science/about/psa/retrieval-practice',
    publisher: 'American Psychological Association',
  }),
  buildFixtureRecord({
    id: 'curio_hum_001',
    title: 'The Phantom Towns Mapmakers Invented on Purpose',
    subtitle: 'Paper towns served as clever copyright traps in print atlases.',
    category: 'humour',
    contentType: 'short_story',
    topics: ['cartography', 'wordplay', 'trivia'],
    summary:
      'Twentieth-century mapmakers occasionally added fictitious settlements so they could catch rival publishers copying their maps verbatim.',
    url: 'https://www.atlasobscura.com/articles/paper-towns-copyright-traps',
    publisher: 'Atlas Obscura',
  }),
  buildFixtureRecord({
    id: 'curio_hum_002',
    title: 'Why the Word “Clue” Started as a Ball of Yarn',
    subtitle: 'From Greek labyrinth myth straight into modern detective fiction.',
    category: 'humour',
    contentType: 'quick_bite',
    topics: ['etymology', 'language', 'mythology'],
    summary:
      'A “clew” originally meant a ball of thread—echoing Ariadne’s thread that guided Theseus out of the Minotaur’s maze.',
    url: 'https://www.etymonline.com/word/clue',
    publisher: 'Online Etymology Dictionary',
  }),
  buildFixtureRecord({
    id: 'curio_news_001',
    title: 'Grid-Scale Batteries Are Reshaping Evening Power Peaks',
    subtitle: 'Utility storage now shifts midday solar power smoothly into night.',
    category: 'news',
    contentType: 'visual_explainer',
    topics: ['energy', 'grid', 'climate'],
    summary:
      'Rapid declines in lithium-iron-phosphate battery costs have made multi-hour grid storage one of the fastest-growing electricity assets worldwide.',
    url: 'https://www.iea.org/reports/batteries-and-secure-energy-transitions',
    publisher: 'International Energy Agency',
  }),
];

export function createTestContentRecords(): ContentRecord[] {
  return TEST_CONTENT_RECORDS.map((item) => ({ ...item }));
}

export class TestContentProvider implements ContentProvider {
  public readonly name = 'test_ai_feed_fixture';
  private readonly records: readonly ContentRecord[];

  constructor(records: readonly ContentRecord[] = TEST_CONTENT_RECORDS) {
    this.records = records;
  }

  public async discover(input: ContentDiscoveryRequest): Promise<ContentCandidate[]> {
    const focus = input.topicFocus?.toLowerCase();
    const sorted = [...this.records].sort((a, b) => {
      if (focus) {
        const aHit = `${a.title} ${a.topics.join(' ')} ${a.summary}`.toLowerCase().includes(focus)
          ? 1
          : 0;
        const bHit = `${b.title} ${b.topics.join(' ')} ${b.summary}`.toLowerCase().includes(focus)
          ? 1
          : 0;
        if (aHit !== bHit) return bHit - aHit;
      }
      const aCat = input.categories.includes(a.category) ? 1 : 0;
      const bCat = input.categories.includes(b.category) ? 1 : 0;
      return bCat - aCat;
    });

    return sorted.slice(0, Math.max(input.limit, this.records.length)).map((record) => ({
      id: record.id,
      title: record.title,
      subtitle: record.subtitle,
      category: record.category,
      topics: record.topics,
      contentType: record.contentType,
      cardVariant: record.cardVariant,
      summary: record.summary,
      source: record.source,
      visual: record.visual,
      estimatedDurationSeconds: record.estimatedDurationSeconds,
      preEnrichedRecord: record,
    }));
  }
}

export function createTestPuzzles(): Puzzle[] {
  const raw: unknown[] = [
    {
      schemaVersion: 1,
      id: 'puz_ai_solar_spin',
      kind: 'odd_one_out',
      title: 'Solar Spin',
      category: 'science',
      difficulty: 'Warm-up',
      prompt: 'Three of these planets rotate in the same direction around their axis. Which one spins backwards?',
      hint: 'On this planet, the Sun rises in the west and sets in the east.',
      options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
      correctIndex: 1,
      explanation:
        'Venus has a retrograde rotation—it rotates clockwise when viewed from above Earth’s North Pole, opposite to most planets.',
      origin: 'ai',
      createdAt: FIXTURE_TIMESTAMP,
    },
    {
      schemaVersion: 1,
      id: 'puz_ai_logic_seats',
      kind: 'logic_reasoning',
      title: 'The Four-Seat Express',
      category: 'growth',
      difficulty: 'Clever',
      prompt: 'Aria, Ben, Chloe, and Dev sit in Seats 1 to 4 from left to right. Use the clues to find who sits in Seat 3.',
      clues: [
        'Aria sits immediately to the left of Ben.',
        'Dev sits immediately to the right of Ben.',
        'Chloe sits in one of the two end seats, and she is not in Seat 4.',
      ],
      hint: 'Place Chloe first, then fit the three-person block (Aria–Ben–Dev) into the remaining seats.',
      options: ['Aria', 'Ben', 'Chloe', 'Dev'],
      correctIndex: 1,
      explanation:
        'Chloe sits in Seat 1, leaving Seats 2–4 for Aria, Ben, and Dev in order—so Ben sits in Seat 3.',
      origin: 'ai',
      createdAt: FIXTURE_TIMESTAMP,
    },
    {
      schemaVersion: 1,
      id: 'puz_ai_order_inventions',
      kind: 'order_sequence',
      title: 'Timeline of Breakthroughs',
      category: 'history',
      difficulty: 'Warm-up',
      prompt: 'Put these four breakthroughs in chronological order, from earliest invented (1st) to most recent (4th).',
      orderItems: [
        'World Wide Web',
        'Movable-type printing press',
        'Practical incandescent light bulb',
        'Magnetic compass',
      ],
      correctOrder: [3, 1, 2, 0],
      hint: 'Navigation came centuries before mass printing, and electricity preceded the web.',
      explanation:
        'Magnetic compass (~200 BCE) → Movable-type printing press (~1440s) → Incandescent light bulb (1879) → World Wide Web (1989).',
      origin: 'ai',
      createdAt: FIXTURE_TIMESTAMP,
    },
    {
      schemaVersion: 1,
      id: 'puz_ai_svg_triangles',
      kind: 'visual_diagram',
      title: 'Hidden Triangles',
      category: 'science',
      difficulty: 'Clever',
      prompt: 'Inspect the diagram below. How many triangles of any size can you count in total?',
      svgDiagram: {
        caption: 'Count both the smaller sub-triangles and larger combined triangles.',
        background: '#FAF8F4',
        shapes: [
          {
            shape: 'polygon',
            points: [
              [160, 22],
              [44, 174],
              [276, 174],
            ],
            fill: '#FBF0ED',
            stroke: '#C84B31',
            strokeWidth: 3,
          },
          {
            shape: 'line',
            x1: 160,
            y1: 22,
            x2: 160,
            y2: 174,
            stroke: '#3B4F75',
            strokeWidth: 2.5,
          },
          {
            shape: 'line',
            x1: 102,
            y1: 98,
            x2: 218,
            y2: 98,
            stroke: '#2D6A4F',
            strokeWidth: 2.5,
          },
        ],
      },
      hint: 'Count the triangles sitting entirely above the green line first, then the taller ones.',
      options: ['4', '5', '6', '8'],
      correctIndex: 2,
      explanation:
        '3 triangles sit in the upper half and 3 taller triangles reach the base, making 6 total.',
      origin: 'ai',
      createdAt: FIXTURE_TIMESTAMP,
    },
    {
      schemaVersion: 1,
      id: 'puz_ai_grid_sum24',
      kind: 'interactive_grid',
      title: 'Sum to Twenty-Four',
      category: 'facts',
      difficulty: 'Warm-up',
      prompt: 'Play the live grid below: highlight any 3 tiles whose numbers add up to exactly 24.',
      gridPuzzle: {
        mode: 'target_sum',
        rows: 3,
        cols: 3,
        instruction: 'Pick 3 tiles totaling 24',
        targetSum: 24,
        exactCount: 3,
        goalState: 'all_on',
        cells: [
          { label: '3', value: 3, initialOn: false },
          { label: '7', value: 7, initialOn: false },
          { label: '11', value: 11, initialOn: false },
          { label: '4', value: 4, initialOn: false },
          { label: '9', value: 9, initialOn: false },
          { label: '13', value: 13, initialOn: false },
          { label: '2', value: 2, initialOn: false },
          { label: '6', value: 6, initialOn: false },
          { label: '8', value: 8, initialOn: false },
        ],
      },
      hint: 'Start with 13 or 11 and pair it with two smaller tiles.',
      explanation: '13 + 9 + 2 = 24 (among several valid 3-tile sets).',
      origin: 'ai',
      createdAt: FIXTURE_TIMESTAMP,
    },
  ];

  return raw.map((item) => PuzzleSchema.parse(item));
}
