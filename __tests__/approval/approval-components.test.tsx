// Story 2.7: Approval Components Tests
// React component tests for approval workflow UI components

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from '@jest/globals'
import '@testing-library/jest-dom'
import { ApprovalDecisionManager } from '@/components/approval/ApprovalDecisionManager'
import { ApprovalDecisionForm } from '@/components/approval/ApprovalDecisionForm'
import { RejectionWorkflow } from '@/components/approval/RejectionWorkflow'
import type { 
  HiringDecision,
  AuthorityLevel,
  ApprovalDecisionRequest,
  RejectionDecisionRequest 
} from '@/lib/types/approval-workflow'

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className: string }) => <div className={className} data-testid="alert-triangle" />,
  CheckCircle2: ({ className }: { className: string }) => <div className={className} data-testid="check-circle" />,
  Clock: ({ className }: { className: string }) => <div className={className} data-testid="clock" />,
  User: ({ className }: { className: string }) => <div className={className} data-testid="user" />,
  FileText: ({ className }: { className: string }) => <div className={className} data-testid="file-text" />,
  Shield: ({ className }: { className: string }) => <div className={className} data-testid="shield" />,
  Send: ({ className }: { className: string }) => <div className={className} data-testid="send" />,
  X: ({ className }: { className: string }) => <div className={className} data-testid="x" />,
  Mail: ({ className }: { className: string }) => <div className={className} data-testid="mail" />,
  Download: ({ className }: { className: string }) => <div className={className} data-testid="download" />
}))

describe('Approval Components', () => {
  const mockApplicantData = {
    id: 'app-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    pipeline_stage: 'interview_completed',
    created_at: '2024-01-15T10:00:00Z',
    priority: 5,
    assigned_to: 'Manager Smith'
  }

  const mockInterviewSummary = {
    overallRating: 8,
    hiringRecommendation: 'hire',
    scheduledAt: '2024-01-20T14:00:00Z'
  }

  const mockBackgroundCheckStatus = {
    status: 'completed',
    completedAt: '2024-01-18T09:00:00Z',
    expiryDate: '2025-01-18T09:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ApprovalDecisionManager', () => {
    it('should render applicant information correctly', () => {
      render(
        <ApprovalDecisionManager
          applicationId="app-123"
          applicantData={mockApplicantData}
          interviewSummary={mockInterviewSummary}
          backgroundCheckStatus={mockBackgroundCheckStatus}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument()
      expect(screen.getByText('Application ID: app-123')).toBeInTheDocument()
    })

    it('should display interview summary when provided', () => {
      render(
        <ApprovalDecisionManager
          applicationId="app-123"
          applicantData={mockApplicantData}
          interviewSummary={mockInterviewSummary}
          backgroundCheckStatus={mockBackgroundCheckStatus}
        />
      )

      expect(screen.getByText('Interview Summary')).toBeInTheDocument()
      expect(screen.getByText('8/10')).toBeInTheDocument()
      expect(screen.getByText('hire', { exact: false })).toBeInTheDocument()
    })

    it('should display background check status when provided', () => {
      render(
        <ApprovalDecisionManager
          applicationId="app-123"
          applicantData={mockApplicantData}
          interviewSummary={mockInterviewSummary}
          backgroundCheckStatus={mockBackgroundCheckStatus}
        />
      )

      expect(screen.getByText('Background Check Status')).toBeInTheDocument()
      expect(screen.getByText('completed')).toBeInTheDocument()
    })

    it('should show decision actions', () => {
      render(
        <ApprovalDecisionManager
          applicationId="app-123"
          applicantData={mockApplicantData}
          interviewSummary={mockInterviewSummary}
          backgroundCheckStatus={mockBackgroundCheckStatus}
        />
      )

      expect(screen.getByText('Decision Actions')).toBeInTheDocument()
      expect(screen.getByText('Make Decision')).toBeInTheDocument()
    })

    it('should call onDecisionSubmit when decision is made', async () => {
      const mockOnDecisionSubmit = jest.fn()
      
      render(
        <ApprovalDecisionManager
          applicationId="app-123"
          applicantData={mockApplicantData}
          onDecisionSubmit={mockOnDecisionSubmit}
        />
      )

      const makeDecisionButton = screen.getByText('Make Decision')
      fireEvent.click(makeDecisionButton)

      // The decision form modal should appear
      await waitFor(() => {
        expect(screen.getByText('Select Decision Type')).toBeInTheDocument()
      })
    })

    it('should show delegation button when enabled', () => {
      render(
        <ApprovalDecisionManager
          applicationId="app-123"
          applicantData={mockApplicantData}
          enableDelegation={true}
        />
      )

      expect(screen.getByText('Delegate Authority')).toBeInTheDocument()
    })

    it('should not show delegation button when disabled', () => {
      render(
        <ApprovalDecisionManager
          applicationId="app-123"
          applicantData={mockApplicantData}
          enableDelegation={false}
        />
      )

      expect(screen.queryByText('Delegate Authority')).not.toBeInTheDocument()
    })
  })

  describe('ApprovalDecisionForm', () => {
    const mockOnApprovalSubmit = jest.fn()
    const mockOnRejectionSubmit = jest.fn()
    const mockOnClose = jest.fn()

    const defaultProps = {
      applicantData: mockApplicantData,
      onApprovalSubmit: mockOnApprovalSubmit,
      onRejectionSubmit: mockOnRejectionSubmit,
      onClose: mockOnClose,
      managerAuthorityLevel: 'senior_manager' as AuthorityLevel
    }

    it('should render decision type selection initially', () => {
      render(<ApprovalDecisionForm {...defaultProps} />)

      expect(screen.getByText('Select Decision Type')).toBeInTheDocument()
      expect(screen.getByText('Approve Applicant')).toBeInTheDocument()
      expect(screen.getByText('Reject Applicant')).toBeInTheDocument()
    })

    it('should show approval form when approval is selected', async () => {
      render(<ApprovalDecisionForm {...defaultProps} />)

      const approveButton = screen.getByText('Approve Applicant')
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(screen.getByText('Decision Type')).toBeInTheDocument()
        expect(screen.getByText('Approval Reason')).toBeInTheDocument()
        expect(screen.getByText('Decision Rationale *')).toBeInTheDocument()
      })
    })

    it('should show rejection form when rejection is selected', async () => {
      render(<ApprovalDecisionForm {...defaultProps} />)

      const rejectButton = screen.getByText('Reject Applicant')
      fireEvent.click(rejectButton)

      await waitFor(() => {
        expect(screen.getByText('Rejection Reason')).toBeInTheDocument()
        expect(screen.getByText('Decision Rationale *')).toBeInTheDocument()
        expect(screen.getByText('Constructive Feedback (Optional)')).toBeInTheDocument()
      })
    })

    it('should call onApprovalSubmit when approval form is submitted', async () => {
      render(<ApprovalDecisionForm {...defaultProps} />)

      // Select approval
      const approveButton = screen.getByText('Approve Applicant')
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(screen.getByText('Decision Rationale *')).toBeInTheDocument()
      })

      // Fill required fields
      const rationaleTextarea = screen.getByPlaceholderText(/Provide detailed rationale/i)
      fireEvent.change(rationaleTextarea, { 
        target: { value: 'Candidate demonstrates excellent qualifications and fit for the role with strong interview performance.' }
      })

      // Submit form
      const submitButton = screen.getByText('Submit Approval')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnApprovalSubmit).toHaveBeenCalled()
      })
    })

    it('should call onRejectionSubmit when rejection form is submitted', async () => {
      render(<ApprovalDecisionForm {...defaultProps} />)

      // Select rejection
      const rejectButton = screen.getByText('Reject Applicant')
      fireEvent.click(rejectButton)

      await waitFor(() => {
        expect(screen.getByText('Decision Rationale *')).toBeInTheDocument()
      })

      // Fill required fields
      const rationaleTextarea = screen.getByPlaceholderText(/Provide detailed rationale/i)
      fireEvent.change(rationaleTextarea, { 
        target: { value: 'Candidate lacks the required experience level for this security position.' }
      })

      // Submit form
      const submitButton = screen.getByText('Submit Rejection')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnRejectionSubmit).toHaveBeenCalled()
      })
    })

    it('should validate rationale minimum length', async () => {
      render(<ApprovalDecisionForm {...defaultProps} />)

      // Select approval
      const approveButton = screen.getByText('Approve Applicant')
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(screen.getByText('Decision Rationale *')).toBeInTheDocument()
      })

      // Enter too short rationale
      const rationaleTextarea = screen.getByPlaceholderText(/Provide detailed rationale/i)
      fireEvent.change(rationaleTextarea, { target: { value: 'Too short' } })

      // Try to submit
      const submitButton = screen.getByText('Submit Approval')
      fireEvent.click(submitButton)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Rationale must be at least 50 characters/i)).toBeInTheDocument()
      })
    })

    it('should show conditional approval options', async () => {
      render(<ApprovalDecisionForm {...defaultProps} />)

      // Select approval
      const approveButton = screen.getByText('Approve Applicant')
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(screen.getByText('Decision Type')).toBeInTheDocument()
      })

      // Select conditional approval
      const decisionTypeSelect = screen.getByRole('combobox')
      fireEvent.click(decisionTypeSelect)

      await waitFor(() => {
        const conditionalOption = screen.getByText('Conditionally Approved')
        fireEvent.click(conditionalOption)
      })

      // Should show conditions field
      await waitFor(() => {
        expect(screen.getByText('Approval Conditions')).toBeInTheDocument()
      })
    })
  })

  describe('RejectionWorkflow', () => {
    const mockDecision: HiringDecision = {
      id: 'decision-123',
      applicationId: 'app-123',
      decisionType: 'rejected',
      approverId: 'manager-123',
      decisionReason: 'insufficient_experience',
      decisionRationale: 'Candidate lacks required experience',
      decisionConfidence: 7,
      createdAt: new Date('2024-01-20T10:00:00Z'),
      effectiveDate: new Date('2024-01-20T10:00:00Z'),
      digitalSignature: 'signature-123',
      authorityLevel: 'senior_manager',
      appealsDeadline: new Date('2024-02-20T10:00:00Z'),
      isFinal: false,
      supportingEvidence: {
        feedback: 'Consider gaining more experience in commercial security',
        respectful_notification: true
      }
    }

    const mockOnSendNotification = jest.fn()
    const mockOnAppealProcess = jest.fn()

    const defaultProps = {
      decision: mockDecision,
      applicantData: mockApplicantData,
      onSendNotification: mockOnSendNotification,
      onAppealProcess: mockOnAppealProcess
    }

    it('should render rejection decision summary', () => {
      render(<RejectionWorkflow {...defaultProps} />)

      expect(screen.getByText('Rejection Decision - John Doe')).toBeInTheDocument()
      expect(screen.getByText('INSUFFICIENT_EXPERIENCE')).toBeInTheDocument()
      expect(screen.getByText('Candidate lacks required experience')).toBeInTheDocument()
      expect(screen.getByText('7/10')).toBeInTheDocument()
    })

    it('should display constructive feedback when provided', () => {
      render(<RejectionWorkflow {...defaultProps} />)

      expect(screen.getByText('Constructive Feedback')).toBeInTheDocument()
      expect(screen.getByText('Consider gaining more experience in commercial security')).toBeInTheDocument()
    })

    it('should show notification section', () => {
      render(<RejectionWorkflow {...defaultProps} />)

      expect(screen.getByText('Rejection Notification')).toBeInTheDocument()
      expect(screen.getByText('Send Rejection Notification')).toBeInTheDocument()
    })

    it('should call onSendNotification when notification is sent', async () => {
      render(<RejectionWorkflow {...defaultProps} />)

      const sendButton = screen.getByText('Send Rejection Notification')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockOnSendNotification).toHaveBeenCalled()
      })
    })

    it('should show appeal section when appealable', () => {
      render(<RejectionWorkflow {...defaultProps} showAppealOption={true} />)

      expect(screen.getByText('Appeal Process')).toBeInTheDocument()
      expect(screen.getByText('Appeal Window Open')).toBeInTheDocument()
      expect(screen.getByText('Submit Appeal Request')).toBeInTheDocument()
    })

    it('should not show appeal section when not appealable', () => {
      const finalDecision = { ...mockDecision, isFinal: true }
      
      render(
        <RejectionWorkflow 
          {...defaultProps} 
          decision={finalDecision}
          showAppealOption={true} 
        />
      )

      expect(screen.queryByText('Appeal Process')).not.toBeInTheDocument()
    })

    it('should show appeal form when appeal button is clicked', async () => {
      render(<RejectionWorkflow {...defaultProps} showAppealOption={true} />)

      const appealButton = screen.getByText('Submit Appeal Request')
      fireEvent.click(appealButton)

      await waitFor(() => {
        expect(screen.getByText('Appeal Reason *')).toBeInTheDocument()
        expect(screen.getByText('Additional Evidence (Optional)')).toBeInTheDocument()
      })
    })

    it('should call onAppealProcess when appeal is submitted', async () => {
      render(<RejectionWorkflow {...defaultProps} showAppealOption={true} />)

      // Open appeal form
      const appealButton = screen.getByText('Submit Appeal Request')
      fireEvent.click(appealButton)

      await waitFor(() => {
        expect(screen.getByText('Appeal Reason *')).toBeInTheDocument()
      })

      // Fill appeal reason
      const appealTextarea = screen.getByPlaceholderText(/Explain why you believe/i)
      fireEvent.change(appealTextarea, { 
        target: { value: 'I believe my experience was not properly evaluated during the interview process.' }
      })

      // Submit appeal
      const submitAppealButton = screen.getByText('Submit Appeal')
      fireEvent.click(submitAppealButton)

      await waitFor(() => {
        expect(mockOnAppealProcess).toHaveBeenCalled()
      })
    })

    it('should show decision timeline', () => {
      render(<RejectionWorkflow {...defaultProps} />)

      expect(screen.getByText('Decision Timeline')).toBeInTheDocument()
      expect(screen.getByText('Rejection Decision Made')).toBeInTheDocument()
      expect(screen.getByText('Appeal Deadline')).toBeInTheDocument()
    })

    it('should allow custom message for notification', async () => {
      render(<RejectionWorkflow {...defaultProps} />)

      const customMessageTextarea = screen.getByPlaceholderText(/Add a personal message/i)
      fireEvent.change(customMessageTextarea, { 
        target: { value: 'Thank you for your interest in Summit Advisory. We encourage you to reapply in the future.' }
      })

      const sendButton = screen.getByText('Send Rejection Notification')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockOnSendNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            customMessage: 'Thank you for your interest in Summit Advisory. We encourage you to reapply in the future.'
          })
        )
      })
    })
  })
})