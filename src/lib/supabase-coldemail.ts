import { supabase } from './supabase'

export type ColdEmailStatus = 'Interested' | 'Information Request' | 'Meeting Request' | 'STOPPED'

export interface ColdEmailLeadDB {
  id: string
  company: string | null
  name: string | null
  lead_email: string
  campaign_name: string | null
  status: ColdEmailStatus
  reply_at: string | null
  email_account: string | null
  message_history_url: string | null
  company_url: string | null
  created_at: string
  updated_at: string
}

export async function fetchColdEmailLeads(): Promise<ColdEmailLeadDB[]> {
  const { data, error } = await supabase
    .from('coldemail_leads')
    .select('*')
    .order('reply_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function searchColdEmailLeads(q: string): Promise<ColdEmailLeadDB[]> {
  const { data, error } = await supabase
    .from('coldemail_leads')
    .select('*')
    .or(`company.ilike.%${q}%,name.ilike.%${q}%,lead_email.ilike.%${q}%`)
    .order('reply_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function filterColdEmailLeadsByStatus(status: 'all' | 'Interested' | 'Information Request' | 'Meeting Request'): Promise<ColdEmailLeadDB[]> {
  const base = supabase.from('coldemail_leads').select('*').order('reply_at', { ascending: false, nullsFirst: false })
  const { data, error } = status === 'all' ? await base : await base.eq('status', status)
  if (error) throw error
  return data ?? []
}

export async function fetchColdEmailLeadById(id: string): Promise<ColdEmailLeadDB | null> {
  const { data, error } = await supabase.from('coldemail_leads').select('*').eq('id', id).single()
  if (error) throw error
  return data ?? null
}
