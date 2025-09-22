"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Phone, Building2, MapPin, Clock, User, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { JustCallDialer } from "@justcall/justcall-dialer-sdk"

interface Caller {
  id: string
  name: string
  practice: string
  phone: string
  lastCall: string
  status: string
}

// Sample practice information
const practiceInfo = {
  "Dr. Sarah Johnson": {
    practiceName: "Johnson Dental Care",
    address: "123 Main Street, Suite 100",
    city: "New York, NY 10001",
    phone: "(555) 123-4567",
    email: "info@johnsondental.com",
    website: "www.johnsondental.com",
    practiceType: "General Dentistry",
    established: "2015",
    staff: "8 employees",
    services: ["General Dentistry", "Cosmetic", "Orthodontics"],
    lastVisit: "Never",
    notes: "New practice, interested in digital marketing solutions"
  },
  "Dr. Michael Chen": {
    practiceName: "Chen Orthodontics",
    address: "456 Oak Avenue, Floor 2",
    city: "Los Angeles, CA 90210",
    phone: "(555) 234-5678",
    email: "contact@chenortho.com",
    website: "www.chenortho.com",
    practiceType: "Orthodontics",
    established: "2010",
    staff: "12 employees",
    services: ["Orthodontics", "Invisalign", "Braces"],
    lastVisit: "6 months ago",
    notes: "Previous client, looking to expand services"
  },
  "Dr. Emily Rodriguez": {
    practiceName: "Rodriguez Family Dentistry",
    address: "789 Pine Street",
    city: "Chicago, IL 60601",
    phone: "(555) 345-6789",
    email: "hello@rodriguezdental.com",
    website: "www.rodriguezdental.com",
    practiceType: "Family Dentistry",
    established: "2008",
    staff: "15 employees",
    services: ["Family Dentistry", "Pediatric", "Emergency"],
    lastVisit: "3 months ago",
    notes: "Meeting scheduled for next week"
  },
  "Dr. James Wilson": {
    practiceName: "Wilson Dental Group",
    address: "321 Elm Street, Building A",
    city: "Houston, TX 77001",
    phone: "(555) 456-7890",
    email: "info@wilsondental.com",
    website: "www.wilsondental.com",
    practiceType: "Multi-Specialty",
    established: "2005",
    staff: "25 employees",
    services: ["General", "Oral Surgery", "Periodontics", "Endodontics"],
    lastVisit: "1 year ago",
    notes: "Large practice, potential for multiple services"
  },
  "Dr. Lisa Thompson": {
    practiceName: "Thompson Smiles",
    address: "654 Maple Drive",
    city: "Phoenix, AZ 85001",
    phone: "(555) 567-8901",
    email: "smile@thompsonsmiles.com",
    website: "www.thompsonsmiles.com",
    practiceType: "Cosmetic Dentistry",
    established: "2012",
    staff: "6 employees",
    services: ["Cosmetic", "Teeth Whitening", "Veneers"],
    lastVisit: "2 months ago",
    notes: "Interested in new patient acquisition strategies"
  }
}

export default function DialerPage() {
  const [callers, setCallers] = useState<Caller[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCaller, setSelectedCaller] = useState<Caller | null>(null)
  const dialerRef = useRef<JustCallDialer | null>(null)

  useEffect(() => {
    fetchCallers()
    initializeDialer()
    
    return () => {
      if (dialerRef.current) {
        dialerRef.current = null
      }
    }
  }, [])

  const initializeDialer = () => {
    // Client-side only initialization
    if (typeof window === 'undefined') return
    
    try {
      dialerRef.current = new JustCallDialer({
        dialerId: "justcall-dialer",
        onLogin: (data) => {
          console.log("User logged in:", data)
        },
        onLogout: () => {
          console.log("User logged out")
        },
        onReady: () => {
          console.log("Dialer is ready")
        },
      })
    } catch (error) {
      console.error("Error initializing JustCall dialer:", error)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Convert (XXX) XXX-XXXX format to +1XXXXXXXXXX
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    }
    return phone
  }

  const populateDialer = async (phoneNumber: string) => {
    if (dialerRef.current && phoneNumber) {
      try {
        await dialerRef.current.ready()
        const formattedPhone = formatPhoneNumber(phoneNumber)
        dialerRef.current.dialNumber(formattedPhone)
      } catch (error) {
        console.error("Error populating dialer:", error)
      }
    }
  }

  const fetchCallers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from('leads')
        .select('id, owner_name, company_name, phone_number, meeting_status, date_booked')
        .order('date_booked', { ascending: false })
        .limit(100)

      if (supabaseError) {
        throw supabaseError
      }

      if (data) {
        const transformedCallers: Caller[] = data.map((row) => ({
          id: row.id,
          name: row.owner_name || '',
          practice: row.company_name || '',
          phone: row.phone_number || '',
          lastCall: row.date_booked ? new Date(row.date_booked).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }) : '—',
          status: row.meeting_status || 'Not Called'
        }))

        setCallers(transformedCallers)
        if (transformedCallers.length > 0) {
          setSelectedCaller(transformedCallers[0])
        }
      }
    } catch (err) {
      console.error('Error fetching callers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch callers')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-lg font-semibold mb-2 text-card-foreground">Dialer</h1>
          <p className="text-muted-foreground text-xs">Make outbound calls to your leads</p>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Card - Callers List */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-card-foreground">Callers</CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-full">
                {loading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading callers...
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-red-500">
                    {error}
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(80vh-160px)]">
                    <div className="space-y-1">
                      {callers.map((caller) => (
                        <div
                          key={caller.id}
                          onClick={() => {
                            setSelectedCaller(caller)
                            populateDialer(caller.phone)
                          }}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                            selectedCaller?.id === caller.id ? 'bg-muted/30' : ''
                          }`}
                        >
                          <h4 className="font-medium text-card-foreground mb-1">{caller.name}</h4>
                          <p className="text-sm text-muted-foreground">{caller.practice}</p>
                          <p className="text-xs text-muted-foreground mt-1">{caller.phone}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              caller.status === 'Scheduled' ? 'bg-green-100 text-green-800' :
                              caller.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                              caller.status === 'Ran' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {caller.status}
                            </span>
                            <span className="text-xs text-muted-foreground">Last call: {caller.lastCall}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Card - JustCall Dialer */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardContent className="p-0 h-full flex items-center justify-center">
                <div id="justcall-dialer" className="h-full w-full flex items-center justify-center max-w-full"></div>
              </CardContent>
            </Card>
          </div>

          {/* Right Card - Contact Details */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-card-foreground">Contact Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCaller ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-card-foreground mb-2 text-lg">
                        {selectedCaller.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">{selectedCaller.practice}</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-card-foreground font-medium">{selectedCaller.phone}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Last call: {selectedCaller.lastCall}</span>
                        </div>
                        
                        <div className="pt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedCaller.status === 'Scheduled' ? 'bg-green-100 text-green-800' :
                            selectedCaller.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            selectedCaller.status === 'Ran' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedCaller.status}
                          </span>
                        </div>
                        
                        <div className="pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-white border-white hover:bg-white hover:text-black"
                            onClick={() => {
                              // You can customize this URL based on your needs
                              const website = `https://${selectedCaller.practice.toLowerCase().replace(/\s+/g, '')}.com`
                              window.open(website, '_blank')
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit Site
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a contact to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
