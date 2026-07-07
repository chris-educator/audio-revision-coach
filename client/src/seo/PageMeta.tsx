import { useEffect } from 'react'
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  SITE_NAME,
  SITE_URL,
  softwareApplicationJsonLd,
  webPageJsonLd,
  webSiteJsonLd,
  type PageSeo,
} from './siteMeta'

const JSON_LD_ID = 'virtual-science-lab-jsonld'

function upsertMeta(
  selector: string,
  create: () => HTMLElement,
  apply: (el: HTMLElement) => void,
) {
  let el = document.head.querySelector(selector) as HTMLElement | null
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  apply(el)
}

function setMetaName(name: string, content: string) {
  upsertMeta(
    `meta[name="${name}"]`,
    () => {
      const meta = document.createElement('meta')
      meta.setAttribute('name', name)
      return meta
    },
    (el) => {
      ;(el as HTMLMetaElement).content = content
    },
  )
}

function setMetaProperty(property: string, content: string) {
  upsertMeta(
    `meta[property="${property}"]`,
    () => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', property)
      return meta
    },
    (el) => {
      ;(el as HTMLMetaElement).content = content
    },
  )
}

function setLinkRel(rel: string, href: string, extra?: Record<string, string>) {
  const suffix = extra?.hreflang ? `[hreflang="${extra.hreflang}"]` : ''
  upsertMeta(
    `link[rel="${rel}"]${suffix}`,
    () => {
      const link = document.createElement('link')
      link.rel = rel
      if (extra) {
        Object.entries(extra).forEach(([key, value]) => link.setAttribute(key, value))
      }
      return link
    },
    (el) => {
      ;(el as HTMLLinkElement).href = href
    },
  )
}

function setJsonLd(documents: object[]) {
  const payload =
    documents.length === 1
      ? documents[0]
      : {
          '@context': 'https://schema.org',
          '@graph': documents.map((doc) => {
            const { '@context': _context, ...rest } = doc as Record<string, unknown>
            return rest
          }),
        }

  upsertMeta(
    `#${JSON_LD_ID}`,
    () => {
      const script = document.createElement('script')
      script.id = JSON_LD_ID
      script.type = 'application/ld+json'
      return script
    },
    (el) => {
      el.textContent = JSON.stringify(payload)
    },
  )
}

interface PageMetaProps {
  seo: PageSeo
  includeDiscoverySchema?: boolean
}

export function PageMeta({ seo, includeDiscoverySchema = false }: PageMetaProps) {
  useEffect(() => {
    const canonicalPath = seo.canonicalPath ?? seo.path
    const canonical = `${SITE_URL}${canonicalPath}`
    const ogImage = seo.ogImage ?? DEFAULT_OG_IMAGE
    const ogImageAlt = seo.ogImageAlt ?? DEFAULT_OG_IMAGE_ALT
    const indexable = seo.index !== false
    const robots = indexable
      ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      : 'noindex, nofollow'

    document.title = seo.title
    document.documentElement.lang = 'en-AU'

    setMetaName('description', seo.description)
    setMetaName('robots', robots)
    if (seo.keywords) setMetaName('keywords', seo.keywords)
    setMetaName('author', 'AppStax')
    setMetaName('application-name', SITE_NAME)
    setMetaName('theme-color', '#0084ff')

    setLinkRel('canonical', canonical)
    setLinkRel('manifest', `${SITE_URL}/manifest.webmanifest`)

    setMetaProperty('og:site_name', SITE_NAME)
    setMetaProperty('og:title', seo.title)
    setMetaProperty('og:description', seo.description)
    setMetaProperty('og:type', 'website')
    setMetaProperty('og:url', canonical)
    setMetaProperty('og:locale', 'en_AU')
    setMetaProperty('og:image', ogImage)
    setMetaProperty('og:image:alt', ogImageAlt)

    setMetaName('twitter:card', 'summary_large_image')
    setMetaName('twitter:title', seo.title)
    setMetaName('twitter:description', seo.description)
    setMetaName('twitter:image', ogImage)

    const jsonLd: object[] = [webPageJsonLd(seo)]
    if (includeDiscoverySchema) {
      jsonLd.unshift(webSiteJsonLd())
      jsonLd.push(softwareApplicationJsonLd())
    }
    setJsonLd(jsonLd)
  }, [seo, includeDiscoverySchema])

  return null
}
