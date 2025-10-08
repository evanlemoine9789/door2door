import { useState, useEffect } from 'react'
import { Lead } from '@/components/crm/leads-table'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'

export function useLeads() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalPages, setTotalPages] = useState(0)
  const [totalLeads, setTotalLeads] = useState(0)

  // Fetch user's organization_id
  useEffect(() => {
    async function fetchUserOrganization() {
      if (!user) {
        setOrganizationId(null)
        setError('User not authenticated')
        setLoading(false)
        return
      }

      try {
        console.log('🔍 Fetching organization for user:', user.id)
        
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        console.log('📊 Profile query result:', { data, profileError })

        if (profileError) {
          console.error('❌ Error fetching user profile:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          })
          setError(`Failed to fetch user organization: ${profileError.message || 'Unknown error'}`)
          setLoading(false)
          return
        }

        if (!data) {
          console.warn('⚠️ No user profile found for user:', user.id)
          setError('User profile not found. Please contact support.')
          setLoading(false)
          return
        }

        if (!data.organization_id) {
          console.warn('⚠️ User has no organization_id:', user.id)
          setError('User has no organization assigned. Please contact support.')
          setLoading(false)
          return
        }

        console.log('✅ Organization ID found:', data.organization_id)
        setOrganizationId(data.organization_id)
      } catch (err) {
        console.error('💥 Exception in fetchUserOrganization:', err)
        setError('Failed to fetch user organization')
        setLoading(false)
      }
    }

    fetchUserOrganization()
  }, [user])

  useEffect(() => {
    if (organizationId) {
      fetchLeads(currentPage, pageSize)
    }
  }, [organizationId])

  const fetchLeads = async (page: number = 1, pageSize: number = 25) => {
    // Don't fetch if we don't have an organization ID yet
    if (!organizationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)


      // Performance optimization: Add timeout for large queries
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        // First, get total count for pagination - filter by organization
        const { count, error: countError } = await supabase
          .from('engaged_leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)

        if (countError) {
          console.error('❌ Error getting lead count:', countError)
          throw new Error('Failed to get lead count')
        }

        const totalCount = count || 0
        
        // Fail-safe: Limit maximum leads to prevent performance issues
        const maxLeads = 10000
        if (totalCount > maxLeads) {
          console.warn(`⚠️ Large dataset detected: ${totalCount} leads. Limiting to ${maxLeads} for performance.`)
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

        // Fetch paginated data - filter by organization
        const { data, error: supabaseError } = await supabase
          .from('engaged_leads')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1)
          .limit(pageSize) // Extra safety limit

        clearTimeout(timeoutId)

        if (supabaseError) {
          throw supabaseError
        }

        if (data) {
          // Transform Supabase data to match the existing Lead interface
          // Keep exact same formatting and structure
          const transformedLeads: Lead[] = data.map((row) => ({
            id: row.id,
            company: row.company_name || '',
            contactName: row.owner_name || '',
            contactRole: row.practice_type || '',
            meetingStatus: mapMeetingStatus(row.meeting_status),
            meetingDate: validateAndFormatDate(row.meeting_date) || row.meeting_date,
            meetingTime: formatTimeTo12Hour(row.meeting_time),
            dateBooked: validateAndFormatDate(row.date_booked) || row.date_booked || '',
            phoneNumber: row.phone_number || '',
            url: row.url || '',
            rep: row.assigned_rep || '',
            bookedWith: row.booked_with || '',
            callRecording: row.call_recording || '',
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            callDate: null, // engaged_leads doesn't have call_date field
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
      console.error('Error fetching leads:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leads'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Map Supabase meeting_status to the existing interface values
  const mapMeetingStatus = (status: string | null): Lead['meetingStatus'] => {
    if (!status) return 'scheduled'
    
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'scheduled'
      case 'cancelled':
        return 'cancelled'
      case 'ran':
        return 'ran'
      default:
        return 'scheduled'
    }
  }

  // Time formatting function for 12-hour display
  const formatTimeTo12Hour = (timeString: string | null): string | null => {
    if (!timeString) return null
    
    try {
      // Handle time format from Supabase (HH:MM:SS or HH:MM)
      const [hours, minutes] = timeString.split(':').map(Number)
      if (isNaN(hours) || isNaN(minutes)) return null
      
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      const displayMinutes = minutes.toString().padStart(2, '0')
      
      return `${displayHours}:${displayMinutes} ${period}`
    } catch (error) {
      console.error('Error formatting time:', error)
      return null
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
    fetchLeads(currentPage, pageSize)
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
    setPageSize
  }
}
