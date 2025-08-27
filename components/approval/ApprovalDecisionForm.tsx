"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle2, X, FileText } from 'lucide-react'
import type { 
  ApprovalDecisionFormProps,
  ApprovalDecisionRequest,
  RejectionDecisionRequest,
  DecisionType,
  ApprovalReason,
  AuthorityLevel
} from '@/lib/types/approval-workflow'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Validation schemas
const approvalDecisionSchema = z.object({
  decisionType: z.enum(['approved', 'conditionally_approved', 'deferred']),
  decisionReason: z.enum([
    'qualifications_met',
    'exceptional_candidate', 
    'conditional_approval',
    'other'
  ]),
  decisionRationale: z.string().min(50, 'Rationale must be at least 50 characters'),
  decisionConfidence: z.number().min(1).max(10),
  complianceNotes: z.string().optional(),
  conditions: z.array(z.string()).optional(),
})

const rejectionDecisionSchema = z.object({
  decisionReason: z.enum([
    'insufficient_experience',
    'failed_background',
    'poor_interview',
    'cultural_fit',
    'position_filled',
    'other'
  ]),
  decisionRationale: z.string().min(50, 'Rationale must be at least 50 characters'),
  feedback: z.string().optional(),
  appealInstructions: z.string().optional(),
  decisionConfidence: z.number().min(1).max(10),
  respectfulNotification: z.boolean().default(true),
})

interface ApprovalDecisionFormExtendedProps extends ApprovalDecisionFormProps {
  onClose: () => void
}

export const ApprovalDecisionForm: React.FC<ApprovalDecisionFormExtendedProps> = ({
  applicantData,
  onApprovalSubmit,
  onRejectionSubmit,
  managerAuthorityLevel,
  availableDelegations,
  onClose,
  className
}) => {
  const [decisionType, setDecisionType] = useState<'approval' | 'rejection' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const approvalForm = useForm<z.infer<typeof approvalDecisionSchema>>({
    resolver: zodResolver(approvalDecisionSchema),
    defaultValues: {
      decisionType: 'approved',
      decisionReason: 'qualifications_met',
      decisionRationale: '',
      decisionConfidence: 7,
      complianceNotes: '',
      conditions: [],
    },
  })

  const rejectionForm = useForm<z.infer<typeof rejectionDecisionSchema>>({
    resolver: zodResolver(rejectionDecisionSchema),
    defaultValues: {
      decisionReason: 'insufficient_experience',
      decisionRationale: '',
      feedback: '',
      appealInstructions: '',
      decisionConfidence: 7,
      respectfulNotification: true,
    },
  })

  const handleApprovalSubmit = async (data: z.infer<typeof approvalDecisionSchema>) => {
    if (!applicantData.id) return

    setIsSubmitting(true)
    try {
      const approvalRequest: ApprovalDecisionRequest = {
        applicationId: applicantData.id,
        decisionType: data.decisionType as DecisionType,
        decisionReason: data.decisionReason as ApprovalReason,
        decisionRationale: data.decisionRationale,
        decisionConfidence: data.decisionConfidence,
        complianceNotes: data.complianceNotes,
        supportingEvidence: {
          conditions: data.conditions,
          managerAuthorityLevel,
          timestamp: new Date().toISOString(),
        }
      }

      await onApprovalSubmit(approvalRequest)
      toast.success('Approval decision submitted successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to submit approval decision')
      console.error('Approval submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectionSubmit = async (data: z.infer<typeof rejectionDecisionSchema>) => {
    if (!applicantData.id) return

    setIsSubmitting(true)
    try {
      const rejectionRequest: RejectionDecisionRequest = {
        applicationId: applicantData.id,
        decisionReason: data.decisionReason as ApprovalReason,
        decisionRationale: data.decisionRationale,
        feedback: data.feedback,
        appealInstructions: data.appealInstructions,
        decisionConfidence: data.decisionConfidence,
        respectfulNotification: data.respectfulNotification,
      }

      await onRejectionSubmit(rejectionRequest)
      toast.success('Rejection decision submitted successfully')
      onClose()
    } catch (error) {
      toast.error('Failed to submit rejection decision')
      console.error('Rejection submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAuthorityBadge = (level: AuthorityLevel) => {
    const variants = {
      'junior_manager': 'secondary',
      'senior_manager': 'default',
      'regional_director': 'destructive',
      'admin': 'destructive',
    } as const

    return (
      <Badge variant={variants[level]} className="text-xs">
        {level.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const applicantName = `${applicantData.first_name || ''} ${applicantData.last_name || ''}`.trim()

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Approval Decision - {applicantName}
          </DialogTitle>
          <DialogDescription>
            Make a hiring decision with full accountability and audit trail.
            Authority Level: {getAuthorityBadge(managerAuthorityLevel)}
          </DialogDescription>
        </DialogHeader>

        {!decisionType && (
          <div className="space-y-4 py-4">
            <h3 className="font-medium">Select Decision Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 border-green-200 hover:bg-green-50"
                onClick={() => setDecisionType('approval')}
              >
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span>Approve Applicant</span>
                <span className="text-xs text-gray-500">Approve for hiring</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 border-red-200 hover:bg-red-50"
                onClick={() => setDecisionType('rejection')}
              >
                <X className="h-6 w-6 text-red-600" />
                <span>Reject Applicant</span>
                <span className="text-xs text-gray-500">Not suitable for hiring</span>
              </Button>
            </div>
          </div>
        )}

        {decisionType === 'approval' && (
          <Form {...approvalForm}>
            <form onSubmit={approvalForm.handleSubmit(handleApprovalSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={approvalForm.control}
                  name="decisionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select decision type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="approved">Fully Approved</SelectItem>
                          <SelectItem value="conditionally_approved">Conditionally Approved</SelectItem>
                          <SelectItem value="deferred">Deferred Decision</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={approvalForm.control}
                  name="decisionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approval Reason</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="qualifications_met">Qualifications Met</SelectItem>
                          <SelectItem value="exceptional_candidate">Exceptional Candidate</SelectItem>
                          <SelectItem value="conditional_approval">Conditional Approval</SelectItem>
                          <SelectItem value="other">Other (specify in rationale)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={approvalForm.control}
                name="decisionRationale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decision Rationale *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Provide detailed rationale for this approval decision (minimum 50 characters)..."
                        className="min-h-[120px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Explain why this applicant should be approved for hiring.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={approvalForm.control}
                name="decisionConfidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decision Confidence: {field.value}/10</FormLabel>
                    <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        max={10}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      Rate your confidence in this approval decision (1 = Low confidence, 10 = Very high confidence)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {approvalForm.watch('decisionType') === 'conditionally_approved' && (
                <FormField
                  control={approvalForm.control}
                  name="conditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approval Conditions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List any conditions that must be met before full approval..."
                          onChange={(e) => field.onChange(e.target.value.split('\n').filter(Boolean))}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter each condition on a new line.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={approvalForm.control}
                name="complianceNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TOPS Compliance Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Any compliance considerations or notes..."
                      />
                    </FormControl>
                    <FormDescription>
                      Document any TOPS compliance considerations for this approval.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setDecisionType(null)}>
                  Back
                </Button>
                <div className="space-x-2">
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting ? 'Submitting...' : 'Submit Approval'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}

        {decisionType === 'rejection' && (
          <Form {...rejectionForm}>
            <form onSubmit={rejectionForm.handleSubmit(handleRejectionSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={rejectionForm.control}
                  name="decisionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rejection Reason</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="insufficient_experience">Insufficient Experience</SelectItem>
                          <SelectItem value="failed_background">Failed Background Check</SelectItem>
                          <SelectItem value="poor_interview">Poor Interview Performance</SelectItem>
                          <SelectItem value="cultural_fit">Cultural Fit Concerns</SelectItem>
                          <SelectItem value="position_filled">Position Already Filled</SelectItem>
                          <SelectItem value="other">Other (specify in rationale)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={rejectionForm.control}
                  name="decisionConfidence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision Confidence: {field.value}/10</FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={rejectionForm.control}
                name="decisionRationale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decision Rationale *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Provide detailed rationale for this rejection decision (minimum 50 characters)..."
                        className="min-h-[120px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Explain why this applicant is not suitable for hiring.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={rejectionForm.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Constructive Feedback (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Provide constructive feedback for the applicant's improvement..."
                      />
                    </FormControl>
                    <FormDescription>
                      Optional feedback to help the applicant improve for future opportunities.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={rejectionForm.control}
                name="appealInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appeal Instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Instructions for appealing this decision..."
                      />
                    </FormControl>
                    <FormDescription>
                      Instructions if the applicant wishes to appeal this decision.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={rejectionForm.control}
                name="respectfulNotification"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Send respectful rejection notification
                      </FormLabel>
                      <FormDescription>
                        Send a professional and respectful rejection email to the applicant.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Decision Review</p>
                  <p className="text-yellow-700 mt-1">
                    This rejection decision will be subject to audit review and can be appealed within 30 days.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setDecisionType(null)}>
                  Back
                </Button>
                <div className="space-x-2">
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} variant="destructive">
                    {isSubmitting ? 'Submitting...' : 'Submit Rejection'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}