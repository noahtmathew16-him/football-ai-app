import type { VercelRequest, VercelResponse } from '@vercel/node'
import { chatWithClaude, type ChatMessage } from '../src/ai/client'
import { chatErrorHttpPayload } from '../src/ai/extractAnthropicError'
import { normalizeAthleteId, normalizeHistory } from '../src/ai/chatRequest'
import { getAnthropicApiKey } from '../src/ai/env'

interface ChatRequestBody {
  message: string
  athleteId: string
  history?: Array<{ role: 'athlete' | 'ai'; content: string }>
}

function parseJsonBody(req: VercelRequest): unknown {
  const raw = req.body
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return {}
    }
  }
  return raw
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const configured = Boolean(getAnthropicApiKey())
    res.status(200).json({
      ok: true,
      anthropicConfigured: configured,
      ...(configured
        ? {}
        : {
            hint: 'Set ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables for Production, then Redeploy.',
          }),
    })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = parseJsonBody(req) as ChatRequestBody
    const message =
      typeof body.message === 'string' ? body.message.trim() : ''
    const athleteId = normalizeAthleteId(body.athleteId)
    const history = normalizeHistory(body.history)

    if (!message) {
      res.status(400).json({ error: 'Missing or invalid message' })
      return
    }

    if (!athleteId) {
      res.status(400).json({
        error: 'Missing or invalid athleteId',
        hint: 'Send a non-empty string (e.g. "default").',
      })
      return
    }

    if (!getAnthropicApiKey()) {
      console.error(
        '[api/chat] ANTHROPIC_API_KEY is not set or is empty after trim',
      )
      res.status(503).json({
        error: 'AI service is not configured',
        hint: 'Add ANTHROPIC_API_KEY in Vercel → Environment Variables (Production), save, then Redeploy.',
      })
      return
    }

    const messages: ChatMessage[] = [
      ...history.map((m) => ({
        role: (m.role === 'athlete' ? 'user' : 'assistant') as
          | 'user'
          | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const athleteContext = `athleteId: ${athleteId}`
    const response = await chatWithClaude(messages, athleteContext)

    res.json({ response })
  } catch (err) {
    const { status, json } = chatErrorHttpPayload(err)
    res.status(status).json(json)
  }
}
