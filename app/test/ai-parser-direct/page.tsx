"use client"

// Direct AI Parser Test - bypasses database
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Loader2, Brain } from 'lucide-react'

export default function DirectAIParserTest() {
  const [resumeText, setResumeText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sampleResumeText = `John Smith
Security Professional
Phone: (555) 123-4567
Email: john.smith@email.com
Address: 123 Main St, Dallas, TX 75201

WORK EXPERIENCE
Security Guard - Allied Universal (2020-2023)
• Monitored surveillance systems and conducted regular patrols
• Responded to security incidents and alarms
• Maintained detailed incident reports
• Collaborated with law enforcement when necessary

Loss Prevention Officer - Target Corporation (2018-2020)
• Prevented theft and maintained store security
• Conducted investigations of suspicious activities
• Trained new security personnel
• Used CCTV systems for monitoring

CERTIFICATIONS
• Texas DPS Security License - Level II (Expires: 2025-03-15)
• CPR/First Aid Certified - American Red Cross (Expires: 2024-12-01)
• Security Guard Training - 40 Hour Course

EDUCATION
Associate Degree in Criminal Justice
Dallas Community College (2018)

REFERENCES
Mike Johnson, Security Supervisor
Allied Universal
Phone: (555) 987-6543
Email: mjohnson@allied.com`

  const handleDirectParse = async () => {
    if (!resumeText.trim()) {
      setError('Please enter resume text')
      return
    }

    try {
      setIsParsing(true)
      setError(null)

      // Call OpenAI directly with the text
      const response = await fetch('/api/test/ai-parse-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeText: resumeText.trim()
        })
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

  const loadSampleText = () => {
    setResumeText(sampleResumeText)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Direct AI Resume Parser Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resume-text">Resume Text</Label>
            <Textarea
              id="resume-text"
              placeholder="Paste resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={loadSampleText} variant="outline">
              Load Sample Resume
            </Button>
            
            <Button 
              onClick={handleDirectParse}
              disabled={!resumeText.trim() || isParsing}
              className="flex-1"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing with GPT-4...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Parse Resume with AI
                </>
              )}
            </Button>
          </div>

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
            <CardTitle>AI Parsing Results</CardTitle>
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
                <Label>Extracted Personal Info</Label>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-auto">
{JSON.stringify(results.extracted_fields?.personal_info, null, 2)}
                </pre>
              </div>

              <div>
                <Label>Work Experience</Label>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-auto">
{JSON.stringify(results.extracted_fields?.work_experience, null, 2)}
                </pre>
              </div>

              <div>
                <Label>Certifications</Label>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-auto">
{JSON.stringify(results.extracted_fields?.certifications, null, 2)}
                </pre>
              </div>

              <div>
                <Label>Processing Info</Label>
                <p className="text-sm text-muted-foreground">
                  Model: {results.processing_model} | Time: {results.processing_time_ms}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}