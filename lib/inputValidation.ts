/** Max characters for each user-visible message (current turn + each history turn). */
export const MAX_MESSAGE_CHARS = 2000

const SUSPICIOUS =
  /(<\s*script|javascript\s*:|<\s*\/\s*script|data\s*:\s*text\/html|vbscript\s*:)/i
const ATTR_INJECTION = /\bon\w+\s*=/i

export function hasSuspiciousText(s: string): boolean {
  if (/\x00/.test(s)) return true
  if (SUSPICIOUS.test(s)) return true
  if (ATTR_INJECTION.test(s)) return true
  return false
}

export function validateMessageField(
  label: string,
  content: string,
): string | null {
  if (content.length > MAX_MESSAGE_CHARS) {
    return `${label} exceeds ${MAX_MESSAGE_CHARS} characters`
  }
  if (hasSuspiciousText(content)) {
    return `${label} contains disallowed patterns`
  }
  return null
}

export interface ChatBodyLike {
  message?: string
  history?: Array<{ role: string; content: string }>
}

/** Returns error message or null if OK. */
export function validateChatPayload(body: ChatBodyLike): string | null {
  const message = typeof body.message === 'string' ? body.message : ''
  const msgErr = validateMessageField('message', message)
  if (msgErr) return msgErr

  if (!Array.isArray(body.history)) return null
  for (let i = 0; i < body.history.length; i++) {
    const h = body.history[i]
    if (!h || typeof h.content !== 'string') continue
    const err = validateMessageField(`history[${i}]`, h.content)
    if (err) return err
  }
  return null
}

const MAX_ID_LEN = 256

export function validateFeedbackFields(
  messageId: string,
): string | null {
  if (messageId.length > MAX_ID_LEN) {
    return 'messageId too long'
  }
  if (hasSuspiciousText(messageId)) {
    return 'messageId contains disallowed patterns'
  }
  return null
}
