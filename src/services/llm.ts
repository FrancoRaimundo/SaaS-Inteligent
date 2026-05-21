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

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export function createLLMService(): LLMService {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey) {
    return {
      generateContent: () =>
        Promise.reject(new Error('API key not configured. Set VITE_GROQ_API_KEY in your .env file.')),
    }
  }

  const client = new OpenAI({
    apiKey,
    baseURL: GROQ_BASE_URL,
    dangerouslyAllowBrowser: true,
  })

  return {
    async generateContent(messages, signal) {
      try {
        const response = await client.chat.completions.create(
          {
            model: GROQ_MODEL,
            messages,
            response_format: { type: 'json_object' },
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
