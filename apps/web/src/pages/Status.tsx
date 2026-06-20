import { useEffect, useState } from 'react'
import { Shell, LiveDot } from '../components/chrome'
import { getStatus, type SystemStatus } from '../lib/api'
import { useSeo } from '../lib/seo'

type Phase = 'loading' | 'ready' | 'unreachable'
type CellStatus = 'ok' | 'down' | 'unknown' | 'live' | 'loading'

interface Cell {
  name: string
  status: CellStatus
}

const POLL_MS = 45_000

function cells(phase: Phase, data: SystemStatus | null): Cell[] {
  if (phase === 'loading') {
    return [
      { name: 'commma API', status: 'loading' },
      { name: 'Database (Neon PostgreSQL)', status: 'loading' },
      { name: 'Cache (Upstash Redis)', status: 'loading' },
      { name: 'Web App', status: 'ok' },
      { name: 'VS Code Marketplace', status: 'live' },
    ]
  }
  if (phase === 'unreachable' || !data) {
    return [
      { name: 'commma API', status: 'down' },
      { name: 'Database (Neon PostgreSQL)', status: 'unknown' },
      { name: 'Cache (Upstash Redis)', status: 'unknown' },
      { name: 'Web App', status: 'ok' },
      { name: 'VS Code Marketplace', status: 'live' },
    ]
  }
  return [
    { name: 'commma API', status: 'ok' },
    { name: 'Database (Neon PostgreSQL)', status: data.db === 'ok' ? 'ok' : 'down' },
    { name: 'Cache (Upstash Redis)', status: data.cache === 'ok' ? 'ok' : 'down' },
    { name: 'Web App', status: 'ok' },
    { name: 'VS Code Marketplace', status: 'live' },
  ]
}

const STATUS_LABEL: Record<Exclude<CellStatus, 'loading'>, string> = {
  ok: 'Operational',
  down: 'Down',
  unknown: 'Unknown',
  live: 'Live',
}

function dotClass(status: Exclude<CellStatus, 'loading'>): string {
  if (status === 'down') return 'bg-accent'
  if (status === 'unknown') return 'bg-ink-faint'
  return 'bg-live'
}

function labelClass(status: Exclude<CellStatus, 'loading'>): string {
  if (status === 'down') return 'text-accent'
  if (status === 'unknown') return 'text-ink-mute'
  return 'text-ink-soft'
}

export default function Status() {
  useSeo({
    title: 'Status · commma',
    description: 'Live status for the commma API, web app, and ingest pipeline.',
  })

  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<SystemStatus | null>(null)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    async function probe() {
      try {
        const result = await getStatus()
        if (!active) return
        setData(result)
        setPhase('ready')
        setCheckedAt(result.ts)
      } catch {
        if (!active) return
        setData(null)
        setPhase('unreachable')
        setCheckedAt(Date.now())
      }
    }
    void probe()
    const id = setInterval(() => void probe(), POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const rows = cells(phase, data)
  const allOk =
    phase === 'ready' && !!data && data.db === 'ok' && data.cache === 'ok'

  let banner: { text: string; color: 'live' | 'accent' }
  if (phase === 'loading') {
    banner = { text: 'Checking systems…', color: 'live' }
  } else if (phase === 'unreachable') {
    banner = { text: 'API unreachable', color: 'accent' }
  } else if (allOk) {
    banner = { text: 'All systems operational', color: 'live' }
  } else {
    banner = { text: 'Service degraded', color: 'accent' }
  }

  const heading = allOk || phase === 'loading' ? 'All systems' : 'Service'
  const headingEm = allOk || phase === 'loading' ? 'operational.' : 'degraded.'

  return (
    <Shell>
      <div className='max-w-[680px] mx-auto'>
        <p className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute m-0 mb-6'>
          System Status
        </p>
        <h1 className='font-serif font-normal text-[clamp(36px,6vw,80px)] leading-[0.95] tracking-[-0.03em] m-0 mb-4 text-ink lift-text'>
          {heading} <em className='italic text-accent'>{headingEm}</em>
        </h1>
        <p className='font-sans text-[16px] leading-relaxed text-ink-soft m-0 mb-12 max-w-[48ch]'>
          commma is live on AWS — EC2 t4g (API), S3 + CloudFront (web), Neon
          Postgres, Upstash Redis — free and open in early access. The VS Code
          extension is live on the Marketplace.
        </p>

        <div className='border border-rule-strong rounded-lg overflow-hidden surface mb-8'>
          <div className='flex items-center justify-between gap-3 px-5 sm:px-7 py-4 bg-paper-2 border-b border-rule'>
            <span className='flex items-center gap-3 min-w-0'>
              <LiveDot color={banner.color} />
              <span className='font-mono text-[13px] text-ink-soft tracking-wide truncate'>
                {banner.text}
              </span>
            </span>
            {checkedAt && (
              <span className='font-mono text-[12px] text-ink-mute tracking-wide shrink-0 tnum'>
                {new Date(checkedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          {rows.map((c, i) => (
            <div
              key={c.name}
              className={`flex items-center justify-between px-5 sm:px-7 py-4 gap-4 ${i < rows.length - 1 ? 'border-b border-rule' : ''}`}
            >
              <span className='font-mono text-[14px] text-ink min-w-0 truncate'>
                {c.name}
              </span>
              {c.status === 'loading' ? (
                <span className='h-3 w-24 rounded bg-paper-3 animate-pulse shrink-0' />
              ) : (
                <span className='flex items-center gap-2 shrink-0'>
                  <span
                    className={`w-[7px] h-[7px] rounded-full ${dotClass(c.status)}`}
                  />
                  <span
                    className={`font-mono text-[12px] tracking-[0.14em] uppercase ${labelClass(c.status)}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>

        <p className='font-mono text-[13px] text-ink-mute'>
          Incidents or outages?{' '}
          <a
            href='mailto:anhdtran.forwork@gmail.com?subject=commma status'
            className='text-accent hover:text-ink-soft transition-colors'
          >
            Contact us
          </a>
          .
        </p>
      </div>
    </Shell>
  )
}
