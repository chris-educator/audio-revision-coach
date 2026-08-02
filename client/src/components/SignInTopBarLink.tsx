import { Link } from 'react-router-dom'
import { KeyIcon } from './KeyIcon'

type SignInTopBarLinkProps = {
  to: string
}

export function SignInTopBarLink({ to }: SignInTopBarLinkProps) {
  const className = 'site-top-bar__action site-top-bar__sign-in'
  const children = (
    <>
      <KeyIcon className="h-4 w-4 shrink-0" />
      <span className="site-top-bar__action-label">Sign In</span>
    </>
  )

  if (to.startsWith('#')) {
    return (
      <a href={to} className={className} aria-label="Sign in">
        {children}
      </a>
    )
  }

  return (
    <Link to={to} className={className} aria-label="Sign in">
      {children}
    </Link>
  )
}
