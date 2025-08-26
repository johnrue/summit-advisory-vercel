'use client'

import { useAdminRoleView } from '@/hooks/use-admin-role-view'
import { Button } from '@/components/ui/button'
import { RotateCcw, Loader2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReturnToAdminButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showIcon?: boolean
  children?: React.ReactNode
}

export function ReturnToAdminButton({ 
  className,
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  children
}: ReturnToAdminButtonProps) {
  const {
    canSwitchRoleViews,
    isViewingSwitchedRole,
    isLoading,
    returnToAdminView
  } = useAdminRoleView()

  // Don't render if user is not an admin or not in switched role view
  if (!canSwitchRoleViews || !isViewingSwitchedRole) {
    return null
  }

  const handleClick = async () => {
    await returnToAdminView()
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2",
        "hover:border-primary hover:bg-primary/5",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        className
      )}
      title="Return to full administrator view"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showIcon ? (
        <RotateCcw className="h-4 w-4" />
      ) : null}
      
      {children || (
        <span className="font-medium">
          {size === 'icon' ? null : 'Return to Admin'}
        </span>
      )}
      
      {!children && showIcon && size !== 'icon' && (
        <Shield className="h-3 w-3 opacity-60" />
      )}
    </Button>
  )
}