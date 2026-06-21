import { useEffect, useRef } from 'react'

export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    let max = document.documentElement.scrollHeight - window.innerHeight
    let frame = 0
    const paint = () => {
      frame = 0
      const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (ref.current) ref.current.style.transform = `scaleX(${pct})`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const onResize = () => {
      max = document.documentElement.scrollHeight - window.innerHeight
      onScroll()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frame)
    }
  }, [])
  return ref
}
