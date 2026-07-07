import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  clearTourStepSession,
  isOnboardingComplete,
  markOnboardingComplete,
  markWelcomeDismissedThisSession,
  readTourStepSession,
  shouldShowWelcome,
  TOUR_NAV_SETTLE_MS,
  TOUR_STEPS,
  writeTourStepSession,
} from '../constants/onboarding'

type OnboardingContextValue = {
  welcomeOpen: boolean
  tourActive: boolean
  tourStepIndex: number
  tourStepCount: number
  currentTourStep: (typeof TOUR_STEPS)[number] | null
  dismissWelcome: () => void
  startTour: () => void
  replayTour: () => void
  nextTourStep: () => void
  prevTourStep: () => void
  skipTour: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

function readInitialState(): {
  welcomeOpen: boolean
  tourActive: boolean
  tourStepIndex: number
} {
  if (isOnboardingComplete()) {
    return { welcomeOpen: false, tourActive: false, tourStepIndex: 0 }
  }

  const savedStep = readTourStepSession()
  if (savedStep !== null) {
    return { welcomeOpen: false, tourActive: true, tourStepIndex: savedStep }
  }

  return {
    welcomeOpen: shouldShowWelcome(),
    tourActive: false,
    tourStepIndex: 0,
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [initial] = useState(readInitialState)
  const [welcomeOpen, setWelcomeOpen] = useState(initial.welcomeOpen)
  const [tourActive, setTourActive] = useState(initial.tourActive)
  const [tourStepIndex, setTourStepIndex] = useState(initial.tourStepIndex)
  const [pendingStepIndex, setPendingStepIndex] = useState<number | null>(null)

  const applyTourStep = useCallback((index: number) => {
    if (!TOUR_STEPS[index]) return
    setTourStepIndex(index)
    writeTourStepSession(index)
  }, [])

  const goToTourStep = useCallback(
    (index: number) => {
      const step = TOUR_STEPS[index]
      if (!step) return
      if (step.homeOnly && location.pathname !== '/') {
        setPendingStepIndex(index)
        writeTourStepSession(index)
        navigate('/')
        return
      }
      setPendingStepIndex(null)
      applyTourStep(index)
    },
    [applyTourStep, location.pathname, navigate],
  )

  useEffect(() => {
    if (pendingStepIndex === null || location.pathname !== '/') return
    const timer = window.setTimeout(() => {
      applyTourStep(pendingStepIndex)
      setPendingStepIndex(null)
    }, TOUR_NAV_SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [applyTourStep, location.pathname, pendingStepIndex])

  useEffect(() => {
    if (initial.tourActive && initial.tourStepIndex >= 0) {
      goToTourStep(initial.tourStepIndex)
    }
  }, [goToTourStep, initial.tourActive, initial.tourStepIndex])

  const finishOnboarding = useCallback(() => {
    markOnboardingComplete()
    setWelcomeOpen(false)
    setTourActive(false)
    setTourStepIndex(0)
  }, [])

  const dismissWelcome = useCallback(() => {
    markWelcomeDismissedThisSession()
    clearTourStepSession()
    setWelcomeOpen(false)
    setTourActive(false)
    setTourStepIndex(0)
  }, [])

  const startTour = useCallback(() => {
    setWelcomeOpen(false)
    setTourActive(true)
    goToTourStep(0)
  }, [goToTourStep])

  const replayTour = useCallback(() => {
    setWelcomeOpen(false)
    setTourActive(true)
    goToTourStep(0)
  }, [goToTourStep])

  const nextTourStep = useCallback(() => {
    if (tourStepIndex >= TOUR_STEPS.length - 1) {
      finishOnboarding()
      return
    }
    goToTourStep(tourStepIndex + 1)
  }, [finishOnboarding, goToTourStep, tourStepIndex])

  const prevTourStep = useCallback(() => {
    if (tourStepIndex <= 0) return
    goToTourStep(tourStepIndex - 1)
  }, [goToTourStep, tourStepIndex])

  const skipTour = useCallback(() => {
    finishOnboarding()
  }, [finishOnboarding])

  const value = useMemo(
    () => ({
      welcomeOpen,
      tourActive,
      tourStepIndex,
      tourStepCount: TOUR_STEPS.length,
      currentTourStep: tourActive ? (TOUR_STEPS[tourStepIndex] ?? null) : null,
      dismissWelcome,
      startTour,
      replayTour,
      nextTourStep,
      prevTourStep,
      skipTour,
    }),
    [
      welcomeOpen,
      tourActive,
      tourStepIndex,
      dismissWelcome,
      startTour,
      replayTour,
      nextTourStep,
      prevTourStep,
      skipTour,
    ],
  )

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return ctx
}
