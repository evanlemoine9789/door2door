import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Lead } from '@/components/crm/leads-table'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

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
          meetingTime: row.time || null,
          dateBooked: validateAndFormatDate(row.date_booked) || row.date_booked || '',
          phoneNumber: row.phone_number || '',
          url: row.url || '',
          rep: row.assigned_rep || '',
          bookedWith: row.booked_with || '',
          callRecording: row.call_recording || '',
          address: row.address || null,
          city: row.city || null,
          state: row.state || null,
          lastUpdated: row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : ''
        }))

        setLeads(transformedLeads)
      }
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  // Map Supabase meeting_status to the existing interface values
  const mapMeetingStatus = (status: string | null): Lead['meetingStatus'] => {
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
    fetchLeads()
  }

  return {
    leads,
    loading,
    error,
    refreshLeads
  }
}
