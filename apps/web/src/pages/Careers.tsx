import { useEffect } from 'react'
import { Shell } from '../components/chrome'

export default function Careers() {
  useEffect(() => {
    document.title = 'Careers · commma'
  }, [])

  return (
    <Shell>
      <div className='max-w-[680px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          Careers
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-8 text-ink lift-text'>
          We're <em className='italic text-accent'>expanding</em> soon.
        </h1>
        <p className='font-sans text-[17px] leading-relaxed text-ink-soft m-0 mb-6 max-w-[48ch]'>
          commma is a small team building developer tooling with an athlete's
          mindset — deliberate, data-driven, and proud of the work. We're in
          early access and not hiring yet, but we're growing intentionally.
        </p>
        <p className='font-sans text-[17px] leading-relaxed text-ink-soft m-0 mb-12 max-w-[48ch]'>
          We'll post openings here when the time comes. If you want to be first
          to know — or just want to say hi — drop us a line.
        </p>
        <a
          href='mailto:anhdtran.forwork@gmail.com?subject=commma — expressing interest'
          className='group inline-flex items-center gap-2.5 h-[44px] px-6 rounded-full font-mono text-[13px] uppercase tracking-wider
            text-ink-soft hover:text-ink border border-ink-mute hover:border-ink-soft transition-colors press'
        >
          Get in touch
          <span className='inline-block transition-transform group-hover:translate-x-1'>
            →
          </span>
        </a>
      </div>
    </Shell>
  )
}
