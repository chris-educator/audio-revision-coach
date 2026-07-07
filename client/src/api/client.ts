import type { RevisionDeck, RevisionScript, RevisionSession } from '../types/revision'
import { fetchWithTimeout } from './fetchWithTimeout'
import { parseJsonResponse } from './parseJsonResponse'

export class FetchTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

export type HealthResponse = {
  status: string
  api_key_configured?: boolean
  topic_count?: number
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetchWithTimeout('/api/health', {}, 15_000)
  return parseJsonResponse<HealthResponse>(res)
}

export async function fetchRevisionTopics() {
  const res = await fetchWithTimeout('/api/revision/topics', {}, 15_000)
  const data = await parseJsonResponse<{ topics: import('../types/revision').RevisionTopic[] }>(res)
  return data.topics
}

export async function generateDeck(session: RevisionSession) {
  const res = await fetchWithTimeout(
    '/api/revision/deck',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        topic_id: session.topicId,
        custom_topic: session.customTopic,
        year_level: session.yearLevel,
        subject: session.subject,
      }),
    },
    120_000,
  )
  return parseJsonResponse<{ deck: RevisionDeck; credit_cost: number; credits_remaining?: number }>(res)
}

export async function generateScript(session: RevisionSession) {
  const res = await fetchWithTimeout(
    '/api/revision/script',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        topic_id: session.topicId,
        custom_topic: session.customTopic,
        year_level: session.yearLevel,
        subject: session.subject,
      }),
    },
    120_000,
  )
  return parseJsonResponse<{ script: RevisionScript; credit_cost: number; credits_remaining?: number }>(
    res,
  )
}

export type AssistantChatMessage = { role: 'user' | 'assistant'; content: string }

export async function sendAssistantMessage(messages: AssistantChatMessage[]) {
  const res = await fetchWithTimeout(
    '/api/assistant/chat',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ messages }),
    },
    60_000,
  )
  return parseJsonResponse<{ reply: string }>(res)
}
