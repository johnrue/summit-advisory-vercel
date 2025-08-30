'use client'

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardViewPreference } from '@/lib/services/dashboard-state-management-service'

interface ViewPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  currentView?: DashboardViewPreference
  onViewSwitch: (userId: string, viewId: string) => void
}

export function ViewPreferencesModal({ 
  isOpen, 
  onClose, 
  currentView, 
  onViewSwitch 
}: ViewPreferencesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>View Preferences</DialogTitle>
          <DialogDescription>
            Manage your dashboard views and layouts
          </DialogDescription>
        </DialogHeader>
        
        <Card>
          <CardHeader>
            <CardTitle>View Management</CardTitle>
            <CardDescription>
              View management interface (Task 1 - Dashboard State Management)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              View preferences management interface will be enhanced based on dashboard state service
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}