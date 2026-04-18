import { APIError } from '@anthropic-ai/sdk'

/**
 * Pull a readable message from Anthropic SDK errors (nested JSON bodies).
 */
export function extractAnthropicErrorDetails(err: unknown): {
  message: string
  status?: number
  requestId?: string
  raw?: unknown
} {
  if (err instanceof APIError) {
    const body = err.error as Record<string, unknown> | undefined
    let nestedMsg: string | undefined

    if (body?.error && typeof body.error === 'object' && body.error !== null) {
      const inner = body.error as Record<string, unknown>
      if (typeof inner.message === 'string') nestedMsg = inner.message
    }
    if (!nestedMsg && body && typeof body.message === 'string') {
      nestedMsg = body.message
    }

    const msg = nestedMsg ?? err.message
    return {
      message: msg,
      status: err.status,
      requestId: err.request_id ?? undefined,
      raw: body,
    }
  }
  if (err instanceof Error) {
    return { message: err.message }
  }
  return { message: String(err) }
}

/** Log + shape JSON for API responses so Vercel logs and clients see the real Claude error. */
export function chatErrorHttpPayload(err: unknown): {
  status: number
  json: Record<string, unknown>
} {
  const d = extractAnthropicErrorDetails(err)
  const status =
    typeof d.status === 'number' && d.status >= 400 && d.status < 600
      ? d.status
      : 500

  console.error(
    '[chat] Claude API error',
    JSON.stringify({
      message: d.message,
      status: d.status,
      requestId: d.requestId,
    }),
  )

  return {
    status,
    json: {
      error: 'Request to Claude failed',
      anthropicMessage: d.message,
      ...(d.requestId ? { requestId: d.requestId } : {}),
    },
  }
}
