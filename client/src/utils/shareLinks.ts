import { APP_TAGLINE, APP_TITLE } from '../constants/branding'

export const SHARE_TITLE = APP_TITLE
export const SHARE_TEXT = APP_TAGLINE

export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ??
  (typeof window !== 'undefined' ? window.location.origin : 'https://quick.appstax.ai')

export function getShareUrl(): string {
  if (typeof window === 'undefined') {
    return `${SITE_URL}/`
  }
  const url = new URL(window.location.href)
  url.hash = ''
  return url.toString()
}

function encodedUrl(url: string) {
  return encodeURIComponent(url)
}

function encodedText(text: string) {
  return encodeURIComponent(text)
}

export function facebookShareUrl(shareUrl = getShareUrl()) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl(shareUrl)}`
}

export function instagramShareUrl() {
  return 'https://www.instagram.com/'
}

export function linkedInShareUrl(shareUrl = getShareUrl()) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl(shareUrl)}`
}

export function pinterestShareUrl(shareUrl = getShareUrl()) {
  const params = new URLSearchParams({ url: shareUrl, description: SHARE_TEXT })
  return `https://pinterest.com/pin/create/button/?${params.toString()}`
}

export function redditShareUrl(shareUrl = getShareUrl()) {
  const params = new URLSearchParams({ url: shareUrl, title: SHARE_TITLE })
  return `https://www.reddit.com/submit?${params.toString()}`
}

export function telegramShareUrl(shareUrl = getShareUrl()) {
  const params = new URLSearchParams({ url: shareUrl, text: SHARE_TEXT })
  return `https://t.me/share/url?${params.toString()}`
}

export function whatsAppShareUrl(shareUrl = getShareUrl()) {
  return `https://wa.me/?text=${encodedText(`${SHARE_TEXT} ${shareUrl}`)}`
}

export function xShareUrl(shareUrl = getShareUrl()) {
  const params = new URLSearchParams({ url: shareUrl, text: SHARE_TEXT })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}
