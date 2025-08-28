"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Eye
} from 'lucide-react'
import { ApprovalWorkflow } from '@/components/hiring/ApprovalWorkflow'
import { DigitalSignature } from '@/components/hiring/DigitalSignature'
import { BackgroundCheckStatus } from '@/components/hiring/BackgroundCheckStatus'
import { AIResumePreview } from '@/components/hiring/AIResumePreview'
import { approvalWorkflowService } from '@/lib/services/approval-workflow-service'
import { cn } from '@/lib/utils'

interface HiringApplication {
  id: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  status: string
  submittedAt: string
  updatedAt: string
  resumeText?: string
  aiAnalysis?: {
    experienceYears: number
    relevantSkills: string[]
    securityExperience: boolean
    certifications: string[]
    confidenceScore: number
    recommendations: string[]
  }
  backgroundCheck?: {
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    completedAt?: string
    cleared: boolean
    notes?: string
  }
  interviewScheduled?: {
    date: string
    interviewer: string
    notes?: string
  }
  documents: {
    id: string
    name: string
    type: string
    uploadedAt: string
    size: number
  }[]
}

export default function ApprovalPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params.id as string

  const [application, setApplication] = useState<HiringApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvalInProgress, setApprovalInProgress] = useState(false)

  useEffect(() => {
    loadApplication()
  }, [applicationId])

  const loadApplication = async () => {
    try {
      setLoading(true)
      setError(null)

      // Simulate API call to load application details
      // In real implementation, this would use the approval service
      const mockApplication: HiringApplication = {
        id: applicationId,
        applicantName: "John Smith",
        applicantEmail: "john.smith@email.com", 
        applicantPhone: "(555) 123-4567",
        status: "background_check_complete",
        submittedAt: "2025-01-20T10:30:00Z",
        updatedAt: "2025-01-22T14:15:00Z",
        resumeText: "Experienced security professional with 5 years in private security...",
        aiAnalysis: {
          experienceYears: 5,
          relevantSkills: ["Armed Security", "Surveillance", "Customer Service", "Emergency Response"],
          securityExperience: true,
          certifications: ["Level II Security Officer", "CPR Certified"],
          confidenceScore: 87,
          recommendations: [
            "Strong security background with relevant certifications",
            "Good customer service experience",
            "Recommend interview for armed positions"
          ]
        },
        backgroundCheck: {
          status: 'completed',
          completedAt: "2025-01-21T16:45:00Z",
          cleared: true,
          notes: "Clean background. No criminal history. Good credit score."
        },
        documents: [
          { id: '1', name: 'resume.pdf', type: 'resume', uploadedAt: '2025-01-20T10:30:00Z', size: 245760 },
          { id: '2', name: 'certifications.pdf', type: 'certification', uploadedAt: '2025-01-20T10:31:00Z', size: 189440 }
        ]
      }

      setApplication(mockApplication)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application')
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = async (action: 'approve' | 'reject', data: any) => {
    try {
      setApprovalInProgress(true)

      const result = await approvalWorkflowService.processApproval({
        applicationId,
        action,
        managerId: 'current-manager-id', // Would get from auth context
        ...data
      })

      if (result.success) {
        // Redirect to hiring dashboard or show success
        router.push('/dashboard/hiring?success=approval-processed')
      } else {
        setError(result.error || 'Failed to process approval')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process approval')
    } finally {
      setApprovalInProgress(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Application not found'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/hiring')}
          className="mt-4"
        >
          Back to Hiring Dashboard
        </Button>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500'
      case 'rejected': return 'bg-red-500'
      case 'background_check_complete': return 'bg-blue-500'
      case 'interview_scheduled': return 'bg-purple-500'
      default: return 'bg-yellow-500'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application Review</h1>
          <p className="text-muted-foreground">
            Review and approve guard application #{application.id}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/hiring')}
        >
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>{application.applicantName}</CardTitle>
                    <CardDescription>Application #{application.id}</CardDescription>
                  </div>
                </div>
                <Badge className={cn("text-white", getStatusColor(application.status))}>
                  {application.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{application.applicantEmail}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{application.applicantPhone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Applied: {formatDate(application.submittedAt)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Updated: {formatDate(application.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Resume Analysis */}
          {application.aiAnalysis && (
            <AIResumePreview
              analysis={application.aiAnalysis}
              resumeText={application.resumeText}
            />
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Application Documents</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {application.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} • {(doc.size / 1024).toFixed(1)} KB • {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Approval Workflow */}
          <ApprovalWorkflow
            application={application}
            onApprovalAction={handleApprovalAction}
            isProcessing={approvalInProgress}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Background Check Status */}
          {application.backgroundCheck && (
            <BackgroundCheckStatus backgroundCheck={application.backgroundCheck} />
          )}

          {/* Interview Information */}
          {application.interviewScheduled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interview Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatDate(application.interviewScheduled.date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{application.interviewScheduled.interviewer}</span>
                </div>
                {application.interviewScheduled.notes && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{application.interviewScheduled.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button className="w-full" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}