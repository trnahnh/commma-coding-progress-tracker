const Module = require('node:module')
const path = require('node:path')
const fs = require('node:fs')

const bundlePath = path.resolve(
  process.argv[2] ?? path.join(__dirname, '..', 'dist', 'extension.js'),
)
const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? 200000)
const WARMUP = Number(process.env.BENCH_WARMUP ?? 20000)
const FILES = Number(process.env.BENCH_FILES ?? 50)

let changeListener = null
const secrets = new Map([['commma.refreshToken', 'bench-refresh-token']])
const globalState = new Map()

const vscodeStub = {
  StatusBarAlignment: { Left: 1, Right: 2 },
  window: {
    createStatusBarItem: () => ({ show() {}, hide() {}, dispose() {} }),
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showErrorMessage: async () => undefined,
  },
  commands: {
    registerCommand: () => ({ dispose() {} }),
    executeCommand: async () => undefined,
  },
  workspace: {
    getConfiguration: () => ({ get: (_key, fallback) => fallback }),
    onDidChangeConfiguration: () => ({ dispose() {} }),
    onDidChangeTextDocument: (listener) => {
      changeListener = listener
      return {
        dispose: () => {
          changeListener = null
        },
      }
    },
    asRelativePath: (uri) => uri.path,
    getWorkspaceFolder: () => ({ name: 'bench' }),
  },
  env: { openExternal: async () => true },
  Uri: { parse: (value) => ({ toString: () => value }) },
}

const originalLoad = Module._load
Module._load = function load(request, parent, isMain) {
  if (request === 'vscode') return vscodeStub
  return originalLoad.call(this, request, parent, isMain)
}

const sent = []
globalThis.fetch = async (url, init) => {
  if (String(url).endsWith('/v1/auth/refresh')) {
    return new Response(JSON.stringify({ access_token: 'bench-access' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  sent.push(init.body)
  return new Response(null, { status: 202 })
}

const context = {
  subscriptions: [],
  secrets: {
    get: async (key) => secrets.get(key),
    store: async (key, value) => {
      secrets.set(key, value)
    },
    delete: async (key) => {
      secrets.delete(key)
    },
  },
  globalState: {
    get: (key) => globalState.get(key),
    update: async (key, value) => {
      globalState.set(key, value)
    },
  },
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

function summarize(samplesNs) {
  const sorted = Float64Array.from(samplesNs).sort()
  const total = sorted.reduce((a, b) => a + b, 0)
  return {
    n: sorted.length,
    meanUs: +(total / sorted.length / 1000).toFixed(3),
    p50Us: +(percentile(sorted, 50) / 1000).toFixed(3),
    p99Us: +(percentile(sorted, 99) / 1000).toFixed(3),
    p999Us: +(percentile(sorted, 99.9) / 1000).toFixed(3),
    maxUs: +(sorted[sorted.length - 1] / 1000).toFixed(3),
  }
}

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789 \n\t(){};:\'",.<>/?-_=+'

function changeEvent(i) {
  const file = `src/file${i % FILES}.ts`
  const deleting = i % 11 === 0
  return {
    document: {
      uri: { scheme: 'file', path: file, toString: () => `file:///${file}` },
      languageId: 'typescript',
    },
    contentChanges: [
      {
        text: deleting ? '' : CHARS[i % CHARS.length],
        rangeLength: deleting ? 1 : 0,
        range: { start: { line: 1 }, end: { line: 1 } },
      },
    ],
  }
}

async function main() {
  const sizeBytes = fs.statSync(bundlePath).size

  const loadStart = process.hrtime.bigint()
  const extension = require(bundlePath)
  const loadNs = Number(process.hrtime.bigint() - loadStart)

  const activateStart = process.hrtime.bigint()
  await extension.activate(context)
  const activateNs = Number(process.hrtime.bigint() - activateStart)

  if (!changeListener) throw new Error('tracker did not subscribe; not signed in?')

  const events = Array.from({ length: 4096 }, (_, i) => changeEvent(i))
  for (let i = 0; i < WARMUP; i++) changeListener(events[i & 4095])

  global.gc?.()
  const heapBefore = process.memoryUsage().heapUsed
  const samples = new Float64Array(ITERATIONS)
  for (let i = 0; i < ITERATIONS; i++) {
    const event = events[i & 4095]
    const start = process.hrtime.bigint()
    changeListener(event)
    samples[i] = Number(process.hrtime.bigint() - start)
  }
  global.gc?.()
  const heapAfter = process.memoryUsage().heapUsed

  const batchStart = process.hrtime.bigint()
  const BATCH = 1_000_000
  for (let i = 0; i < BATCH; i++) changeListener(events[i & 4095])
  const batchNs = Number(process.hrtime.bigint() - batchStart)

  for (const sub of context.subscriptions) sub.dispose?.()

  const result = {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    bundle: path.basename(bundlePath),
    bundleBytes: sizeBytes,
    moduleLoadMs: +(loadNs / 1e6).toFixed(2),
    activateMs: +(activateNs / 1e6).toFixed(2),
    openFiles: FILES,
    perKeystroke: summarize(samples),
    amortizedPerKeystrokeUs: +(batchNs / BATCH / 1000).toFixed(3),
    heapDeltaKbWhileTracking: +((heapAfter - heapBefore) / 1024).toFixed(1),
    gcExposed: typeof global.gc === 'function',
    heapUsedMb: +(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
    rssMb: +(process.memoryUsage().rss / 1024 / 1024).toFixed(2),
  }
  process.stdout.write(`EXTENSION_OVERHEAD_RESULT ${JSON.stringify(result)}\n`)
}

main().then(
  () => process.exit(0),
  (err) => {
    process.stderr.write(`${err.stack ?? err}\n`)
    process.exit(1)
  },
)
