import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { LiveDot, Shell, StatusPanel } from '../components/chrome'
import {
  ApiError,
  getProfile,
  getProfileSessions,
  type Badge,
  type SessionSummary,
  type UserProfile,
} from '../lib/api'
import { hasProAccess } from '@commma/shared'
import { useAuth } from '../lib/auth'
import { FREE_MODE } from '../lib/config'
import { formatClock, formatDate, formatDuration } from '../lib/format'
import { langStyle } from '../lib/langColors'
import { useSeo } from '../lib/seo'

const BADGE_CATALOG = [
  { id: 'vim-athlete', label: 'Vim athlete' },
  { id: 'mouse-free', label: 'Mouse-free' },
  { id: 'backspace-heavy', label: 'Backspace heavy' },
  { id: 'arrow-navigator', label: 'Arrow navigator' },
] as const

function BadgeRow({ badges }: { badges: Badge[] }) {
  const earnedIds = new Set(badges.map((b) => b.id))
  return (
    <div className='mt-4 flex flex-wrap gap-2'>
      {BADGE_CATALOG.map(({ id, label }) => {
        const earned = earnedIds.has(id)
        return (
          <span
            key={id}
            className={[
              'inline-flex items-center h-[28px] px-3 rounded-full font-mono text-[11px] uppercase tracking-wider border',
              earned
                ? 'text-accent-2 border-accent-2-line bg-accent-2-soft'
                : 'text-ink-faint border-rule opacity-25 select-none',
            ].join(' ')}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

function ProfileHero({ profile }: { profile: UserProfile }) {
  const {
    handle,
    avatar_url,
    display_name,
    pronouns,
    bio,
    website,
    location,
    company,
    job_title,
    linkedin,
    open_to_work,
    streak,
    stats,
  } = profile
  const topStyle = stats.top_lang ? langStyle(stats.top_lang) : null
  const work = [job_title, company].filter(Boolean).join(' · ')
  return (
    <div className='border border-rule-strong rounded-lg bg-linear-to-b from-paper-2 to-paper overflow-hidden surface'>
      <div className='px-5 sm:px-8 py-6 sm:py-8 flex items-start gap-5 sm:gap-6 border-b border-rule'>
        <img
          src={avatar_url}
          alt={handle}
          width={80}
          height={80}
          className='w-16 sm:w-20 h-16 sm:h-20 rounded-full border border-rule-strong ring-depth object-cover shrink-0 mt-1'
        />
        <div className='min-w-0'>
          <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-1.5'>
            profile
          </div>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
            {display_name ? (
              <h1 className='font-serif text-[clamp(28px,4.5vw,52px)] leading-[1.04] tracking-[-0.02em] m-0 text-ink'>
                {display_name}
              </h1>
            ) : (
              <h1 className='font-serif text-[clamp(28px,4.5vw,52px)] leading-[1.04] tracking-[-0.02em] m-0 text-ink break-all'>
                @{handle}
              </h1>
            )}
            {open_to_work && (
              <span className='inline-flex items-center h-[24px] px-2.5 rounded-full font-mono text-[11px] uppercase tracking-wider text-accent-2 border border-accent-2-line bg-accent-2-soft'>
                Open to work
              </span>
            )}
          </div>
          {(display_name || pronouns) && (
            <p className='mt-1 m-0 font-mono text-[13px] text-ink-mute'>
              {display_name && <span>@{handle}</span>}
              {display_name && pronouns && (
                <span className='mx-2 text-ink-faint'>·</span>
              )}
              {pronouns && <span>{pronouns}</span>}
            </p>
          )}
          {work && (
            <p className='mt-2 m-0 font-mono text-[13px] text-ink-soft'>
              {work}
            </p>
          )}
          {bio && (
            <p className='mt-2 m-0 font-mono text-[13px] text-ink-soft leading-relaxed'>
              {bio}
            </p>
          )}
          {(location || website || linkedin || streak.current_days > 0) && (
            <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1'>
              {streak.current_days > 0 && (
                <span className='font-mono text-[13px] text-live flex items-center gap-1.5'>
                  <LiveDot color='live' />
                  {streak.current_days}d streak
                </span>
              )}
              {location && (
                <span className='font-mono text-[13px] text-ink-mute'>
                  {location}
                </span>
              )}
              {website && (
                <a
                  href={website}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors'
                >
                  {website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {linkedin && (
                <a
                  href={linkedin}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors'
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule'>
        <StatCell
          label='Sessions'
          value={stats.total_sessions.toLocaleString()}
        />
        <StatCell
          label='Total time'
          value={formatDuration(stats.total_duration_s)}
        />
        <StatCell
          label='Streak'
          value={`${streak.current_days}`}
          unit={streak.current_days === 1 ? 'day' : 'days'}
          foot={
            streak.longest_days > 0 ? `best ${streak.longest_days}d` : undefined
          }
        />
        <StatCell
          label='Top language'
          value={topStyle ? topStyle.label : '—'}
          dot={topStyle?.color}
        />
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  unit,
  foot,
  dot,
}: {
  label: string
  value: string
  unit?: string
  foot?: string
  dot?: string
}) {
  return (
    <div className='bg-paper-2 px-5 sm:px-7 py-5 sm:py-6'>
      <span className='block font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-3.5'>
        {label}
      </span>
      <span className='flex items-center gap-2 font-serif text-[clamp(22px,2.5vw,36px)] leading-none tracking-[-0.02em] text-ink tnum'>
        {dot && (
          <span
            aria-hidden='true'
            className='w-3 h-3 rounded-sm shrink-0'
            style={{ background: dot }}
          />
        )}
        {value}
        {unit && (
          <span className='font-mono text-[13px] tracking-wide text-ink-mute lowercase'>
            {unit}
          </span>
        )}
      </span>
      {foot && (
        <span className='block font-mono text-[13px] tracking-wide text-ink-mute mt-1.5 tnum'>
          {foot}
        </span>
      )}
    </div>
  )
}

function SessionRow({ session }: { session: SessionSummary }) {
  const { top_lang, duration_s, lines_delta, started_at } = session
  const style = top_lang ? langStyle(top_lang) : null
  const { pathname, search } = useLocation()
  const handle = pathname.replace(/^\/@?/, '')
  return (
    <Link
      to={`/sessions/${session.id}`}
      state={{ from: `${pathname}${search}`, fromLabel: `Back to @${handle}` }}
      className='flex items-center gap-4 px-5 sm:px-8 py-3.5 border-b border-rule last:border-b-0 hover:bg-paper-2/50 transition-colors group'
    >
      <div className='min-w-0 flex-1'>
        <span className='font-mono text-[14px] text-ink'>
          {formatDate(started_at)}
        </span>
        <span className='mx-2 text-ink-faint text-[13px]'>·</span>
        <span className='font-mono text-[13px] text-ink-mute tnum'>
          {formatClock(started_at)}
        </span>
      </div>
      <div className='hidden sm:flex items-center gap-5'>
        {style ? (
          <span className='flex items-center gap-1.5 font-mono text-[13px] text-ink-soft'>
            <span
              aria-hidden='true'
              className='w-2 h-2 rounded-sm'
              style={{ background: style.color }}
            />
            {style.label}
          </span>
        ) : (
          <span className='font-mono text-[13px] text-ink-mute'>—</span>
        )}
        <span className='font-mono text-[13px] text-ink-soft tnum'>
          {formatDuration(duration_s)}
        </span>
        <span className='font-mono text-[13px] text-ink-mute tnum'>
          {lines_delta.toLocaleString()}∆
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <span className='font-mono text-[13px] text-ink-soft tnum sm:hidden'>
          {formatDuration(duration_s)}
        </span>
        <span className='font-mono text-[13px] text-ink-faint group-hover:text-ink-soft group-hover:translate-x-0.5 transition-all'>
          →
        </span>
      </div>
    </Link>
  )
}

function SessionFeed({
  sessions,
  nextCursor,
  onLoadMore,
  loadingMore,
  showHistoryGate,
  isOwnProfile,
}: {
  sessions: SessionSummary[]
  nextCursor: string | null
  onLoadMore: () => void
  loadingMore: boolean
  showHistoryGate: boolean
  isOwnProfile: boolean
}) {
  return (
    <div className='border border-rule-strong rounded-lg overflow-hidden surface mt-6'>
      <div className='px-5 sm:px-8 py-4 border-b border-rule flex items-center justify-between'>
        <span className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute'>
          Sessions
        </span>
        <span className='font-mono text-[13px] text-ink-mute tnum'>
          {sessions.length.toLocaleString()}
          {nextCursor ? '+' : ''}
        </span>
      </div>
      {sessions.length === 0 ? (
        <div className='px-5 sm:px-8 py-12 text-center font-mono text-[13px] text-ink-mute'>
          {isOwnProfile ? (
            <>
              No sessions yet — the extension isn&apos;t public yet.{' '}
              <a href='/#waitlist' className='text-accent hover:underline'>
                Join the waitlist
              </a>{' '}
              to get notified at launch.
            </>
          ) : (
            'No sessions yet.'
          )}
        </div>
      ) : (
        <>
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
          {nextCursor && (
            <div className='flex justify-center py-5 border-t border-rule'>
              <button
                type='button'
                onClick={onLoadMore}
                disabled={loadingMore}
                className='font-mono text-[13px] uppercase tracking-wider text-ink-mute hover:text-ink disabled:opacity-40 transition-colors'
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
          {showHistoryGate && (
            <div className='border-t border-rule px-5 sm:px-8 py-5 text-center bg-paper-2/40'>
              <p className='font-mono text-[12px] text-ink-mute m-0 mb-3'>
                Free plan · last 7 days of sessions
              </p>
              <Link
                to='/pricing'
                className='group inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider text-ink-soft hover:text-ink transition-colors'
              >
                Upgrade for full history
                <span className='inline-block transition-transform group-hover:translate-x-0.5'>
                  →
                </span>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

type LoadState =
  | { phase: 'loading' }
  | {
      phase: 'ready'
      profile: UserProfile
      sessions: SessionSummary[]
      nextCursor: string | null
    }
  | { phase: 'error'; error: ApiError }

export default function Profile() {
  const { handle: rawHandle = '' } = useParams<{ handle: string }>()
  const hasAt = rawHandle.startsWith('@')
  const handle = hasAt ? rawHandle.slice(1) : rawHandle
  const { user } = useAuth()
  const initialState = (): LoadState =>
    hasAt
      ? { phase: 'loading' }
      : { phase: 'error', error: new ApiError(404, 'NOT_FOUND', 'Not found') }
  const [state, setState] = useState<LoadState>(initialState)
  const [trackedHandle, setTrackedHandle] = useState(rawHandle)
  const [loadingMore, setLoadingMore] = useState(false)

  if (trackedHandle !== rawHandle) {
    setTrackedHandle(rawHandle)
    setState(initialState())
  }

  useEffect(() => {
    if (!hasAt) return
    let cancelled = false
    Promise.all([getProfile(handle), getProfileSessions(handle)])
      .then(([profile, page]) => {
        if (!cancelled) {
          setState({
            phase: 'ready',
            profile,
            sessions: page.sessions,
            nextCursor: page.next_cursor,
          })
        }
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
  }, [handle, hasAt])

  const profileLabel =
    state.phase === 'ready'
      ? `@${state.profile.handle}`
      : state.phase === 'error'
        ? 'Profile not found'
        : 'Loading profile'
  const profileDescription =
    state.phase === 'ready'
      ? [
          `${state.profile.stats.total_sessions} sessions`,
          state.profile.streak.current_days > 0
            ? `${state.profile.streak.current_days}d streak`
            : null,
          state.profile.stats.top_lang ? `· ${state.profile.stats.top_lang}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined
  useSeo({
    title: `${profileLabel} · commma`,
    description: profileDescription,
    ogType: 'profile',
  })

  const loadMore = useCallback(async () => {
    if (state.phase !== 'ready' || !state.nextCursor || loadingMore) return
    const cursor = state.nextCursor
    setLoadingMore(true)
    try {
      const page = await getProfileSessions(handle, cursor)
      setState((prev) =>
        prev.phase === 'ready'
          ? {
              ...prev,
              sessions: [...prev.sessions, ...page.sessions],
              nextCursor: page.next_cursor,
            }
          : prev,
      )
    } catch {
      void 0
    } finally {
      setLoadingMore(false)
    }
  }, [state, handle, loadingMore])

  if (state.phase === 'loading') {
    return (
      <Shell>
        <StatusPanel
          title='Loading profile…'
          body='Fetching sessions and stats.'
        />
      </Shell>
    )
  }

  if (state.phase === 'error') {
    const { error } = state
    const notFound = error.status === 404 || error.code === 'NOT_FOUND'
    return (
      <Shell>
        <StatusPanel
          title={notFound ? 'Profile not found' : 'Something went wrong'}
          body={
            notFound
              ? 'This profile is private or does not exist.'
              : error.message
          }
        />
      </Shell>
    )
  }

  const { profile, sessions, nextCursor } = state
  const isOwnProfile = user?.handle === handle
  const isFree = !hasProAccess(user?.plan ?? 'free', FREE_MODE)
  const showHistoryGate = isOwnProfile && isFree
  return (
    <Shell>
      <ProfileHero profile={profile} />
      <BadgeRow badges={profile.badges} />
      <SessionFeed
        sessions={sessions}
        nextCursor={nextCursor}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
        showHistoryGate={showHistoryGate}
        isOwnProfile={isOwnProfile}
      />
    </Shell>
  )
}
