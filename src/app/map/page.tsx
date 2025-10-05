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
import { X, ChevronDown, ChevronRight } from 'lucide-react'

export default function MapPage() {
  const [geocodeData, setGeocodeData] = useState<GeocodeData[]>([])
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<Set<string>>(new Set())
  const [allPracticeTypes, setAllPracticeTypes] = useState<string[]>([])
  const [loadingPracticeTypes, setLoadingPracticeTypes] = useState(false)
  const [loadingGeocodeData, setLoadingGeocodeData] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<GeocodeData[]>([])
  const [isPracticeFilterOpen, setIsPracticeFilterOpen] = useState(false)

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
      try {
        setLoadingGeocodeData(true)
        console.log('🗺️ Testing geocode data fetch...')
        
        // First, let's test if we can access the cold_leads table directly
        const { data: coldLeadsData, error: coldLeadsError } = await supabase
          .from('cold_leads')
          .select('company_name, owner_name, phone_number, practice_type')
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
            cold_leads (
              company_name,
              owner_name,
              phone_number,
              practice_type,
              website
            )
          `)
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
  }, [])

  // Fetch all practice types with pagination
  useEffect(() => {
    const fetchAllPracticeTypes = async () => {
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
              cold_leads!inner (practice_type)
            `)
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
  }, [])

  // Use all practice types fetched with pagination
  const uniquePracticeTypes = useMemo(() => {
    return allPracticeTypes
  }, [allPracticeTypes])

  // Filter geocode data based on selected practice types
  const filteredGeocodeData = useMemo(() => {
    return geocodeData.filter(record => 
      selectedPracticeTypes.has(record.cold_leads?.practice_type || '')
    )
  }, [geocodeData, selectedPracticeTypes])

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

  return (
    <div className="h-screen flex flex-col">
      {/* Compact header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-white mb-1">Map</h1>
        <p className="text-gray-400 text-sm mb-1">
          Interactive map showing all leads geographically distributed
        </p>
        <p className="text-gray-300 text-xs">
          {loadingGeocodeData ? 'Loading geocoded leads...' : `Loaded ${geocodeData.length || 0} geocoded leads`}
        </p>
      </div>

      {/* Main content area with sidebar and map - takes remaining height */}
      <div className="flex gap-4 flex-1 px-4 pb-4">
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
                        key={lead.cold_lead_id || index}
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
              </div>
            )}
          </div>
            </CardContent>
          </Card>
        </div>

        {/* Map takes up remaining space */}
        <div className="flex-1">
          {loadingGeocodeData ? (
            <div className="h-[calc(100vh-200px)] bg-card rounded-lg border border-border flex items-center justify-center">
              <div className="text-center">
                <div className="text-card-foreground text-lg mb-2">Loading Map Data...</div>
                <div className="text-muted-foreground text-sm">Fetching all geocoded leads</div>
              </div>
            </div>
          ) : (
            <MapComponent 
              geocodeData={filteredGeocodeData} 
              selectedLeads={selectedLeads}
              onLeadSelection={handleLeadSelection}
            />
          )}
        </div>
      </div>
    </div>
  )
}
