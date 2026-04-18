import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuthorizationHeader, isAppAccessEnforced } from './appAuth.js'
import { getAllowedOrigins, isOriginAllowed } from './corsConfig.js'
import { rateLimitAllow } from './rateLimitMemory.js'
import { getClientIp } from './requestMeta.js'

type GuardResult = 'ok' | 'responded'

function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : ''
  const allowed = getAllowedOrigins()
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (!origin && allowed.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', allowed[0])
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  )
  res.setHeader('Access-Control-Max-Age', '86400')
}

/**
 * Returns true if the handler should stop (response already sent).
 */
export function applyVercelSecurityPreflight(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined

  if (req.method === 'OPTIONS') {
    if (origin && !isOriginAllowed(origin)) {
      res.status(403).json({ error: 'Forbidden' })
      return true
    }
    setCorsHeaders(req, res)
    res.status(204).end()
    return true
  }

  if (origin && !isOriginAllowed(origin)) {
    res.status(403).json({ error: 'Forbidden' })
    return true
  }

  setCorsHeaders(req, res)
  return false
}

export function applyVercelRateLimitAndAuth(
  req: VercelRequest,
  res: VercelResponse,
  routeKey: 'chat' | 'feedback',
): GuardResult {
  const ip = getClientIp(req.headers)
  if (!rateLimitAllow(ip, routeKey)) {
    res.status(429).json({ error: 'Too many requests', retryAfterSec: 60 })
    return 'responded'
  }

  if (isAppAccessEnforced()) {
    const auth = req.headers.authorization
    if (!verifyAuthorizationHeader(auth)) {
      res.status(401).json({ error: 'Unauthorized' })
      return 'responded'
    }
  }

  return 'ok'
}
