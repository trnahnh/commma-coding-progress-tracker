import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  KEYBOARD_LAYOUTS,
  type KeyboardLayout,
  type LayoutName,
} from '@commma/shared'
import type { KeyboardHeatmap as Heatmap } from '../lib/api'

const PRESETS = [
  { label: '1:1', w: 1080, h: 1080 },
  { label: '9:16', w: 1080, h: 1920 },
  { label: '16:9', w: 1920, h: 1080 },
] as const

const LAYOUT_LABELS: Record<LayoutName, string> = {
  qwerty: 'QWERTY',
  dvorak: 'Dvorak',
  colemak: 'Colemak',
}

const UNIT = 46
const PAD = 16
const GAP = 3
const RADIUS = 6

const COLD_FILL = '#1a1814'
const HOT_FILL = '#ff4d1a'
const COLD_BORDER = '#2d2922'
const HOT_BORDER = '#ff4d1a'
const COLD_TEXT = '#7a746a'
const HOT_TEXT = '#fff4ec'

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ]
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

function slugify(value: string): string {
  const slug = value
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'session'
}

function drawHeatmap(
  canvas: HTMLCanvasElement,
  heatmap: Heatmap,
  layout: KeyboardLayout,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const logicalW = layout.cols * UNIT + PAD * 2
  const logicalH = layout.rows * UNIT + PAD * 2
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(logicalW * dpr)
  canvas.height = Math.round(logicalH * dpr)
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, logicalW, logicalH)

  const counts = heatmap.counts
  let max = 0
  for (const key of layout.keys) {
    if (key.label) max = Math.max(max, counts[key.label] ?? 0)
  }

  for (const key of layout.keys) {
    const count = key.label ? (counts[key.label] ?? 0) : 0
    const t = max > 0 && count > 0 ? Math.sqrt(count / max) : 0
    const px = PAD + key.x * UNIT + GAP
    const py = PAD + key.y * UNIT + GAP
    const pw = key.w * UNIT - GAP * 2
    const ph = key.h * UNIT - GAP * 2

    ctx.beginPath()
    ctx.roundRect(px, py, pw, ph, RADIUS)
    ctx.fillStyle = t > 0 ? lerpColor(COLD_FILL, HOT_FILL, t) : COLD_FILL
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle =
      t > 0 ? lerpColor(COLD_BORDER, HOT_BORDER, t) : COLD_BORDER
    ctx.stroke()

    if (key.cap) {
      const fontSize = key.cap.length > 2 ? 11 : 15
      ctx.fillStyle = t > 0 ? lerpColor(COLD_TEXT, HOT_TEXT, t) : COLD_TEXT
      ctx.font = `${fontSize}px "Geist Mono", ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(key.cap, px + pw / 2, py + ph / 2 + 1)
    }
  }
}

interface KeyboardHeatmapProps {
  heatmap: Heatmap
  sessionLabel?: string
  isPro?: boolean
}

export default function KeyboardHeatmap({
  heatmap,
  sessionLabel,
  isPro,
}: KeyboardHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [layoutName, setLayoutName] = useState<LayoutName>('qwerty')
  const layout = KEYBOARD_LAYOUTS[layoutName]
  const logicalW = layout.cols * UNIT + PAD * 2
  const logicalH = layout.rows * UNIT + PAD * 2

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawHeatmap(canvas, heatmap, layout)
  }, [heatmap, layout])

  useLayoutEffect(() => {
    draw()
    void document.fonts.ready.then(draw)
  }, [draw])

  const exportPreset = useCallback(
    (w: number, h: number, label: string) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const offscreen = document.createElement('canvas')
      offscreen.width = w
      offscreen.height = h
      const ctx = offscreen.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      const margin = 0.08
      const availW = w * (1 - margin * 2)
      const availH = h * (1 - margin * 2)
      const scale = Math.min(availW / logicalW, availH / logicalH)
      const kw = logicalW * scale
      const kh = logicalH * scale
      const ox = (w - kw) / 2
      const oy = (h - kh) / 2
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, ox, oy, kw, kh)
      offscreen.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `commma-${label.replace(':', 'x')}-${slugify(sessionLabel ?? 'session')}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }, 'image/png')
    },
    [logicalW, logicalH, sessionLabel],
  )

  return (
    <div>
      <div className='mb-3 flex items-center gap-1'>
        {(Object.keys(LAYOUT_LABELS) as LayoutName[]).map((name) => (
          <button
            key={name}
            type='button'
            onClick={() => setLayoutName(name)}
            className={[
              'h-[26px] px-2.5 rounded font-mono text-[10px] uppercase tracking-wider transition-colors',
              layoutName === name
                ? 'bg-accent/15 text-accent border border-accent/40'
                : 'text-ink-mute border border-transparent hover:text-ink-soft hover:border-rule',
            ].join(' ')}
          >
            {LAYOUT_LABELS[name]}
          </button>
        ))}
      </div>
      <div className='rounded border border-rule bg-paper/40'>
        <div className='relative overflow-x-auto p-3 sm:p-4'>
          <canvas
            ref={canvasRef}
            className='mx-auto block'
            style={{ width: `${logicalW}px`, height: `${logicalH}px` }}
          />
          <div className='pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-paper/90 to-transparent sm:hidden' />
        </div>
      </div>
      <p className='mt-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-ink-faint sm:hidden'>
        swipe to explore
      </p>
      {isPro ? (
        <div className='mt-4 flex items-center justify-end gap-2'>
          <span className='font-mono text-[10px] uppercase tracking-wider text-ink-faint'>
            Export
          </span>
          {PRESETS.map(({ label, w, h }) => (
            <button
              key={label}
              type='button'
              onClick={() => exportPreset(w, h, label)}
              className='group inline-flex items-center gap-1.5 h-[32px] px-3 rounded-full font-mono text-[11px] uppercase tracking-wider text-ink-soft border border-rule-strong hover:text-paper hover:bg-accent hover:border-accent transition-colors'
            >
              {label}
              <span className='inline-block transition-transform group-hover:translate-y-0.5'>
                ↓
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className='mt-4 flex items-center justify-end'>
          <Link
            to='/pricing'
            className='group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-mute hover:text-ink transition-colors'
          >
            PNG export
            <span className='font-mono text-[10px] tracking-[0.18em] uppercase text-accent-2 border border-accent-2-line bg-accent-2-soft px-2 py-0.5 rounded-full'>
              Pro
            </span>
            <span className='inline-block transition-transform group-hover:translate-x-0.5'>
              →
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
