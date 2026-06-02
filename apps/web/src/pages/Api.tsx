import { useEffect } from 'react'
import { Shell, LiveDot } from '../components/chrome'

const ENDPOINTS = [
  {
    group: 'Auth',
    routes: [
      {
        method: 'GET',
        path: '/v1/auth/github',
        desc: 'Redirect to GitHub OAuth. Pass redirect_uri for extension/CLI flow.',
      },
      {
        method: 'POST',
        path: '/v1/auth/cli/exchange',
        desc: 'Exchange one-time code (60s TTL) for access + refresh tokens.',
      },
      {
        method: 'POST',
        path: '/v1/auth/refresh',
        desc: 'Rotate refresh token, issue new access token.',
      },
      {
        method: 'POST',
        path: '/v1/auth/signout',
        desc: 'Revoke refresh token and end session.',
      },
    ],
  },
  {
    group: 'User',
    routes: [
      {
        method: 'GET',
        path: '/v1/me',
        desc: 'Authenticated user profile, streak, and privacy setting.',
      },
      {
        method: 'GET',
        path: '/v1/users/:handle',
        desc: 'Public profile with stats and badges. 404 for privacy=off.',
      },
      {
        method: 'GET',
        path: '/v1/users/:handle/sessions',
        desc: 'Paginated public session list. Respects privacy mode.',
      },
      {
        method: 'POST',
        path: '/v1/users/:handle/follow',
        desc: 'Follow a user.',
      },
      {
        method: 'DELETE',
        path: '/v1/users/:handle/follow',
        desc: 'Unfollow a user.',
      },
    ],
  },
  {
    group: 'Activity',
    routes: [
      {
        method: 'POST',
        path: '/v1/ingest',
        desc: 'Ingest a batch of heartbeat events (1–500). Idempotent on event id.',
      },
      {
        method: 'GET',
        path: '/v1/sessions',
        desc: 'Keyset-paginated session list for the authenticated user.',
      },
      {
        method: 'GET',
        path: '/v1/sessions/:id',
        desc: 'Single session detail. Gated by privacy mode and ownership.',
      },
      {
        method: 'GET',
        path: '/v1/feed',
        desc: 'Paginated activity feed from followed users.',
      },
      {
        method: 'GET',
        path: '/v1/leaderboard',
        desc: 'Top coders by coding time. Periods: week · month · alltime.',
      },
    ],
  },
]

const RATE_LIMITS = [
  { scope: 'POST /v1/ingest', limit: '1,000 / hr / user' },
  { scope: 'GET reads (/me, /sessions)', limit: '300 / hr / user' },
  { scope: 'Auth endpoints', limit: '20 / hr / IP' },
]

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-live',
  POST: 'text-accent',
  DELETE: 'text-ink-mute',
}

export default function Api() {
  useEffect(() => {
    document.title = 'API · commma'
  }, [])

  return (
    <Shell>
      <div className='max-w-[860px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          API Reference
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-4 text-ink'>
          Build on <em className='italic text-accent'>commma.</em>
        </h1>

        <div className='flex items-center gap-2.5 mb-12'>
          <LiveDot color='accent' />
          <span className='font-mono text-[13px] text-ink-mute leading-relaxed'>
            Early access · v1 · all endpoints pending operations
          </span>
        </div>

        <div className='space-y-2 mb-12'>
          <div className='border border-rule-strong rounded bg-paper-2/40 px-5 sm:px-7 py-5'>
            <p className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-3'>
              Authentication
            </p>
            <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0 mb-3'>
              All protected endpoints require a JWT bearer token issued by the
              OAuth flow. Tokens expire in 15 minutes — use{' '}
              <span className='font-mono text-[14px] text-accent'>
                POST /v1/auth/refresh
              </span>{' '}
              to rotate.
            </p>
            <pre className='font-mono text-[13px] text-ink bg-paper-3 border border-rule px-4 py-3 rounded m-0 overflow-x-auto'>
              {'Authorization: Bearer <access_token>'}
            </pre>
          </div>
        </div>

        <div className='space-y-10'>
          {ENDPOINTS.map((group) => (
            <div key={group.group}>
              <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-3'>
                {group.group}
              </p>
              <div className='border border-rule-strong rounded overflow-hidden'>
                {group.routes.map((r, i) => (
                  <div
                    key={r.path}
                    className={`px-5 sm:px-6 py-4 ${i < group.routes.length - 1 ? 'border-b border-rule' : ''} hover:bg-paper-2/30 transition-colors`}
                  >
                    <div className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-1.5'>
                      <span
                        className={`font-mono text-[13px] font-medium shrink-0 ${METHOD_COLOR[r.method] ?? 'text-ink-mute'}`}
                      >
                        {r.method}
                      </span>
                      <span className='font-mono text-[13px] text-ink break-all'>
                        {r.path}
                      </span>
                      <span className='ml-auto pl-2 font-mono text-[11px] tracking-wider uppercase shrink-0 text-ink-mute'>
                        pending
                      </span>
                    </div>
                    <p className='font-sans text-[14px] text-ink-soft m-0'>
                      {r.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className='mt-12'>
          <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-3'>
            Rate limits
          </p>
          <div className='border border-rule-strong rounded overflow-hidden'>
            {RATE_LIMITS.map((r, i) => (
              <div
                key={r.scope}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_auto] items-baseline gap-2 px-5 sm:px-6 py-4 ${i < RATE_LIMITS.length - 1 ? 'border-b border-rule' : ''}`}
              >
                <span className='font-mono text-[13px] text-ink-soft'>
                  {r.scope}
                </span>
                <span className='font-mono text-[13px] text-ink tnum'>
                  {r.limit}
                </span>
              </div>
            ))}
          </div>
          <p className='font-mono text-[13px] text-ink-mute mt-4 m-0'>
            Rate-limit responses return <span className='text-ink'>429</span>{' '}
            with{' '}
            <span className='font-mono text-accent'>X-RateLimit-Limit</span>,{' '}
            <span className='font-mono text-accent'>X-RateLimit-Remaining</span>
            , and{' '}
            <span className='font-mono text-accent'>X-RateLimit-Reset</span>{' '}
            headers.
          </p>
        </div>

        <div className='mt-12 border-t border-rule pt-8'>
          <p className='font-sans text-[15px] text-ink-mute leading-relaxed m-0'>
            Questions or issues?{' '}
            <a
              href='https://github.com/NauriFive/commma-coding-progress-tracker'
              target='_blank'
              rel='noopener noreferrer'
              className='text-accent hover:text-ink-soft transition-colors'
            >
              Open a GitHub issue ↗
            </a>{' '}
            or email{' '}
            <a
              href='mailto:anhdtran.forwork@gmail.com?subject=commma API'
              className='text-accent hover:text-ink-soft transition-colors'
            >
              anhdtran.forwork@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </Shell>
  )
}
