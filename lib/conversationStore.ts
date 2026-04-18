import fs from 'fs/promises'
import path from 'path'
import { persistDataToDisk } from './env.js'
import { conversationsDir, uploadsDir } from './paths.js'
import type {
  ConversationRecord,
  StoredAttachment,
  TopicDomain,
} from './conversationTypes.js'

function safeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{8,128}$/.test(id)
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(conversationsDir(), { recursive: true })
  await fs.mkdir(uploadsDir(), { recursive: true })
}

export async function persistConversation(record: ConversationRecord): Promise<void> {
  if (!persistDataToDisk()) {
    return
  }
  try {
    await ensureDirs()
    const file = path.join(conversationsDir(), `${record.id}.json`)
    await fs.writeFile(file, JSON.stringify(record, null, 2), 'utf8')
  } catch (e) {
    console.error('[conversationStore] persist failed (read-only env?)', e)
  }
}

export async function loadConversation(
  id: string,
): Promise<ConversationRecord | null> {
  if (!persistDataToDisk()) {
    return null
  }
  if (!safeId(id)) return null
  try {
    const file = path.join(conversationsDir(), `${id}.json`)
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw) as ConversationRecord
  } catch {
    return null
  }
}

export function mergeTopicsWithUploads(
  existing: TopicDomain[],
  topic: TopicDomain,
  hadUpload: boolean,
): TopicDomain[] {
  if (!hadUpload) return existing
  if (topic === 'mixed') {
    return existing.includes('mixed') ? existing : [...existing, 'mixed']
  }
  return existing.includes(topic) ? existing : [...existing, topic]
}

export async function saveUploadBuffer(opts: {
  conversationId: string
  fileName: string
  mimeType: string
  buffer: Buffer
  topic: TopicDomain
}): Promise<StoredAttachment> {
  const safeName = path.basename(opts.fileName).replace(/[^a-zA-Z0-9._-]/g, '_')
  const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  if (!persistDataToDisk()) {
    return {
      id,
      fileName: safeName,
      mimeType: opts.mimeType,
      storedPath: '(ephemeral-not-persisted)',
      uploadedAt: new Date().toISOString(),
      topicAtUpload: opts.topic,
    }
  }

  await ensureDirs()
  const dir = path.join(uploadsDir(), opts.conversationId)
  await fs.mkdir(dir, { recursive: true })
  const storedPath = path.join(dir, `${id}_${safeName}`)
  await fs.writeFile(storedPath, opts.buffer)
  const att: StoredAttachment = {
    id,
    fileName: safeName,
    mimeType: opts.mimeType,
    storedPath,
    uploadedAt: new Date().toISOString(),
    topicAtUpload: opts.topic,
  }
  return att
}

export async function recordFeedback(opts: {
  conversationId: string
  messageId: string
  rating: number
}): Promise<boolean> {
  if (!safeId(opts.conversationId)) return false
  if (opts.rating < 1 || opts.rating > 10) return false
  if (!persistDataToDisk()) {
    return true
  }
  const rec = await loadConversation(opts.conversationId)
  if (!rec) return false
  rec.feedbackByMessageId[opts.messageId] = {
    rating: opts.rating,
    at: new Date().toISOString(),
  }
  rec.updatedAt = new Date().toISOString()
  await persistConversation(rec)
  return true
}
