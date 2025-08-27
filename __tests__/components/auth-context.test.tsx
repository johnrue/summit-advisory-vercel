import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/lib/auth/auth-context'
import { act } from '@testing-library/react'

// Mock Supabase client - must be declared before the mock
const mockSignIn = jest.fn()
const mockSignOut = jest.fn()
const mockGetSession = jest.fn()
const mockOnAuthStateChange = jest.fn()

// Test component that uses the auth context
function TestComponent() {
  const { user, loading, signIn, signOut } = useAuth()

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.email}` : 'Not logged in'}
      </div>
      <button onClick={() => signIn('test@example.com', 'password')}>
        Sign In
      </button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}

jest.mock('@/lib/auth/supabase', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}))

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null
    })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  })

  it('should provide initial loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should show not logged in when no session', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in')
    })
  })

  it('should show logged in user when session exists', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      user_metadata: { role: 'admin' }
    }

    mockGetSession.mockResolvedValue({
      data: { 
        session: { 
          user: mockUser,
          access_token: 'token'
        } 
      },
      error: null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com')
    })
  })

  it('should handle sign in', async () => {
    mockSignIn.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    act(() => {
      screen.getByText('Sign In').click()
    })

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })
  })

  it('should handle sign out', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    act(() => {
      screen.getByText('Sign Out').click()
    })

    expect(mockSignOut).toHaveBeenCalled()
  })
})