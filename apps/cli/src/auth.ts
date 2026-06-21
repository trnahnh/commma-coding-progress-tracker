import {
  clearCredentials,
  readCredentials,
  writeCredentials,
} from './config.js'
import { runLoopbackLogin } from './loopback.js'

const ACCESS_TTL_MS = 14 * 60 * 1000
const ACCESS_SKEW_MS = 60 * 1000

interface ExchangeResponse {
  access_token: string
  refresh_token: string
  user?: { handle?: string }
}

interface RefreshResponse {
  access_token: string
  refresh_token?: string
}

export class Auth {
  private accessToken: string | null = null
  private accessExpiresAt = 0

  constructor(private readonly apiBaseUrl: string) {}

  isSignedIn(): boolean {
    return readCredentials() !== null
  }

  signedInHandle(): string | undefined {
    return readCredentials()?.handle
  }

  async login(): Promise<string | null> {
    const code = await runLoopbackLogin(this.apiBaseUrl)
    if (!code) return null

    const res = await fetch(`${this.apiBaseUrl}/v1/auth/cli/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    if (!res.ok) throw new Error(`exchange_failed_${res.status}`)

    const data = (await res.json()) as ExchangeResponse
    writeCredentials({
      refreshToken: data.refresh_token,
      handle: data.user?.handle,
    })
    this.setAccess(data.access_token)
    return data.user?.handle ?? null
  }

  async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.accessExpiresAt - ACCESS_SKEW_MS) {
      return this.accessToken
    }
    return this.refresh()
  }

  async refresh(): Promise<string | null> {
    const credentials = readCredentials()
    if (!credentials) return null

    let res: Response
    try {
      res = await fetch(`${this.apiBaseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: credentials.refreshToken }),
      })
    } catch {
      return null
    }

    if (res.status === 401) {
      clearCredentials()
      this.accessToken = null
      this.accessExpiresAt = 0
      return null
    }
    if (!res.ok) return null

    const data = (await res.json()) as RefreshResponse
    if (data.refresh_token) {
      writeCredentials({
        refreshToken: data.refresh_token,
        handle: credentials.handle,
      })
    }
    this.setAccess(data.access_token)
    return data.access_token
  }

  async logout(): Promise<void> {
    const credentials = readCredentials()
    const accessToken = await this.getAccessToken()
    if (credentials && accessToken) {
      try {
        await fetch(`${this.apiBaseUrl}/v1/auth/signout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh_token: credentials.refreshToken }),
        })
      } catch {
        void 0
      }
    }
    clearCredentials()
    this.accessToken = null
    this.accessExpiresAt = 0
  }

  private setAccess(token: string): void {
    this.accessToken = token
    this.accessExpiresAt = Date.now() + ACCESS_TTL_MS
  }
}
