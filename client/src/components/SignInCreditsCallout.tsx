import { Link } from 'react-router-dom'
import { SIGN_IN_CREDITS_CALLOUT_TEXT } from '../constants/branding'
import { ROUTE_LOGIN } from '../constants/routes'
import { useAuth } from '../context/AuthContext'

type SignInCreditsCalloutProps = {
  maxWidthClass?: string
  linkSignIn?: boolean
  showCreditsWhenSignedIn?: boolean
  creditQuote?: string | null
  className?: string
}

export function SignInCreditsCallout({
  maxWidthClass = 'max-w-md',
  linkSignIn = false,
  showCreditsWhenSignedIn = false,
  creditQuote = null,
  className = '',
}: SignInCreditsCalloutProps) {
  const { me, config, loading } = useAuth()

  if (loading || !config?.billing_enabled) {
    return null
  }

  if (me?.authenticated) {
    if (me.email_verified === false && config?.email_verification_enabled !== false) {
      return (
        <div
          className={`mx-auto w-full px-4 pt-4 sm:px-6 md:px-8 ${maxWidthClass} ${className}`.trim()}
        >
          <div className="ui-callout w-full text-sm">
            Verify your email to use credits — check your inbox for the link we sent when you signed up.
          </div>
        </div>
      )
    }
    if (!showCreditsWhenSignedIn) return null
    return (
      <div
        className={`mx-auto w-full px-4 pt-4 sm:px-6 md:px-8 ${maxWidthClass} ${className}`.trim()}
      >
        <div className="sign-in-credits-callout sign-in-credits-callout--balance max-w-full">
          <span>
            <span className="sign-in-credits-callout__credits">{me.credits ?? 0} credits</span> available
            across all credit-based EdStack apps.
          </span>
          {creditQuote ? (
            <span className="sign-in-credits-callout__run">This run: {creditQuote}</span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mx-auto w-full px-4 pt-4 sm:px-6 md:px-8 ${maxWidthClass} ${className}`.trim()}
    >
      <div className="sign-in-credits-callout w-full">
        {linkSignIn ? (
          <>
            <Link to={ROUTE_LOGIN} className="sign-in-credits-callout__link">
              Sign in
            </Link>
            {' — '}
            {SIGN_IN_CREDITS_CALLOUT_TEXT}
          </>
        ) : (
          SIGN_IN_CREDITS_CALLOUT_TEXT
        )}
      </div>
    </div>
  )
}
