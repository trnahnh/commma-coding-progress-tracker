import { spawn } from 'node:child_process'
import * as http from 'node:http'
import type { AddressInfo } from 'node:net'
import { authPage } from '@commma/shared/authPage'
import { ui } from './ui.js'

const LOOPBACK_TIMEOUT_MS = 5 * 60 * 1000

const SUCCESS_PAGE = authPage({ ok: true })

const FAILURE_PAGE = authPage({ ok: false })

function openBrowser(url: string): void {
  const platform = process.platform
  const command =
    platform === 'darwin'
      ? 'open'
      : platform === 'win32'
        ? 'cmd'
        : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true })
    child.on('error', () => void 0)
    child.unref()
  } catch {
    void 0
  }
}

export function runLoopbackLogin(apiBaseUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      server.close()
      resolve(value)
    }

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname !== '/callback') {
        res.writeHead(404).end()
        return
      }
      const code = url.searchParams.get('code')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (!code) {
        res.end(FAILURE_PAGE)
        finish(null)
        return
      }
      res.end(SUCCESS_PAGE)
      finish(code)
    })

    const timer = setTimeout(() => finish(null), LOOPBACK_TIMEOUT_MS)
    server.on('error', () => finish(null))

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      const authUrl = new URL(`${apiBaseUrl}/v1/auth/github`)
      authUrl.searchParams.set('redirect_uri', `http://127.0.0.1:${port}/callback`)
      const target = authUrl.toString()
      ui.info('Opening your browser to sign in with GitHub...')
      ui.line(`If it does not open, visit:\n  ${target}`)
      openBrowser(target)
    })
  })
}
