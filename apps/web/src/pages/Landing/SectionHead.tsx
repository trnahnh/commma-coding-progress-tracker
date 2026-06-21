import { type ReactNode } from 'react'

export function SectionHead({
  no,
  kicker,
  title,
  aside,
}: {
  no: string
  kicker: string
  title: ReactNode
  aside?: string
}) {
  return (
    <div className='relative pb-[clamp(32px,5vw,64px)]'>
      <span
        aria-hidden='true'
        className='pointer-events-none select-none absolute right-0 -top-[0.08em] font-serif leading-none tracking-[-0.04em] text-ink-faint/35 text-[clamp(60px,12vw,190px)]'
      >
        {no}
      </span>
      <div className='relative flex flex-col gap-3 sm:gap-4 pr-[clamp(52px,14vw,180px)]'>
        <span className='font-mono text-[12px] sm:text-[13px] tracking-[0.26em] uppercase text-accent'>
          § {no} — {kicker}
        </span>
        <h2 className='font-serif font-normal text-[clamp(30px,5vw,68px)] leading-[0.98] tracking-[-0.02em] m-0 text-ink'>
          {title}
        </h2>
        {aside && (
          <span className='font-mono text-[13px] tracking-[0.14em] uppercase text-ink-mute'>
            {aside}
          </span>
        )}
      </div>
    </div>
  )
}
