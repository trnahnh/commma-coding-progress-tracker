import { useCallback, useLayoutEffect, useRef } from 'react'
import { QWERTY_LAYOUT } from '@commma/shared'
import type { KeyboardHeatmap as Heatmap } from '../lib/api'

const PRESETS = [
  { label: '1:1', w: 1080, h: 1080 },
  { label: '9:16', w: 1080, h: 1920 },
  { label: '16:9', w: 1920, h: 1080 },
] as const

const UNIT = 46
const PAD = 16
const GAP = 3
const RADIUS = 6

const LOGICAL_W = QWERTY_LAYOUT.cols * UNIT + PAD * 2
const LOGICAL_H = QWERTY_LAYOUT.rows * UNIT + PAD * 2

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

interface KeyboardHeatmapProps {
  heatmap: Heatmap
  sessionLabel?: string
}

export default function KeyboardHeatmap({
  heatmap,
  sessionLabel,
}: KeyboardHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(LOGICAL_W * dpr)
    canvas.height = Math.round(LOGICAL_H * dpr)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H)

    const counts = heatmap.counts
    let max = 0
    for (const key of QWERTY_LAYOUT.keys) {
      if (key.label) max = Math.max(max, counts[key.label] ?? 0)
    }

    for (const key of QWERTY_LAYOUT.keys) {
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
  }, [heatmap])

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
      const scale = Math.min(availW / LOGICAL_W, availH / LOGICAL_H)
      const kw = LOGICAL_W * scale
      const kh = LOGICAL_H * scale
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
    [sessionLabel],
  )

  return (
    <div>
      <div className='overflow-hidden rounded border border-rule bg-paper/40 p-3 sm:p-4'>
        <canvas
          ref={canvasRef}
          className='mx-auto block'
          style={{ width: '100%', height: 'auto', maxWidth: `${LOGICAL_W}px` }}
        />
      </div>
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
    </div>
  )
}
