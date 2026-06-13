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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex flex-col gap-3 p-5 sm:p-6 rounded-xl border border-rule bg-paper-2/40'>
      <span className='font-mono text-[12px] uppercase tracking-[0.12em] text-ink-mute'>
        {label}
      </span>
      <span className='font-mono text-[clamp(22px,3.5vw,34px)] leading-none tnum text-accent-2'>
        {value}
      </span>
    </div>
  )
}

function RecapSkeleton() {
  return (
    <div className='space-y-10 sm:space-y-12'>
      <div>
        <div className='h-3 w-48 bg-paper-3 rounded animate-pulse mb-6' />
        <div className='h-12 w-3/4 bg-paper-3 rounded animate-pulse mb-4' />
        <div className='h-5 w-1/2 bg-paper-3 rounded animate-pulse mb-2' />
        <div className='h-5 w-2/5 bg-paper-3 rounded animate-pulse' />
      </div>
      <div className='h-[3px] w-full bg-paper-3 rounded animate-pulse' />
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='h-[100px] bg-paper-3 rounded-xl animate-pulse' />
        ))}
      </div>
      <div className='h-[130px] bg-paper-3 rounded-xl animate-pulse' />
    </div>
  )
}

export default function Recap() {
  const { token, user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [recap, setRecap] = useState<RecapData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!token || !user) {
      navigate('/signin')
      return
    }
    if (user.plan !== 'pro' && user.plan !== 'team') {
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
  }, [token, user, isLoading, navigate])

  if (isLoading || (!recap && !error)) {
    return (
      <Shell>
        <RecapSkeleton />
      </Shell>
    )
  }

  if (error) {
    return (
      <Shell>
        <StatusPanel title='Something went wrong' body={error} />
      </Shell>
    )
  }

  if (!recap) return null

  const progress = weekProgress(recap.week_start, recap.week_end)
  const dayNum = Math.min(7, Math.max(1, Math.ceil(progress * 7)))
  const weekLabel = formatWeekRange(recap.week_start, recap.week_end)
  const pct = recap.week_over_week_pct
  const up = pct !== null && pct > 0
  const flat = pct === 0

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
      <div className='mb-10 sm:mb-14'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-6'>
          <span className='font-mono text-[13px] uppercase tracking-[0.12em] text-accent'>
            Weekly recap
          </span>
          <span className='font-mono text-[13px] text-ink-mute'>·</span>
          <span className='font-mono text-[13px] text-ink-soft'>{weekLabel}</span>
          <span className='ml-auto font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft border border-ink-mute rounded-full px-3 py-1'>
            {user?.plan === 'team' ? 'Team' : 'Pro'}
          </span>
        </div>

        <h1 className='font-serif text-[clamp(30px,6vw,64px)] leading-[1.1] tracking-[-0.025em] text-ink m-0 mb-5 max-w-[900px]'>
          {recap.headline}
        </h1>
        <p className='font-sans text-[15px] sm:text-[17px] text-ink-soft leading-[1.65] m-0 max-w-[600px]'>
          {recap.note}
        </p>
      </div>

      <div className='mb-10 sm:mb-14'>
        <div className='flex items-center justify-between mb-3'>
          <span className='font-mono text-[12px] uppercase tracking-[0.12em] text-ink-mute'>
            Week progress
          </span>
          <span className='font-mono text-[13px] text-ink-soft tnum'>
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

      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-10 sm:mb-14'>
        {stats.map(({ label, value }) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>

      <div className='border border-rule-strong rounded-xl bg-paper-2/40 p-6 sm:p-8 lg:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 justify-between'>
        <div className='min-w-0'>
          <span className='font-mono text-[12px] uppercase tracking-[0.12em] text-ink-mute block mb-3'>
            Vs last week
          </span>
          {pct === null ? (
            <span className='font-mono text-[15px] text-ink-soft'>
              No data from last week
            </span>
          ) : (
            <div className='flex items-baseline gap-3 flex-wrap'>
              <span
                className={[
                  'font-mono leading-none tnum font-semibold',
                  'text-[clamp(44px,8vw,80px)]',
                  up ? 'text-live' : flat ? 'text-ink-mute' : 'text-accent',
                ].join(' ')}
              >
                {flat ? '—' : up ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`}
              </span>
              <span className='font-mono text-[15px] text-ink-soft'>
                coding time vs last week
              </span>
            </div>
          )}
        </div>

        <div className='flex flex-col items-start sm:items-end gap-3 shrink-0'>
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
            <span className='font-mono text-[13px] text-ink-soft'>
              No sessions logged this week yet.
            </span>
          )}
          <div className='flex items-center gap-2 font-mono text-[12px] text-ink-mute'>
            <LiveDot color='live' />
            <span>Updated live</span>
          </div>
        </div>
      </div>
    </Shell>
  )
}
