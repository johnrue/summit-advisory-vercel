"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Bot, User, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfidenceIndicator } from "./ConfidenceIndicator"
import type { ApplicationData, AIParsedData } from "@/lib/types/guard-applications"

interface SideBySideComparisonProps {
  originalData: string // Resume content or document text
  extractedData: Partial<ApplicationData>
  confidence: number
  field: string
  onApprove: () => void
  onReject: () => void
  onEdit: (newValue: any) => void
  className?: string
}

export default function SideBySideComparison({
  originalData,
  extractedData,
  confidence,
  field,
  onApprove,
  onReject,
  onEdit,
  className
}: SideBySideComparisonProps) {
  const renderExtractedValue = (data: any) => {
    if (typeof data === 'object' && data !== null) {
      return (
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="font-medium capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="ml-2">{String(value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return <span className="text-sm">{String(data)}</span>
  }

  const renderOriginalHighlight = (text: string) => {
    // Simple highlighting - in production, you'd want more sophisticated matching
    return (
      <div className="text-sm whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-md border">
        {text.length > 500 ? `${text.substring(0, 500)}...` : text}
      </div>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">
            {field.replace(/_/g, ' ')} Comparison
          </CardTitle>
          <ConfidenceIndicator 
            confidence={confidence}
            field=""
            showLabel={false}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Document */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <FileText className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-blue-600">Original Document</h3>
            </div>
            <div className="min-h-[200px]">
              {renderOriginalHighlight(originalData)}
            </div>
          </div>

          {/* AI Extracted Data */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Bot className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold text-green-600">AI Extracted</h3>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-h-[200px] bg-green-50 p-4 rounded-md border border-green-200">
              {renderExtractedValue(extractedData)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <User className="h-4 w-4 mr-2" />
            Reject & Edit
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            className="bg-green-600 hover:bg-green-700"
          >
            Approve Extraction
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Re-export for convenience
export { SideBySideComparison }