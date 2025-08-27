"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  FileText, 
  Mail, 
  Clock, 
  User,
  MessageSquare,
  Appeal,
  Send,
  Eye
} from 'lucide-react'
import type { 
  HiringDecision,
  ApprovalReason
} from '@/lib/types/approval-workflow'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface RejectionWorkflowProps {
  decision: HiringDecision
  applicantData: Record<string, any>
  onSendNotification?: (notificationData: RejectionNotificationData) => Promise<void>
  onAppealProcess?: (appealData: AppealRequestData) => Promise<void>
  showAppealOption?: boolean
  className?: string
}

export interface RejectionNotificationData {
  decisionId: string
  applicantEmail: string
  rejectionReason: string
  feedback?: string
  appealInstructions?: string
  appealDeadline: Date
  isRespectful: boolean
  customMessage?: string
}

export interface AppealRequestData {
  decisionId: string
  applicantId: string
  appealReason: string
  additionalEvidence?: string
  requestedReviewDate?: Date
}

const REJECTION_REASON_LABELS: Record<ApprovalReason, string> = {
  'insufficient_experience': 'Insufficient Experience',
  'failed_background': 'Background Check Issues',
  'poor_interview': 'Interview Performance Concerns',
  'cultural_fit': 'Cultural Fit Concerns',
  'position_filled': 'Position Already Filled',
  'qualifications_met': 'Qualifications Met',
  'exceptional_candidate': 'Exceptional Candidate',
  'conditional_approval': 'Conditional Approval',
  'applicant_withdrew': 'Applicant Withdrew',
  'other': 'Other Reason'
}

const REJECTION_REASON_DESCRIPTIONS: Record<ApprovalReason, string> = {
  'insufficient_experience': 'The applicant lacks the required experience for this position.',
  'failed_background': 'Background check revealed issues that prevent employment.',
  'poor_interview': 'Interview performance did not meet our standards.',
  'cultural_fit': 'Concerns about alignment with company culture and values.',
  'position_filled': 'The position has been filled by another candidate.',
  'qualifications_met': '',
  'exceptional_candidate': '',
  'conditional_approval': '',
  'applicant_withdrew': 'The applicant voluntarily withdrew their application.',
  'other': 'Rejection reason specified in the rationale.'
}

export const RejectionWorkflow: React.FC<RejectionWorkflowProps> = ({
  decision,
  applicantData,
  onSendNotification,
  onAppealProcess,
  showAppealOption = true,
  className
}) => {
  const [customMessage, setCustomMessage] = useState('')
  const [appealReason, setAppealReason] = useState('')
  const [additionalEvidence, setAdditionalEvidence] = useState('')
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false)
  const [notificationSent, setNotificationSent] = useState(false)
  const [showAppealForm, setShowAppealForm] = useState(false)

  const handleSendNotification = async () => {
    if (!onSendNotification) return

    setIsSendingNotification(true)
    try {
      const notificationData: RejectionNotificationData = {
        decisionId: decision.id,
        applicantEmail: applicantData.email,
        rejectionReason: REJECTION_REASON_LABELS[decision.decisionReason],
        feedback: decision.supportingEvidence?.feedback,
        appealInstructions: decision.supportingEvidence?.appeal_instructions,
        appealDeadline: decision.appealsDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRespectful: decision.supportingEvidence?.respectful_notification ?? true,
        customMessage: customMessage || undefined
      }

      await onSendNotification(notificationData)
      setNotificationSent(true)
      toast.success('Rejection notification sent successfully')
    } catch (error) {
      toast.error('Failed to send rejection notification')
      console.error('Notification error:', error)
    } finally {
      setIsSendingNotification(false)
    }
  }

  const handleAppealSubmission = async () => {
    if (!onAppealProcess || !appealReason.trim()) {
      toast.error('Please provide an appeal reason')
      return
    }

    setIsSubmittingAppeal(true)
    try {
      const appealData: AppealRequestData = {
        decisionId: decision.id,
        applicantId: applicantData.id,
        appealReason: appealReason.trim(),
        additionalEvidence: additionalEvidence.trim() || undefined,
        requestedReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }

      await onAppealProcess(appealData)
      toast.success('Appeal request submitted successfully')
      setShowAppealForm(false)
    } catch (error) {
      toast.error('Failed to submit appeal request')
      console.error('Appeal submission error:', error)
    } finally {
      setIsSubmittingAppeal(false)
    }
  }

  const getReasonBadgeColor = (reason: ApprovalReason): string => {
    const colorMap = {
      'insufficient_experience': 'bg-orange-100 text-orange-800 border-orange-300',
      'failed_background': 'bg-red-100 text-red-800 border-red-300',
      'poor_interview': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'cultural_fit': 'bg-purple-100 text-purple-800 border-purple-300',
      'position_filled': 'bg-blue-100 text-blue-800 border-blue-300',
      'applicant_withdrew': 'bg-gray-100 text-gray-800 border-gray-300',
      'other': 'bg-slate-100 text-slate-800 border-slate-300',
      'qualifications_met': '',
      'exceptional_candidate': '',
      'conditional_approval': ''
    }
    
    return colorMap[reason] || 'bg-slate-100 text-slate-800 border-slate-300'
  }

  const applicantName = `${applicantData.first_name || ''} ${applicantData.last_name || ''}`.trim()
  const isAppealable = decision.appealsDeadline && new Date() < decision.appealsDeadline && !decision.isFinal

  return (
    <div className={cn("space-y-6", className)}>
      {/* Rejection Decision Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Rejection Decision - {applicantName}
            </CardTitle>
            <Badge variant="destructive">
              Rejected
            </Badge>
          </div>
          <CardDescription>
            Decision made on {decision.createdAt.toLocaleDateString()} with {decision.decisionConfidence}/10 confidence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Rejection Reason</h4>
              <Badge className={getReasonBadgeColor(decision.decisionReason)}>
                {REJECTION_REASON_LABELS[decision.decisionReason]}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                {REJECTION_REASON_DESCRIPTIONS[decision.decisionReason]}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Decision Details</h4>
              <div className="space-y-1 text-sm">
                <div>Authority Level: {decision.authorityLevel}</div>
                <div>Confidence: {decision.decisionConfidence}/10</div>
                {decision.appealsDeadline && (
                  <div>Appeals Deadline: {decision.appealsDeadline.toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </div>

          {decision.decisionRationale && (
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Decision Rationale</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{decision.decisionRationale}</p>
              </div>
            </div>
          )}

          {decision.supportingEvidence?.feedback && (
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Constructive Feedback</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">{decision.supportingEvidence.feedback}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Rejection Notification
          </CardTitle>
          <CardDescription>
            Send respectful rejection notification to the applicant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!notificationSent ? (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Professional Communication</AlertTitle>
                <AlertDescription>
                  The rejection notification will be sent with respect and professionalism,
                  including constructive feedback and appeal instructions where applicable.
                </AlertDescription>
              </Alert>

              <div>
                <label className="text-sm font-medium">Custom Message (Optional)</label>
                <Textarea
                  placeholder="Add a personal message to the rejection notification..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be included in addition to the standard rejection notification.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSendNotification}
                  disabled={isSendingNotification}
                  className="flex items-center gap-2"
                >
                  {isSendingNotification ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Rejection Notification
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview Email
                </Button>
              </div>
            </>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <Mail className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Notification Sent</AlertTitle>
              <AlertDescription className="text-green-700">
                Rejection notification has been sent to {applicantData.email} on {new Date().toLocaleString()}.
                The applicant has been provided with feedback and appeal instructions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Appeal Process */}
      {showAppealOption && isAppealable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Appeal className="h-5 w-5" />
              Appeal Process
            </CardTitle>
            <CardDescription>
              Manage appeal requests for this rejection decision
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showAppealForm ? (
              <div className="space-y-3">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Appeal Window Open</AlertTitle>
                  <AlertDescription>
                    This decision can be appealed until {decision.appealsDeadline?.toLocaleDateString()}.
                    Appeals will be reviewed by a different manager for fairness.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAppealForm(true)}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Submit Appeal Request
                  </Button>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View Appeal Guidelines
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Appeal Submission</AlertTitle>
                  <AlertDescription>
                    Provide detailed reasons for appealing this rejection decision.
                    Appeals are reviewed by an independent manager.
                  </AlertDescription>
                </Alert>

                <div>
                  <label className="text-sm font-medium">Appeal Reason *</label>
                  <Textarea
                    placeholder="Explain why you believe this rejection decision should be reconsidered..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide specific reasons why the original decision may have been incorrect.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Additional Evidence (Optional)</label>
                  <Textarea
                    placeholder="Provide any additional evidence or documentation that supports your appeal..."
                    value={additionalEvidence}
                    onChange={(e) => setAdditionalEvidence(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include any new information that wasn't considered in the original decision.
                  </p>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleAppealSubmission}
                    disabled={isSubmittingAppeal || !appealReason.trim()}
                    className="flex items-center gap-2"
                  >
                    {isSubmittingAppeal ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit Appeal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAppealForm(false)}
                    disabled={isSubmittingAppeal}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Decision Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Decision Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <div className="flex-1">
                <div className="font-medium text-sm">Rejection Decision Made</div>
                <div className="text-xs text-gray-500">
                  {decision.createdAt.toLocaleString()} by {decision.approverId}
                </div>
              </div>
            </div>

            {notificationSent && (
              <div className="flex items-center gap-3 pb-2 border-b">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Notification Sent</div>
                  <div className="text-xs text-gray-500">
                    Respectful rejection notification sent to applicant
                  </div>
                </div>
              </div>
            )}

            {decision.appealsDeadline && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Appeal Deadline</div>
                  <div className="text-xs text-gray-500">
                    Appeals accepted until {decision.appealsDeadline.toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}