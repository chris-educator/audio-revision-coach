import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppMain from './AppMain'
import { OnboardingProvider } from './context/OnboardingContext'
import { SeoRoute } from './components/SeoRoute'
import { ROUTE_ACCOUNT, ROUTE_HOME, ROUTE_LOGIN } from './constants/routes'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'

function LegacyAppRedirect() {
  const { pathname } = useLocation()
  const next = pathname.replace(/^\/app\/?/, '/') || '/'
  return <Navigate to={next} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <SeoRoute />
      <OnboardingProvider>
        <Routes>
          <Route path={ROUTE_HOME} element={<AppMain />} />
          <Route path={ROUTE_LOGIN} element={<LoginPage />} />
          <Route path={ROUTE_ACCOUNT} element={<AccountPage />} />
          <Route path="/app/*" element={<LegacyAppRedirect />} />
          <Route path="*" element={<Navigate to={ROUTE_HOME} replace />} />
        </Routes>
      </OnboardingProvider>
    </BrowserRouter>
  )
}
