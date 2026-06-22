import { Shell } from '../components/chrome'
import { useSeo } from '../lib/seo'

export default function Contact() {
  useSeo({
    title: 'Contact · commma',
    description: 'Get in touch with the commma team — support, partnerships, and press.',
  })

  return (
    <Shell>
      <div className='max-w-[680px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          Contact
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-12 text-ink lift-text'>
          Get in <em className='italic text-accent'>touch.</em>
        </h1>

        <p className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-4'>
          Founders
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12'>
          <div className='relative rounded-xl border border-accent-line bg-accent-soft p-6 surface lift overflow-hidden'>
            <span
              className='absolute top-4 right-5 font-mono text-[44px] leading-none text-accent-line select-none tnum'
              aria-hidden='true'
            >
              01
            </span>
            <div className='font-mono text-[12px] tracking-[0.18em] uppercase text-accent mb-4 flex items-center gap-2'>
              <span
                className='w-2 h-2 rounded-full bg-accent inline-block animate-pulse-dot'
                aria-hidden='true'
              />
              Founder
            </div>
            <div className='font-serif text-[28px] text-ink mb-5 lift-text'>
              Anh Tran
            </div>
            <div className='flex flex-col gap-2 pt-4 border-t border-accent-line'>
              <a
                href='mailto:anhdtran.forwork@gmail.com'
                className='font-mono text-[13px] text-ink-soft hover:text-accent transition-colors break-all'
              >
                anhdtran.forwork@gmail.com
              </a>
              <a
                href='https://github.com/trnahnh'
                target='_blank'
                rel='noopener noreferrer'
                className='font-mono text-[13px] text-ink-soft hover:text-accent transition-colors inline-flex items-center gap-1.5 break-all'
              >
                trnahnh
                <span className='text-ink-mute text-[12px] shrink-0'>↗</span>
              </a>
            </div>
          </div>

          <div className='relative rounded-xl border border-rule-strong bg-accent-2 p-6 surface lift overflow-hidden'>
            <span
              className='absolute top-4 right-5 font-mono text-[44px] leading-none text-paper select-none tnum'
              aria-hidden='true'
            >
              02
            </span>
            <div className='font-mono text-[12px] tracking-[0.18em] uppercase text-paper mb-4 flex items-center gap-2'>
              <span
                className='w-2 h-2 rounded-full bg-paper inline-block'
                aria-hidden='true'
              />
              Co-founder
            </div>
            <div className='font-serif text-[28px] text-paper mb-5'>
              Khiem Nguyen
            </div>
            <div className='flex flex-col gap-2 pt-4 border-t border-rule-strong'>
              <a
                href='mailto:khiem@sukaseven.com'
                className='font-mono text-[13px] text-paper hover:text-accent transition-colors break-all'
              >
                khiem@sukaseven.com
              </a>
              <a
                href='https://github.com/suka712'
                target='_blank'
                rel='noopener noreferrer'
                className='font-mono text-[13px] text-paper hover:text-accent transition-colors inline-flex items-center gap-1.5 break-all'
              >
                suka712
                <span className='text-ink-mute text-[12px] shrink-0'>↗</span>
              </a>
            </div>
          </div>
        </div>

        <div className='border-t border-rule'>
          <div className='grid grid-cols-1 sm:grid-cols-[140px_1fr] items-baseline gap-1 sm:gap-6 py-6 border-b border-rule'>
            <span className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute'>
              LinkedIn
            </span>
            <a
              href='https://www.linkedin.com/company/commma-dev/'
              target='_blank'
              rel='noopener noreferrer'
              className='font-mono text-[14px] text-ink-soft hover:text-ink transition-colors inline-flex items-center gap-1.5 break-all'
            >
              commma-dev
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
