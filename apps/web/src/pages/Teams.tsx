import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shell, StatusPanel } from '../components/chrome'
import {
  ApiError,
  acceptInvite,
  createTeam,
  declineInvite,
  getMyTeams,
  getTeamInvites,
  type TeamInvite,
  type TeamSummary,
} from '../lib/api'
import { hasTeamAccess } from '@commma/shared'
import { useAuth } from '../lib/auth'
import { FREE_MODE } from '../lib/config'
import { useSeo } from '../lib/seo'

const TEAM_OWN_LIMIT = 2

function RoleChip({ role }: { role: string }) {
  const isOwner = role === 'owner'
  return (
    <span
      className={[
        'inline-flex items-center h-[24px] px-2.5 rounded-full font-mono text-[11px] uppercase tracking-widest border',
        isOwner
          ? 'text-accent border-accent-line bg-accent-soft'
          : 'text-ink-mute border-rule',
      ].join(' ')}
    >
      {role}
    </span>
  )
}

function FrozenBadge() {
  return (
    <span className='inline-flex items-center h-[24px] px-2.5 rounded-full font-mono text-[11px] uppercase tracking-widest border text-ink-mute border-rule bg-paper-3'>
      plan inactive
    </span>
  )
}

function InviteRow({
  invite,
  onAccept,
  onDecline,
}: {
  invite: TeamInvite
  onAccept: (id: string) => void
  onDecline: (id: string) => void
}) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)

  const handle = async (action: 'accept' | 'decline') => {
    setBusy(action)
    try {
      if (action === 'accept') {
        onAccept(invite.id)
      } else {
        onDecline(invite.id)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className='flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-8 py-4 sm:py-5 border-b border-rule last:border-b-0'>
      <div className='flex-1 min-w-0'>
        <div className='font-serif text-[18px] sm:text-[20px] leading-none tracking-[-0.01em] text-ink'>
          {invite.team.name}
        </div>
        <div className='mt-1 font-mono text-[13px] text-ink-mute'>
          invited by @{invite.invited_by}
        </div>
      </div>
      <div className='flex items-center gap-2 shrink-0'>
        <button
          type='button'
          disabled={busy !== null}
          onClick={() => void handle('accept')}
          className='inline-flex items-center h-[44px] px-4 rounded-full font-mono text-[12px] uppercase tracking-wider
            bg-accent text-paper border border-accent bevel press hover:bg-ink hover:border-ink transition-colors disabled:opacity-40'
        >
          {busy === 'accept' ? '…' : 'Accept'}
        </button>
        <button
          type='button'
          disabled={busy !== null}
          onClick={() => void handle('decline')}
          className='inline-flex items-center h-[44px] px-4 rounded-full font-mono text-[12px] uppercase tracking-wider
            text-ink-soft border border-rule-strong hover:text-ink hover:border-ink-faint transition-colors disabled:opacity-40'
        >
          {busy === 'decline' ? '…' : 'Decline'}
        </button>
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: TeamSummary }) {
  return (
    <Link
      to={`/teams/${team.slug}`}
      className='group flex flex-col gap-3 p-5 sm:p-6 border border-rule-strong rounded-lg bg-linear-to-b from-paper-2 to-paper surface lift
        hover:border-accent-line hover:from-paper-3 transition-all'
    >
      <div className='flex items-start justify-between gap-2'>
        <span className='font-serif text-[20px] sm:text-[22px] leading-tight tracking-[-0.01em] text-ink group-hover:text-accent transition-colors'>
          {team.name}
        </span>
        <div className='flex items-center gap-1.5 shrink-0 mt-0.5'>
          {team.frozen && <FrozenBadge />}
          <RoleChip role={team.role} />
        </div>
      </div>
      <div className='font-mono text-[13px] text-ink-mute'>/{team.slug}</div>
      <div className='mt-auto pt-2 border-t border-rule flex items-center justify-between'>
        <span className='font-mono text-[12px] uppercase tracking-wider text-ink-mute'>
          {new Date(team.created_at).toLocaleDateString(undefined, {
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <span className='font-mono text-[12px] text-accent opacity-0 group-hover:opacity-100 transition-opacity'>
          Open →
        </span>
      </div>
    </Link>
  )
}

function CreateTeamPanel({
  token,
  onCreated,
}: {
  token: string
  onCreated: (slug: string) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const derivedSlug = (n: string) =>
    n
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 39)

  const handleNameChange = (v: string) => {
    setName(v)
    if (!slugEdited) setSlug(derivedSlug(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createTeam(token, { name: name.trim(), slug: slug.trim() })
      onCreated(slug.trim())
      navigate(`/teams/${slug.trim()}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div className='border border-rule-strong rounded-lg bg-linear-to-b from-paper-2 to-paper overflow-hidden surface'>
      <div className='px-5 sm:px-8 py-5 sm:py-6 border-b border-rule'>
        <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
          new team
        </div>
        <h2 className='font-serif text-[22px] sm:text-[26px] leading-none tracking-[-0.01em] text-ink m-0'>
          Create a team
        </h2>
      </div>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className='px-5 sm:px-8 py-6 flex flex-col gap-4'
      >
        <div className='flex flex-col gap-1.5'>
          <label className='font-mono text-[12px] uppercase tracking-wider text-ink-mute'>
            Team name
          </label>
          <input
            type='text'
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder='My awesome team'
            maxLength={64}
            required
            className='h-[44px] px-4 rounded border border-rule-strong bg-paper-3 well font-mono text-[14px] text-ink placeholder-ink-faint
              focus:outline-none focus:border-accent transition-colors'
          />
        </div>
        <div className='flex flex-col gap-1.5'>
          <label className='font-mono text-[12px] uppercase tracking-wider text-ink-mute'>
            Slug (URL)
          </label>
          <input
            type='text'
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugEdited(true)
            }}
            placeholder='my-team'
            maxLength={39}
            required
            className='h-[44px] px-4 rounded border border-rule-strong bg-paper-3 well font-mono text-[14px] text-ink placeholder-ink-faint
              focus:outline-none focus:border-accent transition-colors'
          />
          {slug && (
            <span className='font-mono text-[12px] text-ink-mute'>
              commma.dev/teams/{slug}
            </span>
          )}
        </div>
        {error && <p className='font-mono text-[13px] text-accent'>{error}</p>}
        <button
          type='submit'
          disabled={busy || !name.trim() || !slug.trim()}
          className='self-start inline-flex items-center h-[44px] px-6 rounded-full font-mono text-[13px] uppercase tracking-wider
            bg-accent text-paper border border-accent bevel press hover:bg-ink hover:border-ink transition-colors disabled:opacity-40'
        >
          {busy ? 'Creating…' : 'Create team'}
        </button>
      </form>
    </div>
  )
}

type LoadPhase =
  | { phase: 'loading' }
  | { phase: 'ready'; teams: TeamSummary[]; invites: TeamInvite[] }
  | { phase: 'error'; message: string }

export default function Teams() {
  const { token, user, isLoading: authLoading } = useAuth()
  const [state, setState] = useState<LoadPhase>({ phase: 'loading' })
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      navigate('/signin')
      return
    }
    let cancelled = false
    Promise.all([getMyTeams(token), getTeamInvites(token)])
      .then(([teamsRes, invitesRes]) => {
        if (!cancelled)
          setState({
            phase: 'ready',
            teams: teamsRes.teams,
            invites: invitesRes.invites,
          })
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            phase: 'error',
            message:
              err instanceof ApiError ? err.message : 'Something went wrong',
          })
      })
    return () => {
      cancelled = true
    }
  }, [token, authLoading, navigate])

  useSeo({ title: 'Teams · commma', noindex: true })

  if (authLoading || state.phase === 'loading') {
    return (
      <Shell>
        <StatusPanel title='Loading…' body='Fetching your teams.' />
      </Shell>
    )
  }

  if (state.phase === 'error') {
    return (
      <Shell>
        <StatusPanel title='Something went wrong' body={state.message} />
      </Shell>
    )
  }

  const { teams, invites } = state
  const isTeamPlan = hasTeamAccess(user?.plan ?? 'free', FREE_MODE)
  const ownedCount = teams.filter((t) => t.role === 'owner').length

  const handleAccept = (id: string) => {
    if (!token) return
    acceptInvite(token, id)
      .then((res) => {
        setState((prev) => {
          if (prev.phase !== 'ready') return prev
          const remaining = prev.invites.filter((inv) => inv.id !== id)
          const accepted = prev.invites.find((inv) => inv.id === id)
          if (!accepted) return { ...prev, invites: remaining }
          const newTeam: TeamSummary = {
            slug: res.team.slug,
            name: res.team.name,
            role: 'member',
            created_at: new Date().toISOString(),
            frozen: false,
          }
          return {
            ...prev,
            invites: remaining,
            teams: [newTeam, ...prev.teams],
          }
        })
      })
      .catch(() => void 0)
  }

  const handleDecline = (id: string) => {
    if (!token) return
    declineInvite(token, id)
      .then(() => {
        setState((prev) => {
          if (prev.phase !== 'ready') return prev
          return {
            ...prev,
            invites: prev.invites.filter((inv) => inv.id !== id),
          }
        })
      })
      .catch(() => void 0)
  }

  return (
    <Shell>
      <div className='flex flex-col gap-6'>
        {invites.length > 0 && (
          <div className='border border-rule-strong rounded-lg bg-linear-to-b from-paper-2 to-paper overflow-hidden surface'>
            <div className='px-5 sm:px-8 py-5 sm:py-6 border-b border-rule flex items-center gap-3'>
              <div>
                <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
                  inbox
                </div>
                <h2 className='font-serif text-[22px] sm:text-[26px] leading-none tracking-[-0.01em] text-ink m-0'>
                  Pending invites
                </h2>
              </div>
              <span className='ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-paper font-mono text-[11px]'>
                {invites.length}
              </span>
            </div>
            <div>
              {invites.map((inv) => (
                <InviteRow
                  key={inv.id}
                  invite={inv}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          </div>
        )}

        <div className='border border-rule-strong rounded-lg bg-linear-to-b from-paper-2 to-paper overflow-hidden surface'>
          <div className='px-5 sm:px-8 py-5 sm:py-6 border-b border-rule'>
            <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
              teams
            </div>
            <h1 className='font-serif text-[clamp(28px,4vw,40px)] leading-none tracking-[-0.02em] text-ink m-0'>
              Your teams
            </h1>
          </div>
          {teams.length === 0 ? (
            <div className='px-5 sm:px-8 py-16 text-center font-mono text-[15px] text-ink-mute'>
              You&apos;re not in any teams yet.
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 sm:p-8'>
              {teams.map((team) => (
                <TeamCard key={team.slug} team={team} />
              ))}
            </div>
          )}
        </div>

        {isTeamPlan && token && ownedCount >= TEAM_OWN_LIMIT ? (
          <div className='border border-rule rounded-lg px-5 sm:px-8 py-5 surface'>
            <div className='font-mono text-[12px] uppercase tracking-wider text-ink-mute mb-1'>
              team limit
            </div>
            <p className='font-mono text-[14px] text-ink-soft m-0 max-w-[60ch]'>
              You can create up to {TEAM_OWN_LIMIT} teams — you have reached the
              limit. Delete one above to create another.
            </p>
          </div>
        ) : isTeamPlan && token ? (
          <CreateTeamPanel
            token={token}
            onCreated={(slug) =>
              setState((prev) => {
                if (prev.phase !== 'ready') return prev
                if (prev.teams.some((t) => t.slug === slug)) return prev
                return prev
              })
            }
          />
        ) : (
          <div className='border border-rule rounded-lg px-5 sm:px-8 py-5 surface flex flex-col sm:flex-row sm:items-center gap-4'>
            <div className='flex-1'>
              <div className='font-mono text-[12px] uppercase tracking-wider text-ink-mute mb-1'>
                team plan
              </div>
              <p className='font-mono text-[14px] text-ink-soft m-0'>
                Create a team and invite up to 5 members with a Team plan.
              </p>
            </div>
            <Link
              to='/pricing'
              className='shrink-0 inline-flex items-center h-[44px] px-5 rounded-full font-mono text-[12px] uppercase tracking-wider
                text-accent border border-accent-line hover:bg-accent hover:text-paper hover:border-accent transition-colors'
            >
              Upgrade →
            </Link>
          </div>
        )}
      </div>
    </Shell>
  )
}
