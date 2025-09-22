import { supabase } from '@/lib/supabase'
import { Lead } from '@/components/crm/leads-table'

// Database types that match our Supabase schema
export interface DatabaseLead {
  id: string
  company: string
  contact_name: string
  contact_role: string
  meeting_status: 'scheduled' | 'ran' | 'cancelled'
  meeting_date: string | null
  meeting_time: string | null
  date_booked: string
  phone_number: string
  url: string | null
  rep: string | null
  booked_with: string | null
  call_recording: string | null
  address: string | null
  city: string | null
  state: string | null
  updated_at: string
  created_at: string
}

// Convert database lead to component lead
const mapDatabaseLeadToLead = (dbLead: DatabaseLead): Lead => ({
  id: dbLead.id,
  company: dbLead.company,
  contactName: dbLead.contact_name,
  contactRole: dbLead.contact_role,
  meetingStatus: dbLead.meeting_status,
  meetingDate: dbLead.meeting_date,
  meetingTime: dbLead.meeting_time,
  dateBooked: dbLead.date_booked,
  phoneNumber: dbLead.phone_number,
  url: dbLead.url || '',
  rep: dbLead.rep || '',
  bookedWith: dbLead.booked_with || '',
  callRecording: dbLead.call_recording || '',
  address: dbLead.address,
  city: dbLead.city,
  state: dbLead.state,
  lastUpdated: dbLead.updated_at
})

// Convert component lead to database lead
const mapLeadToDatabaseLead = (lead: Omit<Lead, 'id'>): Omit<DatabaseLead, 'id' | 'created_at' | 'updated_at'> => ({
  company: lead.company,
  contact_name: lead.contactName,
  contact_role: lead.contactRole,
  meeting_status: lead.meetingStatus,
  meeting_date: lead.meetingDate,
  meeting_time: lead.meetingTime,
  date_booked: lead.dateBooked,
  phone_number: lead.phoneNumber,
  url: lead.url,
  rep: lead.rep,
  booked_with: lead.bookedWith,
  call_recording: lead.callRecording,
  address: lead.address,
  city: lead.city,
  state: lead.state
})

// Fetch all leads
export async function fetchLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leads:', error)
      throw error
    }

    return data ? data.map(mapDatabaseLeadToLead) : []
  } catch (error) {
    console.error('Error in fetchLeads:', error)
    throw error
  }
}

// Fetch a single lead by ID
export async function fetchLeadById(id: string): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching lead:', error)
      throw error
    }

    return data ? mapDatabaseLeadToLead(data) : null
  } catch (error) {
    console.error('Error in fetchLeadById:', error)
    throw error
  }
}

// Create a new lead
export async function createLead(lead: Omit<Lead, 'id'>): Promise<Lead> {
  try {
    const dbLead = mapLeadToDatabaseLead(lead)
    
    const { data, error } = await supabase
      .from('leads')
      .insert([dbLead])
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      throw error
    }

    return mapDatabaseLeadToLead(data)
  } catch (error) {
    console.error('Error in createLead:', error)
    throw error
  }
}

// Update an existing lead
export async function updateLead(id: string, updates: Partial<Omit<Lead, 'id'>>): Promise<Lead> {
  try {
    const dbUpdates: Partial<DatabaseLead> = {}
    
    // Map component fields to database fields
    if (updates.company !== undefined) dbUpdates.company = updates.company
    if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName
    if (updates.contactRole !== undefined) dbUpdates.contact_role = updates.contactRole
    if (updates.meetingStatus !== undefined) dbUpdates.meeting_status = updates.meetingStatus
    if (updates.meetingDate !== undefined) dbUpdates.meeting_date = updates.meetingDate
    if (updates.meetingTime !== undefined) dbUpdates.meeting_time = updates.meetingTime
    if (updates.dateBooked !== undefined) dbUpdates.date_booked = updates.dateBooked
    if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber
    if (updates.url !== undefined) dbUpdates.url = updates.url
    if (updates.rep !== undefined) dbUpdates.rep = updates.rep
    if (updates.bookedWith !== undefined) dbUpdates.booked_with = updates.bookedWith
    if (updates.callRecording !== undefined) dbUpdates.call_recording = updates.callRecording
    if (updates.address !== undefined) dbUpdates.address = updates.address
    if (updates.city !== undefined) dbUpdates.city = updates.city
    if (updates.state !== undefined) dbUpdates.state = updates.state

    const { data, error } = await supabase
      .from('leads')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lead:', error)
      throw error
    }

    return mapDatabaseLeadToLead(data)
  } catch (error) {
    console.error('Error in updateLead:', error)
    throw error
  }
}

// Delete a lead
export async function deleteLead(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting lead:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteLead:', error)
    throw error
  }
}

// Search leads by company or contact name
export async function searchLeads(query: string): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .or(`company.ilike.%${query}%,contact_name.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching leads:', error)
      throw error
    }

    return data ? data.map(mapDatabaseLeadToLead) : []
  } catch (error) {
    console.error('Error in searchLeads:', error)
    throw error
  }
}

// Filter leads by status
export async function filterLeadsByStatus(status: string): Promise<Lead[]> {
  try {
    if (status === 'all') {
      return await fetchLeads()
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('meeting_status', status)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error filtering leads by status:', error)
      throw error
    }

    return data ? data.map(mapDatabaseLeadToLead) : []
  } catch (error) {
    console.error('Error in filterLeadsByStatus:', error)
    throw error
  }
}

// Get leads statistics
export async function getLeadsStats() {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('meeting_status')

    if (error) {
      console.error('Error fetching leads stats:', error)
      throw error
    }

    const stats = {
      total: data?.length || 0,
      scheduled: data?.filter((lead: { meeting_status: string }) => lead.meeting_status === 'scheduled').length || 0,
      ran: data?.filter((lead: { meeting_status: string }) => lead.meeting_status === 'ran').length || 0,
      cancelled: data?.filter((lead: { meeting_status: string }) => lead.meeting_status === 'cancelled').length || 0
    }

    return stats
  } catch (error) {
    console.error('Error in getLeadsStats:', error)
    throw error
  }
}
