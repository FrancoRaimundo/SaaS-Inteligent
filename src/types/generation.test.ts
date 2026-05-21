import { describe, it, expect } from 'vitest'
import { TONE_OPTIONS, GenerationResultSchema } from './generation'

describe('TONE_OPTIONS', () => {
  it('has 4 entries', () => {
    expect(TONE_OPTIONS).toHaveLength(4)
  })

  it('contains expected values', () => {
    expect(TONE_OPTIONS).toEqual([
      'professional',
      'casual',
      'humorous',
      'inspirational',
    ])
  })
})

describe('GenerationResultSchema', () => {
  it('parses a valid object', () => {
    const result = GenerationResultSchema.parse({
      tiktokScript: 'A 30-second TikTok script with hook and CTA',
      instagramPost: 'An Instagram caption with engaging text',
      hashtags: '#skincare, #beauty, #tips',
    })

    expect(result).toEqual({
      tiktokScript: 'A 30-second TikTok script with hook and CTA',
      instagramPost: 'An Instagram caption with engaging text',
      hashtags: '#skincare, #beauty, #tips',
    })
  })

  it('rejects missing tiktokScript', () => {
    expect(() =>
      GenerationResultSchema.parse({
        instagramPost: 'post',
        hashtags: '#tag',
      }),
    ).toThrow()
  })

  it('rejects missing instagramPost', () => {
    expect(() =>
      GenerationResultSchema.parse({
        tiktokScript: 'script',
        hashtags: '#tag',
      }),
    ).toThrow()
  })

  it('rejects missing hashtags', () => {
    expect(() =>
      GenerationResultSchema.parse({
        tiktokScript: 'script',
        instagramPost: 'post',
      }),
    ).toThrow()
  })

  it('strips extra properties (Zod default behavior)', () => {
    const result = GenerationResultSchema.parse({
      tiktokScript: 'script',
      instagramPost: 'post',
      hashtags: '#tag',
      extraField: 'should be stripped',
    })

    expect(result).toEqual({
      tiktokScript: 'script',
      instagramPost: 'post',
      hashtags: '#tag',
    })
    // @ts-expect-error — extraField is stripped, not in type
    expect(result.extraField).toBeUndefined()
  })
})
