import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { crossHostRedirect } from './lib/docsRouting'

export default function RootLayout() {
  const { pathname, search, hash } = useLocation()
  const target = crossHostRedirect(pathname, search)

  useEffect(() => {
    if (target) window.location.replace(target)
  }, [target])

  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) {
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [hash, pathname])

  if (target) return null

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}
