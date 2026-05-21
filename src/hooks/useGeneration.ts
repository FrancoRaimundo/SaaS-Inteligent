import { useReducer, useRef, useEffect } from 'react'
import type { GenerationResult, Tone } from '../types/generation'
import { createLLMService } from '../services/llm'
import { buildGeneratePrompt } from '../prompts/generate'

export type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: GenerationResult }
  | { status: 'error'; message: string }

type Action =
  | { type: 'GENERATE' }
  | { type: 'SUCCESS'; data: GenerationResult }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GENERATE':
      if (state.status === 'loading') return state
      return { status: 'loading' }
    case 'SUCCESS':
      if (state.status !== 'loading') return state
      return { status: 'success', data: action.data }
    case 'ERROR':
      return { status: 'error', message: action.message }
    case 'RESET':
      return { status: 'idle' }
  }
}

export function useGeneration() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const serviceRef = useRef(createLLMService())
  const loadingRef = useRef(false)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const generate = async (topic: string, tone: Tone): Promise<void> => {
    if (loadingRef.current) return

    if (!topic.trim()) {
      dispatch({ type: 'ERROR', message: 'Topic is required' })
      return
    }

    if (topic.length > 200) {
      dispatch({
        type: 'ERROR',
        message: 'Topic must be 200 characters or fewer',
      })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    loadingRef.current = true

    dispatch({ type: 'GENERATE' })

    try {
      const prompt = buildGeneratePrompt(topic, tone)
      const result = await serviceRef.current.generateContent(
        prompt,
        controller.signal,
      )
      loadingRef.current = false
      dispatch({ type: 'SUCCESS', data: result })
    } catch (error) {
      loadingRef.current = false
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred'
      dispatch({ type: 'ERROR', message })
    }
  }

  const reset = () => {
    loadingRef.current = false
    dispatch({ type: 'RESET' })
  }

  return { state, generate, reset }
}
