"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, ArrowUpDown, AlertTriangle, MapPin } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

// Status filter types and options
type StatusValue = 'all' | 'scheduled' | 'ran' | 'cancelled';
const STATUS_OPTIONS: { label: string; value: StatusValue }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Scheduled',   value: 'scheduled' },
  { label: 'Ran',         value: 'ran' },
  { label: 'Cancelled',   value: 'cancelled' },
];

// Types for the leads data
export interface Lead {
  id: string
  company: string
  contactName: string
  contactRole: string
  meetingStatus: 'scheduled' | 'ran' | 'cancelled'
  meetingDate: string | null
  meetingTime: string | null
  dateBooked: string
  phoneNumber: string
  url: string
  rep: string
  bookedWith: string
  callRecording: string
  address: string | null
  city: string | null
  state: string | null
  lastUpdated: string
  callDate: string | null
}

interface LeadsTableProps {
  leads: Lead[]
  onLeadSelect: (lead: Lead) => void
  selectedLeadId?: string
  // Pagination props
  currentPage?: number
  totalPages?: number
  totalLeads?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  loading?: boolean
}

export function LeadsTable({ 
  leads, 
  onLeadSelect, 
  selectedLeadId,
  currentPage = 1,
  totalPages = 1,
  totalLeads = 0,
  pageSize = 50,
  onPageChange,
  onPageSizeChange,
  loading = false
}: LeadsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusValue>("all")
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)

  // Filter leads based on search and status
  const filteredLeads = leads.filter(lead => {
    const q = (searchQuery ?? '').toLowerCase()
    const matchesSearch = 
      (lead.company ?? '').toLowerCase().includes(q) ||
      (lead.contactName ?? '').toLowerCase().includes(q)
    
    const matchesStatus = statusFilter === "all" || lead.meetingStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Sort leads by meeting date if sortDir is set
  const cmpDate = (a?: string|null, b?: string|null) => {
    if (!a && !b) return 0;
    if (!a) return 1;    // nulls last
    if (!b) return -1;   // nulls last
    // a/b are 'YYYY-MM-DD' or other parseable strings
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    return da - db;
  };
  
  const sortedLeads = sortDir
    ? [...filteredLeads].sort((x, y) => {
        const diff = cmpDate(x.meetingDate, y.meetingDate);
        return sortDir === 'asc' ? diff : -diff;
      })
    : filteredLeads;

  const getStatusBadge = (status: Lead['meetingStatus']) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500/60 hover:bg-blue-600/70 text-white border border-blue-400/30">Scheduled</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/60 hover:bg-red-600/70 text-white border border-red-400/30">Cancelled</Badge>
      case 'ran':
        return <Badge className="bg-green-500/60 hover:bg-green-600/70 text-white border border-green-400/30">Ran</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    
    // Handle YYYY-MM-DD format from Supabase without timezone issues
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number)
      return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      })
    }
    
    // Handle other date formats
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isMeetingDataMissing = (lead: Lead) => {
    return !lead.meetingDate || !lead.meetingTime || lead.meetingDate.trim() === '' || lead.meetingTime.trim() === ''
  }

  const isMobile = useIsMobile()

  // Mobile Card View Component
  const MobileLeadCard = ({ lead }: { lead: Lead }) => (
    <Card 
      className={`cursor-pointer transition-all border-0 shadow-none bg-card hover:bg-accent/50 ${
        selectedLeadId === lead.id ? 'bg-primary/10' : ''
      }`}
      onClick={() => onLeadSelect(lead)}
    >
      <CardContent className="py-4 px-3">
        {/* Header with company and status */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-card-foreground truncate leading-normal">
              {lead.company}
            </h3>
            <p className="text-sm text-muted-foreground leading-normal mt-1 truncate">
              {lead.contactName}
            </p>
            {(lead.city || lead.state) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground leading-normal mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{getLocationString(lead.city, lead.state)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusBadgeClass(lead.meetingStatus)}>
              {lead.meetingStatus}
            </Badge>
            {isMeetingDataMissing(lead) && (
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const getLocationString = (city: string | null, state: string | null) => {
    if (!city && !state) return '–'
    if (city && state) return `${city}, ${state}`
    return city || state || '–'
  }

  const getStatusBadgeClass = (status: Lead['meetingStatus']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/60 hover:bg-blue-600/70 text-white border border-blue-400/30'
      case 'cancelled':
        return 'bg-red-500/60 hover:bg-red-600/70 text-white border border-red-400/30'
      case 'ran':
        return 'bg-green-500/60 hover:bg-green-600/70 text-white border border-green-400/30'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        {/* Search Bar */}
        <div className="relative w-full md:flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 md:h-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        
        {/* Filter Buttons - Wrap on Mobile */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusValue)}>
            <SelectTrigger className="h-11 md:h-9 bg-card border-border text-foreground">
              <Filter className="h-4 w-4 text-muted-foreground mr-2" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortDir || "default"} onValueChange={(value) => setSortDir(value === "default" ? undefined : value as 'asc' | 'desc')}>
            <SelectTrigger className="h-11 md:h-9 bg-card border-border text-foreground">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground mr-2" />
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="desc">Meeting Date (Newest)</SelectItem>
              <SelectItem value="asc">Meeting Date (Oldest)</SelectItem>
            </SelectContent>
          </Select>

          {/* Results Count - Show on larger screens only */}
          <div className="hidden md:block text-sm text-muted-foreground whitespace-nowrap">
            {filteredLeads.length} results
          </div>
        </div>
      </div>

      {/* Leads Display - Cards on Mobile, Table on Desktop */}
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-2">
          {filteredLeads.map((lead) => (
            <MobileLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        // Desktop Table View
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="text-left text-muted-foreground font-medium">COMPANY</TableHead>
              <TableHead className="text-center text-muted-foreground font-medium">MEETING STATUS</TableHead>
              <TableHead className="text-center text-muted-foreground font-medium">MEETING DATE</TableHead>
              <TableHead className="text-center text-muted-foreground font-medium">MEETING TIME</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.map((lead) => (
              <TableRow 
                key={lead.id}
                className={`cursor-pointer hover:bg-accent transition-colors ${
                  selectedLeadId === lead.id ? 'bg-accent/50' : 'bg-card'
                }`}
                onClick={() => onLeadSelect(lead)}
              >
                <TableCell className="text-left">
                  <div className="space-y-1">
                    <div className="font-medium text-card-foreground">{lead.company}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      {lead.contactName}
                      {isMeetingDataMissing(lead) && (
                        <button
                          className="text-amber-500 hover:text-amber-600 transition-colors"
                          title="Missing meeting date or time"
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(lead.meetingStatus)}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {formatDate(lead.meetingDate)}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {lead.meetingTime || '–'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {onPageChange && onPageSizeChange && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalLeads} total leads)
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
                disabled={loading}
                className="text-sm border border-border rounded px-2 py-1 bg-background"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value={200}>200 per page</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedLeads.length} of {totalLeads} leads
      </div>
    </div>
  )
}
