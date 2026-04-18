import { Router, Request, Response } from 'express'
import { normalizeConversationId } from '../../../lib/chatRequest.js'
import { validateFeedbackFields } from '../../../lib/inputValidation.js'
import { recordFeedback } from '../../../lib/conversationStore.js'

const router = Router()

interface FeedbackBody {
  conversationId?: string
  messageId?: string
  rating?: number
}

router.post('/', async (req: Request, res: Response) => {
  const body = req.body as FeedbackBody
  const conversationId = normalizeConversationId(body.conversationId)
  const messageId =
    typeof body.messageId === 'string' && body.messageId.trim().length > 0
      ? body.messageId.trim()
      : null
  const rating =
    typeof body.rating === 'number' && Number.isFinite(body.rating)
      ? Math.round(body.rating)
      : NaN

  if (!conversationId || !messageId) {
    res.status(400).json({
      error: 'Missing conversationId or messageId',
    })
    return
  }

  const idErr = validateFeedbackFields(messageId)
  if (idErr) {
    res.status(400).json({ error: idErr })
    return
  }

  if (rating < 1 || rating > 10) {
    res.status(400).json({ error: 'rating must be between 1 and 10' })
    return
  }

  const ok = await recordFeedback({ conversationId, messageId, rating })
  if (!ok) {
    res.status(404).json({ error: 'Conversation not found or invalid id' })
    return
  }

  res.json({ ok: true })
})

export default router
