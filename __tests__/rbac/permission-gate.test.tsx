import { render, screen } from '@testing-library/react'
import { PermissionGate } from '@/components/auth/permission-gate'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserRole } from '@/hooks/use-user-role'

// Mock the hooks
jest.mock('@/hooks/use-permissions')
jest.mock('@/hooks/use-user-role')

const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>
const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>

describe('PermissionGate', () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({
      permissions: null,
      loading: false,
      error: null,
      checkPermission: jest.fn(),
      checkPermissions: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasAllPermissions: jest.fn(),
      refreshPermissions: jest.fn(),
    })
    
    mockUseUserRole.mockReturnValue({
      role: null,
      loading: false,
      error: null
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render children when no restrictions are set', () => {
    render(
      <PermissionGate>
        <div>Test Content</div>
      </PermissionGate>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render fallback when user lacks required role', () => {
    mockUseUserRole.mockReturnValue({
      role: 'guard',
      loading: false,
      error: null
    })

    render(
      <PermissionGate 
        roles={['admin']} 
        fallback={<div>Access Denied</div>}
      >
        <div>Admin Content</div>
      </PermissionGate>
    )
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should render children when user has required role', () => {
    mockUseUserRole.mockReturnValue({
      role: 'admin',
      loading: false,
      error: null
    })

    render(
      <PermissionGate 
        roles={['admin']} 
        fallback={<div>Access Denied</div>}
      >
        <div>Admin Content</div>
      </PermissionGate>
    )
    
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
  })

  it('should render children when user has any of the allowed roles', () => {
    mockUseUserRole.mockReturnValue({
      role: 'manager',
      loading: false,
      error: null
    })

    render(
      <PermissionGate 
        roles={['admin', 'manager']} 
        fallback={<div>Access Denied</div>}
      >
        <div>Manager Content</div>
      </PermissionGate>
    )
    
    expect(screen.getByText('Manager Content')).toBeInTheDocument()
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
  })

  it('should show loading state while permissions are loading', () => {
    mockUsePermissions.mockReturnValue({
      permissions: null,
      loading: true,
      error: null,
      checkPermission: jest.fn(),
      checkPermissions: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasAllPermissions: jest.fn(),
      refreshPermissions: jest.fn(),
    })

    render(
      <PermissionGate permissions={['users.view_all']}>
        <div>Content</div>
      </PermissionGate>
    )
    
    // Should show loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('should render children when user has required permissions', () => {
    mockUsePermissions.mockReturnValue({
      permissions: null,
      loading: false,
      error: null,
      checkPermission: jest.fn(),
      checkPermissions: jest.fn(),
      hasAnyPermission: jest.fn().mockReturnValue(true),
      hasAllPermissions: jest.fn(),
      refreshPermissions: jest.fn(),
    })

    render(
      <PermissionGate 
        permissions={['users.view_all']}
        fallback={<div>No Permission</div>}
      >
        <div>Protected Content</div>
      </PermissionGate>
    )
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('No Permission')).not.toBeInTheDocument()
  })

  it('should render fallback when user lacks required permissions', () => {
    mockUsePermissions.mockReturnValue({
      permissions: null,
      loading: false,
      error: null,
      checkPermission: jest.fn(),
      checkPermissions: jest.fn(),
      hasAnyPermission: jest.fn().mockReturnValue(false),
      hasAllPermissions: jest.fn(),
      refreshPermissions: jest.fn(),
    })

    render(
      <PermissionGate 
        permissions={['users.view_all']}
        fallback={<div>No Permission</div>}
      >
        <div>Protected Content</div>
      </PermissionGate>
    )
    
    expect(screen.getByText('No Permission')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})