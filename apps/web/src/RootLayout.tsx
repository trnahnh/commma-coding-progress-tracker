import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { crossHostRedirect } from './lib/docsRouting'

export default function RootLayout() {
  const { pathname, search } = useLocation()
  const target = crossHostRedirect(pathname, search)

  useEffect(() => {
    if (target) window.location.replace(target)
  }, [target])

  if (target) return null

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}
