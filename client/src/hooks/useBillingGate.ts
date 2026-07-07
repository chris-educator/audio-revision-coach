import { ROUTE_ACCOUNT, ROUTE_LOGIN } from '../constants/routes'
import { useAuth } from '../context/AuthContext'

export function useBillingGate() {
  const { me, config } = useAuth()
  const billingActive = config?.billing_enabled === true
  const requiresSignIn = billingActive && !me?.authenticated
  const requiresEmailVerification =
    billingActive && !!me?.authenticated && me.email_verified === false

  return {
    billingActive,
    requiresSignIn,
    requiresEmailVerification,
    signInTo: ROUTE_LOGIN,
    emailVerifyTo: ROUTE_ACCOUNT,
  }
}
