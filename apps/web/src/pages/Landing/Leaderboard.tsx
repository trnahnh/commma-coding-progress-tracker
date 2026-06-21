import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Reveal } from '../../components/Reveal'
import { type LeaderboardEntry } from '../../lib/api'
import { queries } from '../../lib/queries'
import { useAuth } from '../../lib/auth'
import { formatDuration } from '../../lib/format'
import { langStyle } from '../../lib/langColors'
import { SectionHead } from './SectionHead'

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

export function Leaderboard() {
  const { user } = useAuth()
  const { data, isPending, isError } = useQuery(queries.leaderboard('week'))
  const entries = data?.entries.slice(0, 6) ?? []
  const aside = isError
    ? 'unable to load'
    : data
      ? `updated · ${new Date(data.updated_at).toLocaleTimeString()}`
      : ''

  return (
    <section className='py-[clamp(56px,9vw,140px)] border-t border-rule'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <Reveal>
          <SectionHead
            no='03'
            kicker='the podium'
            title={
              <>
                This week's <em className='italic text-accent'>podium.</em>
              </>
            }
            aside={aside}
          />
        </Reveal>
        <Reveal delay={120}>
          <div className='border border-rule-strong rounded-lg overflow-hidden surface'>
            <div className='grid grid-cols-[40px_1fr_auto] md:grid-cols-[56px_1.4fr_1fr_1fr_32px] items-center px-4 sm:px-6 py-3.5 gap-3 font-mono text-[15px] tracking-[0.14em] uppercase text-ink-soft bg-paper-2 border-b border-rule'>
              <span>Rank</span>
              <span>Athlete</span>
              <span className='text-right md:text-left'>Time</span>
              <span className='hidden md:block'>Lang · Streak</span>
              <span className='hidden md:block' />
            </div>
            {isPending ? (
              <div className='px-4 sm:px-6 py-10 space-y-3'>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className='h-[52px] rounded bg-paper-3 animate-pulse'
                  />
                ))}
              </div>
            ) : entries.length === 0 ? (
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
        </Reveal>
      </div>
    </section>
  )
}
