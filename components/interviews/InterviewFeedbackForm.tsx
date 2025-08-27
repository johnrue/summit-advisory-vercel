"use client"

// Story 2.6: Interview Feedback Form Component  
// Comprehensive feedback system with structured ratings and hiring recommendations

import { useState, useCallback } from 'react'
import { Star, Send, User, MessageSquare, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { InterviewService } from '@/lib/services/interview-service'
import type { 
  InterviewFeedbackFormProps, 
  SubmitFeedbackRequest,
  RecommendationType 
} from '@/lib/types/interview-types'
import { cn } from '@/lib/utils'

const interviewService = new InterviewService()

const RECOMMENDATION_OPTIONS: { 
  value: RecommendationType
  label: string
  description: string
  color: string
}[] = [
  { 
    value: 'strong_hire', 
    label: 'Strong Hire', 
    description: 'Exceptional candidate, highly recommend hiring immediately',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  { 
    value: 'hire', 
    label: 'Hire', 
    description: 'Good candidate, recommend hiring with standard process',
    color: 'bg-green-50 text-green-700 border-green-150'
  },
  { 
    value: 'maybe_hire', 
    label: 'Maybe Hire', 
    description: 'Neutral candidate, conditional recommendation pending further evaluation',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  { 
    value: 'no_hire', 
    label: 'No Hire', 
    description: 'Not suitable for this position, do not recommend hiring',
    color: 'bg-red-50 text-red-700 border-red-200'
  },
  { 
    value: 'strong_no_hire', 
    label: 'Strong No Hire', 
    description: 'Definitely not suitable, strongly recommend against hiring',
    color: 'bg-red-100 text-red-800 border-red-300'
  }
]

const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Very Low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Below Average' },
  { value: 4, label: 'Somewhat Confident' },
  { value: 5, label: 'Moderately Confident' },
  { value: 6, label: 'Above Average' },
  { value: 7, label: 'Confident' },
  { value: 8, label: 'Very Confident' },
  { value: 9, label: 'Extremely Confident' },
  { value: 10, label: 'Completely Certain' }
]

interface RatingSection {
  id: keyof Pick<SubmitFeedbackRequest, 'technicalSkillsRating' | 'communicationRating' | 'culturalFitRating' | 'experienceRelevanceRating'>
  label: string
  description: string
  icon: any
}

const RATING_SECTIONS: RatingSection[] = [
  {
    id: 'technicalSkillsRating',
    label: 'Technical Skills',
    description: 'Job-related technical competencies and knowledge',
    icon: TrendingUp
  },
  {
    id: 'communicationRating',
    label: 'Communication Skills',
    description: 'Verbal communication, clarity, and professionalism',
    icon: MessageSquare
  },
  {
    id: 'culturalFitRating',
    label: 'Cultural Fit',
    description: 'Alignment with company values and team dynamics',
    icon: User
  },
  {
    id: 'experienceRelevanceRating',
    label: 'Experience Relevance',
    description: 'Relevance and quality of previous work experience',
    icon: Star
  }
]

export function InterviewFeedbackForm({
  interviewId,
  applicantInfo,
  onFeedbackSubmit,
  allowMultipleInterviewers = false,
  requiredRatings = [],
  className
}: InterviewFeedbackFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [strengths, setStrengths] = useState('')
  const [concerns, setConcerns] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [recommendation, setRecommendation] = useState<RecommendationType | ''>('')
  const [confidenceLevel, setConfidenceLevel] = useState(5)
  const [overallRating, setOverallRating] = useState<number[]>([7])
  const [hiringRecommendation, setHiringRecommendation] = useState<RecommendationType | ''>('')
  const [decisionRationale, setDecisionRationale] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRatingChange = useCallback((sectionId: string, value: number) => {
    setRatings(prev => ({ ...prev, [sectionId]: value }))
  }, [])

  const validateForm = useCallback((): string | null => {
    // Check required ratings
    for (const section of RATING_SECTIONS) {
      if (requiredRatings.includes(section.id) && !ratings[section.id]) {
        return `Please provide a rating for ${section.label}`
      }
    }
    
    if (!recommendation) {
      return 'Please provide your interview recommendation'
    }
    
    if (!strengths.trim()) {
      return 'Please provide candidate strengths'
    }
    
    if ((recommendation === 'no_hire' || recommendation === 'strong_no_hire') && !concerns.trim()) {
      return 'Please provide concerns for negative recommendations'
    }
    
    return null
  }, [ratings, recommendation, strengths, concerns, requiredRatings])

  const handleSubmitFeedback = useCallback(async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const feedbackRequest: SubmitFeedbackRequest = {
        interviewId,
        technicalSkillsRating: ratings.technicalSkillsRating,
        communicationRating: ratings.communicationRating,
        culturalFitRating: ratings.culturalFitRating,
        experienceRelevanceRating: ratings.experienceRelevanceRating,
        strengths,
        concerns: concerns || undefined,
        additionalNotes: additionalNotes || undefined,
        recommendation: recommendation as RecommendationType,
        confidenceLevel,
        overallRating: overallRating[0],
        hiringRecommendation: hiringRecommendation as RecommendationType || undefined,
        decisionRationale: decisionRationale || undefined
      }

      const result = await interviewService.submitFeedback(feedbackRequest)

      if (result.success) {
        setSuccess(true)
        await onFeedbackSubmit(feedbackRequest)
        
        setTimeout(() => {
          setSuccess(false)
        }, 3000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to submit feedback. Please try again.')
      console.error('Feedback submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    interviewId,
    ratings,
    strengths,
    concerns,
    additionalNotes,
    recommendation,
    confidenceLevel,
    overallRating,
    hiringRecommendation,
    decisionRationale,
    onFeedbackSubmit,
    validateForm
  ])

  const selectedRecommendation = RECOMMENDATION_OPTIONS.find(opt => opt.value === recommendation)

  return (
    <Card className={cn("w-full max-w-4xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Interview Feedback
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Provide structured feedback for {applicantInfo.firstName} {applicantInfo.lastName}
        </p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Success Message */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Interview feedback submitted successfully! Application status has been updated.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Rating Sections */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Performance Ratings</h3>
          
          {RATING_SECTIONS.map((section) => {
            const IconComponent = section.icon
            const currentRating = ratings[section.id] || 5
            
            return (
              <div key={section.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  <Label className="font-medium">{section.label}</Label>
                  {requiredRatings.includes(section.id) && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">{section.description}</p>
                
                <div className="space-y-2">
                  <Slider
                    value={[currentRating]}
                    onValueChange={([value]) => handleRatingChange(section.id, value)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Poor (1)</span>
                    <span className="font-medium">Rating: {currentRating}/10</span>
                    <span>Excellent (10)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        {/* Overall Rating */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold">Overall Interview Rating</Label>
          <p className="text-sm text-muted-foreground">
            Your overall impression of this candidate's interview performance
          </p>
          
          <div className="space-y-2">
            <Slider
              value={overallRating}
              onValueChange={setOverallRating}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Poor (1)</span>
              <span className="font-medium">Overall: {overallRating[0]}/10</span>
              <span>Excellent (10)</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Qualitative Feedback */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Detailed Feedback</h3>
          
          {/* Strengths */}
          <div className="space-y-2">
            <Label htmlFor="strengths">Candidate Strengths *</Label>
            <Textarea
              id="strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Describe the candidate's key strengths, positive qualities, and impressive aspects of their performance..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Concerns */}
          <div className="space-y-2">
            <Label htmlFor="concerns">Areas of Concern</Label>
            <Textarea
              id="concerns"
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="Note any concerns, weaknesses, or areas where the candidate may need development..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes">Additional Notes</Label>
            <Textarea
              id="additional-notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional observations, questions asked, or relevant interview details..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <Separator />

        {/* Recommendation Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Interview Recommendation</h3>
          
          {/* Interview Recommendation */}
          <div className="space-y-3">
            <Label>Your Recommendation *</Label>
            <Select value={recommendation} onValueChange={setRecommendation}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your recommendation" />
              </SelectTrigger>
              <SelectContent>
                {RECOMMENDATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="space-y-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedRecommendation && (
              <div className={cn("rounded-lg p-3 border", selectedRecommendation.color)}>
                <div className="font-medium">{selectedRecommendation.label}</div>
                <div className="text-xs mt-1">{selectedRecommendation.description}</div>
              </div>
            )}
          </div>

          {/* Confidence Level */}
          <div className="space-y-3">
            <Label>Confidence in Assessment</Label>
            <Select value={confidenceLevel.toString()} onValueChange={(value) => setConfidenceLevel(parseInt(value))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value.toString()}>
                    {level.label} ({level.value}/10)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Final Hiring Recommendation */}
          <div className="space-y-3">
            <Label>Final Hiring Recommendation</Label>
            <Select value={hiringRecommendation} onValueChange={setHiringRecommendation}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select final hiring recommendation (optional)" />
              </SelectTrigger>
              <SelectContent>
                {RECOMMENDATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Decision Rationale */}
          <div className="space-y-2">
            <Label htmlFor="decision-rationale">Decision Rationale</Label>
            <Textarea
              id="decision-rationale"
              value={decisionRationale}
              onChange={(e) => setDecisionRationale(e.target.value)}
              placeholder="Provide reasoning for your hiring recommendation, key factors considered, and next steps..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmitFeedback}
          disabled={isSubmitting || !recommendation}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Submitting Feedback...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Interview Feedback
            </>
          )}
        </Button>

        {/* Form Requirements */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>* Required fields</p>
          <p>• All ratings are on a 1-10 scale where 1 = Poor and 10 = Excellent</p>
          <p>• Detailed feedback helps improve hiring decisions and candidate experience</p>
          <p>• This feedback will be saved to the candidate's interview history</p>
        </div>
      </CardContent>
    </Card>
  )
}