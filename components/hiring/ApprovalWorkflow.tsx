"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  XCircle, 
  Users, 
  FileSignature, 
  AlertTriangle,
  Clock,
  User,
  Calendar
} from 'lucide-react'
import { DigitalSignature } from './DigitalSignature'
import { cn } from '@/lib/utils'

interface ApprovalWorkflowProps {
  application: {
    id: string
    applicantName: string
    applicantEmail: string
    status: string
    aiAnalysis?: {
      confidenceScore: number
      recommendations: string[]
    }
    backgroundCheck?: {
      cleared: boolean
      status: string
    }
  }
  onApprovalAction: (action: 'approve' | 'reject' | 'delegate', data: any) => void
  isProcessing: boolean
}

interface ApprovalDecision {
  action: 'approve' | 'reject' | 'delegate' | null
  reason: string
  rejectionCategory?: string
  delegateTo?: string
  digitalSignature?: string
  notes: string
}

const REJECTION_CATEGORIES = [
  { value: 'background_check', label: 'Background Check Issues' },
  { value: 'experience', label: 'Insufficient Experience' },
  { value: 'qualifications', label: 'Missing Qualifications' },
  { value: 'interview_performance', label: 'Interview Performance' },
  { value: 'documentation', label: 'Documentation Issues' },
  { value: 'other', label: 'Other Reasons' }
]

const DELEGATION_MANAGERS = [
  { value: 'sarah.johnson', label: 'Sarah Johnson - Regional Manager' },
  { value: 'mike.davis', label: 'Mike Davis - Operations Manager' },
  { value: 'lisa.chen', label: 'Lisa Chen - Training Manager' }
]

export function ApprovalWorkflow({ 
  application, 
  onApprovalAction, 
  isProcessing 
}: ApprovalWorkflowProps) {
  const [decision, setDecision] = useState<ApprovalDecision>({
    action: null,
    reason: '',
    notes: '',
    rejectionCategory: undefined,
    delegateTo: undefined,
    digitalSignature: undefined
  })
  
  const [showSignature, setShowSignature] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateDecision = (field: keyof ApprovalDecision, value: any) => {
    setDecision(prev => ({ ...prev, [field]: value }))
    setValidationError(null)
  }

  const validateDecision = (): boolean => {
    if (!decision.action) {
      setValidationError('Please select an approval action')
      return false
    }

    if (!decision.reason.trim()) {
      setValidationError('Please provide a reason for your decision')
      return false
    }

    if (decision.action === 'reject' && !decision.rejectionCategory) {
      setValidationError('Please select a rejection category')
      return false
    }

    if (decision.action === 'delegate' && !decision.delegateTo) {
      setValidationError('Please select a manager to delegate to')
      return false
    }

    if (!decision.digitalSignature) {
      setValidationError('Digital signature is required for all approval decisions')
      return false
    }

    return true
  }

  const handleSubmitDecision = async () => {
    if (!validateDecision()) return

    const approvalData = {
      reason: decision.reason,
      notes: decision.notes,
      rejectionCategory: decision.rejectionCategory,
      delegateTo: decision.delegateTo,
      digitalSignature: decision.digitalSignature,
      timestamp: new Date().toISOString()
    }

    await onApprovalAction(decision.action!, approvalData)
  }

  const getRecommendationScore = () => {
    if (!application.aiAnalysis) return null

    const score = application.aiAnalysis.confidenceScore
    if (score >= 80) return { level: 'high', color: 'bg-green-500', text: 'Highly Recommended' }
    if (score >= 60) return { level: 'medium', color: 'bg-yellow-500', text: 'Moderately Recommended' }
    return { level: 'low', color: 'bg-red-500', text: 'Not Recommended' }
  }

  const canApprove = application.backgroundCheck?.cleared && application.status !== 'rejected'
  const recommendation = getRecommendationScore()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSignature className="h-5 w-5" />
          <span>Approval Decision</span>
        </CardTitle>
        <CardDescription>
          Make an approval decision for {application.applicantName}'s guard application
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* AI Recommendation */}
        {recommendation && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">AI Recommendation</h4>
              <Badge className={cn("text-white", recommendation.color)}>
                {recommendation.text}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Confidence Score:</span>
                <span className="text-sm font-medium">{application.aiAnalysis?.confidenceScore}%</span>
              </div>
              {application.aiAnalysis?.recommendations && (
                <div>
                  <span className="text-sm text-muted-foreground">Recommendations:</span>
                  <ul className="mt-1 space-y-1">
                    {application.aiAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm pl-4 border-l-2 border-muted">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Decision Selection */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Decision</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant={decision.action === 'approve' ? 'default' : 'outline'}
              className={cn(
                "h-auto p-4 flex-col space-y-2",
                decision.action === 'approve' && "bg-green-600 hover:bg-green-700",
                !canApprove && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => updateDecision('action', 'approve')}
              disabled={!canApprove || isProcessing}
            >
              <CheckCircle className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Approve</p>
                <p className="text-xs">Create guard profile</p>
              </div>
            </Button>

            <Button
              variant={decision.action === 'reject' ? 'default' : 'outline'}
              className={cn(
                "h-auto p-4 flex-col space-y-2",
                decision.action === 'reject' && "bg-red-600 hover:bg-red-700"
              )}
              onClick={() => updateDecision('action', 'reject')}
              disabled={isProcessing}
            >
              <XCircle className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Reject</p>
                <p className="text-xs">Decline application</p>
              </div>
            </Button>

            <Button
              variant={decision.action === 'delegate' ? 'default' : 'outline'}
              className={cn(
                "h-auto p-4 flex-col space-y-2",
                decision.action === 'delegate' && "bg-blue-600 hover:bg-blue-700"
              )}
              onClick={() => updateDecision('action', 'delegate')}
              disabled={isProcessing}
            >
              <Users className="h-6 w-6" />
              <div className="text-center">
                <p className="font-medium">Delegate</p>
                <p className="text-xs">Assign to other manager</p>
              </div>
            </Button>
          </div>
        </div>

        {/* Conditional Fields */}
        {decision.action === 'reject' && (
          <div className="space-y-3">
            <Label>Rejection Category</Label>
            <Select
              value={decision.rejectionCategory}
              onValueChange={(value) => updateDecision('rejectionCategory', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rejection reason..." />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {decision.action === 'delegate' && (
          <div className="space-y-3">
            <Label>Delegate To</Label>
            <Select
              value={decision.delegateTo}
              onValueChange={(value) => updateDecision('delegateTo', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager..." />
              </SelectTrigger>
              <SelectContent>
                {DELEGATION_MANAGERS.map((manager) => (
                  <SelectItem key={manager.value} value={manager.value}>
                    {manager.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Reason */}
        {decision.action && (
          <div className="space-y-3">
            <Label>Reason for Decision *</Label>
            <Textarea
              placeholder={`Explain why you are ${decision.action === 'approve' ? 'approving' : decision.action === 'reject' ? 'rejecting' : 'delegating'} this application...`}
              value={decision.reason}
              onChange={(e) => updateDecision('reason', e.target.value)}
              rows={3}
            />
          </div>
        )}

        {/* Additional Notes */}
        <div className="space-y-3">
          <Label>Additional Notes (Optional)</Label>
          <Textarea
            placeholder="Any additional comments or instructions..."
            value={decision.notes}
            onChange={(e) => updateDecision('notes', e.target.value)}
            rows={2}
          />
        </div>

        {/* Digital Signature */}
        {decision.action && (
          <div className="space-y-3">
            <Label>Digital Signature *</Label>
            <div className="border rounded-lg p-4">
              {!showSignature ? (
                <Button
                  variant="outline"
                  onClick={() => setShowSignature(true)}
                  className="w-full"
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  Add Digital Signature
                </Button>
              ) : (
                <DigitalSignature
                  onSignatureCapture={(signature) => {
                    updateDecision('digitalSignature', signature)
                    setShowSignature(false)
                  }}
                  onCancel={() => setShowSignature(false)}
                />
              )}
              {decision.digitalSignature && !showSignature && (
                <div className="flex items-center justify-between mt-3 p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Signature captured</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSignature(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Warnings */}
        {!canApprove && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Application cannot be approved until background check is completed and cleared.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setDecision({
              action: null,
              reason: '',
              notes: '',
              rejectionCategory: undefined,
              delegateTo: undefined,
              digitalSignature: undefined
            })}
            disabled={isProcessing}
          >
            Reset
          </Button>
          <Button
            onClick={handleSubmitDecision}
            disabled={!decision.action || isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              `Submit ${decision.action || 'Decision'}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}