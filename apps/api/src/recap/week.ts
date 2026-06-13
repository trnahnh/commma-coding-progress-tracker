export interface RecapWindow {
  start: Date
  end: Date
  weekStart: string
}

function startOfUTCDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000)
}

export function lastCompletedWeek(now: Date): RecapWindow {
  const today = startOfUTCDay(now)
  const offsetToMonday = (today.getUTCDay() + 6) % 7
  const currentMonday = addDays(today, -offsetToMonday)
  const start = addDays(currentMonday, -7)
  return { start, end: currentMonday, weekStart: start.toISOString().slice(0, 10) }
}

export function priorWeekOf(window: RecapWindow): RecapWindow {
  const start = addDays(window.start, -7)
  return {
    start,
    end: window.start,
    weekStart: start.toISOString().slice(0, 10),
  }
}

export function isRecapSendTime(now: Date, sendHourUTC: number): boolean {
  return now.getUTCDay() === 1 && now.getUTCHours() >= sendHourUTC
}
