import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeneration } from './useGeneration'

const mockGenerateContent = vi.fn()

vi.mock('../services/llm', () => ({
  createLLMService: vi.fn(function () {
    return { generateContent: mockGenerateContent }
  }),
}))

describe('useGeneration', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    mockGenerateContent.mockReset()
  })

  it('initial state is idle', () => {
    const { result } = renderHook(() => useGeneration())

    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('transitions to success on valid API response', async () => {
    mockGenerateContent.mockResolvedValue({
      tiktokScript: 'test script',
      instagramPost: 'test post',
      hashtags: '#test',
    })

    const { result } = renderHook(() => useGeneration())

    await act(async () => {
      await result.current.generate('test topic', 'casual')
    })

    expect(result.current.state).toEqual({
      status: 'success',
      data: {
        tiktokScript: 'test script',
        instagramPost: 'test post',
        hashtags: '#test',
      },
    })
  })

  it('transitions to error on API failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API error'))

    const { result } = renderHook(() => useGeneration())

    await act(async () => {
      await result.current.generate('test topic', 'casual')
    })

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'API error',
    })
  })

  it('reset transitions from success to idle', async () => {
    mockGenerateContent.mockResolvedValue({
      tiktokScript: 's',
      instagramPost: 'p',
      hashtags: '#h',
    })

    const { result } = renderHook(() => useGeneration())

    await act(async () => {
      await result.current.generate('test', 'casual')
    })

    expect(result.current.state.status).toBe('success')

    act(() => {
      result.current.reset()
    })

    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('reset transitions from error to idle', async () => {
    mockGenerateContent.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useGeneration())

    await act(async () => {
      await result.current.generate('test', 'casual')
    })

    expect(result.current.state.status).toBe('error')

    act(() => {
      result.current.reset()
    })

    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('validates empty topic and does not call API', async () => {
    const { result } = renderHook(() => useGeneration())

    await act(async () => {
      await result.current.generate('  ', 'professional')
    })

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Topic is required',
    })
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('validates topic length > 200 and does not call API', async () => {
    const { result } = renderHook(() => useGeneration())
    const longTopic = 'x'.repeat(201)

    await act(async () => {
      await result.current.generate(longTopic, 'professional')
    })

    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Topic must be 200 characters or fewer',
    })
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('prevents double submission while loading', async () => {
    let resolvePromise: (v: unknown) => void = () => {}
    mockGenerateContent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve
        }),
    )

    const { result } = renderHook(() => useGeneration())

    // First call — starts loading
    act(() => {
      void result.current.generate('test', 'casual')
    })

    expect(result.current.state.status).toBe('loading')

    // Second call — should be silently ignored
    await act(async () => {
      await result.current.generate('another', 'humorous')
    })

    // Still loading (second GENERATE was ignored by reducer)
    expect(result.current.state.status).toBe('loading')

    // Resolve the first call
    await act(async () => {
      resolvePromise({
        tiktokScript: 's',
        instagramPost: 'p',
        hashtags: '#h',
      })
    })

    expect(result.current.state.status).toBe('success')
  })
})
