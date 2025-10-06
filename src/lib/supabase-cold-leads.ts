import { Lead } from '@/components/crm/leads-table'
import { supabase } from '@/lib/supabase'
import { 
  genericFetch, 
  genericFetchById, 
  genericCreate, 
  genericUpdate, 
  genericDelete, 
  genericSearch, 
  genericStats 
} from '@/lib/supabase-crud-utils'

// Database types that match our Supabase schema for cold_leads
export interface DatabaseColdLead {
  id: string
  company_name: string
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  phone: string
  owner_name: string
  confidence: number | null
  domain: string | null
  phone_norm: string | null
  practice_type: string
  created_at: string
  updated_at: string
}

// Convert database cold lead to component lead
const mapDatabaseColdLeadToLead = (dbLead: DatabaseColdLead): Lead => ({
  id: dbLead.id,
  company: dbLead.company_name,
  contactName: dbLead.owner_name,
  contactRole: dbLead.practice_type,
  meetingStatus: 'pending' as const, // cold_leads doesn't have meeting_status
  meetingDate: null, // cold_leads doesn't have meeting_date
  meetingTime: null, // cold_leads doesn't have meeting_time
  dateBooked: '', // cold_leads doesn't have date_booked
  phoneNumber: dbLead.phone,
  url: dbLead.website || '',
  rep: '', // cold_leads doesn't have assigned_rep
  bookedWith: '', // cold_leads doesn't have booked_with
  callRecording: '', // cold_leads doesn't have call_recording
  address: dbLead.address,
  city: dbLead.city,
  state: dbLead.state,
  lastUpdated: dbLead.updated_at
})

// Convert component lead to database cold lead
const mapLeadToDatabaseColdLead = (lead: Omit<Lead, 'id'>): Omit<DatabaseColdLead, 'id' | 'created_at' | 'updated_at'> => ({
  company_name: lead.company,
  owner_name: lead.contactName,
  practice_type: lead.contactRole,
  phone: lead.phoneNumber,
  website: lead.url,
  address: lead.address,
  city: lead.city,
  state: lead.state,
  confidence: null, // cold_leads specific field
  domain: null, // cold_leads specific field
  phone_norm: null // cold_leads specific field
})

// Convert component lead updates to database cold lead updates
const mapColdLeadUpdatesToDatabaseLead = (updates: Partial<Omit<Lead, 'id'>>): Partial<DatabaseColdLead> => {
  const dbUpdates: Partial<DatabaseColdLead> = {}
  
  if (updates.company !== undefined) dbUpdates.company_name = updates.company
  if (updates.contactName !== undefined) dbUpdates.owner_name = updates.contactName
  if (updates.contactRole !== undefined) dbUpdates.practice_type = updates.contactRole
  if (updates.phoneNumber !== undefined) dbUpdates.phone = updates.phoneNumber
  if (updates.url !== undefined) dbUpdates.website = updates.url
  if (updates.address !== undefined) dbUpdates.address = updates.address
  if (updates.city !== undefined) dbUpdates.city = updates.city
  if (updates.state !== undefined) dbUpdates.state = updates.state
  
  return dbUpdates
}

// Fetch all cold leads
export async function fetchColdLeads(): Promise<Lead[]> {
  try {
    const data = await genericFetch<DatabaseColdLead>('cold_leads', {}, {
      orderBy: 'created_at',
      ascending: false
    })
    return data.map(mapDatabaseColdLeadToLead)
  } catch (error) {
    console.error('Error in fetchColdLeads:', error)
    throw error
  }
}

// Fetch a single cold lead by ID
export async function fetchColdLeadById(id: string): Promise<Lead | null> {
  try {
    const data = await genericFetchById<DatabaseColdLead>('cold_leads', id)
    return data ? mapDatabaseColdLeadToLead(data) : null
  } catch (error) {
    console.error('Error in fetchColdLeadById:', error)
    throw error
  }
}

// Create a new cold lead
export async function createColdLead(lead: Omit<Lead, 'id'>): Promise<Lead> {
  try {
    const data = await genericCreate<DatabaseColdLead, Omit<Lead, 'id'>>(
      'cold_leads', 
      lead, 
      mapLeadToDatabaseColdLead
    )
    return mapDatabaseColdLeadToLead(data)
  } catch (error) {
    console.error('Error in createColdLead:', error)
    throw error
  }
}

// Update an existing cold lead
export async function updateColdLead(id: string, updates: Partial<Omit<Lead, 'id'>>): Promise<Lead> {
  try {
    const data = await genericUpdate<DatabaseColdLead, Partial<Omit<Lead, 'id'>>>(
      'cold_leads',
      id,
      updates,
      mapColdLeadUpdatesToDatabaseLead
    )
    return mapDatabaseColdLeadToLead(data)
  } catch (error) {
    console.error('Error in updateColdLead:', error)
    throw error
  }
}

// Delete a cold lead
export async function deleteColdLead(id: string): Promise<void> {
  try {
    // First delete from lead_geocodes table to maintain referential integrity
    const { error: geocodeError } = await supabase
      .from('lead_geocodes')
      .delete()
      .eq('cold_lead_id', id)

    if (geocodeError) {
      console.error('Error deleting from lead_geocodes:', geocodeError)
      // Continue with cold_leads deletion even if geocode deletion fails
    }

    // Then delete from cold_leads table
    await genericDelete('cold_leads', id)
  } catch (error) {
    console.error('Error in deleteColdLead:', error)
    throw error
  }
}

// Search cold leads by company or contact name
export async function searchColdLeads(query: string): Promise<Lead[]> {
  try {
    const data = await genericSearch<DatabaseColdLead>(
      'cold_leads',
      ['company_name', 'owner_name'],
      query,
      { orderBy: 'created_at', ascending: false }
    )
    return data.map(mapDatabaseColdLeadToLead)
  } catch (error) {
    console.error('Error in searchColdLeads:', error)
    throw error
  }
}

// Filter cold leads by status
export async function filterColdLeadsByStatus(status: string): Promise<Lead[]> {
  try {
    if (status === 'all') {
      return await fetchColdLeads()
    }

    const data = await genericFetch<DatabaseColdLead>(
      'cold_leads',
      { meeting_status: status },
      { orderBy: 'created_at', ascending: false }
    )
    return data.map(mapDatabaseColdLeadToLead)
  } catch (error) {
    console.error('Error in filterColdLeadsByStatus:', error)
    throw error
  }
}

// Get cold leads statistics
export async function getColdLeadsStats() {
  try {
    const stats = await genericStats<DatabaseColdLead>('cold_leads', 'meeting_status')
    
    return {
      total: Object.values(stats).reduce((sum, count) => sum + count, 0),
      scheduled: stats.scheduled || 0,
      ran: stats.ran || 0,
      cancelled: stats.cancelled || 0
    }
  } catch (error) {
    console.error('Error in getColdLeadsStats:', error)
    throw error
  }
}
