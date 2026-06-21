import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { privacyModeSchema, type PrivacyMode } from '@commma/shared'

const DEFAULT_API_BASE_URL = 'https://api.commma.dev'

export interface Credentials {
  refreshToken: string
  handle?: string
}

export function configDir(): string {
  return process.env.COMMMA_CONFIG_DIR ?? join(homedir(), '.commma')
}

function credentialsPath(): string {
  return join(configDir(), 'credentials.json')
}

export function queuePath(): string {
  return join(configDir(), 'queue.json')
}

export function apiBaseUrl(override?: string): string {
  const value = override ?? process.env.COMMMA_API_URL ?? DEFAULT_API_BASE_URL
  return value.replace(/\/+$/, '')
}

export function resolvePrivacy(override?: string): PrivacyMode {
  const value = override ?? process.env.COMMMA_PRIVACY ?? 'full'
  const parsed = privacyModeSchema.safeParse(value)
  return parsed.success ? parsed.data : 'full'
}

function ensureDir(): void {
  const dir = configDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
}

export function readCredentials(): Credentials | null {
  const path = credentialsPath()
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<Credentials>
    if (typeof raw.refreshToken !== 'string' || raw.refreshToken.length === 0) {
      return null
    }
    return {
      refreshToken: raw.refreshToken,
      handle: typeof raw.handle === 'string' ? raw.handle : undefined,
    }
  } catch {
    return null
  }
}

export function writeCredentials(credentials: Credentials): void {
  ensureDir()
  const path = credentialsPath()
  writeFileSync(path, JSON.stringify(credentials, null, 2), { mode: 0o600 })
  try {
    chmodSync(path, 0o600)
  } catch {
    void 0
  }
}

export function clearCredentials(): void {
  const path = credentialsPath()
  if (existsSync(path)) rmSync(path)
}
