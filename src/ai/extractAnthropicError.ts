import { APIError } from '@anthropic-ai/sdk'

/**
 * `instanceof APIError` can fail on Vercel if the bundler duplicates @anthropic-ai/sdk
 * (thrown error is from a different copy than our import). Use duck typing as fallback.
 */
function pickStatus(err: unknown): number | undefined {
  if (err instanceof APIError && typeof err.status === 'number') {
    return err.status
  }
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status
    if (typeof s === 'number' && s >= 400 && s < 600) return s
  }
  return undefined
}

/** Anthropic error bodies look like `{ type: 'error', error: { type, message } }`. */
function messageFromAnthropicBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || body === null) return undefined
  const b = body as Record<string, unknown>
  if (b.error && typeof b.error === 'object' && b.error !== null) {
    const inner = b.error as Record<string, unknown>
    if (typeof inner.message === 'string') return inner.message
  }
  if (typeof b.message === 'string') return b.message
  return undefined
}

/**
 * Pull a readable message from Anthropic SDK errors (nested JSON bodies).
 */
export function extractAnthropicErrorDetails(err: unknown): {
  message: string
  status?: number
  requestId?: string
  raw?: unknown
  errorName?: string
} {
  const status = pickStatus(err)
  const errorName =
    err && typeof err === 'object' && err !== null && 'constructor' in err
      ? (err as Error).constructor?.name
      : typeof err

  if (err instanceof APIError) {
    const body = err.error as Record<string, unknown> | undefined
    const nestedMsg = messageFromAnthropicBody(body)
    const msg = nestedMsg ?? err.message
    return {
      message: msg,
      status,
      requestId: err.request_id ?? undefined,
      raw: body,
      errorName,
    }
  }

  /* Same shape as APIError but instanceof failed (duplicate SDK bundle). Expect .status + .error body. */
  if (
    err &&
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'error' in err
  ) {
    const e = err as Record<string, unknown>
    const nestedMsg = messageFromAnthropicBody(e.error)
    const msg =
      nestedMsg ??
      (typeof e.message === 'string' ? e.message : JSON.stringify(e))
    let requestId: string | undefined
    if (typeof e.request_id === 'string') requestId = e.request_id
    return {
      message: msg,
      status,
      requestId,
      errorName,
    }
  }

  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message)
    let requestId: string | undefined
    if ('request_id' in err && typeof (err as { request_id: unknown }).request_id === 'string') {
      requestId = (err as { request_id: string }).request_id
    }
    return {
      message: msg,
      status,
      requestId,
      errorName,
    }
  }

  if (err instanceof Error) {
    return { message: err.message, status, errorName }
  }
  return { message: String(err), status, errorName }
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
      errorName: d.errorName,
      instanceofAPIError: err instanceof APIError,
    }),
  )

  return {
    status,
    json: {
      error: 'Request to Claude failed',
      anthropicMessage: d.message,
      ...(d.requestId ? { requestId: d.requestId } : {}),
      ...(d.errorName ? { errorType: d.errorName } : {}),
    },
  }
}
