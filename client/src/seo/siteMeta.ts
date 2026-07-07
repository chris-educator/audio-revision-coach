import { BROWSER_TAB_TITLE } from '../constants/branding'

export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://revise.appstax.ai'

export const SITE_NAME = 'Audio Revision Coach'

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`
export const DEFAULT_OG_IMAGE_ALT =
  'Virtual Science Lab — PhET simulations with AI explanations for Australian students'

export const DEFAULT_DESCRIPTION =
  'Run virtual chemistry, physics, and biology experiments with PhET simulations and AI explanations — export lab report scaffolds for Australian students.'

export const SEO_KEYWORDS = [
  'virtual science lab',
  'PhET simulations',
  'science prac',
  'QCAA lab report',
  'chemistry physics biology',
  'Australian students',
  'EdStack',
  'lab.appstax.ai',
].join(', ')

export interface PageSeo {
  title: string
  description: string
  path: string
  keywords?: string
  ogImage?: string
  ogImageAlt?: string
  canonicalPath?: string
  index?: boolean
}

export const PAGE_SEO = {
  home: {
    title: BROWSER_TAB_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    keywords: SEO_KEYWORDS,
  },
  login: {
    title: `Sign in | ${SITE_NAME}`,
    description: 'Sign in for EdStack credits to run virtual science lab explanations.',
    path: '/login',
    index: false,
  },
  account: {
    title: `Account | ${SITE_NAME}`,
    description: 'Manage your EdStack credits for Virtual Science Lab.',
    path: '/account',
    index: false,
  },
} as const satisfies Record<string, PageSeo>

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-AU',
  }
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    audience: { '@type': 'Audience', audienceType: 'Students' },
  }
}

export function webPageJsonLd(seo: PageSeo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    url: `${SITE_URL}${seo.path}`,
    inLanguage: 'en-AU',
  }
}
