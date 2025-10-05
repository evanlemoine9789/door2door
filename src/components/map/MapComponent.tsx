"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, ExternalLink, X } from 'lucide-react'
import { GeocodeData } from '@/types/geocode'

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.MapContainer })), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-card rounded-lg border border-border flex items-center justify-center">
      <div className="text-center">
        <div className="text-card-foreground text-lg mb-2">Loading Map...</div>
        <div className="text-muted-foreground text-sm">Initializing map components</div>
      </div>
    </div>
  )
})
const TileLayer = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.TileLayer })), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Marker })), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Popup })), { ssr: false })
const useMap = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.useMap })), { ssr: false })
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster'), { ssr: false })

// Global flag to prevent multiple CSS imports
let cssImported = false

// Import CSS only once on client side
if (typeof window !== 'undefined' && !cssImported) {
  import('leaflet/dist/leaflet.css')
  import('./MapComponent.css')
  cssImported = true
}

// Fix for default markers in react-leaflet - memoized to prevent recreation
let L: any = null
if (typeof window !== 'undefined') {
  L = require('leaflet')
}

// Create icons only once and memoize them to prevent recreation
let cachedIcons: { whiteIcon: any; selectedIcon: any; userLocationIcon: any } | null = null

const createIcons = () => {
  if (!L) return { whiteIcon: null, selectedIcon: null, userLocationIcon: null }
  
  // Return cached icons if they exist
  if (cachedIcons) return cachedIcons
  
  const whiteIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 7.5 12.5 28.5 12.5 28.5S25 20 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#ffffff" stroke="#333333" stroke-width="1"/>
        <circle cx="12.5" cy="12.5" r="4" fill="#000000"/>
      </svg>
    `),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  })

  const selectedIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 7.5 12.5 28.5 12.5 28.5S25 20 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#22c55e" stroke="#ffffff" stroke-width="3"/>
        <circle cx="12.5" cy="12.5" r="6" fill="#ffffff"/>
        <path d="M10 12.5l2 2 4-4" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  })

  const userLocationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 7.5 12.5 28.5 12.5 28.5S25 20 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#3b82f6" stroke="#1e40af" stroke-width="2"/>
        <circle cx="12.5" cy="12.5" r="3" fill="#ffffff"/>
      </svg>
    `),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  })

  // Cache the icons
  cachedIcons = { whiteIcon, selectedIcon, userLocationIcon }
  return cachedIcons
}

// Custom cluster icon function with more opaque styling
const createClusterCustomIcon = function (cluster: any) {
  if (!L) return null
  
  const count = cluster.getChildCount()
  
  // Determine size and color based on count
  let size = 34
  let backgroundColor = '#22c55e' // Green for smaller clusters
  
  if (count >= 15) {
    backgroundColor = '#f59e0b' // Yellow/Orange for larger clusters
    size = 38
  }
  
  if (count >= 50) {
    size = 42
  }
  
  // Font sizes
  let fontSize = '11px'
  if (count >= 50) {
    fontSize = '13px'
  } else if (count >= 15) {
    fontSize = '12px'
  }
  
  return new L.DivIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${backgroundColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${fontSize};
        box-shadow: 0 2px 4px rgba(0,0,0,0.6);
        border: 2px solid white;
        opacity: 1;
      ">
        ${count}
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size, true),
    iconAnchor: L.point(size / 2, size / 2, true)
  })
}

// Component to handle map centering with better error handling
function MapCenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap()
  const [isInitialized, setIsInitialized] = useState(false)
  
  useEffect(() => {
    if (center && map && typeof map.setView === 'function' && !isInitialized) {
      // Add a small delay to ensure map is fully initialized
      const timer = setTimeout(() => {
        try {
          const targetZoom = zoom || map.getZoom()
          map.setView(center, targetZoom)
          setIsInitialized(true)
        } catch (error) {
          console.warn('Map center update failed:', error)
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [center, zoom, map, isInitialized])
  
  // Reset initialization flag when center changes significantly
  useEffect(() => {
    setIsInitialized(false)
  }, [center])
  
  return null
}

// Location button component
function LocationButton({ 
  onLocationClick, 
  isLocating 
}: { 
  onLocationClick: () => void
  isLocating: boolean 
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <Button
        onClick={onLocationClick}
        disabled={isLocating}
        className="bg-card border-border text-card-foreground hover:bg-muted/50 shadow-lg"
        size="sm"
      >
        {isLocating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-card-foreground mr-2"></div>
            Locating...
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4 mr-2" />
            My Location
          </>
        )}
      </Button>
    </div>
  )
}

interface MapComponentProps {
  center?: [number, number]
  zoom?: number
  className?: string
  geocodeData?: GeocodeData[]
  selectedLeads?: GeocodeData[]
  onLeadSelection?: (lead: GeocodeData) => void
}

export function MapComponent({ 
  center = [41.6032, -73.0877], // Connecticut center coordinates
  zoom = 9,
  className = "h-full w-full",
  geocodeData = [],
  selectedLeads = [],
  onLeadSelection
}: MapComponentProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center)
  const [mapZoom, setMapZoom] = useState<number>(zoom)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  // Ensure we're on the client side with better error handling
  useEffect(() => {
    try {
      setIsClient(true)
    } catch (error) {
      console.error('Error initializing map component:', error)
      setMapError('Failed to initialize map component')
    }
  }, [])

  // Get icons only on client side with memoization
  const icons = useMemo(() => {
    if (!isClient) return { whiteIcon: null, selectedIcon: null, userLocationIcon: null }
    try {
      return createIcons()
    } catch (error) {
      console.error('Error creating map icons:', error)
      return { whiteIcon: null, selectedIcon: null, userLocationIcon: null }
    }
  }, [isClient])

  const { whiteIcon, selectedIcon, userLocationIcon } = icons

  // Function to get user's current location
  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newCenter: [number, number] = [latitude, longitude]
        setUserLocation(newCenter)
        setMapCenter(newCenter)
        setMapZoom(15) // Zoom in closer to see nearby practices
        setIsLocating(false)
      },
      (error) => {
        let errorMessage = 'Unable to get your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        setLocationError(errorMessage)
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  // Show error state if map initialization failed
  if (mapError) {
    return (
      <div className={`${className} relative bg-card rounded-lg border border-border flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-destructive text-lg mb-2">Map Error</div>
          <div className="text-muted-foreground text-sm">{mapError}</div>
          <Button 
            onClick={() => {
              setMapError(null)
              setIsClient(false)
              setTimeout(() => setIsClient(true), 100)
            }}
            className="mt-4"
            size="sm"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Show loading state until client-side rendering is ready
  if (!isClient || !whiteIcon || !userLocationIcon) {
    return (
      <div className={`${className} relative bg-card rounded-lg border border-border flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-card-foreground text-lg mb-2">Loading Map...</div>
          <div className="text-muted-foreground text-sm">Initializing map components</div>
        </div>
      </div>
    )
  }

  // Additional safety check for map initialization
  if (typeof window === 'undefined') {
    return (
      <div className={`${className} relative bg-card rounded-lg border border-border flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-card-foreground text-lg mb-2">Loading Map...</div>
          <div className="text-muted-foreground text-sm">Initializing map components</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} relative`}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg border border-gray-700"
        key={`map-${center[0]}-${center[1]}-${zoom}`} // Force re-render on significant changes
      >
        <TileLayer
          attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={`https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY || ''}`}
          minZoom={0}
          maxZoom={20}
          crossOrigin={true}
          className="map-tiles"
        />
        
        {/* Map center controller */}
        <MapCenter center={mapCenter} zoom={mapZoom} />
        
        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div className="p-2">
                <div className="font-semibold text-gray-700">Your Location</div>
                <div className="text-gray-600 text-sm">
                  Lat: {userLocation[0].toFixed(6)}<br />
                  Lng: {userLocation[1].toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Render markers with clustering for each geocoded lead */}
        <MarkerClusterGroup
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={60}
          minClusterSize={3}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          disableClusteringAtZoom={15}
          chunkedLoading={true}
          chunkProgress={undefined}
        >
           {geocodeData.map((lead, index) => {
             const isSelected = selectedLeads.some(selectedLead => selectedLead.cold_lead_id === lead.cold_lead_id)
             
             return (
               <Marker 
                 key={lead.cold_lead_id || index}
                 position={[lead.latitude, lead.longitude]}
                 icon={isSelected ? selectedIcon : whiteIcon}
               >
                <Popup>
                  <div className="bg-gray-900 text-white p-4 min-w-[280px] rounded-lg shadow-lg">
                    
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold text-gray-300 text-sm">Business:</span>
                        <div className="text-white font-medium">{lead.cold_leads?.company_name || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-gray-300 text-sm">Owner:</span>
                        <div className="text-white">{lead.cold_leads?.owner_name || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-gray-300 text-sm">Practice:</span>
                        <div className="text-white">{lead.cold_leads?.practice_type || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-gray-300 text-sm">Phone:</span>
                        <div className="text-white">{lead.cold_leads?.phone_number || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-gray-300 text-sm">Address:</span>
                        <div className="text-white">{lead.address || 'N/A'}</div>
                      </div>
                      
                      {/* Separator line */}
                      <div className="border-t border-gray-700 pt-3">
                        <div className="text-sm">
                          <span className="font-semibold text-gray-300">Route Status:</span>
                          <div className={`inline-block ml-2 px-2 py-1 rounded text-xs font-medium ${
                            isSelected 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {isSelected ? 'In Route' : 'Not in Route'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2">
                        {/* Add/Remove from Route Button */}
                        <Button
                          onClick={() => {
                            if (onLeadSelection) {
                              onLeadSelection(lead)
                            }
                          }}
                          className={`w-full text-sm py-2 px-3 rounded-md flex items-center justify-center gap-2 font-medium ${
                            isSelected 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                          size="sm"
                        >
                          {isSelected ? (
                            <>
                              <X className="h-4 w-4" />
                              Remove from Route
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4" />
                              Add to Route
                            </>
                          )}
                        </Button>
                        
                        {/* Visit Site Button */}
                        {lead.cold_leads?.website && (
                          <Button
                            onClick={() => window.open(lead.cold_leads?.website, '_blank', 'noopener,noreferrer')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-md flex items-center justify-center gap-2 font-medium"
                            size="sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Visit Site
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>
      
      {/* Location button */}
      <LocationButton onLocationClick={handleLocationClick} isLocating={isLocating} />
      
      {/* Error message */}
      {locationError && (
        <div className="absolute bottom-4 right-4 z-[1000] max-w-xs">
          <div className="bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
            {locationError}
            <button 
              onClick={() => setLocationError(null)}
              className="ml-2 text-red-200 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
