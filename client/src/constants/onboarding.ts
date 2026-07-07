export const ONBOARDING_COMPLETE_KEY = 'audio-revision-coach-onboarding-complete'
export const ONBOARDING_WELCOME_DISMISSED_SESSION_KEY = 'audio-revision-coach-welcome-dismissed-session'
export const ONBOARDING_TOUR_STEP_SESSION_KEY = 'audio-revision-coach-tour-step'
export const TOUR_NAV_SETTLE_MS = 400

export type TourStep = { id: string; target: string; title: string; body: string; homeOnly?: boolean }

export const TOUR_STEPS: TourStep[] = [
  { id: 'how-to-use', target: '[data-tour="how-to-use"]', title: 'Audio revision', body: 'Flashcards and listen-aloud scripts for exam prep.' },
  { id: 'revision-topic', target: '[data-tour="revision-topic"]', title: 'Pick a topic', body: 'Presets or custom topic with year level.', homeOnly: true },
  { id: 'revision-generate', target: '[data-tour="revision-generate"]', title: 'Generate', body: 'Deck (3 credits) or script (5 credits).', homeOnly: true },
  { id: 'revision-deck', target: '[data-tour="revision-deck"]', title: 'Flashcards', body: 'Question-and-answer cards to test yourself.', homeOnly: true },
  { id: 'revision-script', target: '[data-tour="revision-script"]', title: 'Listen mode', body: 'Browser reads the script aloud — headphones recommended.', homeOnly: true },
  { id: 'ask-assistant', target: '[data-tour="ask-assistant"]', title: 'Ask anytime', body: 'Help with topics, credits, or listen mode.' },
]

export function isOnboardingComplete(): boolean {
  try { return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === '1' } catch { return false }
}
export function markOnboardingComplete(): void {
  try { localStorage.setItem(ONBOARDING_COMPLETE_KEY, '1') } catch { /* ignore */ }
  clearTourStepSession()
}
export function isWelcomeDismissedThisSession(): boolean {
  try { return sessionStorage.getItem(ONBOARDING_WELCOME_DISMISSED_SESSION_KEY) === '1' } catch { return false }
}
export function markWelcomeDismissedThisSession(): void {
  try { sessionStorage.setItem(ONBOARDING_WELCOME_DISMISSED_SESSION_KEY, '1') } catch { /* ignore */ }
}
export function readTourStepSession(): number | null {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_TOUR_STEP_SESSION_KEY)
    if (raw === null) return null
    const step = Number.parseInt(raw, 10)
    if (!Number.isFinite(step) || step < 0 || step >= TOUR_STEPS.length) return null
    return step
  } catch { return null }
}
export function writeTourStepSession(step: number): void {
  try { sessionStorage.setItem(ONBOARDING_TOUR_STEP_SESSION_KEY, String(step)) } catch { /* ignore */ }
}
export function clearTourStepSession(): void {
  try { sessionStorage.removeItem(ONBOARDING_TOUR_STEP_SESSION_KEY) } catch { /* ignore */ }
}
export function shouldShowWelcome(): boolean {
  return !isOnboardingComplete() && !isWelcomeDismissedThisSession()
}
