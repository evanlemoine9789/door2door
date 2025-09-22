import { useState, useEffect } from 'react'
import { 
  ColdEmailLeadDB, 
  filterColdEmailLeadsByStatus 
} from '@/lib/supabase-coldemail'

export function useColdEmailLeads() {
  const [leads, setLeads] = useState<ColdEmailLeadDB[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'Interested' | 'Information Request' | 'Meeting Request'>('all')

  useEffect(() => {
    fetchFilteredLeads()
  }, [statusFilter])

  const fetchFilteredLeads = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await filterColdEmailLeadsByStatus(statusFilter)
      setLeads(data)
    } catch (err) {
      console.error('Error fetching cold email leads:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch cold email leads')
    } finally {
      setLoading(false)
    }
  }

  const refreshLeads = () => {
    fetchFilteredLeads()
  }

  return {
    leads,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    refreshLeads
  }
}
