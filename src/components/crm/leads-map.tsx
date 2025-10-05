"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Route, Loader2, CheckCircle, AlertCircle, MapPin } from "lucide-react"

// Dynamic imports for Leaflet to avoid SSR issues
let L: any = null
let MapContainer: any = null
let TileLayer: any = null
let Marker: any = null
let Popup: any = null
let MarkerClusterGroup: any = null

// Load Leaflet components only on client side with error handling
if (typeof window !== 'undefined') {
  try {
    import('leaflet').then(leaflet => {
      L = leaflet.default
      import('leaflet/dist/leaflet.css')
    }).catch(error => {
      console.error('Failed to load Leaflet:', error)
    })
    
    import('react-leaflet').then(reactLeaflet => {
      MapContainer = reactLeaflet.MapContainer
      TileLayer = reactLeaflet.TileLayer
      Marker = reactLeaflet.Marker
      Popup = reactLeaflet.Popup
    }).catch(error => {
      console.error('Failed to load react-leaflet:', error)
    })
    
    import('react-leaflet-cluster').then(cluster => {
      MarkerClusterGroup = cluster.default
    }).catch(error => {
      console.error('Failed to load react-leaflet-cluster:', error)
    })
  } catch (error) {
    console.error('Error loading map dependencies:', error)
  }
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

export default function LeadsMap() {
  const [geocodeData, setGeocodeData] = useState<GeocodeRecord[]>([])
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<Set<string>>(new Set())
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
  
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false)
  const [totalLeadsCount, setTotalLeadsCount] = useState(0)
  const [allPracticeTypes, setAllPracticeTypes] = useState<string[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(true)
  
  // Map instance ref for proper cleanup
  const mapInstanceRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  
  // Client-side loading state
  const [isClient, setIsClient] = useState(false)
  const [mapKey, setMapKey] = useState(0) // Force re-render of map component

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true)
    // Generate unique key for map container
    setMapKey(Date.now())
  }, [])

  // Load filter options
  useEffect(() => {
    const fetchAllFilterOptions = async () => {
      try {
        setIsLoadingFilters(true)
        
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

        const practiceTypes = new Set<string>()
        data?.forEach(record => {
          const lead = record.cold_leads
          if (lead?.practice_type) practiceTypes.add(lead.practice_type)
        })

        setAllPracticeTypes(Array.from(practiceTypes).sort())
        
        // Initialize selected practice types
        if (practiceTypes.size > 0) {
          setSelectedPracticeTypes(new Set(practiceTypes))
        }

      } catch (err) {
        console.error('🗺️ Error loading filter options:', err)
      } finally {
        setIsLoadingFilters(false)
      }
    }

    if (isClient) {
      fetchAllFilterOptions()
    }
  }, [isClient])

  // Fetch total count
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

    if (isClient) {
      fetchTotalCount()
    }
  }, [isClient])

  // Fetch geocode data
  useEffect(() => {
    const fetchGeocodeData = async () => {
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
          .limit(500)

        // Apply practice type filter if any are selected
        if (selectedPracticeTypes.size > 0) {
          query = query.in('cold_leads.practice_type', Array.from(selectedPracticeTypes))
        }

        const { data, error } = await query

        if (error) {
          console.error('🗺️ Error fetching geocode data:', error)
          return
        }

        setGeocodeData(data as GeocodeRecord[])

      } catch (err) {
        console.error('🗺️ Error in fetchGeocodeData:', err)
      } finally {
        setIsLoadingMarkers(false)
      }
    }

    if (isClient && selectedPracticeTypes.size > 0) {
      fetchGeocodeData()
    }
  }, [isClient, selectedPracticeTypes])

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

  // Prevent any global state pollution
  useEffect(() => {
    return () => {
      // Clean up any potential global state changes
      if (typeof window !== 'undefined') {
        try {
          // Remove any event listeners that might have been added
          window.removeEventListener('resize', () => {})
          window.removeEventListener('orientationchange', () => {})
        } catch (error) {
          console.warn('Error cleaning up global listeners:', error)
        }
      }
    }
  }, [])

  const handlePracticeTypeToggle = (practiceType: string, checked: boolean) => {
    const newSelected = new Set(selectedPracticeTypes)
    if (checked) {
      newSelected.add(practiceType)
    } else {
      newSelected.delete(practiceType)
    }
    setSelectedPracticeTypes(newSelected)
  }

  const handleMarkerClick = (record: GeocodeRecord) => {
    setSelectedLeads(prevSelected => {
      const isSelected = prevSelected.some(lead => lead.id === record.id)
      let newSelected: GeocodeRecord[]
      
      if (isSelected) {
        newSelected = prevSelected.filter(lead => lead.id !== record.id)
      } else {
        if (prevSelected.length >= 10) {
          return prevSelected
        }
        newSelected = [...prevSelected, record]
      }
      
      return newSelected
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    if (selectedLeads.length < 2) {
      setSubmitStatus({
        type: 'error',
        message: 'Please select at least 2 leads for route optimization.'
      })
      setIsSubmitting(false)
      return
    }

    if (!formData.startingAddress.trim() || !formData.email.trim()) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter both starting address and email address.'
      })
      setIsSubmitting(false)
      return
    }

    try {
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

      const webhookUrl = process.env.NEXT_PUBLIC_N8N_ROUTE_OPTIMIZATION_WEBHOOK_URL
      
      if (!webhookUrl) {
        throw new Error('N8N route optimization webhook URL not configured.')
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Route optimization request sent successfully! You will receive an email with your optimized route shortly.'
        })
        setFormData({
          startingAddress: "",
          email: ""
        })
      } else {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }
    } catch (error) {
      console.error('🗺️ Route optimization error:', error)
      
      let errorMessage = 'Failed to send route optimization request. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('not configured')) {
          errorMessage = 'Webhook URL not configured. Please check your environment variables.'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
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

  // Show loading state while client-side components are loading
  if (!isClient || !L || !MapContainer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading map...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex">
      {/* Filter Sidebar */}
      <div className="w-80 bg-background border-r border-border p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Filter by Practice Type</h2>
        
        {isLoadingFilters ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading filter options...</p>
          </div>
        ) : allPracticeTypes.length > 0 ? (
          <div className="space-y-3">
            {allPracticeTypes.map((practiceType) => (
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
            Showing {geocodeData.length} markers
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalLeadsCount > 0 && (
              <>
                {totalLeadsCount.toLocaleString()} total leads available
              </>
            )}
          </p>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Loading indicator */}
        {isLoadingMarkers && (
          <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Loading markers...</span>
            </div>
          </div>
        )}
        
        {/* Map Component with unique key to prevent reuse */}
        <div 
          ref={mapContainerRef}
          className="h-full w-full"
          style={{ height: '100%', width: '100%', backgroundColor: '#2c3e50' }}
        >
          <MapContainer
            key={`map-${mapKey}`} // Unique key to prevent container reuse
            center={[41.6032, -72.6906]} // Connecticut coordinates
            zoom={8}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
            whenReady={(map: any) => {
              try {
                // Store map instance for cleanup
                mapInstanceRef.current = map.target
                console.log('🗺️ Map initialized successfully')
              } catch (error) {
                console.error('🗺️ Error initializing map:', error)
              }
            }}
          >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                minZoom={0}
                maxZoom={19}
                crossOrigin={true}
              />
            
            {/* Markers */}
            {geocodeData.map((record) => {
              const isSelected = selectedLeads.some(lead => lead.id === record.id)
              
              return (
                <Marker
                  key={record.id}
                  position={[record.latitude, record.longitude]}
                  eventHandlers={{
                    click: () => handleMarkerClick(record)
                  }}
                >
                  <Popup>
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
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
