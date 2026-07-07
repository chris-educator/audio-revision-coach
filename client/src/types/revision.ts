export type RevisionTopic = {
  id: string
  subject: string
  title: string
  year_levels: string[]
  summary: string
}

export type Flashcard = {
  front: string
  back: string
}

export type RevisionDeck = {
  topic_title: string
  deck_intro: string
  cards: Flashcard[]
  study_tip: string
  integrity_note: string
}

export type ScriptSection = {
  heading: string
  script: string
}

export type RevisionScript = {
  topic_title: string
  estimated_minutes: number
  sections: ScriptSection[]
  recap_questions: string[]
  integrity_note: string
}

export type RevisionSession = {
  topicId: string
  customTopic: string
  yearLevel: string
  subject: string
}

export const DEFAULT_YEAR_LEVEL = 'Year 10'
