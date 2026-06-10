import { useEffect } from 'react'
import { Shell, LiveDot } from '../components/chrome'

const COMPONENTS = [
  { name: 'VSCode Extension', note: 'Invite only' },
  { name: 'API — Ingest', note: 'Invite only' },
  { name: 'API — Sessions', note: 'Invite only' },
  { name: 'API — Leaderboard', note: 'Invite only' },
  { name: 'Web Dashboard', note: 'Invite only' },
  { name: 'Database', note: 'Invite only' },
  { name: 'Public Access', note: 'Pending launch' },
]

export default function Status() {
  useEffect(() => {
    document.title = 'Status · commma'
  }, [])

  return (
    <Shell>
      <div className='max-w-[680px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          System Status
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-4 text-ink'>
          All systems{' '}
          <em className='italic text-accent'>pending operations.</em>
        </h1>
        <p className='font-sans text-[16px] leading-relaxed text-ink-soft m-0 mb-12 max-w-[48ch]'>
          commma infrastructure is online and running in invite-only early
          access. Full public operations are pending launch.
        </p>

        <div className='border border-rule-strong rounded overflow-hidden mb-8'>
          <div className='flex items-center gap-3 px-5 sm:px-7 py-4 bg-paper-2 border-b border-rule'>
            <LiveDot color='accent' />
            <span className='font-mono text-[13px] text-ink-soft tracking-wide'>
              Invite-only early access
            </span>
          </div>
          {COMPONENTS.map((c, i) => (
            <div
              key={c.name}
              className={`flex items-center justify-between px-5 sm:px-7 py-4 gap-4 ${i < COMPONENTS.length - 1 ? 'border-b border-rule' : ''}`}
            >
              <span className='font-mono text-[14px] text-ink'>{c.name}</span>
              <span className='font-mono text-[12px] tracking-[0.14em] uppercase text-ink-mute shrink-0'>
                {c.note}
              </span>
            </div>
          ))}
        </div>

        <p className='font-mono text-[13px] text-ink-mute'>
          Incidents or outages?{' '}
          <a
            href='mailto:anhdtran.forwork@gmail.com?subject=commma status'
            className='text-accent hover:text-ink-soft transition-colors'
          >
            Contact us
          </a>
          .
        </p>
      </div>
    </Shell>
  )
}
