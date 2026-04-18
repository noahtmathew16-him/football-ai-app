import type { IncomingHttpHeaders } from 'http'

/** Client IP from X-Forwarded-For (Vercel / proxies) or socket. */
export function getClientIp(headers: IncomingHttpHeaders, socketRemote?: string): string {
  const xff = headers['x-forwarded-for']
  if (typeof xff === 'string') {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  if (Array.isArray(xff) && xff[0]) {
    const first = String(xff[0]).split(',')[0]?.trim()
    if (first) return first
  }
  if (socketRemote) return socketRemote
  return 'unknown'
}
