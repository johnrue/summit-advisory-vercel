import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnifiedLeadGrid } from '@/components/dashboard/leads/unified/UnifiedLeadGrid'
import { UnifiedLead } from '@/lib/types/unified-leads'

// Mock the child components
jest.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid={`loading-spinner-${size}`}>Loading...</div>
  )
}))

describe('UnifiedLeadGrid', () => {
  const mockLeads: UnifiedLead[] = [
    {
      id: 'client-1',
      type: 'client',
      status: 'new',
      source: 'website',
      priority: 'high',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      estimatedValue: 50000,
      clientInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0001',
        companyName: 'Test Corp',
        serviceType: 'patrol'
      },
      sourceAttribution: {
        originalSource: 'website',
        sourceDetails: {}
      },
      conversionMetrics: {
        contactCount: 0
      },
      engagementScore: 50,
      responseTime: 24
    },
    {
      id: 'guard-1',
      type: 'guard',
      status: 'contacted',
      source: 'referral',
      priority: 'medium',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      guardInfo: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-0002',
        hasSecurityExperience: true,
        hasLicense: true,
        preferredShifts: ['day'],
        preferredLocations: ['downtown'],
        availability: {
          fullTime: true,
          partTime: false,
          weekdays: true,
          weekends: false,
          nights: false,
          holidays: false
        },
        transportationAvailable: true
      },
      sourceAttribution: {
        originalSource: 'referral',
        sourceDetails: {}
      },
      conversionMetrics: {
        contactCount: 0
      },
      engagementScore: 70,
      responseTime: 12
    }
  ]

  const defaultProps = {
    leads: mockLeads,
    isLoading: false,
    error: null,
    onRefresh: jest.fn(),
    onLeadClick: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render leads in grid format', () => {
    render(<UnifiedLeadGrid {...defaultProps} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Test Corp')).toBeInTheDocument()
    expect(screen.getByText('client lead')).toBeInTheDocument()
    expect(screen.getByText('guard lead')).toBeInTheDocument()
  })

  it('should display loading state', () => {
    render(<UnifiedLeadGrid {...defaultProps} isLoading={true} />)

    expect(screen.getByTestId('loading-spinner-lg')).toBeInTheDocument()
    expect(screen.getByText('Loading leads...')).toBeInTheDocument()
  })

  it('should display error state', () => {
    const error = 'Failed to load leads'
    render(<UnifiedLeadGrid {...defaultProps} error={error} />)

    expect(screen.getByText('Error loading leads')).toBeInTheDocument()
    expect(screen.getByText('Failed to load leads')).toBeInTheDocument()
  })

  it('should display empty state when no leads', () => {
    render(<UnifiedLeadGrid {...defaultProps} leads={[]} />)

    expect(screen.getByText('No leads found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your filters or create a new lead')).toBeInTheDocument()
  })

  it('should call onLeadClick when lead is clicked', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeadGrid {...defaultProps} />)

    const leadCard = screen.getByText('John Doe').closest('[data-testid=\"lead-card\"]')
    expect(leadCard).toBeInTheDocument()

    if (leadCard) {
      await user.click(leadCard)
      expect(defaultProps.onLeadClick).toHaveBeenCalledWith(mockLeads[0])
    }
  })

  it('should call onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeadGrid {...defaultProps} error="Test error" />)

    const refreshButton = screen.getByRole('button', { name: /retry/i })
    await user.click(refreshButton)

    expect(defaultProps.onRefresh).toHaveBeenCalled()
  })

  it('should display priority badges correctly', () => {
    render(<UnifiedLeadGrid {...defaultProps} />)

    expect(screen.getByText('high priority')).toBeInTheDocument()
    expect(screen.getByText('medium priority')).toBeInTheDocument()
  })

  it('should display status badges correctly', () => {
    render(<UnifiedLeadGrid {...defaultProps} />)

    expect(screen.getByText('new')).toBeInTheDocument()
    expect(screen.getByText('contacted')).toBeInTheDocument()
  })

  it('should display estimated value for client leads', () => {
    render(<UnifiedLeadGrid {...defaultProps} />)

    expect(screen.getByText('$50,000')).toBeInTheDocument()
  })

  it('should display experience level for guard leads', () => {
    render(<UnifiedLeadGrid {...defaultProps} />)

    expect(screen.getByText('Senior Experience')).toBeInTheDocument()
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeadGrid {...defaultProps} />)

    const firstLead = screen.getByText('John Doe').closest('[data-testid=\"lead-card\"]')
    
    if (firstLead) {
      (firstLead as HTMLElement).focus()
      await user.keyboard('{Enter}')
      expect(defaultProps.onLeadClick).toHaveBeenCalledWith(mockLeads[0])
    }
  })

  it('should display creation date', () => {
    render(<UnifiedLeadGrid {...defaultProps} />)

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 2, 2024')).toBeInTheDocument()
  })

  it('should filter leads based on search term', async () => {
    const user = userEvent.setup()
    render(<UnifiedLeadGrid {...defaultProps} />)

    // Assuming there's a search input in the component
    const searchInput = screen.queryByPlaceholderText('Search leads...')
    if (searchInput) {
      await user.type(searchInput, 'John')
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      })
    }
  })

  it('should display assigned manager when available', () => {
    const leadsWithManager = [
      {
        ...mockLeads[0],
        assignedManager: 'manager-1',
        assignedManagerName: 'Manager One'
      }
    ]

    render(<UnifiedLeadGrid {...defaultProps} leads={leadsWithManager} />)

    expect(screen.getByText('Assigned to: Manager One')).toBeInTheDocument()
  })

  it('should show unassigned status when no manager assigned', () => {
    render(<UnifiedLeadGrid {...defaultProps} />)

    expect(screen.getAllByText('Unassigned')).toHaveLength(2)
  })
})