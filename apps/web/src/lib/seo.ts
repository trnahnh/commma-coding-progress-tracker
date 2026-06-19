import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://commma.dev'
const DEFAULT_TITLE = 'commma — every commit is a step'
const DEFAULT_DESCRIPTION =
  'Track your coding like an athlete. Pace, splits, streaks, leaderboards, and a shareable keyboard heatmap.'
const DEFAULT_OG_TYPE = 'website'
const DEFAULT_TWITTER_CARD = 'summary_large_image'
const DEFAULT_ROBOTS = 'index, follow'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`
const DEFAULT_IMAGE_SIZE = { width: 1200, height: 630 }

function setMetaByAttr(
  attr: 'property' | 'name',
  key: string,
  content: string,
) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

interface SeoOptions {
  title: string
  description?: string
  ogType?: string
  twitterCard?: string
  noindex?: boolean
  image?: { url: string; width: number; height: number }
}

export function useSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  ogType = DEFAULT_OG_TYPE,
  twitterCard = DEFAULT_TWITTER_CARD,
  noindex = false,
  image = { url: DEFAULT_IMAGE, ...DEFAULT_IMAGE_SIZE },
}: SeoOptions) {
  const { pathname } = useLocation()

  useEffect(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : SITE_URL
    const url = `${origin}${pathname}`
    document.title = title
    setMetaByAttr('name', 'description', description)
    setMetaByAttr('property', 'og:type', ogType)
    setMetaByAttr('property', 'og:title', title)
    setMetaByAttr('property', 'og:description', description)
    setMetaByAttr('property', 'og:url', url)
    setMetaByAttr('property', 'og:image', image.url)
    setMetaByAttr('property', 'og:image:width', String(image.width))
    setMetaByAttr('property', 'og:image:height', String(image.height))
    setMetaByAttr('name', 'twitter:card', twitterCard)
    setMetaByAttr('name', 'twitter:title', title)
    setMetaByAttr('name', 'twitter:description', description)
    setMetaByAttr('name', 'twitter:image', image.url)
    setCanonical(url)
    setMetaByAttr('name', 'robots', noindex ? 'noindex, nofollow' : DEFAULT_ROBOTS)

    return () => {
      document.title = DEFAULT_TITLE
      setMetaByAttr('name', 'description', DEFAULT_DESCRIPTION)
      setMetaByAttr('property', 'og:type', DEFAULT_OG_TYPE)
      setMetaByAttr('property', 'og:title', DEFAULT_TITLE)
      setMetaByAttr('property', 'og:description', DEFAULT_DESCRIPTION)
      setMetaByAttr('property', 'og:url', `${SITE_URL}/`)
      setMetaByAttr('property', 'og:image', DEFAULT_IMAGE)
      setMetaByAttr('property', 'og:image:width', String(DEFAULT_IMAGE_SIZE.width))
      setMetaByAttr('property', 'og:image:height', String(DEFAULT_IMAGE_SIZE.height))
      setMetaByAttr('name', 'twitter:card', DEFAULT_TWITTER_CARD)
      setMetaByAttr('name', 'twitter:title', DEFAULT_TITLE)
      setMetaByAttr('name', 'twitter:description', DEFAULT_DESCRIPTION)
      setMetaByAttr('name', 'twitter:image', DEFAULT_IMAGE)
      setMetaByAttr('name', 'robots', DEFAULT_ROBOTS)
    }
  }, [title, description, ogType, twitterCard, noindex, pathname, image.url, image.width, image.height])
}
