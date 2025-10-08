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
  deleted_at: string | null  // Soft delete timestamp
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

// Fetch all cold leads (excluding soft-deleted)
export async function fetchColdLeads(organizationId?: string): Promise<Lead[]> {
  try {
    let query = supabase
      .from('cold_leads')
      .select('*')
      .is('deleted_at', null)  // Only fetch non-deleted leads

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(mapDatabaseColdLeadToLead)
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

// Soft delete a cold lead (marks as deleted but keeps in database)
export async function deleteColdLead(id: string): Promise<void> {
  try {
    // Soft delete: set deleted_at to current timestamp instead of actually deleting
    const { error } = await supabase
      .from('cold_leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error soft deleting cold lead:', error)
      throw error
    }

    // Note: We keep lead_geocodes intact for historical data
  } catch (error) {
    console.error('Error in deleteColdLead:', error)
    throw error
  }
}

// Search cold leads by company or contact name (excluding soft-deleted)
export async function searchColdLeads(query: string, organizationId?: string): Promise<Lead[]> {
  try {
    let dbQuery = supabase
      .from('cold_leads')
      .select('*')
      .is('deleted_at', null)  // Only search non-deleted leads
      .or(`company_name.ilike.%${query}%,owner_name.ilike.%${query}%`)

    // Filter by organization if provided
    if (organizationId) {
      dbQuery = dbQuery.eq('organization_id', organizationId)
    }

    const { data, error } = await dbQuery.order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(mapDatabaseColdLeadToLead)
  } catch (error) {
    console.error('Error in searchColdLeads:', error)
    throw error
  }
}

// Filter cold leads by status (excluding soft-deleted)
export async function filterColdLeadsByStatus(status: string, organizationId?: string): Promise<Lead[]> {
  try {
    if (status === 'all') {
      return await fetchColdLeads(organizationId)
    }

    let query = supabase
      .from('cold_leads')
      .select('*')
      .is('deleted_at', null)  // Only fetch non-deleted leads
      .eq('meeting_status', status)

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(mapDatabaseColdLeadToLead)
  } catch (error) {
    console.error('Error in filterColdLeadsByStatus:', error)
    throw error
  }
}

// Get cold leads statistics (excluding soft-deleted)
export async function getColdLeadsStats(organizationId?: string) {
  try {
    let query = supabase
      .from('cold_leads')
      .select('meeting_status')
      .is('deleted_at', null)  // Only count non-deleted leads

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) throw error

    const stats: Record<string, number> = {}
    data?.forEach((row: any) => {
      const status = row.meeting_status || 'unknown'
      stats[status] = (stats[status] || 0) + 1
    })
    
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
