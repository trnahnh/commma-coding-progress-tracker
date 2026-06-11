import { describe, expect, it } from 'vitest'
import {
  planForPriceId,
  planFromSubscription,
  priceIdFor,
  type PriceTable,
} from '../../src/lib/billing.js'

const TABLE: PriceTable = {
  pro: { monthly: 'price_pro_m', yearly: 'price_pro_y' },
  team: { monthly: 'price_team_m', yearly: 'price_team_y' },
}

describe('priceIdFor', () => {
  it('resolves each plan and interval to its price', () => {
    expect(priceIdFor(TABLE, 'pro', 'monthly')).toBe('price_pro_m')
    expect(priceIdFor(TABLE, 'pro', 'yearly')).toBe('price_pro_y')
    expect(priceIdFor(TABLE, 'team', 'monthly')).toBe('price_team_m')
    expect(priceIdFor(TABLE, 'team', 'yearly')).toBe('price_team_y')
  })

  it('returns undefined when a price is not configured', () => {
    const partial: PriceTable = {
      pro: { monthly: undefined, yearly: undefined },
      team: { monthly: undefined, yearly: undefined },
    }
    expect(priceIdFor(partial, 'pro', 'monthly')).toBeUndefined()
  })
})

describe('planForPriceId', () => {
  it('maps a price back to its plan regardless of interval', () => {
    expect(planForPriceId(TABLE, 'price_pro_y')).toBe('pro')
    expect(planForPriceId(TABLE, 'price_team_m')).toBe('team')
  })

  it('returns null for an unknown price', () => {
    expect(planForPriceId(TABLE, 'price_unknown')).toBeNull()
  })
})

describe('planFromSubscription', () => {
  it('grants the plan while the subscription is active', () => {
    expect(planFromSubscription(TABLE, 'active', 'price_pro_m')).toBe('pro')
    expect(planFromSubscription(TABLE, 'trialing', 'price_team_y')).toBe('team')
  })

  it('keeps access during the past_due grace period', () => {
    expect(planFromSubscription(TABLE, 'past_due', 'price_pro_m')).toBe('pro')
  })

  it('downgrades to free for inactive statuses', () => {
    expect(planFromSubscription(TABLE, 'canceled', 'price_pro_m')).toBe('free')
    expect(planFromSubscription(TABLE, 'unpaid', 'price_team_m')).toBe('free')
    expect(
      planFromSubscription(TABLE, 'incomplete_expired', 'price_pro_y'),
    ).toBe('free')
  })

  it('downgrades to free when the price is missing or unknown', () => {
    expect(planFromSubscription(TABLE, 'active', undefined)).toBe('free')
    expect(planFromSubscription(TABLE, 'active', 'price_unknown')).toBe('free')
  })
})
