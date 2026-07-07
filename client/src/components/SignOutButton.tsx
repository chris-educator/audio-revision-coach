type SignOutButtonProps = {
  onClick: () => void
}

export function SignOutButton({ onClick }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="site-top-bar__action site-top-bar__sign-out"
    >
      Sign Out
    </button>
  )
}
