import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultsPanel } from './ResultsPanel'

const mockResult = {
  tiktokScript: 'TikTok script content',
  instagramPost: 'Instagram post content',
  hashtags: '#tag1, #tag2',
}

describe('ResultsPanel', () => {
  it('renders 3 cards with correct labels', () => {
    render(<ResultsPanel result={mockResult} />)

    expect(screen.getByText('TikTok Script')).toBeInTheDocument()
    expect(screen.getByText('Instagram Post')).toBeInTheDocument()
    expect(screen.getByText('Hashtags')).toBeInTheDocument()
  })

  it('displays corresponding content for each card', () => {
    render(<ResultsPanel result={mockResult} />)

    expect(screen.getByText('TikTok script content')).toBeInTheDocument()
    expect(screen.getByText('Instagram post content')).toBeInTheDocument()
    expect(screen.getByText('#tag1, #tag2')).toBeInTheDocument()
  })

  it('renders with empty strings without crashing', () => {
    const emptyResult = {
      tiktokScript: '',
      instagramPost: '',
      hashtags: '',
    }

    render(<ResultsPanel result={emptyResult} />)

    expect(screen.getByText('TikTok Script')).toBeInTheDocument()
    expect(screen.getByText('Instagram Post')).toBeInTheDocument()
    expect(screen.getByText('Hashtags')).toBeInTheDocument()
  })

  it('has aria-live="polite" on container', () => {
    const { container } = render(<ResultsPanel result={mockResult} />)

    const panel = container.querySelector('[aria-live="polite"]')
    expect(panel).toBeInTheDocument()
  })
})
