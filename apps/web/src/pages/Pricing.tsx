import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shell } from '../components/chrome'
import {
  ApiError,
  createCheckout,
  openBillingPortal,
  type BillingInterval,
  type PaidPlan,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { setPostAuthRedirect } from '../lib/redirect'
import { useSeo } from '../lib/seo'

function isPaidPlan(value: string | null): value is PaidPlan {
  return value === 'pro' || value === 'team'
}

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

function CurrentPlanBadge() {
  return (
    <span className='shrink-0 font-mono text-[14px] tracking-[0.16em] uppercase text-accent-2 border border-accent-2-line bg-accent-2-soft px-2.5 py-1 rounded-full mt-0.5'>
      ✓ Your plan
    </span>
  )
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <div className='flex-1 mb-8'>
      {features.map((f) => (
        <div
          key={f}
          className='flex items-start gap-3 py-2.5 border-b border-dashed border-rule last:border-b-0'
        >
          <span className='font-mono text-[14px] text-ink-mute mt-0.5 shrink-0'>
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
  const [pending, setPending] = useState<PaidPlan | null>(null)
  const [portalPending, setPortalPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token, isLoading, user } = useAuth()
  const currentPlan = token && user ? (user.plan ?? 'free') : null
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const resumed = useRef(false)

  useSeo({
    title: 'Pricing · commma',
    description: 'commma pricing — free early access, plus Pro and Team plans.',
  })

  const startCheckout = useCallback(
    async (plan: PaidPlan, interval: BillingInterval) => {
      if (pending) return
      if (!token) {
        setPostAuthRedirect(`/pricing?plan=${plan}&interval=${interval}`)
        navigate('/signin')
        return
      }
      setPending(plan)
      setError(null)
      try {
        const { url } = await createCheckout(token, plan, interval)
        window.location.href = url
      } catch (err) {
        if (err instanceof ApiError && err.code === 'CONFLICT') {
          try {
            const { url } = await openBillingPortal(token)
            window.location.href = url
            return
          } catch {
            void 0
          }
        }
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not start checkout. Try again.',
        )
        setPending(null)
      }
    },
    [pending, token, navigate],
  )

  const openPortal = useCallback(async () => {
    if (!token || portalPending) return
    setPortalPending(true)
    setError(null)
    try {
      const { url } = await openBillingPortal(token)
      window.location.href = url
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not open billing. Try again.',
      )
      setPortalPending(false)
    }
  }, [token, portalPending])

  useEffect(() => {
    if (resumed.current || isLoading || !token) return
    const plan = params.get('plan')
    if (!isPaidPlan(plan)) return
    resumed.current = true
    const interval: BillingInterval =
      params.get('interval') === 'yearly' ? 'yearly' : 'monthly'
    setParams({}, { replace: true })
    void Promise.resolve().then(() => startCheckout(plan, interval))
  }, [isLoading, token, params, setParams, startCheckout])

  return (
    <Shell>
      <div>
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
            className={`h-[44px] px-5 rounded-full border transition-colors press ${
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
            className={`h-[44px] px-5 rounded-full border transition-colors press ${
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

        <div className='grid grid-cols-1 md:grid-cols-3 border border-rule-strong rounded-lg overflow-hidden surface'>
          <div
            className={`relative flex flex-col px-6 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 border-b md:border-b-0 md:border-r border-rule bg-paper ${
              currentPlan === 'free'
                ? 'ring-1 ring-inset ring-accent-2-line'
                : ''
            }`}
          >
            <div className='flex flex-col md:min-h-[220px]'>
              <div className='flex items-start justify-between gap-3 mb-6'>
                <span className='font-serif text-[clamp(26px,2.8vw,36px)] leading-none tracking-[-0.02em] text-ink'>
                  Free
                </span>
                {currentPlan === 'free' && <CurrentPlanBadge />}
              </div>
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
                <p className='font-mono text-[14px] mt-1 m-0 invisible'>
                  &nbsp;
                </p>
              </div>
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

          <div
            className={`relative flex flex-col px-6 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 border-b md:border-b-0 md:border-r border-rule bg-paper-2 ${
              currentPlan === 'pro'
                ? 'ring-1 ring-inset ring-accent-2-line'
                : ''
            }`}
          >
            <span className='absolute inset-x-0 top-0 h-0.5 bg-accent glow-accent' />
            <div className='flex flex-col md:min-h-[220px]'>
              <div className='flex items-start justify-between gap-3 mb-6'>
                <span className='font-serif text-[clamp(26px,2.8vw,36px)] leading-none tracking-[-0.02em] text-accent'>
                  Pro
                </span>
                {currentPlan === 'pro' ? (
                  <CurrentPlanBadge />
                ) : (
                  <span className='shrink-0 font-mono text-[14px] tracking-[0.16em] uppercase text-accent-2 border border-accent-2-line bg-accent-2-soft px-2.5 py-1 rounded-full mt-0.5'>
                    Most popular
                  </span>
                )}
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
            </div>
            <FeatureList features={FEATURES_PRO} />
            {currentPlan === 'pro' ? (
              <button
                type='button'
                onClick={() => void openPortal()}
                disabled={portalPending}
                className='inline-flex items-center justify-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {portalPending ? 'Redirecting…' : 'Manage billing'}
              </button>
            ) : (
              <button
                type='button'
                onClick={() =>
                  void startCheckout('pro', annual ? 'yearly' : 'monthly')
                }
                disabled={pending !== null}
                className='group inline-flex items-center justify-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors glow-accent press bg-accent text-paper border border-accent hover:bg-ink hover:border-ink disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {pending === 'pro' ? 'Redirecting…' : 'Upgrade to Pro'}
                {pending !== 'pro' && (
                  <span className='inline-block transition-transform group-hover:translate-x-1'>
                    →
                  </span>
                )}
              </button>
            )}
          </div>

          <div
            className={`relative flex flex-col px-6 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 bg-paper ${
              currentPlan === 'team'
                ? 'ring-1 ring-inset ring-accent-2-line'
                : ''
            }`}
          >
            <div className='flex flex-col md:min-h-[220px]'>
              <div className='flex items-start justify-between gap-3 mb-6'>
                <span className='font-serif text-[clamp(26px,2.8vw,36px)] leading-none tracking-[-0.02em] text-ink'>
                  Team
                </span>
                {currentPlan === 'team' && <CurrentPlanBadge />}
              </div>
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
            </div>
            <FeatureList features={FEATURES_TEAM} />
            {currentPlan === 'team' ? (
              <button
                type='button'
                onClick={() => void openPortal()}
                disabled={portalPending}
                className='inline-flex items-center justify-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {portalPending ? 'Redirecting…' : 'Manage billing'}
              </button>
            ) : (
              <button
                type='button'
                onClick={() =>
                  void startCheckout('team', annual ? 'yearly' : 'monthly')
                }
                disabled={pending !== null}
                className='group inline-flex items-center justify-center gap-2.5 h-[42px] px-5 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {pending === 'team' ? 'Redirecting…' : 'Upgrade to Team'}
                {pending !== 'team' && (
                  <span className='inline-block transition-transform group-hover:translate-x-1'>
                    →
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className='mt-5 font-mono text-[14px] text-accent text-center m-0'>
            {error}
          </p>
        )}

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
