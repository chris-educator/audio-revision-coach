import { useLocation } from 'react-router-dom'
import { ROUTE_ACCOUNT, ROUTE_HOME, ROUTE_LOGIN } from '../constants/routes'
import { PageMeta } from '../seo/PageMeta'
import { PAGE_SEO } from '../seo/siteMeta'

export function SeoRoute() {
  const { pathname } = useLocation()

  if (pathname === ROUTE_HOME) {
    return <PageMeta seo={PAGE_SEO.home} includeDiscoverySchema />
  }
  if (pathname === ROUTE_LOGIN) {
    return <PageMeta seo={PAGE_SEO.login} />
  }
  if (pathname === ROUTE_ACCOUNT) {
    return <PageMeta seo={PAGE_SEO.account} />
  }

  return <PageMeta seo={PAGE_SEO.home} includeDiscoverySchema />
}
