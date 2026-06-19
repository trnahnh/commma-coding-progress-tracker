import { DOCS } from '../content/docs/registry'

export const MAIN_ORIGIN = 'https://commma.dev'
export const DOCS_ORIGIN = 'https://docs.commma.dev'

const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
export const ON_DOCS_HOST = hostname === 'docs.commma.dev'
const ON_MAIN_PROD_HOST =
  hostname === 'commma.dev' || hostname === 'www.commma.dev'

const docSlugs = new Set(DOCS.map((doc) => doc.slug))

export function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:)/.test(href)
}

export function docTo(slug?: string): string {
  if (ON_DOCS_HOST) return slug ? `/${slug}` : '/'
  return slug ? `/docs/${slug}` : '/docs'
}

export function appTo(path: string): string {
  return ON_DOCS_HOST ? `${MAIN_ORIGIN}${path}` : path
}

export function resolveDocHref(href: string): string {
  if (isExternalHref(href)) return href
  if (href === '/docs') return docTo()
  if (href.startsWith('/docs/')) return docTo(href.slice('/docs/'.length))
  if (href.startsWith('/')) return appTo(href)
  return href
}

export function crossHostRedirect(
  pathname: string,
  search: string,
): string | null {
  if (ON_DOCS_HOST) {
    if (pathname === '/') return null
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 1 && docSlugs.has(segments[0])) return null
    return `${MAIN_ORIGIN}${pathname}${search}`
  }
  if (
    ON_MAIN_PROD_HOST &&
    (pathname === '/docs' || pathname.startsWith('/docs/'))
  ) {
    const rest = pathname.slice('/docs'.length) || '/'
    return `${DOCS_ORIGIN}${rest}${search}`
  }
  return null
}
