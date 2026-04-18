import { Router, Request, Response } from 'express'
import { chatWithClaude, type ChatMessage } from '../../ai/client.js'
import { chatErrorHttpPayload } from '../../ai/extractAnthropicError.js'
import { normalizeAthleteId, normalizeHistory } from '../../ai/chatRequest.js'
import { getAnthropicApiKey } from '../../ai/env.js'

const router = Router()

interface ChatRequestBody {
  message: string
  athleteId: string
  history?: Array<{ role: 'athlete' | 'ai'; content: string }>
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as ChatRequestBody
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
      console.error('ANTHROPIC_API_KEY is not set or empty')
      res.status(503).json({
        error: 'AI service is not configured',
        hint: 'Set ANTHROPIC_API_KEY in your environment (.env locally, Vercel env on deploy).',
      })
      return
    }

    const messages: ChatMessage[] = [
      ...history.map((m) => ({
        role: (m.role === 'athlete' ? 'user' : 'assistant') as 'user' | 'assistant',
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
})

export default router
