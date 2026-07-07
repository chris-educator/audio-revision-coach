export type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

export type TooltipPlacement = 'below' | 'above' | 'center'

export type TourLayout = {
  spotlight: SpotlightRect
  tooltip: { top: number; left: number; placement: TooltipPlacement }
}

export const TOUR_PAD = 10
export const TOUR_RETRY_MS = 140
export const TOUR_MAX_ATTEMPTS = 18
export const TOUR_NAV_SETTLE_MS = 400
export const TOUR_TOOLTIP_WIDTH = 320
export const TOUR_TOOLTIP_ESTIMATE = 260

export function queryTourTarget(selector: string): Element | null {
  return document.querySelector(selector)
}

export function isTargetVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  const style = window.getComputedStyle(el)
  return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0
}

export function scrollTourTarget(el: Element) {
  el.scrollIntoView({ block: 'center', behavior: 'smooth', inline: 'nearest' })
}

export function measureTourLayout(
  el: Element,
  tooltipHeight = TOUR_TOOLTIP_ESTIMATE,
): TourLayout {
  const rect = el.getBoundingClientRect()
  const margin = 16
  const gap = 14

  const spotlight: SpotlightRect = {
    top: Math.max(margin, rect.top - TOUR_PAD),
    left: Math.max(margin, rect.left - TOUR_PAD),
    width: Math.min(window.innerWidth - margin * 2, rect.width + TOUR_PAD * 2),
    height: rect.height + TOUR_PAD * 2,
  }

  const tooltipWidth = Math.min(TOUR_TOOLTIP_WIDTH, window.innerWidth - margin * 2)
  let left = spotlight.left
  if (left + tooltipWidth > window.innerWidth - margin) {
    left = window.innerWidth - tooltipWidth - margin
  }
  left = Math.max(margin, left)

  const spaceBelow = window.innerHeight - (spotlight.top + spotlight.height + gap)
  const spaceAbove = spotlight.top - gap

  let top: number
  let placement: TooltipPlacement

  if (spaceBelow >= tooltipHeight + margin || spaceBelow >= spaceAbove) {
    top = spotlight.top + spotlight.height + gap
    placement = 'below'
    if (top + tooltipHeight > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - tooltipHeight - margin)
    }
  } else {
    top = Math.max(margin, spotlight.top - tooltipHeight - gap)
    placement = 'above'
  }

  return { spotlight, tooltip: { top, left, placement } }
}
