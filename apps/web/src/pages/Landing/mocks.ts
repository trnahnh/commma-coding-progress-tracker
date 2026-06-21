import { type StreamEntry } from '../../lib/api'
import { type SessionView } from './Activity'

export const MOCK_SESSION: SessionView = {
  id: null,
  date: 'Tue · May 26, 2026',
  shortDate: 'May 26, 2026',
  startedAt: '08:42',
  title: 'Long base — ingest pipeline refactor',
  subtitle: 'with a brief detour through the schema package',
  duration: '2h 18m',
  lines: 1247,
  pace: 184,
  peakCpm: 241,
  langs: [
    {
      name: 'TypeScript',
      time: '1h 12m',
      pct: 52,
      swatch: 'var(--color-accent)',
    },
    { name: 'Python', time: '31m', pct: 22, swatch: 'var(--color-live)' },
    { name: 'SQL', time: '18m', pct: 13, swatch: 'var(--color-ink)' },
    { name: 'Markdown', time: '17m', pct: 13, swatch: 'var(--color-ink-mute)' },
  ],
  files: [
    { name: 'sessions.ts', path: 'apps/api/src/', changes: 423 },
    { name: 'events.ts', path: 'packages/shared/src/', changes: 218 },
    { name: 'tracker.ts', path: 'apps/extension/src/', changes: 156 },
    { name: 'schema.sql', path: 'packages/db/migrations/', changes: 94 },
  ],
}

export const MOCK_CHART = [
  20, 15, 25, 40, 55, 70, 85, 90, 75, 60, 50, 65, 80, 95, 110, 120, 130, 125,
  115, 100, 85, 70, 55, 40, 35, 30, 35, 40, 50, 60, 75, 90, 105, 115, 125, 135,
  140, 145, 140, 130, 120, 110, 100, 95, 100, 110, 120, 130, 135, 130, 120, 105,
  90, 75, 60, 50, 45, 50, 65, 80,
]

export const MOCK_TICKER: Pick<StreamEntry, 'who' | 'what' | 'em'>[] = [
  { who: 'northbound', what: 'finished a 2h 14m session in', em: 'Go' },
  { who: 'lumen.dev', what: 'hit a', em: '54-day streak' },
  { who: 'inkpaper', what: 'shipped', em: 'feat: shimmer transitions' },
  { who: 'falsetto', what: '+1,204 lines in', em: 'Rust' },
  { who: 'aprilsink', what: 'earned the', em: 'dawn patrol' },
  { who: 'yoursquid', what: 'started a session in', em: 'TypeScript' },
]
