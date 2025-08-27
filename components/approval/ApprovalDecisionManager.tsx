"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle2, Clock, User, FileText, Shield } from 'lucide-react'
import { ApprovalDecisionForm } from './ApprovalDecisionForm'
import { AuditTrailViewer } from './AuditTrailViewer'
import type { 
  ApprovalDecisionManagerProps,
  HiringDecision,
  AuthorityLevel 
} from '@/lib/types/approval-workflow'
import type { GuardApplication } from '@/lib/types/kanban-workflow'
import { cn } from '@/lib/utils'

export const ApprovalDecisionManager: React.FC<ApprovalDecisionManagerProps> = ({
  applicationId,
  applicantData,
  interviewSummary,
  backgroundCheckStatus,
  onDecisionSubmit,
  enableDelegation = true,
  className
}) => {
  const [showDecisionForm, setShowDecisionForm] = useState(false)
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [currentDecision, setCurrentDecision] = useState<HiringDecision | null>(null)
  
  // Mock manager authority level - in production, get from auth context
  const managerAuthorityLevel: AuthorityLevel = 'senior_manager'

  const handleDecisionSubmit = (decision: HiringDecision) => {
    setCurrentDecision(decision)
    setShowDecisionForm(false)
    onDecisionSubmit?.(decision)
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      case 'rejected':
        return <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      case 'interview_completed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
          <Clock className="h-3 w-3 mr-1" />
          Awaiting Decision
        </Badge>
      default:
        return <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Under Review
        </Badge>
    }
  }

  const applicantName = `${applicantData.first_name || ''} ${applicantData.last_name || ''}`.trim()

  return (
    <div className={cn("space-y-6", className)}>
      {/* Applicant Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Approval Decision - {applicantName}
              </CardTitle>
              <CardDescription>
                Application ID: {applicationId}
              </CardDescription>
            </div>
            {getStatusBadge(applicantData.pipeline_stage)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Applicant Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Contact Information</h4>
              <div className="space-y-1 text-sm">
                <div>Email: {applicantData.email}</div>
                <div>Phone: {applicantData.phone}</div>
                <div>Applied: {new Date(applicantData.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-2">Application Details</h4>
              <div className="space-y-1 text-sm">
                <div>Position: {applicantData.position_applied || 'Security Guard'}</div>
                <div>Priority: {applicantData.priority || 5}/10</div>
                <div>Assigned: {applicantData.assigned_to || 'Unassigned'}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Decision Status */}
          {currentDecision && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Current Decision
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Decision: {currentDecision.decisionType}</div>
                  <div>Reason: {currentDecision.decisionReason}</div>
                  <div>Confidence: {currentDecision.decisionConfidence}/10</div>
                </div>
                <div>
                  <div>Decided by: {currentDecision.approverId}</div>
                  <div>Date: {currentDecision.createdAt.toLocaleDateString()}</div>
                  <div>Authority: {currentDecision.authorityLevel}</div>
                </div>
              </div>
              {currentDecision.decisionRationale && (
                <div className="mt-3">
                  <div className="font-medium">Rationale:</div>
                  <p className="text-gray-700 mt-1">{currentDecision.decisionRationale}</p>
                </div>
              )}
            </div>
          )}

          {/* Interview Summary */}
          {interviewSummary && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Interview Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-blue-50 rounded-lg p-3">
                <div>
                  <div className="font-medium">Overall Rating</div>
                  <div>{interviewSummary.overallRating || 'N/A'}/10</div>
                </div>
                <div>
                  <div className="font-medium">Recommendation</div>
                  <div className="capitalize">{interviewSummary.hiringRecommendation || 'Pending'}</div>
                </div>
                <div>
                  <div className="font-medium">Interview Date</div>
                  <div>{interviewSummary.scheduledAt ? new Date(interviewSummary.scheduledAt).toLocaleDateString() : 'Not scheduled'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Background Check Status */}
          {backgroundCheckStatus && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Background Check Status
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-purple-50 rounded-lg p-3">
                <div>
                  <div className="font-medium">Status</div>
                  <Badge variant={backgroundCheckStatus.status === 'completed' ? 'default' : 'secondary'}>
                    {backgroundCheckStatus.status || 'Pending'}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium">Completed Date</div>
                  <div>{backgroundCheckStatus.completedAt ? new Date(backgroundCheckStatus.completedAt).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <div className="font-medium">Expiry Date</div>
                  <div>{backgroundCheckStatus.expiryDate ? new Date(backgroundCheckStatus.expiryDate).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Actions</CardTitle>
          <CardDescription>
            Make approval or rejection decision with full accountability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowDecisionForm(true)}
              disabled={currentDecision?.isFinal}
              className="flex-1"
            >
              {currentDecision ? 'Modify Decision' : 'Make Decision'}
            </Button>
            
            {currentDecision && (
              <Button
                variant="outline"
                onClick={() => setShowAuditTrail(true)}
              >
                View Audit Trail
              </Button>
            )}
            
            {enableDelegation && (
              <Button variant="outline">
                Delegate Authority
              </Button>
            )}
          </div>

          {currentDecision?.isFinal && (
            <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              This decision is final and cannot be modified.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Form Modal */}
      {showDecisionForm && (
        <ApprovalDecisionForm
          applicantData={applicantData}
          onApprovalSubmit={async (decision) => {
            // Handle approval submission
            console.log('Approval decision:', decision)
            setShowDecisionForm(false)
          }}
          onRejectionSubmit={async (decision) => {
            // Handle rejection submission
            console.log('Rejection decision:', decision)
            setShowDecisionForm(false)
          }}
          managerAuthorityLevel={managerAuthorityLevel}
          onClose={() => setShowDecisionForm(false)}
          className="fixed inset-0 z-50"
        />
      )}

      {/* Audit Trail Modal */}
      {showAuditTrail && currentDecision && (
        <AuditTrailViewer
          decisionId={currentDecision.id}
          showIntegrityVerification={true}
          enableExport={true}
          onClose={() => setShowAuditTrail(false)}
          className="fixed inset-0 z-50"
        />
      )}
    </div>
  )
}