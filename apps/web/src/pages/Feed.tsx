import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell, StatusPanel } from '../components/chrome'
import { ApiError, getFeed, type FeedEntry, type FeedPage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatClock, formatDate, formatDuration } from '../lib/format'
import { langStyle } from '../lib/langColors'

function FeedCard({ entry }: { entry: FeedEntry }) {
  const { session, user } = entry
  const { id, started_at, duration_s, lines_delta, top_lang } = session
  const style = top_lang ? langStyle(top_lang) : null
  const navigate = useNavigate()
  return (
    <div
      role='link'
      tabIndex={0}
      onClick={() => navigate(`/sessions/${id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/sessions/${id}`)}
      className='group cursor-pointer border-b border-rule last:border-b-0 px-5 sm:px-8 py-5 sm:py-6 hover:bg-paper-2/40 transition-colors'
    >
      <div className='flex items-center gap-3 mb-3.5'>
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.handle}
            width={32}
            height={32}
            className='w-8 h-8 rounded-full border border-rule object-cover shrink-0'
          />
        ) : (
          <span className='w-8 h-8 rounded-full border border-rule bg-paper-3 shrink-0' />
        )}
        <Link
          to={`/@${user.handle}`}
          onClick={(e) => e.stopPropagation()}
          className='relative z-10 font-serif text-[16px] leading-none tracking-[-0.01em] text-ink hover:text-accent transition-colors'
        >
          @{user.handle}
        </Link>
        <span className='text-ink-faint text-[12px]'>·</span>
        <span className='font-mono text-[12px] text-ink-mute tnum'>
          {formatDate(started_at)}
          <span className='mx-1.5 text-ink-faint'>·</span>
          {formatClock(started_at)}
        </span>
      </div>
      <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
        <span className='font-mono text-[15px] font-medium text-ink tnum'>
          {formatDuration(duration_s)}
        </span>
        {style && (
          <span className='flex items-center gap-1.5 font-mono text-[13px] text-ink-soft'>
            <span
              className='w-2 h-2 rounded-sm'
              style={{ background: style.color }}
            />
            {style.label}
          </span>
        )}
        <span className='font-mono text-[13px] text-ink-mute tnum'>
          {lines_delta.toLocaleString()}∆
        </span>
        <span className='ml-auto font-mono text-[13px] text-ink-faint group-hover:text-ink-soft group-hover:translate-x-0.5 transition-all'>
          →
        </span>
      </div>
    </div>
  )
}

function FeedList({
  entries,
  nextCursor,
  onLoadMore,
  loadingMore,
}: {
  entries: FeedEntry[]
  nextCursor: string | null
  onLoadMore: () => void
  loadingMore: boolean
}) {
  if (entries.length === 0) {
    return (
      <div className='px-5 sm:px-8 py-16 text-center font-mono text-[12px] text-ink-mute'>
        Nothing here yet. Follow some coders to see their sessions.
      </div>
    )
  }
  return (
    <>
      {entries.map((e) => (
        <FeedCard key={e.session.id} entry={e} />
      ))}
      {nextCursor && (
        <div className='flex justify-center py-5 border-t border-rule'>
          <button
            type='button'
            onClick={onLoadMore}
            disabled={loadingMore}
            className='font-mono text-[11px] uppercase tracking-wider text-ink-mute hover:text-ink disabled:opacity-40 transition-colors'
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}

type LoadState =
  | { phase: 'loading' }
  | {
      phase: 'ready'
      entries: FeedEntry[]
      nextCursor: string | null
    }
  | { phase: 'error'; error: ApiError }

export default function Feed() {
  const { token, isLoading: authLoading } = useAuth()
  const [state, setState] = useState<LoadState>({ phase: 'loading' })
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    document.title = 'Feed · commma'
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getFeed(token)
      .then((page: FeedPage) => {
        if (!cancelled)
          setState({
            phase: 'ready',
            entries: page.entries,
            nextCursor: page.next_cursor,
          })
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
  }, [token])

  const loadMore = useCallback(async () => {
    if (!token || state.phase !== 'ready' || !state.nextCursor || loadingMore)
      return
    const cursor = state.nextCursor
    setLoadingMore(true)
    try {
      const page = await getFeed(token, cursor)
      setState((prev) =>
        prev.phase === 'ready'
          ? {
              ...prev,
              entries: [...prev.entries, ...page.entries],
              nextCursor: page.next_cursor,
            }
          : prev,
      )
    } catch {
      void 0
    } finally {
      setLoadingMore(false)
    }
  }, [token, state, loadingMore])

  const header = (
    <div className='px-5 sm:px-8 py-5 sm:py-6 border-b border-rule'>
      <div className='font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
        activity
      </div>
      <h1 className='font-serif text-[clamp(28px,4vw,48px)] leading-none tracking-[-0.02em] m-0 text-ink'>
        Feed
      </h1>
    </div>
  )

  if (authLoading) {
    return (
      <Shell>
        <div className='border border-rule-strong rounded bg-linear-to-b from-paper-2 to-paper overflow-hidden'>
          {header}
          <div className='px-5 sm:px-8 py-16 text-center font-mono text-[12px] text-ink-mute'>
            Loading…
          </div>
        </div>
      </Shell>
    )
  }

  if (!token) {
    return (
      <Shell>
        <div className='border border-rule-strong rounded bg-linear-to-b from-paper-2 to-paper overflow-hidden'>
          {header}
          <div className='px-5 sm:px-8 py-16 text-center space-y-5'>
            <p className='font-mono text-[12px] text-ink-mute m-0'>
              Sign in to see sessions from the coders you follow.
            </p>
            <Link
              to='/signin'
              className='inline-flex items-center gap-2.5 h-[38px] px-5 rounded-full font-mono text-[12px] uppercase tracking-wider bg-accent text-paper border border-accent hover:bg-ink hover:border-ink transition-colors'
            >
              Sign in
            </Link>
          </div>
        </div>
      </Shell>
    )
  }

  if (state.phase === 'loading') {
    return (
      <Shell>
        <StatusPanel
          title='Loading feed…'
          body='Fetching sessions from the coders you follow.'
        />
      </Shell>
    )
  }

  if (state.phase === 'error') {
    const notAuth =
      state.error.status === 401 || state.error.code === 'UNAUTHORIZED'
    return (
      <Shell>
        <StatusPanel
          title={notAuth ? 'Session expired' : 'Something went wrong'}
          body={
            notAuth
              ? 'Sign in again via the commma extension.'
              : state.error.message
          }
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <div className='border border-rule-strong rounded bg-linear-to-b from-paper-2 to-paper overflow-hidden'>
        {header}
        <FeedList
          entries={state.entries}
          nextCursor={state.nextCursor}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
        />
      </div>
    </Shell>
  )
}
