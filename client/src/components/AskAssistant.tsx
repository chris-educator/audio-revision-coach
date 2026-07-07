import { useEffect, useRef, useState } from 'react'
import { AppAssistantChat } from './AppAssistantChat'
import { AskChatIcon } from './AskChatIcon'
import { ASK_ASSISTANT_BACKDROP_CLASS, ASK_ASSISTANT_PANEL_CLASS } from './askAssistantClasses'

type AskAssistantProps = {
  apiReady: boolean
  subtitle?: string
  welcomeMessage?: string
  inputPlaceholder?: string
}

export function AskAssistant({
  apiReady,
  subtitle = 'Help with subject lanes, fault counts, dual assets, export, and credits.',
  welcomeMessage,
  inputPlaceholder,
}: AskAssistantProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia('(max-width: 639px)')
    if (!mq.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="site-top-bar__ask relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ask"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={[
          'site-top-bar__action site-top-bar__ask-btn w-full sm:w-auto',
          open ? 'site-top-bar__ask-btn--open' : '',
        ].join(' ')}
      >
        <AskChatIcon className="h-4 w-4 shrink-0" />
        <span className="site-top-bar__ask-btn-label hidden sm:inline">Ask</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close Assistant"
            className={ASK_ASSISTANT_BACKDROP_CLASS}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ask the Assistant"
            className={ASK_ASSISTANT_PANEL_CLASS}
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-sm font-semibold text-text">Ask the Assistant</h3>
                <p className="text-xs leading-snug text-text-muted">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
              <AppAssistantChat
                apiReady={apiReady}
                welcomeMessage={welcomeMessage}
                inputPlaceholder={inputPlaceholder}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
