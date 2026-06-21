import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { Auth } from './auth.js'
import { IngestClient } from './client.js'
import { FileQueueStore } from './queue.js'
import { Watcher, type FlushSummary } from './watcher.js'
import {
  apiBaseUrl,
  configDir,
  resolvePrivacy,
} from './config.js'
import { style, ui } from './ui.js'

const VERSION = '0.1.0'

const HELP = `commma — headless coding-activity tracker

Usage
  commma <command> [options]

Commands
  login            Sign in with GitHub (opens your browser)
  logout           Sign out and clear stored credentials
  watch [dir]      Track coding activity in a directory (default: current)
  status           Show sign-in state and configuration
  help             Show this help

Options
  --dir <path>     Directory to watch (alias for the watch positional)
  --privacy <m>    full | summary | off (default: full)
  --api <url>      API base URL (default: https://api.commma.dev)
  -h, --help       Show this help
  -v, --version    Show the version

Environment
  COMMMA_API_URL     Override the API base URL
  COMMMA_PRIVACY     Default privacy mode (full | summary | off)
  COMMMA_CONFIG_DIR  Override where credentials are stored`

interface Parsed {
  command: string
  dir?: string
  privacy?: string
  api?: string
  help: boolean
  version: boolean
}

function parse(argv: string[]): Parsed {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      privacy: { type: 'string' },
      dir: { type: 'string' },
      api: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })
  return {
    command: positionals[0] ?? '',
    dir: values.dir,
    privacy: values.privacy,
    api: values.api,
    help: values.help ?? false,
    version: values.version ?? false,
  }
}

async function login(auth: Auth): Promise<number> {
  try {
    const handle = await auth.login()
    if (handle === null && !auth.isSignedIn()) {
      ui.error('Sign-in failed or timed out. Please try again.')
      return 1
    }
    ui.success(handle ? `Signed in as ${style.accent(handle)}.` : 'Signed in.')
    ui.line(`Run ${style.bold('commma watch')} in a project to start tracking.`)
    return 0
  } catch {
    ui.error('Sign-in failed. Please try again.')
    return 1
  }
}

async function logout(auth: Auth): Promise<number> {
  if (!auth.isSignedIn()) {
    ui.info('Not signed in.')
    return 0
  }
  await auth.logout()
  ui.success('Signed out.')
  return 0
}

function status(auth: Auth, base: string): number {
  const handle = auth.signedInHandle()
  if (auth.isSignedIn()) {
    ui.info(`Signed in${handle ? ` as ${style.accent(handle)}` : ''}.`)
  } else {
    ui.info(`Not signed in. Run ${style.bold('commma login')}.`)
  }
  ui.line(`${style.dim('API')}     ${base}`)
  ui.line(`${style.dim('Privacy')} ${resolvePrivacy()}`)
  ui.line(`${style.dim('Config')}  ${configDir()}`)
  return 0
}

function flushLine(summary: FlushSummary): void {
  const time = new Date().toTimeString().slice(0, 8)
  const lines = summary.lines >= 0 ? `+${summary.lines}` : `${summary.lines}`
  const state = summary.online
    ? style.green('sent')
    : style.dim('queued offline')
  ui.line(
    `${style.dim(time)}  ${summary.events} files · ` +
      `${summary.keystrokes} keystrokes · ${lines} lines · ${state}`,
  )
}

async function watch(auth: Auth, base: string, parsed: Parsed): Promise<number> {
  if (!auth.isSignedIn()) {
    ui.error(`Not signed in. Run ${style.bold('commma login')} first.`)
    return 1
  }
  const privacy = resolvePrivacy(parsed.privacy)
  if (privacy === 'off') {
    ui.warn('Privacy is set to "off" — nothing will be tracked or sent.')
    return 0
  }

  const root = resolve(parsed.dir ?? '.')
  const client = new IngestClient(auth, base, new FileQueueStore())
  const watcher = new Watcher({ root, privacy, client, onFlush: flushLine })

  ui.info(`${style.accent('commma')} is watching ${style.bold(root)}`)
  ui.line(`${style.dim('Privacy')} ${privacy}   ${style.dim('API')} ${base}`)
  ui.line(style.dim('Press Ctrl+C to stop.'))

  await watcher.start()

  let stopping = false
  const shutdown = () => {
    if (stopping) return
    stopping = true
    void watcher.stop().then(() => {
      ui.line('')
      ui.info('Stopped tracking.')
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  return new Promise<number>(() => {})
}

async function main(): Promise<number> {
  let parsed: Parsed
  try {
    parsed = parse(process.argv.slice(2))
  } catch {
    ui.error('Unknown option.')
    ui.line(HELP)
    return 1
  }

  if (parsed.version || parsed.command === 'version') {
    ui.info(VERSION)
    return 0
  }
  if (parsed.command === '' || parsed.command === 'help' || parsed.help) {
    ui.line(HELP)
    return 0
  }

  const base = apiBaseUrl(parsed.api)
  const auth = new Auth(base)

  switch (parsed.command) {
    case 'login':
      return login(auth)
    case 'logout':
      return logout(auth)
    case 'status':
      return status(auth, base)
    case 'watch':
      return watch(auth, base, parsed)
    default:
      ui.error(`Unknown command: ${parsed.command}`)
      ui.line(HELP)
      return 1
  }
}

main().then(
  (code) => {
    if (code !== 0) process.exitCode = code
  },
  () => {
    process.exitCode = 1
  },
)
