import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase'

export interface EngagedLeadsMetrics {
  upcomingMeetings: number
  meetingsPast: number
}

export function useEngagedLeadsMetrics() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<EngagedLeadsMetrics>({
    upcomingMeetings: 0,
    meetingsPast: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

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
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('❌ Error fetching user profile:', profileError)
          setError(`Failed to fetch user organization: ${profileError.message || 'Unknown error'}`)
          setLoading(false)
          return
        }

        if (!data?.organization_id) {
          setError('User has no organization assigned')
          setLoading(false)
          return
        }

        setOrganizationId(data.organization_id)
      } catch (err) {
        console.error('💥 Exception in fetchUserOrganization:', err)
        setError('Failed to fetch user organization')
        setLoading(false)
      }
    }

    fetchUserOrganization()
  }, [user])

  const fetchMetrics = async () => {
    // Don't fetch if we don't have an organization ID yet
    if (!organizationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get today's date in local timezone (not UTC)
      const today = new Date().toLocaleDateString('en-CA') // Returns YYYY-MM-DD in local timezone

      // Get all meetings filtered by organization
      const { data: allMeetings, error: allMeetingsError } = await supabase
        .from('engaged_leads')
        .select('id, meeting_date, meeting_status')
        .eq('organization_id', organizationId)
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
    if (organizationId) {
      fetchMetrics()
    }
  }, [organizationId])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  }
}
