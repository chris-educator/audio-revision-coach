/** Must match edstack-billing FREE_SIGNUP_CREDITS. */
export const FREE_SIGNUP_CREDITS = 20


/** Unsigned SignInCreditsCallout body (login banner + home when signed out). */
export const SIGN_IN_CREDITS_CALLOUT_TEXT = `Sign up includes ${FREE_SIGNUP_CREDITS} free credits to use across all EdStack apps.`

export const APPSTAX_HOME_URL = 'https://appstax.ai'
export const EDSTACK_CREDITS_URL = 'https://edstack.appstax.ai/credits'
export const EDSTACK_HOME_URL = 'https://edstack.appstax.ai'
export const EDSTACK_TOOLS_URL = 'https://edstack.appstax.ai/#stack'
export const APPSTAX_SUPPORT_EMAIL = 'apps@appstax.ai'

export const APP_TITLE = 'Audio Revision Coach'
export const APP_TITLE_MUTED = 'Audio '
export const APP_TITLE_ACCENT = 'Revision Coach'

export type EdStackAudienceLabel = 'Teachers' | 'Students' | 'Parents'
export const EDSTACK_AUDIENCE: EdStackAudienceLabel = 'Students'
export const BROWSER_TAB_TITLE = `${APP_TITLE} | EdStack for ${EDSTACK_AUDIENCE}`
export const APP_BUG_REPORT_NAME = 'Audio Revision Coach'

export const APP_TAGLINE =
  'Flashcard decks and listen-aloud revision scripts for Australian secondary topics — revise with your ears and test yourself before exams.'

export const APP_INTRO_LINES = [
  'Pick a topic, generate a flashcard deck or a listen-aloud script, then use browser Listen mode.',
  '3 credits per deck · 5 credits per script when billing is on.',
] as const

export function appstaxMailto(options: { subject?: string; body?: string } = {}) {
  const params: string[] = []
  if (options.subject) params.push(`subject=${encodeURIComponent(options.subject)}`)
  if (options.body) params.push(`body=${encodeURIComponent(options.body)}`)
  const query = params.length ? `?${params.join('&')}` : ''
  return `mailto:${APPSTAX_SUPPORT_EMAIL}${query}`
}

export function appstaxBugReportMailto(appName = APP_BUG_REPORT_NAME) {
  return appstaxMailto({ subject: `Bug report — ${appName}` })
}

export function appstaxFlagAssistantReplyMailto(options: { assistantMessage?: string } = {}) {
  const snippet = options.assistantMessage?.slice(0, 500) ?? ''
  const body = snippet
    ? `I'd like to flag this Assistant reply from ${APP_TITLE}:\n\n---\n${snippet}\n---\n\n`
    : `I'd like to flag an Assistant reply from ${APP_TITLE}.\n\n`
  return appstaxMailto({ subject: `Flag Assistant reply — ${APP_TITLE}`, body })
}

export function appstaxCopyrightLine(year = new Date().getFullYear()) {
  return `© ${year} AppStax · Limited only by Imagination · Brisbane · Australia`
}

export const APP_PRIVACY_BLURB =
  'Revision topics are processed by AI per request and not stored on AppStax servers. Listen mode uses your browser text-to-speech locally.'

export const THEME_STORAGE_KEY = 'audio-revision-coach-theme'
