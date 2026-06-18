import { Shell } from '../components/chrome'
import { CHANGELOG_ENTRIES } from '../lib/changelog'
import { useSeo } from '../lib/seo'

export default function Changelog() {
  useSeo({
    title: 'Changelog · commma',
    description: "What's new in commma — release notes for the extension, API, and web app.",
  })

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
          {CHANGELOG_ENTRIES.map((entry) => (
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
