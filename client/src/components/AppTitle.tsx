import { APP_TITLE, APP_TITLE_MUTED, APP_TITLE_ACCENT } from '../constants/branding'

export function AppTitle() {
  return (
    <h1 className="app-title" aria-label={APP_TITLE}>
      <span className="app-title__muted">{APP_TITLE_MUTED}</span>
      <span className="app-title__accent">{APP_TITLE_ACCENT}</span>
    </h1>
  )
}
