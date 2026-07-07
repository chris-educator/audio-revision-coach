export { THEME_STORAGE_KEY } from './branding'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_OPTIONS: { value: ThemePreference; label: string; ariaLabel: string }[] = [
  { value: 'system', label: 'Auto', ariaLabel: 'Auto' },
  { value: 'light', label: 'Light', ariaLabel: 'Light' },
  { value: 'dark', label: 'Dark', ariaLabel: 'Dark' },
]
