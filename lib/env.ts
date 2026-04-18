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

/** Safe to log — never includes the full API key. */
export function getAnthropicKeyDiagnostics(): {
  envVarPresent: boolean
  envVarType: string
  trimmedLength: number
  keyPrefix: string
} {
  const raw = process.env['ANTHROPIC_API_KEY']
  const envVarPresent = raw !== undefined && raw !== null
  const envVarType = raw === undefined ? 'undefined' : raw === null ? 'null' : typeof raw
  if (typeof raw !== 'string') {
    return {
      envVarPresent,
      envVarType,
      trimmedLength: 0,
      keyPrefix: '(not a string)',
    }
  }
  const t = raw.trim()
  const keyPrefix =
    t.length === 0
      ? '(empty after trim)'
      : t.length >= 12
        ? `${t.slice(0, 12)}…`
        : `${t}…`
  return {
    envVarPresent,
    envVarType,
    trimmedLength: t.length,
    keyPrefix,
  }
}
