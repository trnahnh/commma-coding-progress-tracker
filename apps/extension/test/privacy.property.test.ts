import fc from 'fast-check'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KEY_LABELS, heartbeatBatchSchema } from '@commma/shared'
import type { Auth } from '../src/auth.js'

type ChangeListener = (event: unknown) => void

const host = vi.hoisted(() => ({
  privacy: 'full' as string,
  listener: null as ((event: unknown) => void) | null,
}))

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: (key: string, fallback: string) =>
        key === 'privacy' ? host.privacy : fallback,
    }),
    onDidChangeTextDocument: (listener: ChangeListener) => {
      host.listener = listener
      return { dispose: () => (host.listener = null) }
    },
    asRelativePath: (uri: { path: string }) => uri.path.replace(/^\/ws\//, ''),
    getWorkspaceFolder: () => ({ name: 'workspace-folder' }),
  },
}))

const { Tracker } = await import('../src/tracker.js')
const { IngestClient } = await import('../src/client.js')

const LANGS = ['typescript', 'python', 'rust', 'markdown', 'plaintext']
const PATHS = ['src/index.ts', 'lib/util.py', 'README.md', 'notes/todo.txt']
const ALLOWED_FIELDS = new Set([
  'id',
  'ts',
  'lang',
  'file',
  'project',
  'keystrokes',
  'lines',
  'key_freq',
])
const LABELS = new Set<string>(KEY_LABELS)
const RUNS = Number(process.env.PRIVACY_RUNS ?? 300)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const canaryArb = fc
  .string({
    unit: fc.constantFrom(...'ghijkmnopqrstuvwxyz'.split('')),
    minLength: 16,
    maxLength: 16,
  })
  .map((s) => `SECRET_${s}`)

const fragmentArb = fc.oneof(
  fc.string({ unit: 'grapheme', maxLength: 1 }),
  fc.string({ unit: 'binary', minLength: 1, maxLength: 1 }),
  fc.constantFrom('\n', '\r\n', '\t', ' ', '{', '"', '\\', '\u0000'),
  fc.string({ unit: 'grapheme', minLength: 2, maxLength: 40 }),
)

const editArb = fc.record({
  doc: fc.nat({ max: PATHS.length - 1 }),
  insertCanary: fc.boolean(),
  canaryAsKeystrokes: fc.boolean(),
  fragment: fragmentArb,
  rangeLength: fc.oneof(fc.constant(0), fc.nat({ max: 50 })),
  removedLines: fc.nat({ max: 3 }),
  scheme: fc.constantFrom('file', 'file', 'file', 'untitled', 'git'),
})

interface Edit {
  doc: number
  insertCanary: boolean
  canaryAsKeystrokes: boolean
  fragment: string
  rangeLength: number
  removedLines: number
  scheme: string
}

function changesFor(edit: Edit, canary: string): { text: string }[] {
  if (!edit.insertCanary) return [{ text: edit.fragment }]
  if (edit.canaryAsKeystrokes) return canary.split('').map((ch) => ({ text: ch }))
  return [{ text: `${edit.fragment}${canary}${edit.fragment}` }]
}

function emit(edit: Edit, canary: string): number {
  const path = PATHS[edit.doc]
  let fired = 0
  for (const change of changesFor(edit, canary)) {
    host.listener?.({
      document: {
        uri: {
          scheme: edit.scheme,
          path: `/ws/${path}`,
          toString: () => `${edit.scheme}:///ws/${path}`,
        },
        languageId: LANGS[edit.doc % LANGS.length],
        getText: () => `${canary}\n${change.text}`,
      },
      contentChanges: [
        {
          text: change.text,
          rangeLength: edit.rangeLength,
          range: { start: { line: 0 }, end: { line: edit.removedLines } },
        },
      ],
    })
    fired += 1
  }
  return fired
}

const totals = { runs: 0, editEvents: 0, requests: 0, heartbeats: 0, bytes: 0 }
const fetchMock = vi.fn()
const auth = {
  getAccessToken: async () => 'token',
  refresh: async () => 'token',
} as unknown as Auth

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response(null, { status: 202 }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

afterAll(() => {
  process.stdout.write(`PRIVACY_PROPERTY_RESULT ${JSON.stringify(totals)}\n`)
})

describe('extension outbound payload never carries editor content', () => {
  it.each(['full', 'summary', 'off'])(
    'privacy=%s: every request body is label-only metadata',
    async (mode) => {
      await fc.assert(
        fc.asyncProperty(
          canaryArb,
          fc.array(editArb, { minLength: 1, maxLength: 60 }),
          async (canary, edits) => {
            host.privacy = mode
            fetchMock.mockClear()
            const tracker = new Tracker(new IngestClient(auth))
            tracker.start()
            for (const edit of edits) totals.editEvents += emit(edit, canary)
            await vi.advanceTimersByTimeAsync(60_000)
            tracker.stop()
            totals.runs += 1

            const bodies = fetchMock.mock.calls.map(
              ([, init]) => (init as RequestInit).body as string,
            )
            if (mode === 'off') {
              expect(bodies).toHaveLength(0)
              return
            }

            for (const body of bodies) {
              totals.requests += 1
              totals.bytes += body.length
              expect(body).not.toContain(canary)
              expect(body).not.toContain('SECRET_')

              const parsed = heartbeatBatchSchema.parse(JSON.parse(body))
              for (const event of parsed.events) {
                totals.heartbeats += 1
                for (const field of Object.keys(event)) {
                  expect(ALLOWED_FIELDS.has(field)).toBe(true)
                }
                expect(event.id).toMatch(UUID_RE)
                expect(LANGS).toContain(event.lang)
                if (mode === 'summary') {
                  expect(event.file).toBeUndefined()
                  expect(event.project).toBeUndefined()
                  expect(event.key_freq).toBeUndefined()
                  continue
                }
                expect(PATHS).toContain(event.file)
                expect(event.project).toBe('workspace-folder')
                const freq = event.key_freq ?? {}
                let labelled = 0
                for (const [label, count] of Object.entries(freq)) {
                  expect(LABELS.has(label)).toBe(true)
                  expect(Number.isInteger(count)).toBe(true)
                  labelled += count ?? 0
                }
                expect(labelled).toBe(event.keystrokes)
              }
            }
          },
        ),
        { numRuns: RUNS, seed: Number(process.env.PRIVACY_SEED ?? 42) },
      )
    },
    120_000,
  )
})
