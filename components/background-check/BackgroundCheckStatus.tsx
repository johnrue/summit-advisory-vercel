"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Clock, Shield, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { BackgroundCheckStatus, BackgroundCheckData } from '@/lib/types/background-check'

interface BackgroundCheckStatusProps {
  data: BackgroundCheckData
  showDetails?: boolean
  showActions?: boolean
  onUpdateClick?: () => void
  onViewDetails?: () => void
  className?: string
}

const statusConfig = {
  pending: { 
    label: 'Pending', 
    icon: Clock, 
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    description: 'Background check has been ordered and is pending initiation'
  },
  in_progress: { 
    label: 'In Progress', 
    icon: Shield, 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    description: 'Background check is currently being processed by vendor'
  },
  complete: { 
    label: 'Complete', 
    icon: CheckCircle, 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    description: 'Background check has been completed successfully'
  },
  failed: { 
    label: 'Failed', 
    icon: XCircle, 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    description: 'Background check did not meet requirements'
  },
  expired: { 
    label: 'Expired', 
    icon: AlertTriangle, 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    description: 'Background check has expired and requires renewal'
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: XCircle, 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    description: 'Background check has been cancelled'
  }
}

export function BackgroundCheckStatus({
  data,
  showDetails = false,
  showActions = false,
  onUpdateClick,
  onViewDetails,
  className
}: BackgroundCheckStatusProps) {
  const config = statusConfig[data.status]
  const StatusIcon = config.icon

  const isExpiringSoon = data.expiryDate && data.status === 'complete' && 
    new Date(data.expiryDate.getTime() - 14 * 24 * 60 * 60 * 1000) <= new Date()

  const isExpired = data.expiryDate && data.status === 'complete' && 
    new Date(data.expiryDate) <= new Date()

  return (
    <div className={cn("space-y-3", className)}>
      {/* Primary Status Badge */}
      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger>
            <Badge className={cn(config.color, "text-sm py-1 px-3")}>
              <StatusIcon className="h-3 w-3 mr-2" />
              {config.label}
              {isExpiringSoon && !isExpired && (
                <AlertTriangle className="h-3 w-3 ml-2 text-orange-500" />
              )}
              {isExpired && (
                <AlertTriangle className="h-3 w-3 ml-2 text-red-500" />
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>

        {showActions && (
          <div className="flex gap-2">
            {onUpdateClick && (
              <Button variant="outline" size="sm" onClick={onUpdateClick}>
                Update
              </Button>
            )}
            {onViewDetails && (
              <Button variant="ghost" size="sm" onClick={onViewDetails}>
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status Details */}
      {showDetails && (
        <div className="grid gap-3 text-sm">
          {data.date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{format(data.date, 'MMM d, yyyy')}</span>
            </div>
          )}

          {data.vendorConfirmationNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confirmation:</span>
              <span className="font-mono text-xs">{data.vendorConfirmationNumber}</span>
            </div>
          )}

          {data.expiryDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires:</span>
              <div className="text-right">
                <div>{format(data.expiryDate, 'MMM d, yyyy')}</div>
                <div className={cn(
                  "text-xs",
                  isExpired ? "text-red-600" : 
                  isExpiringSoon ? "text-orange-600" : 
                  "text-muted-foreground"
                )}>
                  {isExpired ? "Expired" : formatDistanceToNow(data.expiryDate, { addSuffix: true })}
                </div>
              </div>
            </div>
          )}

          {data.approvedBy && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approved By:</span>
              <span>{data.approvedBy}</span>
            </div>
          )}

          {data.notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1 text-xs bg-muted p-2 rounded">
                {data.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Expiry Warning */}
      {(isExpiringSoon || isExpired) && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-md text-sm",
          isExpired 
            ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            : "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
        )}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {isExpired 
              ? "This background check has expired and requires immediate renewal"
              : "This background check expires soon and will require renewal"
            }
          </span>
        </div>
      )}
    </div>
  )
}