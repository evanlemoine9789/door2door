export interface GeocodeData {
  latitude: number
  longitude: number
  cold_lead_id: string
  address?: string
  cold_leads: {
    company_name: string
    owner_name: string
    phone_number: string
    practice_type: string
    website?: string
  } | null
}
