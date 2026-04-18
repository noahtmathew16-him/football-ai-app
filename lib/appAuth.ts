/**
 * Simple shared-secret gate: set APP_ACCESS_TOKEN on the server.
 * When unset, API access is not gated (local development only — set token before Phase 2).
 */

export function getExpectedAccessToken(): string | undefined {
  const raw = process.env['APP_ACCESS_TOKEN']
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  return t.length > 0 ? t : undefined
}

export function isAppAccessEnforced(): boolean {
  return Boolean(getExpectedAccessToken())
}

export function verifyAuthorizationHeader(
  authorization: string | undefined,
): boolean {
  const expected = getExpectedAccessToken()
  if (!expected) return true
  if (!authorization || !authorization.startsWith('Bearer ')) return false
  const token = authorization.slice('Bearer '.length).trim()
  return token.length > 0 && token === expected
}
