import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DOC_NAV, type DocNavLink } from '../content/docs/registry'
import { appTo, docTo, isExternalHref } from '../lib/docsRouting'

function hrefFor(link: DocNavLink): string {
  return link.slug !== undefined ? docTo(link.slug) : appTo(link.appPath ?? '/')
}

function MobileLink({ link, pathname }: { link: DocNavLink; pathname: string }) {
  const href = hrefFor(link)
  const external = isExternalHref(href)
  const active = !external && pathname === href
  const className = `inline-flex items-center min-h-[44px] px-3.5 rounded-full font-mono text-[13px] tracking-wide transition-colors ${
    active
      ? 'bg-accent-soft text-ink border border-accent-line'
      : 'text-ink-soft hover:text-ink border border-transparent'
  }`
  if (external) {
    return (
      <a href={href} className={className}>
        {link.label}
      </a>
    )
  }
  return (
    <Link to={href} className={className}>
      {link.label}
    </Link>
  )
}

function SidebarLink({
  link,
  pathname,
}: {
  link: DocNavLink
  pathname: string
}) {
  const href = hrefFor(link)
  const external = isExternalHref(href)
  const active = !external && pathname === href
  const className = `relative flex items-center min-h-[36px] pl-3 font-mono text-[13px] transition-colors border-l ${
    active
      ? 'border-accent text-ink'
      : 'border-rule text-ink-soft hover:text-ink hover:border-rule-strong'
  }`
  if (external) {
    return (
      <a href={href} className={className}>
        {link.label}
      </a>
    )
  }
  return (
    <Link to={href} className={className}>
      {link.label}
    </Link>
  )
}

function DocsSidebar({ pathname }: { pathname: string }) {
  return (
    <>
      <nav className='lg:hidden -mx-[clamp(20px,4vw,56px)] px-[clamp(20px,4vw,56px)] mb-8 overflow-x-auto border-b border-rule'>
        <div className='flex gap-1 pb-3 whitespace-nowrap'>
          {DOC_NAV.flatMap((group) => group.links).map((link) => (
            <MobileLink key={link.label} link={link} pathname={pathname} />
          ))}
        </div>
      </nav>

      <aside className='hidden lg:block w-[212px] shrink-0'>
        <div className='sticky top-24 flex flex-col gap-7'>
          {DOC_NAV.map((group) => (
            <div key={group.group}>
              <p className='font-mono text-[12px] tracking-[0.18em] uppercase text-ink-mute m-0 mb-3'>
                {group.group}
              </p>
              <ul className='m-0 p-0 list-none flex flex-col gap-0.5'>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <SidebarLink link={link} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}

export function DocsLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className='flex flex-col lg:flex-row lg:gap-14'>
      <DocsSidebar pathname={pathname} />
      <div className='min-w-0 flex-1 lg:max-w-[768px]'>{children}</div>
    </div>
  )
}
