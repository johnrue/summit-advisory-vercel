"use client"

// Test page for resume parsing functionality
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, Loader2 } from 'lucide-react'

export default function ResumeParserTestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async () => {
    if (!file) return

    try {
      setIsUploading(true)
      setError(null)

      // Create a test application ID (use same for upload and parsing)
      const testApplicationId = crypto.randomUUID()

      // First upload the file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('applicationId', testApplicationId) // Use consistent ID
      formData.append('documentType', 'resume') // Document type

      const uploadResponse = await fetch('/api/v1/applications/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'File upload failed')
      }

      const uploadResult = await uploadResponse.json()
      console.log('Upload result:', uploadResult)

      // Now parse the resume
      setIsParsing(true)
      const parseResponse = await fetch('/api/v1/applications/parse-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_path: uploadResult.data.storage_path,
          application_id: testApplicationId
        })
      })

      const parseResult = await parseResponse.json()
      console.log('Parse result:', parseResult)

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Parsing failed')
      }

      setResults(parseResult.data)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsUploading(false)
      setIsParsing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume Parser Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resume-file">Upload Resume (PDF or DOCX)</Label>
            <Input
              id="resume-file"
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <Button 
            onClick={handleFileUpload}
            disabled={!file || isUploading || isParsing}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : isParsing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing with AI...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Parse Resume
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Parsing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Confidence Scores</Label>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-auto">
{JSON.stringify(results.confidence_scores, null, 2)}
                </pre>
              </div>
              
              <div>
                <Label>Extracted Data</Label>
                <Textarea
                  value={JSON.stringify(results.parsed_data, null, 2)}
                  readOnly
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>

              <div>
                <Label>Processing Time</Label>
                <p className="text-sm text-muted-foreground">
                  {results.processing_time_ms}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}