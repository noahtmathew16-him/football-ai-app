import type { VercelRequest, VercelResponse } from '@vercel/node'
import { chatWithClaude, type ChatMessage } from '../lib/client.js'
import { chatErrorHttpPayload } from '../lib/extractAnthropicError.js'
import { normalizeAthleteId, normalizeHistory } from '../lib/chatRequest.js'
import { getAnthropicApiKey, getAnthropicKeyDiagnostics } from '../lib/env.js'

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

function log(
  reqId: string,
  step: string,
  data?: Record<string, unknown>,
): void {
  console.error(
    `[api/chat][${reqId}] ${step}`,
    data ? JSON.stringify(data) : '',
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const reqId =
    (typeof req.headers['x-vercel-id'] === 'string' && req.headers['x-vercel-id']) ||
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  try {
    if (req.method === 'GET') {
      const keyDiag = getAnthropicKeyDiagnostics()
      const configured = Boolean(getAnthropicApiKey())
      log(reqId, 'GET /api/chat', { ...keyDiag, anthropicConfigured: configured })
      res.status(200).json({
        ok: true,
        anthropicConfigured: configured,
        keyDiagnostics: keyDiag,
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

    log(reqId, 'POST start', {
      bodyType: req.body === null ? 'null' : typeof req.body,
      contentType: req.headers['content-type'] ?? '(missing)',
    })

    const body = parseJsonBody(req) as ChatRequestBody
    const message =
      typeof body.message === 'string' ? body.message.trim() : ''
    const athleteId = normalizeAthleteId(body.athleteId)
    const history = normalizeHistory(body.history)

    log(reqId, 'parsed body', {
      messageLen: message.length,
      historyLen: history.length,
      athleteIdOk: Boolean(athleteId),
    })

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

    const keyDiag = getAnthropicKeyDiagnostics()
    log(reqId, 'env check', keyDiag as unknown as Record<string, unknown>)

    if (!getAnthropicApiKey()) {
      log(reqId, 'FAIL missing API key after trim', keyDiag as unknown as Record<string, unknown>)
      res.status(503).json({
        error: 'AI service is not configured',
        hint: 'Add ANTHROPIC_API_KEY in Vercel → Environment Variables (Production), save, then Redeploy.',
        keyDiagnostics: keyDiag,
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
    log(reqId, 'calling chatWithClaude', {
      turns: messages.length,
    })

    const response = await chatWithClaude(messages, athleteContext)

    log(reqId, 'success', { responseLen: response.length })
    res.json({ response })
  } catch (err) {
    const stack = err instanceof Error ? err.stack : undefined
    console.error(`[api/chat][${reqId}] CATCH`, err)
    if (stack) console.error(`[api/chat][${reqId}] stack`, stack)

    const { status, json } = chatErrorHttpPayload(err)
    json.requestLogId = reqId
    res.status(status).json(json)
  }
}
