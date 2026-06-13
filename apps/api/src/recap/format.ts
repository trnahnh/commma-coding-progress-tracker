export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`
}

export function weekOverWeekPct(
  current: number,
  prior: number,
): number | null {
  if (prior <= 0) return null
  return Math.round(((current - prior) / prior) * 100)
}
