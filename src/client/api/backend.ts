/**
 * All Claude / Anthropic traffic goes through POST /api/chat on the server.
 * Never import @anthropic-ai/sdk or embed API keys in the client bundle.
 */

export const AUTH_STORAGE_KEY = 'football-ai-app-access-token'

export const UNAUTHORIZED_EVENT = 'football-ai-unauthorized'

export function getStoredAccessToken(): string | null {
  try {
    const t = localStorage.getItem(AUTH_STORAGE_KEY)
    return t && t.trim().length > 0 ? t.trim() : null
  } catch {
    return null
  }
}

export function setStoredAccessToken(token: string): void {
  localStorage.setItem(AUTH_STORAGE_KEY, token.trim())
}

export function clearStoredAccessToken(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function authHeaders(): HeadersInit {
  const token = getStoredAccessToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  const auth = authHeaders() as Record<string, string>
  if (auth.Authorization) {
    headers.set('Authorization', auth.Authorization)
  }
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(path, { ...init, headers })
  if (res.status === 401) {
    clearStoredAccessToken()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return res
}
