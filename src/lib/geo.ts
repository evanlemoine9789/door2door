import { Lead } from '@/types/leads'

export function formatAddress(lead: Lead): string {
  const parts = [lead.address]
  if (lead.city) parts.push(lead.city)
  if (lead.state) parts.push(lead.state)
  if (lead.zip) parts.push(lead.zip)
  return parts.join(', ')
}

export async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN
  
  if (MAPBOX_TOKEN) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      )
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        return { lat, lng }
      }
    } catch (error) {
      console.error('Mapbox geocoding error:', error)
    }
  }
  
  // Fallback to Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Door2Door-Leads-Map/1.0'
        }
      }
    )
    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
    }
  } catch (error) {
    console.error('Nominatim geocoding error:', error)
  }
  
  return null
}
