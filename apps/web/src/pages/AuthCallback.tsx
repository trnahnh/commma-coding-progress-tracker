import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shell, StatusPanel } from '../components/chrome'
import { exchangeCode } from '../lib/api'
import { useAuth } from '../lib/auth'
import { takePostAuthRedirect } from '../lib/redirect'
import { useSeo } from '../lib/seo'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const ran = useRef(false)

  useSeo({ title: 'Signing in · commma', noindex: true })

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const code = params.get('code')
    if (!code) {
      navigate('/', { replace: true })
      return
    }

    exchangeCode(code)
      .then(({ access_token, refresh_token, user }) => {
        setSession(access_token, refresh_token, user)
        navigate(takePostAuthRedirect() ?? '/', { replace: true })
      })
      .catch(() => {
        navigate('/', { replace: true })
      })
  }, [navigate, setSession, params])

  return (
    <Shell>
      <StatusPanel
        title='Signing you in…'
        body='Completing GitHub authentication.'
      />
    </Shell>
  )
}
