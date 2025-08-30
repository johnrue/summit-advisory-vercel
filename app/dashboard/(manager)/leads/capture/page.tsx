"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Download, UserPlus, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import LeadCaptureForm from '@/components/dashboard/leads/LeadCaptureForm'
import { generateImportTemplate, processBulkImport, type BulkImportProgress } from '@/lib/services/lead-bulk-import-service'
import { toast } from 'sonner'

export default function LeadCapturePage() {
  const [activeTab, setActiveTab] = useState('manual')
  const [importProgress, setImportProgress] = useState<BulkImportProgress | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleLeadSuccess = (leadId: string) => {
    toast.success('Lead captured successfully!')
    // Could navigate to the lead details page
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setIsImporting(true)
    
    try {
      const content = await file.text()
      
      const result = await processBulkImport(content, file.name, {
        handleDuplicates: 'merge', // Can be made configurable
        chunkSize: 50
      })

      if (result.success) {
        setImportProgress(result.data!)
        toast.success('Import completed successfully!')
      } else {
        toast.error(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to process import file')
    } finally {
      setIsImporting(false)
      // Clear the file input
      event.target.value = ''
    }
  }

  const downloadTemplate = () => {
    const template = generateImportTemplate()
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lead_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  const renderImportProgress = () => {
    if (!importProgress) return null

    const successRate = importProgress.totalRows > 0 
      ? (importProgress.successRows / importProgress.totalRows) * 100 
      : 0

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Results: {importProgress.fileName}
          </CardTitle>
          <CardDescription>
            Import completed on {new Date(importProgress.createdAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {importProgress.totalRows}
              </div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {importProgress.successRows}
              </div>
              <div className="text-sm text-muted-foreground">Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {importProgress.duplicateRows}
              </div>
              <div className="text-sm text-muted-foreground">Duplicates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {importProgress.errorRows}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span>{successRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge 
              variant={importProgress.status === 'completed' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {importProgress.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
              {importProgress.status}
            </Badge>
            {importProgress.errorRows > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {importProgress.errorRows} Error{importProgress.errorRows !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Error Details */}
          {importProgress.errors.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">Import Errors:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importProgress.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        Row {error.row}: {error.message}
                      </div>
                    ))}
                    {importProgress.errors.length > 10 && (
                      <div className="text-sm text-muted-foreground">
                        ... and {importProgress.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Capture</h1>
          <p className="text-muted-foreground">
            Add new leads from various sources to your pipeline
          </p>
        </div>

        {/* Capture Options Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk Import
            </TabsTrigger>
          </TabsList>

          {/* Manual Lead Entry */}
          <TabsContent value="manual" className="mt-6">
            <LeadCaptureForm onSuccess={handleLeadSuccess} />
          </TabsContent>

          {/* Bulk Import */}
          <TabsContent value="bulk" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk Lead Import
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV file to import multiple leads at once. Duplicates will be automatically merged.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Template Download */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Download CSV Template</div>
                      <div className="text-sm text-muted-foreground">
                        Get the correct format for your lead import file
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-4">
                    <Label htmlFor="csv-upload" className="text-base font-medium">
                      Upload CSV File
                    </Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={isImporting}
                        className="flex-1"
                      />
                      <Button
                        disabled={isImporting}
                        variant="outline"
                        className="min-w-[120px]"
                      >
                        {isImporting ? 'Processing...' : 'Upload & Import'}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Maximum file size: 10MB. The system will automatically handle duplicates by merging them with existing leads.
                    </div>
                  </div>

                  {/* Import Instructions */}
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-semibold">Import Instructions:</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Ensure your CSV has headers matching the template</li>
                          <li>Required fields: firstName, lastName, email, phone, sourceType, serviceType</li>
                          <li>The system will automatically check for duplicates by email and phone</li>
                          <li>Duplicate leads will be merged with existing records</li>
                          <li>Invalid rows will be skipped and reported in the results</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Import Progress/Results */}
              {renderImportProgress()}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}