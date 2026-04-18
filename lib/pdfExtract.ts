/**
 * Lazy-load pdf-parse so builds work if optional dependency is missing.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod = await import('pdf-parse')
  const pdfParse = mod.default as (b: Buffer) => Promise<{ text?: string }>
  const data = await pdfParse(buffer)
  return (data.text ?? '').trim()
}
