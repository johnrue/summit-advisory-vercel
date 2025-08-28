"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackgroundCheckStatusProps {
  backgroundCheck: {
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    completedAt?: string
    cleared: boolean
    notes?: string
    provider?: string
    reportId?: string
  }
  onViewReport?: () => void
  className?: string
}

export function BackgroundCheckStatus({ 
  backgroundCheck, 
  onViewReport,
  className 
}: BackgroundCheckStatusProps) {
  const getStatusConfig = (status: string, cleared: boolean) => {
    switch (status) {
      case 'completed':
        return cleared 
          ? { 
              icon: CheckCircle, 
              color: 'bg-green-500', 
              text: 'Cleared', 
              variant: 'default' as const,
              description: 'Background check passed successfully'
            }
          : { 
              icon: XCircle, 
              color: 'bg-red-500', 
              text: 'Issues Found', 
              variant: 'destructive' as const,
              description: 'Background check revealed concerns'
            }
      case 'in_progress':
        return {
          icon: Clock,
          color: 'bg-blue-500',
          text: 'In Progress',
          variant: 'default' as const,
          description: 'Background check is currently being processed'
        }
      case 'failed':
        return {
          icon: XCircle,
          color: 'bg-red-500',
          text: 'Failed',
          variant: 'destructive' as const,
          description: 'Background check process failed'
        }
      default: // pending
        return {
          icon: Clock,
          color: 'bg-yellow-500',
          text: 'Pending',
          variant: 'secondary' as const,
          description: 'Background check not yet started'
        }
    }
  }

  const statusConfig = getStatusConfig(backgroundCheck.status, backgroundCheck.cleared)
  const StatusIcon = statusConfig.icon

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Background Check</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Status:</span>
          </div>
          <Badge 
            variant={statusConfig.variant}
            className={cn("text-white", statusConfig.color)}
          >
            {statusConfig.text}
          </Badge>
        </div>

        {/* Status Description */}
        <p className="text-sm text-muted-foreground">
          {statusConfig.description}
        </p>

        {/* Completion Date */}
        {backgroundCheck.completedAt && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Completed: {formatDate(backgroundCheck.completedAt)}
            </span>
          </div>
        )}

        {/* Provider Information */}
        {backgroundCheck.provider && (
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Provider: {backgroundCheck.provider}
            </span>
          </div>
        )}

        {/* Report ID */}
        {backgroundCheck.reportId && (
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Report ID: {backgroundCheck.reportId}
            </span>
          </div>
        )}

        {/* Notes */}
        {backgroundCheck.notes && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Notes:</h4>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{backgroundCheck.notes}</p>
            </div>
          </div>
        )}

        {/* Status-specific alerts */}
        {backgroundCheck.status === 'completed' && !backgroundCheck.cleared && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Background check revealed issues that may affect employment eligibility. 
              Review the full report before making approval decisions.
            </AlertDescription>
          </Alert>
        )}

        {backgroundCheck.status === 'failed' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Background check process failed. Please contact the background check provider 
              or initiate a new check.
            </AlertDescription>
          </Alert>
        )}

        {backgroundCheck.status === 'pending' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Background check has not been initiated yet. Consider starting the process 
              to move the application forward.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          {backgroundCheck.status === 'completed' && onViewReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewReport}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full Report
            </Button>
          )}
          
          {backgroundCheck.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Shield className="h-4 w-4 mr-2" />
              Initiate Check
            </Button>
          )}

          {backgroundCheck.status === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Shield className="h-4 w-4 mr-2" />
              Retry Check
            </Button>
          )}
        </div>

        {/* Compliance Note */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            All background checks are conducted in compliance with FCRA regulations 
            and Texas Department of Public Safety requirements.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}