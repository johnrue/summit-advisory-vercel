"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight,
  Shield, Clock, FileText, User, Building, GraduationCap, Phone
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { 
  ValidationReport, 
  ValidationResult, 
  ValidationError,
  ConsistencyCheckResult 
} from "@/lib/services/resume-data-validator"
import type { GuardApplication } from "@/lib/types/guard-applications"

interface ValidationReportInterfaceProps {
  application: GuardApplication
  onRunValidation?: () => Promise<void>
  onFixIssue?: (field: string, suggestion: string) => Promise<void>
  className?: string
}

export default function ValidationReportInterface({
  application,
  onRunValidation,
  onFixIssue,
  className
}: ValidationReportInterfaceProps) {
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']))

  useEffect(() => {
    if (application.id) {
      fetchValidationReport()
    }
  }, [application.id])

  const fetchValidationReport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/applications/${application.id}/validation`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        setReport(result.data)
      }
    } catch (error) {
      console.error('Error fetching validation report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRunValidation = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/applications/${application.id}/validation/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        setReport(result.data)
        if (onRunValidation) {
          await onRunValidation()
        }
      }
    } catch (error) {
      console.error('Error running validation:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getSeverityColor = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getConsistencyStatusColor = (status: ConsistencyCheckResult['status']) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const groupResultsByCategory = (results: ValidationResult[]) => {
    const categories = {
      personal_info: results.filter(r => r.field.includes('personal_info') || r.field.includes('email') || r.field.includes('phone') || r.field.includes('address')),
      work_experience: results.filter(r => r.field.includes('work_experience')),
      education: results.filter(r => r.field.includes('education')),
      certifications: results.filter(r => r.field.includes('certifications')),
      references: results.filter(r => r.field.includes('references')),
      other: results.filter(r => !r.field.includes('personal_info') && !r.field.includes('work_experience') && !r.field.includes('education') && !r.field.includes('certifications') && !r.field.includes('references') && !r.field.includes('email') && !r.field.includes('phone') && !r.field.includes('address'))
    }
    return categories
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal_info': return <User className="h-4 w-4" />
      case 'work_experience': return <Building className="h-4 w-4" />
      case 'education': return <GraduationCap className="h-4 w-4" />
      case 'certifications': return <Shield className="h-4 w-4" />
      case 'references': return <Phone className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  if (!report && !loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Validation Report Available</h3>
            <p className="text-muted-foreground mb-4">
              Run data validation to check extracted information quality
            </p>
            <Button onClick={handleRunValidation} disabled={loading}>
              {loading ? 'Running Validation...' : 'Run Validation'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
        <p className="text-muted-foreground">Loading validation report...</p>
      </div>
    )
  }

  const categorizedResults = groupResultsByCategory(report.field_results)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>Data Validation Report</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRunValidation}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Re-run Validation'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={cn("text-3xl font-bold", getScoreColor(report.overall_score))}>
                {Math.round(report.overall_score)}%
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <Progress value={report.overall_score} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {report.valid_fields}
              </div>
              <div className="text-sm text-muted-foreground">
                Valid Fields (of {report.total_fields})
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {report.error_count}
              </div>
              <div className="text-sm text-muted-foreground">Critical Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {report.warning_count}
              </div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
          </div>

          {report.recommendations.length > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {report.recommendations.map((rec, index) => (
                    <div key={index} className="text-sm">• {rec}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Tabs defaultValue="field-validation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="field-validation">Field Validation</TabsTrigger>
          <TabsTrigger value="consistency-checks">Consistency Checks</TabsTrigger>
        </TabsList>

        <TabsContent value="field-validation" className="space-y-4">
          {Object.entries(categorizedResults).map(([category, results]) => {
            if (results.length === 0) return null
            
            const categoryErrors = results.reduce((sum, r) => sum + r.validationErrors.length, 0)
            const categoryValid = results.filter(r => r.isValid).length
            
            return (
              <Card key={category}>
                <Collapsible 
                  open={expandedSections.has(category)}
                  onOpenChange={() => toggleSection(category)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getCategoryIcon(category)}
                          <div>
                            <CardTitle className="text-lg capitalize">
                              {category.replace('_', ' ')}
                            </CardTitle>
                            <div className="text-sm text-muted-foreground">
                              {categoryValid}/{results.length} valid • {categoryErrors} issues
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={categoryErrors === 0 ? "default" : "secondary"}
                            className={categoryErrors === 0 ? "bg-green-100 text-green-800" : ""}
                          >
                            {categoryErrors === 0 ? 'Clean' : `${categoryErrors} Issues`}
                          </Badge>
                          {expandedSections.has(category) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {results.map((result, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  {result.isValid ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                    {result.field}
                                  </code>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(result.confidence * 100)}% confidence
                                  </Badge>
                                </div>
                                
                                <div className="mt-2 text-sm">
                                  <span className="font-medium">Value:</span>
                                  <span className="ml-2 font-mono text-xs bg-gray-50 px-2 py-1 rounded">
                                    {typeof result.originalValue === 'object' 
                                      ? JSON.stringify(result.originalValue)
                                      : String(result.originalValue)
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>

                            {result.validationErrors.length > 0 && (
                              <div className="space-y-2">
                                {result.validationErrors.map((error, errorIndex) => (
                                  <Alert key={errorIndex} className="py-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription className="flex items-center justify-between">
                                      <div>
                                        <Badge 
                                          variant="outline" 
                                          className={cn("text-xs mr-2", getSeverityColor(error.severity))}
                                        >
                                          {error.severity}
                                        </Badge>
                                        {error.message}
                                      </div>
                                      {error.autoFixSuggestion && onFixIssue && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="ml-2"
                                          onClick={() => onFixIssue(result.field, error.autoFixSuggestion!)}
                                        >
                                          Auto-fix
                                        </Button>
                                      )}
                                    </AlertDescription>
                                  </Alert>
                                ))}
                              </div>
                            )}

                            {result.suggestions && result.suggestions.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  Suggestions:
                                </div>
                                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                                  {result.suggestions.map((suggestion, suggestionIndex) => (
                                    <li key={suggestionIndex}>{suggestion}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="consistency-checks" className="space-y-4">
          {report.consistency_checks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-semibold mb-2">No Consistency Issues</h3>
                <p className="text-muted-foreground">All data consistency checks passed</p>
              </CardContent>
            </Card>
          ) : (
            report.consistency_checks.map((check, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {check.status === 'passed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : check.status === 'failed' ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{check.description}</h4>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getConsistencyStatusColor(check.status))}
                        >
                          {check.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {check.check_type}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {check.details}
                      </p>
                      
                      {check.affected_fields.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Affected fields:</span>
                          {check.affected_fields.map((field, fieldIndex) => (
                            <code key={fieldIndex} className="ml-2 bg-gray-100 px-1 rounded">
                              {field}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Re-export for convenience
export { ValidationReportInterface }