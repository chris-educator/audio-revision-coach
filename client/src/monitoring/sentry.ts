/** Optional Sentry browser reporting — enabled when VITE_SENTRY_DSN is set at build time. */

import * as Sentry from '@sentry/react'

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn?.trim()) return

  Sentry.init({
    dsn: dsn.trim(),
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined)?.trim(),
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined)?.trim(),
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0,
  })
}
