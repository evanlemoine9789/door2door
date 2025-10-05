"use client"

import { useState, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Globe, ChevronDown, Trash2, Save, Bookmark, MoreHorizontal } from "lucide-react"
import { useDropdownOptions } from "@/hooks/use-dropdown-options"
import { SearchableDropdown } from "@/components/ui/searchable-dropdown"

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

interface SavedSearch {
  id: string
  name: string
  filters: FilterState
  createdAt: string
}

const SAVED_SEARCHES_STORAGE_KEY = "cold_leads_saved_searches"

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
  
  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [newSavedSearchName, setNewSavedSearchName] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Use the new search-based dropdown hook
  const {
    searchPracticeTypes,
    searchStates,
    searchCities
  } = useDropdownOptions()


  // Load saved searches from localStorage
  const loadSavedSearches = () => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as SavedSearch[]
      setSavedSearches(parsed)
    } catch (err) {
      console.error("Failed to load saved searches", err)
    }
  }

  // Persist saved searches to localStorage
  const persistSavedSearches = (searches: SavedSearch[]) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(searches))
    } catch (err) {
      console.error("Failed to persist saved searches", err)
    }
  }

  // Save current search
  const saveCurrentSearch = () => {
    const trimmed = newSavedSearchName.trim()
    if (!trimmed) {
      setSaveError("Name is required")
      return
    }

    const now = new Date().toISOString()
    const newSavedSearch: SavedSearch = {
      id: `${now}-${Math.random().toString(36).slice(2)}`,
      name: trimmed,
      filters,
      createdAt: now,
    }

    const updated = [...savedSearches, newSavedSearch]
    setSavedSearches(updated)
    persistSavedSearches(updated)
    setIsSaveDialogOpen(false)
    setNewSavedSearchName("")
    setSaveError(null)
  }

  // Apply saved search
  const applySavedSearch = (search: SavedSearch) => {
    onFiltersChange?.(search.filters)
  }

  // Delete saved search
  const deleteSavedSearch = (searchId: string) => {
    const updated = savedSearches.filter(search => search.id !== searchId)
    setSavedSearches(updated)
    persistSavedSearches(updated)
  }

  // Clear all saved searches
  const clearSavedSearches = () => {
    setSavedSearches([])
    persistSavedSearches([])
  }

  // Load saved searches on component mount
  useEffect(() => {
    loadSavedSearches()
  }, [])


  // No client-side filtering needed - filtering is done at database level
  const filteredAndSortedLeads = leads


  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.searchQuery ||
      filters.selectedStates.length > 0 ||
      filters.selectedCities.length > 0 ||
      filters.selectedPracticeTypes.length > 0 ||
      filters.sortField !== 'created_at' ||
      filters.sortDir !== 'desc'
    )
  }, [filters])

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

  return (
    <div className="w-full space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search leads, practices, or locations..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange?.({ ...filters, searchQuery: e.target.value })}
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-card border-border text-foreground hover:bg-accent"
                disabled={!hasActiveFilters}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Search
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current Filters</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="cold-leads-saved-search-name">
                    Search Name
                  </label>
                  <Input
                    id="cold-leads-saved-search-name"
                    placeholder="e.g. Dallas Orthodontics"
                    value={newSavedSearchName}
                    onChange={(event) => {
                      setNewSavedSearchName(event.target.value)
                      if (saveError) {
                        setSaveError(null)
                      }
                    }}
                  />
                  {saveError && (
                    <p className="text-xs text-destructive">{saveError}</p>
                  )}
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground">Filters to be saved:</p>
                  <ul className="space-y-1">
                    <li>
                      <span className="font-medium">Search:</span> {filters.searchQuery || '—'}
                    </li>
                    <li>
                      <span className="font-medium">States:</span> {filters.selectedStates.length ? filters.selectedStates.join(', ') : '—'}
                    </li>
                    <li>
                      <span className="font-medium">Cities:</span> {filters.selectedCities.length ? filters.selectedCities.join(', ') : '—'}
                    </li>
                    <li>
                      <span className="font-medium">Practice Types:</span> {filters.selectedPracticeTypes.length ? filters.selectedPracticeTypes.join(', ') : '—'}
                    </li>
                    <li>
                      <span className="font-medium">Sort:</span> {filters.sortDir ? `${filters.sortField} (${filters.sortDir})` : 'Default'}
                    </li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCurrentSearch}>Save Search</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-card border-border text-foreground hover:bg-accent"
                disabled={savedSearches.length === 0}
              >
                <Bookmark className="mr-2 h-4 w-4" />
                Saved Searches
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Saved Searches</span>
                {savedSearches.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(event) => {
                      event.preventDefault()
                      clearSavedSearches()
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedSearches.length === 0 ? (
                <div className="px-2 py-6 text-xs text-muted-foreground text-center">
                  No saved searches yet.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {savedSearches.map((search) => (
                    <div key={search.id} className="flex items-center gap-2 px-2 py-1.5">
                      <DropdownMenuItem
                        className="flex-1"
                        onSelect={(event) => {
                          event.preventDefault()
                          applySavedSearch(search)
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {search.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(search.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              applySavedSearch(search)
                            }}
                          >
                            Apply Filters
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(event) => {
                              event.preventDefault()
                              deleteSavedSearch(search.id)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Practice Type Filter */}
          <SearchableDropdown
            label="Practice Type"
            placeholder="Search practice types..."
            selectedValues={filters.selectedPracticeTypes}
            onSelectionChange={(values) => onFiltersChange?.({ ...filters, selectedPracticeTypes: values })}
            onSearch={searchPracticeTypes}
          />

          {/* State Filter */}
          <SearchableDropdown
            label="State"
            placeholder="Search states..."
            selectedValues={filters.selectedStates}
            onSelectionChange={(values) => onFiltersChange?.({ ...filters, selectedStates: values })}
            onSearch={searchStates}
          />

          {/* City Filter */}
          <SearchableDropdown
            label="City"
            placeholder="Search cities..."
            selectedValues={filters.selectedCities}
            onSelectionChange={(values) => onFiltersChange?.({ ...filters, selectedCities: values })}
            onSearch={searchCities}
          />

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedLeads.length} of {leads.length} leads
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


      {/* Table */}
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
                        el.indeterminate = isPartiallySelected()
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
