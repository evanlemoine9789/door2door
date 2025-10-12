"use client"

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { MapComponent } from '@/components/map/MapComponent'
import { GeocodeData } from '@/types/geocode'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { X, ChevronDown, ChevronRight, Send, AlertCircle, CheckCircle, Search, MapPin, Navigation, Filter } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/components/providers/auth-provider'

export default function MapPage() {
  const { user } = useAuth()
  const [geocodeData, setGeocodeData] = useState<GeocodeData[]>([])
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<Set<string>>(new Set())
  const [allPracticeTypes, setAllPracticeTypes] = useState<string[]>([])
  const [loadingPracticeTypes, setLoadingPracticeTypes] = useState(false)
  const [loadingGeocodeData, setLoadingGeocodeData] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<GeocodeData[]>([])
  const [isPracticeFilterOpen, setIsPracticeFilterOpen] = useState(false)
  
  // State and City filters
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set())
  const [allStates, setAllStates] = useState<string[]>([])
  const [isStateFilterOpen, setIsStateFilterOpen] = useState(false)
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set())
  const [allCities, setAllCities] = useState<string[]>([])
  const [isCityFilterOpen, setIsCityFilterOpen] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationMessage, setOptimizationMessage] = useState('')
  const [optimizationError, setOptimizationError] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const isMobile = useIsMobile()
  
  // Address search state
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.6032, -73.0877]) // Connecticut center
  const [mapZoom, setMapZoom] = useState(9)
  const [searchResult, setSearchResult] = useState<{
    coordinates: [number, number]
    address: string
  } | null>(null)
  
  // Location state
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

  // Fetch user's organization_id
  useEffect(() => {
    async function fetchUserOrganization() {
      if (!user) {
        setOrganizationId(null)
        return
      }

      try {
        console.log('🔍 Fetching organization for user:', user.id)
        
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('❌ Error fetching user profile:', profileError)
          return
        }

        if (data?.organization_id) {
          console.log('✅ Organization ID found:', data.organization_id)
          setOrganizationId(data.organization_id)
        }
      } catch (err) {
        console.error('💥 Exception in fetchUserOrganization:', err)
      }
    }

    fetchUserOrganization()
  }, [user])

  // Log selected leads changes for debugging
  useEffect(() => {
    console.log('🗺️ Selected leads array changed:', selectedLeads.length, 'leads selected')
    console.log('🗺️ Selected leads:', selectedLeads.map(lead => ({
      id: lead.cold_lead_id,
      company: lead.cold_leads?.company_name,
      owner: lead.cold_leads?.owner_name
    })))
  }, [selectedLeads])

  useEffect(() => {
    const testGeocodeData = async () => {
      // Don't fetch if we don't have an organization ID yet
      if (!organizationId) {
        setLoadingGeocodeData(false)
        return
      }

      try {
        setLoadingGeocodeData(true)
        console.log('🗺️ Testing geocode data fetch...')
        
        // First, let's test if we can access the cold_leads table directly
        const { data: coldLeadsData, error: coldLeadsError } = await supabase
          .from('cold_leads')
          .select('company_name, owner_name, phone_number, practice_type')
          .eq('organization_id', organizationId)  // Filter by organization
          .limit(5)

        if (coldLeadsError) {
          console.error('❌ Error accessing cold_leads table:', coldLeadsError)
          return
        }

        console.log('🗺️ Cold leads test data:', coldLeadsData)
        console.log(`🗺️ Found ${coldLeadsData?.length || 0} cold leads`)
        
        // Now test the lead_geocodes table directly first
        const { data: geocodeData, error: geocodeError } = await supabase
          .from('lead_geocodes')
          .select('latitude, longitude, cold_lead_id, phone_norm, address')
          .limit(10)

        if (geocodeError) {
          console.error('❌ Error fetching lead_geocodes directly:', geocodeError)
          return
        }

        console.log('🗺️ Lead geocodes test data:', geocodeData)
        console.log(`🗺️ Found ${geocodeData?.length || 0} geocoded records`)

        // Fetch all geocoded leads with pagination
        console.log('🗺️ Fetching all geocoded leads with pagination...')
        
        const batchSize = 1000
        let start = 0
        let allGeocodeRecords: any[] = []
        let hasMore = true

        while (hasMore) {
          const { data, error } = await supabase
            .from('lead_geocodes')
          .select(`
            latitude,
            longitude,
            cold_lead_id,
            address,
            cold_leads!inner (
              company_name,
              owner_name,
              phone_number,
              practice_type,
              website,
              city,
              state,
              organization_id
            )
          `)
            .eq('cold_leads.organization_id', organizationId)  // Filter by organization
            .range(start, start + batchSize - 1)

          if (error) {
            console.error('❌ Error fetching geocode data:', error)
            break
          }

          if (data && data.length > 0) {
            allGeocodeRecords = allGeocodeRecords.concat(data)
            start += batchSize
            
            console.log(`🗺️ Fetched batch: ${data.length} records (total so far: ${allGeocodeRecords.length})`)
            
            // Check if we got less than batchSize, meaning we're done
            if (data.length < batchSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }

        const data = allGeocodeRecords
        const error = null // No error if we got here

        if (error) {
          console.error('❌ Error fetching geocode data:', error)
          console.log('🗺️ This is expected if the lead_geocodes table does not exist yet.')
          console.log('🗺️ The lead_geocodes table needs to be created before the map feature can work.')
          return
        }

        console.log('🗺️ Map test data:', data)
        console.log(`🗺️ Found ${data?.length || 0} successful geocoded leads`)
        console.log(`🗺️ Total markers loaded: ${data?.length || 0}`)
        
        // Debug: Check if we have any data and what the structure looks like
        if (data && data.length > 0) {
          console.log('🗺️ First record structure:', data[0])
          const firstColdLead = Array.isArray(data[0].cold_leads) ? data[0].cold_leads[0] : data[0].cold_leads
          console.log('🗺️ First cold lead data:', firstColdLead)
        }
        
        // Store the data in state for the map markers
        if (data) {
          // Transform the data to handle the array structure from Supabase
          const transformedData = data.map((record: any) => ({
            latitude: record.latitude,
            longitude: record.longitude,
            cold_lead_id: record.cold_lead_id,
            address: record.address,
            cold_leads: Array.isArray(record.cold_leads) ? record.cold_leads[0] : record.cold_leads
          }))
          setGeocodeData(transformedData)
          
          // Note: Practice types are now fetched separately with pagination
        }
        
        // Log individual records for verification
        data?.forEach((record: any, index) => {
          const coldLeads = Array.isArray(record.cold_leads) ? record.cold_leads[0] : record.cold_leads
          console.log(`🗺️ Record ${index + 1}:`, {
            latitude: record.latitude,
            longitude: record.longitude,
            cold_lead_id: record.cold_lead_id,
            company: coldLeads?.company_name,
            owner: coldLeads?.owner_name,
            phone: coldLeads?.phone_number,
            practice_type: coldLeads?.practice_type
          })
        })

      } catch (error) {
        console.error('❌ Unexpected error in testGeocodeData:', error)
      } finally {
        setLoadingGeocodeData(false)
      }
    }

    testGeocodeData()
  }, [organizationId])

  // Fetch all practice types with pagination
  useEffect(() => {
    const fetchAllPracticeTypes = async () => {
      // Don't fetch if we don't have an organization ID yet
      if (!organizationId) {
        setLoadingPracticeTypes(false)
        return
      }

      try {
        setLoadingPracticeTypes(true)
        console.log('🗺️ Fetching all practice types with pagination...')
        
        const batchSize = 1000
        let start = 0
        let allRecords: any[] = []
        let hasMore = true

        while (hasMore) {
          const { data, error } = await supabase
            .from('lead_geocodes')
            .select(`
              cold_leads!inner (practice_type, organization_id)
            `)
            .eq('cold_leads.organization_id', organizationId)  // Filter by organization
            .range(start, start + batchSize - 1)

          if (error) {
            console.error('❌ Error fetching practice types:', error)
            break
          }

          if (data && data.length > 0) {
            allRecords = allRecords.concat(data)
            start += batchSize
            
            // Check if we got less than batchSize, meaning we're done
            if (data.length < batchSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }

        // Extract unique practice types
        const practiceTypes = Array.from(
          new Set(
            allRecords
              .map(record => {
                const coldLeads = Array.isArray(record.cold_leads) ? record.cold_leads[0] : record.cold_leads
                return coldLeads?.practice_type
              })
              .filter(Boolean)
          )
        ).sort()

        setAllPracticeTypes(practiceTypes)
        
        // Initialize selected practice types to all (default state)
        setSelectedPracticeTypes(new Set(practiceTypes))
        
        console.log('🗺️ Found practice types:', practiceTypes)
        console.log(`🗺️ Total unique practice types: ${practiceTypes.length}`)

      } catch (error) {
        console.error('❌ Unexpected error fetching practice types:', error)
      } finally {
        setLoadingPracticeTypes(false)
      }
    }

    fetchAllPracticeTypes()
  }, [organizationId])

  // Fetch all states with pagination
  useEffect(() => {
    const fetchAllStates = async () => {
      // Don't fetch if we don't have an organization ID yet
      if (!organizationId) {
        return
      }

      try {
        console.log('🗺️ Fetching all states with pagination...')
        
        const batchSize = 1000
        let start = 0
        let allRecords: any[] = []
        let hasMore = true

        while (hasMore) {
          const { data, error } = await supabase
            .from('lead_geocodes')
            .select(`
              cold_leads!inner (state, organization_id)
            `)
            .eq('cold_leads.organization_id', organizationId)  // Filter by organization
            .range(start, start + batchSize - 1)

          if (error) {
            console.error('❌ Error fetching states:', error)
            break
          }

          if (data && data.length > 0) {
            allRecords = allRecords.concat(data)
            start += batchSize
            
            if (data.length < batchSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }

        // Extract unique states
        const states = Array.from(
          new Set(
            allRecords
              .map(record => {
                const coldLeads = Array.isArray(record.cold_leads) ? record.cold_leads[0] : record.cold_leads
                return coldLeads?.state
              })
              .filter(Boolean)
          )
        ).sort()

        setAllStates(states)
        setSelectedStates(new Set(states)) // Initialize to all selected
        
        console.log('🗺️ Found states:', states)
        console.log('🗺️ States count:', states.length)

      } catch (error) {
        console.error('❌ Unexpected error fetching states:', error)
      }
    }

    fetchAllStates()
  }, [organizationId])

  // Fetch all cities with pagination
  useEffect(() => {
    const fetchAllCities = async () => {
      // Don't fetch if we don't have an organization ID yet
      if (!organizationId) {
        return
      }

      try {
        console.log('🗺️ Fetching all cities with pagination...')
        
        const batchSize = 1000
        let start = 0
        let allRecords: any[] = []
        let hasMore = true

        while (hasMore) {
          const { data, error } = await supabase
            .from('lead_geocodes')
            .select(`
              cold_leads!inner (city, organization_id)
            `)
            .eq('cold_leads.organization_id', organizationId)  // Filter by organization
            .range(start, start + batchSize - 1)

          if (error) {
            console.error('❌ Error fetching cities:', error)
            break
          }

          if (data && data.length > 0) {
            allRecords = allRecords.concat(data)
            start += batchSize
            
            if (data.length < batchSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }

        // Extract unique cities
        const cities = Array.from(
          new Set(
            allRecords
              .map(record => {
                const coldLeads = Array.isArray(record.cold_leads) ? record.cold_leads[0] : record.cold_leads
                return coldLeads?.city
              })
              .filter(Boolean)
          )
        ).sort()

        setAllCities(cities)
        setSelectedCities(new Set(cities)) // Initialize to all selected
        
        console.log('🗺️ Found cities:', cities)
        console.log('🗺️ Cities count:', cities.length)

      } catch (error) {
        console.error('❌ Unexpected error fetching cities:', error)
      }
    }

    fetchAllCities()
  }, [organizationId])

  // Use all practice types fetched with pagination
  const uniquePracticeTypes = useMemo(() => {
    return allPracticeTypes
  }, [allPracticeTypes])

  // Filter geocode data based on selected practice types, states, and cities
  const filteredGeocodeData = useMemo(() => {
    console.log('🗺️ Filtering data:', {
      totalRecords: geocodeData.length,
      selectedPracticeTypes: selectedPracticeTypes.size,
      selectedStates: selectedStates.size,
      selectedCities: selectedCities.size
    })
    
    const filtered = geocodeData.filter(record => {
      // If filter sets are empty, show all records (initial state)
      const practiceTypeMatch = selectedPracticeTypes.size === 0 || selectedPracticeTypes.has(record.cold_leads?.practice_type || '')
      const stateMatch = selectedStates.size === 0 || selectedStates.has(record.cold_leads?.state || '')
      const cityMatch = selectedCities.size === 0 || selectedCities.has(record.cold_leads?.city || '')
      
      return practiceTypeMatch && stateMatch && cityMatch
    })
    
    console.log('🗺️ Filtered result:', filtered.length, 'records')
    return filtered
  }, [geocodeData, selectedPracticeTypes, selectedStates, selectedCities])

  // Handle practice type filter changes
  const handlePracticeTypeChange = (practiceType: string, checked: boolean) => {
    setSelectedPracticeTypes(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(practiceType)
      } else {
        newSet.delete(practiceType)
      }
      return newSet
    })
  }

  // Handle state filter changes
  const handleStateChange = (state: string, checked: boolean) => {
    setSelectedStates(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(state)
      } else {
        newSet.delete(state)
      }
      return newSet
    })
  }

  // Handle city filter changes
  const handleCityChange = (city: string, checked: boolean) => {
    setSelectedCities(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(city)
      } else {
        newSet.delete(city)
      }
      return newSet
    })
  }

  // Handle lead selection/deselection
  const handleLeadSelection = (lead: GeocodeData) => {
    setSelectedLeads(prev => {
      const isSelected = prev.some(selectedLead => selectedLead.cold_lead_id === lead.cold_lead_id)
      
      if (isSelected) {
        // Remove from selection
        const newSelection = prev.filter(selectedLead => selectedLead.cold_lead_id !== lead.cold_lead_id)
        console.log('🗺️ Lead deselected:', lead.cold_leads?.company_name, 'New selection:', newSelection.map(l => l.cold_leads?.company_name))
        return newSelection
      } else {
        // Add to selection
        const newSelection = [...prev, lead]
        console.log('🗺️ Lead selected:', lead.cold_leads?.company_name, 'New selection:', newSelection.map(l => l.cold_leads?.company_name))
        return newSelection
      }
    })
  }

  // Address search function using OpenStreetMap Nominatim API
  const searchAddress = async (address: string) => {
    if (!address.trim()) return

    setIsSearching(true)
    setSearchError('')

    try {
      // Use OpenStreetMap Nominatim API for geocoding (free service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Door2Door-CRM/1.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to search address')
      }

      const data = await response.json()

      if (data.length === 0) {
        setSearchError('Address not found. Please try a different search term.')
        return
      }

      const result = data[0]
      const lat = parseFloat(result.lat)
      const lon = parseFloat(result.lon)

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Invalid coordinates received')
      }

      // Update map center and zoom to the found location
      setMapCenter([lat, lon])
      setMapZoom(15) // Zoom in closer for address searches
      
      // Store the search result for the temporary pin
      setSearchResult({
        coordinates: [lat, lon],
        address: result.display_name
      })
      
      console.log('🗺️ Address found:', result.display_name, 'Coordinates:', [lat, lon])

    } catch (error) {
      console.error('Error searching address:', error)
      setSearchError('Failed to search address. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchAddress(searchQuery)
  }

  const clearSearchResult = () => {
    setSearchResult(null)
    setSearchQuery('')
    setSearchError('')
  }

  // Function to get user's current location
  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser')
      return
    }

    setIsLocating(true)
    setLocationError(null)
    setSearchError('') // Clear any search errors

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newCenter: [number, number] = [latitude, longitude]
        setUserLocation(newCenter)
        setMapCenter(newCenter)
        setMapZoom(15) // Zoom level 15 provides closer view of user location and nearby practices
        setIsLocating(false)
      },
      (error) => {
        let errorMessage = 'Unable to get your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user. Please enable location permissions in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your GPS or network connection.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
        }
        setLocationError(errorMessage)
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for better accuracy
        maximumAge: 30000 // Reduced cache time for more accurate location
      }
    )
  }

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Handle route optimization
  const handleOptimizeRoute = async () => {
    // Clear previous messages
    setOptimizationMessage('')
    setOptimizationError('')

    // Validation
    if (selectedLeads.length < 2) {
      setOptimizationError('Please select at least 2 leads for route optimization.')
      return
    }

    if (!emailAddress.trim()) {
      setOptimizationError('Please enter your email address.')
      return
    }

    if (!validateEmail(emailAddress)) {
      setOptimizationError('Please enter a valid email address.')
      return
    }

    setIsOptimizing(true)

    try {
      // Prepare the data as JSON
      const routeData = {
        email: emailAddress.trim(),
        leads: selectedLeads.map(lead => ({
          business_name: lead.cold_leads?.company_name || 'Unknown Business',
          owner_name: lead.cold_leads?.owner_name || 'Unknown Owner',
          address: lead.address || 'No address',
          latitude: lead.latitude,
          longitude: lead.longitude
        }))
      }

      console.log('🗺️ Sending route optimization request:', routeData)

      // Get the webhook URL from environment variables
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_ROUTE_OPTIMIZATION_WEBHOOK_URL

      if (!webhookUrl) {
        throw new Error('N8N webhook URL not configured')
      }

      // Send POST request to N8N webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('🗺️ Route optimization response:', result)

      setOptimizationMessage(`Route optimization request sent successfully! You'll receive an email at ${emailAddress} with your optimized route.`)
      
      // Clear the form
      setEmailAddress('')
      setSelectedLeads([])

    } catch (error) {
      console.error('🗺️ Route optimization error:', error)
      setOptimizationError('Failed to send route optimization request. Please try again.')
    } finally {
      setIsOptimizing(false)
    }
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden pb-16">
        {/* Search Bar - Fixed at top */}
        <div className="flex-shrink-0 p-4 bg-background z-[1000]">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white/95 backdrop-blur-sm border-border text-foreground placeholder:text-muted-foreground shadow-lg"
              />
            </div>
            <div className="flex gap-2">
              {/* Search Button */}
              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="h-11 w-11 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                title="Search for address"
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
              
              {/* My Location Button */}
              <Button
                type="button"
                onClick={handleLocationClick}
                disabled={isLocating}
                className="h-11 w-11 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                title="Find your location"
              >
                {isLocating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </Button>
              
            </div>
          </form>
          
          {/* Search Error */}
          {searchError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {searchError}
            </div>
          )}
          
          {/* Location Error */}
          {locationError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-center justify-between">
              <span>{locationError}</span>
              <button 
                onClick={() => setLocationError(null)}
                className="ml-2 text-red-600 hover:text-red-800 font-bold"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Map Container - Takes remaining space */}
        <div className="flex-1 relative overflow-hidden">
          {loadingGeocodeData ? (
            <div className="h-full bg-card flex items-center justify-center">
              <div className="text-center">
                <div className="text-card-foreground text-lg mb-2">Loading Map Data...</div>
                <div className="text-muted-foreground text-sm">Fetching all geocoded leads</div>
              </div>
            </div>
          ) : (
            <>
              {/* Filters Sheet Content */}
              <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent side="bottom" className="h-[80vh] flex flex-col">
                    <SheetTitle className="text-lg font-semibold flex-shrink-0">Filters & Route</SheetTitle>
                    <div className="flex-1 overflow-y-auto py-4 space-y-4">
                      
                      {/* Practice Type Filter */}
                      <Collapsible open={isPracticeFilterOpen} onOpenChange={setIsPracticeFilterOpen}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-3 h-auto hover:bg-muted/50 border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-card-foreground">
                                Practice Types
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                ({selectedPracticeTypes.size} selected)
                              </span>
                            </div>
                            {isPracticeFilterOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-2 pb-2">
                          {loadingPracticeTypes ? (
                            <div className="text-sm text-muted-foreground p-2">
                              Loading practice types...
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  {selectedPracticeTypes.size} of {uniquePracticeTypes.length} selected
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPracticeTypes(new Set())}
                                  className="text-xs h-7 px-2"
                                >
                                  Deselect All
                                </Button>
                              </div>
                              
                              <ScrollArea className="h-[200px]">
                                <div className="space-y-1">
                                  {uniquePracticeTypes.map((practiceType) => (
                                    <div 
                                      key={practiceType} 
                                      className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handlePracticeTypeChange(practiceType || '', !selectedPracticeTypes.has(practiceType || ''))
                                      }}
                                    >
                                      <Checkbox
                                        id={practiceType}
                                        checked={selectedPracticeTypes.has(practiceType || '')}
                                        onCheckedChange={(checked) => 
                                          handlePracticeTypeChange(practiceType || '', checked as boolean)
                                        }
                                        className="h-5 w-5 mr-3 pointer-events-none"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <label 
                                        htmlFor={practiceType}
                                        className="text-base text-card-foreground cursor-pointer flex-1 select-none"
                                        onClick={(e) => e.preventDefault()}
                                      >
                                        {practiceType}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                              <div className="pt-2 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                  Showing {filteredGeocodeData.length} of {geocodeData.length} leads
                                </p>
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* State Filter */}
                      <Collapsible open={isStateFilterOpen} onOpenChange={setIsStateFilterOpen}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-3 h-auto hover:bg-muted/50 border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-card-foreground">
                                States
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                ({selectedStates.size} selected)
                              </span>
                            </div>
                            {isStateFilterOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-2 pb-2">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                {selectedStates.size} of {allStates.length} selected
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedStates(new Set())}
                                className="text-xs h-7 px-2"
                              >
                                Deselect All
                              </Button>
                            </div>
                            
                            <ScrollArea className="h-[200px]">
                              <div className="space-y-1">
                                {allStates.map((state) => (
                                  <div 
                                    key={state} 
                                    className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      handleStateChange(state || '', !selectedStates.has(state || ''))
                                    }}
                                  >
                                    <Checkbox
                                      id={state}
                                      checked={selectedStates.has(state || '')}
                                      onCheckedChange={(checked) => 
                                        handleStateChange(state || '', checked as boolean)
                                      }
                                      className="h-5 w-5 mr-3 pointer-events-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <label 
                                      htmlFor={state}
                                      className="text-base text-card-foreground cursor-pointer flex-1 select-none"
                                      onClick={(e) => e.preventDefault()}
                                    >
                                      {state}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* City Filter */}
                      <Collapsible open={isCityFilterOpen} onOpenChange={setIsCityFilterOpen}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-3 h-auto hover:bg-muted/50 border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-card-foreground">
                                Cities
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                ({selectedCities.size} selected)
                              </span>
                            </div>
                            {isCityFilterOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-2 pb-2">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                {selectedCities.size} of {allCities.length} selected
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCities(new Set())}
                                className="text-xs h-7 px-2"
                              >
                                Deselect All
                              </Button>
                            </div>
                            
                            <ScrollArea className="h-[200px]">
                              <div className="space-y-1">
                                {allCities.map((city) => (
                                  <div 
                                    key={city} 
                                    className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      handleCityChange(city || '', !selectedCities.has(city || ''))
                                    }}
                                  >
                                    <Checkbox
                                      id={city}
                                      checked={selectedCities.has(city || '')}
                                      onCheckedChange={(checked) => 
                                        handleCityChange(city || '', checked as boolean)
                                      }
                                      className="h-5 w-5 mr-3 pointer-events-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <label 
                                      htmlFor={city}
                                      className="text-base text-card-foreground cursor-pointer flex-1 select-none"
                                      onClick={(e) => e.preventDefault()}
                                    >
                                      {city}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Route Selection */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-card-foreground">
                          Route Selection
                        </h3>
                        
                        {selectedLeads.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-muted-foreground text-sm mb-2">
                              No leads selected
                            </div>
                            <div className="text-muted-foreground text-xs">
                              Tap markers on the map to select leads
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-primary font-medium">
                                {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLeads([])}
                                className="text-xs h-7 px-2"
                              >
                                Clear All
                              </Button>
                            </div>
                            
                            <ScrollArea className="h-[200px]">
                              <div className="space-y-2">
                                {selectedLeads.map((lead, index) => (
                                  <div
                                    key={`selected-${lead.cold_lead_id}-${lead.latitude}-${lead.longitude}-${index}`}
                                    className="bg-card rounded-lg p-3 border border-border"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-card-foreground text-sm truncate">
                                          {lead.cold_leads?.company_name || 'Unknown Business'}
                                        </div>
                                        <div className="text-card-foreground text-xs mt-1">
                                          {lead.cold_leads?.owner_name || 'Unknown Owner'}
                                        </div>
                                        <div className="text-muted-foreground text-xs mt-1 truncate">
                                          {lead.address || 'No address'}
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleLeadSelection(lead)}
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            
                            {/* Route Optimization Form */}
                            {selectedLeads.length >= 2 && (
                              <div className="pt-4 border-t border-border">
                                <div className="space-y-3">
                                  <div>
                                    <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
                                      Email Address
                                    </Label>
                                    <Input
                                      id="email"
                                      type="email"
                                      placeholder="your@email.com"
                                      value={emailAddress}
                                      onChange={(e) => setEmailAddress(e.target.value)}
                                      className="mt-1 h-11"
                                    />
                                  </div>
                                  
                                  <Button
                                    onClick={handleOptimizeRoute}
                                    disabled={isOptimizing || !emailAddress.trim()}
                                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                  >
                                    {isOptimizing ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                                        Optimizing Route...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Optimize & Send Route
                                      </>
                                    )}
                                  </Button>
                                  
                                  {/* Success Message */}
                                  {optimizationMessage && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      <p className="text-sm text-green-800">{optimizationMessage}</p>
                                    </div>
                                  )}
                                  
                                  {/* Error Message */}
                                  {optimizationError && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                      <p className="text-sm text-red-800">{optimizationError}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              
              {/* Full-screen map */}
              <div className="relative h-full w-full">
                {/* Filter Button - Positioned on map */}
                <div className="absolute top-4 right-4 z-[1000]">
                  <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <SheetTrigger asChild>
                      <Button
                        className="h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                        title="Filters & Route"
                      >
                        <Filter className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                  </Sheet>
                </div>
                
                <MapComponent 
                  geocodeData={filteredGeocodeData} 
                  selectedLeads={selectedLeads}
                  onLeadSelection={handleLeadSelection}
                  center={mapCenter}
                  zoom={mapZoom}
                  searchResult={searchResult}
                  onClearSearch={clearSearchResult}
                  userLocation={userLocation}
                  className="h-full w-full"
                />
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Desktop Layout (unchanged)
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Main content area with sidebar and map - takes full height */}
      <div className="flex gap-4 flex-1 px-4 py-4">
        {/* Left sidebar with collapsible practice filter and route selection */}
        <div className="w-80">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-card-foreground">Map Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-full">
          {/* Practice Type Filter - Collapsible */}
          <Collapsible open={isPracticeFilterOpen} onOpenChange={setIsPracticeFilterOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto hover:bg-muted/50 border-b border-border"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Filter by Practice Type
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({selectedPracticeTypes.size} selected)
                  </span>
                </div>
                {isPracticeFilterOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              {loadingPracticeTypes ? (
                <div className="text-sm text-muted-foreground">
                  Loading practice types...
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Deselect All Button */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {selectedPracticeTypes.size} of {uniquePracticeTypes.length} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPracticeTypes(new Set())}
                      className="text-xs h-7 px-2 text-muted-foreground hover:text-card-foreground border-border hover:border-border bg-card"
                    >
                      Deselect All
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[300px] pr-2">
                    <div className="space-y-2">
                      {uniquePracticeTypes.map((practiceType) => (
                        <div key={practiceType} className="flex items-center space-x-2">
                          <Checkbox
                            id={practiceType}
                            checked={selectedPracticeTypes.has(practiceType || '')}
                            onCheckedChange={(checked) => 
                              handlePracticeTypeChange(practiceType || '', checked as boolean)
                            }
                          />
                          <label 
                            htmlFor={practiceType}
                            className="text-sm text-card-foreground cursor-pointer"
                          >
                            {practiceType}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Showing {filteredGeocodeData.length} of {geocodeData.length} leads
                    </p>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Route Selection */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Route Selection
            </h3>
            
            {selectedLeads.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground text-sm mb-2">
                  No leads selected
                </div>
                <div className="text-muted-foreground text-xs">
                  Click markers on the map to select leads for your route
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-primary font-medium">
                    {selectedLeads.length} lead{selectedLeads.length !== 1 ? 's' : ''} selected for route
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLeads([])}
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-card-foreground border-border hover:border-border bg-card"
                  >
                    Clear All
                  </Button>
                </div>
                
                <Separator className="bg-border" />
                
                <ScrollArea className="h-[400px] pr-2">
                  <div className="space-y-2">
                    {selectedLeads.map((lead, index) => (
                      <div
                        key={`selected-${lead.cold_lead_id}-${lead.latitude}-${lead.longitude}-${index}`}
                        className="bg-card rounded-lg p-3 border border-border hover:border-border transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-card-foreground text-sm truncate">
                              {lead.cold_leads?.company_name || 'Unknown Business'}
                            </div>
                            <div className="text-card-foreground text-xs mt-1">
                              {lead.cold_leads?.owner_name || 'Unknown Owner'}
                            </div>
                            <div className="text-muted-foreground text-xs mt-1 truncate">
                              {lead.address || 'No address'}
                            </div>
                            <div className="text-muted-foreground text-xs mt-1">
                              {lead.cold_leads?.practice_type || 'Unknown Practice'}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLeadSelection(lead)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/20 flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Route Optimization Form */}
                {selectedLeads.length >= 2 && (
                  <div className="pt-4 border-t border-border">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          className="mt-1 bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      
                      <Button
                        onClick={handleOptimizeRoute}
                        disabled={isOptimizing || !emailAddress.trim()}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      >
                        {isOptimizing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                            Optimizing Route...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Optimize & Send Route
                          </>
                        )}
                      </Button>
                      
                      {/* Success Message */}
                      {optimizationMessage && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <p className="text-sm text-green-800">{optimizationMessage}</p>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {optimizationError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          <p className="text-sm text-red-800">{optimizationError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
            </CardContent>
          </Card>
        </div>

        {/* Map takes up remaining space */}
        <div className="flex-1">
          {loadingGeocodeData ? (
            <div className="h-full bg-card rounded-lg border border-border flex items-center justify-center">
              <div className="text-center">
                <div className="text-card-foreground text-lg mb-2">Loading Map Data...</div>
                <div className="text-muted-foreground text-sm">Fetching all geocoded leads</div>
              </div>
            </div>
          ) : (
            <div className="h-full relative">
              {/* Address Search Bar */}
              <div className="absolute top-4 left-4 right-4 z-[1000]">
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search for an address, city, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/95 backdrop-blur-sm border-border text-foreground placeholder:text-muted-foreground shadow-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    {/* Search Button */}
                    <Button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                      title="Search for address"
                    >
                      {isSearching ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {/* My Location Button */}
                    <Button
                      type="button"
                      onClick={handleLocationClick}
                      disabled={isLocating}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                      title="Find your location and zoom to nearby practices"
                    >
                      {isLocating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </form>
                
                {/* Search Error */}
                {searchError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                    {searchError}
                  </div>
                )}
                
                {/* Location Error */}
                {locationError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-center justify-between">
                    <span>{locationError}</span>
                    <button 
                      onClick={() => setLocationError(null)}
                      className="ml-2 text-red-600 hover:text-red-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              
              <MapComponent 
                geocodeData={filteredGeocodeData} 
                selectedLeads={selectedLeads}
                onLeadSelection={handleLeadSelection}
                center={mapCenter}
                zoom={mapZoom}
                searchResult={searchResult}
                onClearSearch={clearSearchResult}
                userLocation={userLocation}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
