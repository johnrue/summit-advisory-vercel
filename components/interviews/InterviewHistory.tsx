"use client"

// Story 2.6: Interview History Component
// Comprehensive interview tracking with multi-round support and historical data

import { useState, useEffect, useCallback } from 'react'
import { History, Calendar, User, Star, MessageSquare, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { InterviewService } from '@/lib/services/interview-service'
import type { 
  Interview, 
  InterviewHistoryProps,
  InterviewType,
  InterviewStatus,
  RecommendationType 
} from '@/lib/types/interview-types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const interviewService = new InterviewService()

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  'initial': 'Initial Screening',
  'technical': 'Technical Assessment',
  'behavioral': 'Behavioral Interview',
  'final': 'Final Interview',
  'follow_up': 'Follow-up Interview'
}

const STATUS_CONFIG: Record<InterviewStatus, { 
  label: string
  color: string
  icon: any
}> = {
  'scheduled': { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  'confirmed': { label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  'in_progress': { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  'no_show': { label: 'No Show', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  'rescheduled': { label: 'Rescheduled', color: 'bg-orange-100 text-orange-800', icon: Calendar }
}

const RECOMMENDATION_COLORS: Record<RecommendationType, string> = {
  'strong_hire': 'bg-green-500 text-white',
  'hire': 'bg-green-100 text-green-800',
  'maybe_hire': 'bg-yellow-100 text-yellow-800',
  'no_hire': 'bg-red-100 text-red-800',
  'strong_no_hire': 'bg-red-500 text-white'
}

interface InterviewHistoryItemProps {
  interview: Interview
  onScheduleFollowUp?: () => void
}

function InterviewHistoryItem({ interview, onScheduleFollowUp }: InterviewHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const statusConfig = STATUS_CONFIG[interview.status]
  const StatusIcon = statusConfig.icon
  
  const canScheduleFollowUp = interview.status === 'completed' && interview.interviewType !== 'final'
  
  return (
    <Card className="w-full">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4" />
                  <div>
                    <CardTitle className="text-base">
                      {INTERVIEW_TYPE_LABELS[interview.interviewType]}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(interview.scheduledAt, 'PPP \'at\' p')} • {interview.durationMinutes} min
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {interview.overallRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">{interview.overallRating}/10</span>
                  </div>
                )}
                
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
                
                {interview.hiringRecommendation && (
                  <Badge className={RECOMMENDATION_COLORS[interview.hiringRecommendation]}>
                    {interview.hiringRecommendation.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Interview Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Mode:</span> {interview.interviewMode}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {interview.durationMinutes} minutes
                </div>
                {interview.interviewLocation && (
                  <div className="col-span-2">
                    <span className="font-medium">Location:</span> {interview.interviewLocation}
                  </div>
                )}
              </div>
              
              {/* Meeting Notes */}
              {interview.meetingNotes && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Meeting Notes
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap">{interview.meetingNotes}</p>
                  </div>
                </div>
              )}
              
              {/* Decision Rationale */}
              {interview.decisionRationale && (
                <div className="space-y-2">
                  <h4 className="font-medium">Decision Rationale</h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap">{interview.decisionRationale}</p>
                  </div>
                </div>
              )}
              
              {/* Cancellation Info */}
              {interview.status === 'cancelled' && interview.cancellationReason && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Cancellation Reason</h4>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-sm text-red-800">{interview.cancellationReason}</p>
                    {interview.cancelledAt && (
                      <p className="text-xs text-red-600 mt-1">
                        Cancelled on {format(interview.cancelledAt, 'PPP \'at\' p')}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {canScheduleFollowUp && (
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onScheduleFollowUp}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule Follow-up
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export function InterviewHistory({
  applicationId,
  showAllRounds = true,
  enableScheduling = false,
  className
}: InterviewHistoryProps) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInterviewHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await interviewService.getInterviewHistory(applicationId)

      if (result.success) {
        setInterviews(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to load interview history')
      console.error('Interview history error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    loadInterviewHistory()
  }, [loadInterviewHistory])

  const handleScheduleFollowUp = useCallback(() => {
    // This would trigger the interview scheduler for a follow-up interview
    console.log('Schedule follow-up interview')
  }, [])

  // Calculate interview statistics
  const completedInterviews = interviews.filter(i => i.status === 'completed')
  const averageRating = completedInterviews.length > 0 
    ? completedInterviews.reduce((sum, i) => sum + (i.overallRating || 0), 0) / completedInterviews.length 
    : 0

  const latestRecommendation = completedInterviews
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0]?.hiringRecommendation

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading interview history...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Interview History
          <Badge variant="outline" className="ml-auto">
            {interviews.length} {interviews.length === 1 ? 'Interview' : 'Interviews'}
          </Badge>
        </CardTitle>
        
        {interviews.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {completedInterviews.length > 0 && (
              <>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Avg Rating: {averageRating.toFixed(1)}/10</span>
                </div>
                
                {latestRecommendation && (
                  <Badge className={cn("text-xs", RECOMMENDATION_COLORS[latestRecommendation])}>
                    Latest: {latestRecommendation.replace('_', ' ')}
                  </Badge>
                )}
              </>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {interviews.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Interviews Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No interviews have been scheduled for this application.
            </p>
            {enableScheduling && (
              <Button onClick={handleScheduleFollowUp}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule First Interview
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {interviews.map((interview, index) => (
                <div key={interview.id}>
                  <InterviewHistoryItem
                    interview={interview}
                    onScheduleFollowUp={handleScheduleFollowUp}
                  />
                  {index < interviews.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Interview Rounds Summary */}
        {interviews.length > 1 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium mb-3">Interview Rounds Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {Object.entries(
                interviews.reduce((acc, interview) => {
                  acc[interview.interviewType] = (acc[interview.interviewType] || 0) + 1
                  return acc
                }, {} as Record<InterviewType, number>)
              ).map(([type, count]) => (
                <div key={type} className="bg-muted/50 rounded-lg p-3">
                  <div className="text-lg font-semibold">{count}</div>
                  <div className="text-xs text-muted-foreground">
                    {INTERVIEW_TYPE_LABELS[type as InterviewType]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}