import type { AnchorHTMLAttributes, ReactNode } from 'react'

type AppstaxMailtoLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'download'> & {
  href: string
  children: ReactNode
}

/** mailto: for apps@appstax.ai — opens mail handler and keeps this app open (new tab / window). */
export function AppstaxMailtoLink({ href, children, target = '_blank', rel = 'noopener noreferrer', ...rest }: AppstaxMailtoLinkProps) {
  return (
    <a href={href} target={target} rel={rel} {...rest}>
      {children}
    </a>
  )
}
