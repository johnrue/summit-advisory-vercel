"use client"

// Simple AI Resume Parser - Let OpenAI do ALL the work!
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, Loader2, Zap, CheckCircle } from 'lucide-react'

export default function SimpleAIParserTest() {
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileParse = async () => {
    if (!file) return

    try {
      setIsParsing(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/test/ai-parse-file', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Parsing failed')
      }

      const result = await response.json()
      setResults(result.data)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsParsing(false)
    }
  }

  const handleDocxUpload = async () => {
    if (!file) return

    try {
      setIsParsing(true)
      setError(null)

      // TODO: Implement DOCX upload to database/storage
      // For now, simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Show success message and redirect to manual form
      setResults({
        uploaded: true,
        filename: file.name,
        message: 'Document uploaded successfully. Please fill out the form manually.',
        redirect_url: '/applications/new' // TODO: Replace with actual form URL
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsParsing(false)
    }
  }

  // Determine file type for button logic
  const isPDF = file?.type === 'application/pdf'
  const isDOCX = file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file?.type === 'application/msword'

  const formatConfidenceScore = (score: number) => {
    const percentage = Math.round(score * 100)
    const color = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
    return <span className={color}>{percentage}%</span>
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Summit Advisory AI Resume Parser
          </CardTitle>
          <p className="text-muted-foreground">
            Upload a <strong>PDF resume</strong> for automatic AI parsing, or upload DOCX/images to fill forms manually. Our advanced AI technology extracts information instantly from PDF documents.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resume-file">Upload Resume (PDF for AI parsing, DOCX/Images accepted)</Label>
            <Input
              id="resume-file"
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Show different buttons based on file type */}
          {isPDF && (
            <Button 
              onClick={handleFileParse}
              disabled={!file || isParsing}
              className="w-full"
              size="lg"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Summit Advisory AI is analyzing your resume...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Parse Resume with Summit AI
                </>
              )}
            </Button>
          )}

          {isDOCX && (
            <Button 
              onClick={handleDocxUpload}
              disabled={!file || isParsing}
              className="w-full"
              size="lg"
              variant="outline"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Uploading document...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Resume & Fill Manually
                </>
              )}
            </Button>
          )}

          {file && !isPDF && !isDOCX && (
            <Button 
              onClick={handleDocxUpload}
              disabled={!file || isParsing}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Uploading document...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  Upload Image & Fill Manually
                </>
              )}
            </Button>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6">
          {/* Processing Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">
                    {results.uploaded ? 'Upload Complete' : 'Parsing Complete'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {results.uploaded ? `File: ${results.filename}` : `Summit AI Engine • ${results.processing_time_ms}ms`}
                </div>
              </div>
              
              {results.uploaded && (
                <div className="mt-4">
                  <p className="text-green-600 font-medium">{results.message}</p>
                  <Button className="mt-3" onClick={() => window.location.href = results.redirect_url}>
                    Continue to Application Form
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Only show AI parsing results for parsed data */}
          {!results.uploaded && (
            <>
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {formatConfidenceScore(results.confidence_scores?.personal_info || 0)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <p>{results.extracted_fields?.personal_info?.first_name} {results.extracted_fields?.personal_info?.last_name}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p>{results.extracted_fields?.personal_info?.email || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p>{results.extracted_fields?.personal_info?.phone || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>Location</Label>
                      <p>
                        {results.extracted_fields?.personal_info?.address ? 
                          `${results.extracted_fields.personal_info.address.city}, ${results.extracted_fields.personal_info.address.state}` : 
                          'Not found'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Experience */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Experience</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {formatConfidenceScore(results.confidence_scores?.work_experience || 0)}
                  </p>
                </CardHeader>
                <CardContent>
                  {results.extracted_fields?.work_experience?.map((job: any, index: number) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-4 mb-4">
                      <h4 className="font-medium">{job.position} at {job.company}</h4>
                      <p className="text-sm text-muted-foreground">
                        {job.start_date} - {job.end_date || 'Present'}
                        {job.security_related && <span className="ml-2 text-green-600">• Security-related</span>}
                      </p>
                      <p className="text-sm mt-1">{job.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Certifications</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {formatConfidenceScore(results.confidence_scores?.certifications || 0)}
                  </p>
                </CardHeader>
                <CardContent>
                  {results.extracted_fields?.certifications?.map((cert: any, index: number) => (
                    <div key={index} className="flex justify-between items-start mb-3 p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground">Issued by {cert.issuer}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>Obtained: {cert.date_obtained || 'Unknown'}</p>
                        {cert.expiry_date && <p>Expires: {cert.expiry_date}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Parsed Data for review */}
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Data (for review)</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
{JSON.stringify(results.extracted_fields, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}