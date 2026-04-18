/**
 * Shared request normalization for /api/chat (Vercel + Express).
 * athleteId: any non-empty trimmed string up to 256 chars (e.g. "default" is valid).
 */

export function normalizeAthleteId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (s.length < 1 || s.length > 256) return null
  return s
}

export function normalizeHistory(
  raw: unknown,
): Array<{ role: 'athlete' | 'ai'; content: string }> {
  if (!Array.isArray(raw)) return []
  const out: Array<{ role: 'athlete' | 'ai'; content: string }> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const role = r.role === 'athlete' || r.role === 'ai' ? r.role : null
    if (!role) continue
    const content =
      typeof r.content === 'string' ? r.content : String(r.content ?? '')
    out.push({ role, content })
  }
  return out
}
