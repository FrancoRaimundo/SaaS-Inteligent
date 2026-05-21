import OpenAI, { APIConnectionError } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { ZodError } from 'zod'
import { GenerationResultSchema } from '../types/generation'
import type { GenerationResult } from '../types/generation'

interface LLMService {
  generateContent(
    messages: ChatCompletionMessageParam[],
    signal?: AbortSignal,
  ): Promise<GenerationResult>
}

const JSON_SCHEMA = {
  name: 'generated_content',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      tiktokScript: { type: 'string' },
      instagramPost: { type: 'string' },
      hashtags: { type: 'string' },
    },
    required: ['tiktokScript', 'instagramPost', 'hashtags'],
    additionalProperties: false,
  },
} as const

export function createLLMService(): LLMService {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    return {
      generateContent: () =>
        Promise.reject(new Error('OpenAI API key not configured.')),
    }
  }

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  return {
    async generateContent(messages, signal) {
      try {
        const response = await client.chat.completions.create(
          {
            model: 'gpt-4o-mini',
            messages,
            response_format: {
              type: 'json_schema',
              json_schema: JSON_SCHEMA,
            },
          },
          { signal },
        )

        const content = response.choices[0]?.message?.content
        if (!content) {
          throw new Error('Empty response from LLM.')
        }

        const parsed = JSON.parse(content)
        return GenerationResultSchema.parse(parsed)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }

        if (error instanceof APIConnectionError) {
          throw new Error('Network error. Check your connection.', {
            cause: error,
          })
        }

        if (error instanceof SyntaxError || error instanceof ZodError) {
          throw new Error('Invalid response format. Please try again.', {
            cause: error,
          })
        }

        throw error
      }
    },
  }
}
