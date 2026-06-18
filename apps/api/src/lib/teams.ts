import type { KeyboardHeatmap } from '@commma/db'

export const TEAM_MAX_MEMBERS = 5

export const TEAM_MAX_OWNED = 1

export type TeamRole = 'owner' | 'member'

export const TEAM_SLUG_RE = /^[a-z0-9-]{1,39}$/

export function isValidSlug(slug: string): boolean {
  return TEAM_SLUG_RE.test(slug)
}

export function canManageTeam(role: string): boolean {
  return role === 'owner'
}

export function isTeamFrozen(ownerPlan: string): boolean {
  return ownerPlan !== 'team'
}

export function mergeHeatmaps(maps: KeyboardHeatmap[]): KeyboardHeatmap {
  const counts: Record<string, number> = {}
  for (const map of maps) {
    const source = map?.counts
    if (!source) continue
    for (const [key, value] of Object.entries(source)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      counts[key] = (counts[key] ?? 0) + value
    }
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const freq: Record<string, number> = {}
  if (total > 0) {
    for (const [key, value] of Object.entries(counts)) {
      freq[key] = value / total
    }
  }

  return { counts, freq, total }
}
