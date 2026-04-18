import type { TopicDomain } from './conversationTypes.js'

const FOOTBALL = /\b(practice|game|film|route|lift|conditioning|cleat|turf|snap|quarterback|receiver|lineman|defense|offense|special teams|sprint|drill|coach|training|recovery|hydrat|protein|sleep before game)\b/i
const ACADEMICS = /\b(homework|exam|test|quiz|gpa|study|class|teacher|assignment|essay|math|english|science|history|college|sat|act|period)\b/i
const LIFE = /\b(stress|anxiety|routine|calendar|goal|habit|sleep schedule|mental|family|time management|organiz)\b/i

export function inferTopicFromText(text: string): TopicDomain {
  const t = text.toLowerCase()
  let f = 0
  let a = 0
  let l = 0
  if (FOOTBALL.test(t)) f++
  if (ACADEMICS.test(t)) a++
  if (LIFE.test(t)) l++
  const max = Math.max(f, a, l)
  if (max === 0) return 'mixed'
  const hits = [f, a, l].filter((x) => x === max).length
  if (hits > 1) return 'mixed'
  if (f === max) return 'football'
  if (a === max) return 'academics'
  return 'life'
}
