"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Edit, Save, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApplicationData } from "@/lib/types/guard-applications"

interface ManualOverridePanelProps {
  fieldName: string
  originalValue: any
  aiExtractedValue: any
  confidence: number
  onSave: (field: string, newValue: any) => Promise<void>
  onCancel: () => void
  className?: string
}

export default function ManualOverridePanel({
  fieldName,
  originalValue,
  aiExtractedValue,
  confidence,
  onSave,
  onCancel,
  className
}: ManualOverridePanelProps) {
  const [editValue, setEditValue] = useState(aiExtractedValue)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    
    try {
      await onSave(fieldName, editValue)
      setIsEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(aiExtractedValue)
    setIsEditing(false)
    setSaveError(null)
    onCancel()
  }

  const renderValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="text-sm whitespace-pre-wrap">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }
    return String(value)
  }

  const getFieldType = (fieldName: string) => {
    if (fieldName.includes('email')) return 'email'
    if (fieldName.includes('phone')) return 'tel'
    if (fieldName.includes('date')) return 'date'
    if (fieldName.includes('description') || fieldName.includes('notes')) return 'textarea'
    return 'text'
  }

  const fieldType = getFieldType(fieldName)

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize flex items-center space-x-2">
            <Edit className="h-4 w-4" />
            <span>{fieldName.replace(/_/g, ' ')} Override</span>
          </CardTitle>
          <Badge 
            variant={confidence >= 0.8 ? "default" : confidence >= 0.6 ? "secondary" : "destructive"}
            className="text-xs"
          >
            {Math.round(confidence * 100)}% Confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        {/* AI Extracted Value */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-green-600">
            AI Extracted Value
          </Label>
          <div className="p-3 bg-green-50 rounded-md border border-green-200">
            {renderValue(aiExtractedValue)}
          </div>
        </div>

        {/* Manual Override Input */}
        <div className="space-y-2">
          <Label htmlFor={`override-${fieldName}`} className="text-sm font-medium">
            Manual Override
          </Label>
          {isEditing ? (
            <div className="space-y-3">
              {fieldType === 'textarea' ? (
                <Textarea
                  id={`override-${fieldName}`}
                  value={typeof editValue === 'string' ? editValue : JSON.stringify(editValue, null, 2)}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              ) : (
                <Input
                  id={`override-${fieldName}`}
                  type={fieldType}
                  value={typeof editValue === 'string' ? editValue : JSON.stringify(editValue)}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-sm"
                />
              )}
              
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Override'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-md border min-h-[80px] flex items-center">
                {editValue !== aiExtractedValue ? (
                  <div className="space-y-2 w-full">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      Manually Overridden
                    </Badge>
                    <div className="text-sm">
                      {renderValue(editValue)}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    Click "Edit" to manually override the AI extraction
                  </span>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Value
              </Button>
            </div>
          )}
        </div>

        {/* Change Indicator */}
        {editValue !== aiExtractedValue && !isEditing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This field has been manually overridden and differs from the AI extraction.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

// Re-export for convenience
export { ManualOverridePanel }