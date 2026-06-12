import { Hono } from 'hono'
import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type Stripe from 'stripe'
import { users } from '@commma/db'
import { db } from '../db.js'
import { env } from '../env.js'
import { log } from '../logger.js'
import { apiError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit, userKey } from '../middleware/rateLimit.js'
import { priceTable, stripe, stripeWebhookSecret } from '../lib/stripe.js'
import { planFromSubscription, priceIdFor } from '../lib/billing.js'
import type { AppEnv } from '../types.js'

export const billingRoutes = new Hono<AppEnv>()

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'team']),
  interval: z.enum(['monthly', 'yearly']),
})

function customerId(
  ref: string | Stripe.Customer | Stripe.DeletedCustomer,
): string {
  return typeof ref === 'string' ? ref : ref.id
}

function optionalId(
  ref: string | Stripe.Subscription | null | undefined,
): string | null {
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id
}

billingRoutes.post(
  '/checkout',
  requireAuth,
  rateLimit({ scope: 'write', limit: 30, windowS: 3600, key: userKey }),
  zValidator('json', checkoutSchema, (result, c) => {
    if (!result.success)
      return apiError(
        c,
        'VALIDATION_ERROR',
        'Invalid checkout request',
        result.error.issues,
      )
  }),
  async (c) => {
    if (!stripe)
      return apiError(c, 'SERVICE_UNAVAILABLE', 'Billing is not configured')
    const userId = c.get('userId')
    const { plan, interval } = c.req.valid('json')

    const priceId = priceIdFor(priceTable, plan, interval)
    if (!priceId)
      return apiError(
        c,
        'SERVICE_UNAVAILABLE',
        'Selected plan is not available',
      )

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user) return apiError(c, 'NOT_FOUND', 'User not found')

    if (user.plan !== 'free' || user.stripeSubscriptionId)
      return apiError(
        c,
        'CONFLICT',
        'You already have an active subscription. Manage it from the billing portal.',
      )

    let stripeCustomerId = user.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: { userId: user.id },
        },
        { idempotencyKey: `customer-create-${user.id}` },
      )
      stripeCustomerId = customer.id
      await db
        .update(users)
        .set({ stripeCustomerId })
        .where(eq(users.id, userId))
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: user.id,
        metadata: { userId: user.id, plan },
        subscription_data: { metadata: { userId: user.id, plan } },
        success_url: `${env.WEB_ORIGIN}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.WEB_ORIGIN}/pricing`,
      },
      { idempotencyKey: `checkout-${user.id}-${plan}-${interval}` },
    )

    return c.json({ url: session.url })
  },
)

billingRoutes.post(
  '/portal',
  requireAuth,
  rateLimit({ scope: 'write', limit: 30, windowS: 3600, key: userKey }),
  async (c) => {
    if (!stripe)
      return apiError(c, 'SERVICE_UNAVAILABLE', 'Billing is not configured')
    const userId = c.get('userId')

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user) return apiError(c, 'NOT_FOUND', 'User not found')
    if (!user.stripeCustomerId)
      return apiError(c, 'NOT_FOUND', 'No billing account for this user')

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.WEB_ORIGIN}/profile`,
    })

    return c.json({ url: session.url })
  },
)

billingRoutes.post('/webhook', async (c) => {
  if (!stripe || !stripeWebhookSecret)
    return apiError(c, 'SERVICE_UNAVAILABLE', 'Billing is not configured')

  const signature = c.req.header('stripe-signature')
  if (!signature) return apiError(c, 'UNAUTHORIZED', 'Missing stripe-signature')

  const payload = await c.req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      stripeWebhookSecret,
    )
  } catch (err) {
    log.warn('stripe_webhook_signature_invalid', {
      message: err instanceof Error ? err.message : String(err),
    })
    return apiError(c, 'VALIDATION_ERROR', 'Invalid webhook signature')
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const targetId = session.metadata?.userId
      const stripeCustomerId = session.customer
        ? customerId(session.customer)
        : null
      const stripeSubscriptionId = optionalId(session.subscription)
      if (targetId && (stripeCustomerId || stripeSubscriptionId)) {
        await db
          .update(users)
          .set({
            ...(stripeCustomerId && { stripeCustomerId }),
            ...(stripeSubscriptionId && { stripeSubscriptionId }),
          })
          .where(eq(users.id, targetId))
        log.info('stripe_checkout_completed', { userId: targetId })
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const stripeCustomerId = customerId(subscription.customer)
      const priceId = subscription.items.data[0]?.price.id
      const nextPlan =
        event.type === 'customer.subscription.deleted'
          ? 'free'
          : planFromSubscription(priceTable, subscription.status, priceId)
      const eventTs = new Date(event.created * 1000)
      const applied = await db
        .update(users)
        .set({
          plan: nextPlan,
          stripeSubscriptionId: nextPlan === 'free' ? null : subscription.id,
          stripeEventTs: eventTs,
        })
        .where(
          and(
            eq(users.stripeCustomerId, stripeCustomerId),
            or(isNull(users.stripeEventTs), lt(users.stripeEventTs, eventTs)),
          ),
        )
        .returning({ id: users.id })
      log.info('stripe_subscription_synced', {
        stripeCustomerId,
        plan: nextPlan,
        status: subscription.status,
        applied: applied.length > 0,
      })
      break
    }
    default:
      break
  }

  return c.json({ received: true })
})
