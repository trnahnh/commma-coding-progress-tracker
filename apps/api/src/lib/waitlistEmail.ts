import { env } from '../env.js'

export interface WaitlistEmail {
  subject: string
  html: string
  text: string
}

export function composeWaitlistEmail(): WaitlistEmail {
  const subject = 'You’re on the commma waitlist'
  const home = env.WEB_ORIGIN
  const install = 'https://marketplace.visualstudio.com'

  const html = `<!doctype html><html><body style="margin:0;background:#1a1714;padding:24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#221e1a;border-radius:12px;padding:28px"><tr><td><p style="margin:0 0 4px;color:#ff4d1a;font-size:13px;letter-spacing:0.08em;text-transform:uppercase">commma</p><h1 style="margin:0 0 16px;color:#efead8;font-size:22px;line-height:1.25">You made the list.</h1><p style="margin:0 0 16px;color:#cfc8ba;font-size:15px;line-height:1.5">Thanks for signing up. commma turns every coding session into a tracked sport — pace, splits, streaks, leaderboards, and a shareable keyboard heatmap.</p><p style="margin:0 0 20px;color:#cfc8ba;font-size:15px;line-height:1.5">We roll out access in waves. Your invite lands in this inbox the moment the next one opens — no spam in between.</p><a href="${install}" style="display:inline-block;background:#ff4d1a;color:#1a1714;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">Install the extension</a><p style="margin:24px 0 0;color:#7a746a;font-size:12px;line-height:1.5">You’re receiving this because you joined the waitlist at ${home}. If this wasn’t you, ignore this email and you won’t hear from us again.</p></td></tr></table></body></html>`

  const text = `You made the list.\n\nThanks for signing up to commma. We roll out access in waves — your invite lands in this inbox the moment the next one opens.\n\nInstall the extension: ${install}\n\nYou're receiving this because you joined the waitlist at ${home}. If this wasn't you, ignore this email.`

  return { subject, html, text }
}
