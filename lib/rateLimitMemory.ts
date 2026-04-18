/**
 * Best-effort in-memory rate limit (per serverless instance / single Node process).
 * 10 requests per rolling minute per IP per route key.
 */

const WINDOW_MS = 60_000
const MAX_HITS = 10

const buckets = new Map<string, number[]>()

function prune(ts: number[]): number[] {
  const now = Date.now()
  return ts.filter((t) => now - t < WINDOW_MS)
}

export function rateLimitAllow(ip: string, routeKey: string): boolean {
  const key = `${routeKey}:${ip}`
  const list = prune(buckets.get(key) ?? [])
  if (list.length >= MAX_HITS) {
    buckets.set(key, list)
    return false
  }
  list.push(Date.now())
  buckets.set(key, list)
  return true
}
