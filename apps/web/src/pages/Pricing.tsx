import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/chrome'

const FEATURES_FREE = [
  'Last 7 days of sessions',
  'Public profile & leaderboard',
  'Feed & follows',
  'Streak tracking',
  'In-browser keyboard heatmap',
]

const FEATURES_PRO = [
  'Full session history',
  'Keyboard heatmap PNG export',
  'Private sessions',
  'Weekly recap email',
  'All Free features',
  'Priority support',
]

const FEATURES_TEAM = [
  'Private team leaderboard',
  'Team aggregate heatmap',
  'Everything in Pro per member',
  'Invite & manage members',
  'Admin controls',
]

function FeatureList({ features }: { features: string[] }) {
  return (
    <div className='flex-1 mb-8'>
      {features.map((f) => (
        <div
          key={f}
          className='flex items-start gap-3 py-2.5 border-b border-dashed border-rule last:border-b-0'
        >
          <span className='font-mono text-[14px] text-ink-faint mt-0.5 shrink-0'>
            —
          </span>
          <span className='font-mono text-[14px] text-ink-soft leading-snug'>
            {f}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false)

  useEffect(() => {
    document.title = 'Pricing · commma'
  }, [])

  return (
    <Shell>
      <div className='max-w-[1000px] mx-auto'>
        <div className='mb-[clamp(40px,6vw,80px)]'>
          <div className='font-mono text-[14px] tracking-[0.18em] uppercase text-ink-mute mb-5'>
            § pricing
          </div>
          <h1 className='font-serif font-normal text-[clamp(40px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-6 text-ink'>
            Simple <em className='italic text-accent'>pricing.</em>
          </h1>
          <p className='font-mono text-[14px] text-ink-mute m-0 max-w-[52ch] leading-relaxed'>
            Free users are on the same leaderboard as Pro users — the product
            sells itself. Upgrade when the 7-day window starts to sting.
          </p>
        </div>

        <div className='flex items-center gap-3 mb-10 font-mono text-[14px] tracking-wide'>
          <button
            type='button'
            onClick={() => setAnnual(false)}
            className={`h-[40px] px-5 rounded-full border transition-colors ${
              !annual
                ? 'bg-ink text-paper border-ink'
                : 'text-ink-mute border-rule-strong hover:text-ink hover:border-ink-faint'
            }`}
          >
            Monthly
          </button>
          <button
            type='button'
            onClick={() => setAnnual(true)}
            className={`h-[40px] px-5 rounded-full border transition-colors ${
              annual
                ? 'bg-ink text-paper border-ink'
                : 'text-ink-mute border-rule-strong hover:text-ink hover:border-ink-faint'
            }`}
          >
            Yearly
            <span className='ml-2 font-mono text-[14px] tracking-[0.12em] uppercase text-live'>
              −17%
            </span>
          </button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 border border-rule-strong rounded overflow-hidden'>
          <div className='relative flex flex-col px-6 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 border-b md:border-b-0 md:border-r border-rule bg-paper'>
            <span className='font-serif text-[clamp(26px,2.8vw,36px)] leading-none tracking-[-0.02em] text-ink mb-6'>
              Free
            </span>
            <div className='mb-7'>
              <div className='flex items-baseline gap-1.5'>
                <span className='font-serif text-[clamp(44px,5vw,64px)] leading-none tracking-[-0.04em] text-ink tnum'>
                  $0
                </span>
                <span className='font-mono text-[14px] text-ink-mute'>
                  forever
                </span>
              </div>
              <p className='font-mono text-[14px] text-ink-mute mt-2.5 m-0'>
                Everything you need to start.
              </p>
            </div>
            <FeatureList features={FEATURES_FREE} />
            <a
              href='https://marketplace.visualstudio.com'
              className='group inline-flex items-center justify-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint'
            >
              Install the extension
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </a>
          </div>

          <div className='relative flex flex-col px-6 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 border-b md:border-b-0 md:border-r border-rule bg-paper-2'>
            <span className='absolute inset-x-0 top-0 h-0.5 bg-accent' />
            <div className='flex items-start justify-between gap-3 mb-6'>
              <span className='font-serif text-[clamp(26px,2.8vw,36px)] leading-none tracking-[-0.02em] text-accent'>
                Pro
              </span>
              <span className='shrink-0 font-mono text-[14px] tracking-[0.16em] uppercase text-accent-2 border border-accent-2-line bg-accent-2-soft px-2.5 py-1 rounded-full mt-0.5'>
                Most popular
              </span>
            </div>
            <div className='mb-7'>
              <div className='flex items-baseline gap-1.5'>
                <span className='font-serif text-[clamp(44px,5vw,64px)] leading-none tracking-[-0.04em] text-ink tnum'>
                  {annual ? '$50' : '$5'}
                </span>
                <span className='font-mono text-[14px] text-ink-mute'>
                  {annual ? '/ year' : '/ month'}
                </span>
              </div>
              {annual && (
                <p className='font-mono text-[14px] text-live mt-1 m-0'>
                  $4.17 / month · save $10
                </p>
              )}
              <p className='font-mono text-[14px] text-ink-mute mt-2.5 m-0'>
                For athletes who want the full picture.
              </p>
            </div>
            <FeatureList features={FEATURES_PRO} />
            <Link
              to='/signin'
              className='group inline-flex items-center justify-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors bg-accent text-paper border border-accent hover:bg-ink hover:border-ink'
            >
              Get early access
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </Link>
          </div>

          <div className='relative flex flex-col px-6 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 bg-paper'>
            <span className='font-serif text-[clamp(26px,2.8vw,36px)] leading-none tracking-[-0.02em] text-ink mb-6'>
              Team
            </span>
            <div className='mb-7'>
              <div className='flex items-baseline gap-1.5'>
                <span className='font-serif text-[clamp(44px,5vw,64px)] leading-none tracking-[-0.04em] text-ink tnum'>
                  {annual ? '$200' : '$20'}
                </span>
                <span className='font-mono text-[14px] text-ink-mute'>
                  {annual ? '/ year' : '/ month'}
                </span>
              </div>
              {annual && (
                <p className='font-mono text-[14px] text-live mt-1 m-0'>
                  $16.67 / month · save $40
                </p>
              )}
              <p className='font-mono text-[14px] text-ink-mute mt-2.5 m-0'>
                Up to 5 members. Compete as a crew.
              </p>
            </div>
            <FeatureList features={FEATURES_TEAM} />
            <Link
              to='/contact'
              className='group inline-flex items-center justify-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint'
            >
              Join waitlist
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </Link>
          </div>
        </div>

        <div className='mt-10 pt-8 border-t border-rule font-mono text-[14px] text-ink-mute leading-relaxed'>
          <p className='m-0'>
            All plans include GitHub OAuth sign-in, the VSCode extension, and
            full access to the leaderboard and public feed. No credit card
            required for Free. Annual billing is charged up front. Cancel
            anytime.
          </p>
        </div>
      </div>
    </Shell>
  )
}
