import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MAX_MESSAGE_CHARS } from '../../../lib/inputValidation'
import { apiFetch } from '../api/backend'

export type MessageRole = 'athlete' | 'ai'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  attachmentNames?: string[]
  feedbackSubmitted?: boolean
}

function newMessageId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'ai',
    content:
      "Hey. I'm here to help with football, school, and staying organized. What's on your mind?",
    timestamp: new Date(),
  },
]

const ACCEPT_FILES =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,.pdf,.txt,.md'

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const s = r.result as string
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function TypingIndicator() {
  return (
    <div className="flex justify-start px-1 py-2">
      <div className="rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center">
          <span className="sr-only">Assistant is typing</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="text-[15px] leading-relaxed text-neutral-800 [&_a]:text-emerald-700 [&_a]:underline [&_code]:text-sm [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-neutral-900 [&_pre]:text-neutral-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-600"
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  /** Synced on every pendingFiles change; updated synchronously in file handlers so Send never races state. */
  const pendingFilesRef = useRef<File[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [copyFlashId, setCopyFlashId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    pendingFilesRef.current = pendingFiles
  }, [pendingFiles])

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isSending, scrollToBottom])

  const submitFeedback = async (messageId: string, rating: number) => {
    if (!conversationId) return
    const res = await apiFetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, messageId, rating }),
    })
    if (!res.ok) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedbackSubmitted: true } : m,
      ),
    )
  }

  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFlashId(id)
      setTimeout(() => setCopyFlashId(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    const filesSnapshot = [...pendingFilesRef.current]
    if ((!trimmed && filesSnapshot.length === 0) || isSending) return

    const tempUserId = newMessageId()
    const names = filesSnapshot.map((f) => f.name)
    const displayLines = [trimmed, names.length ? `[Files: ${names.join(', ')}]` : '']
      .filter(Boolean)
      .join('\n\n')

    const athleteMessage: Message = {
      id: tempUserId,
      role: 'athlete',
      content: displayLines,
      timestamp: new Date(),
      attachmentNames: names.length ? names : undefined,
    }
    setMessages((prev) => [...prev, athleteMessage])
    setInput('')
    pendingFilesRef.current = []
    setPendingFiles([])
    setIsSending(true)

    const history = messages
      .filter((m) => m.role === 'athlete' || m.role === 'ai')
      .map((m) => ({ role: m.role, content: m.content }))

    let filesPayload: Array<{ fileName: string; mimeType: string; base64: string }> =
      []
    try {
      const parts = await Promise.all(
        filesSnapshot.map(async (f) => ({
          fileName: f.name,
          mimeType: f.type || 'application/octet-stream',
          base64: await readFileAsBase64(f),
        })),
      )
      let total = 0
      for (const p of parts) {
        total += Math.ceil((p.base64.length * 3) / 4)
        if (total > 8 * 1024 * 1024) {
          throw new Error('Attachments are too large (max 8MB total).')
        }
      }
      filesPayload = parts
    } catch (e) {
      setIsSending(false)
      const err: Message = {
        id: newMessageId(),
        role: 'ai',
        content:
          e instanceof Error
            ? `Something went wrong: ${e.message}`
            : 'Something went wrong with file uploads.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, err])
      return
    }

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          athleteId: 'default',
          conversationId: conversationId ?? undefined,
          history,
          files: filesPayload.length ? filesPayload : undefined,
        }),
      })

      let data: {
        response?: string
        error?: string
        hint?: string
        anthropicMessage?: string
        requestId?: string
        conversationId?: string
        userMessageId?: string
        assistantMessageId?: string
      }
      try {
        data = (await res.json()) as typeof data
      } catch {
        throw new Error(
          `Bad response from server (${res.status}). Check Vercel function logs.`,
        )
      }

      if (!res.ok) {
        const detail =
          data.anthropicMessage ||
          data.hint ||
          data.error ||
          'Failed to get response'
        const reqId = data.requestId ? ` (request ${data.requestId})` : ''
        throw new Error(`${detail}${reqId}`)
      }

      const cid = data.conversationId ?? null
      const userId = data.userMessageId
      const assistantId = data.assistantMessageId
      if (cid) setConversationId(cid)

      setMessages((prev) => {
        const mapped = prev.map((m) =>
          m.id === tempUserId && userId
            ? { ...m, id: userId }
            : m,
        )
        const aiMessage: Message = {
          id: assistantId ?? newMessageId(),
          role: 'ai',
          content: data.response ?? '',
          timestamp: new Date(),
        }
        return [...mapped, aiMessage]
      })
    } catch (err) {
      const errorMessage: Message = {
        id: newMessageId(),
        role: 'ai',
        content:
          err instanceof Error
            ? `Something went wrong: ${err.message}`
            : 'Something went wrong. Try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list?.length) return
    const added = Array.from(list)
    const next = [...pendingFilesRef.current, ...added]
    pendingFilesRef.current = next
    setPendingFiles(next)
    e.target.value = ''
  }

  const removePendingFile = (file: File) => {
    const next = pendingFilesRef.current.filter((x) => x !== file)
    pendingFilesRef.current = next
    setPendingFiles(next)
  }

  const showFeedback = (msg: Message) =>
    msg.role === 'ai' &&
    msg.id !== 'welcome' &&
    conversationId &&
    !msg.content.startsWith('Something went wrong:') &&
    !msg.feedbackSubmitted

  return (
    <div className="flex flex-col h-[100dvh] max-h-screen bg-[#f4f4f5]">
      <header className="flex-shrink-0 border-b border-neutral-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <h1 className="text-base font-semibold text-neutral-900 tracking-tight">
            Football Athlete AI
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Performance · Academics · Life
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'athlete' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center mt-0.5"
                  aria-hidden
                >
                  AI
                </div>
              )}
              <div
                className={`min-w-0 max-w-[min(100%,32rem)] ${
                  msg.role === 'athlete' ? 'order-1' : ''
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'athlete'
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-white text-neutral-900 border border-neutral-200/90 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'athlete' ? (
                    <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  ) : (
                    <MarkdownBody content={msg.content} />
                  )}
                </div>
                {msg.role === 'ai' && (
                  <div className="flex flex-wrap items-center gap-2 mt-2 pl-0.5">
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(msg.id, msg.content)}
                      className="text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded-md hover:bg-neutral-200/80 transition-colors"
                    >
                      {copyFlashId === msg.id ? 'Copied' : 'Copy'}
                    </button>
                    {showFeedback(msg) && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
                        <span className="text-neutral-400">Helpful?</span>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="min-w-[1.75rem] px-1.5 py-0.5 rounded-md border border-neutral-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                            onClick={() => void submitFeedback(msg.id, n)}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.feedbackSubmitted && (
                      <span className="text-xs text-emerald-600">Thanks for the feedback.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isSending && <TypingIndicator />}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto p-3 sm:p-4">
          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_FILES}
              className="hidden"
              onChange={onPickFiles}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="flex-shrink-0 w-11 h-11 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
              title="Attach files"
              aria-label="Attach files"
            >
              <span className="text-lg leading-none">+</span>
            </button>
            <div className="flex-1 min-w-0 flex flex-col gap-2 rounded-xl border border-neutral-300 bg-white focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500">
              {pendingFiles.length > 0 && (
                <div
                  className="flex flex-wrap gap-2 px-3 pt-3 pb-0"
                  aria-label="Attachments ready to send"
                >
                  {pendingFiles.map((f, i) => (
                    <span
                      key={`${f.name}-${f.size}-${i}`}
                      className="inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-800 px-2 py-1 rounded-lg border border-neutral-200 max-w-full"
                    >
                      <span className="truncate" title={f.name}>
                        {f.name}
                      </span>
                      <button
                        type="button"
                        className="flex-shrink-0 text-neutral-500 hover:text-red-600"
                        onClick={() => removePendingFile(f)}
                        aria-label={`Remove ${f.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={MAX_MESSAGE_CHARS}
                placeholder={
                  pendingFiles.length
                    ? 'Add a message (optional)…'
                    : 'Message… (Shift+Enter for new line)'
                }
                disabled={isSending}
                rows={1}
                className="w-full min-h-[44px] max-h-40 px-4 py-3 rounded-xl border-0 bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 disabled:opacity-60 resize-y text-[15px]"
              />
            </div>
            <button
              onClick={() => void handleSend()}
              disabled={
                (!input.trim() && pendingFiles.length === 0) || isSending
              }
              className="flex-shrink-0 min-w-[5rem] h-11 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
