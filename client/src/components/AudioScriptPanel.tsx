import { useEffect, useRef, useState } from 'react'
import type { RevisionScript } from '../types/revision'

type Props = {
  script: RevisionScript | null
}

export function AudioScriptPanel({ script }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const [sectionIndex, setSectionIndex] = useState(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  if (!script) {
    return (
      <section className="ui-card p-6 text-sm text-text-muted" data-tour="revision-script">
        <h2 className="font-heading text-lg font-semibold text-text">Listen-aloud script</h2>
        <p className="mt-2">
          Generate a revision script and press Listen — your browser reads it aloud (no download required).
        </p>
      </section>
    )
  }

  const fullText = script.sections.map((section) => `${section.heading}. ${section.script}`).join('\n\n')

  const handleListen = () => {
    if (!('speechSynthesis' in window)) {
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(fullText)
    utterance.lang = 'en-AU'
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    utteranceRef.current = utterance
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  return (
    <section className="ui-card p-5" data-tour="revision-script">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-text">{script.topic_title}</h2>
          <p className="text-sm text-text-muted">~{script.estimated_minutes.toFixed(1)} min listen</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="ui-btn-primary text-sm" disabled={speaking} onClick={handleListen}>
            Listen
          </button>
          {speaking ? (
            <button type="button" className="ui-btn-secondary text-sm" onClick={handleStop}>
              Stop
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {script.sections.map((section, index) => (
          <article
            key={section.heading}
            className={`rounded-xl border p-4 ${index === sectionIndex ? 'border-accent bg-accent/5' : 'border-border'}`}
            onClick={() => setSectionIndex(index)}
          >
            <h3 className="text-sm font-semibold text-text">{section.heading}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{section.script}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-surface-muted/60 p-4">
        <h3 className="text-sm font-semibold text-text">Recap questions</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-muted">
          {script.recap_questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-text-muted">{script.integrity_note}</p>
    </section>
  )
}
