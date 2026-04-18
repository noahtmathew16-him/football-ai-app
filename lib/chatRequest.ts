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

export interface NormalizedFilePart {
  fileName: string
  mimeType: string
  base64: string
}

export function normalizeFiles(raw: unknown): NormalizedFilePart[] {
  if (!Array.isArray(raw)) return []
  const out: NormalizedFilePart[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const rawName =
      typeof r.fileName === 'string'
        ? r.fileName
        : typeof r.name === 'string'
          ? r.name
          : ''
    const fileName = rawName ? pathBasenameSafe(rawName) : ''
    const mimeType =
      typeof r.mimeType === 'string' && r.mimeType.trim().length > 0
        ? r.mimeType.trim()
        : 'application/octet-stream'
    const base64Raw =
      typeof r.base64 === 'string'
        ? r.base64
        : typeof r.data === 'string'
          ? r.data
          : ''
    const base64 = base64Raw.trim()
    if (!fileName || !base64) continue
    out.push({ fileName, mimeType, base64 })
  }
  return out
}

function pathBasenameSafe(p: string): string {
  const s = p.replace(/\\/g, '/').trim()
  const parts = s.split('/')
  return parts[parts.length - 1] ?? s
}

export function normalizeConversationId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(s)) return null
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
