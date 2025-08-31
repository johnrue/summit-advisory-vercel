// Story 2.6: Interview Scheduling Service
// Core service for managing interview operations, scheduling, and workflow integration

import { supabase } from '@/lib/supabase'
import type {
  Interview,
  InterviewFeedback,
  CalendarSubscription,
  ScheduleInterviewRequest,
  UpdateInterviewRequest,
  SubmitFeedbackRequest,
  CalendarFilters,
  TimeSlot,
  AvailabilityRequest,
  ServiceResult
} from '@/lib/types/interview-types'
import { generateRandomString } from '@/lib/utils'

export class InterviewService {
  
  // Schedule a new interview
  async scheduleInterview(request: ScheduleInterviewRequest): Promise<ServiceResult<Interview>> {
    try {
      // Generate unique ICS UID for calendar integration
      const icsUid = `SA-INTERVIEW-${generateRandomString(8)}-${Date.now()}`
      
      const { data, error } = await supabase
        .from('interviews')
        .insert({
          application_id: request.applicationId,
          interview_type: request.interviewType,
          scheduled_at: request.scheduledAt.toISOString(),
          duration_minutes: request.durationMinutes,
          interview_location: request.interviewLocation,
          interview_mode: request.interviewMode,
          interviewer_id: request.interviewerId,
          meeting_notes: request.meetingNotes,
          ics_uid: icsUid,
          status: 'scheduled'
        })
        .select()
        .single()
      
      if (error) {
        console.error('Interview scheduling error:', error)
        return { success: false, error: 'Failed to schedule interview', code: 'SCHEDULE_ERROR' }
      }
      
      // Update application status to interview_scheduled in guard_leads
      await supabase
        .from('guard_leads')
        .update({ 
          pipeline_stage: 'interview_scheduled',
          stage_changed_at: new Date().toISOString()
        })
        .eq('id', request.applicationId)
      
      const interview: Interview = this.mapDatabaseToInterview(data)
      
      return { success: true, data: interview }
    } catch (error) {
      console.error('Interview service error:', error)
      return { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }
    }
  }
  
  // Get interview history for an application
  async getInterviewHistory(applicationId: string): Promise<ServiceResult<Interview[]>> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          *,
          interview_feedback (
            id,
            technical_skills_rating,
            communication_rating,
            cultural_fit_rating,
            experience_relevance_rating,
            recommendation,
            confidence_level,
            created_at
          )
        `)
        .eq('application_id', applicationId)
        .order('scheduled_at', { ascending: false })
      
      if (error) {
        console.error('Interview history error:', error)
        return { success: false, error: 'Failed to fetch interview history', code: 'FETCH_ERROR' }
      }
      
      const interviews: Interview[] = data.map(this.mapDatabaseToInterview)
      
      return { success: true, data: interviews }
    } catch (error) {
      console.error('Interview service error:', error)
      return { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }
    }
  }
  
  // Update interview details
  async updateInterview(interviewId: string, updates: UpdateInterviewRequest): Promise<ServiceResult<Interview>> {
    try {
      const updateData: any = {}
      
      if (updates.scheduledAt) updateData.scheduled_at = updates.scheduledAt.toISOString()
      if (updates.durationMinutes) updateData.duration_minutes = updates.durationMinutes
      if (updates.interviewLocation) updateData.interview_location = updates.interviewLocation
      if (updates.interviewMode) updateData.interview_mode = updates.interviewMode
      if (updates.status) updateData.status = updates.status
      if (updates.meetingNotes) updateData.meeting_notes = updates.meetingNotes
      if (updates.cancellationReason) {
        updateData.cancellation_reason = updates.cancellationReason
        updateData.cancelled_at = new Date().toISOString()
      }
      
      updateData.updated_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', interviewId)
        .select()
        .single()
      
      if (error) {
        console.error('Interview update error:', error)
        return { success: false, error: 'Failed to update interview', code: 'UPDATE_ERROR' }
      }
      
      const interview: Interview = this.mapDatabaseToInterview(data)
      
      return { success: true, data: interview }
    } catch (error) {
      console.error('Interview service error:', error)
      return { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }
    }
  }
  
  // Reschedule an interview
  async rescheduleInterview(interviewId: string, newDateTime: Date, reason?: string): Promise<ServiceResult<Interview>> {
    try {
      // First update the interview with new time
      const updateResult = await this.updateInterview(interviewId, {
        scheduledAt: newDateTime,
        status: 'rescheduled'
      })
      
      if (!updateResult.success) {
        return updateResult
      }
      
      // Add a comment about the rescheduling
      if (reason) {
        await supabase
          .from('application_comments')
          .insert({
            application_id: updateResult.data.applicationId,
            comment_text: `Interview rescheduled to ${newDateTime.toLocaleString()}. Reason: ${reason}`,
            comment_type: 'system_notification'
          })
      }
      
      return updateResult
    } catch (error) {
      console.error('Interview reschedule error:', error)
      return { success: false, error: 'Failed to reschedule interview', code: 'RESCHEDULE_ERROR' }
    }
  }
  
  // Submit interview feedback
  async submitFeedback(feedback: SubmitFeedbackRequest): Promise<ServiceResult<InterviewFeedback>> {
    try {
      // Insert feedback record
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('interview_feedback')
        .insert({
          interview_id: feedback.interviewId,
          interviewer_id: feedback.interviewId, // This should come from auth context
          technical_skills_rating: feedback.technicalSkillsRating,
          communication_rating: feedback.communicationRating,
          cultural_fit_rating: feedback.culturalFitRating,
          experience_relevance_rating: feedback.experienceRelevanceRating,
          strengths: feedback.strengths,
          concerns: feedback.concerns,
          additional_notes: feedback.additionalNotes,
          recommendation: feedback.recommendation,
          confidence_level: feedback.confidenceLevel
        })
        .select()
        .single()
      
      if (feedbackError) {
        console.error('Feedback submission error:', feedbackError)
        return { success: false, error: 'Failed to submit feedback', code: 'FEEDBACK_ERROR' }
      }
      
      // Update interview with overall rating and hiring recommendation
      if (feedback.overallRating || feedback.hiringRecommendation) {
        const interviewUpdates: any = { status: 'completed' }
        if (feedback.overallRating) interviewUpdates.overall_rating = feedback.overallRating
        if (feedback.hiringRecommendation) interviewUpdates.hiring_recommendation = feedback.hiringRecommendation
        if (feedback.decisionRationale) interviewUpdates.decision_rationale = feedback.decisionRationale
        
        await supabase
          .from('interviews')
          .update(interviewUpdates)
          .eq('id', feedback.interviewId)
      }
      
      // Update application pipeline stage to interview_completed
      const { data: interviewData } = await supabase
        .from('interviews')
        .select('application_id')
        .eq('id', feedback.interviewId)
        .single()
      
      if (interviewData) {
        await supabase
          .from('guard_leads')
          .update({
            pipeline_stage: 'interview_completed',
            stage_changed_at: new Date().toISOString()
          })
          .eq('id', interviewData.application_id)
      }
      
      const interviewFeedback: InterviewFeedback = this.mapDatabaseToFeedback(feedbackData)
      
      return { success: true, data: interviewFeedback }
    } catch (error) {
      console.error('Feedback service error:', error)
      return { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }
    }
  }
  
  // Get interviews by filters (for manager dashboards)
  async getInterviewsByFilters(filters: CalendarFilters): Promise<ServiceResult<Interview[]>> {
    try {
      let query = supabase.from('interviews').select('*')
      
      if (filters.guardIds?.length) {
        query = query.in('application_id', filters.guardIds)
      }
      
      if (filters.interviewTypes?.length) {
        query = query.in('interview_type', filters.interviewTypes)
      }
      
      if (filters.interviewerIds?.length) {
        query = query.in('interviewer_id', filters.interviewerIds)
      }
      
      if (filters.status?.length) {
        query = query.in('status', filters.status)
      }
      
      if (filters.dateRange) {
        query = query.gte('scheduled_at', filters.dateRange.startDate.toISOString())
                    .lte('scheduled_at', filters.dateRange.endDate.toISOString())
      }
      
      const { data, error } = await query.order('scheduled_at', { ascending: true })
      
      if (error) {
        console.error('Filtered interviews error:', error)
        return { success: false, error: 'Failed to fetch interviews', code: 'FETCH_ERROR' }
      }
      
      const interviews: Interview[] = data.map(this.mapDatabaseToInterview)
      
      return { success: true, data: interviews }
    } catch (error) {
      console.error('Interview service error:', error)
      return { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }
    }
  }
  
  // Simple availability checking (basic time slot validation)
  async checkAvailability(request: AvailabilityRequest): Promise<ServiceResult<TimeSlot[]>> {
    try {
      // Get existing interviews for the interviewer in the date range
      const { data: existingInterviews, error } = await supabase
        .from('interviews')
        .select('scheduled_at, duration_minutes')
        .eq('interviewer_id', request.interviewerId)
        .gte('scheduled_at', request.startDate.toISOString())
        .lte('scheduled_at', request.endDate.toISOString())
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
      
      if (error) {
        console.error('Availability check error:', error)
        return { success: false, error: 'Failed to check availability', code: 'AVAILABILITY_ERROR' }
      }
      
      // Simple time slot generation (9 AM - 5 PM, 1-hour slots)
      const timeSlots: TimeSlot[] = []
      const current = new Date(request.startDate)
      
      while (current <= request.endDate) {
        // Skip weekends
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          // Generate slots from 9 AM to 5 PM
          for (let hour = 9; hour < 17; hour++) {
            const slotStart = new Date(current)
            slotStart.setHours(hour, 0, 0, 0)
            
            const slotEnd = new Date(slotStart)
            slotEnd.setMinutes(slotEnd.getMinutes() + request.durationMinutes)
            
            // Check for conflicts
            const hasConflict = existingInterviews?.some(interview => {
              const interviewStart = new Date(interview.scheduled_at)
              const interviewEnd = new Date(interviewStart)
              interviewEnd.setMinutes(interviewEnd.getMinutes() + interview.duration_minutes)
              
              return (slotStart < interviewEnd && slotEnd > interviewStart)
            })
            
            timeSlots.push({
              start: slotStart,
              end: slotEnd,
              available: !hasConflict,
              conflictReason: hasConflict ? 'Existing interview scheduled' : undefined
            })
          }
        }
        
        current.setDate(current.getDate() + 1)
      }
      
      return { success: true, data: timeSlots }
    } catch (error) {
      console.error('Availability service error:', error)
      return { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }
    }
  }
  
  // Map database record to Interview interface
  private mapDatabaseToInterview(data: any): Interview {
    return {
      id: data.id,
      applicationId: data.application_id,
      interviewType: data.interview_type,
      scheduledAt: new Date(data.scheduled_at),
      durationMinutes: data.duration_minutes,
      interviewLocation: data.interview_location,
      interviewMode: data.interview_mode,
      interviewerId: data.interviewer_id,
      status: data.status,
      meetingNotes: data.meeting_notes,
      overallRating: data.overall_rating,
      hiringRecommendation: data.hiring_recommendation,
      decisionRationale: data.decision_rationale,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : undefined,
      cancellationReason: data.cancellation_reason,
      icsUid: data.ics_uid,
      lastIcsBroadcast: data.last_ics_broadcast ? new Date(data.last_ics_broadcast) : undefined
    }
  }
  
  // Map database record to InterviewFeedback interface
  private mapDatabaseToFeedback(data: any): InterviewFeedback {
    return {
      id: data.id,
      interviewId: data.interview_id,
      interviewerId: data.interviewer_id,
      technicalSkillsRating: data.technical_skills_rating,
      communicationRating: data.communication_rating,
      culturalFitRating: data.cultural_fit_rating,
      experienceRelevanceRating: data.experience_relevance_rating,
      strengths: data.strengths,
      concerns: data.concerns,
      additionalNotes: data.additional_notes,
      recommendation: data.recommendation,
      confidenceLevel: data.confidence_level,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
}