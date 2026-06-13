import { useEffect } from 'react'
import { Shell } from '../components/chrome'

const ENTRIES = [
  {
    version: '0.4.0',
    date: 'Jun 2026',
    tag: 'Phase 4 cont.',
    changes: [
      'Weekly recap page for Pro and Team users — live in-app version of the Monday summary email',
      'Current plan highlighted on Pricing; paid users get a "Manage billing" portal link',
      'Team workspaces: invite members, private leaderboard, aggregate keyboard heatmap',
      'Push notifications for streak reminders (browser Web Push, opt-in)',
      'PWA: installable on Android and iOS, offline fallback via service worker',
      'Server-side keyboard heatmap PNG for sharing and OG cards',
      'Smart navbar: hides on scroll-down, reveals on any upward scroll',
    ],
  },
  {
    version: '0.3.0',
    date: 'Jun 2026',
    tag: 'Phase 4',
    changes: [
      'Style badges on profiles: Vim athlete, Mouse-free, Backspace heavy, Arrow navigator',
      'Dvorak and Colemak keyboard layout toggle on the heatmap',
      'Five heatmap color themes: Blaze, Arctic, Jade, Cream, Violet',
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
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-12 text-ink'>
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
                <span className='font-mono text-[11px] tracking-[0.16em] uppercase text-accent-2 border border-accent-2-line bg-accent-2-soft px-2.5 py-1 rounded-full'>
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
                    <span className='font-mono text-[13px] text-ink-faint mt-0.5 shrink-0'>
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
