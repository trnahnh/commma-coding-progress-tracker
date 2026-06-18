import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { QWERTY_LAYOUT, type LayoutKey } from '@commma/shared'

const W = 1200
const H = 630

const INK = '#efead8'
const INK_SOFT = '#c9c2ad'
const INK_MUTE = '#7a746a'
const PAPER = '#0c0b08'
const PAPER_2 = '#131210'
const RULE = '#221f1a'
const RULE_STRONG = '#2d2922'
const ACCENT = '#ff4d1a'

const COLD_FILL: [number, number, number] = [26, 24, 20]
const COLD_BORDER: [number, number, number] = [45, 41, 34]
const COLD_TEXT: [number, number, number] = [122, 116, 106]
const HOT_FILL: [number, number, number] = [255, 77, 26]
const HOT_TEXT: [number, number, number] = [255, 244, 236]

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const v = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${v})`
}

const SEED_HEAT = new Map<string, number>([
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
])

const UNIT = 34
const PAD = 16
const GAP = 3
const KB_W = QWERTY_LAYOUT.cols * UNIT + PAD * 2

const PANEL_X = 460
const PANEL_Y = 160
const PANEL_W = 700
const PANEL_H = 310
const KB_X = PANEL_X + (PANEL_W - KB_W) / 2
const KB_Y = PANEL_Y + 56

function renderKey(key: LayoutKey): string {
  const heat = key.label ? SEED_HEAT.get(key.label) ?? 0 : 0
  const t = Math.sqrt(heat)
  const fill = mix(COLD_FILL, HOT_FILL, t)
  const stroke = mix(COLD_BORDER, HOT_FILL, Math.min(1, t * 0.85))
  const x = KB_X + PAD + key.x * UNIT + GAP
  const y = KB_Y + PAD + key.y * UNIT + GAP
  const w = key.w * UNIT - GAP * 2
  const h = key.h * UNIT - GAP * 2
  const rect = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
  if (key.cap.length !== 1 || !/[A-Za-z0-9]/.test(key.cap)) return rect
  const textColor = mix(COLD_TEXT, HOT_TEXT, t)
  const cx = x + w / 2
  const cy = y + h / 2 + 3.5
  const text = `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-family="Consolas, 'Courier New', monospace" font-size="11" fill="${textColor}" text-anchor="middle">${key.cap}</text>`
  return rect + text
}

const keysSvg = QWERTY_LAYOUT.keys.map(renderKey).join('')

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glowTop" cx="20%" cy="0%" r="65%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBottom" cx="85%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#863bff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#863bff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect width="${W}" height="${H}" fill="url(#glowTop)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBottom)"/>

  <text x="72" y="180" font-family="Consolas, 'Courier New', monospace" font-size="16" letter-spacing="3" fill="${INK_MUTE}">FREE EARLY ACCESS</text>

  <text x="70" y="305" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="${INK}">commma<tspan font-size="100" fill="${ACCENT}" dx="2">,</tspan></text>

  <text x="72" y="382" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${INK}">Every keystroke</text>
  <text x="72" y="434" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${INK}">leaves a <tspan font-style="italic" fill="${ACCENT}">mark.</tspan></text>

  <text x="72" y="488" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="${INK_SOFT}">Track your coding like an athlete.</text>

  <line x1="72" y1="525" x2="420" y2="525" stroke="${RULE}" stroke-width="1"/>
  <circle cx="78" cy="556" r="4" fill="${ACCENT}"/>
  <text x="92" y="560" font-family="Consolas, 'Courier New', monospace" font-size="15" letter-spacing="2" fill="${INK_MUTE}">COMMMA.DEV</text>

  <rect x="${PANEL_X}" y="${PANEL_Y}" width="${PANEL_W}" height="${PANEL_H}" rx="20" fill="${PAPER_2}" stroke="${RULE_STRONG}" stroke-width="1.5"/>
  <circle cx="${PANEL_X + 28}" cy="${PANEL_Y + 30}" r="4" fill="${ACCENT}"/>
  <text x="${PANEL_X + 42}" y="${PANEL_Y + 35}" font-family="Consolas, 'Courier New', monospace" font-size="15" letter-spacing="2" fill="${ACCENT}">LIVE HEATMAP</text>
  <line x1="${PANEL_X + 1}" y1="${PANEL_Y + 50}" x2="${PANEL_X + PANEL_W - 1}" y2="${PANEL_Y + 50}" stroke="${RULE}" stroke-width="1"/>

  ${keysSvg}
</svg>`

const outPath = fileURLToPath(new URL('../public/og-image.png', import.meta.url))
await sharp(Buffer.from(svg)).png({ quality: 92 }).toFile(outPath)
console.log(`wrote ${outPath}`)
