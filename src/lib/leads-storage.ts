import { Lead } from '@/types/leads'
import { supabase } from '@/lib/supabase'

// Client-side storage using localStorage as fallback
const LEADS_CACHE_KEY = 'leads_cache'

// Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Load leads from local cache (localStorage)
function loadLeadsFromCache(): Lead[] {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(LEADS_CACHE_KEY)
      return data ? JSON.parse(data) : []
    }
  } catch (error) {
    console.error('Error loading leads cache:', error)
  }
  return []
}

// Save leads to local cache (localStorage)
function saveLeadsToCache(leads: Lead[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(leads))
    }
  } catch (error) {
    console.error('Error saving leads cache:', error)
  }
}

// Supabase operations
export async function getLeads(): Promise<Lead[]> {
  if (isSupabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('map_leads')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Supabase error:', error)
        return loadLeadsFromCache()
      }
      
      return data || []
    } catch (error) {
      console.error('Supabase connection error:', error)
      return loadLeadsFromCache()
    }
  }
  
  return loadLeadsFromCache()
}

export async function saveLeads(leads: Lead[]): Promise<void> {
  if (isSupabaseAvailable()) {
    try {
      // Clear existing leads and insert new ones
      await supabase.from('map_leads').delete().neq('id', '')
      
      const { error } = await supabase
        .from('map_leads')
        .insert(leads)
      
      if (error) {
        console.error('Supabase save error:', error)
        saveLeadsToCache(leads)
      }
    } catch (error) {
      console.error('Supabase connection error:', error)
      saveLeadsToCache(leads)
    }
  } else {
    saveLeadsToCache(leads)
  }
}

export async function addLeads(newLeads: Lead[]): Promise<void> {
  if (isSupabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('map_leads')
        .insert(newLeads)
      
      if (error) {
        console.error('Supabase add error:', error)
        // Fallback to local cache
        const existingLeads = loadLeadsFromCache()
        saveLeadsToCache([...existingLeads, ...newLeads])
      }
    } catch (error) {
      console.error('Supabase connection error:', error)
      // Fallback to local cache
      const existingLeads = loadLeadsFromCache()
      saveLeadsToCache([...existingLeads, ...newLeads])
    }
  } else {
    const existingLeads = loadLeadsFromCache()
    saveLeadsToCache([...existingLeads, ...newLeads])
  }
}
