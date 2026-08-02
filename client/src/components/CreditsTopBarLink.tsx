import { Link } from 'react-router-dom'

type CreditsTopBarLinkProps = {
  credits: number
  billingDegraded?: boolean
  to: string
}

export function CreditsTopBarLink({
  credits,
  billingDegraded = false,
  to,
}: CreditsTopBarLinkProps) {
  const label = billingDegraded ? '…' : credits
  const title = billingDegraded ? 'Credits temporarily unavailable' : `Credits: ${credits}`
  return (
    <Link
      to={to}
      className="site-top-bar__action site-top-bar__credits shrink-0"
      title={title}
      aria-label={title}
    >
      <span className="site-top-bar__credits-cr" aria-hidden="true">
        cr
      </span>
      <span className="site-top-bar__credits-full site-top-bar__action-label">Credits {label}</span>
    </Link>
  )
}
