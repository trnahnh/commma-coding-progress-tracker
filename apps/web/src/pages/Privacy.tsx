import { Shell } from '../components/chrome'
import { useSeo } from '../lib/seo'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className='py-8 border-b border-rule last:border-b-0'>
      <h2 className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-4'>
        {title}
      </h2>
      <div className='font-sans text-[16px] leading-relaxed text-ink-soft max-w-[58ch] space-y-3'>
        {children}
      </div>
    </div>
  )
}

export default function Privacy() {
  useSeo({
    title: 'Privacy · commma',
    description: 'How commma collects, stores, and protects your coding activity data.',
  })

  return (
    <Shell>
      <div className='max-w-[720px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          Privacy Policy
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-3 text-ink lift-text'>
          Your code stays <em className='italic text-accent'>yours.</em>
        </h1>
        <p className='font-mono text-[13px] text-ink-mute m-0 mb-12'>
          Last updated: June 2026
        </p>

        <div className='border-t border-rule'>
          <Section title='The short version'>
            <p>
              commma tracks{' '}
              <strong className='text-ink font-medium'>
                which keys you press
              </strong>
              , not what you type. No code, no file content, no readable text
              ever leaves your machine. The extension measures activity —
              keystrokes counted by label, time spent, language, and file path —
              nothing more.
            </p>
          </Section>

          <Section title='What we collect'>
            <p>
              When you use the commma extension, we receive heartbeat events
              containing:
            </p>
            <ul className='m-0 pl-5 space-y-2 list-disc marker:text-ink-faint'>
              <li>
                <strong className='text-ink font-medium'>Key labels</strong> —
                which physical key was pressed (e.g.{' '}
                <span className='font-mono text-[14px] text-accent'>j</span>,{' '}
                <span className='font-mono text-[14px] text-accent'>Space</span>
                ,{' '}
                <span className='font-mono text-[14px] text-accent'>
                  Backspace
                </span>
                ), and how many times. Never the character that was produced.
              </li>
              <li>
                <strong className='text-ink font-medium'>
                  Keystroke counts
                </strong>{' '}
                — total keystrokes per flush interval.
              </li>
              <li>
                <strong className='text-ink font-medium'>
                  Active file path and language
                </strong>{' '}
                — the relative file path and detected language for the file you
                were editing (omitted in summary and off modes).
              </li>
              <li>
                <strong className='text-ink font-medium'>Session timing</strong>{' '}
                — when activity started and stopped, inferred from the heartbeat
                stream.
              </li>
              <li>
                <strong className='text-ink font-medium'>GitHub profile</strong>{' '}
                — handle, email, and avatar URL from your GitHub OAuth grant.
              </li>
              <li>
                <strong className='text-ink font-medium'>Waitlist email</strong>{' '}
                — if you join the early-access waitlist, just the email address
                you submit, used only to send a confirmation and notify you when
                access opens.
              </li>
            </ul>
          </Section>

          <Section title='What we never collect'>
            <p>commma will never collect, transmit, or store:</p>
            <ul className='m-0 pl-5 space-y-2 list-disc marker:text-ink-faint'>
              <li>The content of any keystroke (what was typed)</li>
              <li>File contents, source code, or clipboard data</li>
              <li>Passwords, tokens, or secrets</li>
              <li>Browser history or activity outside your editor</li>
            </ul>
            <p>
              This is a hard architectural guarantee, not a policy choice. The
              extension only reads change counts from VSCode's document-change
              events — the actual text delta is never accessed.
            </p>
          </Section>

          <Section title='Privacy modes'>
            <p>
              You control exactly what the extension reports. Three modes are
              available via the{' '}
              <span className='font-mono text-[14px] text-accent'>
                commma.privacy
              </span>{' '}
              setting:
            </p>
            <ul className='m-0 pl-5 space-y-2 list-disc marker:text-ink-faint'>
              <li>
                <strong className='text-ink font-medium'>Full</strong> — sends
                all fields including file paths and per-key frequency
                histograms.
              </li>
              <li>
                <strong className='text-ink font-medium'>Summary</strong> —
                sends session totals only (duration, keystrokes, language). No
                file paths, no key breakdown.
              </li>
              <li>
                <strong className='text-ink font-medium'>Off</strong> — the
                extension goes silent. Nothing is transmitted or stored.
              </li>
            </ul>
            <p>
              The default is{' '}
              <strong className='text-ink font-medium'>full</strong>. You can
              change it at any time without reinstalling.
            </p>
          </Section>

          <Section title='Data retention'>
            <p>
              Raw heartbeat events are deleted once they have been aggregated
              into a session (typically within 15 minutes of your last keystroke
              in a session). Aggregated session records are retained for as long
              as your account is active.
            </p>
            <p>
              Deleting your account removes all sessions, streaks, and profile
              data permanently. Contact us to request deletion.
            </p>
          </Section>

          <Section title='Third parties'>
            <p>
              We use GitHub OAuth for sign-in and Resend to deliver
              transactional email (waitlist confirmations, weekly recaps). We
              do not sell, share, or license your data to any third party.
              Infrastructure runs on AWS (compute), Neon (database), and
              Upstash (cache). All data is stored in the United States.
            </p>
          </Section>

          <Section title='Contact'>
            <p>Questions about this policy or requests to delete your data:</p>
            <a
              href='mailto:anhdtran.forwork@gmail.com?subject=commma — privacy'
              className='font-mono text-[15px] text-accent hover:text-ink-soft transition-colors'
            >
              anhdtran.forwork@gmail.com
            </a>
          </Section>
        </div>
      </div>
    </Shell>
  )
}
