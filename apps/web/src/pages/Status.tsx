import { Shell, LiveDot } from '../components/chrome'
import { useSeo } from '../lib/seo'

const COMPONENTS = [
  { name: 'VSCode Extension', note: 'Operational' },
  { name: 'API — Auth', note: 'Operational' },
  { name: 'API — Ingest & Aggregation', note: 'Operational' },
  { name: 'API — Sessions & Feed', note: 'Operational' },
  { name: 'API — Leaderboard', note: 'Operational' },
  { name: 'API — Teams & Billing', note: 'Operational' },
  { name: 'API — Recap & Push', note: 'Operational' },
  { name: 'Web App', note: 'Operational' },
  { name: 'Database (Neon PostgreSQL)', note: 'Operational' },
  { name: 'Cache (Upstash Redis)', note: 'Operational' },
  { name: 'Public Launch', note: 'Pending' },
]

export default function Status() {
  useSeo({
    title: 'Status · commma',
    description: 'Live status for the commma API, web app, and ingest pipeline.',
  })

  return (
    <Shell>
      <div className='max-w-[680px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          System Status
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-4 text-ink lift-text'>
          All systems <em className='italic text-accent'>operational.</em>
        </h1>
        <p className='font-sans text-[16px] leading-relaxed text-ink-soft m-0 mb-12 max-w-[48ch]'>
          commma is live on AWS — EC2 t4g (API), S3 + CloudFront (web), Neon
          Postgres, Upstash Redis — free and open in early access. Public launch
          is pending.
        </p>

        <div className='border border-rule-strong rounded-lg overflow-hidden surface mb-8'>
          <div className='flex items-center gap-3 px-5 sm:px-7 py-4 bg-paper-2 border-b border-rule'>
            <LiveDot color='live' />
            <span className='font-mono text-[13px] text-ink-soft tracking-wide'>
              Live · free early access
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
