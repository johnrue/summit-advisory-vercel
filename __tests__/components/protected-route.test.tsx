import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from '@/components/auth/protected-route'

// Mock the auth context
const mockUser = {
  id: '1',
  email: 'test@example.com',
  user_metadata: { role: 'admin' }
}

// Mock the useAuth hook
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
    loading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('shows loading state when loading', () => {
    const { useAuth } = require('@/lib/auth/auth-context')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Should show loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })
})