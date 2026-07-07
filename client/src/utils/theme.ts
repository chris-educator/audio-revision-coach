import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from '../constants/theme'

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference
}

export function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}

export function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    /* private browsing */
  }
  return 'system'
}

export function storeTheme(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* private browsing */
  }
}
