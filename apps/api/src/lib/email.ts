import { Resend } from 'resend'
import { env } from '../env.js'

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export function isEmailEnabled(): boolean {
  return !!(resend && env.RECAP_FROM_EMAIL)
}

export async function sendEmail(message: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<'sent' | 'failed'> {
  if (!resend || !env.RECAP_FROM_EMAIL) return 'failed'
  const { error } = await resend.emails.send({
    from: env.RECAP_FROM_EMAIL,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  })
  return error ? 'failed' : 'sent'
}
