import { useQuery } from '@tanstack/react-query'
import { LiveDot } from '../../components/chrome'
import { type StreamEntry } from '../../lib/api'
import { queries } from '../../lib/queries'
import { MOCK_TICKER } from './mocks'

export function Ticker() {
  const { data } = useQuery(queries.activityStream())
  const live = data?.entries
  const entries: Pick<StreamEntry, 'who' | 'what' | 'em'>[] =
    live && live.length >= 4 ? live : MOCK_TICKER

  const items = [...entries, ...entries, ...entries, ...entries]
  return (
    <div className='relative border-y border-rule bg-paper-2 well overflow-hidden whitespace-nowrap'>
      <div className='absolute left-0 top-0 bottom-0 z-10 flex items-center gap-2 px-4 sm:px-6 bg-paper-3/90 backdrop-blur-sm border-r border-rule-strong font-mono text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-accent'>
        <LiveDot color='accent' />
        <span className='hidden sm:inline'>Live feed</span>
      </div>
      <div className='pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 bg-linear-to-l from-paper-2 to-transparent' />
      <div className='inline-flex gap-14 py-3.5 animate-marquee font-mono text-[15px] tracking-wide text-ink-mute'>
        {items.map((t, i) => (
          <span key={i} className='inline-flex items-center gap-2'>
            <span className='text-ink-soft'>◇</span>
            <strong className='text-ink font-medium'>@{t.who}</strong>
            <span>{t.what}</span>
            <em className='not-italic text-accent'>{t.em}</em>
          </span>
        ))}
      </div>
    </div>
  )
}
