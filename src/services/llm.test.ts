import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createLLMService } from './llm'

const { mockCreate, MockAPIConnectionError } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  class MockAPIConnectionError extends Error {
    constructor(message?: string) {
      super(message ?? 'Connection error')
      this.name = 'APIConnectionError'
    }
  }
  return { mockCreate, MockAPIConnectionError }
})

vi.mock('openai', () => ({
  default: vi.fn(function () {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }
  }),
  APIConnectionError: MockAPIConnectionError,
}))

describe('createLLMService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    mockCreate.mockReset()
  })

  describe('with valid API key', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
    })

    it('returns parsed GenerationResult on valid JSON', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tiktokScript: 'TikTok script content',
                instagramPost: 'Instagram post content',
                hashtags: '#tag1, #tag2, #tag3',
              }),
            },
          },
        ],
      })

      const service = createLLMService()
      const result = await service.generateContent([
        { role: 'user', content: 'test topic' },
      ])

      expect(result).toEqual({
        tiktokScript: 'TikTok script content',
        instagramPost: 'Instagram post content',
        hashtags: '#tag1, #tag2, #tag3',
      })
    })

    it('throws Invalid response format on malformed JSON', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{invalid json}' } }],
      })

      const service = createLLMService()
      await expect(
        service.generateContent([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('Invalid response format. Please try again.')
    })

    it('throws Invalid response format on Zod mismatch', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ tiktokScript: 'only field' }),
            },
          },
        ],
      })

      const service = createLLMService()
      await expect(
        service.generateContent([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('Invalid response format. Please try again.')
    })

    it('throws Network error on APIConnectionError', async () => {
      mockCreate.mockRejectedValue(
        new MockAPIConnectionError('Connection failed'),
      )

      const service = createLLMService()
      await expect(
        service.generateContent([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('Network error. Check your connection.')
    })

    it('re-throws AbortError', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockCreate.mockRejectedValue(abortError)

      const service = createLLMService()
      await expect(
        service.generateContent([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('The operation was aborted')
    })
  })

  describe('without API key', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_GROQ_API_KEY', '')
    })

    it('stub rejects immediately without calling the API', async () => {
      const service = createLLMService()
      await expect(
        service.generateContent([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('API key not configured.')
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })
})
