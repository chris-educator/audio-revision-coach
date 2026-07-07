import { AppTitle } from './AppTitle'
import { AskAssistant } from './AskAssistant'
import { Footer } from './Footer'
import { ProductTour } from './ProductTour'
import { SiteTopBar } from './SiteTopBar'
import { SiteTopBarTools } from './SiteTopBarTools'
import { WelcomeDialog } from './WelcomeDialog'
import { ROUTE_ACCOUNT, ROUTE_LOGIN } from '../constants/routes'
import { useAuth } from '../context/AuthContext'
import { APP_TAGLINE, APP_TITLE } from '../constants/branding'

type LayoutProps = {
  children: React.ReactNode
  apiReady: boolean
  creditsCallout?: React.ReactNode
}

export function Layout({ children, apiReady, creditsCallout }: LayoutProps) {
  const { me, config, logout, loading: authLoading } = useAuth()
  const showBilling = config?.billing_enabled
  const signedIn = !authLoading && me?.authenticated === true

  return (
    <div
      id="top"
      className="flex min-h-screen min-h-[100dvh] w-full max-w-[100vw] flex-col bg-bg"
    >
      <SiteTopBar>
        <SiteTopBarTools
          askSlot={
            <AskAssistant
              apiReady={apiReady}
              subtitle="Help with adaptive practice, topic heatmap, marking feedback, and credits."
              welcomeMessage="Hi — I'm Ask the Assistant. Ask about General Mathematics topics, adaptive targeting, or how marking works."
              inputPlaceholder="e.g. How does the topic heatmap choose my next question?"
            />
          }
          shareTriggerAriaLabel={`Share ${APP_TITLE}`}
          showBilling={showBilling}
          signedIn={signedIn}
          credits={me?.credits ?? 0}
          accountTo={ROUTE_ACCOUNT}
          loginTo={ROUTE_LOGIN}
          onLogout={() => void logout()}
        />
      </SiteTopBar>
      <WelcomeDialog />
      <ProductTour />
      <header className="ui-header relative z-40 shrink-0 py-4">
        <div className="mx-auto w-full min-w-0 max-w-6xl space-y-3 px-4 sm:px-6 md:px-8">
          <AppTitle />
          <p className="ui-header__lead max-w-full text-sm leading-relaxed text-text-muted">
            {APP_TAGLINE}{' '}
            <span className="ui-header__ask-text">Ask the Assistant</span>
            <span aria-hidden="true"> — </span>
            AI-powered agents built-in for clever help, deep reasoning, and fast responses — use{' '}
            <span className="ui-header__ask-text">Ask</span> in the top bar.
          </p>
        </div>
      </header>
      <main className="relative z-0 flex min-h-0 flex-1 flex-col overflow-x-hidden">
        <div className="flex-1 overflow-y-auto">
          {creditsCallout}
          <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-10">
            {children}
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}
