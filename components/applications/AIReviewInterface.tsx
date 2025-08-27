"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Eye, Edit, FileText, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfidenceIndicator } from "./ConfidenceIndicator"
import { SideBySideComparison } from "./SideBySideComparison"
import { ManualOverridePanel } from "./ManualOverridePanel"
import type { GuardApplication, ApplicationData, AIParsedData } from "@/lib/types/guard-applications"

interface AIReviewInterfaceProps {
  application: GuardApplication
  onFieldApprove: (field: string) => Promise<void>
  onFieldReject: (field: string, newValue: any) => Promise<void>
  onBulkApprove: (threshold: number) => Promise<void>
  onApplicationStatusChange: (status: string) => Promise<void>
  className?: string
}

export default function AIReviewInterface({
  application,
  onFieldApprove,
  onFieldReject,
  onBulkApprove,
  onApplicationStatusChange,
  className
}: AIReviewInterfaceProps) {
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState<'overview' | 'detailed'>('overview')
  const [bulkApproveThreshold, setBulkApproveThreshold] = useState(0.8)

  const aiData = application.ai_parsed_data
  const confidenceScores = application.confidence_scores

  if (!aiData || !confidenceScores) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No AI processing data available for this application.
        </AlertDescription>
      </Alert>
    )
  }

  const getFieldsForReview = () => {
    const fields = []
    
    if (aiData.extracted_fields?.personal_info) {
      fields.push({
        name: 'personal_info',
        label: 'Personal Information',
        data: aiData.extracted_fields.personal_info,
        confidence: confidenceScores.personal_info || 0,
        original: 'Personal info from resume'
      })
    }

    if (aiData.extracted_fields?.work_experience) {
      fields.push({
        name: 'work_experience',
        label: 'Work Experience',
        data: aiData.extracted_fields.work_experience,
        confidence: confidenceScores.work_experience || 0,
        original: 'Work experience section from resume'
      })
    }

    if (aiData.extracted_fields?.education) {
      fields.push({
        name: 'education',
        label: 'Education',
        data: aiData.extracted_fields.education,
        confidence: confidenceScores.education || 0,
        original: 'Education section from resume'
      })
    }

    if (aiData.extracted_fields?.certifications) {
      fields.push({
        name: 'certifications',
        label: 'Certifications',
        data: aiData.extracted_fields.certifications,
        confidence: confidenceScores.certifications || 0,
        original: 'Certifications section from resume'
      })
    }

    return fields
  }

  const fields = getFieldsForReview()
  const overallConfidence = confidenceScores.overall || 0
  const highConfidenceFields = fields.filter(f => f.confidence >= bulkApproveThreshold)
  const lowConfidenceFields = fields.filter(f => f.confidence < 0.6)

  const handleFieldApprove = async (fieldName: string) => {
    try {
      await onFieldApprove(fieldName)
    } catch (error) {
      console.error('Failed to approve field:', error)
    }
  }

  const handleFieldEdit = async (fieldName: string, newValue: any) => {
    try {
      await onFieldReject(fieldName, newValue)
    } catch (error) {
      console.error('Failed to update field:', error)
    }
  }

  const handleBulkApprove = async () => {
    try {
      await onBulkApprove(bulkApproveThreshold)
    } catch (error) {
      console.error('Failed to bulk approve:', error)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* AI Processing Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <span>AI Processing Summary</span>
            </CardTitle>
            <div className="flex items-center space-x-3">
              <ConfidenceIndicator 
                confidence={overallConfidence}
                field="Overall"
                size="md"
              />
              <Badge variant="outline" className="text-xs">
                {aiData.processing_model}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {highConfidenceFields.length}
              </div>
              <div className="text-sm text-muted-foreground">
                High Confidence Fields
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {fields.length - highConfidenceFields.length - lowConfidenceFields.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Medium Confidence Fields
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {lowConfidenceFields.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Low Confidence Fields
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Processing time: {aiData.processing_time_ms}ms
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={highConfidenceFields.length === 0}
                onClick={handleBulkApprove}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve {highConfidenceFields.length} High-Confidence Fields
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Review Tabs */}
      <Tabs value={reviewMode} onValueChange={(value) => setReviewMode(value as any)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Review</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {fields.map((field) => (
            <Card key={field.name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold">{field.label}</h3>
                      <ConfidenceIndicator 
                        confidence={field.confidence}
                        field=""
                        showLabel={false}
                        size="sm"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {typeof field.data === 'object' 
                        ? `${Object.keys(field.data).length} fields extracted`
                        : 'Data extracted'
                      }
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{field.label} Review</DialogTitle>
                        </DialogHeader>
                        <SideBySideComparison
                          originalData={field.original}
                          extractedData={field.data}
                          confidence={field.confidence}
                          field={field.name}
                          onApprove={() => handleFieldApprove(field.name)}
                          onReject={() => {}}
                          onEdit={(newValue) => handleFieldEdit(field.name, newValue)}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      onClick={() => handleFieldApprove(field.name)}
                      disabled={field.confidence < 0.5}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {fields.map((field) => (
            <div key={field.name}>
              <SideBySideComparison
                originalData={field.original}
                extractedData={field.data}
                confidence={field.confidence}
                field={field.name}
                onApprove={() => handleFieldApprove(field.name)}
                onReject={() => setSelectedField(field.name)}
                onEdit={(newValue) => handleFieldEdit(field.name, newValue)}
              />
              
              {selectedField === field.name && (
                <div className="mt-4">
                  <ManualOverridePanel
                    fieldName={field.name}
                    originalValue={field.original}
                    aiExtractedValue={field.data}
                    confidence={field.confidence}
                    onSave={(fieldName, newValue) => handleFieldEdit(fieldName, newValue)}
                    onCancel={() => setSelectedField(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Application Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Application Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => onApplicationStatusChange('approved')}
              disabled={lowConfidenceFields.length > 0}
            >
              Approve Application
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onApplicationStatusChange('under_review')}
            >
              Mark Under Review
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => onApplicationStatusChange('rejected')}
            >
              Reject Application
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Re-export for convenience
export { AIReviewInterface }