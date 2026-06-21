import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { LiveDot, Shell, StatusPanel } from '../components/chrome'
import KeyboardHeatmap from '../components/KeyboardHeatmap'
import {
  ApiError,
  deleteTeam,
  inviteMember,
  removeMember,
  updateTeam,
  type LeaderboardPeriod,
  type TeamDetail,
  type TeamLeaderboardData,
} from '../lib/api'
import { queries } from '../lib/queries'
import { useAuth } from '../lib/auth'
import { formatDuration } from '../lib/format'
import { useSeo } from '../lib/seo'

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'alltime', label: 'All time' },
]

function RoleChip({ role }: { role: string }) {
  const isOwner = role === 'owner'
  return (
    <span
      className={[
        'inline-flex items-center h-[24px] px-2.5 rounded-full font-mono text-[12px] uppercase tracking-widest border',
        isOwner
          ? 'text-accent border-accent-line bg-accent-soft'
          : 'text-ink-mute border-rule',
      ].join(' ')}
    >
      {role}
    </span>
  )
}

function PeriodTabs({
  active,
  onChange,
}: {
  active: LeaderboardPeriod
  onChange: (p: LeaderboardPeriod) => void
}) {
  return (
    <div className='flex gap-1.5'>
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          type='button'
          onClick={() => onChange(value)}
          className={`h-[44px] px-3 sm:px-4 rounded-full font-mono text-[12px] sm:text-[13px] uppercase tracking-wider whitespace-nowrap border transition-colors press ${
            active === value
              ? 'bg-accent border-accent text-paper'
              : 'border-rule-strong text-ink-mute hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function MemberRow({
  member,
  myRole,
  myHandle,
  slug,
  token,
  onRemoved,
}: {
  member: TeamDetail['members'][number]
  myRole: string
  myHandle: string
  slug: string
  token: string
  onRemoved: (handle: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSelf = member.handle === myHandle
  const canRemove = member.role !== 'owner' && (isSelf || myRole === 'owner')

  const handleRemove = async () => {
    setBusy(true)
    setError(null)
    try {
      await removeMember(token, slug, member.handle)
      onRemoved(member.handle)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className='flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-4 border-b border-rule last:border-b-0'>
      {member.avatar_url ? (
        <img
          src={member.avatar_url}
          alt={member.handle}
          width={36}
          height={36}
          loading='lazy'
          className='w-9 h-9 rounded-full border border-rule object-cover shrink-0'
        />
      ) : (
        <span className='w-9 h-9 rounded-full border border-rule bg-paper-3 shrink-0' />
      )}
      <Link
        to={`/@${member.handle}`}
        className='flex-1 min-w-0 font-serif text-[17px] sm:text-[19px] leading-none tracking-[-0.01em] text-ink hover:text-accent transition-colors truncate'
      >
        @{member.handle}
      </Link>
      <RoleChip role={member.role} />
      {canRemove && (
        <div className='flex flex-col items-end gap-0.5 shrink-0'>
          <button
            type='button'
            disabled={busy}
            onClick={() => void handleRemove()}
            className='min-h-[44px] inline-flex items-center font-mono text-[12px] uppercase tracking-wider text-ink-mute hover:text-accent transition-colors disabled:opacity-40'
          >
            {busy ? '…' : isSelf ? 'Leave' : 'Remove'}
          </button>
          {error && (
            <span className='font-mono text-[13px] text-accent'>{error}</span>
          )}
        </div>
      )}
    </div>
  )
}

function LeaderboardRow({
  entry,
}: {
  entry: TeamLeaderboardData['entries'][number]
}) {
  const { rank, handle, avatar_url, duration_s, streak_days } = entry
  const rankCls =
    rank === 1
      ? 'text-accent font-semibold'
      : rank <= 3
        ? 'text-ink-soft'
        : 'text-ink-mute'
  return (
    <div className='flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-4 sm:py-5 border-b border-rule last:border-b-0 hover:bg-paper-2/40 transition-colors'>
      <span
        className={`font-mono text-[15px] tnum w-6 text-right shrink-0 ${rankCls}`}
      >
        {rank}
      </span>
      {avatar_url ? (
        <img
          src={avatar_url}
          alt={handle}
          width={32}
          height={32}
          loading='lazy'
          className='w-8 h-8 rounded-full border border-rule object-cover shrink-0'
        />
      ) : (
        <span className='w-8 h-8 rounded-full border border-rule bg-paper-3 shrink-0' />
      )}
      <Link
        to={`/@${handle}`}
        className='flex-1 min-w-0 font-serif text-[17px] sm:text-[19px] leading-none tracking-[-0.01em] text-ink hover:text-accent transition-colors truncate'
      >
        @{handle}
      </Link>
      <div className='hidden sm:flex items-center gap-4 shrink-0'>
        {streak_days > 0 && (
          <span className='flex items-center gap-1.5 font-mono text-[13px] text-live'>
            <LiveDot color='live' />
            {streak_days}d
          </span>
        )}
      </div>
      <span className='font-mono text-[15px] tnum text-ink-soft shrink-0'>
        {formatDuration(duration_s)}
      </span>
    </div>
  )
}

function InviteForm({
  slug,
  token,
  onInvited,
}: {
  slug: string
  token: string
  onInvited: () => void
}) {
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{
    kind: 'ok' | 'err'
    text: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!handle.trim()) return
    setBusy(true)
    setMessage(null)
    try {
      await inviteMember(token, slug, handle.trim().replace(/^@/, ''))
      setMessage({
        kind: 'ok',
        text: `Invited @${handle.trim().replace(/^@/, '')}`,
      })
      setHandle('')
      onInvited()
    } catch (err) {
      setMessage({
        kind: 'err',
        text: err instanceof ApiError ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className='flex flex-col gap-2'
    >
      <label className='font-mono text-[12px] uppercase tracking-wider text-ink-mute'>
        Invite by handle
      </label>
      <div className='flex gap-2'>
        <input
          type='text'
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder='@handle'
          maxLength={39}
          className='flex-1 min-w-0 h-[44px] px-3 rounded border border-rule-strong bg-paper-3 well font-mono text-[13px] text-ink placeholder-ink-faint
            focus:outline-none focus:border-accent transition-colors'
        />
        <button
          type='submit'
          disabled={busy || !handle.trim()}
          className='shrink-0 h-[44px] px-4 rounded-full font-mono text-[12px] uppercase tracking-wider
            bg-accent text-paper border border-accent bevel press hover:bg-ink hover:border-ink transition-colors disabled:opacity-40'
        >
          {busy ? '…' : 'Invite'}
        </button>
      </div>
      {message && (
        <p
          className={`font-mono text-[12px] ${message.kind === 'ok' ? 'text-live' : 'text-accent'}`}
        >
          {message.text}
        </p>
      )}
    </form>
  )
}

function RenameForm({
  currentName,
  slug,
  token,
  onRenamed,
}: {
  currentName: string
  slug: string
  token: string
  onRenamed: (name: string) => void
}) {
  const [name, setName] = useState(currentName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || name.trim() === currentName) return
    setBusy(true)
    setError(null)
    try {
      await updateTeam(token, slug, { name: name.trim() })
      onRenamed(name.trim())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className='flex flex-col gap-2'
    >
      <label className='font-mono text-[12px] uppercase tracking-wider text-ink-mute'>
        Rename team
      </label>
      <div className='flex gap-2'>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          className='flex-1 min-w-0 h-[44px] px-3 rounded border border-rule-strong bg-paper-3 well font-mono text-[13px] text-ink placeholder-ink-faint
            focus:outline-none focus:border-accent transition-colors'
        />
        <button
          type='submit'
          disabled={busy || !name.trim() || name.trim() === currentName}
          className='shrink-0 h-[44px] px-4 rounded-full font-mono text-[12px] uppercase tracking-wider
            border border-rule-strong text-ink-soft hover:text-ink hover:border-ink-faint transition-colors disabled:opacity-40'
        >
          {busy ? '…' : 'Save'}
        </button>
      </div>
      {error && <p className='font-mono text-[12px] text-accent'>{error}</p>}
    </form>
  )
}

function DeleteTeamButton({
  slug,
  token,
  onDeleted,
}: {
  slug: string
  token: string
  onDeleted: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      await deleteTeam(token, slug)
      onDeleted()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  if (!confirm) {
    return (
      <button
        type='button'
        onClick={() => setConfirm(true)}
        className='min-h-[44px] inline-flex items-center font-mono text-[12px] uppercase tracking-wider text-ink-mute hover:text-accent transition-colors'
      >
        Delete team
      </button>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <p className='font-mono text-[12px] text-ink-soft'>
        This permanently deletes the team and removes all members.
      </p>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          disabled={busy}
          onClick={() => void handleDelete()}
          className='shrink-0 h-[44px] px-4 rounded-full font-mono text-[12px] uppercase tracking-wider
            bg-accent text-paper border border-accent bevel press hover:bg-ink hover:border-ink transition-colors disabled:opacity-40'
        >
          {busy ? '…' : 'Confirm delete'}
        </button>
        <button
          type='button'
          onClick={() => setConfirm(false)}
          className='min-h-[44px] inline-flex items-center font-mono text-[12px] uppercase tracking-wider text-ink-mute hover:text-ink transition-colors'
        >
          Cancel
        </button>
      </div>
      {error && <p className='font-mono text-[12px] text-accent'>{error}</p>}
    </div>
  )
}

export default function TeamDashboard() {
  const { slug } = useParams<{ slug: string }>()
  const { token, user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<LeaderboardPeriod>('week')
  const [heatmapRequested, setHeatmapRequested] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      navigate('/signin')
      return
    }
    if (!slug) navigate('/teams')
  }, [authLoading, token, slug, navigate])

  const enabled = !authLoading && !!token && !!slug
  const teamQuery = useQuery({
    ...queries.team(token ?? '', slug ?? ''),
    enabled,
  })
  const leaderboardQuery = useQuery({
    ...queries.teamLeaderboard(token ?? '', slug ?? '', period),
    enabled,
    placeholderData: keepPreviousData,
  })
  const heatmapQuery = useQuery({
    ...queries.teamHeatmap(token ?? '', slug ?? ''),
    enabled: enabled && heatmapRequested,
  })

  useSeo({
    title: teamQuery.data ? `${teamQuery.data.name} · commma` : 'Team · commma',
    noindex: true,
  })

  if (authLoading || !token || !slug || teamQuery.isPending) {
    return (
      <Shell>
        <StatusPanel title='Loading…' body='Fetching team data.' />
      </Shell>
    )
  }

  if (teamQuery.isError) {
    return (
      <Shell>
        <StatusPanel
          title='Not found'
          body={
            teamQuery.error instanceof ApiError
              ? teamQuery.error.message
              : 'Something went wrong'
          }
        />
      </Shell>
    )
  }

  const team = teamQuery.data
  const leaderboard = leaderboardQuery.data
  const lbLoading =
    leaderboardQuery.isPending || leaderboardQuery.isPlaceholderData
  const myRole =
    team.members.find((m) => m.handle === user?.handle)?.role ?? 'member'
  const isOwner = myRole === 'owner'

  const invalidateTeam = () =>
    void queryClient.invalidateQueries({ queryKey: ['team', slug] })

  const handleMemberRemoved = (handle: string) => {
    if (handle === user?.handle) {
      navigate('/teams')
      return
    }
    invalidateTeam()
  }

  const handleTeamDeleted = () => {
    void queryClient.invalidateQueries({ queryKey: ['teams'] })
    navigate('/teams')
  }

  const handleRenamed = () => invalidateTeam()

  return (
    <Shell>
      <div className='flex flex-col gap-6'>
        <Link
          to='/teams'
          className='group inline-flex items-center gap-2 self-start min-h-[44px] font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute hover:text-ink transition-colors'
        >
          <span className='inline-block transition-transform group-hover:-translate-x-1'>
            ←
          </span>
          Back to teams
        </Link>

        {team.frozen && (
          <div className='px-5 py-3 rounded border border-rule bg-paper-3 font-mono text-[13px] text-ink-mute flex items-center gap-2'>
            <span className='text-accent'>!</span> This team&apos;s plan is
            inactive. New invites and changes are paused until the plan is
            renewed.
          </div>
        )}

        <div className='border border-rule-strong rounded-lg bg-linear-to-b from-paper-2 to-paper overflow-hidden surface'>
          <div className='px-5 sm:px-8 py-5 sm:py-7 border-b border-rule'>
            <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
              /{team.slug}
            </div>
            <div className='flex flex-wrap items-start gap-3'>
              <h1 className='font-serif text-[clamp(28px,4vw,48px)] leading-none tracking-[-0.02em] text-ink m-0 flex-1 min-w-0'>
                {team.name}
              </h1>
              <div className='flex items-center gap-2 mt-1'>
                <RoleChip role={myRole} />
                <span className='font-mono text-[13px] text-ink-mute'>
                  {team.member_count}/{team.max_members} members
                </span>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-[1fr_320px]'>
            <div className='border-b lg:border-b-0 lg:border-r border-rule'>
              <div className='px-5 sm:px-8 py-4 border-b border-rule'>
                <span className='font-mono text-[12px] uppercase tracking-[0.14em] text-ink-mute'>
                  Members
                </span>
              </div>
              {team.members.map((m) => (
                <MemberRow
                  key={m.handle}
                  member={m}
                  myRole={myRole}
                  myHandle={user?.handle ?? ''}
                  slug={team.slug}
                  token={token}
                  onRemoved={handleMemberRemoved}
                />
              ))}
              {team.members.length === 1 && (
                <div className='px-5 sm:px-8 py-7'>
                  <p className='font-sans text-[15px] leading-relaxed text-ink-soft m-0 max-w-[46ch]'>
                    {isOwner
                      ? 'It’s just you so far. Invite teammates by their handle to build a shared leaderboard and a merged team heatmap.'
                      : 'No teammates yet — the owner can invite more people to this team.'}
                  </p>
                </div>
              )}
            </div>

            {isOwner && (
              <div className='flex flex-col'>
                <div className='px-5 sm:px-8 py-4 border-b border-rule'>
                  <span className='font-mono text-[12px] uppercase tracking-[0.14em] text-ink-mute'>
                    Manage
                  </span>
                </div>
                <div className='px-5 sm:px-8 py-5 sm:py-6 flex flex-col gap-6'>
                  {!team.frozen && (
                    <>
                      <InviteForm
                        slug={team.slug}
                        token={token}
                        onInvited={invalidateTeam}
                      />
                      <RenameForm
                        currentName={team.name}
                        slug={team.slug}
                        token={token}
                        onRenamed={handleRenamed}
                      />
                    </>
                  )}
                  <div
                    className={team.frozen ? '' : 'pt-2 border-t border-rule'}
                  >
                    <DeleteTeamButton
                      slug={team.slug}
                      token={token}
                      onDeleted={handleTeamDeleted}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className='border border-rule-strong rounded-lg bg-linear-to-b from-paper-2 to-paper overflow-hidden surface'>
          <div className='px-5 sm:px-8 py-5 sm:py-6 border-b border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div>
              <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
                leaderboard
              </div>
              <h2 className='font-serif text-[22px] sm:text-[28px] leading-none tracking-[-0.01em] text-ink m-0'>
                Team ranking
              </h2>
            </div>
            <PeriodTabs active={period} onChange={setPeriod} />
          </div>
          {lbLoading || !leaderboard ? (
            <div className='px-5 sm:px-8 py-12 text-center font-mono text-[14px] text-ink-mute'>
              Loading…
            </div>
          ) : leaderboard.entries.length === 0 ? (
            <div className='px-5 sm:px-8 py-16 text-center font-mono text-[15px] text-ink-mute'>
              No sessions recorded for this period.
            </div>
          ) : (
            <>
              {leaderboard.entries.map((e) => (
                <LeaderboardRow key={e.handle} entry={e} />
              ))}
              <div className='px-5 sm:px-8 py-3 border-t border-rule'>
                <span className='font-mono text-[13px] text-ink-mute'>
                  Updated{' '}
                  {new Date(leaderboard.updated_at).toLocaleTimeString()}
                </span>
              </div>
            </>
          )}
        </div>

        <div className='border border-rule-strong rounded-lg bg-linear-to-b from-paper-2 to-paper overflow-hidden surface'>
          <div className='px-5 sm:px-8 py-5 sm:py-6 border-b border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div>
              <div className='font-mono text-[13px] tracking-[0.16em] uppercase text-ink-mute mb-1'>
                heatmap
              </div>
              <h2 className='font-serif text-[22px] sm:text-[28px] leading-none tracking-[-0.01em] text-ink m-0'>
                Team keyboard activity
              </h2>
            </div>
            {!heatmapRequested && (
              <button
                type='button'
                onClick={() => setHeatmapRequested(true)}
                className='shrink-0 inline-flex items-center h-[44px] px-5 rounded-full font-mono text-[12px] uppercase tracking-wider
                  border border-rule-strong text-ink-soft hover:text-ink hover:border-ink-faint transition-colors'
              >
                Load
              </button>
            )}
          </div>
          {!heatmapRequested && (
            <div className='px-5 sm:px-8 py-12 text-center font-mono text-[14px] text-ink-mute'>
              Merged heatmap across all team members' sessions.
            </div>
          )}
          {heatmapRequested && heatmapQuery.isPending && (
            <div className='px-5 sm:px-8 py-12 text-center font-mono text-[14px] text-ink-mute'>
              Loading…
            </div>
          )}
          {heatmapRequested && heatmapQuery.isError && (
            <div className='px-5 sm:px-8 py-12 text-center font-mono text-[14px] text-accent'>
              {heatmapQuery.error instanceof ApiError
                ? heatmapQuery.error.message
                : 'Failed to load'}
            </div>
          )}
          {heatmapRequested && heatmapQuery.isSuccess && (
            <div className='p-5 sm:p-8'>
              <KeyboardHeatmap
                heatmap={heatmapQuery.data}
                sessionLabel={team.name}
                isPro={true}
              />
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
