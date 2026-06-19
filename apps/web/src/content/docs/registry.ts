import overviewBody from './overview.md?raw'
import gettingStartedBody from './getting-started.md?raw'
import architectureBody from './architecture.md?raw'
import systemDesignBody from './system-design.md?raw'
import selfHostingBody from './self-hosting.md?raw'

export interface DocMeta {
  slug: string
  title: string
  eyebrow: string
  summary: string
  body: string
}

export const DOCS: DocMeta[] = [
  {
    slug: 'overview',
    title: 'What commma is',
    eyebrow: 'Start here',
    summary:
      'The sport-shaped picture of commma — the three tiers, how a session is built, and the privacy guarantee.',
    body: overviewBody,
  },
  {
    slug: 'getting-started',
    title: 'Getting started',
    eyebrow: 'Start here',
    summary:
      'Install the extension, sign in with GitHub, pick a privacy mode, and log your first session.',
    body: gettingStartedBody,
  },
  {
    slug: 'architecture',
    title: 'Architecture decisions',
    eyebrow: 'Concepts',
    summary:
      'The deliberate choices behind the stack — the monorepo, Hono, Drizzle, the JSONB heatmap, and interval aggregation.',
    body: architectureBody,
  },
  {
    slug: 'system-design',
    title: 'System design',
    eyebrow: 'Concepts',
    summary:
      'The runtime picture: the write and read paths, the aggregation cycle, the data model, and the security boundary.',
    body: systemDesignBody,
  },
  {
    slug: 'self-hosting',
    title: 'Self-hosting',
    eyebrow: 'Operate',
    summary:
      'Run your own commma instance — the moving parts, configuration, migrations, and scaling notes.',
    body: selfHostingBody,
  },
]

export interface DocNavLink {
  label: string
  slug?: string
  appPath?: string
}

export interface DocNavGroup {
  group: string
  links: DocNavLink[]
}

export const DOC_NAV: DocNavGroup[] = [
  {
    group: 'Start here',
    links: [
      { label: 'Overview', slug: 'overview' },
      { label: 'Getting started', slug: 'getting-started' },
    ],
  },
  {
    group: 'Concepts',
    links: [
      { label: 'Architecture', slug: 'architecture' },
      { label: 'System design', slug: 'system-design' },
    ],
  },
  {
    group: 'Reference',
    links: [
      { label: 'API reference', appPath: '/api' },
      { label: 'Changelog', appPath: '/changelog' },
    ],
  },
  {
    group: 'Operate',
    links: [{ label: 'Self-hosting', slug: 'self-hosting' }],
  },
]

export function getDoc(slug: string | undefined): DocMeta | undefined {
  return DOCS.find((doc) => doc.slug === slug)
}
