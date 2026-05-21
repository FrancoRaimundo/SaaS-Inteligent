import { describe, it, expect } from 'vitest'
import { buildGeneratePrompt } from './generate'

describe('buildGeneratePrompt', () => {
  it('returns an array with system and user messages', () => {
    const messages = buildGeneratePrompt('test topic', 'casual')

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
  })

  it('includes the system prompt with content instructions', () => {
    const messages = buildGeneratePrompt('test', 'professional')

    expect(messages[0].content).toContain('TikTok')
    expect(messages[0].content).toContain('Instagram')
    expect(messages[0].content).toContain('JSON')
  })

  it('includes the topic in the user message', () => {
    const messages = buildGeneratePrompt('Summer skincare routine', 'casual')

    expect(messages[1].content).toContain('Summer skincare routine')
  })

  it('includes the tone in the user message', () => {
    const messages = buildGeneratePrompt('test', 'humorous')

    expect(messages[1].content).toContain('humorous')
  })

  it('handles topic with special characters', () => {
    const messages = buildGeneratePrompt(
      "Why you shouldn't use \"quotes\" in topics",
      'inspirational',
    )

    expect(messages[1].content).toContain("Why you shouldn't use")
  })

  it('handles empty topic string', () => {
    const messages = buildGeneratePrompt('', 'professional')

    expect(messages[1].content).toContain('Topic:')
    expect(messages[1].content).toContain('Tone: professional')
  })
})
