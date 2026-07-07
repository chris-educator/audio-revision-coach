import { APP_TITLE } from '../constants/branding'
import { useOnboarding } from '../context/OnboardingContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'

export function WelcomeDialog() {
  const { welcomeOpen, dismissWelcome, startTour } = useOnboarding()
  useLockBodyScroll(welcomeOpen)

  if (!welcomeOpen) return null

  return (
    <div className="product-tour-welcome-root" role="presentation">
      <button
        type="button"
        className="product-tour-welcome-backdrop"
        aria-label="Close welcome for now"
        onClick={dismissWelcome}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-dialog-title"
        aria-describedby="welcome-dialog-desc"
        className="product-tour-welcome-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="welcome-dialog-title" className="product-tour-welcome-panel__title">
          Welcome to {APP_TITLE}
        </h2>
        <p id="welcome-dialog-desc" className="product-tour-welcome-panel__body">
          Flashcard decks and listen-aloud revision scripts — pick a topic, generate, and use Listen
          mode in your browser before exams.
        </p>
        <div className="product-tour-welcome-panel__actions">
          <button
            type="button"
            onClick={dismissWelcome}
            className="ui-btn-secondary w-full sm:w-auto"
          >
            Maybe later
          </button>
          <button type="button" onClick={startTour} className="ui-btn-primary w-full sm:w-auto">
            Take a quick tour
          </button>
        </div>
      </div>
    </div>
  )
}
