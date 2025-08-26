'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { 
  HelpCircle, 
  Eye, 
  Shield, 
  Users, 
  UserCheck, 
  Settings,
  AlertTriangle,
  Info,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminRoleViewHelpProps {
  className?: string
  variant?: 'button' | 'inline'
}

export function AdminRoleViewHelp({ 
  className, 
  variant = 'button' 
}: AdminRoleViewHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  const HelpContent = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Eye className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-lg font-semibold">Admin Role View Switching</h2>
        <p className="text-sm text-muted-foreground">
          Switch between different role perspectives while maintaining full admin privileges
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="overview">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Overview
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-sm">
              Role View Switching allows administrators to experience the system from different user perspectives 
              without losing administrative privileges. This is useful for:
            </p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Understanding user workflows and limitations</li>
              <li>• Testing permissions and access controls</li>
              <li>• Troubleshooting user experience issues</li>
              <li>• Training and demonstration purposes</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="roles">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Available Role Views
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 border rounded">
                <Shield className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Administrator</span>
                    <Badge variant="destructive">ADMIN</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full system access with all management capabilities
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded">
                <Users className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Manager</span>
                    <Badge variant="default">MANAGER</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Team management, shift scheduling, and operational oversight
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Guard</span>
                    <Badge variant="secondary">GUARD</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Individual guard experience with personal dashboard and schedules
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="howto">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              How to Use
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-3">
                <h4 className="text-sm font-medium">Switching Role Views</h4>
                <p className="text-xs text-muted-foreground">
                  Click the role switcher in the dashboard header and select your desired view role.
                </p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-3">
                <h4 className="text-sm font-medium">Role View Indicator</h4>
                <p className="text-xs text-muted-foreground">
                  When viewing as another role, a prominent banner will show your current view mode.
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="text-sm font-medium">Return to Admin</h4>
                <p className="text-xs text-muted-foreground">
                  Use the "Return to Admin View" button in the banner or role switcher to go back.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preferences">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-sm">Customize your role switching experience:</p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="text-sm font-medium">Remember Last View</h4>
                  <p className="text-xs text-muted-foreground">
                    Automatically return to your last used role view when logging in.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="text-sm font-medium">Default Role View</h4>
                  <p className="text-xs text-muted-foreground">
                    Set a specific role as your default view when opening the dashboard.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="text-sm font-medium">View History</h4>
                  <p className="text-xs text-muted-foreground">
                    Track your recent role view switches for easy access to frequently used views.
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="security">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Security & Audit
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Important Security Notes
                </span>
              </div>
              <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                <li>• You always retain full administrator privileges</li>
                <li>• Role switching is UI-only - backend permissions remain admin</li>
                <li>• All role switches are logged for audit purposes</li>
                <li>• Users are not notified when you switch to their role view</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Audit Logging
                </span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                All role switching activities are automatically logged in the audit system, 
                including timestamps, IP addresses, and role changes.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className={className}>
        <HelpContent />
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Admin Role View Switching Guide</DialogTitle>
          <DialogDescription>
            Learn how to use role switching and user support features
          </DialogDescription>
        </DialogHeader>
        <HelpContent />
      </DialogContent>
    </Dialog>
  )
}