import { useEffect } from 'react'
import { Shell } from '../components/chrome'

export default function Contact() {
  useEffect(() => {
    document.title = 'Contact · commma'
  }, [])

  return (
    <Shell>
      <div className='max-w-[680px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          Contact
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-12 text-ink lift-text'>
          Get in <em className='italic text-accent'>touch.</em>
        </h1>

        <div className='border-t border-rule'>
          <div className='grid grid-cols-1 sm:grid-cols-[140px_1fr] items-baseline gap-1 sm:gap-6 py-6 border-b border-rule'>
            <span className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute'>
              Founder
            </span>
            <span className='font-sans text-[17px] text-ink'>Anh Tran</span>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-[140px_1fr] items-baseline gap-1 sm:gap-6 py-6 border-b border-rule'>
            <span className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute'>
              Email
            </span>
            <a
              href='mailto:anhdtran.forwork@gmail.com'
              className='font-mono text-[15px] text-accent hover:text-ink-soft transition-colors break-all'
            >
              anhdtran.forwork@gmail.com
            </a>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-[140px_1fr] items-baseline gap-1 sm:gap-6 py-6 border-b border-rule'>
            <span className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute'>
              GitHub
            </span>
            <a
              href='https://github.com/trnahnh'
              target='_blank'
              rel='noopener noreferrer'
              className='font-mono text-[14px] text-ink-soft hover:text-ink transition-colors inline-flex items-center gap-1.5 break-all'
            >
              trnahnh
              <span className='text-ink-mute text-[12px] shrink-0'>↗</span>
            </a>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-[140px_1fr] items-start gap-1 sm:gap-6 py-6'>
            <span className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute sm:pt-1'>
              Response
            </span>
            <p className='font-sans text-[15px] leading-relaxed text-ink-mute m-0 max-w-[38ch]'>
              Replies within 48 hours on weekdays. For bug reports and feature
              requests, opening a GitHub issue gets the fastest turnaround.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )
}
