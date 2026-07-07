import { useTheme } from '../context/ThemeContext'

/** Binary light/dark toggle — matches EdStack marketing header. */
export function EdStackThemeSwitch() {
  const { resolved, setPreference } = useTheme()
  const isDark = resolved === 'dark'

  return (
    <button
      type="button"
      className={[
        'edstack-theme-switch site-top-bar__theme',
        isDark ? 'edstack-theme-switch--dark' : '',
      ].join(' ')}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
    >
      <span className="edstack-theme-switch__track" aria-hidden>
        <span className="edstack-theme-switch__thumb" />
      </span>
    </button>
  )
}
