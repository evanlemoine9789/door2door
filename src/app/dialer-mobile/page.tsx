"use client"

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Phone, Search, Filter, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'

interface ColdLead {
  id: string
  company: string
  contactName: string
  phoneNumber: string
  city: string
  state: string
  practiceType: string
  lastCallDate?: string
  callCount?: number
}

interface PendingCall {
  leadId: string
  phoneNumber: string
  company: string
  contactName: string
  timestamp: string
}

export default function MobileDialerPage() {
  const [leads, setLeads] = useState<ColdLead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [showDispositionModal, setShowDispositionModal] = useState(false)
  const [currentCallData, setCurrentCallData] = useState<PendingCall | null>(null)
  const [selectedDisposition, setSelectedDisposition] = useState<string>('')
  const [notes, setNotes] = useState('')
  const isMobile = useIsMobile()

  // Filter states
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<Set<string>>(new Set())
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set())
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set())
  const [allPracticeTypes, setAllPracticeTypes] = useState<string[]>([])
  const [allStates, setAllStates] = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [isPracticeFilterOpen, setIsPracticeFilterOpen] = useState(false)
  const [isStateFilterOpen, setIsStateFilterOpen] = useState(false)
  const [isCityFilterOpen, setIsCityFilterOpen] = useState(false)

  // Fetch leads on mount
  useEffect(() => {
    fetchLeads()
  }, [])

  // Check for pending call on mount and visibility change
  useEffect(() => {
    const checkPendingCall = () => {
      if (document.visibilityState === 'visible') {
        const pendingCall = localStorage.getItem('pendingCall')
        if (pendingCall) {
          const callData = JSON.parse(pendingCall) as PendingCall
          setCurrentCallData(callData)
          setShowDispositionModal(true)
        }
      }
    }

    // Check on mount
    checkPendingCall()

    // Listen for visibility changes
    document.addEventListener('visibilitychange', checkPendingCall)
    return () => document.removeEventListener('visibilitychange', checkPendingCall)
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)

      // Fetch cold leads with call counts
      const { data: leadsData, error: leadsError } = await supabase
        .from('cold_leads')
        .select('id, company_name, owner_name, phone_number, city, state, practice_type')
        .order('company_name', { ascending: true })

      if (leadsError) throw leadsError

      // Fetch call logs to get call counts and last call dates
      const { data: callLogs, error: callLogsError } = await supabase
        .from('mobile_call_logs')
        .select('cold_lead_id, call_timestamp, disposition')
        .order('call_timestamp', { ascending: false })

      if (callLogsError) throw callLogsError

      // Process leads with call data
      const processedLeads = (leadsData || []).map((lead) => {
        const leadCallLogs = (callLogs || []).filter(log => log.cold_lead_id === lead.id)
        const lastCall = leadCallLogs[0]
        const doNotCallLogs = leadCallLogs.filter(log => log.disposition === 'Do Not Call')

        // Skip leads with "Do Not Call" disposition
        if (doNotCallLogs.length > 0) {
          return null
        }

        return {
          id: lead.id,
          company: lead.company_name || 'Unknown Company',
          contactName: lead.owner_name || 'Unknown Owner',
          phoneNumber: lead.phone_number || '',
          city: lead.city || '',
          state: lead.state || '',
          practiceType: lead.practice_type || '',
          lastCallDate: lastCall?.call_timestamp,
          callCount: leadCallLogs.length
        }
      }).filter(Boolean) as ColdLead[]

      // Sort: never called first, then by last call date (oldest first)
      processedLeads.sort((a, b) => {
        if (!a.lastCallDate && !b.lastCallDate) return 0
        if (!a.lastCallDate) return -1
        if (!b.lastCallDate) return 1
        return new Date(a.lastCallDate).getTime() - new Date(b.lastCallDate).getTime()
      })

      setLeads(processedLeads)

      // Extract unique values for filters
      const practiceTypes = Array.from(new Set(processedLeads.map(l => l.practiceType).filter(Boolean))).sort()
      const states = Array.from(new Set(processedLeads.map(l => l.state).filter(Boolean))).sort()
      const cities = Array.from(new Set(processedLeads.map(l => l.city).filter(Boolean))).sort()

      setAllPracticeTypes(practiceTypes)
      setAllStates(states)
      setAllCities(cities)

      // Initialize all filters as selected
      setSelectedPracticeTypes(new Set(practiceTypes))
      setSelectedStates(new Set(states))
      setSelectedCities(new Set(cities))

    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const handleCallClick = (lead: ColdLead) => {
    // Store pending call in localStorage
    const pendingCall: PendingCall = {
      leadId: lead.id,
      phoneNumber: lead.phoneNumber,
      company: lead.company,
      contactName: lead.contactName,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('pendingCall', JSON.stringify(pendingCall))

    // Trigger native phone call
    window.location.href = `tel:${lead.phoneNumber}`
  }

  const handleDispositionSelect = (disposition: string) => {
    setSelectedDisposition(disposition)
  }

  const saveCallLog = async () => {
    if (!currentCallData || !selectedDisposition) {
      toast.error('Please select a disposition')
      return
    }

    try {
      const { error } = await supabase
        .from('mobile_call_logs')
        .insert({
          cold_lead_id: currentCallData.leadId,
          phone_number: currentCallData.phoneNumber,
          disposition: selectedDisposition,
          notes: notes.trim() || null
        })

      if (error) throw error

      // Clear pending call
      localStorage.removeItem('pendingCall')

      // Close modal
      setShowDispositionModal(false)
      setCurrentCallData(null)
      setSelectedDisposition('')
      setNotes('')

      // Show success
      toast.success('Call logged successfully')

      // Refresh lead list
      fetchLeads()
    } catch (error) {
      console.error('Error saving call log:', error)
      toast.error('Failed to log call')
    }
  }

  const handleCancel = () => {
    if (confirm('Cancel without logging this call?')) {
      localStorage.removeItem('pendingCall')
      setShowDispositionModal(false)
      setCurrentCallData(null)
      setSelectedDisposition('')
      setNotes('')
    }
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'N/A') return phone
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          lead.company.toLowerCase().includes(query) ||
          lead.contactName.toLowerCase().includes(query) ||
          lead.phoneNumber.includes(query) ||
          lead.city.toLowerCase().includes(query) ||
          lead.state.toLowerCase().includes(query)
        
        if (!matchesSearch) return false
      }

      // Practice type filter
      if (selectedPracticeTypes.size > 0 && !selectedPracticeTypes.has(lead.practiceType)) {
        return false
      }

      // State filter
      if (selectedStates.size > 0 && !selectedStates.has(lead.state)) {
        return false
      }

      // City filter
      if (selectedCities.size > 0 && !selectedCities.has(lead.city)) {
        return false
      }

      return true
    })
  }, [leads, searchQuery, selectedPracticeTypes, selectedStates, selectedCities])

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

  // Redirect non-mobile users
  if (!isMobile) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Mobile Only</h1>
          <p className="text-muted-foreground">This dialer is optimized for mobile devices. Please use the desktop dialer on larger screens.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pb-16">
      {/* Search Bar - Fixed at top */}
      <div className="flex-shrink-0 p-4 bg-background border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {filteredLeads.length} of {leads.length} leads
        </div>
      </div>

      {/* Lead List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading leads...</p>
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No leads found</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="border-0 shadow-none bg-card hover:bg-accent/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-card-foreground truncate">
                        {lead.company}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.contactName}
                      </p>
                      <p className="text-sm font-mono text-foreground mt-1">
                        {formatPhoneNumber(lead.phoneNumber)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {lead.practiceType}
                        </Badge>
                        {lead.city && lead.state && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{lead.city}, {lead.state}</span>
                          </div>
                        )}
                        {lead.callCount !== undefined && lead.callCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {lead.callCount} call{lead.callCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCallClick(lead)}
                      className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                    >
                      <Phone className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Filter Button - Fixed at bottom right */}
      <div className="absolute bottom-20 right-4 z-[1000]">
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button
              className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              title="Filters"
            >
              <Filter className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] flex flex-col">
            <SheetTitle className="text-lg font-semibold flex-shrink-0">Filters</SheetTitle>
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
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {selectedPracticeTypes.size} of {allPracticeTypes.length} selected
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
                      <div className="space-y-2">
                        {allPracticeTypes.map((practiceType) => (
                          <div key={practiceType} className="flex items-center space-x-2">
                            <Checkbox
                              id={`practice-${practiceType}`}
                              checked={selectedPracticeTypes.has(practiceType)}
                              onCheckedChange={(checked) => 
                                handlePracticeTypeChange(practiceType, checked as boolean)
                              }
                            />
                            <label 
                              htmlFor={`practice-${practiceType}`}
                              className="text-sm text-card-foreground cursor-pointer"
                            >
                              {practiceType}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
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
                      <div className="space-y-2">
                        {allStates.map((state) => (
                          <div key={state} className="flex items-center space-x-2">
                            <Checkbox
                              id={`state-${state}`}
                              checked={selectedStates.has(state)}
                              onCheckedChange={(checked) => 
                                handleStateChange(state, checked as boolean)
                              }
                            />
                            <label 
                              htmlFor={`state-${state}`}
                              className="text-sm text-card-foreground cursor-pointer"
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
                      <div className="space-y-2">
                        {allCities.map((city) => (
                          <div key={city} className="flex items-center space-x-2">
                            <Checkbox
                              id={`city-${city}`}
                              checked={selectedCities.has(city)}
                              onCheckedChange={(checked) => 
                                handleCityChange(city, checked as boolean)
                              }
                            />
                            <label 
                              htmlFor={`city-${city}`}
                              className="text-sm text-card-foreground cursor-pointer"
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

            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Disposition Modal */}
      <Dialog open={showDispositionModal} onOpenChange={setShowDispositionModal}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Log Call</DialogTitle>
          <DialogDescription className="sr-only">
            Select a call disposition and add notes
          </DialogDescription>
          
          <div className="space-y-4">
            <div>
              <p className="font-semibold">{currentCallData?.company}</p>
              <p className="text-sm text-muted-foreground">{currentCallData?.contactName}</p>
              <p className="text-sm text-muted-foreground">
                {formatPhoneNumber(currentCallData?.phoneNumber || '')}
              </p>
            </div>
            
            {/* Disposition Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Call Outcome</label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleDispositionSelect('Booked')} 
                  variant={selectedDisposition === 'Booked' ? 'default' : 'outline'}
                  className="h-11"
                >
                  Booked
                </Button>
                <Button 
                  onClick={() => handleDispositionSelect('Not Booked')} 
                  variant={selectedDisposition === 'Not Booked' ? 'default' : 'outline'}
                  className="h-11"
                >
                  Not Booked
                </Button>
                <Button 
                  onClick={() => handleDispositionSelect('No Connect')} 
                  variant={selectedDisposition === 'No Connect' ? 'default' : 'outline'}
                  className="h-11"
                >
                  No Connect
                </Button>
                <Button 
                  onClick={() => handleDispositionSelect('Email')} 
                  variant={selectedDisposition === 'Email' ? 'default' : 'outline'}
                  className="h-11"
                >
                  Email
                </Button>
                <Button 
                  onClick={() => handleDispositionSelect('Do Not Call')} 
                  variant={selectedDisposition === 'Do Not Call' ? 'default' : 'outline'}
                  className="h-11"
                >
                  Do Not Call
                </Button>
                <Button 
                  onClick={() => handleDispositionSelect('Clear Status')} 
                  variant={selectedDisposition === 'Clear Status' ? 'default' : 'outline'}
                  className="h-11"
                >
                  Clear Status
                </Button>
              </div>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                placeholder="Add notes about this call..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={saveCallLog} 
                className="flex-1 h-11"
                disabled={!selectedDisposition}
              >
                Save Call Log
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="outline"
                className="h-11"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

