import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function Wordmark({ size = 'text-[28px]' }: { size?: string }) {
  return (
    <span className={`font-serif ${size} leading-none tracking-[-0.02em]`}>
      commma<span className='text-accent'>.</span>
    </span>
  )
}

export function LiveDot({ color = 'live' }: { color?: 'live' | 'accent' }) {
  const cls = color === 'live' ? 'bg-live' : 'bg-accent'
  return (
    <span className={`w-[7px] h-[7px] rounded-full ${cls} animate-pulse-dot`} />
  )
}

function NavActions() {
  const { user, token, isLoading, signOut } = useAuth()
  if (isLoading) return <div className='justify-self-end w-[38px]' />
  if (token && user) {
    return (
      <div className='justify-self-end flex items-center gap-3'>
        <Link
          to={`/@${user.handle}`}
          className='flex items-center gap-2 group'
          title={`@${user.handle}`}
        >
          <img
            src={user.avatar_url}
            alt={user.handle}
            width={32}
            height={32}
            className='w-8 h-8 rounded-full border border-rule group-hover:border-accent transition-colors object-cover'
          />
        </Link>
        <button
          type='button'
          onClick={() => void signOut()}
          className='hidden sm:inline-flex items-center h-[38px] px-4 rounded-full font-mono text-[12px] uppercase tracking-wider
            text-ink-soft hover:text-ink border border-transparent hover:border-rule-strong transition-colors'
        >
          Sign out
        </button>
      </div>
    )
  }
  return (
    <div className='justify-self-end flex items-center gap-3'>
      <Link
        to='/signin'
        className='hidden sm:inline-flex items-center h-[38px] px-4 rounded-full font-mono text-[12px] uppercase tracking-wider
          text-ink-soft hover:text-ink border border-transparent hover:border-rule-strong transition-colors'
      >
        Sign in
      </Link>
      <a
        href='https://marketplace.visualstudio.com'
        className='group inline-flex items-center gap-2.5 h-[38px] px-3.5 sm:px-4 rounded-full font-mono text-[11px] sm:text-[12px] uppercase tracking-wider font-medium
          bg-accent text-paper border border-accent hover:bg-ink hover:border-ink transition-colors whitespace-nowrap'
      >
        <span className='hidden sm:inline'>Install for VSCode</span>
        <span className='sm:hidden'>Install</span>
        <span className='inline-block transition-transform group-hover:translate-x-1'>
          →
        </span>
      </a>
    </div>
  )
}

export function Nav() {
  return (
    <nav className='sticky top-0 z-50 border-b border-rule backdrop-blur-xl backdrop-saturate-150 bg-paper/70'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <div className='grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center h-16'>
          <Link to='/' className='justify-self-start'>
            <Wordmark />
          </Link>
          <div className='hidden md:flex gap-7 font-mono text-[12px] tracking-wider text-ink-soft'>
            {[
              { label: 'Activity', to: '/' },
              { label: 'Feed', to: '/feed' },
              { label: 'Leaderboard', to: '/leaderboard' },
            ].map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className='relative py-1 transition-colors hover:text-ink
                    after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-accent
                    after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100'
              >
                {label}
              </Link>
            ))}
          </div>
          <NavActions />
        </div>
      </div>
    </nav>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] py-[clamp(40px,7vw,96px)]'>
        {children}
      </main>
      <Footer />
    </>
  )
}

export function StatusPanel({
  title,
  body,
}: {
  title: string
  body: ReactNode
}) {
  return (
    <div className='border border-rule-strong rounded bg-paper-2/60 px-6 sm:px-10 py-16 sm:py-24 text-center'>
      <h1 className='font-serif text-[clamp(30px,5vw,56px)] leading-none tracking-[-0.02em] m-0 mb-5 text-ink'>
        {title}
      </h1>
      <p className='font-mono text-[12.5px] tracking-wide text-ink-mute m-0'>
        {body}
      </p>
    </div>
  )
}

export function Footer() {
  return (
    <footer className='border-t border-rule pt-14 pb-8'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <div className='font-serif text-[clamp(120px,28vw,440px)] leading-[0.78] tracking-[-0.06em] text-ink m-0 mb-10'>
          commma<span className='text-accent'>.</span>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[11px] uppercase tracking-wider text-ink-mute pt-6 border-t border-rule'>
          <div className='space-x-5'>
            <Link to='/' className='hover:text-ink'>
              Activity
            </Link>
            <Link to='/feed' className='hover:text-ink'>
              Feed
            </Link>
            <Link to='/leaderboard' className='hover:text-ink'>
              Leaderboard
            </Link>
          </div>
          <div className='md:text-center'>
            © 2026 commma labs · built in vscode (obviously)
          </div>
          <div className='md:text-right space-x-5'>
            <a href='#' className='hover:text-ink'>
              GitHub
            </a>
            <a href='#' className='hover:text-ink'>
              Privacy
            </a>
            <a href='#' className='hover:text-ink'>
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
