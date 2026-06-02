import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Footer, LiveDot, Nav } from './components/chrome'
import {
  getActivityStats,
  getActivityStream,
  getFeaturedSession,
  getLeaderboard,
  type FeaturedSession,
  type LeaderboardEntry,
  type StreamEntry,
} from './lib/api'
import { useAuth } from './lib/auth'
import { formatClock, formatDate, formatDuration } from './lib/format'
import { langStyle } from './lib/langColors'

interface SessionView {
  id: string | null
  date: string
  shortDate: string
  startedAt: string
  title: string
  subtitle: string
  duration: string
  lines: number
  pace: number | null
  peakCpm: number | null
  langs: { name: string; time: string; pct: number; swatch: string }[]
  files: { name: string; path: string; changes: number }[]
}

const shortDateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function toSessionView(s: FeaturedSession): SessionView {
  const topLang = s.langs[0]?.lang ?? null
  return {
    id: s.id,
    date: formatDate(s.started_at),
    shortDate: shortDateFmt.format(new Date(s.started_at)),
    startedAt: formatClock(s.started_at),
    title: topLang ? `${topLang} session` : 'Coding session',
    subtitle: `by @${s.user.handle}`,
    duration: formatDuration(s.duration_s),
    lines: s.lines_delta,
    pace: s.pace_cpm,
    peakCpm: s.peak_cpm,
    langs: s.langs.map((l) => ({
      name: l.lang,
      time: formatDuration(l.duration_s),
      pct: Math.round(l.pct),
      swatch: langStyle(l.lang)?.color ?? '#7a746a',
    })),
    files: s.files.map((f) => {
      const parts = f.path.split('/')
      const name = parts.at(-1) ?? f.path
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : ''
      return { name, path: dir, changes: f.changes }
    }),
  }
}

const MOCK_SESSION: SessionView = {
  id: null,
  date: 'Tue · May 26, 2026',
  shortDate: 'May 26, 2026',
  startedAt: '08:42',
  title: 'Long base — ingest pipeline refactor',
  subtitle: 'with a brief detour through the schema package',
  duration: '2h 18m',
  lines: 1247,
  pace: 184,
  peakCpm: 241,
  langs: [
    { name: 'TypeScript', time: '1h 12m', pct: 52, swatch: '#FF4D1A' },
    { name: 'Python', time: '31m', pct: 22, swatch: '#9CF76D' },
    { name: 'SQL', time: '18m', pct: 13, swatch: '#EFEAD8' },
    { name: 'Markdown', time: '17m', pct: 13, swatch: '#7A746A' },
  ],
  files: [
    { name: 'sessions.ts', path: 'apps/api/src/', changes: 423 },
    { name: 'events.ts', path: 'packages/shared/src/', changes: 218 },
    { name: 'tracker.ts', path: 'apps/extension/src/', changes: 156 },
    { name: 'schema.sql', path: 'packages/db/migrations/', changes: 94 },
  ],
}

const MOCK_CHART = [
  20, 15, 25, 40, 55, 70, 85, 90, 75, 60, 50, 65, 80, 95, 110, 120, 130, 125,
  115, 100, 85, 70, 55, 40, 35, 30, 35, 40, 50, 60, 75, 90, 105, 115, 125, 135,
  140, 145, 140, 130, 120, 110, 100, 95, 100, 110, 120, 130, 135, 130, 120, 105,
  90, 75, 60, 50, 45, 50, 65, 80,
]

const MOCK_TICKER: Pick<StreamEntry, 'who' | 'what' | 'em'>[] = [
  { who: 'northbound', what: 'finished a 2h 14m session in', em: 'Go' },
  { who: 'lumen.dev', what: 'hit a', em: '54-day streak' },
  { who: 'inkpaper', what: 'shipped', em: 'feat: shimmer transitions' },
  { who: 'falsetto', what: '+1,204 lines in', em: 'Rust' },
  { who: 'aprilsink', what: 'earned the', em: 'dawn patrol' },
  { who: 'yoursquid', what: 'started a session in', em: 'TypeScript' },
]

const CHART_DATE_LABELS = Array.from({ length: 8 }, (_, i) => {
  const daysAgo = Math.round((7 - i) * 59 / 7)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000))
})

function buildChartPath(data: number[], w: number, h: number, pad = 4) {
  const max = Math.max(...data)
  if (max === 0) return `M ${pad} ${h - pad} L ${w - pad} ${h - pad}`
  const stepX = (w - pad * 2) / (data.length - 1)
  const scaleY = (h - pad * 2) / max
  return data
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'} ${(pad + i * stepX).toFixed(2)} ${(h - pad - v * scaleY).toFixed(2)}`,
    )
    .join(' ')
}

function buildAreaPath(data: number[], w: number, h: number, pad = 4) {
  return `${buildChartPath(data, w, h, pad)} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`
}

function Hero() {
  const [pulse, setPulse] = useState(14233)
  useEffect(() => {
    const id = setInterval(
      () => setPulse((n) => n + Math.floor(Math.random() * 4) + 1),
      1700,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <section className='relative'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] pt-[clamp(56px,9vw,120px)] pb-[clamp(48px,6vw,96px)]'>
        <div className='flex items-center gap-3.5 mb-10 sm:mb-12 opacity-0 animate-rise-700 delay-100'>
          <LiveDot />
          <span className='font-mono text-[15px] tracking-[0.16em] uppercase text-ink-mute'>
            v0.1 · invite-only · 2,841 athletes
          </span>
        </div>

        <h1 className='font-serif font-normal text-[clamp(44px,10.5vw,168px)] leading-[0.92] tracking-[-0.035em] m-0'>
          <span className='block overflow-hidden reveal-clip py-[0.12em] my-[-0.12em]'>
            <span className='animate-rise-900 delay-120 inline-block'>
              Every commit
            </span>
          </span>
          <span className='block overflow-hidden reveal-clip py-[0.12em] my-[-0.12em]'>
            <span className='animate-rise-900 delay-240 inline-block'>
              is a <em className='font-serif italic text-accent'>step.</em>
            </span>
          </span>
        </h1>

        <div className='grid md:grid-cols-[1.4fr_1fr] gap-[clamp(36px,6vw,96px)] items-end mt-[clamp(36px,6vw,80px)]'>
          <div>
            <p
              className='font-sans text-[clamp(16px,1.3vw,19px)] leading-relaxed text-ink-soft max-w-[46ch] m-0 mb-8
              opacity-0 animate-rise-700 delay-520'
            >
              commma turns your editor into a logbook. Pace, splits, streaks,
              podiums — all the rituals of a real sport, for the work you
              already do. Install once, code as usual, then look back at the
              week like an athlete reviewing the tape.
            </p>
            <div className='flex gap-3 items-center flex-wrap opacity-0 animate-rise-700 delay-640'>
              <a
                href='https://marketplace.visualstudio.com'
                className='group inline-flex items-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[15px] uppercase tracking-wider font-medium
                  bg-accent text-paper border border-accent hover:bg-ink hover:border-ink transition-colors'
              >
                Install the extension
                <span className='inline-block transition-transform group-hover:translate-x-1'>
                  →
                </span>
              </a>
              <Link
                to='/leaderboard'
                className='inline-flex items-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[15px] uppercase tracking-wider
                  text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint transition-colors'
              >
                See a sample profile
              </Link>
            </div>
          </div>

          <div className='opacity-0 animate-rise delay-720'>
            <div className='grid grid-cols-2 border-t border-rule'>
              <div className='py-5 pr-4 sm:pr-6 border-b border-r border-rule'>
                <span className='block font-serif text-[clamp(34px,4vw,56px)] leading-none tracking-[-0.02em] tnum'>
                  {pulse.toLocaleString()}
                </span>
                <span className='block font-mono text-[15px] tracking-[0.14em] uppercase text-ink-mute mt-2.5'>
                  active right now
                </span>
              </div>
              <div className='py-5 pl-4 sm:pl-6 border-b border-rule'>
                <span className='block font-serif text-[clamp(34px,4vw,56px)] leading-none tracking-[-0.02em] tnum'>
                  211
                  <span className='text-ink-mute text-[0.5em] align-baseline'>
                    d
                  </span>
                </span>
                <span className='block font-mono text-[15px] tracking-[0.14em] uppercase text-ink-mute mt-2.5'>
                  longest streak
                </span>
              </div>
              <div className='py-5 pr-4 sm:pr-6 border-b border-r border-rule'>
                <span className='block font-serif text-[clamp(34px,4vw,56px)] leading-none tracking-[-0.02em] tnum'>
                  1.4M
                </span>
                <span className='block font-mono text-[15px] tracking-[0.14em] uppercase text-ink-mute mt-2.5'>
                  hours logged
                </span>
              </div>
              <div className='py-5 pl-4 sm:pl-6 border-b border-rule'>
                <span className='block font-serif text-[clamp(34px,4vw,56px)] leading-none tracking-[-0.02em] tnum'>
                  92
                  <span className='text-ink-mute text-[0.5em] align-baseline'>
                    %
                  </span>
                </span>
                <span className='block font-mono text-[15px] tracking-[0.14em] uppercase text-ink-mute mt-2.5'>
                  return next-day
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Ticker() {
  const [entries, setEntries] =
    useState<Pick<StreamEntry, 'who' | 'what' | 'em'>[]>(MOCK_TICKER)

  useEffect(() => {
    getActivityStream()
      .then(({ entries: live }) => {
        if (live.length >= 4) setEntries(live)
      })
      .catch(() => void 0)
  }, [])

  const items = [...entries, ...entries, ...entries, ...entries]
  return (
    <div className='border-y border-rule bg-paper-2 overflow-hidden whitespace-nowrap'>
      <div className='inline-flex gap-14 py-3.5 animate-marquee font-mono text-[15px] tracking-wide text-ink-mute'>
        {items.map((t, i) => (
          <span key={i} className='inline-flex items-center gap-2'>
            <span className='text-ink-faint'>◇</span>
            <strong className='text-ink font-medium'>@{t.who}</strong>
            <span>{t.what}</span>
            <em className='not-italic text-accent'>{t.em}</em>
          </span>
        ))}
      </div>
    </div>
  )
}

function SectionHead({
  no,
  title,
  aside,
}: {
  no: string
  title: ReactNode
  aside?: string
}) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-3 md:gap-8 items-baseline pb-[clamp(36px,5vw,72px)]'>
      <span className='font-mono text-[15px] tracking-[0.18em] uppercase text-ink-mute'>
        § {no}
      </span>
      <h2 className='font-serif font-normal text-[clamp(30px,4.5vw,64px)] leading-none tracking-tight m-0'>
        {title}
      </h2>
      {aside && (
        <span className='font-mono text-[15px] tracking-[0.14em] uppercase text-ink-mute md:text-right'>
          {aside}
        </span>
      )}
    </div>
  )
}

function ActivityCard({
  session,
  chart,
}: {
  session: SessionView
  chart: number[]
}) {
  const W = 800
  const H = 180
  const line = buildChartPath(chart, W, H)
  const area = buildAreaPath(chart, W, H)
  const peakMin = Math.max(0, ...chart)

  return (
    <div className='relative border border-rule-strong bg-linear-to-b from-paper-2 to-paper rounded overflow-hidden'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:gap-6 items-start px-5 sm:px-8 py-6 sm:py-7 border-b border-rule'>
        <div>
          <div className='font-mono text-[15px] tracking-[0.16em] text-accent uppercase mb-2.5 flex items-center gap-2.5'>
            <LiveDot color='accent' />
            session · {session.shortDate}
          </div>
          <h3 className='font-serif text-[clamp(26px,3vw,42px)] leading-[1.05] tracking-[-0.02em] m-0 text-ink'>
            {session.title}
            <span className='block italic text-ink-mute text-[0.6em] mt-1.5'>
              {session.subtitle}
            </span>
          </h3>
        </div>
        <div className='font-mono text-[15px] text-ink-mute flex flex-row sm:flex-col flex-wrap gap-x-4 gap-y-1.5 items-start sm:items-end whitespace-nowrap'>
          <span>
            <strong className='text-ink font-medium'>{session.date}</strong>
          </span>
          <span>
            started{' '}
            <strong className='text-ink font-medium tnum'>
              {session.startedAt}
            </strong>
          </span>
          <span>
            kudos <strong className='text-ink font-medium tnum'>· 18</strong>
          </span>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 border-b border-rule'>
        {[
          { label: 'Duration', value: session.duration, delta: null },
          {
            label: 'Lines moved',
            value: session.lines.toLocaleString(),
            unit: 'loc',
            delta: null,
          },
          {
            label: 'Pace',
            value: session.pace?.toString() ?? '—',
            unit: session.pace ? 'char/min' : undefined,
            delta: null,
          },
          {
            label: 'Languages',
            value: session.langs.length.toString(),
            unit: '',
            delta: null,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-5 sm:px-8 py-5 sm:py-6 ${i < 3 ? 'md:border-r' : ''} border-rule ${i < 2 ? 'border-b md:border-b-0' : ''} ${i === 1 ? 'border-r md:border-r' : ''}`}
          >
            <span className='block font-mono text-[15px] tracking-[0.16em] uppercase text-ink-mute mb-3.5'>
              {s.label}
            </span>
            <span className='flex items-baseline gap-1.5 font-serif text-[clamp(28px,3vw,44px)] leading-none tracking-[-0.02em] text-ink tnum'>
              {s.value}
              {s.unit && (
                <span className='font-mono text-[15px] tracking-wide text-ink-mute lowercase'>
                  {s.unit}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className='px-5 sm:px-8 py-6 sm:py-8'>
        <div className='flex justify-between items-baseline gap-3 mb-4 font-mono text-[15px] tracking-[0.14em] uppercase text-ink-mute'>
          <span>Daily coding activity</span>
          {peakMin > 0 && (
            <span className='text-right'>
              peak{' '}
              <span className='text-ink tnum'>
                {formatDuration(peakMin * 60)}
              </span>{' '}
              / day
            </span>
          )}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className='w-full h-[140px] sm:h-[180px] block'
          preserveAspectRatio='none'
        >
          <defs>
            <linearGradient id='cfill' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='#FF4D1A' stopOpacity='0.28' />
              <stop offset='100%' stopColor='#FF4D1A' stopOpacity='0' />
            </linearGradient>
            <pattern
              id='cgrid'
              width='50'
              height='40'
              patternUnits='userSpaceOnUse'
            >
              <path
                d='M50 0 L0 0 0 40'
                fill='none'
                stroke='#221f1a'
                strokeWidth='0.5'
              />
            </pattern>
          </defs>
          <rect width={W} height={H} fill='url(#cgrid)' />
          <path d={area} fill='url(#cfill)' />
          <path d={line} fill='none' stroke='#FF4D1A' strokeWidth='1.5' />
        </svg>
        <div className='grid grid-cols-4 sm:grid-cols-8 mt-2.5 font-mono text-[15px] text-ink-faint tracking-wider'>
          {CHART_DATE_LABELS.map((label, i) => (
            <span
              key={label + i}
              className={`tnum ${i % 2 === 1 ? 'hidden sm:block' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 border-t border-rule'>
        <div className='px-5 sm:px-8 py-6 border-b md:border-b-0 md:border-r border-rule'>
          <div className='font-mono text-[15px] tracking-[0.16em] uppercase text-ink-mute mb-3.5'>
            Languages
          </div>
          {session.langs.map((l) => (
            <div
              key={l.name}
              className='grid grid-cols-[10px_1fr_auto] items-center gap-3 py-2 font-mono text-[15px] text-ink-soft border-b border-dashed border-rule last:border-b-0'
            >
              <span
                className='w-2.5 h-2.5 rounded-sm'
                style={{ background: l.swatch }}
              />
              <span>
                <strong className='text-ink font-medium'>{l.name}</strong>
              </span>
              <span className='tnum'>
                {l.time} · {l.pct}%
              </span>
            </div>
          ))}
        </div>
        <div className='px-5 sm:px-8 py-6'>
          <div className='font-mono text-[15px] tracking-[0.16em] uppercase text-ink-mute mb-3.5'>
            Most-touched files
          </div>
          {session.files.map((f) => (
            <div
              key={f.path + f.name}
              className='grid grid-cols-[1fr_auto] items-baseline gap-3 py-2 font-mono text-[15px] text-ink-soft border-b border-dashed border-rule last:border-b-0'
            >
              <span className='truncate'>
                <span className='text-ink-mute'>{f.path}</span>
                <strong className='text-ink font-medium'>{f.name}</strong>
              </span>
              <span className='tnum'>{f.changes}∆</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Activity() {
  const [session, setSession] = useState<SessionView>(MOCK_SESSION)
  const [chart, setChart] = useState<number[]>(MOCK_CHART)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    Promise.all([getFeaturedSession(), getActivityStats()])
      .then(([feat, stats]) => {
        setSession(toSessionView(feat))
        const minutes = stats.days.map((d) => Math.round(d.duration_s / 60))
        if (minutes.some((v) => v > 0)) setChart(minutes)
        setIsLive(true)
      })
      .catch(() => void 0)
  }, [])

  return (
    <section className='py-[clamp(56px,9vw,140px)]'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <SectionHead
          no='01'
          title={
            <>
              An <em className='italic text-accent'>activity</em>, not a
              screenshot.
            </>
          }
          aside={isLive ? 'rendered live · real data' : 'rendered live · sample data'}
        />
        <ActivityCard session={session} chart={chart} />
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      no: '01',
      title: (
        <>
          Install the <em className='italic text-accent'>extension.</em>
        </>
      ),
      ascii: `┌────────────┐\n│ ●  ●  ●    │\n├────────────┤\n│ > vscode   │\n└────────────┘`,
      body: "One click from the marketplace. Sign in with GitHub, pick a privacy level (every keystroke or just session totals), and you're logging.",
    },
    {
      no: '02',
      title: (
        <>
          Code <em className='italic text-accent'>as usual.</em>
        </>
      ),
      ascii: `┌──────┐   ┌──────┐   ┌──────┐\n│ keys │ → │ evt  │ → │ api  │\n└──────┘   └──────┘   └──────┘`,
      body: 'The extension batches activity locally and syncs it on a heartbeat. No project content ever leaves your machine — only metrics and file paths you allow.',
    },
    {
      no: '03',
      title: (
        <>
          Share, race, <em className='italic text-accent'>brag.</em>
        </>
      ),
      ascii: `◆ feed\n◇ leaderboard\n◇ profile`,
      body: 'Your sessions show up in a public feed (or a private one for your team). Streaks, podiums, and weekly recaps roll up automatically.',
    },
  ]

  return (
    <section className='py-[clamp(56px,9vw,140px)] border-t border-rule'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <SectionHead
          no='02'
          title={
            <>
              Three pieces. <em className='italic text-accent'>No fuss.</em>
            </>
          }
          aside='extension · api · web'
        />
        <div className='grid grid-cols-1 md:grid-cols-3 border-y border-rule'>
          {steps.map((s, i) => (
            <div
              key={s.no}
              className={`px-5 sm:px-8 py-8 sm:py-10 ${i < 2 ? 'md:border-r' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} border-rule`}
            >
              <div className='font-mono text-[15px] tracking-[0.16em] text-ink-mute flex items-center gap-3 mb-7'>
                <span>{s.no}</span>
                <span className='flex-1 h-px bg-rule' />
              </div>
              <pre className='font-mono text-[15px] leading-snug text-accent bg-paper-2 border border-rule px-4 py-3.5 rounded-[2px] mb-6 whitespace-pre overflow-x-auto'>
                {s.ascii}
              </pre>
              <h3 className='font-serif font-normal text-[28px] leading-tight tracking-[-0.015em] m-0 mb-3.5 text-ink'>
                {s.title}
              </h3>
              <p className='text-[15px] leading-relaxed text-ink-soft m-0 max-w-[36ch]'>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LeaderRow({
  entry,
  isSelf,
}: {
  entry: LeaderboardEntry
  isSelf: boolean
}) {
  const style = entry.top_lang ? langStyle(entry.top_lang) : null
  return (
    <Link
      to={`/@${entry.handle}`}
      className={`group grid grid-cols-[40px_1fr_auto] md:grid-cols-[56px_1.4fr_1fr_1fr_32px] items-center px-4 sm:px-6 py-4 gap-3 border-b border-rule last:border-b-0 font-mono text-[15px] text-ink-soft relative transition-colors ${isSelf ? 'bg-accent-soft' : 'hover:bg-paper-2'}`}
    >
      {isSelf && (
        <span className='absolute left-0 top-0 bottom-0 w-0.5 bg-accent' />
      )}
      <span
        className={`font-serif text-[20px] sm:text-[22px] tracking-[-0.02em] tnum ${entry.rank === 1 ? 'text-accent' : 'text-ink'}`}
      >
        {entry.rank.toString().padStart(2, '0')}
      </span>
      <span className='flex items-center gap-2.5 sm:gap-3.5 min-w-0'>
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={entry.handle}
            width={32}
            height={32}
            className='shrink-0 w-8 h-8 rounded-full border border-rule object-cover'
          />
        ) : (
          <span className='shrink-0 w-8 h-8 rounded-full bg-paper-3 border border-rule-strong font-serif text-[15px] text-ink grid place-items-center'>
            {entry.handle[0].toUpperCase()}
          </span>
        )}
        <span className='min-w-0'>
          <span className='block text-ink font-medium truncate'>
            @{entry.handle}
          </span>
          <span className='block md:hidden text-[15px] text-ink-mute mt-0.5 tnum'>
            {style?.label}
            {entry.streak_days > 0 ? ` · ${entry.streak_days}d` : ''}
          </span>
        </span>
      </span>
      <span className='tnum text-ink text-right md:text-left whitespace-nowrap'>
        {formatDuration(entry.duration_s)}
      </span>
      <span className='hidden md:flex items-center gap-4'>
        {style && (
          <span className='flex items-center gap-2 text-[15px]'>
            <span
              className='w-2 h-2 rounded-sm'
              style={{ background: style.color }}
            />
            {style.label}
          </span>
        )}
        {entry.streak_days > 0 && (
          <span className='flex items-center gap-1.5 text-ink'>
            <span className='w-1.5 h-1.5 bg-live rounded-full' />
            <span className='tnum'>{entry.streak_days}d</span>
          </span>
        )}
      </span>
      <span className='hidden md:block text-accent font-mono text-[15px] text-right opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0'>
        →
      </span>
    </Link>
  )
}

function Leaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [aside, setAside] = useState('loading…')

  useEffect(() => {
    getLeaderboard('week')
      .then((data) => {
        setEntries(data.entries.slice(0, 6))
        const minAgo = Math.round(
          (Date.now() - new Date(data.updated_at).getTime()) / 60000,
        )
        setAside(`updated · ${minAgo} min ago`)
      })
      .catch(() => void 0)
  }, [])

  return (
    <section className='py-[clamp(56px,9vw,140px)] border-t border-rule'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <SectionHead
          no='03'
          title={
            <>
              This week's <em className='italic text-accent'>podium.</em>
            </>
          }
          aside={aside}
        />
        <div className='border-y border-rule-strong'>
          <div className='grid grid-cols-[40px_1fr_auto] md:grid-cols-[56px_1.4fr_1fr_1fr_32px] items-center px-4 sm:px-6 py-3.5 gap-3 font-mono text-[15px] tracking-[0.14em] uppercase text-ink-mute bg-paper-2 border-b border-rule'>
            <span>Rank</span>
            <span>Athlete</span>
            <span className='text-right md:text-left'>Time</span>
            <span className='hidden md:block'>Lang · Streak</span>
            <span className='hidden md:block' />
          </div>
          {entries.length === 0 ? (
            <div className='px-4 sm:px-6 py-10 font-mono text-[15px] text-ink-mute text-center'>
              No data yet — be the first to log a session.
            </div>
          ) : (
            entries.map((entry) => (
              <LeaderRow
                key={entry.handle}
                entry={entry}
                isSelf={user?.handle === entry.handle}
              />
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function Final() {
  return (
    <section className='py-[clamp(72px,12vw,200px)] text-center border-t border-rule relative'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <p className='font-mono text-[15px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-9'>
          <LiveDot /> &nbsp; 2,841 athletes logging right now
        </p>
        <h2 className='font-serif font-normal text-[clamp(44px,9vw,140px)] leading-[0.95] tracking-[-0.035em] m-0 mb-10 mx-auto max-w-[14ch] text-ink'>
          Stop coding into the <em className='italic text-accent'>void.</em>
        </h2>
        <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
          <Link
            to='/pricing'
            className='group inline-flex items-center gap-2.5 h-[52px] px-8 rounded-full font-mono text-[15px] uppercase tracking-wider font-medium bg-accent text-paper border border-accent hover:bg-ink hover:border-ink transition-colors'
          >
            Get early access
            <span className='inline-block transition-transform group-hover:translate-x-1'>
              →
            </span>
          </Link>
          <a
            href='https://marketplace.visualstudio.com'
            className='group inline-flex items-center gap-2.5 h-[52px] px-8 rounded-full font-mono text-[15px] uppercase tracking-wider font-medium text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint transition-colors'
          >
            Install free
            <span className='inline-block transition-transform group-hover:translate-x-1'>
              →
            </span>
          </a>
        </div>
        <p className='font-mono text-[15px] tracking-wider uppercase text-ink-mute mt-8'>
          free during early access · no card · leave anytime
        </p>
      </div>
    </section>
  )
}

function ProgressBar() {
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (barRef.current) barRef.current.style.transform = `scaleX(${pct})`
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return (
    <div
      ref={barRef}
      className='fixed top-0 left-0 right-0 z-60 h-[2px] bg-accent origin-left pointer-events-none'
      style={{ transform: 'scaleX(0)' }}
    />
  )
}

function BackToTop() {
  const btnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const check = () => {
      const el = btnRef.current
      if (!el) return
      const show = window.scrollY > 500
      el.style.opacity = show ? '1' : '0'
      el.style.transform = show ? 'translateY(0)' : 'translateY(10px)'
      el.style.pointerEvents = show ? 'auto' : 'none'
    }
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])
  return (
    <button
      ref={btnRef}
      type='button'
      aria-label='Back to top'
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        opacity: '0',
        transform: 'translateY(10px)',
        pointerEvents: 'none',
        transition: 'opacity 250ms, transform 250ms',
      }}
      className='fixed bottom-6 right-5 sm:right-6 z-50 w-9 h-9 sm:w-10 sm:h-10 rounded-full
        bg-paper-3 border border-rule-strong text-ink-mute hover:text-ink hover:border-ink-faint
        font-serif text-[18px] flex items-center justify-center'
    >
      ↑
    </button>
  )
}

export default function App() {
  return (
    <div className='min-h-screen flex flex-col'>
      <Nav />
      <ProgressBar />
      <main className='flex-1 animate-page-in'>
        <Hero />
        <Ticker />
        <Activity />
        <HowItWorks />
        <Leaderboard />
        <Final />
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
