export type TopicDomain = 'football' | 'academics' | 'life' | 'mixed'

export interface StoredAttachment {
  id: string
  fileName: string
  mimeType: string
  storedPath: string
  uploadedAt: string
  topicAtUpload: TopicDomain
  /** Short note for exports (e.g. PDF extract preview, image→vision). */
  analysisSummary?: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  /** Files referenced in this turn (paths under data/uploads) */
  attachments?: StoredAttachment[]
}

export interface ConversationRecord {
  id: string
  athleteId: string
  topic: TopicDomain
  createdAt: string
  updatedAt: string
  messages: ConversationMessage[]
  fileUploads: StoredAttachment[]
  /** messageId -> rating 1–10 */
  feedbackByMessageId: Record<string, { rating: number; at: string }>
  /** Topics seen when uploads were used */
  topicsWithFileUpload: TopicDomain[]
}
