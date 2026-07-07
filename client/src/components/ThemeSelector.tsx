import { THEME_OPTIONS } from '../constants/theme'
import { useTheme } from '../context/ThemeContext'

export function ThemeSelector() {
  const { preference, setPreference } = useTheme()

  return (
    <div
      className="site-top-bar__theme inline-flex h-9 w-full items-center rounded-lg border border-border bg-surface p-0.5 shadow-sm sm:w-auto"
      role="group"
      aria-label="Theme"
    >
      {THEME_OPTIONS.map((option) => {
        const active = preference === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            aria-label={option.ariaLabel}
            title={option.ariaLabel}
            aria-pressed={active}
            className={[
              'flex h-full items-center rounded-md px-2.5 text-sm font-medium transition-colors sm:px-3',
              active
                ? 'bg-blue text-btn-label shadow-sm'
                : 'text-text-muted hover:bg-surface-raised hover:text-text',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
