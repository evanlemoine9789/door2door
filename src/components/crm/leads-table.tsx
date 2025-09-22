"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, ArrowUpDown, AlertTriangle } from "lucide-react"

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
}

interface LeadsTableProps {
  leads: Lead[]
  onLeadSelect: (lead: Lead) => void
  selectedLeadId?: string
}

export function LeadsTable({ leads, onLeadSelect, selectedLeadId }: LeadsTableProps) {
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

  return (
    <div className="w-full space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusValue)}>
            <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
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
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortDir || "default"} onValueChange={(value) => setSortDir(value === "default" ? undefined : value as 'asc' | 'desc')}>
            <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="desc">Meeting Date (Newest)</SelectItem>
              <SelectItem value="asc">Meeting Date (Oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
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

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedLeads.length} of {leads.length} leads
      </div>
    </div>
  )
}
