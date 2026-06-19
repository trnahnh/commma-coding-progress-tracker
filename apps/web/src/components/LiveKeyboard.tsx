import { useEffect, useRef, useState } from 'react'
import { QWERTY_LAYOUT } from '@commma/shared'
import { LiveDot } from './chrome'
import { useTilt } from '../lib/useTilt'

const UNIT = 44
const PAD = 20
const GAP = 4

const LOGICAL_W = QWERTY_LAYOUT.cols * UNIT + PAD * 2
const LOGICAL_H = QWERTY_LAYOUT.rows * UNIT + PAD * 2

type Rgb = [number, number, number]

const COLD: Rgb = [26, 24, 20]
const COLD_BORDER: Rgb = [45, 41, 34]
const COLD_TEXT: Rgb = [122, 116, 106]
const ACCENT: Rgb = [255, 77, 26]
const HOT_TEXT: Rgb = [255, 244, 236]

function mix(a: Rgb, b: Rgb, t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

const SYMBOL_KEYS = new Set([
  '`',
  '-',
  '=',
  '[',
  ']',
  '\\',
  ';',
  "'",
  ',',
  '.',
  '/',
])

interface Token {
  label: string
  shift: boolean
}

const SNIPPETS = [
  'const pace = keystrokes / minutes\n',
  'export async function ingest(events)\n',
  'await db.insert(sessions).values(row)\n',
  'if (idle > fifteen) startNewSession\n',
  'streak += 1 commit early ship often\n',
  'reduce the array map the heatmap go\n',
]

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (const ch of text) {
    if (ch >= 'a' && ch <= 'z') tokens.push({ label: ch, shift: false })
    else if (ch >= 'A' && ch <= 'Z')
      tokens.push({ label: ch.toLowerCase(), shift: true })
    else if (ch >= '0' && ch <= '9') tokens.push({ label: ch, shift: false })
    else if (ch === ' ') tokens.push({ label: 'Space', shift: false })
    else if (ch === '\n') tokens.push({ label: 'Enter', shift: false })
    else if (SYMBOL_KEYS.has(ch)) tokens.push({ label: ch, shift: false })
  }
  return tokens
}

const SCRIPT: Token[] = SNIPPETS.flatMap(tokenize)

const CAP_BY_LABEL = new Map<string, string>()
for (const key of QWERTY_LAYOUT.keys) {
  if (key.label && !CAP_BY_LABEL.has(key.label))
    CAP_BY_LABEL.set(key.label, key.cap)
}

const SEED: Array<[string, number]> = [
  ['e', 0.34],
  ['t', 0.28],
  ['a', 0.26],
  ['o', 0.22],
  ['n', 0.24],
  ['s', 0.22],
  ['i', 0.2],
  ['r', 0.18],
  ['Space', 0.5],
  ['d', 0.16],
  ['l', 0.14],
  ['c', 0.13],
  ['Shift', 0.2],
]

export function LiveKeyboard() {
  const stageRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const tiltRef = useTilt<HTMLDivElement>(4)
  const kpmRef = useRef<HTMLSpanElement>(null)
  const topRef = useRef<HTMLSpanElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const keysRef = useRef<HTMLSpanElement>(null)

  const [scale, setScale] = useState(1)
  const [showCaps, setShowCaps] = useState(true)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const measure = () => {
      const w = stage.clientWidth
      const s = w / LOGICAL_W
      setScale(s)
      setShowCaps(s >= 0.6)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const board = boardRef.current
    if (!board) return
    const keyEls = Array.from(
      board.querySelectorAll<HTMLElement>('[data-k]'),
    )
    const heats = new Map<string, number>()
    const flares = new Map<string, number>()
    for (const [label, value] of SEED) heats.set(label, value)

    const lastSig = new Array<string>(keyEls.length).fill('')

    const paint = () => {
      for (let i = 0; i < keyEls.length; i++) {
        const el = keyEls[i]
        const label = el.dataset.k ?? ''
        const heat = heats.get(label) ?? 0
        const flare = flares.get(label) ?? 0
        const lvl = Math.min(1, heat + flare * 0.55)
        const t = Math.sqrt(lvl)
        const flareOn = flare > 0.04
        const sig = flareOn
          ? `${Math.round(t * 100)}:${Math.round(flare * 100)}`
          : `${Math.round(t * 100)}:0`
        if (sig === lastSig[i]) continue
        lastSig[i] = sig
        el.style.background = mix(COLD, ACCENT, t)
        el.style.borderColor = mix(COLD_BORDER, ACCENT, Math.min(1, t * 0.85))
        el.style.color = mix(COLD_TEXT, HOT_TEXT, t)
        if (flareOn) {
          el.style.boxShadow = `0 0 ${(flare * 22).toFixed(1)}px rgba(255, 77, 26, ${(flare * 0.7).toFixed(2)})`
          el.style.transform = `translateY(${(-flare * 2.4).toFixed(2)}px) scale(${(1 + flare * 0.05).toFixed(3)})`
          el.style.zIndex = '2'
        } else {
          el.style.boxShadow = 'none'
          el.style.transform = 'none'
          el.style.zIndex = '1'
        }
      }
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      paint()
      if (kpmRef.current) kpmRef.current.textContent = '214'
      if (topRef.current) topRef.current.textContent = 'E'
      if (clockRef.current) clockRef.current.textContent = '12:47'
      if (keysRef.current) keysRef.current.textContent = '8,402'
      return
    }

    const presses: number[] = []
    let idx = 0
    let total = 0
    let raf = 0
    let running = false
    let last = performance.now()
    const start = last
    let acc = 0
    let nextDelay = 130
    let hudAt = 0

    const bump = (label: string, amount: number) => {
      heats.set(label, Math.min(1, (heats.get(label) ?? 0) + amount))
      flares.set(label, 1)
    }

    const tick = (now: number) => {
      if (!running) return
      const dt = now - last
      last = now
      acc += dt
      while (acc >= nextDelay) {
        acc -= nextDelay
        const tok = SCRIPT[idx % SCRIPT.length]
        idx += 1
        bump(tok.label, 0.36)
        if (tok.shift) bump('Shift', 0.24)
        presses.push(now)
        total += 1
        nextDelay = 95 + Math.random() * 95
      }

      const heatDecay = Math.pow(0.5, dt / 2400)
      const flareDecay = Math.pow(0.5, dt / 90)
      for (const [label, value] of heats) {
        const next = value * heatDecay
        if (next < 0.01) heats.delete(label)
        else heats.set(label, next)
      }
      for (const [label, value] of flares) {
        const next = value * flareDecay
        if (next < 0.02) flares.delete(label)
        else flares.set(label, next)
      }

      paint()

      if (now - hudAt > 200) {
        hudAt = now
        const cutoff = now - 4000
        while (presses.length && presses[0] < cutoff) presses.shift()
        const kpm = Math.round((presses.length / 4) * 60)
        let topLabel = ''
        let topHeat = 0
        for (const [label, value] of heats) {
          if (label && value > topHeat) {
            topHeat = value
            topLabel = label
          }
        }
        const secs = Math.floor((now - start) / 1000)
        const mm = Math.floor(secs / 60)
        const ss = secs % 60
        if (kpmRef.current) kpmRef.current.textContent = kpm.toLocaleString()
        if (topRef.current)
          topRef.current.textContent =
            CAP_BY_LABEL.get(topLabel) ?? topLabel ?? '—'
        if (clockRef.current)
          clockRef.current.textContent = `${mm}:${ss.toString().padStart(2, '0')}`
        if (keysRef.current)
          keysRef.current.textContent = (8159 + total).toLocaleString()
      }

      if (running) raf = requestAnimationFrame(tick)
    }

    const startLoop = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const stopLoop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) startLoop()
          else stopLoop()
        }
      },
      { threshold: 0 },
    )
    io.observe(board)
    return () => {
      io.disconnect()
      stopLoop()
    }
  }, [])

  return (
    <div ref={tiltRef} className='tilt'>
      <div className='relative rounded-2xl border border-rule-strong bg-linear-to-b from-paper-2 to-paper surface-lg overflow-hidden'>
        <div className='flex flex-wrap items-center gap-x-6 gap-y-2 px-5 sm:px-7 py-4 border-b border-rule font-mono text-[13px] tracking-wider text-ink-mute'>
          <span className='inline-flex items-center gap-2 text-accent uppercase tracking-[0.16em]'>
            <LiveDot color='accent' />
            live heatmap
          </span>
          <span className='inline-flex items-baseline gap-1.5'>
            <span ref={kpmRef} className='text-ink tnum text-[15px]'>
              0
            </span>
            keys / min
          </span>
          <span className='inline-flex items-baseline gap-1.5'>
            top
            <span ref={topRef} className='text-ink tnum text-[15px]'>
              —
            </span>
          </span>
          <span className='hidden sm:inline-flex items-baseline gap-1.5'>
            <span ref={keysRef} className='text-ink tnum text-[15px]'>
              8,159
            </span>
            keys today
          </span>
          <span className='ml-auto inline-flex items-baseline gap-1.5'>
            <span className='text-ink-soft'>session</span>
            <span ref={clockRef} className='text-ink tnum text-[15px]'>
              0:00
            </span>
          </span>
        </div>

        <div className='kb-stage relative px-4 sm:px-6 py-5 sm:py-7'>
          <div
            ref={stageRef}
            className='relative mx-auto w-full'
            style={{ height: LOGICAL_H * scale }}
          >
            <div
              ref={boardRef}
              aria-hidden='true'
              className='absolute left-0 top-0 origin-top-left'
              style={{
                width: LOGICAL_W,
                height: LOGICAL_H,
                transform: `scale(${scale})`,
              }}
            >
              {QWERTY_LAYOUT.keys.map((key, i) => {
                const long = key.cap.length > 2
                return (
                  <div
                    key={`${key.cap}-${key.x}-${key.y}-${i}`}
                    data-k={key.label ?? ''}
                    className='kb-key'
                    style={{
                      left: PAD + key.x * UNIT + GAP,
                      top: PAD + key.y * UNIT + GAP,
                      width: key.w * UNIT - GAP * 2,
                      height: key.h * UNIT - GAP * 2,
                      background: 'rgb(26, 24, 20)',
                      borderColor: 'rgb(45, 41, 34)',
                      color: 'rgb(122, 116, 106)',
                      fontSize: long ? 11 : 14,
                    }}
                  >
                    {showCaps ? key.cap : ''}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
