import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LiveDot, Shell, StatusPanel } from '../components/chrome'
import { ApiError, getRecap, type RecapData } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDuration } from '../lib/format'

function weekProgress(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00Z').getTime()
  const e = new Date(end + 'T00:00:00Z').getTime()
  return Math.min(1, Math.max(0, (Date.now() - s) / (e - s)))
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00Z')
  const lastDay = new Date(new Date(end + 'T00:00:00Z').getTime() - 86400000)
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  return `${fmt(s)} – ${fmt(lastDay)}`
}

function StatBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className='flex flex-col gap-2 p-5 sm:p-6 rounded-xl border border-rule bg-paper-2/40'>
      <span className='font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint'>
        {label}
      </span>
      <span className='font-mono text-[clamp(22px,3.5vw,30px)] leading-none tnum text-accent-2'>
        {value}
      </span>
    </div>
  )
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <div className='flex items-center gap-3'>
        <span className='font-mono text-[13px] text-ink-faint'>
          No data from last week
        </span>
      </div>
    )
  }
  const up = pct > 0
  const flat = pct === 0
  return (
    <div className='flex items-center gap-3'>
      <span
        className={[
          'font-mono text-[clamp(36px,7vw,56px)] leading-none tnum font-semibold',
          up ? 'text-live' : flat ? 'text-ink-mute' : 'text-accent',
        ].join(' ')}
      >
        {flat ? '—' : up ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`}
      </span>
      <span className='font-mono text-[13px] text-ink-mute'>vs last week</span>
    </div>
  )
}

function RecapSkeleton() {
  return (
    <div className='max-w-[680px] mx-auto'>
      <div className='border border-rule-strong rounded-2xl overflow-hidden'>
        <div className='px-6 sm:px-10 py-8 sm:py-10 border-b border-rule'>
          <div className='h-3.5 w-32 bg-paper-3 rounded animate-pulse mb-6' />
          <div className='h-9 w-full bg-paper-3 rounded animate-pulse mb-3' />
          <div className='h-5 w-3/4 bg-paper-3 rounded animate-pulse' />
        </div>
        <div className='px-6 sm:px-10 py-6 border-b border-rule'>
          <div className='h-2 w-full bg-paper-3 rounded animate-pulse' />
        </div>
        <div className='px-6 sm:px-10 py-8'>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className='h-[88px] bg-paper-3 rounded-xl animate-pulse'
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Recap() {
  const { token, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [recap, setRecap] = useState<RecapData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (isLoading) return
    if (!token || !user) {
      setFetching(false)
      navigate('/signin')
      return
    }
    if (user.plan === 'free' || !user.plan) {
      setFetching(false)
      navigate('/pricing')
      return
    }
    void getRecap(token)
      .then(setRecap)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) {
          navigate('/pricing')
        } else {
          setError('Could not load your recap. Try again shortly.')
        }
      })
      .finally(() => setFetching(false))
  }, [token, user, isLoading, navigate])

  if (isLoading || fetching) {
    return (
      <Shell>
        <RecapSkeleton />
      </Shell>
    )
  }

  if (error) {
    return (
      <Shell>
        <StatusPanel
          title='Something went wrong'
          body={error}
        />
      </Shell>
    )
  }

  if (!recap) return null

  const progress = weekProgress(recap.week_start, recap.week_end)
  const dayNum = Math.min(7, Math.max(1, Math.ceil(progress * 7)))
  const weekLabel = formatWeekRange(recap.week_start, recap.week_end)
  const stats: { label: string; value: string }[] = [
    { label: 'Sessions', value: String(recap.session_count) },
    { label: 'Coding time', value: formatDuration(recap.total_duration_s) },
    { label: 'Best session', value: formatDuration(recap.best_duration_s) },
    ...(recap.top_lang ? [{ label: 'Top language', value: recap.top_lang }] : []),
    ...(recap.current_streak_days > 0
      ? [{ label: 'Streak', value: `${recap.current_streak_days}d` }]
      : []),
  ]

  return (
    <Shell>
      <div className='max-w-[680px] mx-auto'>
        <div className='border border-rule-strong rounded-2xl overflow-hidden bg-linear-to-b from-paper-2 to-paper'>
          <div className='px-6 sm:px-10 py-8 sm:py-10 border-b border-rule'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 mb-6'>
              <span className='font-mono text-[11px] uppercase tracking-[0.14em] text-accent'>
                Weekly recap
              </span>
              <span className='text-rule-strong font-mono text-[11px]'>·</span>
              <span className='font-mono text-[11px] text-ink-faint'>
                {weekLabel}
              </span>
            </div>

            <h1 className='font-serif text-[clamp(26px,5vw,40px)] leading-[1.15] tracking-[-0.02em] text-ink m-0 mb-4'>
              {recap.headline}
            </h1>
            <p className='font-sans text-[15px] text-ink-soft leading-[1.6] m-0'>
              {recap.note}
            </p>
          </div>

          <div className='px-6 sm:px-10 py-5 border-b border-rule'>
            <div className='flex items-center justify-between mb-2.5'>
              <span className='font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint'>
                Week progress
              </span>
              <span className='font-mono text-[11px] text-ink-mute tnum'>
                Day {dayNum} / 7
              </span>
            </div>
            <div className='h-[3px] rounded-full bg-paper-3 overflow-hidden'>
              <div
                className='h-full rounded-full bg-accent transition-all duration-700'
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          <div className='px-6 sm:px-10 py-8 border-b border-rule'>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
              {stats.map(({ label, value }) => (
                <StatBlock key={label} label={label} value={value} />
              ))}
            </div>
          </div>

          <div className='px-6 sm:px-10 py-7 border-b border-rule flex items-center gap-3'>
            <span className='font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint w-[90px] shrink-0'>
              Vs last week
            </span>
            <DeltaBadge pct={recap.week_over_week_pct} />
          </div>

          <div className='px-6 sm:px-10 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            {recap.best_session_id ? (
              <Link
                to={`/sessions/${recap.best_session_id}`}
                className='group inline-flex items-center gap-2.5 h-[44px] px-6 rounded-full font-mono text-[13px] uppercase tracking-wider font-medium bg-accent text-paper hover:bg-ink transition-colors whitespace-nowrap'
              >
                View best session
                <span className='inline-block transition-transform group-hover:translate-x-1'>
                  →
                </span>
              </Link>
            ) : (
              <span className='font-mono text-[13px] text-ink-faint'>
                No sessions logged this week yet.
              </span>
            )}

            <div className='flex items-center gap-2 font-mono text-[11px] text-ink-faint'>
              <LiveDot color='live' />
              <span>
                {user?.plan === 'team' ? 'Team' : 'Pro'} · updated live
              </span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
