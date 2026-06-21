import { Link, useLocation, useParams } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { LiveDot, Shell, StatusPanel } from '../components/chrome'
import {
  ApiError,
  type Badge,
  type SessionSummary,
  type UserProfile,
} from '../lib/api'
import { queries } from '../lib/queries'
import { hasProAccess } from '@commma/shared'
import { useAuth } from '../lib/auth'
import { INSTALL_PATH, FREE_MODE } from '../lib/config'
import {
  formatClock,
  formatDate,
  formatDuration,
  safeExternalUrl,
} from '../lib/format'
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
              'inline-flex items-center h-[28px] px-3 rounded-full font-mono text-[12px] uppercase tracking-wider border',
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
              <span className='inline-flex items-center h-[24px] px-2.5 rounded-full font-mono text-[12px] uppercase tracking-wider text-accent-2 border border-accent-2-line bg-accent-2-soft'>
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
          {(() => {
            const websiteHref = safeExternalUrl(website)
            const linkedinHref = safeExternalUrl(linkedin)
            if (
              !location &&
              !websiteHref &&
              !linkedinHref &&
              streak.current_days <= 0
            )
              return null
            return (
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
                {websiteHref && (
                  <a
                    href={websiteHref}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors'
                  >
                    {websiteHref.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {linkedinHref && (
                  <a
                    href={linkedinHref}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors'
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            )
          })()}
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
              No sessions yet.{' '}
              <Link to={INSTALL_PATH} className='text-accent hover:underline'>
                Install the commma extension
              </Link>{' '}
              and start coding to log your first session.
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

export default function Profile() {
  const { handle: rawHandle = '' } = useParams<{ handle: string }>()
  const hasAt = rawHandle.startsWith('@')
  const handle = hasAt ? rawHandle.slice(1) : rawHandle
  const { user } = useAuth()

  const profileQuery = useQuery({ ...queries.profile(handle), enabled: hasAt })
  const sessionsQuery = useInfiniteQuery({
    ...queries.profileSessions(handle),
    enabled: hasAt,
  })

  const profile = profileQuery.data
  const profileLabel = profile
    ? `@${profile.handle}`
    : !hasAt || profileQuery.isError
      ? 'Profile not found'
      : 'Loading profile'
  const profileDescription = profile
    ? [
        `${profile.stats.total_sessions} sessions`,
        profile.streak.current_days > 0
          ? `${profile.streak.current_days}d streak`
          : null,
        profile.stats.top_lang ? `· ${profile.stats.top_lang}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined
  useSeo({
    title: `${profileLabel} · commma`,
    description: profileDescription,
    ogType: 'profile',
  })

  if (!hasAt) {
    return (
      <Shell>
        <StatusPanel
          title='Profile not found'
          body='This profile is private or does not exist.'
        />
      </Shell>
    )
  }

  if (profileQuery.isPending || sessionsQuery.isPending) {
    return (
      <Shell>
        <StatusPanel
          title='Loading profile…'
          body='Fetching sessions and stats.'
        />
      </Shell>
    )
  }

  if (profileQuery.isError) {
    const { error } = profileQuery
    const notFound =
      error instanceof ApiError &&
      (error.status === 404 || error.code === 'NOT_FOUND')
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

  const sessions = sessionsQuery.data?.pages.flatMap((p) => p.sessions) ?? []
  const isOwnProfile = user?.handle === handle
  const isFree = !hasProAccess(user?.plan ?? 'free', FREE_MODE)
  const showHistoryGate = isOwnProfile && isFree
  return (
    <Shell>
      <ProfileHero profile={profileQuery.data} />
      <BadgeRow badges={profileQuery.data.badges} />
      <SessionFeed
        sessions={sessions}
        nextCursor={sessionsQuery.hasNextPage ? 'more' : null}
        onLoadMore={() => void sessionsQuery.fetchNextPage()}
        loadingMore={sessionsQuery.isFetchingNextPage}
        showHistoryGate={showHistoryGate}
        isOwnProfile={isOwnProfile}
      />
    </Shell>
  )
}
