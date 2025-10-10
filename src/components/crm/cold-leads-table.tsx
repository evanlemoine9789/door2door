"use client"

import { useState, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Globe, ChevronDown, X, MapPin, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useIsMobile } from "@/hooks/use-mobile"

// Types for the cold leads data
export interface ColdLead {
  id: string
  company: string
  contactName: string
  contactRole: string
  meetingStatus: 'pending' | 'scheduled' | 'ran' | 'cancelled'
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

interface ColdLeadsTableProps {
  leads: ColdLead[]
  onLeadSelect: (lead: ColdLead) => void
  selectedLeadId?: string
  // Pagination props
  currentPage?: number
  totalPages?: number
  totalLeads?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  loading?: boolean
  // Selection and bulk actions
  selectedLeadIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  onBulkDelete?: (leadIds: string[]) => Promise<void>
  // Filter props
  filters?: FilterState
  onFiltersChange?: (filters: FilterState) => void
}

interface FilterState {
  searchQuery: string
  selectedStates: string[]
  selectedCities: string[]
  selectedPracticeTypes: string[]
  sortField: 'company' | 'city' | 'state' | 'practiceType' | 'created_at'
  sortDir: 'asc' | 'desc' | undefined
}


export function ColdLeadsTable({ 
  leads, 
  onLeadSelect, 
  selectedLeadId,
  currentPage = 1,
  totalPages = 1,
  totalLeads = 0,
  pageSize = 100,
  onPageChange,
  onPageSizeChange,
  loading = false,
  selectedLeadIds = [],
  onSelectionChange,
  onBulkDelete,
  filters = {
    searchQuery: "",
    selectedStates: [],
    selectedCities: [],
    selectedPracticeTypes: [],
    sortField: 'created_at',
    sortDir: 'desc'
  },
  onFiltersChange
}: ColdLeadsTableProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  
  // State for all dropdown options from entire database
  const [allPracticeTypes, setAllPracticeTypes] = useState<string[]>([])
  const [allStates, setAllStates] = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  
  // Search state for filtering within popovers
  const [practiceTypeSearchTerm, setPracticeTypeSearchTerm] = useState("")
  const [stateSearchTerm, setStateSearchTerm] = useState("")
  const [citySearchTerm, setCitySearchTerm] = useState("")



  // Fetch all dropdown options from the database
  const fetchAllDropdownOptions = async () => {
    try {
      let allData: any[] = []
      let start = 0
      const batchSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('cold_leads')
          .select('practice_type, state, city')
          .is('deleted_at', null) // Only get non-deleted leads
          .range(start, start + batchSize - 1)

        if (error) {
          console.error('❌ Error fetching dropdown options batch:', error)
          return
        }

        if (!data || data.length === 0) break
        
        allData = [...allData, ...data]
        
        if (data.length < batchSize) break
        start += batchSize
      }

      // Extract unique values from the combined dataset
      const practiceTypes = Array.from(new Set(allData.map(row => row.practice_type).filter(Boolean))).sort()
      const states = Array.from(new Set(allData.map(row => row.state).filter(Boolean))).sort()
      const cities = Array.from(new Set(allData.map(row => row.city).filter(Boolean))).sort()

      setAllPracticeTypes(practiceTypes as string[])
      setAllStates(states as string[])
      setAllCities(cities as string[])
    } catch (error) {
      console.error('❌ Error fetching dropdown options:', error)
    }
  }

  // Load dropdown options on component mount
  useEffect(() => {
    fetchAllDropdownOptions()
  }, [])


  // No client-side filtering needed - filtering is done at database level
  const filteredAndSortedLeads = leads

  // Filtered dropdown options based on search terms
  const filteredPracticeTypes = useMemo(() => {
    if (!practiceTypeSearchTerm.trim()) return allPracticeTypes
    const query = practiceTypeSearchTerm.toLowerCase()
    return allPracticeTypes.filter(type => type.toLowerCase().includes(query))
  }, [practiceTypeSearchTerm, allPracticeTypes])

  const filteredStates = useMemo(() => {
    if (!stateSearchTerm.trim()) return allStates
    const query = stateSearchTerm.toLowerCase()
    return allStates.filter(state => state.toLowerCase().includes(query))
  }, [stateSearchTerm, allStates])

  const filteredCities = useMemo(() => {
    if (!citySearchTerm.trim()) return allCities
    const query = citySearchTerm.toLowerCase()
    return allCities.filter(city => city.toLowerCase().includes(query))
  }, [citySearchTerm, allCities])



  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'N/A') return phone
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    return phone
  }

  const handleWebsiteClick = (url: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row selection
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      window.open(fullUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const getLocationString = (city: string | null, state: string | null) => {
    if (!city && !state) return '–'
    if (city && state) return `${city}, ${state}`
    return city || state || '–'
  }

  // Selection helper functions
  const isLeadSelected = (leadId: string) => {
    return selectedLeadIds.includes(leadId)
  }

  const isAllSelected = () => {
    return filteredAndSortedLeads.length > 0 && filteredAndSortedLeads.every(lead => selectedLeadIds.includes(lead.id))
  }

  const isPartiallySelected = () => {
    const selectedCount = filteredAndSortedLeads.filter(lead => selectedLeadIds.includes(lead.id)).length
    return selectedCount > 0 && selectedCount < filteredAndSortedLeads.length
  }

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      onSelectionChange([...selectedLeadIds, leadId])
    } else {
      onSelectionChange(selectedLeadIds.filter(id => id !== leadId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      const allIds = filteredAndSortedLeads.map(lead => lead.id)
      onSelectionChange([...selectedLeadIds, ...allIds.filter(id => !selectedLeadIds.includes(id))])
    } else {
      const filteredIds = filteredAndSortedLeads.map(lead => lead.id)
      onSelectionChange(selectedLeadIds.filter(id => !filteredIds.includes(id)))
    }
  }

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedLeadIds.length === 0) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedLeadIds.length} selected lead${selectedLeadIds.length > 1 ? 's' : ''}? This action cannot be undone.`
    )
    
    if (!confirmed) return
    
    try {
      setIsDeleting(true)
      await onBulkDelete(selectedLeadIds)
      onSelectionChange?.([]) // Clear selection after successful delete
    } catch (error) {
      console.error('Error deleting leads:', error)
      alert('Failed to delete leads. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const isMobile = useIsMobile()

  // Mobile Card View Component
  const MobileLeadCard = ({ lead }: { lead: ColdLead }) => (
    <Card 
      className={`cursor-pointer transition-all border-0 shadow-none bg-transparent hover:bg-accent/50 ${
        selectedLeadId === lead.id ? 'bg-primary/10' : ''
      } ${
        isLeadSelected(lead.id) ? 'bg-primary/5' : ''
      }`}
      onClick={() => onLeadSelect(lead)}
    >
      <CardContent className="p-2">
        {/* Header with checkbox and company */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isLeadSelected(lead.id)}
            onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-card-foreground truncate leading-tight">
              {lead.company}
            </h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{lead.contactName || 'none'}</span>
              {(lead.city || lead.state) && (
                <>
                  <span>•</span>
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{getLocationString(lead.city, lead.state)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="w-full space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        {/* Search Bar */}
        <div className="relative w-full md:flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search leads, practices, or locations..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange?.({ ...filters, searchQuery: e.target.value })}
            className="pl-10 h-11 md:h-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        
        {/* Filter Buttons - Wrap on Mobile */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Practice Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-card border-border text-foreground hover:bg-accent h-11 md:h-9"
              >
                <span className="hidden sm:inline">Practice Type</span>
                <span className="sm:hidden">Type</span>
                {filters.selectedPracticeTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {filters.selectedPracticeTypes.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] bg-popover border-border" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground">Practice Types</h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={practiceTypeSearchTerm}
                      onChange={(event) => setPracticeTypeSearchTerm(event.target.value)}
                      placeholder="Search practice types..."
                      className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
                    />
                    {practiceTypeSearchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setPracticeTypeSearchTerm("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {filteredPracticeTypes.length > 0 ? (
                        filteredPracticeTypes.map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`practice-${type}`}
                              checked={filters.selectedPracticeTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onFiltersChange?.({ ...filters, selectedPracticeTypes: [...filters.selectedPracticeTypes, type] })
                                } else {
                                  onFiltersChange?.({ ...filters, selectedPracticeTypes: filters.selectedPracticeTypes.filter(t => t !== type) })
                                }
                              }}
                            />
                            <label
                              htmlFor={`practice-${type}`}
                              className="text-sm text-foreground cursor-pointer flex-1"
                            >
                              {type}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">No practice types found</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {filters.selectedPracticeTypes.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFiltersChange?.({ ...filters, selectedPracticeTypes: [] })}
                      className="w-full text-xs"
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* State Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-card border-border text-foreground hover:bg-accent h-11 md:h-9"
              >
                State
                {filters.selectedStates.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {filters.selectedStates.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] bg-popover border-border" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground">States</h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={stateSearchTerm}
                      onChange={(event) => setStateSearchTerm(event.target.value)}
                      placeholder="Search states..."
                      className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
                    />
                    {stateSearchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setStateSearchTerm("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {filteredStates.length > 0 ? (
                        filteredStates.map((state) => (
                          <div key={state} className="flex items-center space-x-2">
                            <Checkbox
                              id={`state-${state}`}
                              checked={filters.selectedStates.includes(state)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onFiltersChange?.({ ...filters, selectedStates: [...filters.selectedStates, state] })
                                } else {
                                  onFiltersChange?.({ ...filters, selectedStates: filters.selectedStates.filter(s => s !== state) })
                                }
                              }}
                            />
                            <label
                              htmlFor={`state-${state}`}
                              className="text-sm text-foreground cursor-pointer flex-1"
                            >
                              {state}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">No states found</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {filters.selectedStates.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFiltersChange?.({ ...filters, selectedStates: [] })}
                      className="w-full text-xs"
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* City Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-card border-border text-foreground hover:bg-accent h-11 md:h-9"
              >
                City
                {filters.selectedCities.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {filters.selectedCities.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] bg-popover border-border" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground">Cities</h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={citySearchTerm}
                      onChange={(event) => setCitySearchTerm(event.target.value)}
                      placeholder="Search cities..."
                      className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
                    />
                    {citySearchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                        onClick={() => setCitySearchTerm("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {filteredCities.length > 0 ? (
                        filteredCities.map((city) => (
                          <div key={city} className="flex items-center space-x-2">
                            <Checkbox
                              id={`city-${city}`}
                              checked={filters.selectedCities.includes(city)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onFiltersChange?.({ ...filters, selectedCities: [...filters.selectedCities, city] })
                                } else {
                                  onFiltersChange?.({ ...filters, selectedCities: filters.selectedCities.filter(c => c !== city) })
                                }
                              }}
                            />
                            <label
                              htmlFor={`city-${city}`}
                              className="text-sm text-foreground cursor-pointer flex-1"
                            >
                              {city}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">No cities found</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {filters.selectedCities.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFiltersChange?.({ ...filters, selectedCities: [] })}
                      className="w-full text-xs"
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Results Count - Show on larger screens only */}
          <div className="hidden md:block text-sm text-muted-foreground whitespace-nowrap">
            {filteredAndSortedLeads.length} results
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary">
                {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange?.([])}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}


      {/* Leads Display - Cards on Mobile, Table on Desktop */}
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-0">
          {filteredAndSortedLeads.map((lead) => (
            <MobileLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        // Desktop Table View
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected()}
                    onCheckedChange={handleSelectAll}
                    ref={(el) => {
                      if (el) {
                          (el as any).indeterminate = isPartiallySelected()
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="text-left text-muted-foreground font-medium w-1/4">COMPANY</TableHead>
                <TableHead className="text-left text-muted-foreground font-medium w-1/6">TYPE</TableHead>
                <TableHead className="text-left text-muted-foreground font-medium w-1/6">LOCATION</TableHead>
                <TableHead className="text-left text-muted-foreground font-medium w-1/6">PHONE</TableHead>
                <TableHead className="text-center text-muted-foreground font-medium w-1/6">WEBSITE</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredAndSortedLeads.map((lead) => (
              <TableRow 
                key={lead.id}
                className={`cursor-pointer hover:bg-accent transition-colors ${
                  selectedLeadId === lead.id ? 'bg-accent/50' : 'bg-card'
                } ${
                  isLeadSelected(lead.id) ? 'bg-primary/5' : ''
                }`}
                onClick={() => onLeadSelect(lead)}
              >
                <TableCell className="w-12">
                  <Checkbox
                    checked={isLeadSelected(lead.id)}
                    onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()} // Prevent row selection when clicking checkbox
                  />
                </TableCell>
                <TableCell className="text-left">
                  <div className="space-y-1">
                    <div className="font-medium text-card-foreground text-sm">{lead.company}</div>
                    <div className="text-xs text-muted-foreground">{lead.contactName}</div>
                  </div>
                </TableCell>
                <TableCell className="text-left text-muted-foreground text-sm">
                  {lead.contactRole || '–'}
                </TableCell>
                <TableCell className="text-left text-muted-foreground text-sm">
                  {getLocationString(lead.city, lead.state)}
                </TableCell>
                <TableCell className="text-left text-muted-foreground font-mono text-sm">
                  {formatPhoneNumber(lead.phoneNumber) || '–'}
                </TableCell>
                <TableCell className="text-center">
                  {lead.url ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleWebsiteClick(lead.url, e)}
                      className="h-7 px-2 text-xs"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Visit
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">–</span>
                  )}
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
        Showing {filteredAndSortedLeads.length} of {totalLeads} businesses
      </div>
    </div>
  )
}
