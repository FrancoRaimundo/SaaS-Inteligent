import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GeneratorForm } from './GeneratorForm'
import type { Tone } from '../types/generation'

describe('GeneratorForm', () => {
  it('calls onGenerate with values on valid submit', async () => {
    const onGenerate = vi.fn()
    const onReset = vi.fn()
    const user = userEvent.setup()

    render(
      <GeneratorForm
        onGenerate={onGenerate}
        disabled={false}
        onReset={onReset}
      />,
    )

    await user.type(screen.getByLabelText('Topic'), 'Summer skincare routine')
    await user.selectOptions(screen.getByLabelText('Tone'), 'casual')
    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(onGenerate).toHaveBeenCalledWith(
      'Summer skincare routine',
      'casual' satisfies Tone,
    )
  })

  it('shows validation error for empty topic', async () => {
    const onGenerate = vi.fn()
    const onReset = vi.fn()
    const user = userEvent.setup()

    render(
      <GeneratorForm
        onGenerate={onGenerate}
        disabled={false}
        onReset={onReset}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Topic is required')
    expect(onGenerate).not.toHaveBeenCalled()
  })

  it('shows validation error for topic > 200 chars', async () => {
    const onGenerate = vi.fn()
    const onReset = vi.fn()
    const user = userEvent.setup()

    render(
      <GeneratorForm
        onGenerate={onGenerate}
        disabled={false}
        onReset={onReset}
      />,
    )

    const input = screen.getByLabelText('Topic')
    fireEvent.change(input, { target: { value: 'x'.repeat(201) } })
    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Topic must be 200 characters or fewer',
    )
    expect(onGenerate).not.toHaveBeenCalled()
  })

  it('disables inputs and shows Generating… when disabled', () => {
    const onGenerate = vi.fn()
    const onReset = vi.fn()

    render(
      <GeneratorForm
        onGenerate={onGenerate}
        disabled={true}
        onReset={onReset}
      />,
    )

    expect(screen.getByLabelText('Topic')).toBeDisabled()
    expect(screen.getByLabelText('Tone')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Generating…' }),
    ).toBeDisabled()
  })

  it('shows error banner when error prop is set', () => {
    const onGenerate = vi.fn()
    const onReset = vi.fn()

    render(
      <GeneratorForm
        onGenerate={onGenerate}
        disabled={false}
        error="Something went wrong"
        onReset={onReset}
      />,
    )

    const alerts = screen.getAllByRole('alert')
    expect(alerts.some((a) => a.textContent === 'Something went wrong')).toBe(
      true,
    )
  })

  it('calls onReset when input changes while in error state', async () => {
    const onGenerate = vi.fn()
    const onReset = vi.fn()
    const user = userEvent.setup()

    render(
      <GeneratorForm
        onGenerate={onGenerate}
        disabled={false}
        error="Error"
        onReset={onReset}
      />,
    )

    const input = screen.getByLabelText('Topic')
    await user.type(input, 'a')

    expect(onReset).toHaveBeenCalled()
  })
})
