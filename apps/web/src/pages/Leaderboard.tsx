import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LiveDot, Shell, StatusPanel } from '../components/chrome'
import {
  ApiError,
  getLeaderboard,
  type LeaderboardData,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '../lib/api'
import { formatDuration } from '../lib/format'
import { langStyle } from '../lib/langColors'

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'alltime', label: 'All time' },
]

function PeriodTabs({
  active,
  onChange,
}: {
  active: LeaderboardPeriod
  onChange: (p: LeaderboardPeriod) => void
}) {
  return (
    <div className='flex gap-1.5'>
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          type='button'
          onClick={() => onChange(value)}
          className={`h-[42px] px-5 rounded-full font-mono text-[15px] uppercase tracking-wider border transition-colors ${
            active === value
              ? 'bg-accent border-accent text-paper'
              : 'border-rule-strong text-ink-mute hover:text-ink hover:border-rule-strong'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1
      ? 'text-accent font-semibold'
      : rank <= 3
        ? 'text-ink-soft'
        : 'text-ink-faint'
  return (
    <span
      className={`font-mono text-[15px] tnum w-7 text-right shrink-0 ${cls}`}
    >
      {rank}
    </span>
  )
}

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  const { rank, handle, avatar_url, duration_s, top_lang, streak_days } = entry
  const style = top_lang ? langStyle(top_lang) : null
  return (
    <div className='flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-4 sm:py-5 border-b border-rule last:border-b-0 hover:bg-paper-2/40 transition-colors'>
      <RankBadge rank={rank} />
      {avatar_url ? (
        <img
          src={avatar_url}
          alt={handle}
          width={32}
          height={32}
          className='w-8 h-8 rounded-full border border-rule object-cover shrink-0'
        />
      ) : (
        <span className='w-8 h-8 rounded-full border border-rule bg-paper-3 shrink-0' />
      )}
      <Link
        to={`/@${handle}`}
        className='min-w-0 flex-1 font-serif text-[clamp(16px,2vw,20px)] leading-none tracking-[-0.01em] text-ink hover:text-accent transition-colors truncate'
      >
        @{handle}
      </Link>
      <div className='hidden sm:flex items-center gap-5 shrink-0'>
        {style && (
          <span className='flex items-center gap-1.5 font-mono text-[15px] text-ink-soft'>
            <span
              className='w-2 h-2 rounded-sm'
              style={{ background: style.color }}
            />
            {style.label}
          </span>
        )}
        {streak_days > 0 && (
          <span className='flex items-center gap-1.5 font-mono text-[15px] text-live'>
            <LiveDot color='live' />
            {streak_days}d
          </span>
        )}
      </div>
      <span className='font-mono text-[15px] tnum text-ink-soft shrink-0'>
        {formatDuration(duration_s)}
      </span>
    </div>
  )
}

function LeaderboardCard({
  data,
  period,
  onPeriodChange,
}: {
  data: LeaderboardData
  period: LeaderboardPeriod
  onPeriodChange: (p: LeaderboardPeriod) => void
}) {
  return (
    <div className='border border-rule-strong rounded bg-linear-to-b from-paper-2 to-paper overflow-hidden'>
      <div className='px-5 sm:px-8 py-6 sm:py-7 border-b border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-6'>
        <div>
          <div className='font-mono text-[15px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
            leaderboard
          </div>
          <h1 className='font-serif text-[clamp(28px,4vw,48px)] leading-none tracking-[-0.02em] m-0 text-ink'>
            Top coders
          </h1>
        </div>
        <PeriodTabs active={period} onChange={onPeriodChange} />
      </div>
      {data.entries.length === 0 ? (
        <div className='px-5 sm:px-8 py-24 text-center font-mono text-[15px] text-ink-mute'>
          No data yet for this period.
        </div>
      ) : (
        <>
          <div className='hidden sm:flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-3 border-b border-rule bg-paper-3/60'>
            <span className='w-7 shrink-0' />
            <span className='w-8 shrink-0' />
            <span className='flex-1 font-mono text-[15px] uppercase tracking-[0.14em] text-ink-faint'>
              Player
            </span>
            <div className='flex items-center gap-5 shrink-0'>
              <span className='font-mono text-[15px] uppercase tracking-[0.14em] text-ink-faint w-[90px] text-right'>
                Lang
              </span>
              <span className='font-mono text-[15px] uppercase tracking-[0.14em] text-ink-faint w-[48px] text-right'>
                Streak
              </span>
            </div>
            <span className='font-mono text-[15px] uppercase tracking-[0.14em] text-ink-faint shrink-0 w-[52px] text-right'>
              Time
            </span>
          </div>
          {data.entries.map((e) => (
            <EntryRow key={e.handle} entry={e} />
          ))}
          <div className='px-5 sm:px-8 py-3 border-t border-rule'>
            <span className='font-mono text-[15px] text-ink-faint'>
              Updated {new Date(data.updated_at).toLocaleTimeString()}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; data: LeaderboardData }
  | { phase: 'error'; error: ApiError }

export default function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')
  const [state, setState] = useState<LoadState>({ phase: 'loading' })

  const changePeriod = useCallback((p: LeaderboardPeriod) => {
    setPeriod(p)
    setState({ phase: 'loading' })
  }, [])

  useEffect(() => {
    let cancelled = false
    getLeaderboard(period)
      .then((data) => {
        if (!cancelled) setState({ phase: 'ready', data })
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
  }, [period])

  useEffect(() => {
    document.title = 'Leaderboard · commma'
  }, [])

  if (state.phase === 'loading') {
    return (
      <Shell>
        <StatusPanel
          title='Loading leaderboard…'
          body='Fetching the top coders for this period.'
        />
      </Shell>
    )
  }

  if (state.phase === 'error') {
    return (
      <Shell>
        <StatusPanel title='Something went wrong' body={state.error.message} />
      </Shell>
    )
  }

  return (
    <Shell>
      <LeaderboardCard
        data={state.data}
        period={period}
        onPeriodChange={changePeriod}
      />
    </Shell>
  )
}
