import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

// Mock TanStack Router's Link component to avoid needing a full router context
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className, ...props }: Record<string, unknown>) => (
    <a href={to as string} className={className as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}))

describe('Button', () => {
  it('renders as a button by default (no href)', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('renders as a link when href is provided', () => {
    render(<Button href="/somewhere">Go</Button>)
    const link = screen.getByRole('link', { name: 'Go' })
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe('A')
  })

  it('applies solid variant classes by default', () => {
    render(<Button>Solid</Button>)
    const button = screen.getByRole('button', { name: 'Solid' })
    // Solid variant has shadow-md and gradient classes
    expect(button.className).toContain('shadow-md')
    expect(button.className).toContain('from-accent-400')
  })

  it('applies outline variant classes when variant="outline"', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button', { name: 'Outline' })
    // Outline variant has border-2 and no shadow-md
    expect(button.className).toContain('border-2')
    expect(button.className).toContain('border-accent-400')
    expect(button.className).not.toContain('shadow-md')
  })
})
