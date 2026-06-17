import { useEffect } from 'react'
import { Shell } from '../components/chrome'

const ENTRIES = [
  {
    version: '0.7.0',
    date: 'Jun 2026',
    tag: 'Design',
    changes: [
      'Landing hero reimagined around a live keyboard heatmap — a self-typing board floods keys with heat in real time, with a live keys-per-minute, top-key, and session readout',
      'Every landing section rebuilt with oversized index numerals, scroll-reveal motion, and a broadcast-style live activity ticker',
      'New headline — "Every keystroke leaves a mark"',
      'Back-to-top button now appears on every page, not just the landing page',
      'Join the waitlist — a new section on the landing page captures your email and sends a confirmation, so you get pinged the moment the next access wave opens',
      'Fixed streak-reminder notifications — enabling them now recovers from a stale subscription, explains the Add-to-Home-Screen step on iPhone/iPad, and reports any browser refusal instead of silently doing nothing',
      'Streak reminders now send at a fixed daily time and survive server restarts, so they fire reliably',
    ],
  },
  {
    version: '0.6.0',
    date: 'Jun 2026',
    tag: 'Design',
    changes: [
      'Depth pass across every page — raised cards, recessed inputs, a floating navbar, lifted headlines, and glowing CTAs, all lit from above (palette, type, and colors unchanged)',
      'Landing hero is now a cursor-driven 3D scene: parallax depth layers, an accent light that follows your cursor, and a tilting glass stat panel with a moving glare',
      'Always-on 3D backdrop on the landing page — a perspective speed-grid tunnel and drifting glow-orbs, rendered in pure CSS so the motion runs on mobile too',
      'Motion respects prefers-reduced-motion, and cursor-only effects switch off on touch devices',
    ],
  },
  {
    version: '0.5.0',
    date: 'Jun 2026',
    tag: 'Production',
    changes: [
      'commma.dev is live — deployed on AWS (EC2 t4g + PM2 for the API, S3 + CloudFront for the web) with Neon Postgres and Upstash Redis; TLS everywhere',
      'Backend hardening: graceful SIGTERM shutdown, scheduler leader lock (safe to run on multiple instances), rate limiter fails closed on Redis outage for auth and ingest routes',
      'Fixed empty-leaderboard cold-rebuild race condition — negative cache reduces read p95 from ~2 s to ~161 ms under concurrency',
      'Session-detail back link is origin-aware: shows "Back to @handle" when navigating from a profile page',
      'Weekly recap email delivered from recap@commma.dev (verified sender domain on Resend)',
      'One-command deploy scripts: pnpm deploy:web and pnpm deploy:api',
    ],
  },
  {
    version: '0.4.0',
    date: 'Jun 2026',
    tag: 'Phase 4 cont.',
    changes: [
      'About page — origin story, animated GitHub × Strava insight, manifesto, and 23-entry stack catalogue grouped by layer',
      'Weekly recap page for Pro and Team users — live in-app version of the Monday summary email',
      'Weekly recap email — Monday morning session summary with AI-assisted prose for Pro and Team users',
      'Current plan highlighted on Pricing; paid users get a "Manage billing" portal link',
      'Team workspaces: invite members, private leaderboard, aggregate keyboard heatmap',
      'Push notifications for streak reminders (browser Web Push, opt-in)',
      'PWA: installable on Android and iOS, offline fallback via service worker',
      'Server-side keyboard heatmap PNG for sharing and OG cards',
      'Smart navbar: hides on scroll-down, reveals on any upward scroll',
      'Extension first-run sign-in nudge — one-time prompt after install',
    ],
  },
  {
    version: '0.3.0',
    date: 'Jun 2026',
    tag: 'Phase 4',
    changes: [
      'Style badges on profiles: Vim athlete, Mouse-free, Backspace heavy, Arrow navigator',
      'Dvorak and Colemak keyboard layout toggle on the heatmap',
      'Stripe billing: Pro ($5/mo) and Team ($20/mo, up to 5 seats)',
      'PNG export gated to Pro plan; free users see an upgrade prompt',
      'Pricing page with Free / Pro / Team tiers',
    ],
  },
  {
    version: '0.2.0',
    date: 'May 2026',
    tag: 'Phase 2 – 3',
    changes: [
      'Profile pages at /@handle with live session feed and stat grid',
      'Leaderboard — week / month / all-time periods',
      'Community feed with follow / unfollow',
      'Keyboard heatmap PNG export (1:1, 9:16, 16:9 presets)',
      'GitHub OAuth sign-in from the web app',
      'Privacy modes: full / summary / off enforced server-side',
      'Rate limiting on all endpoints (Redis fixed-window)',
    ],
  },
  {
    version: '0.1.0',
    date: 'May 2026',
    tag: 'Phase 1',
    changes: [
      'VSCode extension: keystroke tracking, 60-second heartbeat flush to API',
      'Session aggregation with 15-minute idle gap detection',
      'Keyboard heatmap built from key-label frequency data',
      'Streak tracking and leaderboard sorted sets',
      'Session detail page with language breakdown and file list',
    ],
  },
] as const

export default function Changelog() {
  useEffect(() => {
    document.title = 'Changelog · commma'
  }, [])

  return (
    <Shell>
      <div className='max-w-[720px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          Changelog
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-12 text-ink lift-text'>
          What's <em className='italic text-accent'>shipped.</em>
        </h1>

        <div>
          {ENTRIES.map((entry) => (
            <div
              key={entry.version}
              className='py-8 border-b border-rule last:border-b-0'
            >
              <div className='flex items-center gap-3 mb-5'>
                <span className='font-serif text-[clamp(22px,2.5vw,32px)] leading-none tracking-[-0.02em] text-ink tnum'>
                  {entry.version}
                </span>
                <span className='font-mono text-[11px] tracking-[0.16em] uppercase text-accent-2 border border-accent-2-line bg-accent-2-soft px-2.5 py-1 rounded-full bevel'>
                  {entry.tag}
                </span>
                <span className='font-mono text-[13px] text-ink-mute ml-auto'>
                  {entry.date}
                </span>
              </div>
              <ul className='m-0 p-0 list-none flex flex-col gap-2.5'>
                {entry.changes.map((c) => (
                  <li
                    key={c}
                    className='flex items-start gap-3 font-sans text-[15px] leading-snug text-ink-soft'
                  >
                    <span className='font-mono text-[13px] text-ink-mute mt-0.5 shrink-0'>
                      —
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}
