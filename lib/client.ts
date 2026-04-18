import Anthropic from '@anthropic-ai/sdk'
import type {
  ImageBlockParam,
  MessageParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/messages'
import { getAnthropicApiKey, getAnthropicModel } from './env.js'
import { FOOTBALL_ATHLETE_SYSTEM_PROMPT } from './prompts/system.js'

function createClient(): Anthropic {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is missing. Add it in Vercel → Settings → Environment Variables (Production), then redeploy.',
    )
  }
  return new Anthropic({ apiKey })
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type UserBlock = TextBlockParam | ImageBlockParam

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
 * @param priorMessages Prior turns as plain text (no file blocks in history).
 * @param lastUserContent Final user turn: plain string or multimodal blocks.
 */
export async function chatWithClaude(
  priorMessages: ChatMessage[],
  lastUserContent: string | UserBlock[],
  athleteContext?: string,
): Promise<string> {
  const system = athleteContext
    ? `${FOOTBALL_ATHLETE_SYSTEM_PROMPT}\n\n## Athlete Context\n${athleteContext}`
    : FOOTBALL_ATHLETE_SYSTEM_PROMPT

  const prior = dropLeadingAssistantTurns(priorMessages).map(
    (m): MessageParam => ({
      role: m.role,
      content:
        typeof m.content === 'string' ? m.content : String(m.content ?? ''),
    }),
  )

  const lastUser: MessageParam = {
    role: 'user',
    content: lastUserContent,
  }

  const forApi: MessageParam[] = [...prior, lastUser]

  if (forApi.length === 0 || forApi[forApi.length - 1].role !== 'user') {
    throw new Error('Invalid conversation: expected a user message to send.')
  }

  const model = getAnthropicModel()

  console.error(
    '[chatWithClaude] calling messages.create',
    JSON.stringify({
      model,
      turns: forApi.length,
      systemChars: system.length,
      lastMultimodal: Array.isArray(lastUserContent),
    }),
  )

  const response = await createClient().messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: forApi,
  })

  console.error(
    '[chatWithClaude] messages.create ok',
    JSON.stringify({
      stopReason: response.stop_reason,
      contentBlocks: response.content?.length ?? 0,
    }),
  )

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return 'Sorry, I had trouble generating a response. Try again.'
  }

  return textBlock.text
}
