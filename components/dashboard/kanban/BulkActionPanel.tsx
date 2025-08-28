"use client";

// Story 3.4: Bulk Action Panel Component
// Multi-shift operations with validation and progress tracking

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Star, 
  Mail, 
  Copy, 
  Loader2,
  RefreshCw,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

import type { BulkActionRequest, BulkOperation } from '@/lib/types/kanban-types';

interface BulkActionPanelProps {
  selectedShifts: string[];
  managerId: string;
  onActionComplete?: () => void;
  className?: string;
}

interface OperationProgress {
  operation: BulkOperation | null;
  isExecuting: boolean;
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
}

export function BulkActionPanel({
  selectedShifts,
  managerId,
  onActionComplete,
  className
}: BulkActionPanelProps) {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [actionParameters, setActionParameters] = useState<Record<string, any>>({});
  const [operationReason, setOperationReason] = useState('');
  const [progress, setProgress] = useState<OperationProgress>({
    operation: null,
    isExecuting: false,
    currentStep: 0,
    totalSteps: 0,
    stepDescription: ''
  });

  // Available bulk actions
  const bulkActions = [
    {
      id: 'status_change',
      label: 'Change Status',
      description: 'Update status for multiple shifts',
      icon: CheckCircle,
      requiresParameters: true,
      parameters: ['newStatus']
    },
    {
      id: 'assign',
      label: 'Assign Guard',
      description: 'Assign a guard to multiple shifts',
      icon: Users,
      requiresParameters: true,
      parameters: ['guardId']
    },
    {
      id: 'priority_update',
      label: 'Update Priority',
      description: 'Change priority level for multiple shifts',
      icon: Star,
      requiresParameters: true,
      parameters: ['priority']
    },
    {
      id: 'notification',
      label: 'Send Notification',
      description: 'Send notification to assigned guards',
      icon: Mail,
      requiresParameters: true,
      parameters: ['message']
    },
    {
      id: 'clone',
      label: 'Clone Shifts',
      description: 'Create copies of selected shifts',
      icon: Copy,
      requiresParameters: true,
      parameters: ['templateId']
    }
  ];

  // Status options for status change action
  const statusOptions = [
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'issue_logged', label: 'Issue Logged' },
    { value: 'archived', label: 'Archived' }
  ];

  // Priority options
  const priorityOptions = [
    { value: 1, label: 'Low (1)' },
    { value: 2, label: 'Medium (2)' },
    { value: 3, label: 'Normal (3)' },
    { value: 4, label: 'High (4)' },
    { value: 5, label: 'Critical (5)' }
  ];

  // Get selected action details
  const selectedActionDetails = useMemo(() => {
    return bulkActions.find(action => action.id === selectedAction);
  }, [selectedAction]);

  // Validate action parameters
  const canExecute = useMemo(() => {
    if (selectedShifts.length === 0) return false;
    if (!selectedAction) return false;
    
    const actionDetails = selectedActionDetails;
    if (!actionDetails) return false;

    if (actionDetails.requiresParameters) {
      for (const param of actionDetails.parameters) {
        if (!actionParameters[param]) return false;
      }
    }

    return true;
  }, [selectedShifts, selectedAction, selectedActionDetails, actionParameters]);

  // Handle parameter change
  const updateParameter = useCallback((key: string, value: any) => {
    setActionParameters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Execute bulk action
  const executeBulkAction = useCallback(async () => {
    if (!canExecute) return;

    try {
      setProgress({
        operation: null,
        isExecuting: true,
        currentStep: 0,
        totalSteps: selectedShifts.length,
        stepDescription: 'Preparing bulk operation...'
      });

      const bulkRequest: BulkActionRequest = {
        action: selectedAction as any,
        shiftIds: selectedShifts,
        parameters: actionParameters,
        reason: operationReason
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev.currentStep < prev.totalSteps - 1) {
            return {
              ...prev,
              currentStep: prev.currentStep + 1,
              stepDescription: `Processing shift ${prev.currentStep + 2} of ${prev.totalSteps}...`
            };
          }
          return prev;
        });
      }, 500);

      const response = await fetch('/api/v1/shifts/bulk-actions', {
        method: 'POST',
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bulkRequest)
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Bulk operation failed');
      }

      const operation = result.data.operation;
      const summary = result.data.summary;

      setProgress({
        operation,
        isExecuting: false,
        currentStep: selectedShifts.length,
        totalSteps: selectedShifts.length,
        stepDescription: `Completed: ${summary.successCount} successful, ${summary.failureCount} failed`
      });

      // Show success toast
      toast.success(
        `Bulk ${selectedActionDetails?.label} completed: ${summary.successCount}/${summary.totalShifts} successful`
      );

      // Clear form
      setSelectedAction('');
      setActionParameters({});
      setOperationReason('');

      // Notify parent
      onActionComplete?.();

    } catch (error) {
      console.error('Bulk action error:', error);
      
      setProgress({
        operation: null,
        isExecuting: false,
        currentStep: 0,
        totalSteps: 0,
        stepDescription: ''
      });

      toast.error(error instanceof Error ? error.message : 'Bulk operation failed');
    }
  }, [canExecute, selectedAction, selectedShifts, actionParameters, operationReason, managerId, selectedActionDetails, onActionComplete]);

  // Reset progress
  const resetProgress = useCallback(() => {
    setProgress({
      operation: null,
      isExecuting: false,
      currentStep: 0,
      totalSteps: 0,
      stepDescription: ''
    });
  }, []);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Bulk Actions
              {selectedShifts.length > 0 && (
                <Badge variant="secondary">
                  {selectedShifts.length} shift{selectedShifts.length > 1 ? 's' : ''} selected
                </Badge>
              )}
            </span>
            {progress.operation && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetProgress}
                disabled={progress.isExecuting}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Results
              </Button>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {selectedShifts.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Select one or more shifts from the Kanban board to perform bulk operations.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Action Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Action</Label>
                  <Select
                    value={selectedAction}
                    onValueChange={setSelectedAction}
                    disabled={progress.isExecuting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a bulk action..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <SelectItem key={action.id} value={action.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{action.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {action.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Parameters */}
                {selectedActionDetails?.requiresParameters && (
                  <div className="space-y-4">
                    <Separator />
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Action Parameters</Label>

                      {/* Status Change Parameters */}
                      {selectedAction === 'status_change' && (
                        <div className="space-y-2">
                          <Label className="text-sm">New Status</Label>
                          <Select
                            value={actionParameters.newStatus || ''}
                            onValueChange={(value) => updateParameter('newStatus', value)}
                            disabled={progress.isExecuting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select new status..." />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Guard Assignment Parameters */}
                      {selectedAction === 'assign' && (
                        <div className="space-y-2">
                          <Label className="text-sm">Guard ID</Label>
                          <Input
                            placeholder="Enter guard ID..."
                            value={actionParameters.guardId || ''}
                            onChange={(e) => updateParameter('guardId', e.target.value)}
                            disabled={progress.isExecuting}
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter the UUID of the guard to assign to selected shifts
                          </p>
                        </div>
                      )}

                      {/* Priority Update Parameters */}
                      {selectedAction === 'priority_update' && (
                        <div className="space-y-2">
                          <Label className="text-sm">New Priority</Label>
                          <Select
                            value={actionParameters.priority?.toString() || ''}
                            onValueChange={(value) => updateParameter('priority', parseInt(value, 10))}
                            disabled={progress.isExecuting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority level..." />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityOptions.map((priority) => (
                                <SelectItem key={priority.value} value={priority.value.toString()}>
                                  <div className="flex items-center gap-2">
                                    <Star className={`h-4 w-4 ${priority.value >= 4 ? 'text-orange-500' : 'text-gray-400'}`} />
                                    {priority.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Notification Parameters */}
                      {selectedAction === 'notification' && (
                        <div className="space-y-2">
                          <Label className="text-sm">Notification Message</Label>
                          <Textarea
                            placeholder="Enter message to send to guards..."
                            value={actionParameters.message || ''}
                            onChange={(e) => updateParameter('message', e.target.value)}
                            disabled={progress.isExecuting}
                            className="min-h-20"
                            maxLength={500}
                          />
                          <p className="text-xs text-muted-foreground">
                            {actionParameters.message?.length || 0}/500 characters
                          </p>
                        </div>
                      )}

                      {/* Clone Parameters */}
                      {selectedAction === 'clone' && (
                        <div className="space-y-2">
                          <Label className="text-sm">Template ID</Label>
                          <Input
                            placeholder="Enter template ID..."
                            value={actionParameters.templateId || ''}
                            onChange={(e) => updateParameter('templateId', e.target.value)}
                            disabled={progress.isExecuting}
                          />
                          <p className="text-xs text-muted-foreground">
                            Template to use for cloning selected shifts
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Operation Reason */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reason (Optional)</Label>
                  <Input
                    placeholder="Describe why you're performing this bulk action..."
                    value={operationReason}
                    onChange={(e) => setOperationReason(e.target.value)}
                    disabled={progress.isExecuting}
                  />
                </div>
              </div>

              {/* Progress Display */}
              {progress.isExecuting && (
                <div className="space-y-3">
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Progress</Label>
                      <span className="text-sm text-muted-foreground">
                        {progress.currentStep} of {progress.totalSteps}
                      </span>
                    </div>
                    <Progress 
                      value={(progress.currentStep / progress.totalSteps) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {progress.stepDescription}
                    </p>
                  </div>
                </div>
              )}

              {/* Operation Results */}
              {progress.operation && !progress.isExecuting && (
                <div className="space-y-3">
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Operation Results</Label>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="text-sm font-medium">
                                {progress.operation.results?.filter(r => r.success).length || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">Successful</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <div>
                              <div className="text-sm font-medium">
                                {progress.operation.results?.filter(r => !r.success).length || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">Failed</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="text-sm font-medium">
                                {progress.operation.shiftIds?.length || 0}
                              </div>
                              <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Failed Operations Details */}
                    {progress.operation.results?.some(r => !r.success) && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-red-600">Failed Operations</Label>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {progress.operation.results
                            .filter(r => !r.success)
                            .map((result) => (
                              <Alert key={result.shiftId} variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  Shift {result.shiftId.slice(0, 8)}...: {result.error}
                                </AlertDescription>
                              </Alert>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAction('');
                    setActionParameters({});
                    setOperationReason('');
                    resetProgress();
                  }}
                  disabled={progress.isExecuting}
                >
                  Clear
                </Button>
                
                <Button
                  onClick={executeBulkAction}
                  disabled={!canExecute || progress.isExecuting}
                  className="min-w-32"
                >
                  {progress.isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {selectedActionDetails?.icon && (
                        <selectedActionDetails.icon className="h-4 w-4 mr-2" />
                      )}
                      Execute Action
                    </>
                  )}
                </Button>
              </div>

              {/* Help Text */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Bulk actions affect multiple shifts simultaneously. Operations cannot be undone, 
                  but are logged for audit purposes. Consider testing with a small selection first.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}