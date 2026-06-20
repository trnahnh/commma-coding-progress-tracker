/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthUser,
  type MeResult,
  getMe,
  refreshAccessToken,
  signOut as apiSignOut,
} from './api'
import { queryClient } from './queryClient'

const STORAGE_KEY = 'commma_refresh_token'
const REFRESH_MARGIN_MS = 60_000

function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function saveRefreshToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    void 0
  }
}

function clearRefreshToken() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    void 0
  }
}

function jwtExpiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

interface AuthState {
  user: MeResult | null
  token: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  signIn: () => void
  signOut: () => Promise<void>
  setSession: (
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
  ) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  })
  const refreshTokenRef = useRef<string | null>(readStoredRefreshToken())

  useEffect(() => {
    const rt = refreshTokenRef.current
    if (!rt) {
      setState((prev) => ({ ...prev, isLoading: false }))
      return
    }
    let cancelled = false
    refreshAccessToken(rt)
      .then(async (result) => {
        if (cancelled) return
        if (result.refresh_token) {
          refreshTokenRef.current = result.refresh_token
          saveRefreshToken(result.refresh_token)
        }
        const user = await getMe(result.access_token).catch(() => null)
        if (cancelled) return
        setState({ user, token: result.access_token, isLoading: false })
      })
      .catch(() => {
        if (cancelled) return
        refreshTokenRef.current = null
        clearRefreshToken()
        setState({ user: null, token: null, isLoading: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { token } = state
  useEffect(() => {
    if (!token) return
    const exp = jwtExpiresAt(token)
    if (!exp) return
    const delay = Math.max(0, exp - Date.now() - REFRESH_MARGIN_MS)
    const id = setTimeout(async () => {
      const rt = refreshTokenRef.current
      if (!rt) return
      try {
        const result = await refreshAccessToken(rt)
        if (result.refresh_token) {
          refreshTokenRef.current = result.refresh_token
          saveRefreshToken(result.refresh_token)
        }
        const freshUser = await getMe(result.access_token).catch(() => null)
        setState((prev) => ({
          ...prev,
          token: result.access_token,
          ...(freshUser ? { user: freshUser } : {}),
        }))
      } catch {
        refreshTokenRef.current = null
        clearRefreshToken()
        setState({ user: null, token: null, isLoading: false })
      }
    }, delay)
    return () => clearTimeout(id)
  }, [token])

  const setSession = useCallback(
    (accessToken: string, refreshToken: string, user: AuthUser) => {
      queryClient.clear()
      refreshTokenRef.current = refreshToken
      saveRefreshToken(refreshToken)
      setState({ user: user as MeResult, token: accessToken, isLoading: true })
      void getMe(accessToken)
        .then((fullUser) => {
          setState({ user: fullUser, token: accessToken, isLoading: false })
        })
        .catch(() => {
          setState({ user: user as MeResult, token: accessToken, isLoading: false })
        })
    },
    [],
  )

  const refreshUser = useCallback(async () => {
    const { token } = state
    if (!token) return
    try {
      const user = await getMe(token)
      setState((prev) => ({ ...prev, user }))
    } catch {
      void 0
    }
  }, [state])

  const signIn = useCallback(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
    window.location.href = `${apiBase}/v1/auth/github`
  }, [])

  const signOut = useCallback(async () => {
    const { token } = state
    const rt = refreshTokenRef.current
    refreshTokenRef.current = null
    clearRefreshToken()
    queryClient.clear()
    setState({ user: null, token: null, isLoading: false })
    if (token && rt) {
      try {
        await apiSignOut(token, rt)
      } catch {
        void 0
      }
    }
  }, [state])

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, setSession, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
