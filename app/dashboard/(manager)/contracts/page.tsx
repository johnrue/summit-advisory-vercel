"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  useSortable,
  SortableContext as SortableProvider
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Calendar, 
  Building2,
  Phone,
  Mail,
  MoreVertical,
  TrendingUp,
  Users,
  FileText,
  Eye
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Contract, ContractStatus } from '@/lib/types'
import { getContracts, updateContractStatus } from '@/lib/services/contract-management-service'

// Contract status configuration
const CONTRACT_STATUSES: Array<{
  id: ContractStatus
  label: string
  color: string
  description: string
}> = [
  { id: 'prospect', label: 'Prospect', color: 'bg-slate-100 text-slate-800', description: 'Initial contact made' },
  { id: 'proposal', label: 'Proposal', color: 'bg-blue-100 text-blue-800', description: 'Proposal sent to client' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-yellow-100 text-yellow-800', description: 'Terms being negotiated' },
  { id: 'signed', label: 'Signed', color: 'bg-green-100 text-green-800', description: 'Contract signed' },
  { id: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-800', description: 'Service active' },
  { id: 'renewal', label: 'Renewal', color: 'bg-purple-100 text-purple-800', description: 'Up for renewal' },
  { id: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800', description: 'Contract completed' },
  { id: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800', description: 'Deal lost' }
]

// Contract Card Component
function ContractCard({ contract }: { contract: Contract }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contract.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const statusConfig = CONTRACT_STATUSES.find(s => s.id === contract.status)
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(contract.estimatedValue)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3"
    >
      <Card className="cursor-move hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium line-clamp-2">
                {contract.clientName}
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                {contract.companyName || contract.clientName}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Proposal
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* Value */}
            <div className="flex items-center text-sm">
              <DollarSign className="mr-1 h-3 w-3 text-green-600" />
              <span className="font-medium text-green-600">{formattedValue}</span>
            </div>
            
            {/* Service Type */}
            <div className="flex items-center text-sm text-muted-foreground">
              <Building2 className="mr-1 h-3 w-3" />
              <span className="capitalize">{contract.serviceType}</span>
            </div>
            
            {/* Contact Info */}
            <div className="flex items-center text-xs text-muted-foreground">
              <Mail className="mr-1 h-3 w-3" />
              <span className="truncate">{contract.clientEmail}</span>
            </div>
            
            {contract.clientPhone && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Phone className="mr-1 h-3 w-3" />
                <span>{contract.clientPhone}</span>
              </div>
            )}
            
            {/* Dates */}
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="mr-1 h-3 w-3" />
              <span>
                {contract.startDate 
                  ? new Date(contract.startDate).toLocaleDateString()
                  : 'No start date'
                }
              </span>
            </div>
            
            {/* Monthly Value */}
            {contract.monthlyRecurringRevenue && (
              <div className="flex items-center text-xs">
                <TrendingUp className="mr-1 h-3 w-3 text-blue-600" />
                <span className="text-blue-600">
                  ${contract.monthlyRecurringRevenue.toLocaleString()}/mo
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Kanban Column Component
function KanbanColumn({ 
  status, 
  contracts, 
  onContractMove 
}: { 
  status: typeof CONTRACT_STATUSES[0]
  contracts: Contract[]
  onContractMove: (contractId: string, newStatus: ContractStatus) => void
}) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({ id: status.id })

  const totalValue = contracts.reduce((sum, contract) => sum + contract.estimatedValue, 0)
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(totalValue)

  return (
    <div ref={setNodeRef} className="flex-1 min-w-80">
      <Card className={`h-full ${isOver ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={status.color}>
                {status.label}
              </Badge>
              <span className="text-sm font-medium">{contracts.length}</span>
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {formattedTotal}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {status.description}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <SortableProvider items={contracts.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="min-h-96 max-h-96 overflow-y-auto">
              {contracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
              {contracts.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  No contracts in this stage
                </div>
              )}
            </div>
          </SortableProvider>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Contract Kanban Page
export default function ContractsKanbanPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load contracts
  useEffect(() => {
    loadContracts()
  }, [searchTerm, serviceTypeFilter])

  async function loadContracts() {
    setLoading(true)
    try {
      const filters = {
        search: searchTerm || undefined,
        serviceType: serviceTypeFilter !== 'all' ? [serviceTypeFilter] : undefined
      }

      const result = await getContracts(filters, 1, 100) // Load more contracts for Kanban view
      
      if (result.success && result.data) {
        setContracts(result.data.contracts)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load contracts',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error', 
        description: 'Failed to load contracts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle drag start
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  // Handle drag end
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const contractId = active.id as string
    const newStatus = over.id as ContractStatus

    // Optimistic update
    setContracts(prevContracts => 
      prevContracts.map(contract => 
        contract.id === contractId 
          ? { ...contract, status: newStatus }
          : contract
      )
    )

    // Update on server
    try {
      const result = await updateContractStatus(contractId, newStatus)
      
      if (!result.success) {
        // Revert optimistic update on failure
        loadContracts()
        toast({
          title: 'Error',
          description: result.error || 'Failed to update contract status',
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Success',
          description: 'Contract status updated successfully'
        })
      }
    } catch (error) {
      // Revert optimistic update on error
      loadContracts()
      toast({
        title: 'Error',
        description: 'Failed to update contract status',
        variant: 'destructive'
      })
    }
  }

  // Group contracts by status
  const contractsByStatus = contracts.reduce((acc, contract) => {
    if (!acc[contract.status]) {
      acc[contract.status] = []
    }
    acc[contract.status].push(contract)
    return acc
  }, {} as Record<ContractStatus, Contract[]>)

  // Get unique service types for filter
  const serviceTypes = Array.from(new Set(contracts.map(c => c.serviceType)))

  // Calculate summary stats
  const totalValue = contracts.reduce((sum, contract) => sum + contract.estimatedValue, 0)
  const activeContracts = contracts.filter(c => c.status === 'active').length
  const monthlyRevenue = contracts
    .filter(c => ['signed', 'active'].includes(c.status))
    .reduce((sum, contract) => sum + (contract.monthlyRecurringRevenue || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contract Pipeline</h1>
          <p className="text-muted-foreground">
            Manage your contracts through the sales pipeline
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Contract
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${monthlyRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search contracts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {serviceTypes.map((serviceType) => (
              <SelectItem key={serviceType} value={serviceType}>
                {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {CONTRACT_STATUSES.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              contracts={contractsByStatus[status.id] || []}
              onContractMove={handleDragEnd}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <ContractCard 
              contract={contracts.find(c => c.id === activeId)!} 
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}