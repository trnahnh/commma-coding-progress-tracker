import { env } from '../env.js'
import type { RecapStats } from './aggregate.js'
import { formatDuration } from './format.js'
import type { RecapProse } from './prose.js'

export interface RecapEmail {
  subject: string
  html: string
  text: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface StatLine {
  label: string
  value: string
}

function statLines(stats: RecapStats): StatLine[] {
  const lines: StatLine[] = [
    { label: 'Sessions', value: String(stats.sessionCount) },
    { label: 'Coding time', value: formatDuration(stats.totalDurationS) },
    { label: 'Best session', value: formatDuration(stats.bestDurationS) },
  ]
  if (stats.topLang) lines.push({ label: 'Top language', value: stats.topLang })
  if (stats.currentStreakDays > 0) {
    lines.push({
      label: 'Streak',
      value: `${stats.currentStreakDays} day${stats.currentStreakDays === 1 ? '' : 's'}`,
    })
  }
  return lines
}

export function composeRecapEmail(
  stats: RecapStats,
  prose: RecapProse,
): RecapEmail {
  const lines = statLines(stats)
  const bestUrl = stats.bestSessionId
    ? `${env.WEB_ORIGIN}/sessions/${stats.bestSessionId}`
    : env.WEB_ORIGIN

  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0;color:#9b958a;font-size:14px">${escapeHtml(l.label)}</td><td style="padding:6px 0;text-align:right;color:#efead8;font-size:14px;font-weight:600">${escapeHtml(l.value)}</td></tr>`,
    )
    .join('')

  const html = `<!doctype html><html><body style="margin:0;background:#1a1714;padding:24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#221e1a;border-radius:12px;padding:28px"><tr><td><p style="margin:0 0 4px;color:#ff4d1a;font-size:13px;letter-spacing:0.08em;text-transform:uppercase">commma weekly</p><h1 style="margin:0 0 16px;color:#efead8;font-size:22px;line-height:1.25">${escapeHtml(prose.headline)}</h1><p style="margin:0 0 20px;color:#cfc8ba;font-size:15px;line-height:1.5">${escapeHtml(prose.note)}</p><table role="presentation" width="100%">${rows}</table><a href="${bestUrl}" style="display:inline-block;margin-top:24px;background:#ff4d1a;color:#1a1714;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">View your best session</a></td></tr></table></body></html>`

  const textLines = lines.map((l) => `${l.label}: ${l.value}`).join('\n')
  const text = `${prose.headline}\n\n${prose.note}\n\n${textLines}\n\nView your best session: ${bestUrl}`

  return { subject: prose.headline, html, text }
}
