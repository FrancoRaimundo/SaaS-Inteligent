import type { GenerationResult } from '../types/generation'
import { ResultCard } from './ResultCard'

interface ResultsPanelProps {
  result: GenerationResult
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  return (
    <div
      aria-live="polite"
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      <ResultCard label="TikTok Script" content={result.tiktokScript} />
      <ResultCard label="Instagram Post" content={result.instagramPost} />
      <ResultCard label="Hashtags" content={result.hashtags} />
    </div>
  )
}
