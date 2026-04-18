/**
 * Read Anthropic credentials at request time (avoids build-time inlining on Vercel).
 * Use bracket notation so bundlers don't replace with literals from the build environment.
 */
export function getAnthropicApiKey(): string | undefined {
  const raw = process.env['ANTHROPIC_API_KEY']
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function getAnthropicModel(): string {
  const raw = process.env['ANTHROPIC_MODEL']
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim()
  }
  return 'claude-sonnet-4-6'
}
