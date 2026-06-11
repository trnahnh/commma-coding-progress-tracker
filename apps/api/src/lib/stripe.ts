import Stripe from 'stripe'
import { env } from '../env.js'
import type { PriceTable } from './billing.js'

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null

export const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET ?? null

export const priceTable: PriceTable = {
  pro: {
    monthly: env.STRIPE_PRICE_PRO_MONTHLY,
    yearly: env.STRIPE_PRICE_PRO_YEARLY,
  },
  team: {
    monthly: env.STRIPE_PRICE_TEAM_MONTHLY,
    yearly: env.STRIPE_PRICE_TEAM_YEARLY,
  },
}
