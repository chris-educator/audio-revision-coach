import { Link } from 'react-router-dom'

type CreditsTopBarLinkProps = {
  credits: number
  to: string
}

export function CreditsTopBarLink({ credits, to }: CreditsTopBarLinkProps) {
  return (
    <Link
      to={to}
      className="site-top-bar__action site-top-bar__credits shrink-0"
      title={`Credits: ${credits}`}
    >
      Credits {credits}
    </Link>
  )
}
