"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { Search, Filter, ArrowUpDown } from "lucide-react"
import { useColdEmailLeads } from "@/hooks/use-coldemail-leads"
import { ColdEmailLeadDB, ColdEmailStatus } from "@/lib/supabase-coldemail"
import { ColdEmailLeadDetails } from "./coldemail-lead-details"

// Status filter types and options (excluding STOPPED)
type StatusValue = 'all' | 'Interested' | 'Information Request' | 'Meeting Request';
const STATUS_OPTIONS: { label: string; value: StatusValue }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Interested', value: 'Interested' },
  { label: 'Information Request', value: 'Information Request' },
  { label: 'Meeting Request', value: 'Meeting Request' },
];

interface ColdEmailLeadsTableProps {
  selectedLeadId?: string
}

export default function ColdEmailLeadsTable({ selectedLeadId }: ColdEmailLeadsTableProps) {
  const { leads, loading, error, statusFilter, setStatusFilter } = useColdEmailLeads()
  const [selectedLead, setSelectedLead] = useState<ColdEmailLeadDB | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")

  const handleLeadSelect = (lead: ColdEmailLeadDB) => {
    setSelectedLead(lead)
    setShowDetails(true)
  }

  const handleCloseDetails = () => {
    setShowDetails(false)
    setSelectedLead(null)
  }

  // Filter leads based on search and status
  const filteredLeads = leads.filter(lead => {
    const q = (searchQuery ?? '').toLowerCase()
    const matchesSearch = 
      (lead.company ?? '').toLowerCase().includes(q) ||
      (lead.name ?? '').toLowerCase().includes(q) ||
      (lead.lead_email ?? '').toLowerCase().includes(q)
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Sort leads by reply date if sortDir is set
  const cmpDate = (a?: string|null, b?: string|null) => {
    if (!a && !b) return 0;
    if (!a) return 1;    // nulls last
    if (!b) return -1;   // nulls last
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    return da - db;
  };
  
  const sortedLeads = sortDir
    ? [...filteredLeads].sort((x, y) => {
        const diff = cmpDate(x.reply_at, y.reply_at);
        return sortDir === 'asc' ? diff : -diff;
      })
    : filteredLeads;

  const getStatusBadge = (status: ColdEmailStatus) => {
    switch (status) {
      case 'Interested':
        return <Badge className="bg-green-500/60 hover:bg-green-600/70 text-white border border-green-400/30">Interested</Badge>
      case 'Information Request':
        return <Badge className="bg-amber-500/60 hover:bg-amber-600/70 text-white border border-amber-400/30">Information Request</Badge>
      case 'Meeting Request':
        return <Badge className="bg-blue-500/60 hover:bg-blue-600/70 text-white border border-blue-400/30">Meeting Request</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading cold email leads...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error loading cold email leads: {error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-lg font-semibold mb-2 text-card-foreground">Cold Email Leads</h1>
            <p className="text-muted-foreground text-xs">Manage your cold email campaigns and track responses</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search companies, contacts, or emails..."
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
                  <SelectItem value="desc">Reply Date (Newest)</SelectItem>
                  <SelectItem value="asc">Reply Date (Oldest)</SelectItem>
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
                  <TableHead className="text-center text-muted-foreground font-medium">STATUS</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">REPLY DATE</TableHead>
                  <TableHead className="text-center text-muted-foreground font-medium">EMAIL ACCOUNT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeads.map((lead) => (
                  <TableRow 
                    key={lead.id}
                    className={`cursor-pointer hover:bg-accent transition-colors ${
                      selectedLeadId === lead.id ? 'bg-accent/50' : 'bg-card'
                    }`}
                    onClick={() => handleLeadSelect(lead)}
                  >
                    <TableCell className="text-left">
                      <div className="space-y-1">
                        <div className="font-medium text-card-foreground">{lead.company || 'Unknown Company'}</div>
                        <div className="text-sm text-muted-foreground">{lead.name || lead.lead_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(lead.status)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(lead.reply_at)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {lead.email_account || '–'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {sortedLeads.length} of {leads.length} cold email leads
          </div>
        </div>

        {/* Lead Details Drawer */}
        <Drawer open={showDetails} onOpenChange={setShowDetails} direction="right">
          <DrawerContent className="!w-1/2 !max-w-none bg-background border-l border-border overflow-y-auto overflow-x-hidden">
            <ColdEmailLeadDetails lead={selectedLead} />
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
