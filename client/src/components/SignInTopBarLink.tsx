import { Link } from 'react-router-dom'

type SignInTopBarLinkProps = {
  to: string
}

export function SignInTopBarLink({ to }: SignInTopBarLinkProps) {
  const className = 'site-top-bar__action site-top-bar__sign-in'

  if (to.startsWith('#')) {
    return (
      <a href={to} className={className}>
        Sign In
      </a>
    )
  }

  return (
    <Link to={to} className={className}>
      Sign In
    </Link>
  )
}
