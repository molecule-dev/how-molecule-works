/**
 * Everything the graphic SAYS, in one place. The SVG generator
 * (`build-animation.mjs`) draws these for the README loop and the desktop
 * slides, and copies them to `src/animation/content.json` for the HTML panels
 * the site shows on narrow screens — so the two can never drift apart.
 *
 * Keep it plain: one descriptive sentence per scene, no fixed counts, no named
 * stacks (they grow and change faster than this graphic).
 */

const SITE = 'https://www.molecule.dev'
const PKG = (name) => `${SITE}/packages/${name}`
/** The catalog searched for one category — every search is a link. */
const CAT = (category) => `${SITE}/packages#q=${encodeURIComponent(`category:${category}`)}`

/** The five scenes: id (deep link), index label, and the one-sentence caption with its links. */
export const SCENES = [
  {
    id: 'describe',
    label: 'Describe',
    title:
      'Describe the app in the molecule.dev IDE, the mlcl CLI or any MCP agent, and Synthase assembles it from the open-source @molecule catalog.',
    links: [{ phrase: '@molecule catalog', href: `${SITE}/packages` }],
  },
  {
    id: 'bonds',
    label: 'Bonds',
    title:
      'Every provider sits behind a swappable bond, so changing the database is one import, not a rewrite.',
    links: [],
  },
  {
    id: 'built-in',
    label: 'Built in',
    title: 'Auth, payments, i18n, analytics, monitoring, tests and CI come wired in from day one.',
    links: [],
  },
  {
    id: 'feedback',
    label: 'Feedback loop',
    title:
      'Built-in analytics, error tracking and feedback let the AI keep improving the app from real use.',
    links: [],
  },
  {
    id: 'outcomes',
    label: 'Outcomes',
    title:
      'Faster, cheaper, higher-quality apps for web, mobile and API that stay easy to update and scale.',
    links: [],
  },
]

// ---------------------------------------------------------------- scene 1
export const PROMPT_LINES = [
  'An AI travel agent that books',
  'flights by voice, rebooks when',
  'they’re delayed, and splits the bill.',
]
export const PROMPT = PROMPT_LINES.join(' ')
/** Opens molecule.dev with the prompt prefilled and selected. */
export const PROMPT_HREF = `${SITE}/#prompt=${encodeURIComponent(PROMPT)}`
export const BADGES = [
  { label: 'molecule.dev IDE  ·  Synthase, the agent', href: SITE, mono: false },
  {
    label: 'mlcl  ·  the CLI, and an MCP server for any agent',
    href: 'https://github.com/molecule-dev/molecule#the-molecule-cli-mlcl-and-mcp-server',
    mono: true,
  },
]
export const HOW_NOTE =
  'It picks packages from their generated docs and wires them like hand-written code.'
export const TOOLS_NOTE =
  'Works with your favorite tools and AI agents, or just use the molecule.dev IDE.'
export const CATALOG_LABEL = '@molecule/*  ·  the catalog'
export const CATALOG_HREF = `${SITE}/packages`
/** The packages Synthase picks for the prompt, and what each gives you. */
export const NODES = [
  {
    name: 'api-ai',
    info: 'One AI interface with tools and streaming; the model provider is a swappable bond.',
  },
  {
    name: 'api-flights',
    info: 'Flight search, booking and status behind one interface; providers as bonds.',
  },
  {
    name: 'api-ai-speech',
    info: 'Speech to text and text to speech, so the agent can listen and talk back.',
  },
  {
    name: 'api-payments',
    info: 'Checkout, subscriptions and split bills; the payment provider is a bond.',
  },
  { name: 'api-sms', info: 'Texts and rebooking alerts; the SMS provider is a bond.' },
  {
    name: 'app-react',
    info: 'The React binding: hooks for auth, i18n, theme and routing over framework-agnostic cores.',
  },
  {
    name: 'app-analytics',
    info: 'Track once against the interface; the analytics provider is a bond.',
  },
  { name: 'app-react-native', info: 'The same app on iOS and Android, with native device bonds.' },
].map((n) => ({ ...n, href: PKG(n.name) }))
export const DONE = 'API + app  ·  compiles, tests pass, live preview'

// ---------------------------------------------------------------- scene 2
export const CORE = {
  name: '@molecule/api-database',
  href: PKG('api-database'),
  methods: 'findMany · create · update …',
}
/** The database bonds the slot cycles through. */
export const DB_BONDS = [
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'd1', label: 'Cloudflare D1' },
].map((b) => ({
  ...b,
  name: `@molecule/api-database-${b.id}`,
  href: PKG(`api-database-${b.id}`),
  info: `The ${b.label} bond. Change this one import and the application code above stays exactly as it is.`,
}))
export const CATEGORIES_LABEL = 'The same pattern for every category'
export const CATEGORIES = [
  'auth',
  'payments',
  'emails',
  'ai',
  'analytics',
  'realtime',
  'file-upload',
  'search',
  'queue',
  'sms',
  'i18n',
  'logger',
].map((c) => ({ name: c, href: CAT(c) }))
/**
 * The last chip of the category row: the rest of the catalog. A floor, not a
 * count — 122 categories follow the core-plus-bonds pattern on 2026-09-28, and
 * the number only grows.
 */
export const CATEGORIES_MORE = { label: 'all 120+ categories →', href: `${SITE}/packages` }
export const FRAMEWORKS_NOTE = 'Frameworks and platforms swap the same way.'

// ---------------------------------------------------------------- scene 3
export const TILES = [
  [
    'Auth & OAuth',
    'Sessions, passwords, two-factor and OAuth sign-in — @molecule/api-auth and app-auth.',
  ],
  [
    'Payments & billing',
    'Checkout, subscriptions and invoices — @molecule/api-payments, with the provider as a bond.',
  ],
  [
    'Database & migrations',
    'A typed data store with migrations; the database engine is a bond behind one interface.',
  ],
  [
    'i18n · dozens of languages',
    'Every UI string goes through t(); companion locale packages ship dozens of languages.',
  ],
  ['Analytics', 'One tracking interface on both ends; the provider is a bond.'],
  ['Logging & monitoring', 'Structured logging, health checks and uptime probes.'],
  [
    'Error tracking',
    'Exceptions captured with context on API and app; the tracker is a swappable bond.',
  ],
  ['Realtime', 'Live updates over WebSockets or server-sent events behind one interface.'],
  ['Uploads & media', 'File uploads to S3-compatible storage or disk, with image handling.'],
  ['Push notifications', 'Web push and mobile push through one bond.'],
  ['Search', 'Full-text search; the search engine is a bond.'],
  ['Feature flags', 'Flags and gradual rollouts, evaluated on both ends.'],
  [
    'Tests: unit, E2E',
    'Unit, integration and Playwright end-to-end tests are scaffolded with the app.',
  ],
  [
    'CI/CD & deploys',
    'CI workflows for the major git hosts, and one-click deploys from molecule.dev.',
  ],
  [
    'Accessibility (a11y)',
    'Semantic components, focus handling and contrast built into the UI kit.',
  ],
  [
    'Skills for AI agents',
    'Every project ships skills that teach any coding agent its conventions and packages.',
  ],
].map(([label, info], i) => {
  // Where each tile opens: a catalog category (the same ids the landing page
  // links), or a page for the two that are not a category of packages —
  // accessibility lives in the UI kit, the agent skills are documented in the README.
  const links = [
    'auth',
    'payments',
    'database',
    'i18n',
    'analytics',
    'monitoring',
    'error-tracking',
    'realtime',
    'file-upload',
    'push-notifications',
    'search',
    'feature-flags',
    'testing',
    'ci',
    'ui',
    'https://github.com/molecule-dev/molecule#the-molecule-cli-mlcl-and-mcp-server',
  ]
  const link = links[i]
  return { label, info, href: link.startsWith('http') ? link : CAT(link) }
})
export const TILES_NOTE =
  'Docs are generated from source, so an agent wires each package right the first time.'

// ---------------------------------------------------------------- scene 4
export const LOOP_STEPS = [
  'people use the app',
  'analytics · errors · feedback',
  'the AI reads the signals',
  'improves · ships · measures',
]
export const LOOP_CENTER = ['every release', 'a little better']
export const SIGNALS_LABEL = 'from your running app'
export const SIGNALS = [
  { kind: 'analytics', text: 'Where your users drop off, and which features they use' },
  { kind: 'error tracking', text: 'Every error your users hit, with its stack trace' },
  { kind: 'feedback', text: 'What your users ask for, in their own words' },
]
export const AI = {
  label: 'the AI, in your workspace',
  headline: 'Turns them into fixes and improvements to your app',
  sub: 'Type-checked, tested and deployed — you approve, or let it run.',
  href: SITE,
}
export const LOOP_RESULT = 'each release measured against the last, not guessed'
export const LOOP_NOTE = 'Swap the analytics provider; the instrumentation stays.'

// ---------------------------------------------------------------- scene 5
export const OUTCOMES = [
  {
    num: '01',
    title: 'Faster',
    body: 'Start from a working, tested app. Existing and custom apps gain the same speed by integrating the packages and the architecture.',
  },
  {
    num: '02',
    title: 'Cheaper',
    body: 'Far fewer tokens: the AI wires tested packages instead of generating the same code again and again.',
  },
  {
    num: '03',
    title: 'Higher quality',
    body: 'Type-checked, linted and tested. Polished functionality that already covers the unexpected edge cases.',
  },
  {
    num: '04',
    title: 'Easier to maintain & scale',
    svgTitle: 'Easier to maintain\n& scale',
    body: 'One consistent, decoupled architecture with tests, migrations, monitoring and docs built in, so the app stays easy to change and grow.',
  },
]
export const PLATFORMS_LABEL = 'Cross-platform from one codebase'
export const PLATFORMS = [
  { name: 'Web', sub: 'Any modern web framework' },
  { name: 'Mobile', sub: 'Native iOS and Android from the same code' },
  { name: 'API', sub: 'Any framework, database or host' },
]
export const CLOSING = {
  strong: 'Plain code you own. Export it, with its database and keys, at any time.',
  sub: 'Apache-2.0  ·  no lock-in  ·  any AI agent, editor or CI.',
  site: 'www.molecule.dev',
  href: SITE,
}

/** Everything above, for the site's HTML panels. */
export const CONTENT = {
  scenes: SCENES,
  prompt: { text: PROMPT, lines: PROMPT_LINES, href: PROMPT_HREF },
  badges: BADGES,
  howNote: HOW_NOTE,
  toolsNote: TOOLS_NOTE,
  catalog: { label: CATALOG_LABEL, href: CATALOG_HREF },
  nodes: NODES,
  done: DONE,
  core: CORE,
  dbBonds: DB_BONDS,
  categoriesLabel: CATEGORIES_LABEL,
  categories: CATEGORIES,
  categoriesMore: CATEGORIES_MORE,
  frameworksNote: FRAMEWORKS_NOTE,
  tiles: TILES,
  tilesNote: TILES_NOTE,
  loopSteps: LOOP_STEPS,
  loopCenter: LOOP_CENTER,
  signalsLabel: SIGNALS_LABEL,
  signals: SIGNALS,
  ai: AI,
  loopResult: LOOP_RESULT,
  loopNote: LOOP_NOTE,
  outcomes: OUTCOMES,
  platformsLabel: PLATFORMS_LABEL,
  platforms: PLATFORMS,
  closing: CLOSING,
}
