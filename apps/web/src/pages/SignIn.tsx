import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '../components/chrome'
import { useAuth } from '../lib/auth'

function GithubMark() {
  return (
    <svg
      viewBox='0 0 20 20'
      fill='currentColor'
      aria-hidden='true'
      className='w-5 h-5'
    >
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M10 0C4.477 0 0 4.477 0 10c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482
           0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462
           -.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088
           2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943
           0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269
           2.75 1.025A9.578 9.578 0 0110 4.836a9.59 9.59 0 012.504.337c1.909-1.294
           2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592
           1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852
           0 1.336-.012 2.415-.012 2.744 0 .267.18.579.688.481C17.137 18.163 20
           14.418 20 10 20 4.477 15.523 0 10 0z'
      />
    </svg>
  )
}

export default function SignIn() {
  const { token, isLoading, signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Sign in · commma'
  }, [])

  useEffect(() => {
    if (!isLoading && token) navigate('/', { replace: true })
  }, [isLoading, token, navigate])

  return (
    <div className='min-h-screen bg-paper grid md:grid-cols-[1fr_1fr]'>
      <div className='hidden md:flex flex-col justify-between p-[clamp(32px,4vw,56px)] border-r border-rule bg-linear-to-b from-paper-2 to-paper'>
        <a href='/'>
          <Wordmark size='text-[28px]' />
        </a>
        <div>
          <p className='font-serif text-[clamp(36px,4.5vw,64px)] leading-[1.0] tracking-[-0.03em] text-ink m-0'>
            Every session
            <br />
            <em className='italic text-accent'>logged.</em>
          </p>
          <p className='font-mono text-[13px] text-ink-mute mt-6 m-0 max-w-[36ch] leading-relaxed'>
            commma turns your editor into a sport. Pace, splits, streaks,
            podiums — all the rituals of a real athlete, for the work you
            already do.
          </p>
        </div>
        <p className='font-mono text-[11px] text-ink-faint m-0'>
          © 2026 commma labs
        </p>
      </div>

      <div className='flex flex-col items-center justify-center px-6 py-16 md:py-0'>
        <a href='/' className='md:hidden mb-12'>
          <Wordmark size='text-[28px]' />
        </a>

        <div className='w-full max-w-[400px]'>
          <h1 className='font-serif text-[clamp(36px,5vw,52px)] leading-[1.0] tracking-[-0.025em] m-0 text-ink mb-3'>
            Welcome back.
          </h1>
          <p className='font-mono text-[13px] text-ink-mute m-0 mb-10'>
            Sign in to see your sessions, streaks, and standing.
          </p>

          <button
            type='button'
            onClick={signIn}
            className='group w-full inline-flex items-center justify-center gap-3 h-[52px] px-6 rounded-full font-mono text-[13px] uppercase tracking-wider font-medium bg-ink text-paper border border-ink hover:bg-paper hover:text-ink transition-colors mb-4'
          >
            <GithubMark />
            Sign in with GitHub
          </button>

          <p className='font-mono text-[11.5px] text-ink-faint text-center m-0 leading-relaxed'>
            No account needed — GitHub sign-in creates one.
          </p>

          <div className='mt-12 pt-8 border-t border-rule'>
            <p className='font-mono text-[11px] text-ink-faint m-0 leading-relaxed'>
              <span className='text-ink-mute'>Privacy first.</span> Only key
              counts and file paths are tracked. No code, no content, no
              keystrokes ever leave your machine.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
