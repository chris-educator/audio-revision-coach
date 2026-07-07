import type { RevisionDeck } from '../types/revision'

type Props = {
  deck: RevisionDeck | null
}

export function FlashcardDeckPanel({ deck }: Props) {
  if (!deck) {
    return (
      <section className="ui-card p-6 text-sm text-text-muted" data-tour="revision-deck">
        <h2 className="font-heading text-lg font-semibold text-text">Flashcard deck</h2>
        <p className="mt-2">Generate a deck to revise key ideas with question-and-answer cards.</p>
      </section>
    )
  }

  return (
    <section className="ui-card p-5" data-tour="revision-deck">
      <h2 className="font-heading text-lg font-semibold text-text">{deck.topic_title}</h2>
      <p className="mt-2 text-sm text-text-muted">{deck.deck_intro}</p>
      <ul className="mt-4 space-y-3">
        {deck.cards.map((card, index) => (
          <li key={`${card.front}-${index}`} className="rounded-xl border border-border p-3">
            <p className="text-sm font-medium text-text">{card.front}</p>
            <p className="mt-2 text-sm text-text-muted">{card.back}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-text"><strong>Study tip:</strong> {deck.study_tip}</p>
      <p className="mt-2 text-xs text-text-muted">{deck.integrity_note}</p>
    </section>
  )
}
