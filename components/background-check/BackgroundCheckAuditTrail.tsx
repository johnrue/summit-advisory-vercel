"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, User, FileText, Shield } from 'lucide-react'
import { format } from 'date-fns'
import type { BackgroundCheckAudit } from '@/lib/types/background-check'

interface BackgroundCheckAuditTrailProps {
  auditTrail: BackgroundCheckAudit[]
  applicationId: string
  className?: string
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  complete: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
}

export function BackgroundCheckAuditTrail({
  auditTrail,
  applicationId,
  className
}: BackgroundCheckAuditTrailProps) {
  if (auditTrail.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No background check history available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Background Check Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditTrail.map((record, index) => (
            <div key={record.id}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 bg-primary rounded-full mt-2" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {record.previousStatus && (
                        <>
                          <Badge variant="outline" className={statusColors[record.previousStatus]}>
                            {record.previousStatus}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                        </>
                      )}
                      <Badge className={statusColors[record.newStatus]}>
                        {record.newStatus}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(record.createdAt, 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {record.changeReason}
                    </p>
                  </div>

                  {record.vendorConfirmation && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Confirmation:</span> {record.vendorConfirmation}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Changed by: {record.changedBy}</span>
                    </div>
                    
                    {record.managerSignature && (
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>Signed by: {record.managerSignature}</span>
                      </div>
                    )}
                    
                    {record.isSystemGenerated && (
                      <Badge variant="secondary" className="text-xs">
                        System Generated
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {index < auditTrail.length - 1 && (
                <div className="ml-1.5 mt-2 mb-4">
                  <div className="w-px h-4 bg-border" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}