import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ResolvedTheme, ThemePreference } from '../constants/theme'
import {
  applyTheme,
  getSystemTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
} from '../utils/theme'

type ThemeContextValue = {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredTheme())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredTheme()))

  useEffect(() => {
    const next = resolveTheme(preference)
    setResolved(next)
    applyTheme(next)
    storeTheme(preference)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncSystem = () => {
      const next = getSystemTheme()
      setResolved(next)
      applyTheme(next)
    }

    syncSystem()
    media.addEventListener('change', syncSystem)
    return () => media.removeEventListener('change', syncSystem)
  }, [preference])

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference: setPreferenceState,
    }),
    [preference, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
