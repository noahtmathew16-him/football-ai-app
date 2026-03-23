import { Router, Request, Response } from 'express'
import { chatWithClaude, type ChatMessage } from '../../ai/client.js'

const router = Router()

interface ChatRequestBody {
  message: string
  athleteId: string
  history?: Array<{ role: 'athlete' | 'ai'; content: string }>
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, athleteId, history = [] } = req.body as ChatRequestBody

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing or invalid message' })
      return
    }

    if (!athleteId || typeof athleteId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid athleteId' })
      return
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      res.status(500).json({ error: 'AI service is not configured' })
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
    console.error('Chat API error:', err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to get AI response',
    })
  }
})

export default router
