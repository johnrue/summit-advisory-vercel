"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Bot, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb, 
  ArrowRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Target
} from 'lucide-react'
import { toast } from 'sonner'

import { GuardProfileService } from '@/lib/services/guard-profile-service'
import type { CompletionSuggestion, ComplianceValidation } from '@/lib/types/guard-profile'

interface Props {
  profileId: string
  onSuggestionApplied?: () => void
  className?: string
}

interface FieldSuggestion extends CompletionSuggestion {
  isApplied?: boolean
  feedback?: 'helpful' | 'not-helpful'
}

export function ProfileCompletionAssistant({ 
  profileId, 
  onSuggestionApplied, 
  className 
}: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [compliance, setCompliance] = useState<ComplianceValidation | null>(null)
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([])
  const [activeSuggestions, setActiveSuggestions] = useState<Record<string, FieldSuggestion[]>>({})
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)

  const guardProfileService = new GuardProfileService()

  // Load initial compliance data
  useEffect(() => {
    loadComplianceData()
  }, [profileId])

  const loadComplianceData = async () => {
    setIsLoading(true)
    try {
      const result = await guardProfileService.validateProfileCompleteness(profileId)
      if (result.success && result.data) {
        setCompliance(result.data)
      }
    } catch (error) {
      toast.error('Failed to load compliance data')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSuggestions = async (fieldName: string, partialValue: string = '') => {
    setIsGeneratingSuggestions(true)
    try {
      const result = await guardProfileService.generateCompletionSuggestions(
        profileId, 
        fieldName, 
        partialValue
      )

      if (result.success && result.data) {
        const newSuggestions = result.data.map(suggestion => ({
          ...suggestion,
          isApplied: false
        }))
        
        setActiveSuggestions(prev => ({
          ...prev,
          [fieldName]: newSuggestions
        }))

        toast.success(`Generated ${result.data.length} suggestions for ${fieldName}`)
      } else {
        toast.error(`Failed to generate suggestions: ${result.error}`)
      }
    } catch (error) {
      toast.error('AI assistant temporarily unavailable')
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const applySuggestion = async (fieldName: string, suggestion: FieldSuggestion) => {
    // Mark as applied
    setActiveSuggestions(prev => ({
      ...prev,
      [fieldName]: prev[fieldName]?.map(s => 
        s.suggestedValue === suggestion.suggestedValue 
          ? { ...s, isApplied: true }
          : s
      ) || []
    }))

    // Notify parent component
    onSuggestionApplied?.()

    toast.success('Suggestion applied successfully')
  }

  const provideFeedback = (suggestion: FieldSuggestion, feedback: 'helpful' | 'not-helpful') => {
    setSuggestions(prev => 
      prev.map(s => 
        s.suggestedValue === suggestion.suggestedValue 
          ? { ...s, feedback }
          : s
      )
    )

    toast.success(`Thank you for your feedback!`)
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getComplianceStatus = (score: number) => {
    if (score >= 90) return { status: 'Compliant', color: 'bg-green-600' }
    if (score >= 70) return { status: 'Needs Attention', color: 'bg-yellow-600' }
    return { status: 'Non-Compliant', color: 'bg-red-600' }
  }

  if (!compliance) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading AI assistant...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const complianceStatus = getComplianceStatus(compliance.score)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>AI Completion Assistant</CardTitle>
          </div>
          <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
        <CardDescription>
          Get intelligent suggestions to complete your profile and improve compliance
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Compliance Score Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Compliance Score</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getComplianceColor(compliance.score)}`}>
                {compliance.score}%
              </span>
              <Badge className={complianceStatus.color}>
                {complianceStatus.status}
              </Badge>
            </div>
          </div>
          
          <Progress value={compliance.score} className="w-full" />
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>Target: 90%</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Missing Fields Alert */}
        {compliance.missingFields.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Missing Information:</strong>{' '}
              {compliance.missingFields.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Expiring Documents Alert */}
        {compliance.expiringDocuments.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Expiring Documents:</strong>{' '}
              {compliance.expiringDocuments.length} document(s) expiring within 30 days
            </AlertDescription>
          </Alert>
        )}

        {/* AI Recommendations */}
        {compliance.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Smart Recommendations
            </h4>
            
            <div className="space-y-2">
              {compliance.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Quick Actions</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateSuggestions('employeeNumber')}
              disabled={isGeneratingSuggestions}
            >
              <Bot className="h-4 w-4 mr-2" />
              Generate Employee ID
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateSuggestions('placeOfBirth')}
              disabled={isGeneratingSuggestions}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Suggest Birth Location
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  View All Suggestions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>AI Completion Suggestions</DialogTitle>
                  <DialogDescription>
                    Smart suggestions to improve your profile completeness
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(activeSuggestions).map(([fieldName, fieldSuggestions]) => (
                    <div key={fieldName} className="space-y-2">
                      <h5 className="font-medium text-sm capitalize">
                        {fieldName.replace(/([A-Z])/g, ' $1').trim()}
                      </h5>
                      
                      {fieldSuggestions.map((suggestion, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {suggestion.suggestedValue}
                            </span>
                            <Badge variant={suggestion.confidence >= 0.8 ? 'default' : 'secondary'}>
                              {Math.round(suggestion.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {suggestion.reasoning}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Source: {suggestion.source}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {suggestion.isApplied ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Applied
                                </Badge>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => applySuggestion(fieldName, suggestion)}
                                  >
                                    Apply
                                  </Button>
                                  
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => provideFeedback(suggestion, 'helpful')}
                                      className={suggestion.feedback === 'helpful' ? 'bg-green-50' : ''}
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                    </Button>
                                    
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => provideFeedback(suggestion, 'not-helpful')}
                                      className={suggestion.feedback === 'not-helpful' ? 'bg-red-50' : ''}
                                    >
                                      <ThumbsDown className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {Object.keys(activeSuggestions).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No suggestions generated yet.</p>
                      <p className="text-sm">Use the quick actions to generate smart suggestions.</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadComplianceData}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Score
            </Button>
          </div>
        </div>

        {/* Compliance Tips */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Compliance Tips</h4>
          
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Complete all required fields for better compliance scores</span>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Upload high-quality, clear photographs for faster approval</span>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Ensure document expiry dates are up to date</span>
            </div>
            
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Provide a valid TOPS profile URL when available</span>
            </div>
          </div>
        </div>

        {/* AI Status */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>AI Assistant Active</span>
          </div>
          
          <span className="text-xs text-muted-foreground">
            Powered by OpenAI
          </span>
        </div>
      </CardContent>
    </Card>
  )
}