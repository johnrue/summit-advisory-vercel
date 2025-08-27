"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"
import LeadManagementBoard from "@/components/leads/LeadManagementBoard"

export default function ManagerLeadsPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground">
            Manage guard applications and potential candidates
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      <LeadManagementBoard 
        showMetrics={true}
        className="w-full"
      />
    </div>
  )
}