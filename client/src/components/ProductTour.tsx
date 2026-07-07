import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import {
  isTargetVisible,
  measureTourLayout,
  queryTourTarget,
  scrollTourTarget,
  TOUR_MAX_ATTEMPTS,
  TOUR_RETRY_MS,
  type SpotlightRect,
  type TooltipPlacement,
} from '../utils/productTourLayout'

type TooltipLayout = {
  top: number
  left: number
  placement: TooltipPlacement
}

export function ProductTour() {
  const {
    tourActive,
    tourStepIndex,
    tourStepCount,
    currentTourStep,
    nextTourStep,
    prevTourStep,
    skipTour,
  } = useOnboarding()

  const panelRef = useRef<HTMLDivElement>(null)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [tooltip, setTooltip] = useState<TooltipLayout | null>(null)
  const [targetReady, setTargetReady] = useState(false)

  const applyLayout = useCallback((el: Element) => {
    scrollTourTarget(el)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const panelHeight = panelRef.current?.offsetHeight
        const layout = measureTourLayout(
          el,
          panelHeight && panelHeight > 0 ? panelHeight : undefined,
        )
        setSpotlight(layout.spotlight)
        setTooltip(layout.tooltip)
        setTargetReady(true)
      })
    })
  }, [])

  const measureTarget = useCallback(() => {
    if (!currentTourStep) {
      setSpotlight(null)
      setTooltip(null)
      setTargetReady(false)
      return false
    }

    const el = queryTourTarget(currentTourStep.target)
    if (!el || !isTargetVisible(el)) {
      setSpotlight(null)
      setTooltip(null)
      setTargetReady(false)
      return false
    }

    applyLayout(el)
    return true
  }, [applyLayout, currentTourStep])

  useEffect(() => {
    if (!tourActive || !currentTourStep) return

    let cancelled = false
    let attempts = 0

    const tryMeasure = () => {
      if (cancelled) return
      const ok = measureTarget()
      if (!ok && attempts < TOUR_MAX_ATTEMPTS) {
        attempts += 1
        window.setTimeout(tryMeasure, TOUR_RETRY_MS)
      }
    }

    setTargetReady(false)
    const timer = window.setTimeout(tryMeasure, 60)

    let raf = 0
    const onReflow = () => {
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        if (!cancelled) measureTarget()
      })
    }

    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [tourActive, currentTourStep, tourStepIndex, measureTarget])

  useEffect(() => {
    if (!tourActive || !targetReady || !currentTourStep) return
    const el = queryTourTarget(currentTourStep.target)
    if (!el) return
    const layout = measureTourLayout(el, panelRef.current?.offsetHeight)
    setSpotlight(layout.spotlight)
    setTooltip(layout.tooltip)
  }, [tourActive, targetReady, currentTourStep, tourStepIndex])

  useEffect(() => {
    if (!tourActive) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skipTour()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [tourActive, skipTour])

  if (!tourActive || !currentTourStep) return null

  const isLast = tourStepIndex >= tourStepCount - 1
  const targetMissing = !targetReady

  return (
    <div className="product-tour-root" role="presentation">
      {spotlight ? (
        <div
          className="product-tour-spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      ) : (
        <div className="product-tour-backdrop" aria-hidden="true" />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        className="product-tour-panel"
        data-placement={tooltip?.placement ?? 'center'}
        style={
          tooltip
            ? { top: tooltip.top, left: tooltip.left }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <p className="product-tour-panel__step">Step {tourStepIndex + 1} of {tourStepCount}</p>
        <h3 id="tour-step-title" className="product-tour-panel__title">
          {currentTourStep.title}
        </h3>
        <p className="product-tour-panel__body">{currentTourStep.body}</p>
        {targetMissing ? (
          <p className="product-tour-panel__notice" role="status">
            Still loading this step — wait a moment, or tap Next to continue.
          </p>
        ) : null}
        <div className="product-tour-panel__actions">
          <button type="button" onClick={skipTour} className="product-tour-panel__skip">
            Skip tour
          </button>
          <div className="product-tour-panel__nav">
            <button
              type="button"
              onClick={prevTourStep}
              disabled={tourStepIndex === 0}
              className="ui-btn-secondary disabled:opacity-40"
            >
              Back
            </button>
            <button type="button" onClick={nextTourStep} className="ui-btn-primary">
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
