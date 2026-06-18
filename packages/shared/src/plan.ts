export type Plan = 'free' | 'pro' | 'team'

export function hasProAccess(plan: string, freeMode: boolean): boolean {
  return freeMode || plan === 'pro' || plan === 'team'
}

export function hasTeamAccess(plan: string, freeMode: boolean): boolean {
  return freeMode || plan === 'team'
}
