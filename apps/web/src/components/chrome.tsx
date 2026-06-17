import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { BackToTop } from './BackToTop'

const NAV_LINKS = [
  { label: 'Activity', to: '/' },
  { label: 'Feed', to: '/feed' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Pricing', to: '/pricing' },
]

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
  if (isLoading) return <div className='w-[38px]' />
  if (token && user) {
    return (
      <div className='flex items-center gap-3'>
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
            className='w-8 h-8 rounded-full border border-rule ring-depth group-hover:border-accent transition-colors object-cover'
          />
        </Link>
        <Link
          to='/profile'
          className='hidden sm:inline-flex items-center h-[34px] sm:h-[38px] px-3 sm:px-4 rounded-full font-mono text-[12px] sm:text-[13px] uppercase tracking-wider
            text-ink-soft hover:text-ink border border-transparent hover:border-rule-strong transition-colors press'
        >
          Edit profile
        </Link>
        <button
          type='button'
          onClick={() => void signOut()}
          className='inline-flex items-center h-[34px] sm:h-[38px] px-3 sm:px-4 rounded-full font-mono text-[12px] sm:text-[13px] uppercase tracking-wider
            text-ink-soft hover:text-ink border border-transparent hover:border-rule-strong transition-colors press'
        >
          Sign out
        </button>
      </div>
    )
  }
  return (
    <div className='flex items-center gap-3'>
      <Link
        to='/signin'
        className='inline-flex items-center h-[34px] sm:h-[38px] px-3 sm:px-4 rounded-full font-mono text-[12px] sm:text-[13px] uppercase tracking-wider
          text-ink-soft hover:text-ink border border-transparent hover:border-rule-strong transition-colors press'
      >
        Sign in
      </Link>
      <a
        href='https://marketplace.visualstudio.com'
        className='group inline-flex items-center gap-2.5 h-[38px] px-3.5 sm:px-4 rounded-full font-mono text-[12px] sm:text-[13px] uppercase tracking-wider font-medium
          bg-accent text-paper border border-accent bevel press hover:bg-ink hover:border-ink transition-colors whitespace-nowrap'
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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)
  const [lastPathname, setLastPathname] = useState(pathname)

  if (lastPathname !== pathname) {
    setLastPathname(pathname)
    setMobileOpen(false)
    setVisible(true)
  }

  useEffect(() => {
    lastY.current = 0
  }, [pathname])

  useEffect(() => {
    const NAV_H = 64
    const onScroll = () => {
      const y = window.scrollY
      setVisible(y < NAV_H || y < lastY.current)
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const homeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b border-rule backdrop-blur-xl backdrop-saturate-150 bg-paper/70 elev-bar transition-transform duration-300 ${visible || mobileOpen ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
          <div className='grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center h-16'>
            <Link to='/' className='justify-self-start' onClick={homeClick}>
              <Wordmark />
            </Link>

            <div className='hidden md:flex gap-7 font-mono text-[13px] tracking-wider text-ink-soft'>
              {[
                ...NAV_LINKS,
                ...(token ? [{ label: 'Teams', to: '/teams' }] : []),
                ...(user?.plan === 'pro' || user?.plan === 'team'
                  ? [{ label: 'Recap', to: '/recap' }]
                  : []),
              ].map(({ label, to }) => {
                const active =
                  to === '/' ? pathname === '/' : pathname.startsWith(to)
                return (
                  <Link
                    key={label}
                    to={to}
                    onClick={to === '/' ? homeClick : undefined}
                    className={`relative py-1 transition-colors hover:text-ink
                    after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-accent
                    after:origin-left after:transition-transform
                    ${active ? 'text-ink after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'}`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>

            <div className='justify-self-end flex items-center gap-2'>
              <NavActions />
              <button
                type='button'
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMobileOpen((o) => !o)}
                className='md:hidden flex items-center justify-center w-11 h-11 text-ink-mute hover:text-ink transition-colors'
              >
                {mobileOpen ? (
                  <svg
                    viewBox='0 0 16 16'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    className='w-5 h-5'
                  >
                    <path d='M3 3l10 10M13 3L3 13' />
                  </svg>
                ) : (
                  <svg
                    viewBox='0 0 16 16'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    className='w-5 h-5'
                  >
                    <path d='M2 4h12M2 8h12M2 12h12' />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className='md:hidden border-t border-rule bg-paper/95 backdrop-blur-xl'>
            <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)] flex flex-col py-2'>
              {[
                ...NAV_LINKS,
                ...(token ? [{ label: 'Teams', to: '/teams' }] : []),
                ...(user?.plan === 'pro' || user?.plan === 'team'
                  ? [{ label: 'Recap', to: '/recap' }]
                  : []),
              ].map(({ label, to }) => {
                const active =
                  to === '/' ? pathname === '/' : pathname.startsWith(to)
                return (
                  <Link
                    key={label}
                    to={to}
                    onClick={(e) => {
                      if (to === '/') homeClick(e)
                      setMobileOpen(false)
                    }}
                    className={`font-mono text-[15px] tracking-wide py-4 border-b border-rule last:border-b-0 transition-colors ${active ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
                  >
                    {label}
                  </Link>
                )
              })}
              {token && (
                <Link
                  to='/profile'
                  onClick={() => setMobileOpen(false)}
                  className={`font-mono text-[15px] tracking-wide py-4 border-t border-rule transition-colors ${pathname === '/profile' ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
                >
                  Edit profile
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
      <div className='h-16' aria-hidden='true' />
    </>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className='min-h-screen flex flex-col'>
      <Nav />
      <main className='flex-1 mx-auto w-full max-w-[1320px] px-[clamp(20px,4vw,56px)] py-[clamp(40px,7vw,96px)] animate-page-in'>
        {children}
      </main>
      <Footer />
      <BackToTop />
    </div>
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
    <div className='border border-rule-strong rounded bg-paper-2/60 surface px-6 sm:px-10 py-16 sm:py-24 text-center'>
      <h1 className='font-serif text-[clamp(30px,5vw,56px)] leading-none tracking-[-0.02em] m-0 mb-5 text-ink'>
        {title}
      </h1>
      <p className='font-mono text-[14px] tracking-wide text-ink-mute m-0'>
        {body}
      </p>
    </div>
  )
}

export function Footer() {
  const platform = [
    { label: 'Activity', to: '/' },
    { label: 'Feed', to: '/feed' },
    { label: 'Leaderboard', to: '/leaderboard' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Changelog', to: '/changelog' },
    { label: 'API', to: '/api' },
  ]
  const company = [
    { label: 'About', to: '/about' },
    { label: 'Careers', to: '/careers' },
    { label: 'Contact', to: '/contact' },
  ]
  const legal = [
    { label: 'Privacy', to: '/privacy' },
    { label: 'Terms', to: '/terms' },
    { label: 'Status', to: '/status' },
    { label: '404', to: '/404' },
  ]

  return (
    <footer className='border-t border-rule pt-14 pb-8'>
      <div className='mx-auto max-w-[1320px] px-[clamp(20px,4vw,56px)]'>
        <div className='font-serif text-[clamp(52px,16vw,440px)] leading-[0.78] tracking-[-0.06em] text-ink lift-text m-0 mb-12 text-center'>
          commma<span className='text-accent'>.</span>
        </div>

        <div className='pb-10 border-b border-rule'>
          <div className='flex flex-wrap justify-center gap-[clamp(40px,6vw,140px)]'>
            <div>
              <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-4 m-0'>
                Product
              </p>
              <ul className='m-0 p-0 list-none flex flex-col gap-3'>
                {platform.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors'
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-4 m-0'>
                Company
              </p>
              <ul className='m-0 p-0 list-none flex flex-col gap-3'>
                {company.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors'
                    >
                      {label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    href='https://github.com/trnahnh/commma-coding-progress-tracker'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors inline-flex items-center gap-1'
                  >
                    GitHub
                    <span className='text-[11px] text-ink-mute'>↗</span>
                  </a>
                </li>
                <li>
                  <a
                    href='https://www.linkedin.com/company/commma-dev/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors inline-flex items-center gap-1'
                  >
                    LinkedIn
                    <span className='text-[11px] text-ink-mute'>↗</span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-4 m-0'>
                Legal
              </p>
              <ul className='m-0 p-0 list-none flex flex-col gap-3'>
                {legal.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className='font-mono text-[13px] text-ink-soft hover:text-ink transition-colors'
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className='pt-6 font-mono text-[12px] tracking-wider uppercase text-ink-mute text-center'>
          © 2026 commma · All rights reserved
        </div>
      </div>
    </footer>
  )
}
