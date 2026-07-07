import type { RevisionTopic } from '../types/revision'

type Props = {
  topics: RevisionTopic[]
  selectedId: string
  customTopic: string
  yearLevel: string
  subject: string
  onSelectTopic: (id: string) => void
  onCustomTopicChange: (value: string) => void
  onYearLevelChange: (value: string) => void
  onSubjectChange: (value: string) => void
}

export function RevisionTopicPanel({
  topics,
  selectedId,
  customTopic,
  yearLevel,
  subject,
  onSelectTopic,
  onCustomTopicChange,
  onYearLevelChange,
  onSubjectChange,
}: Props) {
  const selected = topics.find((topic) => topic.id === selectedId)

  return (
    <section className="ui-card p-4" data-tour="revision-topic">
      <h2 className="font-heading text-lg font-semibold text-text">Pick a topic</h2>
      <p className="mt-1 text-sm text-text-muted">Choose a preset or type your own revision focus.</p>

      <ul className="mt-4 flex flex-col gap-2">
        {topics.map((topic) => (
          <li key={topic.id}>
            <button
              type="button"
              className={`w-full rounded-xl border px-3 py-3 text-left ${
                topic.id === selectedId ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/40'
              }`}
              onClick={() => onSelectTopic(topic.id)}
            >
              <span className="font-medium text-text">{topic.title}</span>
              <span className="mt-1 block text-sm text-text-muted">{topic.summary}</span>
            </button>
          </li>
        ))}
      </ul>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-text">Or type a topic</span>
        <input
          className="ui-input mt-1 w-full"
          value={customTopic}
          placeholder="e.g. Quadratic equations"
          onChange={(event) => onCustomTopicChange(event.target.value)}
        />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-text">Year level</span>
          <select className="ui-input mt-1 w-full" value={yearLevel} onChange={(e) => onYearLevelChange(e.target.value)}>
            {(selected?.year_levels ?? ['Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12']).map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-text">Subject</span>
          <input
            className="ui-input mt-1 w-full"
            value={subject}
            placeholder={selected?.subject ?? 'Subject'}
            onChange={(event) => onSubjectChange(event.target.value)}
          />
        </label>
      </div>
    </section>
  )
}
