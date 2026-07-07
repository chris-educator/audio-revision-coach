import { fetchWithTimeout } from './fetchWithTimeout'
import { parseJsonResponse } from './parseJsonResponse'

const HEALTH_TIMEOUT_MS = 15_000

export type CreditPack = {
  id: string
  label: string
  credits: number
  price_display: string
  available: boolean
}

export type BillingConfig = {
  billing_enabled: boolean
  google_oauth_enabled?: boolean
  free_signup_credits: number
  packs?: CreditPack[]
  email_verification_enabled?: boolean
  shared_wallet?: boolean
}

export type RegisterResponse = {
  email: string
  credits?: number
  needs_email_verification?: boolean
}

export type MeResponse = {
  authenticated: boolean
  billing_enabled: boolean
  email: string | null
  email_verified?: boolean
  credits: number | null
}

function apiErrorDetail(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

export async function fetchBillingConfig() {
  const res = await fetchWithTimeout('/api/billing/config', undefined, HEALTH_TIMEOUT_MS)
  return parseJsonResponse<BillingConfig>(res)
}

export async function fetchMe() {
  const res = await fetchWithTimeout('/api/me', { credentials: 'include' }, HEALTH_TIMEOUT_MS)
  if (!res.ok) throw new Error('Could not load account.')
  return parseJsonResponse<MeResponse>(res)
}

export async function login(email: string, password: string) {
  const res = await fetchWithTimeout(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    },
    HEALTH_TIMEOUT_MS,
  )
  const data = await parseJsonResponse<{ detail?: string }>(res).catch(() => ({}))
  if (!res.ok) throw new Error(apiErrorDetail(data, 'Sign in failed.'))
}

export async function register(email: string, password: string) {
  const res = await fetchWithTimeout(
    '/api/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    },
    HEALTH_TIMEOUT_MS,
  )
  const data = await parseJsonResponse<RegisterResponse & { detail?: string }>(res).catch(() => ({}))
  if (!res.ok) throw new Error(apiErrorDetail(data, 'Registration failed.'))
  return data as RegisterResponse
}

export async function resendVerificationEmail(email: string) {
  const res = await fetchWithTimeout(
    '/api/auth/resend-verification',
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    HEALTH_TIMEOUT_MS,
  )
  const data = await parseJsonResponse<{ detail?: string; message?: string }>(res).catch(() => ({
    detail: undefined,
    message: undefined,
  }))
  if (!res.ok) throw new Error(apiErrorDetail(data, 'Could not resend verification email.'))
  return { ok: true as const, message: data.message ?? 'Verification email sent.' }
}

export async function logout() {
  await fetchWithTimeout(
    '/api/auth/logout',
    { method: 'POST', credentials: 'include' },
    HEALTH_TIMEOUT_MS,
  )
}

export async function startCheckout(packId: string) {
  const res = await fetchWithTimeout(
    '/api/billing/checkout',
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack_id: packId }),
    },
    HEALTH_TIMEOUT_MS,
  )
  const data = await parseJsonResponse<{ detail?: string; checkout_url?: string }>(res).catch(() => ({}))
  if (!res.ok) throw new Error(apiErrorDetail(data, 'Checkout could not start.'))
  return data as { checkout_url: string }
}

export async function fulfillCheckout(sessionId: string) {
  const res = await fetchWithTimeout(
    '/api/billing/fulfill-checkout',
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    },
    HEALTH_TIMEOUT_MS,
  )
  const data = await parseJsonResponse<{ detail?: string; credits?: number; granted?: boolean }>(res).catch(
    () => ({}),
  )
  if (!res.ok) throw new Error(apiErrorDetail(data, 'Could not apply purchased credits.'))
  return data as { credits: number; granted: boolean }
}

export function isRetryableFulfillError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('not complete yet') ||
    lower.includes('could not load checkout session') ||
    lower.includes('timed out')
  )
}
