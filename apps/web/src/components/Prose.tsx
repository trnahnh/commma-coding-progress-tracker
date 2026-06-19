import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveDocHref } from '../lib/docsRouting'

const linkClass =
  'text-accent underline decoration-rule-strong underline-offset-2 hover:decoration-accent hover:text-ink transition-colors'

function MarkdownLink({
  href,
  children,
}: {
  href?: string
  children?: ReactNode
}) {
  if (!href) return <span>{children}</span>
  const resolved = resolveDocHref(href)
  if (/^https?:/.test(resolved)) {
    return (
      <a
        href={resolved}
        target='_blank'
        rel='noopener noreferrer'
        className={linkClass}
      >
        {children} ↗
      </a>
    )
  }
  if (resolved.startsWith('/') && !resolved.includes('#')) {
    return (
      <Link to={resolved} className={linkClass}>
        {children}
      </Link>
    )
  }
  return (
    <a href={resolved} className={linkClass}>
      {children}
    </a>
  )
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className='font-serif font-normal text-[clamp(34px,5vw,60px)] leading-[0.98] tracking-[-0.03em] text-ink mt-0 mb-6 lift-text'>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className='font-serif font-normal text-[clamp(24px,3.2vw,38px)] leading-[1.06] tracking-[-0.02em] text-ink mt-14 mb-4'>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className='font-sans font-medium text-[19px] leading-snug text-ink mt-9 mb-3'>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className='font-sans text-[16px] leading-[1.75] text-ink-soft my-4'>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className='my-5 pl-5 space-y-2.5 list-disc marker:text-ink-faint'>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className='my-5 pl-5 space-y-2.5 list-decimal marker:text-ink-mute'>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className='font-sans text-[16px] leading-[1.7] text-ink-soft pl-1'>
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className='text-ink font-medium'>{children}</strong>
  ),
  em: ({ children }) => <em className='italic'>{children}</em>,
  a: MarkdownLink,
  blockquote: ({ children }) => (
    <blockquote className='my-6 border-l-2 border-accent-line pl-5 text-ink-soft [&>p]:text-ink-mute [&>p]:italic'>
      {children}
    </blockquote>
  ),
  hr: () => <hr className='my-10 border-0 border-t border-rule' />,
  pre: ({ children }) => (
    <pre className='font-mono text-[13px] leading-relaxed text-ink bg-paper-3 border border-rule rounded-md px-4 py-3.5 my-6 overflow-x-auto well'>
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const text = String(children ?? '')
    const isBlock = /language-/.test(className ?? '') || text.includes('\n')
    if (isBlock) {
      return <code className='font-mono text-[13px] text-ink'>{children}</code>
    }
    return (
      <code className='font-mono text-[0.88em] text-accent bg-paper-3 border border-rule rounded px-1.5 py-0.5'>
        {children}
      </code>
    )
  },
  table: ({ children }) => (
    <div className='my-6 overflow-x-auto'>
      <table className='w-full border border-rule rounded text-left border-collapse'>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className='font-mono text-[12px] tracking-[0.12em] uppercase text-ink-mute px-4 py-2.5 border-b border-rule bg-paper-2 whitespace-nowrap'>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className='font-sans text-[14px] text-ink-soft px-4 py-2.5 border-b border-rule align-top'>
      {children}
    </td>
  ),
}

export function Prose({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {markdown}
    </ReactMarkdown>
  )
}
