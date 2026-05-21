import { z } from 'zod'

export const TONE_OPTIONS = [
  'professional',
  'casual',
  'humorous',
  'inspirational',
] as const

export type Tone = (typeof TONE_OPTIONS)[number]

export const GenerationResultSchema = z.object({
  tiktokScript: z.string(),
  instagramPost: z.string(),
  hashtags: z.string(),
})

export type GenerationResult = z.infer<typeof GenerationResultSchema>
