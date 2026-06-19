import { Link, useParams } from 'react-router-dom'
import { Shell, StatusPanel } from '../components/chrome'
import { DocsLayout } from '../components/DocsLayout'
import { Prose } from '../components/Prose'
import { useSeo } from '../lib/seo'
import { DOCS, getDoc } from '../content/docs/registry'
import { docTo } from '../lib/docsRouting'

export default function DocsArticle() {
  const { slug } = useParams()
  const doc = getDoc(slug)

  useSeo(
    doc
      ? { title: `${doc.title} · commma Docs`, description: doc.summary }
      : { title: 'Not found · commma Docs', noindex: true },
  )

  if (!doc) {
    return (
      <Shell>
        <StatusPanel
          title='Page not found'
          body={
            <>
              That doc does not exist.{' '}
              <Link
                to={docTo()}
                className='text-accent hover:text-ink-soft transition-colors'
              >
                Back to docs
              </Link>
            </>
          }
        />
      </Shell>
    )
  }

  const index = DOCS.findIndex((entry) => entry.slug === doc.slug)
  const prev = index > 0 ? DOCS[index - 1] : null
  const next = index < DOCS.length - 1 ? DOCS[index + 1] : null

  return (
    <Shell>
      <DocsLayout>
        <div className='mb-8 flex items-center gap-2.5 font-mono text-[12px] tracking-[0.18em] uppercase'>
          <Link
            to={docTo()}
            className='text-ink-mute hover:text-ink transition-colors'
          >
            Docs
          </Link>
          <span className='text-ink-faint'>/</span>
          <span className='text-ink-soft'>{doc.eyebrow}</span>
        </div>

        <article>
          <Prose markdown={doc.body} />
        </article>

        {(prev || next) && (
          <nav className='mt-16 pt-8 border-t border-rule grid grid-cols-2 gap-3 sm:gap-4'>
            {prev ? (
              <Link
                to={docTo(prev.slug)}
                className='group flex flex-col justify-center min-h-[44px] rounded-lg border border-rule-strong px-4 sm:px-5 py-4 hover:border-ink-faint transition-colors'
              >
                <span className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute mb-1.5'>
                  ← Previous
                </span>
                <span className='font-sans text-[15px] text-ink-soft group-hover:text-ink transition-colors truncate'>
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to={docTo(next.slug)}
                className='group flex flex-col justify-center items-end text-right min-h-[44px] rounded-lg border border-rule-strong px-4 sm:px-5 py-4 hover:border-ink-faint transition-colors'
              >
                <span className='font-mono text-[12px] tracking-[0.16em] uppercase text-ink-mute mb-1.5'>
                  Next →
                </span>
                <span className='font-sans text-[15px] text-ink-soft group-hover:text-ink transition-colors truncate'>
                  {next.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <div className='mt-10 font-sans text-[14px] text-ink-mute leading-relaxed'>
          Spot something off?{' '}
          <a
            href='https://github.com/trnahnh/commma-coding-progress-tracker'
            target='_blank'
            rel='noopener noreferrer'
            className='text-accent hover:text-ink-soft transition-colors'
          >
            Improve these docs on GitHub ↗
          </a>
        </div>
      </DocsLayout>
    </Shell>
  )
}
