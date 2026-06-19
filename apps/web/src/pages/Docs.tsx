import { Link } from 'react-router-dom'
import { Shell } from '../components/chrome'
import { useSeo } from '../lib/seo'
import { DOCS } from '../content/docs/registry'
import { appTo, docTo, isExternalHref } from '../lib/docsRouting'

const CARDS = [
  ...DOCS.map((doc) => ({
    title: doc.title,
    href: docTo(doc.slug),
    eyebrow: doc.eyebrow,
    summary: doc.summary,
  })),
  {
    title: 'API reference',
    href: appTo('/api'),
    eyebrow: 'Reference',
    summary:
      'Every endpoint with request and response shapes, the error format, and per-route rate limits.',
  },
  {
    title: 'Changelog',
    href: appTo('/changelog'),
    eyebrow: 'Reference',
    summary: 'Every shipped change to commma, newest first.',
  },
]

const cardClass =
  'group flex flex-col border border-rule-strong rounded-lg bg-paper-2/40 surface px-6 py-6 sm:px-7 sm:py-7 hover:border-ink-faint transition-colors'

export default function Docs() {
  useSeo({
    title: 'Docs · commma',
    description:
      'Documentation for commma — how it works, getting started, the architecture, system design, and self-hosting.',
  })

  return (
    <Shell>
      <div className='max-w-[860px]'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          Documentation
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-5 text-ink lift-text'>
          How commma <em className='italic text-accent'>works.</em>
        </h1>
        <p className='font-sans text-[clamp(16px,1.3vw,18px)] leading-relaxed text-ink-soft max-w-[56ch] m-0'>
          Everything about commma in one place — what it is, how to start
          logging, the decisions behind the stack, and how to run your own
          instance.
        </p>
      </div>

      <div className='mt-[clamp(40px,6vw,72px)] grid gap-4 sm:grid-cols-2'>
        {CARDS.map((card) => {
          const inner = (
            <>
              <span className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-3'>
                {card.eyebrow}
              </span>
              <h2 className='font-serif font-normal text-[clamp(22px,2.4vw,28px)] leading-tight tracking-[-0.01em] m-0 mb-2.5 text-ink group-hover:text-accent transition-colors'>
                {card.title}
              </h2>
              <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0 flex-1'>
                {card.summary}
              </p>
              <span className='mt-5 inline-flex items-center gap-2 font-mono text-[13px] tracking-wide uppercase text-ink-mute group-hover:text-accent transition-colors'>
                Read
                <span className='inline-block transition-transform group-hover:translate-x-1'>
                  →
                </span>
              </span>
            </>
          )
          return isExternalHref(card.href) ? (
            <a key={card.href} href={card.href} className={cardClass}>
              {inner}
            </a>
          ) : (
            <Link key={card.href} to={card.href} className={cardClass}>
              {inner}
            </Link>
          )
        })}
      </div>
    </Shell>
  )
}
