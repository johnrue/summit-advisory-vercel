"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Clock, Shield, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { BackgroundCheckStatusForm } from './BackgroundCheckStatusForm'
import { BackgroundCheckAuditTrail } from './BackgroundCheckAuditTrail'
import type { BackgroundCheckStatus, BackgroundCheckData, BackgroundCheckUpdate } from '@/lib/types/background-check'
import { BackgroundCheckService } from '@/lib/services/background-check-service'

interface BackgroundCheckManagerProps {
  applicationId: string
  applicantName: string
  currentStatus: BackgroundCheckStatus
  onStatusChange?: (newStatus: BackgroundCheckStatus) => void
  showAuditTrail?: boolean
  enableNotifications?: boolean
  className?: string
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  in_progress: { label: 'In Progress', icon: Shield, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  complete: { label: 'Complete', icon: CheckCircle, color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  failed: { label: 'Failed', icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  expired: { label: 'Expired', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' }
}

export function BackgroundCheckManager({
  applicationId,
  applicantName,
  currentStatus,
  onStatusChange,
  showAuditTrail = true,
  enableNotifications = true,
  className
}: BackgroundCheckManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [backgroundCheckData, setBackgroundCheckData] = useState<BackgroundCheckData | null>(null)
  const { toast } = useToast()

  const backgroundCheckService = new BackgroundCheckService()

  const loadBackgroundCheckData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await backgroundCheckService.getBackgroundCheckData(applicationId)
      if (result.success) {
        setBackgroundCheckData(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load background check data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [applicationId, backgroundCheckService, toast])

  const handleStatusUpdate = async (update: BackgroundCheckUpdate) => {
    setIsLoading(true)
    try {
      // Get current user (TODO: implement proper auth context)
      const currentUserId = 'temp-user-id' // This should come from auth context
      
      const result = await backgroundCheckService.updateStatus(applicationId, update, currentUserId)
      
      if (result.success) {
        toast({
          title: "Background Check Updated",
          description: `Status changed to ${update.status}`
        })
        
        // Reload data and notify parent
        await loadBackgroundCheckData()
        onStatusChange?.(update.status)
        setShowUpdateForm(false)
      } else {
        toast({
          title: "Update Failed",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update background check status",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const currentConfig = statusConfig[currentStatus]
  const StatusIcon = currentConfig.icon

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Background Check Status
              </CardTitle>
              <CardDescription>
                Background check management for {applicantName}
              </CardDescription>
            </div>
            <Badge className={currentConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {currentConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Status Details */}
          <div className="grid gap-4 md:grid-cols-2">
            {backgroundCheckData?.date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </label>
                <p className="text-sm">
                  {format(backgroundCheckData.date, 'MMM d, yyyy at h:mm a')}
                </p>
              </div>
            )}

            {backgroundCheckData?.vendorConfirmationNumber && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Confirmation Number
                </label>
                <p className="text-sm font-mono">
                  {backgroundCheckData.vendorConfirmationNumber}
                </p>
              </div>
            )}

            {backgroundCheckData?.expiryDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Expiry Date
                </label>
                <p className="text-sm">
                  {format(backgroundCheckData.expiryDate, 'MMM d, yyyy')}
                </p>
              </div>
            )}

            {backgroundCheckData?.approvedBy && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Approved By
                </label>
                <p className="text-sm">
                  {backgroundCheckData.approvedBy}
                </p>
              </div>
            )}
          </div>

          {backgroundCheckData?.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Notes
              </label>
              <p className="text-sm bg-muted p-3 rounded-md">
                {backgroundCheckData.notes}
              </p>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowUpdateForm(true)}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Update Status
            </Button>
            
            <Button 
              variant="outline" 
              onClick={loadBackgroundCheckData}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>

          {/* Status Update Form */}
          {showUpdateForm && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <BackgroundCheckStatusForm
                  applicationId={applicationId}
                  currentStatus={currentStatus}
                  onStatusUpdate={handleStatusUpdate}
                  onCancel={() => setShowUpdateForm(false)}
                  requireApproval={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Audit Trail */}
          {showAuditTrail && backgroundCheckData?.auditTrail && (
            <>
              <Separator />
              <BackgroundCheckAuditTrail 
                auditTrail={backgroundCheckData.auditTrail}
                applicationId={applicationId}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}