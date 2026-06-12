import webpush from 'web-push'
import { env } from '../env.js'

let configured = false

function configure(): boolean {
  if (configured) return true
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return false
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  configured = true
  return true
}

export function isWebPushEnabled(): boolean {
  return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT)
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
): Promise<'sent' | 'expired'> {
  if (!configure()) throw new Error('Web Push not configured')
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
    )
    return 'sent'
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 410 || status === 404) return 'expired'
    throw err
  }
}
