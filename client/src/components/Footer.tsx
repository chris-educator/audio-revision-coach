import type { MouseEvent, ReactNode } from 'react'
import {
  APP_PRIVACY_BLURB,
  appstaxBugReportMailto,
  appstaxCopyrightLine,
} from '../constants/branding'
import { AppstaxMailtoLink } from './AppstaxMailtoLink'

function scrollToTop(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function FooterGreenLight() {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.85)] ring-1 ring-[#22c55e]/40"
      aria-hidden
    />
  )
}

type FooterProps = {
  /** Optional extra line(s) below privacy blurb (app-specific). */
  extra?: ReactNode
}

export function Footer({ extra }: FooterProps) {
  return (
    <footer className="mt-auto shrink-0 border-t border-white/6 bg-[#09090b]">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 md:px-8">
        <p className="text-center text-xs font-medium text-[#fafafa]">
          <a
            href="#top"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 transition-colors hover:text-[#22c55e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22c55e]"
          >
            <span>{appstaxCopyrightLine()} · Powered by AI</span>
            <FooterGreenLight />
          </a>
          <AppstaxMailtoLink
            href={appstaxBugReportMailto()}
            className="appstax-bug-report-link ml-[1ch]"
          >
            Report a Bug
          </AppstaxMailtoLink>
        </p>
        <p className="mx-auto mt-1.5 max-w-2xl text-center text-[11px] leading-relaxed text-[#a1a1aa]">
          {APP_PRIVACY_BLURB}
        </p>
        <p className="mx-auto mt-1 text-center text-[11px] text-[#71717a]">
          <a
            href="/privacy.html"
            className="text-[#a1a1aa] underline-offset-2 hover:text-[#fafafa] hover:underline"
          >
            Privacy Policy
          </a>
          <span aria-hidden="true"> · </span>
          <a
            href="/terms.html"
            className="text-[#a1a1aa] underline-offset-2 hover:text-[#fafafa] hover:underline"
          >
            Terms of Service
          </a>
          <span aria-hidden="true"> · </span>
          <a
            href="/teacher-data.html"
            className="text-[#a1a1aa] underline-offset-2 hover:text-[#fafafa] hover:underline"
          >
            School Data
          </a>
        </p>
        {extra}
      </div>
    </footer>
  )
}
