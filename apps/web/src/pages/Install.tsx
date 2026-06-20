import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell, LiveDot } from '../components/chrome'
import {
  EXTENSION_ID,
  OPEN_VSX_URL,
  VSCODE_MARKETPLACE_URL,
} from '../lib/config'
import { useSeo } from '../lib/seo'

interface Channel {
  key: string
  eyebrow: string
  title: string
  editors: string
  blurb: string
  cta: string
  href: string
  command: string
}

const CHANNELS: Channel[] = [
  {
    key: 'vscode',
    eyebrow: 'Visual Studio Marketplace',
    title: 'VS Code',
    editors: 'Visual Studio Code · VS Code Insiders',
    blurb:
      'The official listing. Search “commma” in the Extensions panel, or open the Marketplace page and hit install.',
    cta: 'Open in Marketplace',
    href: VSCODE_MARKETPLACE_URL,
    command: `code --install-extension ${EXTENSION_ID}`,
  },
  {
    key: 'openvsx',
    eyebrow: 'Open VSX Registry',
    title: 'Cursor & VSCodium-based',
    editors: 'Cursor · Windsurf · VSCodium · Gitpod',
    blurb:
      'These editors pull from Open VSX, not the Microsoft Marketplace. Search “commma” in their Extensions panel, or open the Open VSX page.',
    cta: 'Open in Open VSX',
    href: OPEN_VSX_URL,
    command: `cursor --install-extension ${EXTENSION_ID}`,
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Install & reload',
    body: 'Add the extension from your editor’s marketplace and reload the window.',
  },
  {
    n: '02',
    title: 'Sign in with GitHub',
    body: 'Run “commma: Sign in” from the command palette. One click, no password.',
  },
  {
    n: '03',
    title: 'Just code',
    body: 'Sessions, streaks, and your keyboard heatmap fill in automatically — key labels only, never content.',
  },
]

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (!navigator.clipboard) return
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div className='flex items-stretch gap-2 mt-5'>
      <code className='flex-1 min-w-0 flex items-center px-4 rounded-lg bg-paper border border-rule font-mono text-[13px] text-ink-soft overflow-x-auto whitespace-nowrap'>
        {command}
      </code>
      <button
        type='button'
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy command'}
        className='shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 rounded-lg
          border border-rule-strong text-ink-soft hover:text-ink hover:border-ink-faint transition-colors press
          font-mono text-[12px] uppercase tracking-wider'
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export default function Install() {
  useSeo({
    title: 'Install commma — VS Code, Cursor & more',
    description:
      'Install the commma extension. On VS Code from the Visual Studio Marketplace, and on Cursor, Windsurf, and VSCodium from Open VSX.',
  })

  return (
    <Shell>
      <header className='max-w-[60ch]'>
        <p className='font-mono text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-5 inline-flex items-center gap-2.5'>
          <LiveDot /> live on two marketplaces
        </p>
        <h1 className='font-serif font-normal text-[clamp(34px,8vw,88px)] leading-[0.95] tracking-[-0.03em] m-0 text-ink break-words'>
          Install commma<span className='text-accent'>.</span>
        </h1>
        <p className='font-sans text-[clamp(16px,1.3vw,19px)] leading-relaxed text-ink-soft mt-6 m-0'>
          Pick your editor. Install once, sign in with GitHub, and code as usual
          — commma logs the pace, splits, and keyboard heatmap of every session.
        </p>
      </header>

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-2 mt-[clamp(40px,6vw,72px)]'>
        {CHANNELS.map((c) => (
          <div
            key={c.key}
            className='flex flex-col rounded-xl border border-rule-strong bg-paper-2/60 surface px-6 sm:px-8 py-8'
          >
            <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-4'>
              {c.eyebrow}
            </p>
            <h2 className='font-serif font-normal text-[clamp(24px,3.5vw,38px)] leading-[1.04] tracking-[-0.02em] m-0 mb-2 text-ink break-words'>
              {c.title}
            </h2>
            <p className='font-mono text-[12px] sm:text-[13px] text-ink-mute m-0 mb-4 break-words'>
              {c.editors}
            </p>
            <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0'>
              {c.blurb}
            </p>
            <div className='mt-auto'>
              <a
                href={c.href}
                target='_blank'
                rel='noopener noreferrer'
                className='group inline-flex w-full sm:w-auto justify-center items-center gap-2.5 min-h-[48px] mt-7 px-6 rounded-full font-mono text-[13px] sm:text-[14px] uppercase tracking-wider font-medium
                  bg-accent text-paper border border-accent glow-accent press hover:bg-ink hover:border-ink transition-colors'
              >
                {c.cta}
                <span className='inline-block transition-transform group-hover:translate-x-1'>
                  →
                </span>
              </a>
              <p className='font-mono text-[12px] tracking-wide text-ink-mute mt-6 mb-0'>
                Or from your terminal
              </p>
              <CopyCommand command={c.command} />
            </div>
          </div>
        ))}
      </div>

      <section className='mt-[clamp(48px,7vw,88px)]'>
        <h2 className='font-mono text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-7'>
          After you install
        </h2>
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-3'>
          {STEPS.map((s) => (
            <div
              key={s.n}
              className='rounded-xl border border-rule bg-paper-2/40 surface px-6 py-7'
            >
              <span className='font-serif text-[clamp(28px,4vw,40px)] leading-none text-accent tnum'>
                {s.n}
              </span>
              <h3 className='font-sans font-medium text-[16px] text-ink mt-4 mb-2'>
                {s.title}
              </h3>
              <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0'>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className='mt-[clamp(40px,6vw,72px)] rounded-xl border border-rule bg-paper-2/40 surface px-6 sm:px-8 py-8 flex flex-col sm:flex-row sm:items-center gap-6 sm:justify-between'>
        <div className='min-w-0'>
          <h2 className='font-serif font-normal text-[clamp(22px,3vw,30px)] leading-[1.05] tracking-[-0.01em] m-0 mb-2 text-ink'>
            Coding somewhere else?
          </h2>
          <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0 max-w-[52ch]'>
            JetBrains, Neovim, and a standalone CLI are next. Drop your email on
            the home page and we’ll ping you the moment your editor lands.
          </p>
        </div>
        <Link
          to='/#get-started'
          className='shrink-0 inline-flex items-center gap-2.5 min-h-[48px] px-6 rounded-full font-mono text-[14px] uppercase tracking-wider
            text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint transition-colors press'
        >
          Get notified
        </Link>
      </section>
    </Shell>
  )
}
