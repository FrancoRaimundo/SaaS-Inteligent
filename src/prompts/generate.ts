import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Tone } from '../types/generation'

const SYSTEM_PROMPT = `You are a social media content creator. Given a topic and a tone, generate platform-optimized content for TikTok and Instagram.

You MUST respond with valid JSON only, no other text. Use this exact JSON structure:
{
  "tiktokScript": "a 30-60 second TikTok script with hooks, body, and CTA in the requested tone",
  "instagramPost": "an Instagram caption optimized for engagement in the requested tone",
  "hashtags": "a comma-separated list of 5-10 relevant hashtags"
}`

export function buildGeneratePrompt(
  topic: string,
  tone: Tone,
): ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Topic: ${topic}\nTone: ${tone}` },
  ]
}
