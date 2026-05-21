import { useState } from 'react'
import type { Tone } from '../types/generation'
import { TONE_OPTIONS } from '../types/generation'

interface GeneratorFormProps {
  onGenerate: (topic: string, tone: Tone) => void
  disabled: boolean
  error?: string
  onReset: () => void
}

const TONE_LABELS: Record<Tone, string> = {
  professional: 'Professional',
  casual: 'Casual',
  humorous: 'Humorous',
  inspirational: 'Inspirational',
}

export function GeneratorForm({
  onGenerate,
  disabled,
  error,
  onReset,
}: GeneratorFormProps) {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<Tone>(TONE_OPTIONS[0])
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
    if (error) onReset()
  }

  const handleToneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTone(e.target.value as Tone)
    if (error) onReset()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!topic.trim()) {
      setValidationError('Topic is required')
      return
    }

    if (topic.length > 200) {
      setValidationError('Topic must be 200 characters or fewer')
      return
    }

    onGenerate(topic, tone)
  }

  const displayError = validationError || error

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      <div>
        <label htmlFor="topic" className="mb-1 block text-sm font-medium">
          Topic
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={handleTopicChange}
          disabled={disabled}
          aria-describedby={displayError ? 'form-error' : undefined}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
          placeholder="Enter your topic..."
        />
        {validationError && (
          <p id="form-error" role="alert" className="mt-1 text-sm text-red-600">
            {validationError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="tone" className="mb-1 block text-sm font-medium">
          Tone
        </label>
        <select
          id="tone"
          value={tone}
          onChange={handleToneChange}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-50"
        >
          {TONE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {TONE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {!validationError && error && (
        <div
          id="form-error"
          role="alert"
          aria-describedby="form-error"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {disabled ? 'Generating…' : 'Generate'}
      </button>
    </form>
  )
}
