import type { ReactNode } from 'react'
import { CreditsTopBarLink } from './CreditsTopBarLink'
import { EdStackThemeSwitch } from './EdStackThemeSwitch'
import { SignInTopBarLink } from './SignInTopBarLink'
import { SignOutButton } from './SignOutButton'
import { ShareMenu } from './ShareMenu'

type SiteTopBarToolsProps = {
  showAsk?: boolean
  /** Pass `<AskAssistant apiReady={…} />` from each app that ships Ask. */
  askSlot?: ReactNode
  showBilling?: boolean
  signedIn?: boolean
  credits?: number
  accountTo?: string
  loginTo?: string
  onLogout?: () => void
  shareTriggerAriaLabel?: string
  /** Rendered before credits / sign-in (e.g. skin picker). */
  primaryBeforeTheme?: ReactNode
  /** Rendered before Ask. */
  secondaryBeforeAsk?: ReactNode
}

/**
 * Standard EdStack top-bar controls — Ask · Credits · Sign · Share · Theme.
 * Desktop: flex order via CSS. Mobile: Ask beside logo (row 1), other controls full width (row 2).
 */
export function SiteTopBarTools({
  showAsk = true,
  askSlot = null,
  showBilling = false,
  signedIn = false,
  credits = 0,
  accountTo = '/account',
  loginTo = '/login',
  onLogout,
  shareTriggerAriaLabel,
  primaryBeforeTheme,
  secondaryBeforeAsk,
}: SiteTopBarToolsProps) {
  const askControl = showAsk ? askSlot : null
  const hasAskRow = askControl || secondaryBeforeAsk

  return (
    <>
      {hasAskRow ? (
        <div className="site-top-bar__group-secondary">
          {secondaryBeforeAsk}
          {askControl}
        </div>
      ) : null}
      <div className="site-top-bar__group-primary">
        {primaryBeforeTheme}
        {showBilling && signedIn ? (
          <CreditsTopBarLink credits={credits} to={accountTo} />
        ) : null}
        {showBilling && !signedIn ? <SignInTopBarLink to={loginTo} /> : null}
        {showBilling && signedIn && onLogout ? (
          <SignOutButton onClick={onLogout} />
        ) : null}
        <ShareMenu triggerAriaLabel={shareTriggerAriaLabel} />
        <EdStackThemeSwitch />
      </div>
    </>
  )
}
