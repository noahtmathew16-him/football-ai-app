import { useState, useRef, useEffect } from 'react'

export type MessageRole = 'athlete' | 'ai'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'ai',
    content:
      "Hey. I'm here to help with football, school, and staying organized. What's on your mind?",
    timestamp: new Date(),
  },
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const athleteMessage: Message = {
      id: crypto.randomUUID(),
      role: 'athlete',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, athleteMessage])
    setInput('')
    setIsSending(true)

    const history = messages
      .filter((m) => m.role === 'athlete' || m.role === 'ai')
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          athleteId: 'default',
          history,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: data.response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] max-h-screen bg-slate-50">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 bg-white border-b border-slate-200">
        <h1 className="text-lg font-semibold text-slate-800">
          Football Athlete AI
        </h1>
        <p className="text-sm text-slate-500">
          Performance • Academics • Life
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'athlete' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'athlete'
                  ? 'bg-emerald-600 text-white rounded-br-md'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm'
              }`}
            >
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about training, school, or staying on top of things..."
            disabled={isSending}
            className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-base"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="flex-shrink-0 px-5 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 transition-colors"
          >
            {isSending ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
