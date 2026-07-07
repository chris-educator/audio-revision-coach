/** Register minimal service worker for Chrome “Install app” (skip in Capacitor native shell). */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return

  const cap = (
    window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor
  if (cap?.isNativePlatform?.()) return

  if (!('serviceWorker' in navigator)) return

  const base = import.meta.env.BASE_URL ?? '/'
  const scope = base.endsWith('/') ? base : `${base}/`
  const swUrl = `${scope}sw.js`

  try {
    await navigator.serviceWorker.register(swUrl, { scope })
  } catch {
    /* PWA install optional — app works without SW */
  }
}
