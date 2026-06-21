import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LiveDot, Shell } from '../components/chrome'
import { Reveal } from '../components/Reveal'
import { docTo } from '../lib/docsRouting'
import { INSTALL_PATH } from '../lib/config'
import { useSeo } from '../lib/seo'

const REPO_URL = 'https://github.com/trnahnh/commma-coding-progress-tracker'

function useReducedMotion(): boolean {
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  return reduced
}

interface Flush {
  id: number
  time: string
  files: number
  keys: number
  lines: number
  sent: boolean
}

function clock(i: number): string {
  const t = 11 * 3600 + 46 * 60 + 3 + i * 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor((t % 3600) / 60))}`
}

function makeFlush(i: number): Flush {
  return {
    id: i,
    time: clock(i),
    files: 1 + ((i * 2 + 1) % 5),
    keys: 38 + ((i * 53) % 190),
    lines: ((i * 7) % 11) - 2,
    sent: i % 9 !== 0,
  }
}

const SEED = [0, 1, 2, 3].map(makeFlush)
const WINDOW = 6

function useFlushStream(): Flush[] {
  const reduced = useReducedMotion()
  const [flushes, setFlushes] = useState<Flush[]>(SEED)
  const next = useRef(SEED.length)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      setFlushes((prev) => {
        const grown = [...prev, makeFlush(next.current)]
        next.current += 1
        return grown.slice(-WINDOW)
      })
    }, 1600)
    return () => window.clearInterval(id)
  }, [reduced])

  return flushes
}

function Prompt() {
  return <span className='text-accent'>~/api ❯ </span>
}

function FlushRow({ flush, fresh }: { flush: Flush; fresh: boolean }) {
  const sign = flush.lines >= 0 ? '+' : ''
  return (
    <div className={`whitespace-nowrap ${fresh ? 'animate-fade-up' : ''}`}>
      <span className='text-ink-mute'>{flush.time}</span>{'  '}
      <span className='text-ink-soft tnum'>
        {flush.files} files · {flush.keys} keys · {sign}
        {flush.lines} ln ·{' '}
      </span>
      <span className={flush.sent ? 'text-live' : 'text-ink-mute'}>
        {flush.sent ? 'sent' : 'queued'}
      </span>
    </div>
  )
}

function Terminal() {
  const flushes = useFlushStream()
  const firstId = flushes[0]?.id ?? 0

  return (
    <div className='rounded-xl border border-rule-strong bg-paper-2 surface-lg overflow-hidden'>
      <div className='flex items-center gap-3 px-4 sm:px-5 h-11 border-b border-rule bg-paper-3/60'>
        <span className='flex items-center gap-1.5' aria-hidden='true'>
          <span className='w-3 h-3 rounded-full bg-accent' />
          <span className='w-3 h-3 rounded-full bg-ink-faint' />
          <span className='w-3 h-3 rounded-full bg-ink-faint' />
        </span>
        <span className='font-mono text-[12px] tracking-wide text-ink-mute'>
          commma watch
        </span>
        <span className='ml-auto inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute'>
          <LiveDot /> live
        </span>
      </div>

      <div className='px-4 sm:px-6 py-5 font-mono text-[12px] sm:text-[13px] leading-[1.85] overflow-x-auto'>
        <div className='whitespace-nowrap'>
          <Prompt />
          <span className='text-ink'>commma login</span>
        </div>
        <div className='whitespace-nowrap text-ink-mute'>
          Opening your browser to sign in with GitHub…
        </div>
        <div className='whitespace-nowrap'>
          <span className='text-live'>+</span>{' '}
          <span className='text-ink-soft'>Signed in as anhdtran.</span>
        </div>
        <div className='whitespace-nowrap mt-1'>
          <Prompt />
          <span className='text-ink'>commma watch</span>
        </div>
        <div className='whitespace-nowrap text-ink-soft'>
          watching ~/api · privacy full
        </div>

        <div className='my-3 h-px bg-rule' />

        {flushes.map((flush) => (
          <FlushRow
            key={flush.id}
            flush={flush}
            fresh={flush.id === firstId + flushes.length - 1}
          />
        ))}

        <div className='whitespace-nowrap mt-1'>
          <Prompt />
          <span className='caret text-ink'>▋</span>
        </div>
      </div>
    </div>
  )
}

interface Command {
  cmd: string
  title: string
  body: string
}

const COMMANDS: Command[] = [
  {
    cmd: 'commma login',
    title: 'Connect once',
    body: 'Opens GitHub in your browser, captures the redirect on a local port, and stores a refresh token. No password, no pasted key.',
  },
  {
    cmd: 'commma watch',
    title: 'Start tracking',
    body: 'Watches the current project for file changes and flushes a batch of activity every 60 seconds. Leave it running in a spare pane.',
  },
  {
    cmd: 'commma status',
    title: 'Check the wiring',
    body: 'Shows who you are signed in as, the API it talks to, and the privacy mode in effect — a one-line sanity check.',
  },
  {
    cmd: 'commma logout',
    title: 'Disconnect',
    body: 'Revokes the session and clears the stored credentials from your machine.',
  },
]

const FLOW = [
  {
    no: '01',
    title: 'Your editor saves',
    body: 'Neovim, Emacs, Helix, JetBrains — anything that writes source files to disk. No plugin to install.',
  },
  {
    no: '02',
    title: 'The watcher reads the delta',
    body: 'commma watch notices the change and counts the keystrokes and lines it added or removed — never the characters themselves.',
  },
  {
    no: '03',
    title: 'Sessions appear',
    body: 'The server stitches your heartbeats into sessions, streaks, and leaderboard standings — the same pipeline the editor extension feeds.',
  },
]

const MODES = [
  {
    name: 'full',
    body: 'Language, file path, project, keystrokes, and lines.',
  },
  {
    name: 'summary',
    body: 'Language, keystrokes, and lines only — no file paths.',
  },
  {
    name: 'off',
    body: 'Tracks nothing and sends nothing.',
  },
]

const GET_IT = [
  `git clone ${REPO_URL}`,
  'pnpm install',
  'pnpm --filter @commma/cli build',
  'node apps/cli/dist/cli.js login',
].join('\n')

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!navigator.clipboard) return
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }
  return (
    <button
      type='button'
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      className='shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 rounded-lg
        border border-rule-strong text-ink-soft hover:text-ink hover:border-ink-faint transition-colors press
        font-mono text-[12px] uppercase tracking-wider'
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function Cli() {
  useSeo({
    title: 'commma CLI — track coding from any editor',
    description:
      'commma watch is a headless terminal client that tracks your coding from any editor that writes files — Neovim, Emacs, Helix, JetBrains. No plugin required.',
  })

  return (
    <Shell>
      <section className='grid gap-[clamp(32px,5vw,64px)] lg:grid-cols-[1.05fr_1.25fr] lg:items-center'>
        <header className='min-w-0'>
          <p className='font-mono text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-5 inline-flex items-center gap-2.5'>
            <LiveDot color='accent' /> headless client · cli
          </p>
          <h1 className='font-serif font-normal text-[clamp(40px,8.5vw,92px)] leading-[0.95] tracking-[-0.03em] m-0 text-ink'>
            Any editor.
            <br />
            One watcher<span className='text-accent'>.</span>
          </h1>
          <p className='font-sans text-[clamp(16px,1.4vw,20px)] leading-relaxed text-ink-soft mt-6 m-0 max-w-[46ch]'>
            <span className='font-mono text-ink'>commma watch</span> turns any
            editor that saves files into a tracked session — Neovim, Emacs,
            Helix, JetBrains. No plugin. Just a terminal.
          </p>
          <div className='flex flex-wrap items-center gap-3 mt-8'>
            <a
              href='#get-it'
              className='group inline-flex items-center gap-2.5 min-h-[48px] px-6 rounded-full font-mono text-[13px] sm:text-[14px] uppercase tracking-wider font-medium
                bg-accent text-paper border border-accent glow-accent press hover:bg-ink hover:border-ink transition-colors'
            >
              Get the CLI
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </a>
            <Link
              to={INSTALL_PATH}
              className='inline-flex items-center min-h-[48px] px-6 rounded-full font-mono text-[13px] sm:text-[14px] uppercase tracking-wider
                text-ink-soft hover:text-ink border border-rule-strong hover:border-ink-faint transition-colors press'
            >
              Use an editor instead
            </Link>
          </div>
        </header>

        <Terminal />
      </section>

      <section className='mt-[clamp(64px,10vw,128px)]'>
        <Reveal>
          <p className='font-mono text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-7'>
            Four commands
          </p>
        </Reveal>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5'>
          {COMMANDS.map((c, i) => (
            <Reveal key={c.cmd} delay={i * 90}>
              <div className='h-full rounded-xl border border-rule bg-paper-2/50 surface px-6 py-7 lift'>
                <code className='inline-block font-mono text-[14px] sm:text-[15px] text-accent bg-paper border border-rule rounded-md px-3 py-1.5 mb-5'>
                  {c.cmd}
                </code>
                <h2 className='font-serif font-normal text-[clamp(22px,3vw,28px)] leading-tight tracking-[-0.015em] m-0 mb-2.5 text-ink'>
                  {c.title}
                </h2>
                <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0 max-w-[44ch]'>
                  {c.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className='mt-[clamp(64px,10vw,128px)]'>
        <Reveal>
          <h2 className='font-serif font-normal text-[clamp(28px,5vw,52px)] leading-[1.02] tracking-[-0.02em] m-0 mb-3 text-ink'>
            No plugin. <em className='italic text-accent'>No editor lock-in.</em>
          </h2>
          <p className='font-sans text-[15px] sm:text-[16px] leading-relaxed text-ink-soft m-0 max-w-[60ch] mb-10'>
            The CLI watches the filesystem instead of hooking into an editor, so
            it works the same everywhere code lands on disk.
          </p>
        </Reveal>
        <div className='grid grid-cols-1 md:grid-cols-3 border-y border-rule'>
          {FLOW.map((s, i) => (
            <Reveal
              key={s.no}
              delay={i * 110}
              className={`px-5 sm:px-8 py-8 sm:py-10 border-rule ${i < 2 ? 'md:border-r border-b md:border-b-0' : ''}`}
            >
              <div className='font-mono text-[15px] tracking-[0.16em] text-ink-mute flex items-center gap-3 mb-6'>
                <span className='font-serif text-[22px] text-accent tnum'>
                  {s.no}
                </span>
                <span className='flex-1 h-px bg-rule' />
              </div>
              <h3 className='font-serif font-normal text-[26px] leading-tight tracking-[-0.015em] m-0 mb-3 text-ink'>
                {s.title}
              </h3>
              <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0 max-w-[38ch]'>
                {s.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className='mt-[clamp(64px,10vw,128px)] grid gap-[clamp(28px,5vw,56px)] lg:grid-cols-[1fr_1fr] lg:items-center'>
        <Reveal>
          <div className='rounded-2xl border border-accent-line bg-accent-soft px-7 sm:px-9 py-9'>
            <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-accent m-0 mb-4'>
              The guarantee
            </p>
            <p className='font-serif font-normal text-[clamp(24px,3.4vw,38px)] leading-[1.08] tracking-[-0.015em] m-0 text-ink'>
              It counts <em className='italic'>which</em> keys moved the file —
              never <em className='italic'>what</em> you typed.
            </p>
            <p className='font-sans text-[15px] leading-relaxed text-ink-soft mt-5 m-0 max-w-[48ch]'>
              The CLI reads files only to measure how many characters and lines
              changed. Because it watches the disk, not your keyboard, it cannot
              build a key-frequency heatmap at all — that stays the editor
              extension’s job.
            </p>
          </div>
        </Reveal>
        <Reveal delay={90}>
          <div>
            <p className='font-mono text-[12px] sm:text-[13px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-6'>
              Three privacy modes
            </p>
            <ul className='m-0 p-0 list-none flex flex-col gap-px bg-rule border border-rule rounded-xl overflow-hidden'>
              {MODES.map((m) => (
                <li
                  key={m.name}
                  className='flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-5 bg-paper-2 px-5 sm:px-6 py-5'
                >
                  <code className='font-mono text-[14px] text-accent shrink-0 sm:w-[88px]'>
                    {m.name}
                  </code>
                  <span className='font-sans text-[15px] leading-relaxed text-ink-soft min-w-0'>
                    {m.body}
                  </span>
                </li>
              ))}
            </ul>
            <p className='font-mono text-[12px] tracking-wide text-ink-mute mt-4 m-0'>
              Set with <span className='text-ink-soft'>--privacy</span> or{' '}
              <span className='text-ink-soft'>COMMMA_PRIVACY</span>.
            </p>
          </div>
        </Reveal>
      </section>

      <section
        id='get-it'
        className='mt-[clamp(64px,10vw,128px)] scroll-mt-24'
      >
        <Reveal>
          <div className='rounded-2xl border border-rule-strong bg-paper-2/60 surface px-6 sm:px-10 py-9 sm:py-12'>
            <h2 className='font-serif font-normal text-[clamp(28px,5vw,52px)] leading-[1.02] tracking-[-0.02em] m-0 mb-3 text-ink'>
              Get it running<span className='text-accent'>.</span>
            </h2>
            <p className='font-sans text-[15px] sm:text-[16px] leading-relaxed text-ink-soft m-0 mb-7 max-w-[58ch]'>
              The CLI ships in the open-source monorepo. Build it once, then sign
              in and start the watcher. A published binary is on the way.
            </p>
            <div className='flex items-stretch gap-2'>
              <pre className='flex-1 min-w-0 m-0 px-4 sm:px-5 py-4 rounded-lg bg-paper border border-rule well font-mono text-[12px] sm:text-[13px] leading-[1.8] text-ink-soft overflow-x-auto'>
                {GET_IT}
              </pre>
              <CopyButton value={GET_IT} label='Copy setup commands' />
            </div>
            <div className='flex flex-wrap items-center gap-x-6 gap-y-3 mt-7 font-mono text-[13px] tracking-wide'>
              <a
                href={`${REPO_URL}/tree/main/apps/cli`}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors'
              >
                Read the source
                <span className='text-[11px] text-ink-mute'>↗</span>
              </a>
              <Link
                to={docTo('installation')}
                className='text-ink-soft hover:text-ink transition-colors'
              >
                Installation docs
              </Link>
              <Link
                to={INSTALL_PATH}
                className='text-ink-soft hover:text-ink transition-colors'
              >
                Editor extension
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </Shell>
  )
}
