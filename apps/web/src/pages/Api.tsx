import { Shell, LiveDot } from '../components/chrome'
import { useSeo } from '../lib/seo'

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
        desc: 'Rotate refresh token, issue new 15-minute access token.',
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
        desc: 'Authenticated user profile, plan, billing status, streak, and privacy setting.',
      },
      {
        method: 'PATCH',
        path: '/v1/me',
        desc: 'Update profile fields: display_name, bio, location, website, privacy, and more.',
      },
      {
        method: 'GET',
        path: '/v1/users/:handle',
        desc: 'Public profile with stats and badges. Returns 404 for privacy=off users.',
      },
      {
        method: 'GET',
        path: '/v1/users/:handle/sessions',
        desc: 'Keyset-paginated public session list. Respects privacy mode.',
      },
      {
        method: 'POST',
        path: '/v1/users/:handle/follow',
        desc: 'Follow a user. Idempotent 204.',
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
        desc: 'Ingest a batch of 1–500 heartbeat events. Idempotent on event id.',
      },
      {
        method: 'GET',
        path: '/v1/sessions',
        desc: 'Keyset-paginated session list for the authenticated user.',
      },
      {
        method: 'GET',
        path: '/v1/sessions/:id',
        desc: 'Single session with language breakdown, file list, and keyboard heatmap.',
      },
      {
        method: 'GET',
        path: '/v1/leaderboard',
        desc: 'Top coders by coding time. period: week (default) · month · alltime.',
      },
      {
        method: 'GET',
        path: '/v1/feed',
        desc: 'Paginated sessions from followed users. Auth required.',
      },
      {
        method: 'GET',
        path: '/v1/recap',
        desc: 'Current-week recap for the authenticated user. Unlocked for everyone during early access.',
      },
    ],
  },
  {
    group: 'Heatmap',
    routes: [
      {
        method: 'POST',
        path: '/v1/sessions/:id/heatmap-card',
        desc: 'Render a keyboard heatmap PNG. aspect: 9:16 · 1:1 · 16:9. Auth + privacy-gated.',
      },
      {
        method: 'GET',
        path: '/v1/sessions/:id/heatmap-card',
        desc: 'Public unauthenticated heatmap PNG for OG images. full-privacy sessions only.',
      },
    ],
  },
  {
    group: 'Teams',
    routes: [
      {
        method: 'GET',
        path: '/v1/teams',
        desc: "List the authenticated user's teams and pending invites.",
      },
      {
        method: 'POST',
        path: '/v1/teams',
        desc: 'Create a team. Free for everyone during early access; Team plan when billing is enabled. Caller becomes owner.',
      },
      {
        method: 'GET',
        path: '/v1/teams/:slug',
        desc: 'Team details and member roster. Members only.',
      },
      {
        method: 'PATCH',
        path: '/v1/teams/:slug',
        desc: 'Rename the team. Owner only.',
      },
      {
        method: 'DELETE',
        path: '/v1/teams/:slug',
        desc: 'Delete team and cascade members/invites. Owner only.',
      },
      {
        method: 'GET',
        path: '/v1/teams/invites',
        desc: 'Pending invites addressed to the authenticated user.',
      },
      {
        method: 'POST',
        path: '/v1/teams/:slug/invites',
        desc: 'Invite a user by handle. Owner only. Max 5 members enforced.',
      },
      {
        method: 'POST',
        path: '/v1/teams/invites/:id/accept',
        desc: 'Accept a team invite.',
      },
      {
        method: 'POST',
        path: '/v1/teams/invites/:id/decline',
        desc: 'Decline a team invite.',
      },
      {
        method: 'DELETE',
        path: '/v1/teams/:slug/members/:handle',
        desc: 'Remove a member (owner) or leave the team (member).',
      },
      {
        method: 'GET',
        path: '/v1/teams/:slug/leaderboard',
        desc: 'Members ranked by coding time. period: week · month · alltime. Members only.',
      },
      {
        method: 'GET',
        path: '/v1/teams/:slug/heatmap',
        desc: "Merged keyboard heatmap across all team members' sessions. Redis-cached.",
      },
    ],
  },
  {
    group: 'Billing',
    routes: [
      {
        method: 'POST',
        path: '/v1/billing/checkout',
        desc: 'Open a Stripe Checkout session for Pro or Team. plan × interval. Disabled during early access (503).',
      },
      {
        method: 'POST',
        path: '/v1/billing/portal',
        desc: 'Open the Stripe Billing Portal to manage or cancel a subscription. Disabled during early access (503).',
      },
      {
        method: 'POST',
        path: '/v1/billing/webhook',
        desc: 'Stripe webhook receiver. Signature-verified; no JWT required.',
      },
    ],
  },
  {
    group: 'Push',
    routes: [
      {
        method: 'GET',
        path: '/v1/push/vapid-public-key',
        desc: 'VAPID public key for Web Push subscription. Public endpoint.',
      },
      {
        method: 'POST',
        path: '/v1/push/subscribe',
        desc: 'Register a push subscription endpoint. Upserts on endpoint.',
      },
      {
        method: 'DELETE',
        path: '/v1/push/subscribe',
        desc: 'Remove a push subscription.',
      },
    ],
  },
  {
    group: 'Waitlist',
    routes: [
      {
        method: 'POST',
        path: '/v1/waitlist',
        desc: 'Join the early-access waitlist. Public endpoint, idempotent on email.',
      },
    ],
  },
]

const RATE_LIMITS = [
  { scope: 'POST /v1/ingest', limit: '1,000 / hr / user' },
  { scope: 'GET reads (/me, /sessions, /recap, …)', limit: '300 / hr / user' },
  {
    scope: 'Public reads (leaderboard, profiles, activity)',
    limit: '300 / hr / IP',
  },
  {
    scope: 'Auth endpoints',
    limit: '100 / hr / IP (dev) · 20 / hr / IP (prod)',
  },
  { scope: 'POST /v1/billing/checkout · /portal', limit: '30 / hr / user' },
  { scope: 'POST /v1/billing/webhook', limit: '600 / hr / IP' },
  { scope: 'GET /v1/sessions/:id/heatmap-card', limit: '120 / hr / IP' },
  { scope: 'Team endpoints', limit: '300 / hr / user' },
  { scope: 'Push subscribe/unsubscribe', limit: '20 / hr / user' },
  { scope: 'POST /v1/waitlist', limit: '10 / hr / IP' },
]

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-live',
  POST: 'text-accent',
  PATCH: 'text-accent-2',
  DELETE: 'text-ink-mute',
}

export default function Api() {
  useSeo({
    title: 'API · commma',
    description: 'The commma API reference — authentication, ingest, and session endpoints.',
  })

  return (
    <Shell>
      <div className='max-w-[860px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          API Reference
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-4 text-ink lift-text'>
          Build on <em className='italic text-accent'>commma.</em>
        </h1>

        <div className='flex items-center gap-2.5 mb-12'>
          <LiveDot color='live' />
          <span className='font-mono text-[13px] text-ink-mute'>
            v1 · base URL: <span className='text-ink-soft'>api.commma.dev</span>
          </span>
        </div>

        <div className='space-y-2 mb-12'>
          <div className='border border-rule-strong rounded-lg bg-paper-2/40 surface px-5 sm:px-7 py-5'>
            <p className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-3'>
              Authentication
            </p>
            <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0 mb-3'>
              Protected endpoints require a JWT bearer token. Tokens expire in
              15 minutes — use{' '}
              <span className='font-mono text-[14px] text-accent'>
                POST /v1/auth/refresh
              </span>{' '}
              to rotate.
            </p>
            <pre className='font-mono text-[13px] text-ink bg-paper-3 border border-rule px-4 py-3 rounded m-0 overflow-x-auto well'>
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
              <div className='border border-rule-strong rounded-lg overflow-hidden surface'>
                {group.routes.map((r, i) => (
                  <div
                    key={r.path + r.method}
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
                <span className='font-mono text-[13px] text-ink tnum whitespace-nowrap'>
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
            headers. If the limiter itself is unavailable, ingest and auth fail
            closed with <span className='text-ink'>503</span>; read paths stay
            open.
          </p>
        </div>

        <div className='mt-12 border-t border-rule pt-8'>
          <p className='font-sans text-[15px] text-ink-mute leading-relaxed m-0'>
            Questions or issues?{' '}
            <a
              href='https://github.com/trnahnh/commma-coding-progress-tracker'
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
