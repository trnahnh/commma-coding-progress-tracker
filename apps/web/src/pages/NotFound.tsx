import { Link } from 'react-router-dom'
import { Shell, StatusPanel } from '../components/chrome'
import { useSeo } from '../lib/seo'

export default function NotFound() {
  useSeo({
    title: 'Page not found · commma',
    description: "The page you're looking for doesn't exist.",
    noindex: true,
  })

  return (
    <Shell>
      <Link
        to='/'
        className='group inline-flex items-center gap-2 min-h-[44px] font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute hover:text-ink transition-colors mb-8'
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
