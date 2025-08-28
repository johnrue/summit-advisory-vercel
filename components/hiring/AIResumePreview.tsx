"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Brain, 
  Star, 
  Award, 
  Briefcase, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIResumePreviewProps {
  analysis: {
    experienceYears: number
    relevantSkills: string[]
    securityExperience: boolean
    certifications: string[]
    confidenceScore: number
    recommendations: string[]
    weaknesses?: string[]
    strengths?: string[]
  }
  resumeText?: string
  className?: string
}

export function AIResumePreview({ 
  analysis, 
  resumeText, 
  className 
}: AIResumePreviewProps) {
  const [showFullResume, setShowFullResume] = useState(false)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)

  const getConfidenceLevel = (score: number) => {
    if (score >= 85) return { level: 'excellent', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 70) return { level: 'good', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 50) return { level: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { level: 'poor', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const confidence = getConfidenceLevel(analysis.confidenceScore)

  const getSkillRelevance = (skill: string) => {
    const securitySkills = ['armed security', 'surveillance', 'patrol', 'access control', 'emergency response']
    const isHighlyRelevant = securitySkills.some(s => skill.toLowerCase().includes(s.toLowerCase()))
    return isHighlyRelevant ? 'high' : 'medium'
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary" />
          <span>AI Resume Analysis</span>
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </CardTitle>
        <CardDescription>
          Intelligent analysis of candidate qualifications and security experience
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Confidence Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Overall Confidence Score</h4>
            <div className={cn("px-3 py-1 rounded-full text-sm font-medium", confidence.bg, confidence.color)}>
              {analysis.confidenceScore}% {confidence.level}
            </div>
          </div>
          <Progress value={analysis.confidenceScore} className="h-2" />
          <p className="text-sm text-muted-foreground">
            Based on security experience, relevant skills, certifications, and overall qualifications
          </p>
        </div>

        <Separator />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <Briefcase className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{analysis.experienceYears}</p>
            <p className="text-sm text-muted-foreground">Years Experience</p>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <Star className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{analysis.relevantSkills.length}</p>
            <p className="text-sm text-muted-foreground">Relevant Skills</p>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{analysis.certifications.length}</p>
            <p className="text-sm text-muted-foreground">Certifications</p>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            {analysis.securityExperience ? (
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            )}
            <p className="text-2xl font-bold">
              {analysis.securityExperience ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-muted-foreground">Security Experience</p>
          </div>
        </div>

        {/* Skills Analysis */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center">
            <Star className="h-4 w-4 mr-2" />
            Relevant Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.relevantSkills.map((skill, index) => {
              const relevance = getSkillRelevance(skill)
              return (
                <Badge
                  key={index}
                  variant={relevance === 'high' ? 'default' : 'secondary'}
                  className={relevance === 'high' ? 'bg-primary' : ''}
                >
                  {skill}
                  {relevance === 'high' && <Star className="h-3 w-3 ml-1" />}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Certifications */}
        {analysis.certifications.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Certifications
            </h4>
            <div className="space-y-2">
              {analysis.certifications.map((cert, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{cert}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            AI Recommendations
          </h4>
          <div className="space-y-2">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Analysis (Collapsible) */}
        <Collapsible open={showDetailedAnalysis} onOpenChange={setShowDetailedAnalysis}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Brain className="h-4 w-4 mr-2" />
              {showDetailedAnalysis ? 'Hide' : 'Show'} Detailed Analysis
              {showDetailedAnalysis ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Strengths */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-green-700">Strengths</h5>
                <ul className="space-y-1">
                  {analysis.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {analysis.weaknesses && analysis.weaknesses.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-yellow-700">Areas for Development</h5>
                <ul className="space-y-1">
                  {analysis.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Resume Text (Collapsible) */}
        {resumeText && (
          <Collapsible open={showFullResume} onOpenChange={setShowFullResume}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                {showFullResume ? 'Hide' : 'Show'} Original Resume Text
                {showFullResume ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4">
              <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {resumeText}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Analysis Disclaimer */}
        <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
          <p className="flex items-center">
            <AlertCircle className="h-3 w-3 mr-2" />
            AI analysis is for reference only. Final hiring decisions should consider additional factors 
            including interviews, background checks, and reference verification.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}