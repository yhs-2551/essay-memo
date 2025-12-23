import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MemoPage from '../app/memos/page'

// Mock dependencies
vi.mock('@/components/background', () => ({
  Background: () => <div data-testid="background" />
}))
vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark' })
}))
// Mock fetch
global.fetch = vi.fn()

describe('MemoPage', () => {
  it('renders the memo page', () => {
    render(<MemoPage />)
    expect(screen.getByText('Quick Memos')).toBeDefined()
    expect(screen.getByPlaceholderText('Capture your thought...')).toBeDefined()
  })

  it('allows creating a new memo', async () => {
    render(<MemoPage />)
    const input = screen.getByPlaceholderText('Capture your thought...')
    const button = screen.getByText('Save')

    fireEvent.change(input, { target: { value: 'New Test Memo' } })
    fireEvent.click(button)

    expect(global.fetch).toHaveBeenCalledWith('/api/memos', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ content: 'New Test Memo' })
    }))
  })
})
