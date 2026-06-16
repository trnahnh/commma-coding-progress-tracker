import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/chrome'
import { useAuth } from '../lib/auth'

export default function BillingSuccess() {
  const { user, refreshUser } = useAuth()

  useEffect(() => {
    document.title = 'Subscription confirmed · commma'
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  return (
    <Shell>
      <div className='max-w-[560px] mx-auto text-center py-[clamp(40px,8vw,96px)]'>
        <div className='font-mono text-[13px] tracking-[0.18em] uppercase text-live mb-5'>
          § payment confirmed
        </div>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,64px)] leading-[0.95] tracking-[-0.03em] m-0 mb-6 text-ink lift-text'>
          You&rsquo;re <em className='italic text-accent'>in.</em>
        </h1>
        <p className='font-mono text-[14px] text-ink-mute m-0 mb-10 leading-relaxed max-w-[44ch] mx-auto'>
          Your subscription is active. It can take a few seconds for your plan
          to update everywhere — refresh your profile if it hasn&rsquo;t caught
          up yet.
        </p>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <Link
            to={user ? `/@${user.handle}` : '/'}
            className='group inline-flex items-center justify-center gap-2.5 h-[44px] px-6 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors glow-accent press bg-accent text-paper border border-accent hover:bg-ink hover:border-ink'
          >
            Go to profile
            <span className='inline-block transition-transform group-hover:translate-x-1'>
              →
            </span>
          </Link>
          <Link
            to='/profile'
            className='inline-flex items-center justify-center h-[44px] px-6 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium transition-colors text-ink-soft border border-rule-strong hover:text-ink hover:border-ink-faint press'
          >
            Manage billing
          </Link>
        </div>
      </div>
    </Shell>
  )
}
