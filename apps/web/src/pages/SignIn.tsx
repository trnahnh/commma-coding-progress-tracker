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
    <div className='min-h-screen bg-paper flex flex-col items-center justify-center px-6 animate-page-in'>
      <a href='/' className='mb-16'>
        <Wordmark size='text-[36px]' />
      </a>

      <div className='w-full max-w-[480px] text-center'>
        <h1 className='font-serif text-[clamp(48px,8vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 text-ink mb-5'>
          Welcome back.
        </h1>
        <p className='font-mono text-[14px] text-ink-mute m-0 mb-12 leading-relaxed'>
          Sign in to track sessions, streaks,
          <br className='hidden sm:block' /> and your place on the board.
        </p>

        <button
          type='button'
          onClick={signIn}
          className='group w-full inline-flex items-center justify-center gap-3 h-[56px] px-8 rounded-full font-mono text-[14px] uppercase tracking-wider font-medium bg-ink text-paper border border-ink hover:bg-paper hover:text-ink transition-colors mb-5'
        >
          <GithubMark />
          Sign in with GitHub
        </button>

        <p className='font-mono text-[13px] text-ink-faint m-0'>
          No account needed — GitHub sign-in creates one automatically.
        </p>

        <div className='mt-14 pt-8 border-t border-rule'>
          <p className='font-mono text-[13px] text-ink-faint m-0 leading-relaxed'>
            <span className='text-ink-mute'>Privacy first.</span> Only key
            counts and file paths leave your machine. Never code or content.
          </p>
        </div>
      </div>
    </div>
  )
}
