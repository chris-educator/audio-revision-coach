/**
 * Platform default: browser reload / hard refresh always opens at the top of the page.
 * Disables the browser’s scroll-position restoration and resets window + app scroll roots.
 */
export function initReloadScrollTop(): void {
  if (typeof window === 'undefined') return

  try {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  } catch {
    /* ignore */
  }

  const toTop = () => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document
      .querySelectorAll<HTMLElement>('.app-main-scroll, [data-scroll-root]')
      .forEach(el => {
        el.scrollTop = 0
      })
  }

  toTop()

  window.addEventListener('load', toTop)

  window.addEventListener('pageshow', event => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (event.persisted || nav?.type === 'reload') {
      toTop()
    }
  })

  // Catch scroll roots that mount with React after first paint
  window.requestAnimationFrame(() => {
    toTop()
    window.setTimeout(toTop, 0)
    window.setTimeout(toTop, 100)
  })
}
