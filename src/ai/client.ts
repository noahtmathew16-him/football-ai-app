import Anthropic from '@anthropic-ai/sdk'
import { FOOTBALL_ATHLETE_SYSTEM_PROMPT } from './prompts/system.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
})

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Anthropic requires the first message to be from the user. UI history may start
 * with an assistant greeting — strip leading assistant turns before the API call.
 */
function dropLeadingAssistantTurns(messages: ChatMessage[]): ChatMessage[] {
  let start = 0
  while (start < messages.length && messages[start].role === 'assistant') {
    start++
  }
  return messages.slice(start)
}

/**
 * Send a message to Claude and get a response.
 * Uses the Football Athlete AI system prompt.
 */
export async function chatWithClaude(
  messages: ChatMessage[],
  athleteContext?: string
): Promise<string> {
  const system = athleteContext
    ? `${FOOTBALL_ATHLETE_SYSTEM_PROMPT}\n\n## Athlete Context\n${athleteContext}`
    : FOOTBALL_ATHLETE_SYSTEM_PROMPT

  const forApi = dropLeadingAssistantTurns(messages).map((m) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
  }))

  if (forApi.length === 0 || forApi[forApi.length - 1].role !== 'user') {
    throw new Error('Invalid conversation: expected a user message to send.')
  }

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6'

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: forApi,
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return 'Sorry, I had trouble generating a response. Try again.'
  }

  return textBlock.text
}
