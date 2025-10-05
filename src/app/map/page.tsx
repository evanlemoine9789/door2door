"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import dynamic from 'next/dynamic'
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronUp, Route, Loader2, CheckCircle, AlertCircle, MapPin } from "lucide-react"

// Dynamic imports to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false })
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster'), { ssr: false })

// Import Leaflet only on client side
let L: any = null
if (typeof window !== 'undefined') {
  import('leaflet').then(leaflet => {
    L = leaflet.default
    import('leaflet/dist/leaflet.css')
  })
}

// Custom cluster styles and tile grid fix
const clusterStyles = `
  .marker-cluster {
    background-clip: padding-box;
    border-radius: 25px;
  }
  .marker-cluster div {
    width: 40px;
    height: 40px;
    margin-left: 5px;
    margin-top: 5px;
    text-align: center;
    border-radius: 20px;
    font: 14px "Helvetica Neue", Arial, Helvetica, sans-serif;
    font-weight: bold;
    line-height: 40px;
  }
  .marker-cluster-small {
    background-color: rgba(181, 226, 140, 0.6);
  }
  .marker-cluster-small div {
    background-color: rgba(110, 204, 57, 0.6);
    color: white;
  }
  .marker-cluster-medium {
    background-color: rgba(241, 211, 87, 0.6);
  }
  .marker-cluster-medium div {
    background-color: rgba(240, 194, 12, 0.6);
    color: white;
  }
  .marker-cluster-large {
    background-color: rgba(253, 156, 115, 0.6);
  }
  .marker-cluster-large div {
    background-color: rgba(241, 128, 23, 0.6);
    color: white;
  }
  
  /* Remove tile grid lines */
  .leaflet-tile {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
  
  /* Ensure map container has solid background */
  .leaflet-container {
    background-color: #2c3e50 !important;
  }
  
  /* Additional tile layer fixes */
  .map-tiles {
    border: none !important;
    outline: none !important;
  }
  
  /* Custom dark theme popup styles */
  .dark-popup .leaflet-popup-content-wrapper {
    background-color: #1f2937 !important;
    color: #f9fafb !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  }
  
  .dark-popup .leaflet-popup-content {
    color: #f9fafb !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  .dark-popup .leaflet-popup-tip {
    background-color: #1f2937 !important;
  }
  
  .dark-popup .leaflet-popup-close-button {
    color: #9ca3af !important;
    font-size: 18px !important;
    font-weight: bold !important;
    text-decoration: none !important;
  }
  
  .dark-popup .leaflet-popup-close-button:hover {
    color: #f9fafb !important;
  }
`

// Inject cluster styles - only on client side
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = clusterStyles
  document.head.appendChild(style)
}

// Function to initialize Leaflet icons - called when L is available
const initializeLeafletIcons = () => {
  if (typeof window !== 'undefined' && L && L.Icon && L.Icon.Default) {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [40, 65],
      iconAnchor: [20, 65],
      popupAnchor: [0, -65],
      shadowSize: [50, 64],
      shadowAnchor: [20, 64]
    })
  }
}

// Color mapping for practice types - using distinct bright colors
const PRACTICE_TYPE_COLORS = {
  // Database values (exact matches)
  'Dentist': '#FF4500',            // Orange Red
  'Optometrist': '#FF69B4',        // Hot Pink
  
  // Other practice types (keeping for future data)
  'Dermatology': '#FF4444',        // Bright Red
  'Plastic Surgery': '#00BFFF',    // Deep Sky Blue
  'Medspa': '#32CD32',             // Lime Green
  'ENT': '#FF8C00',                // Dark Orange
  'Facial Plastic Surgery': '#9370DB', // Medium Purple
  'OBGYN': '#FF1493',              // Deep Pink
  'Vein Clinic': '#20B2AA',        // Light Sea Green
  'Hair Restoration Clinic': '#FFD700', // Gold
  'Ophthalmology': '#1E90FF',      // Dodger Blue
  'Optometry': '#FF69B4',          // Hot Pink (alternative spelling)
  'Urology': '#FF6347',            // Tomato
  'Urogynecology': '#3CB371',      // Medium Sea Green
  'Podiatry': '#DC143C',           // Crimson
  'Concierge Medicine': '#4169E1', // Royal Blue
  'Internal Medicine': '#DA70D6',  // Orchid
  'Family Practice': '#00CED1',    // Dark Turquoise
  'Weight Loss Clinic': '#FFA500', // Orange
  'Men\'s Health Clinic': '#4682B4', // Steel Blue
  'Women\'s Health Clinic': '#FFB6C1', // Light Pink
  'Pain Management': '#8A2BE2',    // Blue Violet
  'Regenerative Medicine Clinic': '#00FA9A', // Medium Spring Green
  'Dental': '#FF4500',             // Orange Red (alternative spelling)
  'Oral Surgery': '#2E8B57',       // Sea Green
  'Oncology Survivorship Clinic': '#B22222', // Fire Brick
  'Hair Removal Clinic': '#48D1CC', // Medium Turquoise
  'Day Spa': '#DDA0DD',            // Plum
  'Tattoo Studio': '#F0E68C',      // Khaki
  'Chiropractic': '#9ACD32',       // Yellow Green
  'Physical Therapy': '#87CEEB',   // Sky Blue
  'Gym': '#CD853F',                // Peru
  'Resort Spa': '#D2691E',         // Chocolate
  'Mobile Injector': '#5F9EA0',    // Cadet Blue
  'Urgent Care': '#B8860B',        // Dark Goldenrod
  'Burn Center': '#A0522D',        // Sienna
  'Scar Revision Center': '#C71585', // Medium Violet Red
  'LGBTQ Health Clinic': '#6495ED', // Cornflower Blue
  'Bariatric Program': '#228B22',  // Forest Green
  'Sports Medicine': '#DAA520',    // Goldenrod
  'Teledermatology': '#8B008B',    // Dark Magenta
  'Academic Dermatology': '#2F4F4F', // Dark Slate Gray
  'Academic Plastic Surgery': '#800080', // Purple
  'Default': '#808080'             // Gray for unknown practice types
}

// Function to get color for practice type
const getPracticeTypeColor = (practiceType: string | null | undefined): string => {
  if (!practiceType) return PRACTICE_TYPE_COLORS.Default
  return PRACTICE_TYPE_COLORS[practiceType as keyof typeof PRACTICE_TYPE_COLORS] || PRACTICE_TYPE_COLORS.Default
}

// Function to create white marker icon
const createWhiteMarkerIcon = (isSelected: boolean = false) => {
  if (!L) return null
  
  const selectedStyles = isSelected ? `
    border: 4px solid #FFD700;
    box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.5), 0 3px 12px rgba(0,0,0,0.4);
    transform: rotate(-45deg) scale(1.1);
  ` : `
    border: 3px solid #333;
    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
    transform: rotate(-45deg);
  `
  
  return L.divIcon({
    html: `
      <div style="
        background-color: #FFFFFF;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        ${selectedStyles}
        position: relative;
        transition: all 0.2s ease;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 10px;
          height: 10px;
          background-color: #333;
          border-radius: 50%;
        "></div>
        ${isSelected ? `
          <div style="
            position: absolute;
            top: -12px;
            right: -12px;
            width: 18px;
            height: 18px;
            background-color: #FFD700;
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #000;
            font-weight: bold;
          ">✓</div>
        ` : ''}
      </div>
    `,
    className: `white-marker ${isSelected ? 'selected-marker' : ''}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

interface GeocodeRecord {
  id: string
  cold_lead_id: string
  phone_norm: string
  address: string
  latitude: number
  longitude: number
  created_at: string
  cold_leads: {
    company_name: string
    owner_name: string
    phone_number: string
    practice_type: string
    city: string
    state: string
    website: string | null
  }
}

// Component to handle map events
function MapEventHandler({ onMoveEnd }: { onMoveEnd: (e: any) => void }) {
  const map = useMap()

  useEffect(() => {
    const handleMoveEnd = (e: any) => {
      onMoveEnd(e)
    }

    map.on('moveend', handleMoveEnd)
    
    return () => {
      map.off('moveend', handleMoveEnd)
    }
  }, [map, onMoveEnd])

  return null
}

// Component to handle map control and current location
function MapController({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  const map = useMap()
  const [isLocating, setIsLocating] = useState(false)

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    setIsLocating(true)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        map.setView([latitude, longitude], 15) // Zoom to street level
        onLocationFound(latitude, longitude)
        setIsLocating(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        let errorMessage = 'Unable to get your location. '
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access and try again.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.'
            break
          default:
            errorMessage += 'An unknown error occurred.'
            break
        }
        
        alert(errorMessage)
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <Button
        onClick={handleCurrentLocation}
        disabled={isLocating}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        size="sm"
      >
        {isLocating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Locating...
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4 mr-2" />
            Set Current Location
          </>
        )}
      </Button>
    </div>
  )
}

export default function MapPage() {
  const [geocodeData, setGeocodeData] = useState<GeocodeRecord[]>([])
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<Set<string>>(new Set())
  const [isLegendExpanded, setIsLegendExpanded] = useState(true)
  const [selectedLeads, setSelectedLeads] = useState<GeocodeRecord[]>([])
  const [formData, setFormData] = useState({
    startingAddress: "",
    email: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: "" })
  
  // Viewport-based loading state
  const [mapBounds, setMapBounds] = useState<any>(null)
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false)
  const [totalLeadsCount, setTotalLeadsCount] = useState(0)
  
  // Filter options state (loaded once from all data, not viewport-limited)
  const [allPracticeTypes, setAllPracticeTypes] = useState<string[]>([])
  const [allStates, setAllStates] = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(true)
  
  // Map instance ref for proper cleanup
  const mapInstanceRef = useRef<any>(null)
  
  // Client-side loading state
  const [isClient, setIsClient] = useState(false)

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true)
    
    // Initialize Leaflet icons when L becomes available
    const initIcons = () => {
      if (L && L.Icon && L.Icon.Default) {
        initializeLeafletIcons()
      } else {
        // Retry after a short delay if L is not ready yet
        setTimeout(initIcons, 100)
      }
    }
    
    // Start initialization
    initIcons()
  }, [])

  // Handle current location found
  const handleLocationFound = (lat: number, lng: number) => {
    // You could add additional logic here, like showing a marker at current location
  }

  // Use filter options from all data (not viewport-limited)
  const uniquePracticeTypes = allPracticeTypes

  // Initialize selected practice types when data loads
  useEffect(() => {
    if (uniquePracticeTypes.length > 0 && selectedPracticeTypes.size === 0) {
      setSelectedPracticeTypes(new Set(uniquePracticeTypes))
    }
  }, [uniquePracticeTypes, selectedPracticeTypes.size])

  // Filter geocode data based on selected practice types
  const filteredGeocodeData = useMemo(() => {
    return geocodeData.filter(record => {
      const practiceType = record.cold_leads?.practice_type
      return !practiceType || selectedPracticeTypes.has(practiceType)
    })
  }, [geocodeData, selectedPracticeTypes])

  const handlePracticeTypeToggle = (practiceType: string, checked: boolean) => {
    const newSelected = new Set(selectedPracticeTypes)
    if (checked) {
      newSelected.add(practiceType)
    } else {
      newSelected.delete(practiceType)
    }
    setSelectedPracticeTypes(newSelected)
  }

  // Handle marker selection/deselection
  const handleMarkerClick = (record: GeocodeRecord) => {
    setSelectedLeads(prevSelected => {
      const isSelected = prevSelected.some(lead => lead.id === record.id)
      let newSelected: GeocodeRecord[]
      
      if (isSelected) {
        // Remove from selection
        newSelected = prevSelected.filter(lead => lead.id !== record.id)
      } else {
        // Check if we've reached the limit of 10 stops
        if (prevSelected.length >= 10) {
          return prevSelected // Don't add to selection
        }
        
        // Add to selection
        newSelected = [...prevSelected, record]
      }
      
      return newSelected
    })
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  // Handle route optimization submission
  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    // Validation
    if (selectedLeads.length < 2) {
      setSubmitStatus({
        type: 'error',
        message: 'Please select at least 2 leads for route optimization.'
      })
      setIsSubmitting(false)
      return
    }

    if (!formData.startingAddress.trim()) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter a starting address.'
      })
      setIsSubmitting(false)
      return
    }

    if (!formData.email.trim()) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter an email address.'
      })
      setIsSubmitting(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter a valid email address.'
      })
      setIsSubmitting(false)
      return
    }

    try {
      // Prepare JSON payload
      const payload = {
        starting_address: formData.startingAddress.trim(),
        email: formData.email.trim(),
        leads: selectedLeads.map(lead => ({
          business_name: lead.cold_leads?.company_name || 'Unknown Company',
          owner_name: lead.cold_leads?.owner_name || 'N/A',
          address: lead.address || 'N/A',
          latitude: lead.latitude,
          longitude: lead.longitude
        }))
      }

      // Get webhook URL from environment variable
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_ROUTE_OPTIMIZATION_WEBHOOK_URL
      
      if (!webhookUrl) {
        throw new Error('N8N route optimization webhook URL not configured. Please check your environment variables.')
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const responseData = await response.text()
        
        setSubmitStatus({
          type: 'success',
          message: 'Route optimization request sent successfully! You will receive an email with your optimized route shortly.'
        })
        // Reset form
        setFormData({
          startingAddress: "",
          email: ""
        })
      } else {
        const errorText = await response.text()
        console.error('🗺️ HTTP Error Response:', errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }
    } catch (error) {
      console.error('🗺️ Route optimization error:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send route optimization request. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('not configured')) {
          errorMessage = 'Webhook URL not configured. Please check your environment variables.'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        } else if (error.message.includes('HTTP')) {
          errorMessage = `Server error: ${error.message}`
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      setSubmitStatus({
        type: 'error',
        message: errorMessage
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load all filter options once on mount (not viewport-limited)
  useEffect(() => {
    const fetchAllFilterOptions = async () => {
      try {
        setIsLoadingFilters(true)
        
        // Fetch all unique practice types, states, and cities from the entire dataset
        const { data, error } = await supabase
          .from('lead_geocodes')
          .select(`
            cold_leads!inner (
              practice_type,
              state,
              city
            )
          `)

        if (error) {
          console.error('🗺️ Error fetching filter options:', error)
          return
        }

        // Extract unique values
        const practiceTypes = new Set<string>()
        const states = new Set<string>()
        const cities = new Set<string>()

        data?.forEach(record => {
          const lead = record.cold_leads
          if (lead?.practice_type) practiceTypes.add(lead.practice_type)
          if (lead?.state) states.add(lead.state)
          if (lead?.city) cities.add(lead.city)
        })

        // Sort and set filter options
        setAllPracticeTypes(Array.from(practiceTypes).sort())
        setAllStates(Array.from(states).sort())
        setAllCities(Array.from(cities).sort())


      } catch (err) {
        console.error('🗺️ Error loading filter options:', err)
      } finally {
        setIsLoadingFilters(false)
      }
    }

    fetchAllFilterOptions()
  }, [])

  // Fetch total count of leads for display
  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        const { count, error } = await supabase
          .from('lead_geocodes')
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.error('🗺️ Error fetching total count:', error)
          return
        }

        setTotalLeadsCount(count || 0)
      } catch (err) {
        console.error('🗺️ Error fetching total count:', err)
      }
    }

    fetchTotalCount()
  }, [])

  // Viewport-based data fetching with filter support
  const fetchViewportData = async (bounds: L.LatLngBounds) => {
    try {
      setIsLoadingMarkers(true)
      
      let query = supabase
        .from('lead_geocodes')
        .select(`
          id,
          cold_lead_id,
          phone_norm,
          address,
          latitude,
          longitude,
          created_at,
          cold_leads!inner (
            company_name,
            owner_name,
            phone_number,
            practice_type,
            city,
            state,
            website
          )
        `)
        .gte('latitude', bounds.getSouth())
        .lte('latitude', bounds.getNorth())
        .gte('longitude', bounds.getWest())
        .lte('longitude', bounds.getEast())

      // Apply practice type filter if any are selected
      if (selectedPracticeTypes.size > 0) {
        query = query.in('cold_leads.practice_type', Array.from(selectedPracticeTypes))
      }

      const { data, error } = await query.limit(500) // Reasonable limit for viewport

      if (error) {
        console.error('🗺️ Error fetching viewport data:', error)
        return
      }

      const viewportData = data as GeocodeRecord[]
      // Store viewport data
      setGeocodeData(viewportData)

    } catch (err) {
      console.error('🗺️ Error in fetchViewportData:', err)
    } finally {
      setIsLoadingMarkers(false)
    }
  }

  // Handle map bounds change
  const handleMapMoveEnd = (e: any) => {
    const bounds = e.target.getBounds()
    setMapBounds(bounds)
    fetchViewportData(bounds)
  }

  // Refetch viewport data when filters change
  useEffect(() => {
    if (mapBounds) {
      fetchViewportData(mapBounds)
    }
  }, [selectedPracticeTypes]) // Add other filter dependencies here

  // Initial load with default bounds (Connecticut area)
  useEffect(() => {
    if (L) {
      const defaultBounds = L.latLngBounds(
        L.latLng(40.5, -74.0), // Southwest corner
        L.latLng(42.0, -71.0)  // Northeast corner
      )
      setMapBounds(defaultBounds)
      fetchViewportData(defaultBounds)
    }
  }, [])

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up map instance if it exists
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        } catch (error) {
          console.warn('Error cleaning up map instance:', error)
        }
      }
    }
  }, [])

  // Show loading state while client-side components are loading
  if (!isClient || !L || !MapContainer) {
    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-background border-b border-border p-6">
          <h1 className="text-3xl font-bold">Map View</h1>
          <p className="text-muted-foreground mt-2">
            Interactive map showing all leads with geocoded locations.
          </p>
        </div>
        
        {/* Loading State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg">Loading map...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border p-6">
        <h1 className="text-3xl font-bold">Map View</h1>
        <p className="text-muted-foreground mt-2">
          Interactive map showing all leads with geocoded locations. Check the browser console for test data.
        </p>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Filter Sidebar */}
        <div className="w-80 bg-background border-r border-border p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Filter by Practice Type</h2>
          
          {isLoadingFilters ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading filter options...</p>
            </div>
          ) : uniquePracticeTypes.length > 0 ? (
            <div className="space-y-3">
              {uniquePracticeTypes.map((practiceType) => (
                <div key={practiceType} className="flex items-center space-x-2">
                  <Checkbox
                    id={`practice-${practiceType}`}
                    checked={selectedPracticeTypes.has(practiceType)}
                    onCheckedChange={(checked) => 
                      handlePracticeTypeToggle(practiceType, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`practice-${practiceType}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {practiceType}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No practice types available</p>
          )}
          
          {/* Route Builder Section */}
          <div className="mt-6 bg-black text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-white">Route Builder</h3>
            <p className="text-sm text-white mb-2">
              Click a pin to view details, then click "Add to Route" to include it
            </p>
            <p className="text-xs text-gray-300 mb-4">
              {selectedLeads.length}/10 stops selected
            </p>
            
            {selectedLeads.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  {selectedLeads.map((lead) => (
                    <div key={lead.id} className="relative p-2 bg-gray-800 border border-gray-700 rounded text-sm text-white">
                      <span className="pr-6">
                        {lead.cold_leads?.company_name || 'Unknown Company'}
                      </span>
                      <button
                        onClick={() => handleMarkerClick(lead)}
                        className="absolute top-1 right-1 w-5 h-5 text-white hover:text-gray-300 flex items-center justify-center text-sm font-bold transition-colors"
                        title="Remove from route"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Route Optimization Form */}
                <form onSubmit={handleRouteSubmit} className="space-y-3 pt-3 border-t border-gray-600">
                  <div className="space-y-2">
                    <Label htmlFor="startingAddress" className="text-sm font-medium text-white">
                      Starting Address
                    </Label>
                    <Input
                      id="startingAddress"
                      placeholder="Enter your starting address"
                      value={formData.startingAddress}
                      onChange={handleInputChange}
                      required
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-white">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Status Message */}
                  {submitStatus.type && (
                    <div className={`flex items-center gap-2 p-3 rounded-md ${
                      submitStatus.type === 'success' 
                        ? 'bg-green-900/50 text-green-200 border border-green-700' 
                        : 'bg-red-900/50 text-red-200 border border-red-700'
                    }`}>
                      {submitStatus.type === 'success' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm">{submitStatus.message}</span>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isSubmitting || selectedLeads.length < 2}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Route className="h-4 w-4 mr-2" />
                        Optimize & Send Route
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-white italic">
                No businesses selected yet
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {filteredGeocodeData.length} markers in current view
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalLeadsCount > 0 && (
                <>
                  {totalLeadsCount.toLocaleString()} total leads available • 
                  Pan/zoom to load more markers
                </>
              )}
            </p>
          </div>
        </div>
        
        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            key="main-map" // Force React to properly unmount/remount
            center={[41.6032, -72.6906]} // Connecticut coordinates
            zoom={8}
            className="h-full w-full"
            style={{ height: '100%', width: '100%', backgroundColor: '#2c3e50' }}
            whenReady={(map) => {
              // Store map instance for cleanup
              mapInstanceRef.current = map.target
              // Set initial bounds when map is ready
              const bounds = map.target.getBounds()
              setMapBounds(bounds)
            }}
          >
            {/* Selection Info Overlay */}
            {selectedLeads.length > 0 && (
              <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded-full"></div>
                  <span className="font-medium text-sm">Route Selection</span>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected for route optimization
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Click markers to view details, then use "Add to Route" button
                </p>
              </div>
            )}
            <TileLayer
              attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
              minZoom={0}
              maxZoom={20}
              crossOrigin={true}
              className="map-tiles"
            />
            
            {/* Map Event Handler for viewport changes */}
            <MapEventHandler onMoveEnd={handleMapMoveEnd} />
            
            {/* Map Controller for current location */}
            <MapController onLocationFound={handleLocationFound} />
            
            {/* Loading indicator for viewport data */}
            {isLoadingMarkers && (
              <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Loading markers...</span>
                </div>
              </div>
            )}
            
            {/* Marker Cluster Group for performance with multiple markers */}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={25}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
              zoomToBoundsOnClick={true}
              disableClusteringAtZoom={15}
              iconCreateFunction={(cluster) => {
                if (!L) return null
                
                const count = cluster.getChildCount()
                let size = 'small'
                if (count < 10) {
                  size = 'small'
                } else if (count < 100) {
                  size = 'medium'
                } else {
                  size = 'large'
                }
                
                return L.divIcon({
                  html: `<div class="marker-cluster-${size}">${count}</div>`,
                  className: 'marker-cluster',
                  iconSize: L.point(50, 50)
                })
              }}
            >
              {/* Render markers for each filtered geocoded lead */}
              {filteredGeocodeData.map((record) => {
                const isSelected = selectedLeads.some(lead => lead.id === record.id)
                const icon = createWhiteMarkerIcon(isSelected)
                
                return (
                  <Marker
                    key={record.id}
                    position={[record.latitude, record.longitude]}
                    icon={icon}
                  >
                <Popup className="dark-popup">
                  <div className="p-4 min-w-[220px]">
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold text-sm text-gray-300">Business:</span>
                        <p className="text-sm font-medium text-white mt-1">
                          {record.cold_leads?.company_name || 'Unknown Company'}
                        </p>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-sm text-gray-300">Owner:</span>
                        <p className="text-sm text-gray-100 mt-1">
                          {record.cold_leads?.owner_name || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-sm text-gray-300">Practice:</span>
                        <p className="text-sm text-gray-100 mt-1">
                          {record.cold_leads?.practice_type || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-sm text-gray-300">Phone:</span>
                        <p className="text-sm text-gray-100 mt-1">
                          {record.cold_leads?.phone_number || record.phone_norm || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-sm text-gray-300">Address:</span>
                        <p className="text-sm text-gray-100 mt-1">
                          {record.address || 'N/A'}
                        </p>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-600">
                        <div className="space-y-2">
                          <button
                            onClick={() => handleMarkerClick(record)}
                            className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                              isSelected
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                : selectedLeads.length >= 10
                                ? 'bg-gray-500 cursor-not-allowed text-white shadow-sm'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            }`}
                            disabled={!isSelected && selectedLeads.length >= 10}
                          >
                            {isSelected 
                              ? 'Remove from Route' 
                              : selectedLeads.length >= 10 
                              ? 'Route Full (10/10)' 
                              : 'Add to Route'
                            }
                          </button>
                          
                          {record.cold_leads?.website && (
                            <button
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  window.open(record.cold_leads.website, '_blank')
                                }
                              }}
                              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            >
                              Visit Site
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
                  </Marker>
                )
              })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      </div>
    </div>
  )
}