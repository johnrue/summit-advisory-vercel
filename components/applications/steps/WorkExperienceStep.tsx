"use client"

// Work Experience Step - Guard Application Form
// Collects employment history and relevant work experience

import React, { useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { Briefcase, Plus, Trash2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import type { ApplicationData } from '@/lib/types/guard-applications'

interface WorkExperienceStepProps {
  applicationToken: string
  enableAIAssist?: boolean
}

export function WorkExperienceStep({ applicationToken, enableAIAssist }: WorkExperienceStepProps) {
  const form = useFormContext<ApplicationData>()
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'work_experience'
  })

  const addWorkExperience = () => {
    append({
      id: crypto.randomUUID(),
      company: '',
      position: '',
      start_date: '',
      end_date: '',
      description: '',
      security_related: false,
      duties: [],
      supervisor_name: '',
      supervisor_contact: '',
      reason_for_leaving: ''
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Work Experience
          </CardTitle>
          <CardDescription>
            Please provide details about your employment history, starting with your most recent position.
            Include any security-related experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={addWorkExperience}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Work Experience
          </Button>
        </CardContent>
      </Card>

      {/* Work Experience Entries */}
      {fields.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No work experience added yet.</p>
              <p className="text-sm">Click "Add Work Experience" to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        fields.map((field, index) => (
          <Card key={field.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  Position {index + 1}
                  {form.watch(`work_experience.${index}.security_related`) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Security Related
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company and Position */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`work_experience.${index}.company`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Security Services" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`work_experience.${index}.position`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Security Guard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Employment Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`work_experience.${index}.start_date`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`work_experience.${index}.end_date`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank if this is your current position
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Security Related Checkbox */}
              <FormField
                control={form.control}
                name={`work_experience.${index}.security_related`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security-related position
                      </FormLabel>
                      <FormDescription>
                        Check this if the position involved security, law enforcement, military, or related duties
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Job Description */}
              <FormField
                control={form.control}
                name={`work_experience.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your key responsibilities and duties in this role..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include specific duties, achievements, and relevant skills developed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Supervisor Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`work_experience.${index}.supervisor_name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`work_experience.${index}.supervisor_contact`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone or email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reason for Leaving */}
              {!form.watch(`work_experience.${index}.end_date`) ? null : (
                <FormField
                  control={form.control}
                  name={`work_experience.${index}.reason_for_leaving`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Leaving</FormLabel>
                      <FormControl>
                        <Input placeholder="Career advancement, relocation, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Guidelines */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Work Experience Guidelines:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>List your most recent position first</li>
              <li>Include all employment for the past 7 years</li>
              <li>Explain any gaps in employment of 30 days or more</li>
              <li>Mark security-related positions to highlight relevant experience</li>
              <li>Be honest about reasons for leaving previous positions</li>
              <li>Provide supervisor contact information when possible</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}