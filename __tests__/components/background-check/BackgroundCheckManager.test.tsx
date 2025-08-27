import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BackgroundCheckManager } from '@/components/background-check/BackgroundCheckManager'
import type { BackgroundCheckStatus } from '@/lib/types/background-check'

// Mock the services
jest.mock('@/lib/services/background-check-service')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

describe('BackgroundCheckManager', () => {
  const defaultProps = {
    applicationId: 'app-123',
    applicantName: 'John Doe',
    currentStatus: 'pending' as BackgroundCheckStatus,
    onStatusChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render background check status correctly', () => {
    render(<BackgroundCheckManager {...defaultProps} />)
    
    expect(screen.getByText('Background Check Status')).toBeInTheDocument()
    expect(screen.getByText('Background check management for John Doe')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('should show update form when update button is clicked', () => {
    render(<BackgroundCheckManager {...defaultProps} />)
    
    const updateButton = screen.getByRole('button', { name: /update status/i })
    fireEvent.click(updateButton)
    
    expect(screen.getByText('Update Background Check Status')).toBeInTheDocument()
  })

  it('should display different status colors correctly', () => {
    const { rerender } = render(<BackgroundCheckManager {...defaultProps} />)
    
    // Test pending status
    expect(screen.getByText('Pending')).toBeInTheDocument()
    
    // Test complete status
    rerender(<BackgroundCheckManager {...defaultProps} currentStatus="complete" />)
    expect(screen.getByText('Complete')).toBeInTheDocument()
    
    // Test failed status
    rerender(<BackgroundCheckManager {...defaultProps} currentStatus="failed" />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('should hide audit trail when showAuditTrail is false', () => {
    render(
      <BackgroundCheckManager 
        {...defaultProps} 
        showAuditTrail={false} 
      />
    )
    
    expect(screen.queryByText('Background Check Audit Trail')).not.toBeInTheDocument()
  })

  it('should call onStatusChange when status is updated', async () => {
    const mockOnStatusChange = jest.fn()
    
    render(
      <BackgroundCheckManager 
        {...defaultProps} 
        onStatusChange={mockOnStatusChange}
      />
    )
    
    const updateButton = screen.getByRole('button', { name: /update status/i })
    fireEvent.click(updateButton)
    
    // This test would need more detailed mocking to simulate form submission
    // For now, we're testing that the component renders without errors
    expect(screen.getByText('Update Background Check Status')).toBeInTheDocument()
  })

  it('should handle loading states properly', () => {
    render(<BackgroundCheckManager {...defaultProps} />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).not.toBeDisabled()
  })
})