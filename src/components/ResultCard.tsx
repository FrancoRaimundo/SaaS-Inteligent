import { useState, useEffect, useRef } from 'react'
import { copyToClipboard } from '../utils/clipboard'

interface ResultCardProps {
  label: string
  content: string
}

export function ResultCard({ label, content }: ResultCardProps) {
  const [copied, setCopied] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)

    try {
      await copyToClipboard(content)
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setShowFallback(true)
      timerRef.current = setTimeout(() => setShowFallback(false), 2000)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 text-lg font-semibold">{label}</h3>
      <p className="mb-3 whitespace-pre-wrap text-sm text-gray-700">
        {content}
      </p>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={handleCopy}
        className="rounded bg-gray-100 px-3 py-1 text-sm transition-colors hover:bg-gray-200"
      >
        {copied
          ? 'Copied!'
          : showFallback
            ? 'Could not copy. Select the text manually.'
            : 'Copy'}
      </button>
    </div>
  )
}
