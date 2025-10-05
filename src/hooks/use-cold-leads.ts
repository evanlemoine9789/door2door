import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ColdLead } from '@/components/crm/cold-leads-table'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface FilterState {
  searchQuery: string
  selectedStates: string[]
  selectedCities: string[]
  selectedPracticeTypes: string[]
  sortField: 'company' | 'city' | 'state' | 'practiceType' | 'created_at'
  sortDir: 'asc' | 'desc' | undefined
}

export function useColdLeads(initialFilters?: FilterState) {
  const [leads, setLeads] = useState<ColdLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters state
  const [filters, setFilters] = useState<FilterState>(initialFilters || {
    searchQuery: "",
    selectedStates: [],
    selectedCities: [],
    selectedPracticeTypes: [],
    sortField: 'created_at',
    sortDir: 'desc'
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [totalPages, setTotalPages] = useState(0)
  const [totalLeads, setTotalLeads] = useState(0)

  useEffect(() => {
    fetchLeads(currentPage, pageSize, filters)
  }, [filters])

  const fetchLeads = async (page: number = 1, pageSize: number = 100, currentFilters?: FilterState) => {
    try {
      setLoading(true)
      setError(null)

      const activeFilters = currentFilters || filters

      // Performance optimization: Add timeout for large queries
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        // Build the base query
        let countQuery = supabase.from('cold_leads').select('*', { count: 'exact', head: true })
        let dataQuery = supabase.from('cold_leads').select('*')

        // Apply filters to both count and data queries
        if (activeFilters.searchQuery) {
          const searchTerm = activeFilters.searchQuery.toLowerCase()
          countQuery = countQuery.or(`company_name.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,practice_type.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
          dataQuery = dataQuery.or(`company_name.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,practice_type.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
        }

        if (activeFilters.selectedStates.length > 0) {
          countQuery = countQuery.in('state', activeFilters.selectedStates)
          dataQuery = dataQuery.in('state', activeFilters.selectedStates)
        }

        if (activeFilters.selectedCities.length > 0) {
          countQuery = countQuery.in('city', activeFilters.selectedCities)
          dataQuery = dataQuery.in('city', activeFilters.selectedCities)
        }

        if (activeFilters.selectedPracticeTypes.length > 0) {
          countQuery = countQuery.in('practice_type', activeFilters.selectedPracticeTypes)
          dataQuery = dataQuery.in('practice_type', activeFilters.selectedPracticeTypes)
        }

        // Get total count for pagination
        const { count, error: countError } = await countQuery

        if (countError) {
          console.error('❌ Error getting cold lead count:', countError)
          throw new Error('Failed to get cold lead count')
        }

        const totalCount = count || 0
        
        // Fail-safe: Limit maximum leads to prevent performance issues
        const maxLeads = 10000
        if (totalCount > maxLeads) {
          console.warn(`⚠️ Large cold leads dataset detected: ${totalCount} leads. Limiting to ${maxLeads} for performance.`)
        }

        const effectiveTotalLeads = Math.min(totalCount, maxLeads)
        const totalPages = Math.ceil(effectiveTotalLeads / pageSize)

        // Validate page number
        const validPage = Math.max(1, Math.min(page, totalPages))
        if (page !== validPage) {
          page = validPage
        }

        // Calculate offset for pagination
        const offset = (page - 1) * pageSize

        // Apply sorting
        let sortField = 'created_at'
        let sortAscending = false

        switch (activeFilters.sortField) {
          case 'company':
            sortField = 'company_name'
            break
          case 'city':
            sortField = 'city'
            break
          case 'state':
            sortField = 'state'
            break
          case 'practiceType':
            sortField = 'practice_type'
            break
          case 'created_at':
            sortField = 'created_at'
            break
        }

        if (activeFilters.sortDir) {
          sortAscending = activeFilters.sortDir === 'asc'
        } else {
          // Default to descending for created_at (newest first)
          sortAscending = activeFilters.sortField !== 'created_at'
        }

        // Fetch paginated data with filters and sorting
        const { data, error: supabaseError } = await dataQuery
          .order(sortField, { ascending: sortAscending })
          .range(offset, offset + pageSize - 1)
          .limit(pageSize) // Extra safety limit

        clearTimeout(timeoutId)

        if (supabaseError) {
          throw supabaseError
        }

        if (data) {
          // Transform Supabase data to match the ColdLead interface
          // Map cold_leads schema to ColdLead interface
          const transformedLeads: ColdLead[] = data.map((row) => ({
            id: row.id,
            company: row.company_name || '',
            contactName: row.owner_name || '',
            contactRole: row.practice_type || '',
            meetingStatus: 'pending' as const, // cold_leads doesn't have meeting_status, default to pending
            meetingDate: null, // cold_leads doesn't have meeting_date
            meetingTime: null, // cold_leads doesn't have meeting_time
            dateBooked: '', // cold_leads doesn't have date_booked
            phoneNumber: row.phone_number || '', // Updated to use phone_number
            url: row.website || '',
            rep: '', // cold_leads doesn't have assigned_rep
            bookedWith: '', // cold_leads doesn't have booked_with
            callRecording: '', // cold_leads doesn't have call_recording
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            callDate: row.call_date || null,
            lastUpdated: row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : ''
          }))

          setLeads(transformedLeads)
          setCurrentPage(page)
          setPageSize(pageSize)
          setTotalPages(totalPages)
          setTotalLeads(effectiveTotalLeads)
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.')
        }
        throw fetchError
      }
    } catch (err) {
      console.error('Error fetching cold leads:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cold leads'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Map Supabase meeting_status to the existing interface values
  const mapMeetingStatus = (status: string | null): ColdLead['meetingStatus'] => {
    if (!status) return 'pending'
    
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'scheduled'
      case 'cancelled':
        return 'cancelled'
      case 'ran':
        return 'completed'
      default:
        return 'pending'
    }
  }

  // Date validation and formatting function
  const validateAndFormatDate = (dateString: string | null): string | null => {
    if (!dateString) return null
    
    // If already in YYYY-MM-DD format, validate it
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      
      // Check if it's a valid date
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return dateString
      }
      return null
    }
    
    // Try to parse other date formats and convert to YYYY-MM-DD
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return null
    }
    
    // Convert to YYYY-MM-DD format
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }

  const refreshLeads = () => {
    fetchLeads(currentPage, pageSize, filters)
  }

  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  return {
    leads,
    loading,
    error,
    refreshLeads,
    // Pagination data
    currentPage,
    pageSize,
    totalPages,
    totalLeads,
    // Pagination functions
    fetchLeads,
    setPageSize,
    // Filter functions
    filters,
    updateFilters
  }
}
