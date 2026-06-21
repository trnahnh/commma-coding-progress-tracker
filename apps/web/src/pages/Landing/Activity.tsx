import { useQuery } from '@tanstack/react-query'
import { LiveDot } from '../../components/chrome'
import { Reveal } from '../../components/Reveal'
import { type FeaturedSession } from '../../lib/api'
import { queries } from '../../lib/queries'
import { formatClock, formatDate, formatDuration } from '../../lib/format'
import { langStyle } from '../../lib/langColors'
import { useScene } from '../../lib/useScene'
import { SectionHead } from './SectionHead'
import { MOCK_CHART, MOCK_SESSION } from './mocks'

export interface SessionView {
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
      swatch: langStyle(l.lang)?.color ?? 'var(--color-ink-mute)',
    })),
    files: s.files.map((f) => {
      const parts = f.path.split('/')
      const name = parts.at(-1) ?? f.path
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : ''
      return { name, path: dir, changes: f.changes }
    }),
  }
}

const CHART_DATE_LABELS = Array.from({ length: 8 }, (_, i) => {
  const daysAgo = Math.round(((7 - i) * 59) / 7)
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
  const cardRef = useScene<HTMLDivElement>()

  return (
    <div
      ref={cardRef}
      className='scene-card-soft relative border border-rule-strong bg-linear-to-b from-paper-2 to-paper rounded-lg overflow-hidden surface-lg'
    >
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:gap-6 items-start px-5 sm:px-8 py-6 sm:py-7 border-b border-rule'>
        <div className='min-w-0'>
          <div className='font-mono text-[15px] tracking-[0.16em] text-accent uppercase mb-2.5 flex items-center gap-2.5'>
            <LiveDot color='accent' />
            session · {session.shortDate}
          </div>
          <h3 className='font-serif text-[clamp(26px,3vw,42px)] leading-[1.05] tracking-[-0.02em] m-0 text-ink break-words'>
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

      <div className='px-5 sm:px-8 py-6 sm:py-8 well bg-paper/30'>
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
              <stop
                offset='0%'
                stopColor='var(--color-accent)'
                stopOpacity='0.28'
              />
              <stop
                offset='100%'
                stopColor='var(--color-accent)'
                stopOpacity='0'
              />
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
                stroke='var(--color-rule)'
                strokeWidth='0.5'
              />
            </pattern>
          </defs>
          <rect width={W} height={H} fill='url(#cgrid)' />
          <path d={area} fill='url(#cfill)' />
          <path
            d={line}
            fill='none'
            stroke='var(--color-accent)'
            strokeWidth='1.5'
          />
        </svg>
        <div className='grid grid-cols-4 sm:grid-cols-8 mt-2.5 font-mono text-[15px] text-ink-mute tracking-wider'>
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
              <span className='min-w-0 truncate'>
                <strong className='text-ink font-medium'>{l.name}</strong>
              </span>
              <span className='tnum whitespace-nowrap'>
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
              <span className='truncate min-w-0'>
                <span className='text-ink-mute'>{f.path}</span>
                <strong className='text-ink font-medium'>{f.name}</strong>
              </span>
              <span className='tnum whitespace-nowrap'>{f.changes}∆</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Activity() {
  const featuredQuery = useQuery(queries.featured())
  const statsQuery = useQuery(queries.activityStats())

  const session = featuredQuery.data
    ? toSessionView(featuredQuery.data)
    : MOCK_SESSION
  const minutes = statsQuery.data?.days.map((d) => Math.round(d.duration_s / 60))
  const chart = minutes && minutes.some((v) => v > 0) ? minutes : MOCK_CHART
  const isLive = featuredQuery.isSuccess

  return (
    <section className='py-[clamp(56px,9vw,140px)]'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <Reveal>
          <SectionHead
            no='01'
            kicker='the artifact'
            title={
              <>
                An <em className='italic text-accent'>activity</em>, not a
                screenshot.
              </>
            }
            aside={
              isLive
                ? 'rendered live · real data'
                : 'rendered live · sample data'
            }
          />
        </Reveal>
        <Reveal delay={120}>
          <ActivityCard session={session} chart={chart} />
        </Reveal>
      </div>
    </section>
  )
}
