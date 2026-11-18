import type { ContentDiscoveryRequest, ContentProvider } from '../../application/ports';
import type { ContentCandidate } from '../../domain/content/Content';
import {
  ContentRecordSchema,
  CURRENT_CONTENT_SCHEMA_VERSION,
  type ContentRecord,
} from '../../shared/validation/contentSchemas';

const SEED_RETRIEVED_AT = '2026-11-18T08:00:00.000Z';

const RAW_EVERGREEN_RECORDS: ContentRecord[] = [
  // ===================== SCIENCE, NATURE & SPACE =====================
  {
    id: 'curio_sci_001',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'interactive_fact',
    cardVariant: 'hero_image',
    title: 'Why Do We Dream — and Why Do Most Dreams Vanish in Minutes?',
    subtitle: 'Sleep neuroscience is revising decades-old assumptions about REM sleep and memory.',
    category: 'science',
    topics: ['neuroscience', 'sleep', 'brain', 'memory'],
    estimatedDurationSeconds: 110,
    source: {
      publisher: 'National Institute of Neurological Disorders and Stroke',
      title: 'Brain Basics: Understanding Sleep',
      url: 'https://www.ninds.nih.gov/health-information/public-education/brain-basics/brain-basics-understanding-sleep',
      publishedAt: '2026-09-12T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Dreaming occurs across multiple stages of sleep, though vivid narrative dreams peak during REM sleep when emotional circuits are active and prefrontal monitoring relaxes.',
    blocks: [
      {
        type: 'paragraph',
        text: 'For decades, textbooks treated dreaming as exclusive to Rapid Eye Movement (REM) sleep. Modern sleep-lab awakenings show that non-REM sleep produces dreams too—often shorter, more fragmented, and closer to everyday thoughts.',
      },
      {
        type: 'fact_reveal',
        label: 'A surprising detail about memory',
        text: 'During REM sleep, levels of norepinephrine—a neurotransmitter closely tied to encoding new memories—drop sharply, which helps explain why vivid dreams evaporate seconds after waking unless written down immediately.',
      },
      {
        type: 'quiz',
        question: 'During which stage of sleep are vivid, story-like dreams most commonly reported?',
        options: [
          'REM sleep',
          'Deep slow-wave NREM sleep only',
          'Only during the first 10 minutes after falling asleep',
        ],
        correctOptionIndex: 0,
        explanation:
          'While dreaming can happen in non-REM stages too, REM sleep is strongly associated with the most vivid, emotionally textured narrative dreams.',
      },
      {
        type: 'rabbit_hole',
        prompt: 'Explore how circadian clocks synchronize every organ in the body',
        topic: 'circadian biology',
        category: 'science',
        description: 'A finite 5-minute journey into biological clocks, light cues, and jet lag.',
        estimatedMinutes: 5,
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'sleep neuroscience brain waves',
      alt: 'Abstract editorial illustration of layered nocturnal waves representing sleep stages',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#3B4F75',
    },
    followUps: [
      'Why does sleep deprivation impair judgment before we feel sleepy?',
      'What happens to the brain during lucid dreaming?',
    ],
    isAiEnriched: true,
    enrichmentNotice: 'Interactive quiz and reveal layer curated from attributed neuroscience references.',
    qualityStatus: 'approved',
    createdAt: '2026-11-10T09:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_sci_002',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'visual_explainer',
    cardVariant: 'hero_image',
    title: 'Voyager 1: Still Whispering From Interstellar Space After Half a Century',
    subtitle: 'A 1970s computer with less memory than a key fob continues to return measurements from beyond the heliosphere.',
    category: 'science',
    topics: ['space', 'nasa', 'voyager', 'astronomy'],
    estimatedDurationSeconds: 135,
    source: {
      publisher: 'NASA Jet Propulsion Laboratory',
      title: 'Voyager Mission Overview',
      url: 'https://science.nasa.gov/mission/voyager/',
      publishedAt: '2026-10-04T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Launched in 1977, Voyager 1 is the farthest human-made object from Earth, powered by decaying plutonium radioisotopes and communicating across more than 22 light-hours.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Every radio command sent to Voyager 1 travels at the speed of light and still takes over 22 hours just to arrive. Engineers wait nearly two full days to learn whether a software patch succeeded.',
      },
      {
        type: 'timeline',
        heading: 'Milestones of an unintended interstellar mission',
        events: [
          {
            year: '1977',
            title: 'Launch during the Grand Tour alignment',
            detail: 'A rare planetary alignment occurring once every 176 years allowed gravity assists past Jupiter and Saturn.',
          },
          {
            year: '1990',
            title: 'The Pale Blue Dot portrait',
            detail: 'At Carl Sagan’s urging, Voyager turned its camera back to photograph Earth as a 0.12-pixel speck from 6 billion km away.',
          },
          {
            year: '2012',
            title: 'Crossing the heliopause',
            detail: 'Voyager 1 became the first spacecraft to enter interstellar space beyond the Sun’s protective magnetic bubble.',
          },
        ],
      },
      {
        type: 'key_takeaway',
        heading: 'Why engineers still study Voyager',
        points: [
          'Redundant, transparent hardware design enabled remote flight-software rescues 46+ years after launch.',
          'Its magnetometer and plasma wave readings give humanity its only direct in-situ measurements of interstellar medium.',
        ],
      },
    ],
    visual: {
      type: 'open_collection',
      query: 'voyager pale blue dot nasa space',
      imageUrl: 'https://images-assets.nasa.gov/image/PIA23645/PIA23645~medium.jpg',
      alt: 'NASA Pale Blue Dot revisited photograph showing Earth suspended in a sunbeam',
      attribution: 'NASA / JPL-Caltech',
      license: 'NASA Public Domain',
      provider: 'NASA Image Archive',
      accentColor: '#2B3E5E',
    },
    followUps: [
      'How do radioisotope thermoelectric generators work without solar panels?',
      'What is engraved on the Voyager Golden Record?',
    ],
    isAiEnriched: true,
    enrichmentNotice: 'Timeline structured from NASA JPL mission archives.',
    qualityStatus: 'approved',
    createdAt: '2026-11-12T10:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_sci_003',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'interactive_feature',
    title: 'How Octopuses Edit Their Own RNA at Scale',
    subtitle: 'Instead of relying solely on slow DNA mutations, coleoid cephalopods rewrite RNA messages on the fly.',
    category: 'science',
    topics: ['biology', 'evolution', 'ocean', 'genetics'],
    estimatedDurationSeconds: 75,
    source: {
      publisher: 'Marine Biological Laboratory',
      title: 'Cephalopod RNA Editing Research',
      url: 'https://www.mbl.edu/news/cephalopods-recode-rna',
      publishedAt: '2026-08-22T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Squids, cuttlefish, and octopuses extensively recode their neural RNA transcripts—helping them adapt nerve function rapidly to shifting ocean temperatures.',
    blocks: [
      {
        type: 'paragraph',
        text: 'In most animals, RNA acts as a faithful courier copying instructions from DNA to make proteins. In octopuses and squids, enzymes edit tens of thousands of RNA sites in the nervous system after transcription.',
      },
      {
        type: 'fact_reveal',
        label: 'The evolutionary trade-off',
        text: 'Heavy RNA editing requires preserving nearby DNA sequences intact so editing enzymes can recognize them—which paradoxically appears to slow down conventional DNA evolution in those regions.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'octopus neural biology ocean',
      alt: 'Editorial graphic symbolizing cephalopod neural branching and RNA strands',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#2A6F7B',
    },
    followUps: [
      'Why do octopus arms process sensory information semi-independently?',
      'Does RNA editing happen in humans too?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-11T09:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },

  // ===================== TECHNOLOGY & AI =====================
  {
    id: 'curio_tech_001',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'deep_dive',
    cardVariant: 'interactive_feature',
    title: 'Small Language Models vs. Frontier Models: When Smaller Wins',
    subtitle: 'Efficiency, latency, and predictable schemas are reshaping how AI features are architected.',
    category: 'technology',
    topics: ['ai', 'machine learning', 'architecture', 'edge computing'],
    estimatedDurationSeconds: 145,
    source: {
      publisher: 'MIT Technology Review',
      title: 'The Shift Toward Compact AI Models',
      url: 'https://www.technologyreview.com/topic/artificial-intelligence/',
      publishedAt: '2026-11-05T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Many real-world tasks—classification, structured extraction, and grounded Q&A—achieve comparable reliability with smaller, distilled models at a fraction of the latency and energy cost.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Early generative AI deployments routed every prompt to the largest general-purpose model available. Engineering teams increasingly pair compact models for routine structured tasks with larger models only when open-ended synthesis is truly required.',
      },
      {
        type: 'comparison',
        heading: 'Architectural trade-offs at a glance',
        items: [
          {
            name: 'Compact / Distilled Models',
            subtitle: 'Sub-second responses, lower cost',
            points: [
              'Ideal for schema-constrained JSON output and summarization',
              'Lower per-session cost and energy footprint',
              'Can run close to the user or even on-device',
            ],
          },
          {
            name: 'Frontier Reasoning Models',
            subtitle: 'Deep synthesis, higher latency',
            points: [
              'Stronger multi-step reasoning across ambiguous domains',
              'Higher token cost and slower time-to-first-byte',
              'Best reserved for complex synthesis or ambiguous queries',
            ],
          },
        ],
        verdict: 'Route by task complexity: validate every model output against deterministic schemas regardless of size.',
      },
      {
        type: 'quiz',
        question: 'Why do production apps validate AI JSON outputs with runtime schemas like Zod?',
        options: [
          'Valid JSON syntax still does not guarantee required fields, safe URLs, or valid option indexes',
          'Because JSON cannot represent arrays',
          'Only to speed up CSS animations',
        ],
        correctOptionIndex: 0,
        explanation:
          'LLMs can emit syntactically valid JSON that still contains unexpected block types, missing fields, or unsafe links. Schema validation is the boundary that keeps UI rendering safe.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'ai model architecture circuit',
      alt: 'Geometric editorial diagram comparing compact and frontier computing topologies',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#2E5EAA',
    },
    followUps: [
      'How does model distillation preserve reasoning quality?',
      'What makes structured JSON decoding deterministic?',
    ],
    isAiEnriched: true,
    enrichmentNotice: 'Comparison matrix synthesized from AI systems engineering principles.',
    qualityStatus: 'approved',
    createdAt: '2026-11-15T11:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_tech_002',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'short_story',
    cardVariant: 'article',
    title: 'How Subsea Fiber Cables Carry Nearly All Intercontinental Internet Traffic',
    subtitle: 'Despite the fame of satellites, hair-thin glass strands resting on the abyssal ocean floor remain the backbone of global connectivity.',
    category: 'technology',
    topics: ['internet', 'infrastructure', 'networking', 'engineering'],
    estimatedDurationSeconds: 120,
    source: {
      publisher: 'TeleGeography Submarine Cable Map',
      title: 'Submarine Cable Frequently Asked Questions',
      url: 'https://www.submarinecablemap.com/',
      publishedAt: '2026-10-19T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Over 98% of international internet data travels through roughly 500 active undersea fiber-optic cable systems, each barely thicker than a garden hose in deep water.',
    blocks: [
      {
        type: 'paragraph',
        text: 'When you load a webpage hosted across an ocean, photons typically race through glass fibers laid along seabed trenches rather than bouncing off orbital satellites. Near shallow coasts, cables wear heavy steel armor against ship anchors and fishing trawlers; in the deep ocean, a thin polyethylene jacket suffices.',
      },
      {
        type: 'fact_reveal',
        label: 'How signals cross 6,000 kilometers without fading',
        text: 'Every 60 to 100 kilometers along the cable sits an optical repeater powered by high-voltage direct current carried through a copper conductor inside the same cable—amplifying light directly using erbium-doped fiber without converting it back to electricity.',
      },
      {
        type: 'rabbit_hole',
        prompt: 'Trace how packets find a new route when an undersea cable snaps',
        topic: 'internet routing',
        category: 'technology',
        description: 'A bounded 5-minute look at BGP, latency, and resilient global networks.',
        estimatedMinutes: 5,
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'undersea fiber optic cable map',
      alt: 'Editorial contour lines representing subsea cables crossing ocean basins',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#1E4E79',
    },
    followUps: [
      'How do repair ships locate and splice a snapped cable 4 km underwater?',
      'Why do satellites complement rather than replace subsea fiber?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-14T10:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_tech_003',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'interactive_feature',
    title: 'Why QR Codes Still Scan Even When 30% of the Square Is Damaged',
    subtitle: 'Reed–Solomon error correction turns printed ink into fault-tolerant digital storage.',
    category: 'technology',
    topics: ['computer science', 'algorithms', 'qr code', 'design'],
    estimatedDurationSeconds: 80,
    source: {
      publisher: 'DENSO WAVE',
      title: 'History and Error Correction of QR Codes',
      url: 'https://www.qrcode.com/en/about/error_correction.html',
      publishedAt: '2026-07-15T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Invented in 1994 to track automotive parts on fast-moving assembly lines, QR codes embed mathematical redundancy using Reed–Solomon codes so smudges or logos do not break decoding.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Masahiro Hara and his team at Denso Wave designed QR codes after noticing how cleanly black-and-white stones stood out on a Go board. The three corner finder squares let cameras detect orientation from any angle in milliseconds.',
      },
      {
        type: 'fact_reveal',
        label: 'Why the ratio 1:1:3:1:1 matters',
        text: 'The dark-light-dark-light-dark band proportions across each corner square (1:1:3:1:1) rarely occur naturally in printed text or backgrounds, giving scanners a fast geometric anchor.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'qr code matrix geometry',
      alt: 'Minimal geometric matrix pattern inspired by QR code finder squares',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#2E5EAA',
    },
    followUps: [
      'Where else is Reed–Solomon error correction used (like CDs and deep-space probes)?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-08T10:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },

  // ===================== INTERESTING FACTS & DISCOVERIES =====================
  {
    id: 'curio_fact_001',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'interactive_fact',
    cardVariant: 'interactive_feature',
    title: 'The Library of Alexandria Wasn’t Destroyed in a Single Dramatic Fire',
    subtitle: 'Historical records point to centuries of gradual defunding, political turmoil, and multiple smaller fires.',
    category: 'facts',
    topics: ['antiquity', 'myths', 'books', 'history'],
    estimatedDurationSeconds: 90,
    source: {
      publisher: 'Encyclopaedia Britannica',
      title: 'Library of Alexandria',
      url: 'https://www.britannica.com/topic/Library-of-Alexandria',
      publishedAt: '2026-06-18T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Popular imagination pictures one catastrophic blaze wiping out ancient knowledge overnight, yet scholarship indicates a slow decline across roughly four centuries.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Julius Caesar’s harbor fire in 48 BCE likely burned waterfront warehouses storing scrolls, not necessarily the entire main collection. Scholars continued citing and working in Alexandria for generations afterward, until imperial patronage dwindled and civil conflicts battered the Royal Quarter in the 3rd century CE.',
      },
      {
        type: 'fact_reveal',
        label: 'How the library originally built its collection',
        text: 'Ptolemaic officials reportedly inspected ships docking in Alexandria’s harbor, borrowed every scroll on board, had scribes copy them, and kept the originals while returning the fresh copies to the ship captains.',
      },
      {
        type: 'quiz',
        question: 'What best describes how the ancient Library of Alexandria declined?',
        options: [
          'A gradual decline over centuries involving budget cuts, political instability, and several separate incidents',
          'A single volcanic eruption in 79 CE',
          'It was peacefully packed up and moved to Rome in one week',
        ],
        correctOptionIndex: 0,
        explanation:
          'Historians emphasize that institutional decay—reduced royal funding, expulsion of scholars, and repeated urban unrest—did more long-term damage than any single fire.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'ancient papyrus scroll library',
      alt: 'Editorial architectural motif evoking classical columns and scroll geometry',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#C84B31',
    },
    followUps: [
      'Why were many ancient texts lost simply because nobody re-copied them?',
      'What was the Serapeum daughter library?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-13T09:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_fact_002',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'interactive_feature',
    title: 'Why Clouds Can Weigh Half a Million Kilograms Yet Still Float',
    subtitle: 'A fair-weather cumulus cloud holds the mass of roughly 100 elephants—spread across a vast volume of buoyant air.',
    category: 'facts',
    topics: ['weather', 'physics', 'atmosphere', 'nature'],
    estimatedDurationSeconds: 65,
    source: {
      publisher: 'U.S. Geological Survey',
      title: 'How Much Does a Cloud Weigh?',
      url: 'https://www.usgs.gov/special-topics/water-science-school/science/how-much-does-a-cloud-weigh',
      publishedAt: '2026-05-10T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'An average cumulus cloud spanning a cubic kilometer contains roughly 500 metric tons of microscopic water droplets suspended by gentle updrafts and lower density than surrounding dry air.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Clouds look weightless because their liquid water is dispersed into billions of microscopic droplets only ~10 micrometers wide. Each droplet falls so slowly that ordinary rising air currents effortlessly keep it aloft.',
      },
      {
        type: 'fact_reveal',
        label: 'Counterintuitive chemistry fact',
        text: 'Water vapor (H₂O, molecular weight ~18) is actually lighter than dry air dominated by nitrogen (N₂, ~28) and oxygen (O₂, ~32)—so humid air is slightly less dense than dry air at the same temperature.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'cumulus cloud physics sky',
      alt: 'Clean editorial graphic illustrating atmospheric updrafts and cloud layers',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#C84B31',
    },
    followUps: [
      'When do microscopic droplets grow heavy enough to fall as rain?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-09T09:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_fact_003',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quiz_challenge',
    cardVariant: 'interactive_feature',
    title: 'The Coastline Paradox: Why Measuring a Border Depends on Your Ruler',
    subtitle: 'Shorter measuring sticks reveal ever more bays and peninsulas—leading directly to fractal geometry.',
    category: 'facts',
    topics: ['mathematics', 'geography', 'fractals', 'mandelbrot'],
    estimatedDurationSeconds: 95,
    source: {
      publisher: 'Santa Fe Institute / Fractal Geometry',
      title: 'How Long Is the Coast of Britain?',
      url: 'https://en.wikipedia.org/wiki/Coastline_paradox',
      publishedAt: '2026-07-02T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'In the 1950s, Lewis Fry Richardson noticed neighboring countries disagreed by 20% on the length of their shared border—because they measured with different map scales.',
    blocks: [
      {
        type: 'paragraph',
        text: 'When you measure a jagged coastline with a 100 km straight ruler, you cut across bays and headlands. Switch to a 10 km ruler, and the measured length jumps dramatically. Benoit Mandelbrot popularized this phenomenon in 1967, laying groundwork for fractal dimension.',
      },
      {
        type: 'quiz',
        question: 'What happens to the measured length of a natural jagged coastline as you shrink the length of your measuring stick?',
        options: [
          'It increases steadily because finer indentations and inlets are captured',
          'It always converges immediately after two measurements',
          'It gets shorter because corners are rounded off',
        ],
        correctOptionIndex: 0,
        explanation:
          'Because coastlines exhibit self-similar roughness across scales, smaller rulers trace more detail, causing measured length to grow according to a power law characterized by its fractal dimension.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'fractal coastline geometry map',
      alt: 'Minimal line graphic showing recursive fractal coastline segments',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#C84B31',
    },
    followUps: [
      'How do cartographers agree on official country coastline figures?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-06T09:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },

  // ===================== TRAVEL, FOOD & LIFESTYLE =====================
  {
    id: 'curio_trav_001',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'short_story',
    cardVariant: 'hero_image',
    title: 'How Kyoto’s Machiya Townhouses Engineered Natural Air Conditioning Centuries Ago',
    subtitle: 'Narrow wooden facades, mossy inner courtyards, and seasonal reed screens work together as a passive cooling machine.',
    category: 'travel_food',
    topics: ['architecture', 'japan', 'travel', 'design'],
    estimatedDurationSeconds: 120,
    source: {
      publisher: 'Kyoto Center for Community Collaboration',
      title: 'Kyo-machiya Traditional Architecture',
      url: 'https://www.kyoto.travel/en/see-and-do/architecture.html',
      publishedAt: '2026-09-28T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Kyoto’s historic machiya houses pair long corridor breezes (toriniwa) with shaded pocket gardens (tsuboniwa) to pull cool air across rooms during humid summers.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Because historic urban taxes were once assessed by street frontage width, Kyoto merchants built narrow, deep timber houses dubbed "eel’s bedrooms." Far from being cramped, their depth enabled clever thermal engineering: a shaded earthen hallway runs front-to-back while a tiny courtyard garden creates a pressure differential that draws breezes indoors.',
      },
      {
        type: 'fact_reveal',
        label: 'A seasonal wardrobe for the house itself',
        text: 'Each June, residents perform tategu-gae—swapping heavy winter sliding paper doors for woven reed screens (sudare) so air and dappled light move freely through the entire house.',
      },
      {
        type: 'key_takeaway',
        heading: 'Passive design lessons still relevant today',
        points: [
          'Cross-ventilation paired with shaded planted micro-courtyards cuts indoor heat without mechanical load.',
          'Sprinkling water on street stones (uchimizu) cools incoming breezes through evaporation.',
        ],
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'kyoto machiya wooden lattice architecture',
      alt: 'Warm editorial architectural illustration of timber lattice and courtyard airflow',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#B86B27',
    },
    followUps: [
      'How does uchimizu evaporative cooling compare to modern urban misting?',
      'Which historic Kyoto neighborhoods still preserve machiya rows?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-14T08:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_trav_002',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'interactive_fact',
    cardVariant: 'interactive_feature',
    title: 'Why Tomatoes Were Missing From Italian Cuisine Until Centuries After Columbus',
    subtitle: 'Botanical suspicion, pewter plates, and southern peasant kitchens transformed an ornamental plant into a culinary icon.',
    category: 'travel_food',
    topics: ['food history', 'italy', 'culinary', 'culture'],
    estimatedDurationSeconds: 100,
    source: {
      publisher: 'Smithsonian Magazine',
      title: 'Why the Tomato Was Feared in Europe for More Than 200 Years',
      url: 'https://www.smithsonianmag.com/arts-culture/why-the-tomato-was-feared-in-europe-for-more-than-200-years-863735/',
      publishedAt: '2026-08-14T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Native to the Americas, tomatoes were initially grown in European aristocratic gardens as exotic curiosities—and only entered mainstream Italian cooking in the late 17th and 18th centuries.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Belonging to the nightshade family alongside toxic belladonna, early European botanists viewed the tomato with caution. Wealthy diners who ate acidic tomatoes off high-lead pewter plates occasionally suffered lead poisoning, deepening the fruit’s suspicious reputation.',
      },
      {
        type: 'fact_reveal',
        label: 'The first printed Italian tomato sauce recipe',
        text: 'Antonio Latini’s 1692 cookbook published in Naples featured a "Spanish-style" tomato sauce—chopping roasted tomatoes with onion, chili, and herbs—sparking a culinary revolution in southern Italy.',
      },
      {
        type: 'comparison',
        heading: 'Before vs. After the Columbian Exchange in Mediterranean kitchens',
        items: [
          {
            name: 'Pre-1500s Italy',
            subtitle: 'Old World staples',
            points: [
              'Wheat pasta dressed with cheese, olive oil, spices, and broth',
              'Citrus, garlic, figs, and herbs anchored flavors',
            ],
          },
          {
            name: 'Post-1700s Italy',
            subtitle: 'New World fusion',
            points: [
              'Tomatoes, chili peppers, and polenta cornmeal entered regional identities',
              'Neapolitan street pizza gained its iconic red sauce',
            ],
          },
        ],
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'italian culinary history tomato botanical',
      alt: 'Botanical editorial illustration celebrating culinary exchange across continents',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#B86B27',
    },
    followUps: [
      'How did San Marzano volcanic soil influence southern Italian tomatoes?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-11T08:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_trav_003',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'article',
    title: 'The Science of Umami: Why Parmigiano and Dashi Pair Better Than Either Alone',
    subtitle: 'Synergistic taste receptors multiply savory intensity up to eightfold when glutamates meet nucleotides.',
    category: 'travel_food',
    topics: ['food science', 'cooking', 'chemistry', 'taste'],
    estimatedDurationSeconds: 75,
    source: {
      publisher: 'Umami Information Center',
      title: 'Synergistic Effect of Umami Substances',
      url: 'https://www.umamiinfo.com/what/whatisumami/',
      publishedAt: '2026-07-29T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Japanese chemist Kikunae Ikeda identified glutamate in kombu kelp in 1908; combining glutamate-rich ingredients with inosinate or guanylate dramatically amplifies savory depth.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Traditional cuisines across the globe stumbled onto the same molecular synergy centuries before laboratory chemistry explained it: kombu (glutamate) plus bonito flakes (inosinate) in Japanese dashi; tomatoes plus aged cheese in Italian sauces; mushrooms plus slow-simmered broths in French cooking.',
      },
      {
        type: 'key_takeaway',
        heading: 'Kitchen shortcut',
        points: [
          'Pair a plant glutamate source (tomatoes, soy sauce, miso, kelp) with dried mushrooms or aged cheese for deep flavor with less salt.',
        ],
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'culinary umami flavor science',
      alt: 'Warm graphic motif representing flavor synergy in culinary science',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#B86B27',
    },
    followUps: [
      'Why does slow fermentation increase free glutamate in cheeses and soy sauce?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-07T08:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },

  // ===================== NEWS & CURRENT AFFAIRS =====================
  {
    id: 'curio_news_001',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'short_story',
    cardVariant: 'article',
    title: 'Grid-Scale Batteries Are Quietly Rewriting Evening Electricity Markets',
    subtitle: 'Utility-scale lithium and iron-air storage now absorb midday solar surges and dispatch power after sunset.',
    category: 'news',
    topics: ['energy', 'climate', 'grid', 'economics'],
    estimatedDurationSeconds: 115,
    source: {
      publisher: 'International Energy Agency',
      title: 'Batteries and Secure Energy Transitions',
      url: 'https://www.iea.org/reports/batteries-and-secure-energy-transitions',
      publishedAt: '2026-11-14T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Declining battery pack costs have propelled utility-scale storage from niche frequency regulation to supplying gigawatts of evening peak electricity across major grids.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Solar power’s long-standing challenge has been timing: generation peaks around noon while household demand surges at dusk. Multi-hour battery installations in California, Texas, Australia, and Europe increasingly soak up cheap midday solar and release it across the evening ramp.',
      },
      {
        type: 'fact_reveal',
        label: 'Why duration still matters',
        text: 'Today’s lithium-ion plants excel at 2-to-4-hour daily shifts, which is why utilities are simultaneously piloting iron-air, thermal, and pumped-hydro storage for multi-day cloudy stretches.',
      },
      {
        type: 'key_takeaway',
        heading: 'Signal to watch',
        points: [
          'Grid storage additions have become the fastest-growing electricity technology globally according to IEA tracking.',
          'Interconnection queues and transmission upgrades remain the primary bottleneck rather than battery chemistry alone.',
        ],
      },
    ],
    visual: {
      type: 'gradient_emblem',
      query: 'grid scale energy storage',
      alt: 'Editorial graphic symbolizing power grid balance between midday solar and evening storage',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#335C67',
    },
    followUps: [
      'How do sodium-ion and iron-air batteries differ from lithium-ion for grid storage?',
    ],
    isAiEnriched: true,
    enrichmentNotice: 'Grounded summary based on IEA energy transition reporting.',
    qualityStatus: 'approved',
    createdAt: '2026-11-16T09:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_news_002',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'article',
    title: 'Why Global Shipping Routes Remain Sensitive to Narrow Maritime Chokepoints',
    subtitle: 'Just a handful of straits and canals handle the majority of seaborne trade, reshaping freight times when disrupted.',
    category: 'news',
    topics: ['global trade', 'logistics', 'geopolitics', 'economics'],
    estimatedDurationSeconds: 95,
    source: {
      publisher: 'UN Trade and Development (UNCTAD)',
      title: 'Review of Maritime Transport',
      url: 'https://unctad.org/topic/transport-and-trade-logistics/review-of-maritime-transport',
      publishedAt: '2026-11-10T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Roughly 80% of global merchandise volume moves by sea, concentrating supply-chain resilience around chokepoints like the Suez Canal, Panama Canal, and Strait of Malacca.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Whether triggered by drought lowering Panama Canal water levels or security risks rerouting vessels around the Cape of Good Hope, adding 10 to 14 days per voyage absorbs global container capacity and ripples into port schedules months later.',
      },
      {
        type: 'comparison',
        heading: 'Short-term vs. structural supply-chain responses',
        items: [
          {
            name: 'Immediate rerouting',
            points: [
              'Longer voyages increase fuel burn and tighten vessel availability',
              'Air-sea hybrid freight fills urgent component gaps',
            ],
          },
          {
            name: 'Longer-term diversification',
            points: [
              'Manufacturers hold slightly larger safety buffers for critical inputs',
              'Regionalized assembly reduces single-corridor dependency',
            ],
          },
        ],
      },
    ],
    visual: {
      type: 'gradient_emblem',
      query: 'maritime trade routes',
      alt: 'Clean editorial chart graphic evoking maritime trade corridors',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#335C67',
    },
    followUps: [
      'Why does freshwater rainfall directly limit how many ships can cross the Panama Canal?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-15T07:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_news_003',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'article',
    title: 'How Digital Public Infrastructure Is Transforming Everyday Payments Worldwide',
    subtitle: 'Interoperable instant-payment rails lower transaction friction for small merchants and cross-border commerce.',
    category: 'news',
    topics: ['fintech', 'public policy', 'payments', 'economics'],
    estimatedDurationSeconds: 85,
    source: {
      publisher: 'Bank for International Settlements',
      title: 'Fast Payment Systems and Financial Inclusion',
      url: 'https://www.bis.org/cpmi/publ/d202.htm',
      publishedAt: '2026-11-02T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Systems like India’s UPI and Brazil’s Pix demonstrate how open, bank-interoperable instant payment protocols expand digital participation far beyond traditional card networks.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Unlike closed wallet ecosystems that trap users inside one app, public instant-payment protocols set shared messaging and settlement standards so any regulated bank or app can transact in seconds at minimal cost.',
      },
      {
        type: 'key_takeaway',
        heading: 'Core design insight',
        points: [
          'Open interoperability paired with real-time settlement lowers barriers for street vendors and small businesses.',
        ],
      },
    ],
    visual: {
      type: 'gradient_emblem',
      query: 'digital public infrastructure',
      alt: 'Editorial graphic representing open interconnected payment rails',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#335C67',
    },
    followUps: [
      'How do countries link domestic instant-payment systems for cross-border transfers?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-12T07:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },

  // ===================== HISTORY & STORYTELLING =====================
  {
    id: 'curio_hist_001',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'deep_dive',
    cardVariant: 'hero_image',
    title: 'The 1854 Broad Street Cholera Map That Invented Modern Epidemiology',
    subtitle: 'John Snow plotted deaths block by block and challenged the reigning theory of "bad air."',
    category: 'history',
    topics: ['medicine', 'data visualization', 'london', 'epidemiology'],
    estimatedDurationSeconds: 130,
    source: {
      publisher: 'UCLA Department of Epidemiology',
      title: 'John Snow and the Broad Street Pump',
      url: 'https://www.ph.ucla.edu/epi/snow.html',
      publishedAt: '2026-09-01T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'By mapping cholera cases in Soho alongside interviews with local families, physician John Snow traced a deadly outbreak to a contaminated water pump—showing the power of spatial data.',
    blocks: [
      {
        type: 'paragraph',
        text: 'In August 1854, cholera killed hundreds of residents around Soho within days. Most physicians blamed "miasma"—foul-smelling air. John Snow suspected contaminated drinking water and interviewed households door to door, discovering anomalies that clinched his case.',
      },
      {
        type: 'fact_reveal',
        label: 'The brewery clue',
        text: 'None of the 70 workers at the Broad Street brewery contracted cholera—because they drank daily rations of fermented malt liquor instead of water from the street pump right outside their door.',
      },
      {
        type: 'timeline',
        heading: 'How evidence shifted public health',
        events: [
          {
            year: 'Aug 31, 1854',
            title: 'Outbreak erupts in Soho',
            detail: 'Over 120 residents near Broad Street die within the first three days.',
          },
          {
            year: 'Sept 8, 1854',
            title: 'Pump handle removed',
            detail: 'Persuaded by Snow’s evidence, local officials disable the Broad Street pump.',
          },
          {
            year: '1855',
            title: 'Reverend Henry Whitehead confirms index case',
            detail: 'Initially a skeptic, local curate Whitehead helps uncover a leaking cesspool just three feet from the well.',
          },
        ],
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'john snow cholera map london',
      alt: 'Editorial cartographic motif inspired by nineteenth-century street block mapping',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#7A5438',
    },
    followUps: [
      'Why was Reverend Henry Whitehead’s skepticism so important to proving Snow’s case?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-13T10:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_hist_002',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'short_story',
    cardVariant: 'interactive_feature',
    title: 'The Antikythera Mechanism: A 2,100-Year-Old Bronze Astronomical Computer',
    subtitle: 'Recovered by sponge divers off a Greek island in 1901, its interlocking gears predicted eclipses and Olympic cycles.',
    category: 'history',
    topics: ['archaeology', 'ancient greece', 'astronomy', 'engineering'],
    estimatedDurationSeconds: 115,
    source: {
      publisher: 'Antikythera Mechanism Research Project',
      title: 'Overview of the Antikythera Mechanism',
      url: 'https://en.wikipedia.org/wiki/Antikythera_mechanism',
      publishedAt: '2026-08-05T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Modern X-ray tomography revealed over 30 precision bronze gears inside a shoebox-sized shipwreck artifact, representing geared craftsmanship unseen again in Europe for over a millennium.',
    blocks: [
      {
        type: 'paragraph',
        text: 'When Greek divers pulled encrusted bronze fragments from a Roman-era shipwreck in 1901, nobody realized the corroded lump hid an intricate mechanical cosmos. Turning a hand crank moved pointers tracking the Sun, the Moon’s variable speed, eclipse cycles, and the four-year Panhellenic Games calendar.',
      },
      {
        type: 'quiz',
        question: 'What modern imaging technique allowed researchers to read microscopic inscriptions hidden inside the corroded bronze fragments?',
        options: [
          '3D X-ray computed tomography and surface imaging',
          'Submerging it in acid',
          'Satellite radar',
        ],
        correctOptionIndex: 0,
        explanation:
          'High-resolution X-ray tomography let scientists map internal gear teeth and read tiny Greek inscriptions—effectively discovering a user manual engraved right onto the casing.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'antikythera bronze gears astronomy',
      alt: 'Editorial line art of interlocking bronze astronomical gear rings',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#7A5438',
    },
    followUps: [
      'How did the mechanism model the Moon’s slightly irregular elliptical orbit using circular gears?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-10T10:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_hist_003',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'article',
    title: 'How Standard Time Zones Were Born Out of Railroad Collisions',
    subtitle: 'Before the 1880s, neighboring towns set clocks by their own local noon—creating chaos for train schedules.',
    category: 'history',
    topics: ['railroads', 'time', 'standardization', 'history'],
    estimatedDurationSeconds: 80,
    source: {
      publisher: 'Smithsonian National Museum of American History',
      title: 'Standard Time Zones and the Railroads',
      url: 'https://americanhistory.si.edu/explore/exhibitions/on-time',
      publishedAt: '2026-07-11T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'In November 1883, North American railroads coordinated "The Day of Two Noons," replacing hundreds of conflicting local solar times with four unified time zones.',
    blocks: [
      {
        type: 'paragraph',
        text: 'When stagecoaches traveled slowly, a 12-minute clock difference between two cities barely mattered. High-speed single-track railways turned mismatched station clocks into a deadly hazard—prompting railway engineers and Canadian inventor Sandford Fleming to champion uniform hourly zones.',
      },
      {
        type: 'fact_reveal',
        label: 'Why November 18, 1883 was nicknamed "The Day of Two Noons"',
        text: 'When rail clocks shifted at midday in eastern cities to adopt Standard Time, residents experienced local solar noon and then—minutes later—the new official standard noon.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'vintage railway clock time zones',
      alt: 'Editorial dial motif evoking railway timekeepers and meridian lines',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#7A5438',
    },
    followUps: [
      'Why does China operate on a single time zone despite spanning five geographical meridians?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-05T10:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },

  // ===================== PERSONAL GROWTH & LEARNING =====================
  {
    id: 'curio_grow_001',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'interactive_fact',
    cardVariant: 'interactive_feature',
    title: 'The Testing Effect: Why Retrieving an Idea Beats Rereading It Five Times',
    subtitle: 'Cognitive psychology consistently shows that gentle effortful recall wires memory far better than passive highlighting.',
    category: 'growth',
    topics: ['learning', 'memory', 'psychology', 'habits'],
    estimatedDurationSeconds: 105,
    source: {
      publisher: 'Association for Psychological Science',
      title: 'Improving Students’ Learning With Effective Learning Techniques',
      url: 'https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html',
      publishedAt: '2026-09-20T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Rereading creates an "illusion of competence" because text feels familiar; briefly closing the page and explaining the idea in your own words strengthens durable retrieval.',
    blocks: [
      {
        type: 'paragraph',
        text: 'In classic experiments by Roediger and Karpicke, students who studied a passage once and then practiced recalling it remembered significantly more a week later than peers who spent the same time rereading repeatedly—even though the rereaders felt more confident immediately afterward.',
      },
      {
        type: 'comparison',
        heading: 'Passive fluency vs. active retrieval',
        items: [
          {
            name: 'Rereading & Highlighting',
            subtitle: 'Feels smooth, fades quickly',
            points: [
              'Builds recognition familiarity, not recall strength',
              'Easy to overestimate how much actually stuck',
            ],
          },
          {
            name: 'Retrieval & Spaced Quizzes',
            subtitle: 'Feels slightly harder, sticks longer',
            points: [
              'Forces the brain to reconstruct pathways on demand',
              'Exposes blind spots immediately so review is targeted',
            ],
          },
        ],
        verdict: 'Even a single one-sentence reflection at the end of a 5-minute reading session dramatically boosts retention.',
      },
      {
        type: 'rabbit_hole',
        prompt: 'Explore spaced repetition and the forgetting curve',
        topic: 'spaced repetition',
        category: 'growth',
        description: 'A finite 5-minute look at how timing your reviews multiplies long-term memory.',
        estimatedMinutes: 5,
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'memory learning psychology pathways',
      alt: 'Clean editorial botanical-pathway diagram symbolizing memory reinforcement',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#2D6A4F',
    },
    followUps: [
      'What is "desirable difficulty" in learning research?',
      'How does interleaving different topics compare to blocking one topic?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-14T11:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_grow_002',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'short_story',
    cardVariant: 'interactive_feature',
    title: 'Chesterton’s Fence: A Mental Model for Smarter Changes',
    subtitle: 'Before dismantling an old rule, process, or piece of code, make sure you understand why someone built it.',
    category: 'growth',
    topics: ['mental models', 'decision making', 'philosophy', 'systems'],
    estimatedDurationSeconds: 90,
    source: {
      publisher: 'Farnam Street / G.K. Chesterton (1929)',
      title: 'Chesterton’s Fence: A Lesson in Second-Order Thinking',
      url: 'https://fs.blog/chestertons-fence/',
      publishedAt: '2026-08-18T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Coined from a 1929 essay by G.K. Chesterton, this principle warns against removing a seemingly pointless constraint until you grasp the original problem it solved.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Chesterton pictured two reformers approaching a fence stretched across a road. The hasty reformer says, "I don’t see the use of this; let’s clear it away." The wiser one replies: "If you don’t see the use of it, I certainly won’t let you clear it away. Go away and think. Then, when you can come back and tell me that you do see the use of it, I may allow you to destroy it."',
      },
      {
        type: 'key_takeaway',
        heading: 'How to apply it without getting stuck in status quo',
        points: [
          'Chesterton’s Fence is not an argument against change—it is an argument for understanding context before changing.',
          'Once you verify the original threat no longer exists (or have a better safeguard), remove the fence decisively.',
        ],
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'mental models systems thinking',
      alt: 'Minimal editorial graphic of balanced geometric frames representing systems thinking',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#2D6A4F',
    },
    followUps: [
      'How does Chesterton’s Fence relate to second-order consequences?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-11T11:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_grow_003',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'interactive_feature',
    title: 'Goodhart’s Law: Why Metrics Break the Moment You Optimize Only for Them',
    subtitle: 'When a measure becomes a target, it ceases to be a good measure.',
    category: 'growth',
    topics: ['economics', 'metrics', 'product design', 'mental models'],
    estimatedDurationSeconds: 75,
    source: {
      publisher: 'Oxford Reference / Charles Goodhart',
      title: 'Goodhart’s Law',
      url: 'https://en.wikipedia.org/wiki/Goodhart%27s_law',
      publishedAt: '2026-06-30T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Economist Charles Goodhart observed that statistical proxies distort once incentives latch onto them—a direct lesson in why maximizing raw screen time harms discovery apps.',
    blocks: [
      {
        type: 'paragraph',
        text: 'If a social platform equates "time spent in app" with user happiness, algorithms rapidly learn that outrage and endless loops keep thumbs scrolling far longer than satisfying, finite learning ever would.',
      },
      {
        type: 'quiz',
        question: 'Which product metric best avoids Goodhart’s Law traps for a learning app?',
        options: [
          'Pairing session completion and user-rated usefulness rather than raw minutes spent',
          'Maximizing total notifications sent per day',
          'Removing exit boundaries so users scroll indefinitely',
        ],
        correctOptionIndex: 0,
        explanation:
          'Balanced outcome metrics—such as whether the user completed a bounded session and saved or enjoyed something useful—align the product with genuine value.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'goodharts law compass target',
      alt: 'Editorial compass illustration contrasting meaningful direction with raw metrics',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#2D6A4F',
    },
    followUps: [
      'What is the Cobra Effect, and how is it related to Goodhart’s Law?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-09T11:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },

  // ===================== HUMOUR & ENTERTAINMENT =====================
  {
    id: 'curio_hum_001',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'interactive_fact',
    cardVariant: 'interactive_feature',
    title: 'The "Wilhelm Scream": How One 1951 Sound Clip Snuck Into Over 400 Movies',
    subtitle: 'An archival stock scream became cinema’s longest-running inside joke among sound designers.',
    category: 'humour',
    topics: ['cinema', 'sound design', 'pop culture', 'easter eggs'],
    estimatedDurationSeconds: 85,
    source: {
      publisher: 'Hollywood Lost and Found / Film Sound Archive',
      title: 'The Wilhelm Scream',
      url: 'https://en.wikipedia.org/wiki/Wilhelm_scream',
      publishedAt: '2026-08-29T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Recorded in 1951 for the Western Distant Drums, a distinctive stock scream was rediscovered in the Warner Bros. library by Ben Burtt and slipped into Star Wars, Indiana Jones, and hundreds of films since.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Sound designer Ben Burtt noticed the same theatrical cry popping up in old studio films and dubbed it the "Wilhelm" after a minor character in 1953’s The Charge at Feather River. After he tucked it into Star Wars (1977) when a stormtrooper tumbles off a ledge, fellow sound editors turned hiding it in blockbusters into a proud craft tradition.',
      },
      {
        type: 'fact_reveal',
        label: 'Who actually voiced the original scream?',
        text: 'Archival studio call sheets point to singer and actor Sheb Wooley—the same artist who later topped the 1958 music charts with the novelty song "The Purple People Eater."',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'cinema sound wave film reel',
      alt: 'Playful editorial acoustic waveform inside a classic cinema frame',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#8E4A6B',
    },
    followUps: [
      'Are there other famous stock audio Easter eggs used by film sound designers?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-13T12:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_hum_002',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'quick_bite',
    cardVariant: 'interactive_feature',
    title: 'Paper Towns & Mountweazels: Why Mapmakers and Dictionaries Invented Fake Entries',
    subtitle: 'Fictitious towns and imaginary people served as copyright traps—and occasionally became real places.',
    category: 'humour',
    topics: ['language', 'cartography', 'trivia', 'wordplay'],
    estimatedDurationSeconds: 95,
    source: {
      publisher: 'New Yorker / Lexicography History',
      title: 'The Secret History of Fictitious Dictionary Entries',
      url: 'https://en.wikipedia.org/wiki/Fictitious_entry',
      publishedAt: '2026-07-22T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'To catch rivals copying their work, cartographers added non-existent "trap streets" and encyclopedists inserted invented biographies like Lillian Virginia Mountweazel.',
    blocks: [
      {
        type: 'paragraph',
        text: 'The 1975 New Columbia Encyclopedia included a lively entry for Lillian Virginia Mountweazel—supposedly a fountain designer turned photographer of rural American mailboxes who perished in an explosion while on assignment for Combustibles magazine. None of it was real; it was a whimsical copyright fingerprint.',
      },
      {
        type: 'fact_reveal',
        label: 'When a fake map town came to life',
        text: 'In the 1930s, mapmakers invented "Agloe, New York" using an anagram of their initials. Years later, someone actually opened the Agloe General Store at that exact rural crossroads after seeing the name on a road map!',
      },
      {
        type: 'quiz',
        question: 'Why did mapmakers historically add a fake "trap street" or "paper town" onto printed maps?',
        options: [
          'To prove copyright infringement if a competitor copied their map',
          'To test printers’ ink density',
          'To keep tourists away from national parks',
        ],
        correctOptionIndex: 0,
        explanation:
          'Because geographic reality cannot be copyrighted, deliberate tiny inventions made unauthorized direct copying immediately verifiable.',
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'fictional cartography compass map',
      alt: 'Whimsical editorial map grid highlighting an imaginary crossroads',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#8E4A6B',
    },
    followUps: [
      'What is a "ghost word" in English dictionaries (like dord)?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-10T12:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
  {
    id: 'curio_hum_003',
    schemaVersion: CURRENT_CONTENT_SCHEMA_VERSION,
    contentType: 'short_story',
    cardVariant: 'article',
    title: 'How a 19th-Century Typographical Prank Gave Us the Word "OK"',
    subtitle: 'An 1839 Boston newspaper fad for playful misspellings—"oll korrect"—outlived every rival slang term of its era.',
    category: 'humour',
    topics: ['etymology', 'language', 'history', 'wit'],
    estimatedDurationSeconds: 85,
    source: {
      publisher: 'Smithsonian Magazine / Allen Walker Read',
      title: 'How "OK" Became the Most Spoken Word on the Planet',
      url: 'https://www.smithsonianmag.com/smart-news/how-word-ok-was-invented-175-years-ago-180950245/',
      publishedAt: '2026-06-05T00:00:00.000Z',
      retrievedAt: SEED_RETRIEVED_AT,
    },
    summary:
      'Linguist Allen Walker Read traced "OK" to a satirical 1839 abbreviation craze in Boston newspapers, later propelled nationwide by an 1840 presidential campaign slogan.',
    blocks: [
      {
        type: 'paragraph',
        text: 'In the late 1830s, Boston humorists loved inventing tongue-in-cheek initialisms for misspelled phrases: OW for "oll wright," KY for "know yuse," and OK for "oll korrect." Almost all vanished within months—except OK, which got adopted by supporters of President Martin Van Buren, nicknamed "Old Kinderhook."',
      },
      {
        type: 'key_takeaway',
        heading: 'Why it conquered the globe',
        points: [
          'Two crisp letters that were effortless to tap in Morse code made "OK" the universal confirmation signal of the telegraph era.',
        ],
      },
    ],
    visual: {
      type: 'editorial_illustration',
      query: 'vintage letterpress typography newsprint',
      alt: 'Editorial letterpress stamp motif celebrating wordplay and etymology',
      attribution: 'Curio Editorial Graphics',
      license: 'First-party SVG',
      provider: 'Curio Design System',
      accentColor: '#8E4A6B',
    },
    followUps: [
      'What other everyday words began as 19th-century jokes or slang?',
    ],
    isAiEnriched: true,
    qualityStatus: 'approved',
    createdAt: '2026-11-04T12:00:00.000Z',
    enrichedAt: SEED_RETRIEVED_AT,
  },
];

// Validate the entire seed corpus at module load time and attach curated cover photography
// where no dedicated open-collection photo URL is already specified.
const VALIDATED_EVERGREEN_RECORDS: ContentRecord[] = RAW_EVERGREEN_RECORDS.map((item) => {
  const withVisual: ContentRecord = item.visual.imageUrl
    ? item
    : {
        ...item,
        visual: {
          ...item.visual,
          imageUrl: `/images/categories/${item.category}.jpg`,
          attribution: 'Curio Editorial Collection',
          license: 'Curio First-Party Visual',
        },
      };
  return ContentRecordSchema.parse(withVisual);
});

export function getEvergreenSeedRecords(): ContentRecord[] {
  return VALIDATED_EVERGREEN_RECORDS;
}

export class EvergreenSeedProvider implements ContentProvider {
  public readonly name = 'evergreen_curated_seed';

  public async discover(input: ContentDiscoveryRequest): Promise<ContentCandidate[]> {
    const records = getEvergreenSeedRecords();
    const focus = input.topicFocus?.toLowerCase();

    const ordered = [...records].sort((a, b) => {
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

    return ordered.slice(0, Math.max(input.limit, records.length)).map((record) => ({
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
