import { randomUUID } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, relative, sep } from 'node:path'
import type { HeartbeatEvent, PrivacyMode } from '@commma/shared'
import type { IngestClient } from './client.js'
import { langForPath } from './lang.js'
import { measure, tallyDelta, type FileSnapshot } from './tally.js'

const SCAN_INTERVAL_MS = 3 * 1000
const FLUSH_INTERVAL_MS = 60 * 1000
const MAX_FILE_BYTES = 2_000_000

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor',
  'target',
  'bin',
  'obj',
  '__pycache__',
  'venv',
])

interface Accumulator {
  lang: string
  file: string
  project: string
  keystrokes: number
  lines: number
}

export interface FlushSummary {
  events: number
  keystrokes: number
  lines: number
  online: boolean
}

export interface WatcherOptions {
  root: string
  privacy: PrivacyMode
  client: IngestClient
  onFlush?: (summary: FlushSummary) => void
  scanIntervalMs?: number
  flushIntervalMs?: number
}

export class Watcher {
  private readonly snapshots = new Map<string, FileSnapshot>()
  private readonly accumulators = new Map<string, Accumulator>()
  private readonly project: string
  private scanTimer: ReturnType<typeof setInterval> | null = null
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private scanning = false

  constructor(private readonly options: WatcherOptions) {
    this.project = basename(options.root)
  }

  async start(): Promise<void> {
    await this.scan(true)
    this.scanTimer = setInterval(
      () => void this.scan(false),
      this.options.scanIntervalMs ?? SCAN_INTERVAL_MS,
    )
    this.flushTimer = setInterval(
      () => void this.flush(),
      this.options.flushIntervalMs ?? FLUSH_INTERVAL_MS,
    )
  }

  async stop(): Promise<void> {
    if (this.scanTimer) clearInterval(this.scanTimer)
    if (this.flushTimer) clearInterval(this.flushTimer)
    this.scanTimer = null
    this.flushTimer = null
    await this.flush()
  }

  private async scan(baseline: boolean): Promise<void> {
    if (this.scanning) return
    this.scanning = true
    try {
      const seen = new Set<string>()
      await this.walk(this.options.root, seen, baseline)
      for (const path of this.snapshots.keys()) {
        if (!seen.has(path)) this.snapshots.delete(path)
      }
    } catch {
      void 0
    } finally {
      this.scanning = false
    }
  }

  private async walk(
    dir: string,
    seen: Set<string>,
    baseline: boolean,
  ): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue
        await this.walk(full, seen, baseline)
        continue
      }
      if (!entry.isFile()) continue
      if (langForPath(entry.name) === null) continue
      await this.inspect(full, seen, baseline)
    }
  }

  private async inspect(
    path: string,
    seen: Set<string>,
    baseline: boolean,
  ): Promise<void> {
    let info
    try {
      info = await stat(path)
    } catch {
      return
    }
    if (info.size > MAX_FILE_BYTES) return
    seen.add(path)

    const previous = this.snapshots.get(path)
    if (previous && previous.mtimeMs === info.mtimeMs) return

    let content: string
    try {
      content = await readFile(path, 'utf8')
    } catch {
      return
    }
    const next = measure(content)
    const snapshot: FileSnapshot = { mtimeMs: info.mtimeMs, ...next }

    if (baseline || !previous) {
      this.snapshots.set(path, snapshot)
      return
    }

    const tally = tallyDelta(previous, next)
    this.snapshots.set(path, snapshot)
    if (tally.keystrokes === 0 && tally.lines === 0) return
    this.accumulate(path, tally.keystrokes, tally.lines)
  }

  private accumulate(path: string, keystrokes: number, lines: number): void {
    const lang = langForPath(path)
    if (lang === null) return
    const existing = this.accumulators.get(path)
    if (existing) {
      existing.keystrokes += keystrokes
      existing.lines += lines
      return
    }
    this.accumulators.set(path, {
      lang,
      file: relative(this.options.root, path).split(sep).join('/'),
      project: this.project,
      keystrokes,
      lines,
    })
  }

  private async flush(): Promise<void> {
    if (this.options.privacy === 'off' || this.accumulators.size === 0) {
      this.accumulators.clear()
      return
    }

    const ts = Date.now()
    const events: HeartbeatEvent[] = []
    let keystrokes = 0
    let lines = 0
    for (const acc of this.accumulators.values()) {
      if (acc.keystrokes === 0 && acc.lines === 0) continue
      const event: HeartbeatEvent = {
        id: randomUUID(),
        ts,
        lang: acc.lang,
        keystrokes: acc.keystrokes,
        lines: acc.lines,
      }
      if (this.options.privacy === 'full') {
        event.file = acc.file
        event.project = acc.project
      }
      events.push(event)
      keystrokes += acc.keystrokes
      lines += acc.lines
    }
    this.accumulators.clear()
    if (events.length === 0) return

    const online = await this.options.client.send(events)
    this.options.onFlush?.({ events: events.length, keystrokes, lines, online })
  }
}
