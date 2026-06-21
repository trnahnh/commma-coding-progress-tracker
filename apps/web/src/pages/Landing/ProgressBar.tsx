import { useScrollProgress } from '../../lib/useScrollProgress'

export function ProgressBar() {
  const barRef = useScrollProgress<HTMLDivElement>()
  return (
    <div
      ref={barRef}
      className='fixed top-0 left-0 right-0 z-60 h-[2px] bg-accent origin-left pointer-events-none'
      style={{ transform: 'scaleX(0)' }}
    />
  )
}
