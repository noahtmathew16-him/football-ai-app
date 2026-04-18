/**
 * Browser CORS: when `Origin` is present it must match one of these.
 * Requests with no `Origin` (same-origin navigation, curl) are allowed.
 * Override with CORS_ORIGINS=comma-separated list.
 */

const DEFAULT_ORIGINS = ['https://football-ai-app-ten.vercel.app']

export function getAllowedOrigins(): string[] {
  const raw = process.env['CORS_ORIGINS']
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return DEFAULT_ORIGINS
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin || origin.length === 0) return true
  return getAllowedOrigins().includes(origin)
}
