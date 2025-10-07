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

      // Get today's date in local timezone (not UTC)
      const today = new Date().toLocaleDateString('en-CA') // Returns YYYY-MM-DD in local timezone

      // Debug: Get all meetings first to see what we're working with
      const { data: allMeetings, error: allMeetingsError } = await supabase
        .from('engaged_leads')
        .select('id, meeting_date, meeting_status')
        .not('meeting_date', 'is', null)
        .order('meeting_date', { ascending: true })

      if (allMeetingsError) {
        console.error('Error fetching all meetings:', allMeetingsError)
        throw new Error('Failed to fetch meetings')
      }

      console.log('Today:', today)
      console.log('Total meetings found:', allMeetings?.length || 0)
      console.log('All meetings:', allMeetings)

      // Get upcoming meetings (meeting_date > today)
      const upcomingMeetings = allMeetings?.filter(meeting => 
        meeting.meeting_date > today
      ).length || 0

      // Get all meetings that are today or in the past (meeting_date <= today)
      const meetingsPast = allMeetings?.filter(meeting => 
        meeting.meeting_date <= today
      ).length || 0

      console.log('Upcoming meetings:', upcomingMeetings)
      console.log('Meetings past:', meetingsPast)
      console.log('Total should equal:', upcomingMeetings + meetingsPast)

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
