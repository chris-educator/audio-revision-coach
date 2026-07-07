import { useEffect, useState } from 'react'
import {
  FetchTimeoutError,
  fetchHealth,
  fetchRevisionTopics,
  generateDeck,
  generateScript,
} from './api/client'
import { AudioScriptPanel } from './components/AudioScriptPanel'
import { FlashcardDeckPanel } from './components/FlashcardDeckPanel'
import { HowToUseGuide } from './components/HowToUseGuide'
import { Layout } from './components/Layout'
import { RevisionTopicPanel } from './components/RevisionTopicPanel'
import { SignInCreditsCallout } from './components/SignInCreditsCallout'
import { SignInGatedButton } from './components/SignInGatedButton'
import { useAuth } from './context/AuthContext'
import { useBillingGate } from './hooks/useBillingGate'
import {
  DEFAULT_YEAR_LEVEL,
  type RevisionDeck,
  type RevisionScript,
  type RevisionTopic,
} from './types/revision'

export default function AppMain() {
  const { applyCreditsRemaining } = useAuth()
  const { billingActive, requiresSignIn, requiresEmailVerification, signInTo, emailVerifyTo } =
    useBillingGate()

  const [topics, setTopics] = useState<RevisionTopic[]>([])
  const [topicId, setTopicId] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [yearLevel, setYearLevel] = useState(DEFAULT_YEAR_LEVEL)
  const [subject, setSubject] = useState('')
  const [deck, setDeck] = useState<RevisionDeck | null>(null)
  const [script, setScript] = useState<RevisionScript | null>(null)
  const [loadingDeck, setLoadingDeck] = useState(false)
  const [loadingScript, setLoadingScript] = useState(false)
  const [error, setError] = useState('')
  const [apiReady, setApiReady] = useState<boolean | null>(null)

  const session = { topicId, customTopic, yearLevel, subject }
  const canRun = topicId.length > 0 || customTopic.trim().length >= 3

  useEffect(() => {
    fetchHealth()
      .then((health) => setApiReady(Boolean(health.api_key_configured)))
      .catch(() => setApiReady(false))
    fetchRevisionTopics()
      .then((items) => {
        setTopics(items)
        if (items.length > 0) {
          setTopicId(items[0].id)
          setSubject(items[0].subject)
        }
      })
      .catch(() => setTopics([]))
  }, [])

  const handleSelectTopic = (id: string) => {
    setTopicId(id)
    const topic = topics.find((item) => item.id === id)
    if (topic) {
      setSubject(topic.subject)
      if (topic.year_levels.includes(yearLevel)) {
        /* keep */
      } else {
        setYearLevel(topic.year_levels[0] ?? DEFAULT_YEAR_LEVEL)
      }
    }
    setError('')
  }

  const runDeck = () => {
    setLoadingDeck(true)
    setError('')
    void generateDeck(session)
      .then((result) => {
        setDeck(result.deck)
        if (typeof result.credits_remaining === 'number') applyCreditsRemaining(result.credits_remaining)
      })
      .catch((err) => {
        setError(err instanceof FetchTimeoutError ? 'Deck timed out — try again.' : err instanceof Error ? err.message : 'Deck failed.')
      })
      .finally(() => setLoadingDeck(false))
  }

  const runScript = () => {
    setLoadingScript(true)
    setError('')
    void generateScript(session)
      .then((result) => {
        setScript(result.script)
        if (typeof result.credits_remaining === 'number') applyCreditsRemaining(result.credits_remaining)
      })
      .catch((err) => {
        setError(err instanceof FetchTimeoutError ? 'Script timed out — try again.' : err instanceof Error ? err.message : 'Script failed.')
      })
      .finally(() => setLoadingScript(false))
  }

  return (
    <Layout
      apiReady={apiReady === true}
      creditsCallout={
        <SignInCreditsCallout
          maxWidthClass="max-w-6xl"
          linkSignIn
          creditQuote={billingActive ? '3 credits deck · 5 credits script' : null}
        />
      }
    >
      {apiReady === false ? (
        <div className="ui-callout-orange mb-4" role="alert">
          Revision generation is unavailable — configure ANTHROPIC_API_KEY or GOOGLE_API_KEY on the server.
        </div>
      ) : null}

      <HowToUseGuide />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
        <aside className="contents lg:block space-y-4">
          <RevisionTopicPanel
            topics={topics}
            selectedId={topicId}
            customTopic={customTopic}
            yearLevel={yearLevel}
            subject={subject}
            onSelectTopic={handleSelectTopic}
            onCustomTopicChange={setCustomTopic}
            onYearLevelChange={setYearLevel}
            onSubjectChange={setSubject}
          />
          <div className="grid gap-2" data-tour="revision-generate">
            <SignInGatedButton
              type="button"
              className="ui-btn-secondary w-full"
              requiresSignIn={requiresSignIn}
              requiresEmailVerification={requiresEmailVerification}
              signInTo={signInTo}
              emailVerifyTo={emailVerifyTo}
              disabled={loadingDeck || !canRun || apiReady === false}
              onAuthorizedClick={runDeck}
            >
              {loadingDeck ? 'Building deck…' : billingActive ? 'Generate deck (3 credits)' : 'Generate deck'}
            </SignInGatedButton>
            <SignInGatedButton
              type="button"
              className="ui-btn-primary w-full"
              requiresSignIn={requiresSignIn}
              requiresEmailVerification={requiresEmailVerification}
              signInTo={signInTo}
              emailVerifyTo={emailVerifyTo}
              disabled={loadingScript || !canRun || apiReady === false}
              onAuthorizedClick={runScript}
            >
              {loadingScript ? 'Building script…' : billingActive ? 'Generate script (5 credits)' : 'Generate script'}
            </SignInGatedButton>
          </div>
          {error ? <div className="ui-callout-orange text-sm" role="alert">{error}</div> : null}
        </aside>

        <div className="contents lg:block space-y-4">
          <FlashcardDeckPanel deck={deck} />
          <AudioScriptPanel script={script} />
        </div>
      </div>
    </Layout>
  )
}
