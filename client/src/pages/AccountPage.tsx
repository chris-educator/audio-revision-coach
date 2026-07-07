import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { fetchMe, fulfillCheckout, isRetryableFulfillError } from '../api/billing'
import { SignInCreditsCallout } from '../components/SignInCreditsCallout'
import { BackToAppLink } from '../components/BackToAppLink'
import { ROUTE_LOGIN } from '../constants/routes'
import { EDSTACK_CREDITS_URL } from '../constants/branding'
import { useAuth } from '../context/AuthContext'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function AccountPage() {
  const { me, config, loading, logout, refresh, resendVerificationEmail } = useAuth()
  const [params] = useSearchParams()
  const checkout = params.get('checkout')
  const emailVerified = params.get('verified') === '1'
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [resendBusy, setResendBusy] = useState(false)
  const needsEmailVerification =
    config?.email_verification_enabled !== false && me?.authenticated && me.email_verified === false
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutFulfilled, setCheckoutFulfilled] = useState<boolean | null>(null)
  const sessionId = params.get('session_id')

  useEffect(() => {
    if (checkout !== 'success' || !sessionId) return
    if (loading) return
    if (config?.billing_enabled && !me?.authenticated) return

    let cancelled = false
    ;(async () => {
      const beforeCredits = me?.credits ?? 0
      let granted: boolean | null = null
      let lastError: string | null = null

      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (cancelled) return
        if (attempt > 0) await sleep(1200 * attempt)
        try {
          const result = await fulfillCheckout(sessionId)
          granted = result.granted
          lastError = null
          break
        } catch (err) {
          lastError =
            err instanceof Error ? err.message : 'Could not apply purchased credits.'
          if (!isRetryableFulfillError(lastError) || attempt === 3) break
        }
      }

      if (!cancelled) await refresh()

      if (cancelled) return

      const meAfter = await fetchMe().catch(() => null)
      const afterCredits = meAfter?.credits ?? beforeCredits
      if (afterCredits > beforeCredits) {
        setCheckoutFulfilled(true)
        setCheckoutError(null)
        return
      }

      if (granted === true) {
        setCheckoutFulfilled(true)
        setCheckoutError(null)
        return
      }

      if (granted === false) {
        setCheckoutFulfilled(false)
        setCheckoutError(null)
        return
      }

      setCheckoutFulfilled(false)
      setCheckoutError(lastError)
    })()

    return () => {
      cancelled = true
    }
  }, [checkout, sessionId, loading, config?.billing_enabled, me?.authenticated, me?.credits, refresh])

  if (!loading && config?.billing_enabled && !me?.authenticated) {
    return <Navigate to={ROUTE_LOGIN} replace />
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-bg">
      <SignInCreditsCallout maxWidthClass="max-w-2xl" />
      <div className="mx-auto w-full min-w-0 max-w-2xl flex-1 px-4 pb-10 pt-6 sm:px-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="ui-page-heading">Account &amp; Credits</h1>
          <BackToAppLink variant="primary" className="shrink-0" />
        </div>

        {needsEmailVerification && (
          <div className="ui-callout mt-4 text-sm">
            <p>
              Verify your email to unlock signup credits and generate lessons. We sent a link to{' '}
              <span className="font-medium text-text">{me?.email}</span>.
            </p>
            {verifyNotice && <p className="mt-2 text-text">{verifyNotice}</p>}
            {verifyError && <div className="ui-callout-orange mt-2 text-sm" role="alert">{verifyError}</div>}
            <button
              type="button"
              className="mt-3 text-sm font-medium text-blue hover:text-blue-hover disabled:opacity-50"
              disabled={resendBusy || !me?.email}
              onClick={async () => {
                if (!me?.email) return
                setVerifyNotice(null)
                setVerifyError(null)
                setResendBusy(true)
                try {
                  setVerifyNotice(await resendVerificationEmail(me.email))
                } catch (err) {
                  setVerifyError(
                    err instanceof Error ? err.message : 'Could not resend verification email.',
                  )
                } finally {
                  setResendBusy(false)
                }
              }}
            >
              {resendBusy ? 'Sending…' : 'Resend verification email'}
            </button>
          </div>
        )}

        {emailVerified && (
          <div className="ui-callout-active mt-4">
            Your email is verified — your free signup credits are ready to use.
          </div>
        )}

        {checkout === 'success' && checkoutFulfilled === true && (
          <div className="ui-callout-active mt-4">Thanks — your credits have been added.</div>
        )}
        {checkout === 'success' && checkoutFulfilled === false && !checkoutError && (
          <div className="ui-callout-active mt-4">
            Thanks — payment received. Your credits were already applied or are still processing.
          </div>
        )}
        {checkout === 'success' && checkoutFulfilled === null && !sessionId && (
          <div className="ui-callout-active mt-4">
            Thanks — your payment is processing. Credits appear shortly.
          </div>
        )}
        {checkout === 'success' && checkoutFulfilled === null && sessionId && (
          <div className="ui-callout mt-4 text-sm text-text-muted">Applying your purchased credits…</div>
        )}
        {checkout === 'cancelled' && (
          <div className="ui-callout mt-4">Checkout cancelled. No charges were made.</div>
        )}

        {checkout === 'success' && checkoutError && (
          <div className="ui-callout-orange mt-4" role="alert">{checkoutError}</div>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-text-muted">Loading account…</p>
        ) : !config?.billing_enabled ? (
          <div className="ui-callout mt-6">
            Billing is not enabled on this deployment. Resource to Lesson works without credits for now.
          </div>
        ) : (
          <>
            <div className="ui-card mt-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p className="min-w-0 text-sm text-text-muted">
                  Signed in as{' '}
                  <span className="font-medium text-text">{me?.email}</span>
                </p>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="shrink-0 text-base font-semibold text-blue hover:text-blue-hover"
                >
                  Sign Out
                </button>
              </div>
              <p className="mt-6 text-3xl font-bold text-blue">{me?.credits ?? 0}</p>
              <p className="text-sm text-text-muted">credits remaining</p>
              <p className="mt-3 text-xs text-text-muted">Each lesson generation costs credits — see the quote before you generate.</p>
            </div>

            <h2 className="ui-section-heading mt-8 mb-1">Need more credits?</h2>
            <p className="text-sm leading-snug text-text-muted">
              Top up once and use your credits on any credit-based EdStack app. Tools like Graph Builder,
              Map Builder, and Classroom Clock stay free — no credits needed.
            </p>
            <a
              href={EDSTACK_CREDITS_URL}
              className="ui-btn-primary mt-4 inline-flex w-full items-center justify-center sm:w-auto"
            >
              Buy credits at EdStack →
            </a>
          </>
        )}
      </div>
    </div>
  )
}
