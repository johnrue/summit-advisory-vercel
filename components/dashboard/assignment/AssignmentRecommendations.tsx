"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Separator } from '@/components/ui/separator'
import { getAssignmentRecommendations, assignLead, AssignmentRecommendation } from '@/lib/services/unified-assignment-service'
import { User, Target, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface AssignmentRecommendationsProps {
  unassignedLeadIds: string[]
  refreshTrigger?: number
  onAssignmentComplete?: (leadId: string, managerId: string) => void
}

export function AssignmentRecommendations({ 
  unassignedLeadIds, 
  refreshTrigger, 
  onAssignmentComplete 
}: AssignmentRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<AssignmentRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [assigningLeads, setAssigningLeads] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (unassignedLeadIds.length > 0) {
      fetchRecommendations()
    } else {
      setRecommendations([])
      setIsLoading(false)
    }
  }, [unassignedLeadIds, refreshTrigger])

  const fetchRecommendations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await getAssignmentRecommendations(unassignedLeadIds)
      
      if (result.success && result.data) {
        setRecommendations(result.data)
      } else {
        setError(result.error || 'Failed to fetch recommendations')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignLead = async (recommendation: AssignmentRecommendation) => {
    if (!recommendation.recommendedManagerId) {
      toast.error('No manager recommended for this lead')
      return
    }

    setAssigningLeads(prev => new Set([...prev, recommendation.leadId]))

    try {
      // Determine lead type by checking if it exists in client or guard table
      // For now, we'll need to make this determination based on the lead data
      // This is a simplified approach - in practice, you'd track this in the recommendation
      const leadType = 'client' // This should be determined from the actual lead data
      
      const result = await assignLead(
        recommendation.leadId,
        leadType,
        recommendation.recommendedManagerId,
        'current-user-id' // This should come from auth context
      )

      if (result.success) {
        toast.success(`Lead assigned to ${recommendation.managerName}`)
        
        // Remove the assigned lead from recommendations
        setRecommendations(prev => 
          prev.filter(rec => rec.leadId !== recommendation.leadId)
        )
        
        // Notify parent component
        onAssignmentComplete?.(recommendation.leadId, recommendation.recommendedManagerId)
      } else {
        toast.error(result.error || 'Failed to assign lead')
      }
    } catch (error) {
      toast.error('An unexpected error occurred during assignment')
    } finally {
      setAssigningLeads(prev => {
        const newSet = new Set(prev)
        newSet.delete(recommendation.leadId)
        return newSet
      })
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { variant: 'default' as const, label: 'High Confidence' }
    if (confidence >= 60) return { variant: 'secondary' as const, label: 'Medium Confidence' }
    return { variant: 'outline' as const, label: 'Low Confidence' }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assignment Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" />
            <span className="ml-2 text-muted-foreground">Generating recommendations...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assignment Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to generate recommendations</p>
            <p className="text-xs mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={fetchRecommendations}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assignment Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">All leads have been assigned!</p>
            <p className="text-xs mt-1">No unassigned leads requiring recommendations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment Recommendations</CardTitle>
        <p className="text-sm text-muted-foreground">
          Smart recommendations for {recommendations.length} unassigned lead{recommendations.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recommendations.map((recommendation, index) => {
            const isAssigning = assigningLeads.has(recommendation.leadId)
            const badge = getConfidenceBadge(recommendation.confidence)
            
            return (
              <div key={recommendation.leadId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-medium text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Lead {recommendation.leadId.slice(-8)}</h4>
                      <p className="text-sm text-muted-foreground">
                        Requires assignment
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant={badge.variant} className="text-xs">
                    {badge.label}
                  </Badge>
                </div>

                {recommendation.recommendedManagerId ? (
                  <>
                    {/* Recommended Manager */}
                    <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Recommended: {recommendation.managerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          <span className={`text-sm font-medium ${getConfidenceColor(recommendation.confidence)}`}>
                            {recommendation.confidence}% confidence
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-3">
                        <strong>Reasoning:</strong> {recommendation.reasoning.join(', ')}
                      </div>

                      <Button 
                        onClick={() => handleAssignLead(recommendation)}
                        disabled={isAssigning || recommendation.confidence < 50}
                        className="w-full"
                      >
                        {isAssigning ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Assigning...
                          </>
                        ) : (
                          'Assign to ' + recommendation.managerName
                        )}
                      </Button>
                    </div>

                    {/* Alternative Managers */}
                    {recommendation.alternativeManagers.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">
                          Alternative Options:
                        </h5>
                        <div className="space-y-2">
                          {recommendation.alternativeManagers.map((alternative, altIndex) => (
                            <div 
                              key={alternative.managerId}
                              className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                            >
                              <div>
                                <span className="font-medium">{alternative.managerName}</span>
                                <span className="text-muted-foreground ml-2">
                                  ({alternative.reasoning})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${getConfidenceColor(alternative.confidence)}`}>
                                  {alternative.confidence}%
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={isAssigning}
                                  onClick={() => {
                                    // Handle alternative assignment
                                    const altRecommendation = {
                                      ...recommendation,
                                      recommendedManagerId: alternative.managerId,
                                      managerName: alternative.managerName,
                                      confidence: alternative.confidence
                                    }
                                    handleAssignLead(altRecommendation)
                                  }}
                                >
                                  Assign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm font-medium">No Available Managers</p>
                    <p className="text-xs text-muted-foreground">
                      {recommendation.reasoning.join(', ')}
                    </p>
                  </div>
                )}

                {index < recommendations.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            )
          })}
        </div>

        {/* Bulk Actions */}
        {recommendations.filter(r => r.recommendedManagerId && r.confidence >= 70).length > 1 && (
          <div className="mt-6 pt-6 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // Handle bulk assignment for high-confidence recommendations
                const highConfidenceRecs = recommendations.filter(r => 
                  r.recommendedManagerId && r.confidence >= 70
                )
                highConfidenceRecs.forEach(rec => handleAssignLead(rec))
              }}
              disabled={assigningLeads.size > 0}
            >
              Auto-Assign High Confidence Recommendations ({
                recommendations.filter(r => r.recommendedManagerId && r.confidence >= 70).length
              })
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}