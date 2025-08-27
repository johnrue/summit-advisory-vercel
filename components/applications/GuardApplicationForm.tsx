"use client"

// Multi-Step Guard Application Form - Story 2.2
// Comprehensive application form with progress saving and validation

import React, { useState, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, ChevronRight, Save, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PersonalInfoStep } from './steps/PersonalInfoStep'
import { WorkExperienceStep } from './steps/WorkExperienceStep'
import { CertificationsStep } from './steps/CertificationsStep'
import { EducationStep } from './steps/EducationStep'
import { ReferencesStep } from './steps/ReferencesStep'
import { AvailabilityStep } from './steps/AvailabilityStep'
import { DocumentsStep } from './steps/DocumentsStep'
import { ApplicationDataSchema, validateApplicationStep } from '@/lib/validations/guard-applications'
import type { GuardApplicationFormProps, ApplicationData } from '@/lib/types/guard-applications'
import { cn } from '@/lib/utils'

// Form steps configuration
const FORM_STEPS = [
  { 
    id: 'personal-info', 
    title: 'Personal Information', 
    description: 'Basic contact and personal details',
    component: PersonalInfoStep,
    required: true
  },
  { 
    id: 'work-experience', 
    title: 'Work Experience', 
    description: 'Employment history and relevant experience',
    component: WorkExperienceStep,
    required: true
  },
  { 
    id: 'certifications', 
    title: 'Certifications', 
    description: 'Security and professional certifications',
    component: CertificationsStep,
    required: false
  },
  { 
    id: 'education', 
    title: 'Education', 
    description: 'Educational background and qualifications',
    component: EducationStep,
    required: false
  },
  { 
    id: 'references', 
    title: 'References', 
    description: 'Professional and personal references',
    component: ReferencesStep,
    required: true
  },
  { 
    id: 'availability', 
    title: 'Availability & Background', 
    description: 'Schedule availability and background information',
    component: AvailabilityStep,
    required: true
  },
  { 
    id: 'documents', 
    title: 'Documents', 
    description: 'Upload required documents and resume',
    component: DocumentsStep,
    required: true
  }
]

// Local storage keys
const STORAGE_PREFIX = 'guard_application_'
const PROGRESS_KEY = 'form_progress'
const CURRENT_STEP_KEY = 'current_step'

export function GuardApplicationForm({
  applicationToken,
  onSuccess,
  onError,
  enableAIAssist = true,
  className
}: GuardApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [aiParsedData, setAiParsedData] = useState<any>(null)
  const [uploadedDocuments, setUploadedDocuments] = useState<any>({})

  // Initialize form with React Hook Form
  const form = useForm<ApplicationData>({
    resolver: zodResolver(ApplicationDataSchema),
    mode: 'onChange',
    defaultValues: {
      personal_info: {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip_code: ''
        }
      },
      work_experience: [],
      certifications: [],
      education: [],
      references: [],
      availability: {
        full_time: false,
        part_time: false,
        weekends: false,
        nights: false,
        holidays: false,
        overtime_available: false
      }
    }
  })

  const { watch, trigger, getValues, setValue, formState: { errors, isValid } } = form

  // Watch all form values for auto-save
  const formData = watch()

  // Load saved progress on component mount
  useEffect(() => {
    loadSavedProgress()
  }, [])

  // Auto-save form progress every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (currentStep >= 0 && currentStep < FORM_STEPS.length) {
        saveProgress()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [currentStep, formData])

  // Save progress when step changes
  useEffect(() => {
    if (currentStep >= 0) {
      saveProgress()
    }
  }, [currentStep])

  /**
   * Load saved form progress from localStorage
   */
  const loadSavedProgress = () => {
    try {
      const savedStep = localStorage.getItem(STORAGE_PREFIX + CURRENT_STEP_KEY)
      const savedProgress = localStorage.getItem(STORAGE_PREFIX + PROGRESS_KEY)

      if (savedStep) {
        const step = parseInt(savedStep, 10)
        if (step >= 0 && step < FORM_STEPS.length) {
          setCurrentStep(step)
        }
      }

      if (savedProgress) {
        const progressData = JSON.parse(savedProgress)
        
        // Restore form data
        if (progressData.formData) {
          Object.entries(progressData.formData).forEach(([key, value]) => {
            setValue(key as keyof ApplicationData, value)
          })
        }

        // Restore completed steps
        if (progressData.completedSteps) {
          setCompletedSteps(new Set(progressData.completedSteps))
        }

        // Set last saved timestamp
        if (progressData.lastSaved) {
          setLastSaved(new Date(progressData.lastSaved))
        }
      }
    } catch (error) {
      console.warn('Failed to load saved progress:', error)
    }
  }

  /**
   * Save form progress to localStorage
   */
  const saveProgress = async () => {
    try {
      setIsSaving(true)
      
      const progressData = {
        formData: getValues(),
        completedSteps: Array.from(completedSteps),
        currentStep,
        lastSaved: new Date().toISOString()
      }

      localStorage.setItem(STORAGE_PREFIX + PROGRESS_KEY, JSON.stringify(progressData))
      localStorage.setItem(STORAGE_PREFIX + CURRENT_STEP_KEY, currentStep.toString())
      
      setLastSaved(new Date())
    } catch (error) {
      console.warn('Failed to save progress:', error)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Validate current step and move to next
   */
  const handleNext = async () => {
    const stepId = FORM_STEPS[currentStep].id
    const stepData = getStepData(stepId)
    
    // Validate current step
    const validation = validateApplicationStep(stepId, stepData)
    
    if (!validation.success) {
      const errors = validation.error?.errors?.map(err => err.message) || ['Validation failed']
      setFormErrors(errors)
      return
    }

    // Clear errors and mark step as completed
    setFormErrors([])
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    
    // Move to next step
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  /**
   * Move to previous step
   */
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setFormErrors([])
    }
  }

  /**
   * Jump to specific step (if accessible)
   */
  const handleStepClick = (stepIndex: number) => {
    // Only allow jumping to completed steps or the next step
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex)
      setFormErrors([])
    }
  }

  /**
   * Get data for specific step
   */
  const getStepData = (stepId: string) => {
    const data = getValues()
    
    switch (stepId) {
      case 'personal-info':
        return { 
          personal_info: data.personal_info,
          emergency_contact: data.emergency_contact 
        }
      case 'work-experience':
        return { work_experience: data.work_experience }
      case 'certifications':
        return { certifications: data.certifications }
      case 'education':
        return { education: data.education }
      case 'references':
        return { references: data.references }
      case 'availability':
        return { 
          availability: data.availability,
          criminal_history: data.criminal_history,
          additional_info: data.additional_info
        }
      case 'documents':
        return { documents: {} } // TODO: Implement document tracking
      default:
        return {}
    }
  }

  /**
   * Submit completed application
   */
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setFormErrors([])

      // Validate entire form
      const isFormValid = await trigger()
      if (!isFormValid) {
        setFormErrors(['Please complete all required fields'])
        return
      }

      const formData = getValues()
      
      // Submit application to API
      const response = await fetch('/api/v1/applications/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_token: applicationToken,
          application_data: formData,
          ai_parsed_data: aiParsedData,
          document_references: uploadedDocuments
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Submission failed')
      }

      // Clear saved progress on successful submission
      localStorage.removeItem(STORAGE_PREFIX + PROGRESS_KEY)
      localStorage.removeItem(STORAGE_PREFIX + CURRENT_STEP_KEY)
      
      onSuccess?.(result.data.application_reference)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed'
      setFormErrors([errorMessage])
      onError?.(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate progress percentage
  const progressPercentage = ((currentStep + 1) / FORM_STEPS.length) * 100
  const CurrentStepComponent = FORM_STEPS[currentStep]?.component

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      {/* Header with Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Guard Application</CardTitle>
              <CardDescription>
                Complete all sections to submit your application
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              Step {currentStep + 1} of {FORM_STEPS.length}
              {lastSaved && (
                <div className="text-xs">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Progress value={progressPercentage} className="w-full" />
            <div className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}% complete
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {FORM_STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(index)
          const isCurrent = index === currentStep
          const isAccessible = index <= currentStep || isCompleted
          
          return (
            <button
              key={step.id}
              onClick={() => isAccessible && handleStepClick(index)}
              disabled={!isAccessible}
              className={cn(
                "p-3 rounded-lg border text-left transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isCurrent && "border-primary bg-primary/5",
                isCompleted && !isCurrent && "border-green-300 bg-green-50 dark:bg-green-950/20",
                !isAccessible && "opacity-50 cursor-not-allowed",
                isAccessible && !isCurrent && "hover:border-primary/50 cursor-pointer"
              )}
            >
              <div className="flex items-center gap-2">
                {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                <span className="text-xs font-medium truncate">{step.title}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {step.description}
              </div>
            </button>
          )
        })}
      </div>

      {/* Form Errors */}
      {formErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Step Content */}
      <FormProvider {...form}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {FORM_STEPS[currentStep]?.title}
              {FORM_STEPS[currentStep]?.required && (
                <Badge variant="secondary" className="text-xs">Required</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {FORM_STEPS[currentStep]?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {CurrentStepComponent && (
              <CurrentStepComponent 
                applicationToken={applicationToken}
                enableAIAssist={enableAIAssist}
              />
            )}
          </CardContent>
        </Card>
      </FormProvider>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {/* Auto-save indicator */}
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              Saving...
            </div>
          )}

          {/* Manual save button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={saveProgress}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Progress
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {currentStep === FORM_STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Submit Application
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground text-center">
            <p>
              Your progress is automatically saved every 30 seconds. 
              You can safely close this page and return later to continue.
            </p>
            {enableAIAssist && (
              <p className="mt-2">
                AI assistance is enabled. Upload your resume in the Documents step 
                to automatically fill out sections of this application.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}