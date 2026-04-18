import { Router, Request, Response } from 'express'
import {
  normalizeAthleteId,
  normalizeConversationId,
  normalizeFiles,
  normalizeHistory,
} from '../../../lib/chatRequest.js'
import { processChatRequest } from '../../../lib/processChatRequest.js'
import { chatErrorHttpPayload } from '../../../lib/extractAnthropicError.js'
import { getAnthropicApiKey, getAnthropicKeyDiagnostics } from '../../../lib/env.js'
import { validateChatPayload } from '../../../lib/inputValidation.js'

const router = Router()

interface ChatRequestBody {
  message?: string
  athleteId?: string
  conversationId?: string
  history?: Array<{ role: 'athlete' | 'ai'; content: string }>
  files?: unknown
}

router.get('/', (_req: Request, res: Response) => {
  const keyDiag = getAnthropicKeyDiagnostics()
  const configured = Boolean(getAnthropicApiKey())
  res.status(200).json({
    ok: true,
    anthropicConfigured: configured,
    keyDiagnostics: keyDiag,
    ...(configured
      ? {}
      : {
          hint: 'Set ANTHROPIC_API_KEY in your environment (.env locally, Vercel env on deploy).',
        }),
  })
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as ChatRequestBody
    const validation = validateChatPayload(body)
    if (validation) {
      res.status(400).json({ error: validation })
      return
    }

    const message =
      typeof body.message === 'string' ? body.message.trim() : ''
    const athleteId = normalizeAthleteId(body.athleteId)
    const history = normalizeHistory(body.history)
    const conversationId = normalizeConversationId(body.conversationId)
    const files = normalizeFiles(body.files)

    if (!message && files.length === 0) {
      res.status(400).json({
        error: 'Missing or invalid message',
        hint: 'Send a message and/or file uploads.',
      })
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
      console.error('ANTHROPIC_API_KEY is not set or empty')
      res.status(503).json({
        error: 'AI service is not configured',
        hint: 'Set ANTHROPIC_API_KEY in your environment (.env locally, Vercel env on deploy).',
      })
      return
    }

    const result = await processChatRequest({
      message,
      athleteId,
      conversationId: conversationId ?? undefined,
      history,
      files,
    })

    res.json({
      response: result.response,
      conversationId: result.conversationId,
      userMessageId: result.userMessageId,
      assistantMessageId: result.assistantMessageId,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('too large') || msg.includes('Missing message')) {
      res.status(400).json({ error: msg })
      return
    }
    const { status, json } = chatErrorHttpPayload(err)
    res.status(status).json(json)
  }
})

export default router
