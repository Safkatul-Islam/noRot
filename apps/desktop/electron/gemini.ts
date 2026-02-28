import { randomUUID } from 'node:crypto'

import { GoogleGenAI } from '@google/genai'
import type { Chat } from '@google/genai'

export interface GeminiChatStreamParams {
  apiKey: string
  sessionId?: string
  message: string
  model?: string
}

export interface GeminiChatStreamResult {
  sessionId: string
}

export interface ExtractedTodoDraft {
  text: string
  app?: string
  url?: string
  allowedApps?: string[]
  deadline?: number
  startTime?: number
  durationMinutes?: number
}

let cachedClient: { apiKey: string; ai: GoogleGenAI } | null = null

type SessionEntry = { chat: Chat; lastUsed: number }
const sessions = new Map<string, SessionEntry>()
const MAX_SESSIONS = 8

export function clearGeminiCache(): void {
  cachedClient = null
  sessions.clear()
}

function getClient(apiKey: string): GoogleGenAI {
  if (!cachedClient || cachedClient.apiKey !== apiKey) {
    cachedClient = { apiKey, ai: new GoogleGenAI({ apiKey }) }
    sessions.clear()
  }
  return cachedClient.ai
}

function getSessionChat(apiKey: string, sessionId: string, model: string): Chat {
  const existing = sessions.get(sessionId)
  if (existing) {
    existing.lastUsed = Date.now()
    return existing.chat
  }

  const ai = getClient(apiKey)
  const chat = ai.chats.create({ model })
  sessions.set(sessionId, { chat, lastUsed: Date.now() })

  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0]
    if (oldest) sessions.delete(oldest[0])
  }

  return chat
}

export async function streamGeminiChat(
  params: GeminiChatStreamParams,
  onDelta: (delta: string) => void
): Promise<GeminiChatStreamResult> {
  const sessionId = params.sessionId ?? randomUUID()
  const model = params.model ?? 'gemini-2.0-flash'
  const chat = getSessionChat(params.apiKey, sessionId, model)

  const stream = await chat.sendMessageStream({ message: params.message })
  let lastText = ''
  for await (const chunk of stream) {
    const next = chunk.text ?? ''
    const delta = next.startsWith(lastText) ? next.slice(lastText.length) : next
    lastText = next
    if (delta) onDelta(delta)
  }

  return { sessionId }
}

export async function extractTodosWithGemini(params: {
  apiKey: string
  transcript: string
  nowMs: number
  model?: string
}): Promise<ExtractedTodoDraft[]> {
  const model = params.model ?? 'gemini-2.0-flash'
  const ai = getClient(params.apiKey)

  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['todos'],
    properties: {
      todos: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text'],
          properties: {
            text: { type: 'string' },
            app: { type: 'string' },
            url: { type: 'string' },
            allowedApps: { type: 'array', items: { type: 'string' } },
            deadline: { type: 'integer' },
            startTime: { type: 'integer' },
            durationMinutes: { type: 'integer' }
          }
        }
      }
    }
  }

  const prompt = [
    'Extract a concise list of actionable TODOs from the transcript.',
    'Return JSON only (no markdown) matching the provided schema.',
    'Use epoch milliseconds for deadline and startTime when clear; otherwise omit them.',
    `Current time (ms since epoch): ${params.nowMs}.`,
    '',
    'Transcript:',
    params.transcript
  ].join('\n')

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema
    }
  })

  const text = response.text ?? ''
  const parsed = safeJsonParse(text)
  if (!parsed || typeof parsed !== 'object') return []
  const todos = (parsed as { todos?: unknown }).todos
  if (!Array.isArray(todos)) return []

  const out: ExtractedTodoDraft[] = []
  for (const t of todos) {
    if (!t || typeof t !== 'object') continue
    const textValue = (t as { text?: unknown }).text
    if (typeof textValue !== 'string' || textValue.trim().length === 0) continue

    const todo: ExtractedTodoDraft = { text: textValue.trim() }
    const app = (t as { app?: unknown }).app
    if (typeof app === 'string' && app.trim()) todo.app = app.trim()
    const url = (t as { url?: unknown }).url
    if (typeof url === 'string' && url.trim()) todo.url = url.trim()
    const allowedApps = (t as { allowedApps?: unknown }).allowedApps
    if (Array.isArray(allowedApps)) {
      const list = allowedApps.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean)
      if (list.length > 0) todo.allowedApps = list
    }
    const deadline = (t as { deadline?: unknown }).deadline
    if (typeof deadline === 'number' && Number.isFinite(deadline)) todo.deadline = Math.trunc(deadline)
    const startTime = (t as { startTime?: unknown }).startTime
    if (typeof startTime === 'number' && Number.isFinite(startTime)) todo.startTime = Math.trunc(startTime)
    const durationMinutes = (t as { durationMinutes?: unknown }).durationMinutes
    if (typeof durationMinutes === 'number' && Number.isFinite(durationMinutes)) todo.durationMinutes = Math.trunc(durationMinutes)

    out.push(todo)
  }

  return out
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

