"use client"

import dynamic from 'next/dynamic'
import { Loader2 } from "lucide-react"
import ErrorBoundary from '@/components/ui/error-boundary'

// Dynamically import the entire map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/crm/leads-map'), { 
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-lg">Loading map...</span>
      </div>
    </div>
  )
})

export default function MapPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border p-6">
        <h1 className="text-3xl font-bold">Map View</h1>
        <p className="text-muted-foreground mt-2">
          Interactive map showing all leads with geocoded locations.
        </p>
      </div>
      
      {/* Map Component wrapped in Error Boundary */}
      <div className="flex-1">
        <ErrorBoundary>
          <MapComponent />
        </ErrorBoundary>
      </div>
    </div>
  )
}