"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import ApplicationReviewBoard from "@/components/applications/ApplicationReviewBoard"

export default function ManagerApplicationsPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Review</h1>
          <p className="text-muted-foreground">
            Review AI-parsed guard applications with confidence indicators
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      <ApplicationReviewBoard 
        showMetrics={true}
        className="w-full"
      />
    </div>
  )
}