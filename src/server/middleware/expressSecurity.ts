import type { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { verifyAuthorizationHeader, isAppAccessEnforced } from '../../../lib/appAuth.js'
import { getAllowedOrigins, isOriginAllowed } from '../../../lib/corsConfig.js'
import { getClientIp } from '../../../lib/requestMeta.js'

export function corsMiddleware() {
  return cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean | string) => void,
    ) => {
      if (isOriginAllowed(origin ?? undefined)) {
        callback(null, origin ?? getAllowedOrigins()[0])
      } else {
        callback(null, false)
      }
    },
    credentials: true,
  })
}

function ipKey(req: Request, suffix: string): string {
  const ip = getClientIp(req.headers, req.socket?.remoteAddress)
  return `${ip}:${suffix}`
}

export function chatRateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKey(req, 'chat'),
  })
}

export function feedbackRateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKey(req, 'feedback'),
  })
}

export function requireAppAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!isAppAccessEnforced()) {
    next()
    return
  }
  if (!verifyAuthorizationHeader(req.headers.authorization)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
