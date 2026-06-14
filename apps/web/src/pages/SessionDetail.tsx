import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QWERTY_LAYOUT } from '@commma/shared'
import { LiveDot, Shell, StatusPanel } from '../components/chrome'
import KeyboardHeatmapCanvas from '../components/KeyboardHeatmap'
import {
  ApiError,
  getSession,
  type KeyboardHeatmap,
  type SessionDetail as Session,
  type SessionFile,
  type SessionLang,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatClock, formatDate, formatDuration } from '../lib/format'
import { langStyle } from '../lib/langColors'

function splitPath(path: string): { dir: string; name: string } {
  const trimmed = path.replace(/\/+$/, '')
  const slash = trimmed.lastIndexOf('/')
  if (slash === -1) return { dir: '', name: trimmed }
  return { dir: trimmed.slice(0, slash + 1), name: trimmed.slice(slash + 1) }
}

function BackLink() {
  return (
    <Link
      to='/'
      className='group inline-flex items-center gap-2 font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute hover:text-ink transition-colors mb-8'
    >
      <span className='inline-block transition-transform group-hover:-translate-x-1'>
        ←
      </span>
      Back to activity
    </Link>
  )
}

function StatGrid({ session }: { session: Session }) {
  const langCount = session.langs.length
  const stats = [
    { label: 'Duration', value: formatDuration(session.duration_s), unit: '' },
    {
      label: 'Lines moved',
      value: session.lines_delta.toLocaleString(),
      unit: 'loc',
    },
    {
      label: 'Pace',
      value: session.pace_cpm != null ? session.pace_cpm.toString() : '—',
      unit: 'char/min',
    },
    {
      label: 'Peak',
      value: session.peak_cpm != null ? session.peak_cpm.toString() : '—',
      unit: 'char/min',
      foot:
        session.peak_at != null ? `at ${formatClock(session.peak_at)}` : null,
    },
    {
      label: 'Languages',
      value: langCount.toString(),
      unit: langCount === 1 ? 'lang' : 'langs',
    },
  ]

  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px bg-rule border-b border-rule'>
      {stats.map((s) => (
        <div key={s.label} className='bg-paper-2 px-5 sm:px-7 py-5 sm:py-6'>
          <span className='block font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-3.5'>
            {s.label}
          </span>
          <span className='flex items-baseline gap-1.5 font-serif text-[clamp(26px,3vw,42px)] leading-none tracking-[-0.02em] text-ink tnum'>
            {s.value}
            {s.unit && (
              <span className='font-mono text-[13px] tracking-wide text-ink-mute lowercase'>
                {s.unit}
              </span>
            )}
          </span>
          {'foot' in s && s.foot && (
            <span className='block font-mono text-[13px] tracking-wide text-ink-mute mt-2 tnum'>
              {s.foot}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function LangBreakdown({ langs }: { langs: SessionLang[] }) {
  if (langs.length === 0) {
    return (
      <div className='font-mono text-[14px] text-ink-mute'>
        No language data for this session.
      </div>
    )
  }
  return (
    <div>
      <div className='flex h-3 w-full overflow-hidden rounded-full border border-rule bg-paper mb-5'>
        {langs.map((l) => {
          const style = langStyle(l.lang)
          return (
            <span
              key={l.lang}
              className='h-full first:rounded-l-full last:rounded-r-full'
              style={{ width: `${l.pct}%`, background: style.color }}
              title={`${style.label} · ${l.pct}%`}
            />
          )
        })}
      </div>
      {langs.map((l) => {
        const style = langStyle(l.lang)
        return (
          <div
            key={l.lang}
            className='grid grid-cols-[10px_1fr_auto] items-center gap-3 py-2 font-mono text-[14px] text-ink-soft border-b border-dashed border-rule last:border-b-0'
          >
            <span
              className='w-2.5 h-2.5 rounded-sm'
              style={{ background: style.color }}
            />
            <span>
              <strong className='text-ink font-medium'>{style.label}</strong>
            </span>
            <span className='tnum'>
              {formatDuration(l.duration_s)} · {l.pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function FileList({ files }: { files: SessionFile[] }) {
  if (files.length === 0) {
    return (
      <div className='font-mono text-[14px] text-ink-mute'>
        No file activity recorded.
      </div>
    )
  }
  return (
    <div>
      {files.map((f) => {
        const { dir, name } = splitPath(f.path)
        return (
          <div
            key={f.path}
            className='grid grid-cols-[1fr_auto] items-baseline gap-3 py-2 font-mono text-[14px] text-ink-soft border-b border-dashed border-rule last:border-b-0'
          >
            <span className='truncate'>
              <span className='text-ink-mute'>{dir}</span>
              <strong className='text-ink font-medium'>{name}</strong>
            </span>
            <span className='tnum'>{f.changes}∆</span>
          </div>
        )
      })}
    </div>
  )
}

function HeatmapHeader() {
  return (
    <div className='flex items-baseline justify-between gap-3 mb-5 font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute'>
      <span>Keyboard heatmap</span>
    </div>
  )
}

function HeatmapSlot({
  heatmap,
  sessionLabel,
  isPro,
}: {
  heatmap: KeyboardHeatmap | null
  sessionLabel: string
  isPro: boolean
}) {
  if (heatmap == null || heatmap.total === 0) {
    return (
      <div className='px-5 sm:px-8 py-6 sm:py-8'>
        <HeatmapHeader />
        <div className='rounded border border-dashed border-rule-strong bg-paper-2/60 px-5 sm:px-8 py-8 sm:py-10'>
          <p className='font-mono text-[13px] text-ink-mute m-0 text-center'>
            No keyboard data captured for this session.
          </p>
        </div>
      </div>
    )
  }

  const mappedLabels = new Set<string>()
  for (const key of QWERTY_LAYOUT.keys) {
    if (key.label) mappedLabels.add(key.label)
  }
  let mapped = 0
  let top: [string, number] = ['', 0]
  for (const [label, count] of Object.entries(heatmap.counts)) {
    if (!mappedLabels.has(label)) continue
    mapped += count
    if (count > top[1]) top = [label, count]
  }
  const other = Math.max(0, heatmap.total - mapped)

  return (
    <div className='px-5 sm:px-8 py-6 sm:py-8'>
      <div className='flex items-baseline justify-between gap-3 mb-5 font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute'>
        <span>Keyboard heatmap</span>
        <span className='tnum text-ink'>
          {heatmap.total.toLocaleString()} keys
        </span>
      </div>
      <p className='mb-5 font-mono text-[12px] tracking-wide text-ink-mute m-0 flex flex-wrap items-center gap-x-2 gap-y-1'>
        {top[1] > 0 && (
          <span className='inline-flex items-center gap-2'>
            <span className='w-1.5 h-1.5 rounded-full bg-accent' />
            Most-pressed
            <strong className='text-ink font-medium'>{top[0]}</strong>
            <span className='tnum text-ink-soft'>
              {top[1].toLocaleString()}
            </span>
          </span>
        )}
        {top[1] > 0 && other > 0 && <span className='text-ink-mute'>·</span>}
        {other > 0 && (
          <span className='tnum'>
            +{other.toLocaleString()} other keystrokes
          </span>
        )}
      </p>
      <KeyboardHeatmapCanvas
        heatmap={heatmap}
        sessionLabel={sessionLabel}
        isPro={isPro}
      />
    </div>
  )
}

function SessionCard({ session, isPro }: { session: Session; isPro: boolean }) {
  return (
    <div className='relative border border-rule-strong bg-linear-to-b from-paper-2 to-paper rounded overflow-hidden'>
      <div className='px-5 sm:px-8 py-6 sm:py-7 border-b border-rule'>
        <div className='font-mono text-[13px] tracking-[0.16em] text-accent uppercase mb-2.5 flex items-center gap-2.5'>
          <LiveDot color='accent' />
          session
        </div>
        <h1 className='font-serif text-[clamp(28px,4vw,52px)] leading-[1.04] tracking-[-0.02em] m-0 text-ink'>
          {formatDate(session.started_at)}
        </h1>
        <p className='font-mono text-[14px] text-ink-mute mt-3 m-0 tnum'>
          {formatClock(session.started_at)}–{formatClock(session.ended_at)}
          <span className='text-ink-mute'> · </span>
          {formatDuration(session.duration_s)}
        </p>
      </div>

      <StatGrid session={session} />

      <div className='grid grid-cols-1 md:grid-cols-2 border-b border-rule'>
        <div className='px-5 sm:px-8 py-6 border-b md:border-b-0 md:border-r border-rule'>
          <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-5'>
            Languages
          </div>
          <LangBreakdown langs={session.langs} />
        </div>
        <div className='px-5 sm:px-8 py-6'>
          <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-5'>
            Most-touched files
          </div>
          <FileList files={session.files} />
        </div>
      </div>

      <HeatmapSlot
        heatmap={session.keyboard_heatmap}
        sessionLabel={formatDate(session.started_at)}
        isPro={isPro}
      />
    </div>
  )
}

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; session: Session }
  | { phase: 'error'; error: ApiError }

export default function SessionDetail() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isPro = user?.plan === 'pro' || user?.plan === 'team'
  const [state, setState] = useState<LoadState>({ phase: 'loading' })
  const [trackedId, setTrackedId] = useState(id)

  if (trackedId !== id) {
    setTrackedId(id)
    setState({ phase: 'loading' })
  }

  useEffect(() => {
    let cancelled = false
    getSession(id)
      .then((session) => {
        if (!cancelled) setState({ phase: 'ready', session })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          phase: 'error',
          error:
            err instanceof ApiError
              ? err
              : new ApiError(0, 'UNKNOWN', 'Something went wrong'),
        })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    const label =
      state.phase === 'ready'
        ? `${formatDate(state.session.started_at)} session`
        : state.phase === 'error'
          ? 'Session not found'
          : 'Loading session'
    document.title = `${label} · commma`

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(
        `meta[property="${property}"]`,
      )
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', property)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    const setNameMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    if (state.phase === 'ready') {
      const { session } = state
      const topLang = session.langs[0]?.lang ?? null
      const desc = [
        formatDuration(session.duration_s),
        topLang ? `in ${topLang}` : null,
        session.lines_delta
          ? `· ${session.lines_delta.toLocaleString()} loc`
          : null,
      ]
        .filter(Boolean)
        .join(' ')
      setNameMeta('description', desc)
      setMeta('og:type', 'article')
      setMeta('og:title', `${label} · commma`)
      setMeta('og:description', desc)
      setMeta('twitter:card', 'summary')
      setMeta('twitter:title', `${label} · commma`)
      setMeta('twitter:description', desc)
    }
  }, [state])

  if (state.phase === 'loading') {
    return (
      <Shell>
        <BackLink />
        <StatusPanel
          title='Loading session…'
          body='Fetching pace, splits, and the keyboard map.'
        />
      </Shell>
    )
  }

  if (state.phase === 'error') {
    const { error } = state
    const notFound = error.status === 404 || error.code === 'NOT_FOUND'
    return (
      <Shell>
        <BackLink />
        <StatusPanel
          title={notFound ? 'Session not found' : 'Something went wrong'}
          body={
            notFound
              ? 'This session is private or no longer exists.'
              : error.message
          }
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <BackLink />
      <SessionCard session={state.session} isPro={isPro} />
    </Shell>
  )
}
