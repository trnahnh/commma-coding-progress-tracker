import { useEffect, useState } from 'react'

export function useLiveCount(initial: number, intervalMs = 1700, stepMax = 4) {
  const [count, setCount] = useState(initial)
  useEffect(() => {
    const id = setInterval(
      () => setCount((n) => n + Math.floor(Math.random() * stepMax) + 1),
      intervalMs,
    )
    return () => clearInterval(id)
  }, [intervalMs, stepMax])
  return count
}
