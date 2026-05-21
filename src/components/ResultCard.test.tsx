import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultCard } from './ResultCard'

const { mockCopyToClipboard } = vi.hoisted(() => ({
  mockCopyToClipboard: vi.fn(),
}))

vi.mock('../utils/clipboard', () => ({
  copyToClipboard: mockCopyToClipboard,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('ResultCard', () => {
  it('renders label and content correctly', () => {
    render(<ResultCard label="TikTok Script" content="Some content" />)

    expect(screen.getByText('TikTok Script')).toBeInTheDocument()
    expect(screen.getByText('Some content')).toBeInTheDocument()
  })

  it('copies content and shows Copied! on success', async () => {
    mockCopyToClipboard.mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<ResultCard label="TikTok Script" content="Content to copy" />)

    await user.click(
      screen.getByRole('button', { name: 'Copy TikTok Script' }),
    )

    expect(mockCopyToClipboard).toHaveBeenCalledWith('Content to copy')
    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })

  it('shows fallback when clipboard API rejects', async () => {
    mockCopyToClipboard.mockRejectedValue(new Error('Clipboard error'))

    const user = userEvent.setup()
    render(<ResultCard label="TikTok Script" content="Content to copy" />)

    await user.click(
      screen.getByRole('button', { name: 'Copy TikTok Script' }),
    )

    expect(
      screen.getByText('Could not copy. Select the text manually.'),
    ).toBeInTheDocument()
  })

  it('shows fallback when clipboard is unavailable', async () => {
    mockCopyToClipboard.mockRejectedValue(
      new Error('Clipboard API not available'),
    )

    const user = userEvent.setup()
    render(<ResultCard label="TikTok Script" content="Content" />)

    await user.click(
      screen.getByRole('button', { name: 'Copy TikTok Script' }),
    )

    expect(
      screen.getByText('Could not copy. Select the text manually.'),
    ).toBeInTheDocument()
  })
})
