import { useEffect, useRef } from 'react'

export function useTilt<T extends HTMLElement>(max = 6) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || reduce.matches) return

    let frame = 0

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rx = (-py * max).toFixed(2)
        const ry = (px * max).toFixed(2)
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`
      })
    }

    const onLeave = () => {
      cancelAnimationFrame(frame)
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(frame)
    }
  }, [max])

  return ref
}
