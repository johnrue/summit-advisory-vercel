// Story 3.2: Shift Assignment Panel Component
// Main assignment interface for managers with eligibility checking and conflict detection

"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Star,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Shift } from '@/lib/types/shift-types';
import { 
  GuardEligibilityResult, 
  GuardMatchResult,
  AssignmentConflict,
  AssignmentMethod
} from '@/lib/types/assignment-types';

interface ShiftAssignmentPanelProps {
  shift: Shift;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (guardId: string, method: AssignmentMethod, notes?: string, overrideConflicts?: boolean, overrideReason?: string) => Promise<void>;
}

export default function ShiftAssignmentPanel({
  shift,
  isOpen,
  onClose,
  onAssign
}: ShiftAssignmentPanelProps) {
  const [eligibleGuards, setEligibleGuards] = useState<GuardEligibilityResult[]>([]);
  const [matchedGuards, setMatchedGuards] = useState<GuardMatchResult[]>([]);
  const [selectedGuard, setSelectedGuard] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useMatching, setUseMatching] = useState(true);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedConflicts, setSelectedConflicts] = useState<AssignmentConflict[]>([]);

  useEffect(() => {
    if (isOpen && shift.id) {
      loadEligibleGuards();
    }
  }, [isOpen, shift.id]);

  const loadEligibleGuards = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/shifts/${shift.id}/eligible-guards?include_matching=${useMatching}&limit=20`
      );
      const result = await response.json();

      if (result.success) {
        if (useMatching && result.data.matches) {
          setMatchedGuards(result.data.matches);
          setEligibleGuards(result.data.matches.map((m: GuardMatchResult) => m.eligibility));
        } else if (result.data.guards) {
          setEligibleGuards(result.data.guards);
          setMatchedGuards([]);
        }
      } else {
        console.error('Failed to load eligible guards:', result.error);
      }
    } catch (error) {
      console.error('Error loading eligible guards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardSelect = (guardId: string) => {
    setSelectedGuard(guardId);
    
    // Find conflicts for selected guard
    const guard = useMatching 
      ? matchedGuards.find(g => g.guardId === guardId)
      : { eligibility: eligibleGuards.find(g => g.guardId === guardId) };
    
    if (guard?.eligibility?.conflicts) {
      setSelectedConflicts(guard.eligibility.conflicts);
    } else {
      setSelectedConflicts([]);
    }
  };

  const handleAssign = async () => {
    if (!selectedGuard) return;

    setLoading(true);
    try {
      await onAssign(
        selectedGuard,
        useMatching ? 'suggested' : 'manual',
        assignmentNotes,
        overrideConflicts,
        overrideReason
      );
      onClose();
    } catch (error) {
      console.error('Assignment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderGuardCard = (guard: GuardEligibilityResult, match?: GuardMatchResult) => {
    const hasConflicts = guard.conflicts && guard.conflicts.length > 0;
    const criticalConflicts = guard.conflicts?.filter(c => c.severity === 'critical').length || 0;
    const isSelected = selectedGuard === guard.guardId;

    return (
      <Card 
        key={guard.guardId}
        className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
        onClick={() => handleGuardSelect(guard.guardId)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Guard #{guard.guardId.slice(0, 8)}</CardTitle>
            <div className="flex items-center gap-2">
              {match && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(match.matchScore * 100)}% match
                </Badge>
              )}
              <Badge variant={guard.eligible ? 'default' : 'destructive'}>
                {guard.eligible ? 'Eligible' : 'Not Eligible'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* Eligibility Score */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Eligibility Score:</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-current text-yellow-500" />
                <span>{Math.round(guard.eligibilityScore * 100)}%</span>
              </div>
            </div>

            {/* Performance Score */}
            {guard.performanceScore && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Performance:</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span>{Math.round(guard.performanceScore * 100)}%</span>
                </div>
              </div>
            )}

            {/* Proximity Score */}
            {guard.proximityScore && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Location:</span>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-blue-500" />
                  <span>{Math.round(guard.proximityScore * 100)}% match</span>
                </div>
              </div>
            )}

            {/* Conflicts */}
            {hasConflicts && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                <span className="text-orange-600">
                  {guard.conflicts!.length} conflict{guard.conflicts!.length > 1 ? 's' : ''}
                  {criticalConflicts > 0 && ` (${criticalConflicts} critical)`}
                </span>
              </div>
            )}

            {/* Key Reasons */}
            <div className="text-xs text-muted-foreground">
              {guard.reasons.slice(0, 2).map((reason, index) => (
                <div key={index} className="flex items-center gap-1">
                  <CheckCircle className="h-2 w-2" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>

            {/* Match Insights (for AI matches) */}
            {match && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs">
                    Rank #{match.ranking}
                  </Badge>
                  <Badge variant={match.confidence === 'high' ? 'default' : 
                                 match.confidence === 'medium' ? 'secondary' : 'outline'}>
                    {match.confidence} confidence
                  </Badge>
                </div>
                {match.strengths.length > 0 && (
                  <div className="mt-1 text-xs text-green-600">
                    <strong>Strengths:</strong> {match.strengths.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Guard to Shift
          </DialogTitle>
          <DialogDescription>
            {shift.title} • {shift.timeRange.start.toLocaleDateString()} {shift.timeRange.start.toLocaleTimeString()} - {shift.timeRange.end.toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Guard List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Available Guards</h3>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="use-matching" 
                  checked={useMatching}
                  onCheckedChange={(checked) => {
                    setUseMatching(checked as boolean);
                    loadEligibleGuards();
                  }}
                />
                <Label htmlFor="use-matching" className="text-sm">AI Matching</Label>
              </div>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading eligible guards...
                  </div>
                ) : eligibleGuards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No eligible guards found
                  </div>
                ) : (
                  eligibleGuards.map((guard, index) => 
                    renderGuardCard(guard, useMatching ? matchedGuards[index] : undefined)
                  )
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Column - Assignment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Assignment Details</h3>

            {selectedGuard && (
              <>
                {/* Selected Guard Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Selected Guard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      Guard ID: {selectedGuard}
                      {/* Add more guard details here when available */}
                    </div>
                  </CardContent>
                </Card>

                {/* Conflicts Warning */}
                {selectedConflicts.length > 0 && (
                  <Alert variant={selectedConflicts.some(c => c.severity === 'critical') ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <strong>Assignment Conflicts Detected:</strong>
                        {selectedConflicts.slice(0, 3).map((conflict, index) => (
                          <div key={index} className="text-sm">
                            • {conflict.message}
                          </div>
                        ))}
                        {selectedConflicts.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{selectedConflicts.length - 3} more conflicts
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Override Option */}
                {selectedConflicts.some(c => c.canOverride) && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="override-conflicts" 
                        checked={overrideConflicts}
                        onCheckedChange={(checked) => setOverrideConflicts(checked as boolean)}
                      />
                      <Label htmlFor="override-conflicts">Override conflicts</Label>
                    </div>
                    
                    {overrideConflicts && (
                      <Textarea
                        placeholder="Provide reason for overriding conflicts..."
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="min-h-[80px]"
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* Assignment Notes */}
            <div className="space-y-2">
              <Label htmlFor="assignment-notes">Assignment Notes</Label>
              <Textarea
                id="assignment-notes"
                placeholder="Add notes about this assignment..."
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedGuard || loading || (overrideConflicts && !overrideReason)}
          >
            {loading ? 'Assigning...' : 'Assign Guard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}