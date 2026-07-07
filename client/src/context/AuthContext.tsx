import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchBillingConfig,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  resendVerificationEmail as apiResendVerificationEmail,
  startCheckout,
  type BillingConfig,
  type MeResponse,
  type RegisterResponse,
} from '../api/billing'

type AuthContextValue = {
  me: MeResponse | null
  config: BillingConfig | null
  loading: boolean
  refresh: () => Promise<void>
  applyCreditsRemaining: (credits: number) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<RegisterResponse>
  resendVerificationEmail: (email: string) => Promise<string>
  logout: () => Promise<void>
  buyPack: (packId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [config, setConfig] = useState<BillingConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [configRes, meRes] = await Promise.all([
      fetchBillingConfig().catch(() => null),
      fetchMe().catch(() => null),
    ])
    setConfig(configRes)
    setMe(meRes)
  }, [])

  const applyCreditsRemaining = useCallback((credits: number) => {
    setMe((prev) => (prev?.authenticated ? { ...prev, credits } : prev))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      await apiLogin(email, password)
      await refresh()
    },
    [refresh],
  )

  const register = useCallback(
    async (email: string, password: string) => {
      const result = await apiRegister(email, password)
      await refresh()
      return result
    },
    [refresh],
  )

  const resendVerificationEmail = useCallback(async (email: string) => {
    const result = await apiResendVerificationEmail(email)
    return result.message
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    await refresh()
  }, [refresh])

  const buyPack = useCallback(async (packId: string) => {
    const { checkout_url } = await startCheckout(packId)
    window.location.href = checkout_url
  }, [])

  const value = useMemo(
    () => ({
      me,
      config,
      loading,
      refresh,
      applyCreditsRemaining,
      login,
      register,
      resendVerificationEmail,
      logout,
      buyPack,
    }),
    [
      me,
      config,
      loading,
      refresh,
      applyCreditsRemaining,
      login,
      register,
      resendVerificationEmail,
      logout,
      buyPack,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
