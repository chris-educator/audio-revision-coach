import { useRef, useState } from 'react'
import { sendAssistantMessage, type AssistantChatMessage } from '../api/client'
import { appstaxFlagAssistantReplyMailto } from '../constants/branding'
import { useBillingGate } from '../hooks/useBillingGate'
import { AppstaxMailtoLink } from './AppstaxMailtoLink'
import { SignInGatedButton } from './SignInGatedButton'

type AppAssistantChatProps = {
  apiReady: boolean
  welcomeMessage?: string
  inputPlaceholder?: string
}

export function AppAssistantChat({
  apiReady,
  welcomeMessage = 'Ask about General Mathematics topics, the adaptive heatmap, marking feedback, or credits.',
  inputPlaceholder = 'e.g. What topics are in General Mathematics practice?',
}: AppAssistantChatProps) {
  const { requiresSignIn, requiresEmailVerification, signInTo, emailVerifyTo } = useBillingGate()
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    { role: 'assistant', content: welcomeMessage },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setError('')
    setInput('')
    const nextMessages: AssistantChatMessage[] = [
      ...messages,
      { role: 'user', content: text },
    ]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const { reply } = await sendAssistantMessage(nextMessages)
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 pb-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={[
              'max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed break-words',
              msg.role === 'user'
                ? 'ml-auto bg-blue text-btn-label shadow-sm'
                : 'border border-border border-l-4 border-l-blue bg-surface-raised text-text',
            ].join(' ')}
          >
            {msg.content}
            {msg.role === 'assistant' && i > 0 && (
              <p className="mt-3 text-[11px] text-text-muted">
                <AppstaxMailtoLink
                  href={appstaxFlagAssistantReplyMailto({ assistantMessage: msg.content })}
                  className="underline-offset-2 hover:text-text hover:underline"
                >
                  Flag this reply
                </AppstaxMailtoLink>
                <span className="mx-1" aria-hidden="true">
                  ·
                </span>
                Report concerning assistant output.
              </p>
            )}
          </div>
        ))}
        {loading && (
          <div className="max-w-[90%] rounded-xl bg-surface-raised px-4 py-3 text-sm text-text-muted">
            Thinking…
          </div>
        )}
        <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
      </div>

      {error && (
        <div className="mt-3 shrink-0 ui-callout-orange" role="alert">
          {error}
        </div>
      )}

      <div className="mt-3 shrink-0 flex flex-col gap-2 sm:mt-4 sm:flex-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSend()
            }
          }}
          rows={2}
          disabled={!apiReady || loading}
          placeholder={
            apiReady
              ? inputPlaceholder
              : 'Configure GOOGLE_API_KEY on the server to use the Assistant'
          }
          className="ui-input flex-1 resize-none disabled:opacity-50"
        />
        <SignInGatedButton
          type="button"
          className="ui-btn-primary sm:self-end"
          requiresSignIn={requiresSignIn}
          requiresEmailVerification={requiresEmailVerification}
          signInTo={signInTo}
          emailVerifyTo={emailVerifyTo}
          disabled={!apiReady || loading || !input.trim()}
          onAuthorizedClick={() => void handleSend()}
        >
          Chat
        </SignInGatedButton>
      </div>
    </div>
  )
}
