import { Link } from 'react-router-dom'
import { ROUTE_HOME } from '../constants/routes'

type BackToAppLinkProps = {
  className?: string
  variant?: 'text' | 'primary'
}

export function BackToAppLink({ className = '', variant = 'text' }: BackToAppLinkProps) {
  const label = '← Back to Resource to Lesson'
  const linkClass =
    variant === 'primary'
      ? 'ui-btn-primary inline-flex shrink-0 items-center no-underline'
      : 'text-base font-semibold text-blue hover:text-blue-hover no-underline'

  return (
    <Link to={ROUTE_HOME} className={`${linkClass} ${className}`.trim()}>
      {label}
    </Link>
  )
}
