import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/error-boundary'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { FormErrorBoundary } from '@/components/auth/form-error-boundary'

const ThrowError = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

const AuthError = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('auth session expired')
  }
  return <div>Auth working</div>
}

const FormError = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('validation failed for email field')
  }
  return <div>Form working</div>
}

// Suppress console.error for error boundary tests
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})
afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('should allow retry after error', () => {
    let shouldThrow = true
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Change the error condition
    shouldThrow = false

    // Click retry button
    fireEvent.click(screen.getByText('Try Again'))

    // Re-render the component
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    // The error boundary should have reset its state
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
      configurable: true
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
      configurable: true
    })
  })
})

describe('AuthErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <AuthErrorBoundary>
        <AuthError shouldThrow={false} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Auth working')).toBeInTheDocument()
  })

  it('should render auth-specific error UI for auth errors', () => {
    render(
      <AuthErrorBoundary>
        <AuthError shouldThrow={true} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Authentication Error')).toBeInTheDocument()
    expect(screen.getByText('There was a problem with your authentication session. Please sign in again.')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('should provide retry functionality', () => {
    render(
      <AuthErrorBoundary>
        <AuthError shouldThrow={true} />
      </AuthErrorBoundary>
    )

    expect(screen.getByText('Try Again')).toBeInTheDocument()
    
    // Click try again button
    fireEvent.click(screen.getByText('Try Again'))
    
    // Component should attempt to re-render (would need more complex test setup to verify full recovery)
  })
})

describe('FormErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <FormErrorBoundary>
        <FormError shouldThrow={false} />
      </FormErrorBoundary>
    )

    expect(screen.getByText('Form working')).toBeInTheDocument()
  })

  it('should render form-specific error UI for validation errors', () => {
    render(
      <FormErrorBoundary>
        <FormError shouldThrow={true} />
      </FormErrorBoundary>
    )

    expect(screen.getByText('Form Validation Error')).toBeInTheDocument()
    expect(screen.getByText('Please check that all required fields are filled out correctly.')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('should provide retry functionality for forms', () => {
    render(
      <FormErrorBoundary>
        <FormError shouldThrow={true} />
      </FormErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    // Component should attempt to re-render
  })
})

describe('Error boundary integration', () => {
  it('should handle nested error boundaries correctly', () => {
    render(
      <AuthErrorBoundary>
        <FormErrorBoundary>
          <AuthError shouldThrow={true} />
        </FormErrorBoundary>
      </AuthErrorBoundary>
    )

    // FormErrorBoundary catches the error first (since it's the inner boundary)
    // and shows a form error message, even though it's an auth error
    expect(screen.getByText('Form Error')).toBeInTheDocument()
  })

  it('should isolate errors to the appropriate boundary', () => {
    render(
      <div>
        <AuthErrorBoundary>
          <div data-testid="auth-section">
            <AuthError shouldThrow={true} />
          </div>
        </AuthErrorBoundary>
        <FormErrorBoundary>
          <div data-testid="form-section">
            <FormError shouldThrow={false} />
          </div>
        </FormErrorBoundary>
      </div>
    )

    // Auth error should not affect form section
    expect(screen.getByText('Authentication Error')).toBeInTheDocument()
    expect(screen.getByText('Form working')).toBeInTheDocument()
  })
})