"use client"

// Story 2.6: Calendar Subscription Manager Component
// Interface for managing ICS calendar subscriptions with RBAC-based access

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Trash2, Settings, Link, Copy, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { 
  CalendarSubscription, 
  SubscriptionType, 
  CalendarFilters,
  InterviewType,
  InterviewStatus
} from '@/lib/types/interview-types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface CalendarSubscriptionWithUrl extends CalendarSubscription {
  feedUrl: string
  managementUrl?: string
}

interface CreateSubscriptionRequest {
  subscriptionType: SubscriptionType
  filters?: CalendarFilters
}

const SUBSCRIPTION_TYPES: { value: SubscriptionType; label: string; description: string; icon: string }[] = [
  {
    value: 'guard_personal',
    label: 'Personal Schedule',
    description: 'Your personal interview schedule',
    icon: '👤'
  },
  {
    value: 'manager_team',
    label: 'Team Schedule',
    description: 'Interviews you are conducting',
    icon: '👥'
  },
  {
    value: 'manager_all',
    label: 'All Interviews',
    description: 'Complete interview schedule (Admin only)',
    icon: '📋'
  }
]

const INTERVIEW_TYPES: { value: InterviewType; label: string }[] = [
  { value: 'initial', label: 'Initial Screening' },
  { value: 'technical', label: 'Technical Assessment' },
  { value: 'behavioral', label: 'Behavioral Interview' },
  { value: 'final', label: 'Final Interview' },
  { value: 'follow_up', label: 'Follow-up Interview' }
]

const INTERVIEW_STATUSES: { value: InterviewStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
  { value: 'rescheduled', label: 'Rescheduled' }
]

export function CalendarSubscriptionManager({ className }: { className?: string }) {
  const [subscriptions, setSubscriptions] = useState<CalendarSubscriptionWithUrl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({})

  // New subscription form state
  const [newSubscriptionType, setNewSubscriptionType] = useState<SubscriptionType>('guard_personal')
  const [newFilters, setNewFilters] = useState<CalendarFilters>({})

  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/calendar/subscriptions', {
        headers: {
          'Authorization': 'Bearer mock-token' // This would be real auth token
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load calendar subscriptions')
      }

      const data = await response.json()
      
      if (data.success) {
        setSubscriptions(data.data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load calendar subscriptions')
      console.error('Calendar subscriptions loading error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const handleCreateSubscription = useCallback(async () => {
    setIsCreatingSubscription(true)
    setError(null)

    try {
      const request: CreateSubscriptionRequest = {
        subscriptionType: newSubscriptionType,
        filters: Object.keys(newFilters).length > 0 ? newFilters : undefined
      }

      const response = await fetch('/api/v1/calendar/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error('Failed to create calendar subscription')
      }

      const data = await response.json()
      
      if (data.success) {
        setSubscriptions(prev => [...prev, data.data])
        setIsCreateDialogOpen(false)
        setNewSubscriptionType('guard_personal')
        setNewFilters({})
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to create calendar subscription')
      console.error('Subscription creation error:', err)
    } finally {
      setIsCreatingSubscription(false)
    }
  }, [newSubscriptionType, newFilters])

  const handleDeleteSubscription = useCallback(async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/v1/calendar/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete calendar subscription')
      }

      const data = await response.json()
      
      if (data.success) {
        setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId))
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to delete calendar subscription')
      console.error('Subscription deletion error:', err)
    }
  }, [])

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedToken(label)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }, [])

  const toggleTokenVisibility = useCallback((subscriptionId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [subscriptionId]: !prev[subscriptionId]
    }))
  }, [])

  const getSubscriptionTypeConfig = (type: SubscriptionType) => {
    return SUBSCRIPTION_TYPES.find(t => t.value === type) || SUBSCRIPTION_TYPES[0]
  }

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading calendar subscriptions...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Subscriptions
            </CardTitle>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Subscription
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Calendar Subscription</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Subscription Type</Label>
                    <Select value={newSubscriptionType} onValueChange={(value) => setNewSubscriptionType(value as SubscriptionType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBSCRIPTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">{type.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList>
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="filters">Filters</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This will create a secure calendar feed that you can subscribe to in any calendar application (Google Calendar, Outlook, Apple Calendar, etc.)
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                    
                    <TabsContent value="filters" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Interview Types</Label>
                          <Select onValueChange={(value) => setNewFilters(prev => ({ ...prev, interviewTypes: value === 'all' ? undefined : [value as InterviewType] }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              {INTERVIEW_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Status Filter</Label>
                          <Select onValueChange={(value) => setNewFilters(prev => ({ ...prev, status: value === 'all' ? undefined : [value as InterviewStatus] }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              {INTERVIEW_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSubscription} disabled={isCreatingSubscription}>
                      {isCreatingSubscription ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Subscription
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Calendar Subscriptions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a calendar subscription to sync your interview schedule with your calendar app.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {subscriptions.map((subscription) => {
                  const typeConfig = getSubscriptionTypeConfig(subscription.subscriptionType)
                  const isTokenVisible = showTokens[subscription.id]
                  
                  return (
                    <Card key={subscription.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{typeConfig.icon}</span>
                          <div>
                            <h4 className="font-medium">{typeConfig.label}</h4>
                            <p className="text-sm text-muted-foreground">{typeConfig.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {subscription.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSubscription(subscription.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">CALENDAR FEED URL</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={subscription.feedUrl}
                              readOnly
                              className="font-mono text-xs"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(subscription.feedUrl, `feed-${subscription.id}`)}
                            >
                              {copiedToken === `feed-${subscription.id}` ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">ACCESS TOKEN</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={isTokenVisible ? subscription.accessToken : '••••••••••••••••••••••••••••••••'}
                              readOnly
                              className="font-mono text-xs"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleTokenVisibility(subscription.id)}
                            >
                              {isTokenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            {isTokenVisible && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(subscription.accessToken, `token-${subscription.id}`)}
                              >
                                {copiedToken === `token-${subscription.id}` ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Created: {format(subscription.createdAt, 'PPp')}</span>
                          {subscription.lastAccessed && (
                            <span>Last accessed: {format(subscription.lastAccessed, 'PPp')}</span>
                          )}
                          {subscription.expiresAt && (
                            <span>Expires: {format(subscription.expiresAt, 'PPp')}</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            How to Use Calendar Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">📱 Adding to Calendar Apps</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>Google Calendar:</strong> Settings → Add calendar → From URL → Paste feed URL</li>
                <li>• <strong>Outlook:</strong> Calendar → Add calendar → Subscribe from web → Paste feed URL</li>
                <li>• <strong>Apple Calendar:</strong> File → New Calendar Subscription → Paste feed URL</li>
                <li>• <strong>Other apps:</strong> Look for "Subscribe to calendar" or "Add ICS calendar" options</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">🔒 Security & Privacy</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Calendar feeds are secured with unique access tokens</li>
                <li>• Only you can access your personal interview schedule</li>
                <li>• Managers can create filtered team views with appropriate permissions</li>
                <li>• Subscriptions can be deactivated at any time</li>
                <li>• Feed URLs update automatically when interviews are scheduled or changed</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">⚡ Automatic Updates</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Calendar apps check for updates every hour</li>
                <li>• New interviews appear in your calendar automatically</li>
                <li>• Interview changes and cancellations are reflected immediately</li>
                <li>• No manual sync required - everything stays up to date</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}