import { useEffect, useRef, useState } from 'react'
import { Shell } from '../components/chrome'
import { useSeo } from '../lib/seo'

function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

const STACK_GROUPS = [
  {
    id: '01',
    label: 'Language & Tooling',
    items: [
      {
        no: '001',
        name: 'TypeScript',
        role: 'Language',
        why: 'One language end-to-end. Extension, API, web, and tests share types without a transpilation step in between.',
      },
      {
        no: '002',
        name: 'Zod',
        role: 'Schema validation',
        why: 'The heartbeat schema lives in @commma/shared and is consumed by both the extension and the API. Parse once, trust everywhere.',
      },
      {
        no: '003',
        name: 'pnpm workspaces',
        role: 'Monorepo',
        why: 'Single install at the root hydrates all five packages. Workspace protocols keep cross-package deps version-locked without publishing.',
      },
      {
        no: '004',
        name: 'Vitest',
        role: 'Testing',
        why: 'Same tsconfig as source. Pure functions test in microseconds. Integration tests hit a real PG + Redis, gated on TEST_DATABASE_URL.',
      },
    ],
  },
  {
    id: '02',
    label: 'API',
    items: [
      {
        no: '005',
        name: 'Hono',
        role: 'Server framework',
        why: 'Edge-ready and Zod-native. JSX runs without React in the API. No framework bloat at the layer that matters most for latency.',
      },
      {
        no: '006',
        name: 'Drizzle ORM',
        role: 'Database queries',
        why: 'SQL-first with full type inference. Migrations are append-only plain files — no opaque snapshot diffs, no merge conflicts.',
      },
    ],
  },
  {
    id: '03',
    label: 'Data',
    items: [
      {
        no: '007',
        name: 'PostgreSQL',
        role: 'Database',
        why: 'JSONB absorbs the keyboard heatmap as a typed column. Keyset pagination on every list endpoint. Index-first schema design.',
      },
      {
        no: '008',
        name: 'Redis',
        role: 'Cache & rate limiting',
        why: 'Sorted sets for period leaderboards. Fixed-window Lua for rate limits. In-memory OTP store for the OAuth one-time-code flow.',
      },
    ],
  },
  {
    id: '04',
    label: 'Frontend',
    items: [
      {
        no: '009',
        name: 'React 19',
        role: 'UI framework',
        why: 'Concurrent features and the new JSX transform ship smaller bundles. The Canvas heatmap needs the DOM.',
      },
      {
        no: '010',
        name: 'Vite 8',
        role: 'Build & dev server',
        why: 'Sub-second cold starts in dev. Native Tailwind v4 plugin. ESM-first with lazy route splitting per page.',
      },
      {
        no: '011',
        name: 'Tailwind v4',
        role: 'CSS utility framework',
        why: 'CSS-native @theme tokens. No config file. The entire design system lives in one index.css @theme block.',
      },
      {
        no: '012',
        name: 'React Router',
        role: 'Client-side routing',
        why: 'createBrowserRouter with lazy-loaded routes keeps the initial bundle tight. Every page except home is code-split.',
      },
      {
        no: '013',
        name: 'Canvas API',
        role: 'Keyboard heatmap',
        why: 'The live heatmap renders in-browser via Canvas 2D — no server round-trip. PNG export is a single toBlob call.',
      },
    ],
  },
  {
    id: '05',
    label: 'Extension',
    items: [
      {
        no: '014',
        name: 'VSCode Extension API',
        role: 'Data capture',
        why: 'contentChanges → key label histograms only. The typed content is never read, stored, or transmitted. ADR-006.',
      },
      {
        no: '015',
        name: 'esbuild',
        role: 'Extension bundler',
        why: 'ESM input → CJS output in one pass. CommonJS is required by the VS Code host — esbuild handles it without a wrapper.',
      },
    ],
  },
  {
    id: '06',
    label: 'Infrastructure',
    items: [
      {
        no: '016',
        name: 'AWS EC2',
        role: 'API compute',
        why: 't4g Graviton behind PM2. ARM keeps it cheap to run 24/7 at MVP scale, with enough RAM for the 5-min aggregation loop and Sharp renders.',
      },
      {
        no: '017',
        name: 'S3 + CloudFront',
        role: 'Web CDN',
        why: 'Static Vite build on S3. CloudFront handles edge caching, HTTPS, and OG-image delivery without a dedicated web server.',
      },
      {
        no: '018',
        name: 'Neon',
        role: 'Postgres hosting',
        why: 'Serverless Postgres with a 5 GB free tier, built-in connection pooling via PgBouncer, and database branching for cheap dev/staging copies.',
      },
      {
        no: '019',
        name: 'Upstash',
        role: 'Serverless Redis',
        why: 'Pay-per-request Redis with a free tier that handles leaderboard sorted sets and rate-limit counters at launch volume.',
      },
      {
        no: '020',
        name: 'PM2',
        role: 'Process manager',
        why: 'Keeps the API alive across crashes and deploys on EC2. RUN_AGGREGATION env ensures only one replica runs the scheduler.',
      },
    ],
  },
  {
    id: '07',
    label: 'Services',
    items: [
      {
        no: '021',
        name: 'Resend',
        role: 'Transactional email',
        why: 'Clean TypeScript SDK, generous free tier, and deliverability that does not require wrestling with SPF/DKIM from day one.',
      },
      {
        no: '022',
        name: 'Sharp',
        role: 'OG image rendering',
        why: 'SVG keyboard heatmap rasterized server-side in ~120ms. No headless browser, no Puppeteer, no Chromium cold-start tax.',
      },
      {
        no: '023',
        name: 'OpenAI',
        role: 'AI prose — optional',
        why: 'GPT-4.1-nano writes only the recap headline and note — numbers stay deterministic. Any failure falls back to the template.',
      },
    ],
  },
]

function StackCard({
  no,
  name,
  role,
  why,
  visible,
  delay,
}: {
  no: string
  name: string
  role: string
  why: string
  visible: boolean
  delay: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`border rounded-lg p-4 transition-colors cursor-pointer overflow-hidden focus-visible:outline-none surface lift ${open ? 'border-accent-line bg-accent-soft' : 'border-rule bg-paper-2'} ${visible ? 'animate-fade-up' : 'opacity-0'}`}
      tabIndex={0}
      style={{ animationDelay: `${delay}ms` }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onPointerDown={(e) => {
        if (open) {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
    >
      <div
        className='font-mono text-[12px] text-ink-mute mb-2'
        aria-hidden='true'
      >
        {no}
      </div>
      <div className='font-mono text-[14px] sm:text-[15px] text-ink mb-1'>
        {name}
      </div>
      <div className='font-mono text-[12px] text-ink-mute'>{role}</div>
      <p
        className={`font-mono text-[13px] text-ink-soft leading-snug m-0 overflow-hidden transition-all duration-300 ease-out ${open ? 'max-h-32 mt-2' : 'max-h-0 mt-0'}`}
      >
        {why}
      </p>
    </div>
  )
}

const BELIEFS = [
  'Code is output. Sessions are training.',
  'Every keystroke tells a story.',
  'Your streak is your record.',
  'The leaderboard is where reputation is built.',
]

export default function About() {
  useSeo({
    title: 'About · commma',
    description: 'About commma — why we built a sport out of coding.',
  })

  const { ref: originRef, visible: originVisible } = useReveal(0.08)
  const { ref: beliefsRef, visible: beliefsVisible } = useReveal(0.08)
  const { ref: stackRef, visible: stackVisible } = useReveal(0.05)

  return (
    <Shell>
      <section className='mb-[clamp(80px,12vw,160px)]'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          About
        </p>
        <h1 className='font-serif font-normal text-[clamp(40px,7vw,96px)] leading-[0.92] tracking-[-0.03em] m-0 mb-8 text-ink max-w-[800px] lift-text'>
          We built the app{' '}
          <em className='italic text-accent'>we wished existed.</em>
        </h1>
        <div className='max-w-[56ch]'>
          <p className='font-sans text-[17px] leading-relaxed text-ink-soft m-0 mb-4'>
            GitHub tells you what you committed. Strava tells you how hard you
            trained. We wanted both — the record and the effort — applied to the
            craft of writing software.
          </p>
          <p className='font-sans text-[17px] leading-relaxed text-ink-soft m-0'>
            commma treats your coding sessions like race splits. Sessions, pace,
            splits, streaks, leaderboards — the full vocabulary of competitive
            performance, in your editor.
          </p>
        </div>
      </section>

      <section ref={originRef} className='mb-[clamp(80px,12vw,160px)]'>
        <p
          className={`font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-10 ${originVisible ? 'animate-fade-up' : 'opacity-0'}`}
        >
          The insight
        </p>

        <div className='grid grid-cols-1 md:grid-cols-[1fr_44px_1fr] gap-3 md:gap-0 mb-3 md:mb-4'>
          <div
            className={`border border-rule-strong bg-paper-2 rounded-lg p-5 sm:p-6 surface font-mono ${originVisible ? 'animate-fade-left' : 'opacity-0'}`}
            style={{ animationDelay: '80ms' }}
          >
            <div className='text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-5 flex items-center gap-2'>
              <span
                className='w-2 h-2 rounded-full bg-rule-strong inline-block'
                aria-hidden='true'
              />
              GitHub
            </div>
            <div className='space-y-2 text-[13px] leading-relaxed mb-5'>
              <div className='text-ink'>feat: ingest pipeline refactor</div>
              <div className='text-ink-soft'>
                fix: session boundary edge case
              </div>
              <div className='text-ink-soft'>chore: append-only migration</div>
            </div>
            <div className='pt-4 border-t border-rule grid grid-cols-3 text-[12px] gap-2'>
              <span className='text-live'>+2,847</span>
              <span className='text-accent'>-391</span>
              <span className='text-ink-soft'>47 commits</span>
            </div>
            <p className='font-sans text-[13px] text-ink-soft mt-3 m-0'>
              What you built.
            </p>
          </div>

          <div
            className={`flex items-center justify-center py-2 md:py-0 md:pt-[72px] ${originVisible ? 'animate-fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '200ms' }}
          >
            <span className='font-serif text-[28px] md:text-[32px] text-ink-mute leading-none'>
              +
            </span>
          </div>

          <div
            className={`border border-rule-strong bg-paper-2 rounded-lg p-5 sm:p-6 surface font-mono ${originVisible ? 'animate-fade-right' : 'opacity-0'}`}
            style={{ animationDelay: '80ms' }}
          >
            <div className='text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-5 flex items-center gap-2'>
              <span
                className='w-2 h-2 rounded-full bg-rule-strong inline-block'
                aria-hidden='true'
              />
              Strava
            </div>
            <div className='space-y-2 text-[13px] leading-relaxed mb-5'>
              <div className='text-ink'>Morning run · 18.4 km</div>
              <div className='text-ink-soft'>Pace: 5′37″/km avg</div>
              <div className='text-ink-soft'>HR: 152 bpm · Zone 3</div>
            </div>
            <div className='pt-4 border-t border-rule grid grid-cols-3 text-[12px] gap-2'>
              <span className='text-ink-soft'>01:42:33</span>
              <span className='text-ink-soft'>638 cal</span>
              <span className='text-ink-soft'>Race effort</span>
            </div>
            <p className='font-sans text-[13px] text-ink-soft mt-3 m-0'>
              How hard you worked.
            </p>
          </div>
        </div>

        <div
          className={`flex justify-center mb-3 md:mb-4 ${originVisible ? 'animate-fade-up' : 'opacity-0'}`}
          style={{ animationDelay: '320ms' }}
        >
          <span className='font-mono text-[13px] text-ink-mute'>↓</span>
        </div>

        <div
          className={`border border-accent-line bg-accent-soft rounded-lg p-5 sm:p-6 font-mono max-w-[520px] mx-auto glow-accent ${originVisible ? 'animate-fade-up' : 'opacity-0'}`}
          style={{ animationDelay: '420ms' }}
        >
          <div className='text-[12px] tracking-[0.18em] uppercase text-accent mb-5 flex items-center gap-2'>
            <span
              className='w-2 h-2 rounded-full bg-accent inline-block animate-pulse-dot'
              aria-hidden='true'
            />
            commma
          </div>
          <div className='space-y-2 text-[13px] leading-relaxed mb-5'>
            <div className='text-ink'>TypeScript session · 2h 18m</div>
            <div className='text-ink-soft'>Avg pace 184 kpm · Peak 241 kpm</div>
            <div className='text-ink-soft'>
              Streak: <span className='text-live'>12 days</span> · Rank:{' '}
              <span className='text-accent'>#3 today</span>
            </div>
          </div>
          <div className='pt-4 border-t border-accent-line grid grid-cols-3 text-[12px] gap-2'>
            <span className='text-ink-soft'>1,247 lines</span>
            <span className='text-ink-soft'>18 files</span>
            <span className='text-ink-soft'>184 kpm avg</span>
          </div>
          <p className='font-sans text-[13px] text-ink-soft mt-3 m-0'>
            What you built, and how hard you worked.
          </p>
        </div>
      </section>

      <section ref={beliefsRef} className='mb-[clamp(80px,12vw,160px)]'>
        <p
          className={`font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-10 ${beliefsVisible ? 'animate-fade-up' : 'opacity-0'}`}
        >
          What we believe
        </p>
        <div className='border-t border-rule'>
          {BELIEFS.map((text, i) => (
            <div
              key={i}
              className={`flex items-baseline gap-5 sm:gap-8 py-7 border-b border-rule ${beliefsVisible ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span
                className='font-mono text-[12px] text-ink-mute shrink-0 tnum'
                aria-hidden='true'
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className='font-serif text-[clamp(22px,4vw,44px)] leading-[1.1] tracking-[-0.02em] text-ink'>
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section ref={stackRef}>
        <p
          className={`font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-2 ${stackVisible ? 'animate-fade-up' : 'opacity-0'}`}
        >
          The stack
        </p>
        <p
          className={`font-sans text-[15px] text-ink-soft m-0 mb-10 ${stackVisible ? 'animate-fade-up' : 'opacity-0'}`}
          style={{ animationDelay: '50ms' }}
        >
          Every tool chosen deliberately. Click or tap any card to see why.
        </p>

        {STACK_GROUPS.map((group, gi) => {
          const groupDelay = gi * 120
          return (
            <div
              key={group.id}
              className={`mb-10 ${stackVisible ? 'animate-fade-up' : 'opacity-0'}`}
              style={{ animationDelay: `${groupDelay + 80}ms` }}
            >
              <div className='flex items-center gap-3 mb-4'>
                <span
                  className='font-mono text-[12px] text-ink-mute shrink-0'
                  aria-hidden='true'
                >
                  {group.id}
                </span>
                <span className='font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft shrink-0'>
                  {group.label}
                </span>
                <div className='flex-1 h-px bg-rule' aria-hidden='true' />
              </div>

              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                {group.items.map(({ no, name, role, why }, ci) => (
                  <StackCard
                    key={no}
                    no={no}
                    name={name}
                    role={role}
                    why={why}
                    visible={stackVisible}
                    delay={groupDelay + ci * 40 + 120}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </Shell>
  )
}
