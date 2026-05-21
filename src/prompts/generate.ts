import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Tone } from '../types/generation'

export function buildGeneratePrompt(
  topic: string,
  tone: Tone,
): ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content: `You are a social media content creator. Given a topic and a tone, generate platform-optimized content for TikTok and Instagram.

Respond with valid JSON using this exact schema:
{
  "tiktokScript": "string — a 30-60 second TikTok script with hooks, body, and CTA in the requested tone",
  "instagramPost": "string — an Instagram caption optimized for engagement in the requested tone",
  "hashtags": "string — a comma-separated list of 5-10 relevant hashtags"
}`,
    },
    {
      role: 'user',
      content: `Topic: ${topic}\nTone: ${tone}`,
    },
  ]
}
