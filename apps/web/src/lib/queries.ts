import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import {
  getActivityStats,
  getActivityStream,
  getFeaturedSession,
  getFeed,
  getLeaderboard,
  getMyTeams,
  getProfile,
  getProfileSessions,
  getRecap,
  getSession,
  getTeam,
  getTeamHeatmap,
  getTeamInvites,
  getTeamLeaderboard,
  type LeaderboardPeriod,
} from './api'

const PRIVATE = { persist: false } as const

export const queries = {
  profile: (handle: string) =>
    queryOptions({
      queryKey: ['profile', handle] as const,
      queryFn: () => getProfile(handle),
    }),

  profileSessions: (handle: string) =>
    infiniteQueryOptions({
      queryKey: ['profile', handle, 'sessions'] as const,
      queryFn: ({ pageParam }) => getProfileSessions(handle, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.next_cursor ?? undefined,
    }),

  leaderboard: (period: LeaderboardPeriod) =>
    queryOptions({
      queryKey: ['leaderboard', period] as const,
      queryFn: () => getLeaderboard(period),
    }),

  session: (id: string) =>
    queryOptions({
      queryKey: ['session', id] as const,
      queryFn: () => getSession(id),
    }),

  featured: () =>
    queryOptions({
      queryKey: ['activity', 'featured'] as const,
      queryFn: getFeaturedSession,
    }),

  activityStats: () =>
    queryOptions({
      queryKey: ['activity', 'stats'] as const,
      queryFn: getActivityStats,
    }),

  activityStream: () =>
    queryOptions({
      queryKey: ['activity', 'stream'] as const,
      queryFn: getActivityStream,
      staleTime: 30_000,
    }),

  feed: (token: string) =>
    infiniteQueryOptions({
      queryKey: ['feed'] as const,
      queryFn: ({ pageParam }) => getFeed(token, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.next_cursor ?? undefined,
      meta: PRIVATE,
    }),

  recap: (token: string) =>
    queryOptions({
      queryKey: ['recap'] as const,
      queryFn: () => getRecap(token),
      meta: PRIVATE,
    }),

  teams: (token: string) =>
    queryOptions({
      queryKey: ['teams'] as const,
      queryFn: () => getMyTeams(token),
      meta: PRIVATE,
    }),

  teamInvites: (token: string) =>
    queryOptions({
      queryKey: ['teams', 'invites'] as const,
      queryFn: () => getTeamInvites(token),
      meta: PRIVATE,
    }),

  team: (token: string, slug: string) =>
    queryOptions({
      queryKey: ['team', slug] as const,
      queryFn: () => getTeam(token, slug),
      meta: PRIVATE,
    }),

  teamLeaderboard: (token: string, slug: string, period: LeaderboardPeriod) =>
    queryOptions({
      queryKey: ['team', slug, 'leaderboard', period] as const,
      queryFn: () => getTeamLeaderboard(token, slug, period),
      meta: PRIVATE,
    }),

  teamHeatmap: (token: string, slug: string) =>
    queryOptions({
      queryKey: ['team', slug, 'heatmap'] as const,
      queryFn: () => getTeamHeatmap(token, slug),
      meta: PRIVATE,
    }),
}
