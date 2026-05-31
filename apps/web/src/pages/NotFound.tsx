import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shell, StatusPanel } from '../components/chrome'

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found · commma'
  }, [])

  return (
    <Shell>
      <Link
        to='/'
        className='group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-mute hover:text-ink transition-colors mb-8'
      >
        <span className='inline-block transition-transform group-hover:-translate-x-1'>
          ←
        </span>
        Back to activity
      </Link>
      <StatusPanel
        title='Page not found'
        body='That route does not exist. Head back to the activity feed.'
      />
    </Shell>
  )
}
