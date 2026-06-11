export type PaidPlan = 'pro' | 'team'
export type BillingInterval = 'monthly' | 'yearly'
export type Plan = 'free' | PaidPlan
export type PriceTable = Record<
  PaidPlan,
  Record<BillingInterval, string | undefined>
>

const PAID_PLANS: readonly PaidPlan[] = ['pro', 'team']
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

export function priceIdFor(
  table: PriceTable,
  plan: PaidPlan,
  interval: BillingInterval,
): string | undefined {
  return table[plan][interval]
}

export function planForPriceId(
  table: PriceTable,
  priceId: string,
): PaidPlan | null {
  for (const plan of PAID_PLANS) {
    const intervals = table[plan]
    if (intervals.monthly === priceId || intervals.yearly === priceId)
      return plan
  }
  return null
}

export function planFromSubscription(
  table: PriceTable,
  status: string,
  priceId: string | undefined,
): Plan {
  if (!ACTIVE_STATUSES.has(status)) return 'free'
  if (!priceId) return 'free'
  return planForPriceId(table, priceId) ?? 'free'
}
