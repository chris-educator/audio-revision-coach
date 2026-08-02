import { KeyIcon } from './KeyIcon'

type SignOutButtonProps = {
  onClick: () => void
}

export function SignOutButton({ onClick }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="site-top-bar__action site-top-bar__sign-out"
      aria-label="Sign out"
    >
      <KeyIcon className="h-4 w-4 shrink-0" />
      <span className="site-top-bar__action-label">Sign Out</span>
    </button>
  )
}
