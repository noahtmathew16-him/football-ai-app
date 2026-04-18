import { useState, useEffect, type FormEvent, type ReactNode } from 'react'
import {
  getStoredAccessToken,
  setStoredAccessToken,
  clearStoredAccessToken,
  UNAUTHORIZED_EVENT,
} from '../api/backend'

type Props = { children: ReactNode }

export function AuthGate({ children }: Props) {
  const [token, setToken] = useState<string | null>(() => getStoredAccessToken())
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onUnauthorized = () => {
      clearStoredAccessToken()
      setToken(null)
      setError('Session expired or access denied. Enter the access password again.')
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  if (token) {
    return <>{children}</>
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const v = input.trim()
    if (!v) {
      setError('Enter the access password.')
      return
    }
    setError(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'GET',
        headers: { Authorization: `Bearer ${v}` },
      })
      if (res.status === 401) {
        setError('Invalid access password.')
        return
      }
      setStoredAccessToken(v)
      setToken(v)
      setInput('')
    } catch {
      setError('Could not verify access. Check your connection and try again.')
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f4f4f5] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900">Football Athlete AI</h1>
        <p className="text-sm text-neutral-500 mt-1 mb-4">
          Enter the access password to continue (Phase 2 testing).
        </p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="sr-only">Access password</span>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              placeholder="Access password"
            />
          </label>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
