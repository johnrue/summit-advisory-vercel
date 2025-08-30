'use client'

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FilterCriteria } from '@/lib/types/unified-leads'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  currentFilters?: FilterCriteria
}

export function ExportModal({ isOpen, onClose, currentFilters }: ExportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Leads</DialogTitle>
          <DialogDescription>
            Export lead data with privacy controls and role-based access
          </DialogDescription>
        </DialogHeader>
        
        <Card>
          <CardHeader>
            <CardTitle>Export System</CardTitle>
            <CardDescription>
              Data export with privacy controls (Task 5 implementation)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Export functionality will be implemented in Task 5: Export and Reporting System
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}