import { useEffect } from 'react'
import { Shell } from '../components/chrome'

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

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms · commma'
  }, [])

  return (
    <Shell>
      <div className='max-w-[720px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          Legal
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-3 text-ink'>
          Terms of <em className='italic text-accent'>service.</em>
        </h1>
        <p className='font-mono text-[13px] text-ink-mute m-0 mb-12'>
          Effective: May 2026
        </p>

        <Section title='Acceptance'>
          <p>
            By installing the commma extension or using commma.dev, you agree to
            these terms. If you do not agree, do not use the service.
          </p>
        </Section>

        <Section title='What we collect'>
          <p>
            commma records keystroke counts, active file paths, programming
            language, and session timing. We never record key content — only
            which physical keys were pressed and how often.
          </p>
          <p>
            You can switch to summary or silent mode at any time from the
            extension settings. Summary mode omits file paths and key
            frequencies. Silent mode records nothing.
          </p>
        </Section>

        <Section title='Your data'>
          <p>
            You own your data. You can delete your account and all associated
            data at any time by contacting us. We do not sell your data to third
            parties.
          </p>
        </Section>

        <Section title='Acceptable use'>
          <p>
            You may not use commma to circumvent rate limits, scrape other
            users' data, impersonate others, or interfere with the service. We
            reserve the right to suspend accounts that violate these terms.
          </p>
        </Section>

        <Section title='Service availability'>
          <p>
            commma is provided as-is during early access. We make no uptime
            guarantees at this stage. We will give reasonable notice before
            deprecating core features.
          </p>
        </Section>

        <Section title='Changes to these terms'>
          <p>
            We may update these terms as the product evolves. We will notify
            users of material changes via email or an in-app notice.
          </p>
        </Section>

        <Section title='Contact'>
          <p>
            Questions about these terms? Email us at{' '}
            <a
              href='mailto:anhdtran.forwork@gmail.com'
              className='text-ink hover:text-accent transition-colors'
            >
              anhdtran.forwork@gmail.com
            </a>
            .
          </p>
        </Section>
      </div>
    </Shell>
  )
}
