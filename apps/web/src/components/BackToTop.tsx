import { useEffect, useRef } from 'react'

export function BackToTop() {
  const btnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const check = () => {
      const el = btnRef.current
      if (!el) return
      const show = window.scrollY > 500
      el.style.opacity = show ? '1' : '0'
      el.style.transform = show ? 'translateY(0)' : 'translateY(10px)'
      el.style.pointerEvents = show ? 'auto' : 'none'
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])
  return (
    <button
      ref={btnRef}
      type='button'
      aria-label='Back to top'
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        opacity: '0',
        transform: 'translateY(10px)',
        pointerEvents: 'none',
        transition: 'opacity 250ms, transform 250ms',
      }}
      className='fixed bottom-6 right-5 sm:right-6 z-50 w-11 h-11 rounded-full
        bg-paper-3 border border-rule-strong text-ink-mute hover:text-ink hover:border-ink-faint
        font-serif text-[18px] flex items-center justify-center bevel press'
    >
      ↑
    </button>
  )
}
