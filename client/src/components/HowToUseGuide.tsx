import { HOW_TO_USE_HINTS, HOW_TO_USE_STEPS } from '../constants/howToUse'
import { APP_TITLE } from '../constants/branding'

export function HowToUseGuide() {
  return (
    <section
      className="app-how-to-guide no-print mb-6"
      aria-labelledby="how-to-use-heading"
      data-tour="how-to-use"
    >
      <div className="app-how-to-guide__header">
        <span className="app-how-to-guide__badge">Quick Guide</span>
        <h2 id="how-to-use-heading" className="app-how-to-guide__title">
          How to Use {APP_TITLE}
        </h2>
        <p className="app-how-to-guide__lead">
          Exam revision with flashcards and listen-aloud scripts. Use{' '}
          <strong className="font-semibold text-text">Ask</strong> in the top bar for help.
        </p>
      </div>

      <ol className="app-how-to-guide__steps" aria-label="Practice workflow">
        {HOW_TO_USE_STEPS.map((item) => (
          <li key={item.step} className="app-how-to-guide__step">
            <span className="app-how-to-guide__num" aria-hidden="true">
              {item.step}
            </span>
            <div className="app-how-to-guide__body">
              <p className="app-how-to-guide__step-title">{item.title}</p>
              <p className="app-how-to-guide__step-detail">{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="app-how-to-guide__footer">
        <ul className="app-how-to-guide__hints" aria-label="Quick hints">
          {HOW_TO_USE_HINTS.map((hint) => (
            <li key={hint} className="app-how-to-guide__hint-pill">
              {hint}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
