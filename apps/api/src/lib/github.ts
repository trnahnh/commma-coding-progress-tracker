import { z } from 'zod'

const tokenResponseSchema = z.object({ access_token: z.string() })

const userResponseSchema = z.object({
  id: z.number(),
  login: z.string(),
  email: z.string().email().nullable(),
  avatar_url: z.string().url(),
})

const emailsResponseSchema = z.array(
  z.object({
    email: z.string().email(),
    primary: z.boolean(),
    verified: z.boolean(),
  }),
)

export interface GithubUser {
  githubId: string
  login: string
  email: string | null
  avatarUrl: string
}

export async function exchangeCode(params: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
  })
  if (!res.ok) throw new Error('github_token_exchange_failed')
  return tokenResponseSchema.parse(await res.json()).access_token
}

export async function fetchGithubUser(
  accessToken: string,
): Promise<GithubUser> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'commma',
  }
  const userRes = await fetch('https://api.github.com/user', { headers })
  if (!userRes.ok) throw new Error('github_user_fetch_failed')
  const user = userResponseSchema.parse(await userRes.json())

  let email = user.email
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers,
    })
    if (emailsRes.ok) {
      const emails = emailsResponseSchema.parse(await emailsRes.json())
      email = emails.find((e) => e.primary && e.verified)?.email ?? null
    }
  }

  return {
    githubId: String(user.id),
    login: user.login,
    email,
    avatarUrl: user.avatar_url,
  }
}
