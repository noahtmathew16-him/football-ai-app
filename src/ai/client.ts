import Anthropic from '@anthropic-ai/sdk'
import { FOOTBALL_ATHLETE_SYSTEM_PROMPT } from './prompts/system.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return 'Sorry, I had trouble generating a response. Try again.'
  }

  return textBlock.text
}
