import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface EngagedLeadsMetrics {
  upcomingMeetings: number
  meetingsPast: number
}

export function useEngagedLeadsMetrics() {
  const [metrics, setMetrics] = useState<EngagedLeadsMetrics>({
    upcomingMeetings: 0,
    meetingsPast: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

      // Get upcoming meetings (meeting_date > today)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('engaged_leads')
        .select('id, meeting_date')
        .not('meeting_date', 'is', null)
        .gte('meeting_date', today)

      if (upcomingError) {
        console.error('Error fetching upcoming meetings:', upcomingError)
        throw new Error('Failed to fetch upcoming meetings')
      }

      const upcomingMeetings = upcomingData?.length || 0

      // Get all meetings that are today or in the past (meeting_date <= today)
      const { data: pastMeetingsData, error: pastMeetingsError } = await supabase
        .from('engaged_leads')
        .select('id, meeting_date')
        .not('meeting_date', 'is', null)
        .lte('meeting_date', today)

      if (pastMeetingsError) {
        console.error('Error fetching past meetings:', pastMeetingsError)
        throw new Error('Failed to fetch past meetings')
      }

      const meetingsPast = pastMeetingsData?.length || 0

      setMetrics({
        upcomingMeetings,
        meetingsPast
      })

    } catch (err) {
      console.error('Error fetching engaged leads metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  }
}
