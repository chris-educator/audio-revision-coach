import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { SignInCreditsCallout } from '../components/SignInCreditsCallout'
import { BackToAppLink } from '../components/BackToAppLink'
import { ROUTE_ACCOUNT } from '../constants/routes'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { me, config, loading, login, register, resendVerificationEmail } = useAuth()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) {
      setError(oauthError)
    }
  }, [searchParams])

  if (!loading && me?.authenticated) {
    return <Navigate to={ROUTE_ACCOUNT} replace />
  }

  const billingReady = config?.billing_enabled
  const googleReady = billingReady && config?.google_oauth_enabled

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        setPendingVerificationEmail(null)
      } else {
        const result = await register(email, password)
        if (result.needs_email_verification) {
          setPendingVerificationEmail(result.email)
          setInfo(
            `We sent a verification link to ${result.email}. You are signed in — verify your email to unlock your free credits.`,
          )
          return
        }
        setPendingVerificationEmail(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setError(message)
      if (message.toLowerCase().includes('verify your email')) {
        setPendingVerificationEmail(email.trim())
      }
    } finally {
      setBusy(false)
    }
  }

  async function onResendVerification() {
    const target = pendingVerificationEmail ?? email.trim()
    if (!target) return
    setError(null)
    setInfo(null)
    setResendBusy(true)
    try {
      const message = await resendVerificationEmail(target)
      setInfo(message)
      setPendingVerificationEmail(target)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification email.')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-bg">
      <SignInCreditsCallout maxWidthClass="max-w-lg" />
      <div className="mx-auto w-full min-w-0 max-w-lg flex-1 px-4 pb-10 pt-6 sm:px-6">
        <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="ui-page-heading">Sign in</h1>
          <BackToAppLink variant="primary" className="shrink-0" />
        </div>
        <p className="mt-2 text-sm text-text-muted">
          {billingReady
            ? 'Create an account to use lesson credits and purchase top-up packs.'
            : 'Accounts and billing are being rolled out. You can still explore without signing in.'}
        </p>

        {!billingReady && !loading && (
          <div className="ui-callout mt-6">
            Billing is not enabled on this server yet. Ask your administrator to set{' '}
            <span className="font-medium text-text">BILLING_ENABLED</span> and{' '}
            <span className="font-medium text-text">AUTH_SECRET</span> after deploy.
          </div>
        )}

        <div className="ui-card mt-6 space-y-4 p-6 sm:p-7">
          {googleReady && (
            <a
              href="/api/auth/google/start"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition hover:border-blue hover:text-blue"
            >
              <GoogleMark />
              Continue with Google
            </a>
          )}

          {googleReady && (
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="h-px flex-1 bg-border" />
              <span>or use email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="ui-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ui-input"
                disabled={!billingReady || busy}
              />
            </div>
            <div>
              <label className="ui-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ui-input"
                disabled={!billingReady || busy}
              />
            </div>
            {info && <p className="text-sm text-text">{info}</p>}
            {error && <div className="ui-callout-orange text-sm" role="alert">{error}</div>}
            {pendingVerificationEmail && config?.email_verification_enabled !== false && (
              <button
                type="button"
                className="w-full text-sm font-medium text-blue hover:text-blue-hover disabled:opacity-50"
                onClick={onResendVerification}
                disabled={!billingReady || resendBusy}
              >
                {resendBusy ? 'Sending…' : 'Resend verification email'}
              </button>
            )}
            <button
              type="submit"
              className="ui-btn-primary w-full"
              disabled={!billingReady || busy}
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              className="w-full text-sm font-medium text-blue hover:text-blue-hover"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login'
                ? 'Need an account? Register'
                : 'Already have an account? Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 28.991 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 28.991 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}
