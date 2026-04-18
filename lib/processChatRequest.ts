import type { ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages'

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
import { chatWithClaude, type ChatMessage } from './client.js'
import {
  inferTopicFromText,
} from './inferTopic.js'
import {
  loadConversation,
  mergeTopicsWithUploads,
  persistConversation,
  saveUploadBuffer,
} from './conversationStore.js'
import type {
  ConversationRecord,
  StoredAttachment,
  TopicDomain,
} from './conversationTypes.js'
import { extractPdfText } from './pdfExtract.js'

export interface IncomingFilePart {
  fileName: string
  mimeType: string
  base64: string
}

export interface ChatRequestInput {
  message: string
  athleteId: string
  conversationId?: string
  history?: Array<{ role: 'athlete' | 'ai'; content: string }>
  files?: IncomingFilePart[]
}

export interface ChatRequestResult {
  response: string
  conversationId: string
  userMessageId: string
  assistantMessageId: string
}

const MAX_TOTAL_BYTES = 8 * 1024 * 1024

function mergeConversationTopic(
  current: TopicDomain,
  inferred: TopicDomain,
): TopicDomain {
  if (current === 'mixed' || inferred === 'mixed') return 'mixed'
  if (current === inferred) return current
  return 'mixed'
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function safeConversationId(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(s)) return null
  return s
}

function buildUserDisplayContent(
  text: string,
  attachmentNames: string[],
): string {
  const t = text.trim()
  if (attachmentNames.length === 0) return t
  const line = `[Files attached: ${attachmentNames.join(', ')}]`
  return t ? `${t}\n\n${line}` : line
}

function isImageMime(m: string): boolean {
  return (
    m === 'image/jpeg' ||
    m === 'image/png' ||
    m === 'image/gif' ||
    m === 'image/webp'
  )
}

export async function processChatRequest(
  input: ChatRequestInput,
): Promise<ChatRequestResult> {
  const message = typeof input.message === 'string' ? input.message.trim() : ''

  const userMessageId = newId('um')
  const assistantMessageId = newId('am')
  const existingId = safeConversationId(input.conversationId)
  const conversationId = existingId ?? newId('conv')

  const history: Array<{ role: 'athlete' | 'ai'; content: string }> = Array.isArray(
    input.history,
  )
    ? input.history
    : []

  const priorForApi: ChatMessage[] = history.map((m) => ({
    role: m.role === 'athlete' ? 'user' : 'assistant',
    content: m.content,
  }))

  const fileParts = Array.isArray(input.files) ? input.files : []
  let totalBytes = 0
  const buffers: Array<{
    fileName: string
    mimeType: string
    buffer: Buffer
  }> = []

  for (const f of fileParts) {
    if (
      typeof f.fileName !== 'string' ||
      typeof f.mimeType !== 'string' ||
      typeof f.base64 !== 'string'
    ) {
      continue
    }
    let buf: Buffer
    try {
      buf = Buffer.from(f.base64, 'base64')
    } catch {
      continue
    }
    totalBytes += buf.length
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('Total upload size too large (max 8MB).')
    }
    buffers.push({
      fileName: f.fileName,
      mimeType: f.mimeType,
      buffer: buf,
    })
  }

  if (!message && buffers.length === 0) {
    throw new Error('Missing message and files')
  }

  const topicHint = `${message} ${buffers.map((b) => b.fileName).join(' ')}`
  const topic: TopicDomain = inferTopicFromText(topicHint)

  const parts: Array<TextBlockParam | ImageBlockParam> = []
  const storedThisTurn: StoredAttachment[] = []
  const attachmentNames: string[] = []

  if (message.trim()) {
    parts.push({ type: 'text', text: message })
  }

  for (const b of buffers) {
    const att = await saveUploadBuffer({
      conversationId,
      fileName: b.fileName,
      mimeType: b.mimeType,
      buffer: b.buffer,
      topic,
    })
    storedThisTurn.push(att)
    attachmentNames.push(b.fileName)

    if (isImageMime(b.mimeType)) {
      const mediaType = b.mimeType as ImageMediaType
      parts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: b.buffer.toString('base64'),
        },
      })
      att.analysisSummary = 'Image sent to Claude vision (full file on disk).'
    } else if (b.mimeType === 'application/pdf') {
      let extracted = ''
      let pdfExtractFailed = false
      try {
        extracted = await extractPdfText(b.buffer)
      } catch (e) {
        pdfExtractFailed = true
        console.error('[processChatRequest] PDF extract failed', e)
        extracted = '(Could not extract PDF text; file was saved for your records.)'
      }
      const label = `Content from uploaded file "${b.fileName}" (PDF):\n`
      parts.push({
        type: 'text',
        text:
          !pdfExtractFailed && extracted.length > 0
            ? `${label}${extracted}`
            : `${label}${pdfExtractFailed ? extracted : '(No text layer found in this PDF.)'}`,
      })
      if (pdfExtractFailed) {
        att.analysisSummary = 'PDF: extraction failed; file kept on disk.'
      } else if (extracted.length > 0) {
        att.analysisSummary = `PDF: ${extracted.length} characters extracted for the model. Preview: ${extracted.slice(0, 500)}${extracted.length > 500 ? '…' : ''}`
      } else {
        att.analysisSummary = 'PDF: no extractable text layer; file kept on disk.'
      }
    } else if (b.mimeType === 'text/plain' || b.mimeType === 'text/markdown') {
      const txt = b.buffer.toString('utf8')
      parts.push({
        type: 'text',
        text: `Content from uploaded file "${b.fileName}":\n${txt}`,
      })
      att.analysisSummary = `Text: ${txt.length} characters. Preview: ${txt.slice(0, 500)}${txt.length > 500 ? '…' : ''}`
    } else {
      parts.push({
        type: 'text',
        text: `An uploaded file "${b.fileName}" (${b.mimeType}) was saved but could not be sent to the model. Supported: images (jpeg/png/gif/webp), PDF, plain text.`,
      })
      att.analysisSummary = `Stored (${b.mimeType}); not sent to the model.`
    }
  }

  if (parts.length === 0) {
    parts.push({
      type: 'text',
      text: '(No text or readable attachments.)',
    })
  }

  const lastUserContent: string | Array<TextBlockParam | ImageBlockParam> =
    parts.length === 1 && parts[0].type === 'text'
      ? parts[0].text
      : parts

  const athleteContext = `athleteId: ${input.athleteId}`

  const response = await chatWithClaude(
    priorForApi,
    lastUserContent,
    athleteContext,
  )

  const now = new Date().toISOString()
  const userDisplay = buildUserDisplayContent(message, attachmentNames)

  let record: ConversationRecord | null = existingId
    ? await loadConversation(existingId)
    : null

  if (!record) {
    record = {
      id: conversationId,
      athleteId: input.athleteId,
      topic,
      createdAt: now,
      updatedAt: now,
      messages: [],
      fileUploads: [],
      feedbackByMessageId: {},
      topicsWithFileUpload: [],
    }
  } else {
    record.athleteId = input.athleteId
    record.updatedAt = now
    record.topic = mergeConversationTopic(record.topic, topic)
  }

  record.messages.push({
    id: userMessageId,
    role: 'user',
    content: userDisplay,
    timestamp: now,
    attachments:
      storedThisTurn.length > 0 ? [...storedThisTurn] : undefined,
  })
  record.messages.push({
    id: assistantMessageId,
    role: 'assistant',
    content: response,
    timestamp: now,
  })

  record.fileUploads = [...record.fileUploads, ...storedThisTurn]
  record.topicsWithFileUpload = mergeTopicsWithUploads(
    record.topicsWithFileUpload,
    topic,
    storedThisTurn.length > 0,
  )

  await persistConversation(record)

  return {
    response,
    conversationId,
    userMessageId,
    assistantMessageId,
  }
}
