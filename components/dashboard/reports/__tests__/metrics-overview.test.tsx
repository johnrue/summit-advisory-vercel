import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MetricsOverview } from '../metrics-overview'
import '@testing-library/jest-dom'

// Mock the recharts library
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />
}))

// Mock the chart UI components
jest.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children, config }: { children: React.ReactNode; config: any }) => (
    <div data-testid="chart-container" data-config={JSON.stringify(config)}>
      {children}
    </div>
  ),
  ChartTooltip: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="chart-tooltip">{children}</div>
  ),
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />
}))

describe('MetricsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders metrics overview with key performance indicators', () => {
    render(<MetricsOverview />)
    
    // Check for main title
    expect(screen.getByText('Operational Metrics')).toBeInTheDocument()
    
    // Check for key metric cards
    expect(screen.getByText('Active Guards')).toBeInTheDocument()
    expect(screen.getByText('Hiring Conversion')).toBeInTheDocument()
    expect(screen.getByText('Scheduling Efficiency')).toBeInTheDocument()
    expect(screen.getByText('Compliance Status')).toBeInTheDocument()
    
    // Check for metric values
    expect(screen.getByText('156')).toBeInTheDocument()
    expect(screen.getByText('68%')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('displays charts for data visualization', () => {
    render(<MetricsOverview />)
    
    // Check for chart containers
    const chartContainers = screen.getAllByTestId('chart-container')
    expect(chartContainers).toHaveLength(3) // Hiring trends, shift status, compliance
    
    // Check for specific chart types
    expect(screen.getByTestId('line-chart')).toBeInTheDocument() // Hiring trends
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument() // Shift status
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument() // Compliance
  })

  it('shows key performance indicators section', () => {
    render(<MetricsOverview />)
    
    expect(screen.getByText('Key Performance Indicators')).toBeInTheDocument()
    expect(screen.getByText('Average Response Time')).toBeInTheDocument()
    expect(screen.getByText('Client Satisfaction')).toBeInTheDocument()
    expect(screen.getByText('License Expiry Alerts')).toBeInTheDocument()
    expect(screen.getByText('Background Check Pending')).toBeInTheDocument()
    expect(screen.getByText('Revenue This Month')).toBeInTheDocument()
  })

  it('handles refresh button click', async () => {
    render(<MetricsOverview />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).not.toBeDisabled()
    
    // Click refresh button
    fireEvent.click(refreshButton)
    
    // Button should be disabled during loading
    expect(refreshButton).toBeDisabled()
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled()
    }, { timeout: 2000 })
  })

  it('displays last updated timestamp', () => {
    render(<MetricsOverview />)
    
    expect(screen.getByText(/last updated:/i)).toBeInTheDocument()
  })

  it('shows trend indicators for metrics', () => {
    render(<MetricsOverview />)
    
    // Should show percentage changes for metrics
    expect(screen.getByText('12.5%')).toBeInTheDocument() // Active guards change
    expect(screen.getByText('5.2%')).toBeInTheDocument() // Hiring conversion change
    expect(screen.getByText('2.1%')).toBeInTheDocument() // Scheduling efficiency change
    expect(screen.getByText('1.8%')).toBeInTheDocument() // Compliance status change
  })

  it('renders chart components with proper configuration', () => {
    render(<MetricsOverview />)
    
    const chartContainers = screen.getAllByTestId('chart-container')
    
    // Verify chart containers have configuration
    chartContainers.forEach(container => {
      const config = container.getAttribute('data-config')
      expect(config).toBeTruthy()
      
      // Parse and verify config structure
      const parsedConfig = JSON.parse(config!)
      expect(parsedConfig).toHaveProperty('hired')
      expect(parsedConfig).toHaveProperty('pending')
      expect(parsedConfig).toHaveProperty('rejected')
    })
  })

  it('handles loading state during refresh', async () => {
    render(<MetricsOverview />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    
    // Click refresh to trigger loading state
    fireEvent.click(refreshButton)
    
    // Check that button shows loading state
    const spinner = screen.getByLabelText(/refresh/i).querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled()
    }, { timeout: 2000 })
  })
})