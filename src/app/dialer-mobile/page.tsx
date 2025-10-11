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
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MobileDateTimePicker } from '@/components/ui/mobile-datetime-picker'
import { Phone, Search, Filter, MapPin, ChevronDown, ChevronRight, Building2, Globe, MessageSquare, Save, Bookmark, Trash2, X } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePreventZoom } from '@/hooks/use-prevent-zoom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  website?: string
  address?: string
  lastDisposition?: string
}


interface SavedSearch {
  id: string
  name: string
  filters: {
    searchQuery: string
    selectedPracticeTypes: string[]
    selectedStates: string[]
    selectedCities: string[]
    selectedDispositions: string[]
  }
  createdAt: string
}

const SAVED_SEARCHES_STORAGE_KEY = "dialer_mobile_saved_searches"

export default function MobileDialerPage() {
  const [leads, setLeads] = useState<ColdLead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<ColdLead | null>(null)
  const [leadNotes, setLeadNotes] = useState<any[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [callOutcome, setCallOutcome] = useState<string>("")
  const [meetingDate, setMeetingDate] = useState<Date | undefined>()
  const [bookedWith, setBookedWith] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [newSavedSearchName, setNewSavedSearchName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const isMobile = useIsMobile()
  usePreventZoom() // Prevent iOS Safari zoom on inputs

  // Filter states
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<Set<string>>(new Set())
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set())
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set())
  const [selectedDispositions, setSelectedDispositions] = useState<Set<string>>(new Set())
  const [allPracticeTypes, setAllPracticeTypes] = useState<string[]>([])
  const [allStates, setAllStates] = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  const [isPracticeFilterOpen, setIsPracticeFilterOpen] = useState(false)
  const [isStateFilterOpen, setIsStateFilterOpen] = useState(false)
  const [isCityFilterOpen, setIsCityFilterOpen] = useState(false)
  const [isDispositionFilterOpen, setIsDispositionFilterOpen] = useState(false)

  // Fetch filter options on mount, then fetch leads
  useEffect(() => {
    fetchFilterOptions()
    loadSavedSearches()
  }, [])

  // Refetch leads when filters change
  useEffect(() => {
    fetchLeads()
  }, [searchQuery, selectedPracticeTypes, selectedStates, selectedCities, selectedDispositions])


  // Fetch notes when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      fetchLeadNotes(selectedLead.id)
    } else {
      setLeadNotes([])
    }
  }, [selectedLead])

  // Auto-update call status for any outcome
  useEffect(() => {
    if (callOutcome && selectedLead) {
      updateCallStatus(callOutcome)
      
      // Reset local state when Clear Status is selected
      if (callOutcome === "Clear Status") {
        setCallOutcome("")
        setMeetingDate(undefined)
        setBookedWith("")
      }
    }
  }, [callOutcome])

  // Fetch filter options separately (practice types, states, cities) - only needs to run once
  const fetchFilterOptions = async () => {
    try {
      // Fetch unique filter values in batches
      let allData: any[] = []
      const batchSize = 1000
      let start = 0

      while (true) {
        const { data, error } = await supabase
          .from('cold_leads')
          .select('practice_type, state, city')
          .range(start, start + batchSize - 1)

        if (error) throw error

        if (!data || data.length === 0) break
        
        allData = [...allData, ...data]
        
        if (data.length < batchSize) break
        start += batchSize
      }

      // Extract unique values from the combined dataset
      const practiceTypes = Array.from(new Set(allData.map(row => row.practice_type).filter(Boolean))).sort()
      const states = Array.from(new Set(allData.map(row => row.state).filter(Boolean))).sort()
      const cities = Array.from(new Set(allData.map(row => row.city).filter(Boolean))).sort()

      setAllPracticeTypes(practiceTypes)
      setAllStates(states)
      setAllCities(cities)

      // Initialize all filters as selected
      setSelectedPracticeTypes(new Set(practiceTypes))
      setSelectedStates(new Set(states))
      setSelectedCities(new Set(cities))
      setSelectedDispositions(new Set(['Never Called', 'Booked', 'Not Booked', 'No Connect', 'Email', 'Clear Status']))

    } catch (error) {
      console.error('Error fetching filter options:', error)
      toast.error('Failed to load filter options')
    }
  }

  const fetchLeads = async () => {
    try {
      setLoading(true)

      // Build query with server-side filters
      let query = supabase
        .from('cold_leads')
        .select('id, company_name, owner_name, phone_number, city, state, practice_type, website, address')

      // Apply search filter (server-side)
      if (searchQuery) {
        const searchTerm = searchQuery.toLowerCase()
        query = query.or(`company_name.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
      }

      // Apply practice type filter (server-side)
      if (selectedPracticeTypes.size > 0 && selectedPracticeTypes.size < allPracticeTypes.length) {
        query = query.in('practice_type', Array.from(selectedPracticeTypes))
      }

      // Apply state filter (server-side)
      if (selectedStates.size > 0 && selectedStates.size < allStates.length) {
        query = query.in('state', Array.from(selectedStates))
      }

      // Apply city filter (server-side)
      if (selectedCities.size > 0 && selectedCities.size < allCities.length) {
        query = query.in('city', Array.from(selectedCities))
      }

      // Fetch with limit to prevent overwhelming the client
      query = query.order('company_name', { ascending: true }).limit(2000)

      const { data: leadsData, error: leadsError } = await query

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
          website: lead.website || '',
          address: lead.address || '',
          lastCallDate: lastCall?.call_timestamp,
          callCount: leadCallLogs.length,
          lastDisposition: lastCall?.disposition || 'Never Called'
        }
      }).filter(Boolean) as ColdLead[]

      // Apply disposition filter (client-side, based on call logs)
      const filteredByDisposition = processedLeads.filter(lead => {
        if (selectedDispositions.size === 0 || selectedDispositions.size === 6) {
          return true // All dispositions selected
        }
        return selectedDispositions.has(lead.lastDisposition || 'Never Called')
      })

      // Sort: never called first, then by last call date (oldest first)
      filteredByDisposition.sort((a, b) => {
        if (!a.lastCallDate && !b.lastCallDate) return 0
        if (!a.lastCallDate) return -1
        if (!b.lastCallDate) return 1
        return new Date(a.lastCallDate).getTime() - new Date(b.lastCallDate).getTime()
      })

      setLeads(filteredByDisposition)

    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const handleCallClick = (lead: ColdLead) => {
    // Trigger native phone call
    window.location.href = `tel:${lead.phoneNumber}`
  }

  const updateCallStatus = async (outcome: string) => {
    if (!selectedLead) return

    try {
      // Conditional logic for Clear Status
      const updateData = outcome === "Clear Status" 
        ? { call_status: null } // Only clear call_status, leave call_date unchanged
        : { 
            call_status: outcome, 
            call_date: new Date().toISOString() 
          } // Set both call_status and call_date for other outcomes

      const { error } = await supabase
        .from('cold_leads')
        .update(updateData)
        .eq('id', selectedLead.id)

      if (error) throw error


      // Refresh lead list to show updated status
      fetchLeads()
    } catch (error) {
      console.error('Error updating call status:', error)
      toast.error('Failed to update call status')
    }
  }

  const scheduleEngagedLead = async () => {
    if (!selectedLead || !meetingDate) {
      toast.error('Please select a meeting date and time')
      return
    }

    setIsSaving(true)
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user profile for organization_id
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!userProfile) throw new Error('User profile not found')

      // Format meeting date and time
      const meetingDateOnly = meetingDate.toISOString().split('T')[0] // YYYY-MM-DD
      const meetingTimeOnly = meetingDate.toTimeString().split(' ')[0] // HH:MM:SS

      // Insert new record into engaged_leads table
      const { error } = await supabase
        .from('engaged_leads')
        .insert({
          company_name: selectedLead.company,
          owner_name: selectedLead.contactName,
          phone_number: selectedLead.phoneNumber,
          address: selectedLead.address || null,
          city: selectedLead.city || null,
          state: selectedLead.state || null,
          practice_type: selectedLead.practiceType || null,
          url: selectedLead.website || null,
          meeting_date: meetingDateOnly,
          meeting_time: meetingTimeOnly,
          date_booked: new Date().toISOString().split('T')[0],
          booked_with: bookedWith.trim() || null,
          meeting_status: 'scheduled',
          lead_source: 'Cold Call',
          user_id: user.id,
          organization_id: userProfile.organization_id
        })

      if (error) throw error

      // Show success message
      toast.success('Meeting scheduled successfully!')

      // Close the drawer
      setSelectedLead(null)
      
      // Reset form state
      setCallOutcome('')
      setMeetingDate(undefined)
      setBookedWith('')

      // Refresh lead list to show updated call count
      fetchLeads()
    } catch (error) {
      console.error('Error scheduling engaged lead:', error)
      toast.error('Failed to schedule meeting')
      // Keep drawer open if error occurs
    } finally {
      setIsSaving(false)
    }
  }


  // Fetch notes for a specific lead
  const fetchLeadNotes = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .select('id, note_text, created_at, user_id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Get user profiles for the notes
      const userIds = [...new Set(data?.map(note => note.user_id) || [])]
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds)

      // Combine notes with user profiles
      const notesWithProfiles = data?.map(note => ({
        ...note,
        user_profiles: userProfiles?.find(profile => profile.id === note.user_id)
      })) || []

      setLeadNotes(notesWithProfiles)
    } catch (error) {
      console.error('Error fetching lead notes:', error)
      setLeadNotes([])
    }
  }

  // Save a new note
  const saveNote = async () => {
    if (!selectedLead || !newNoteText.trim()) return

    try {
      setIsSavingNote(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create the note object for immediate display
      const newNote = {
        id: `temp-${Date.now()}`, // Temporary ID
        note_text: newNoteText.trim(),
        created_at: new Date().toISOString(),
        user_id: user.id,
        user_profiles: {
          full_name: user.user_metadata?.full_name || user.email || 'You'
        }
      }

      // Add note to local state immediately for instant display (at the end)
      setLeadNotes(prev => [...prev, newNote])
      
      // Clear the input immediately
      const noteText = newNoteText.trim()
      setNewNoteText('')

      // Save to database
      const { data: savedNote, error } = await supabase
        .from('lead_notes')
        .insert({
          lead_id: selectedLead.id,
          note_text: noteText,
          user_id: user.id
        })
        .select('id, note_text, created_at, user_id')
        .single()

      if (error) throw error

      // Get user profile for the saved note
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('id', savedNote.user_id)
        .single()

      // Create the complete note object
      const completeSavedNote = {
        ...savedNote,
        user_profiles: userProfile
      }

      // Replace the temporary note with the real one from database
      setLeadNotes(prev => prev.map(note => 
        note.id === newNote.id ? completeSavedNote : note
      ))
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('Failed to save note')
      
      // Remove the temporary note if save failed
      setLeadNotes(prev => prev.filter(note => !note.id.startsWith('temp-')))
      
      // Restore the input text
      setNewNoteText(newNoteText.trim())
    } finally {
      setIsSavingNote(false)
    }
  }

  // Save search functionality
  const loadSavedSearches = () => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as SavedSearch[]
      setSavedSearches(parsed)
    } catch (err) {
      console.error("Failed to load saved searches", err)
    }
  }

  const persistSavedSearches = (searches: SavedSearch[]) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(searches))
    } catch (err) {
      console.error("Failed to persist saved searches", err)
    }
  }

  const saveCurrentSearch = () => {
    const trimmed = newSavedSearchName.trim()
    if (!trimmed) {
      setSaveError("Name is required")
      return
    }

    const now = new Date().toISOString()
    const newSavedSearch: SavedSearch = {
      id: `${now}-${Math.random().toString(36).slice(2)}`,
      name: trimmed,
      filters: {
        searchQuery,
        selectedPracticeTypes: Array.from(selectedPracticeTypes),
        selectedStates: Array.from(selectedStates),
        selectedCities: Array.from(selectedCities),
        selectedDispositions: Array.from(selectedDispositions)
      },
      createdAt: now,
    }

    const updated = [...savedSearches, newSavedSearch]
    setSavedSearches(updated)
    persistSavedSearches(updated)
    setIsSaveDialogOpen(false)
    setNewSavedSearchName('')
    setSaveError(null)
    toast.success('Search saved successfully')
  }

  const applySavedSearch = (search: SavedSearch) => {
    setSearchQuery(search.filters.searchQuery)
    setSelectedPracticeTypes(new Set(search.filters.selectedPracticeTypes))
    setSelectedStates(new Set(search.filters.selectedStates))
    setSelectedCities(new Set(search.filters.selectedCities))
    setSelectedDispositions(new Set(search.filters.selectedDispositions || ['Never Called', 'Booked', 'Not Booked', 'No Connect', 'Email', 'Clear Status']))
  }

  const deleteSavedSearch = (searchId: string) => {
    const updated = savedSearches.filter(search => search.id !== searchId)
    setSavedSearches(updated)
    persistSavedSearches(updated)
    toast.success('Search deleted')
  }

  // Helper function to count active filters
  const getActiveFilterCount = () => {
    let count = 0
    if (searchQuery) count++
    if (selectedPracticeTypes.size > 0 && selectedPracticeTypes.size < allPracticeTypes.length) count++
    if (selectedStates.size > 0 && selectedStates.size < allStates.length) count++
    if (selectedCities.size > 0 && selectedCities.size < allCities.length) count++
    if (selectedDispositions.size > 0 && selectedDispositions.size < 6) count++
    return count
  }

  // Helper function to check if any filters are active
  const hasActiveFilters = () => {
    return getActiveFilterCount() > 0
  }

  // Apply filters and close drawer
  const applyFilters = () => {
    setIsFilterOpen(false)
    // Filters are already applied via useEffect, just close the drawer
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedPracticeTypes(new Set(allPracticeTypes))
    setSelectedStates(new Set(allStates))
    setSelectedCities(new Set(allCities))
    setSelectedDispositions(new Set(['Never Called', 'Booked', 'Not Booked', 'No Connect', 'Email', 'Clear Status']))
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'N/A') return phone
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  // Leads are now filtered server-side, so we use them directly
  const filteredLeads = leads

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

  const handleDispositionChange = (disposition: string, checked: boolean) => {
    setSelectedDispositions(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(disposition)
      } else {
        newSet.delete(disposition)
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-11 w-11 p-0"
                title="Filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          </Sheet>
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
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      {/* Business Name - Top */}
                      <h3 className="font-semibold text-base text-card-foreground truncate pt-1">
                        {lead.company}
                      </h3>
                      
                      {/* Contact Name - Below business name */}
                      <p className="text-sm truncate mt-1" style={{ color: '#999999' }}>
                        {lead.contactName}
                      </p>
                      
                      {/* Location and Specialty - Bottom */}
                      <div className="flex items-center mt-3">
                        <span className="text-sm" style={{ color: '#888888' }}>
                          {lead.city && lead.state && (
                            <>
                              <MapPin className="inline h-3 w-3 mr-1" />
                              {lead.city}, {lead.state}
                              {lead.practiceType && ' • '}
                            </>
                          )}
                          {lead.practiceType}
                        </span>
                      </div>
                    </div>
                    
                    {/* Right side: Call Now button and status */}
                    <div className="flex flex-col items-end gap-2">
                      {/* Call Now Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCallClick(lead)
                        }}
                        className="h-10 px-4 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium flex-shrink-0"
                      >
                        Call Now
                      </Button>
                      
                      {/* Call Status - Below Call Now button */}
                      {lead.lastDisposition && (
                        <Badge 
                          variant="outline"
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-600 border-gray-300"
                        >
                          {lead.lastDisposition}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Filters Sheet */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col [&>button]:hidden">
            <div className="flex-shrink-0 px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-semibold">Filters</SheetTitle>
                <div className="flex items-center gap-2">
                  {/* Save and Saved Buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => setIsSaveDialogOpen(true)}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => {
                        // Toggle saved searches visibility
                      }}
                    >
                      <Bookmark className="h-3 w-3 mr-1" />
                      Saved ({savedSearches.length})
                    </Button>
                  </div>
                  
                  {/* Close Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Saved Searches List */}
              {savedSearches.length > 0 && (
                <div className="mt-3 space-y-1">
                  {savedSearches.map((search) => (
                    <div key={search.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <button
                        onClick={() => {
                          applySavedSearch(search)
                          setIsFilterOpen(false)
                        }}
                        className="flex-1 text-left text-sm text-foreground hover:text-primary"
                      >
                        {search.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSavedSearch(search.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 pb-24 space-y-4">
              
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
                  <div className="space-y-4">
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-background z-10 py-2 border-b border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-base text-muted-foreground font-medium">
                          {selectedPracticeTypes.size} of {allPracticeTypes.length} selected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPracticeTypes(new Set())}
                          className="h-10 px-4 text-sm font-medium"
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {allPracticeTypes.map((practiceType) => (
                          <div 
                            key={practiceType} 
                            className={cn(
                              "flex items-center px-3 py-3 rounded-lg transition-colors cursor-pointer",
                              "hover:bg-muted/50 active:bg-muted",
                              selectedPracticeTypes.has(practiceType) && "bg-primary/10"
                            )}
                            onClick={() => handlePracticeTypeChange(practiceType, !selectedPracticeTypes.has(practiceType))}
                          >
                            <Checkbox
                              id={`practice-${practiceType}`}
                              checked={selectedPracticeTypes.has(practiceType)}
                              className="h-5 w-5 mr-4 pointer-events-none"
                            />
                            <span 
                              className={cn(
                                "text-base font-normal cursor-pointer flex-1 leading-6",
                                selectedPracticeTypes.has(practiceType) 
                                  ? "text-foreground font-medium" 
                                  : "text-card-foreground"
                              )}
                            >
                              {practiceType}
                            </span>
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
                  <div className="space-y-4">
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-background z-10 py-2 border-b border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-base text-muted-foreground font-medium">
                          {selectedStates.size} of {allStates.length} selected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStates(new Set())}
                          className="h-10 px-4 text-sm font-medium"
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {allStates.map((state) => (
                          <div 
                            key={state} 
                            className={cn(
                              "flex items-center px-3 py-3 rounded-lg transition-colors cursor-pointer",
                              "hover:bg-muted/50 active:bg-muted",
                              selectedStates.has(state) && "bg-primary/10"
                            )}
                            onClick={() => handleStateChange(state, !selectedStates.has(state))}
                          >
                            <Checkbox
                              id={`state-${state}`}
                              checked={selectedStates.has(state)}
                              className="h-5 w-5 mr-4 pointer-events-none"
                            />
                            <span 
                              className={cn(
                                "text-base font-normal cursor-pointer flex-1 leading-6",
                                selectedStates.has(state) 
                                  ? "text-foreground font-medium" 
                                  : "text-card-foreground"
                              )}
                            >
                              {state}
                            </span>
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
                  <div className="space-y-4">
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-background z-10 py-2 border-b border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-base text-muted-foreground font-medium">
                          {selectedCities.size} of {allCities.length} selected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCities(new Set())}
                          className="h-10 px-4 text-sm font-medium"
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {allCities.map((city) => (
                          <div 
                            key={city} 
                            className={cn(
                              "flex items-center px-3 py-3 rounded-lg transition-colors cursor-pointer",
                              "hover:bg-muted/50 active:bg-muted",
                              selectedCities.has(city) && "bg-primary/10"
                            )}
                            onClick={() => handleCityChange(city, !selectedCities.has(city))}
                          >
                            <Checkbox
                              id={`city-${city}`}
                              checked={selectedCities.has(city)}
                              className="h-5 w-5 mr-4 pointer-events-none"
                            />
                            <span 
                              className={cn(
                                "text-base font-normal cursor-pointer flex-1 leading-6",
                                selectedCities.has(city) 
                                  ? "text-foreground font-medium" 
                                  : "text-card-foreground"
                              )}
                            >
                              {city}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Call Disposition Filter */}
              <Collapsible open={isDispositionFilterOpen} onOpenChange={setIsDispositionFilterOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto hover:bg-muted/50 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-card-foreground">
                        Call Disposition
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        ({selectedDispositions.size} selected)
                      </span>
                    </div>
                    {isDispositionFilterOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-2 pb-2">
                  <div className="space-y-4">
                    {/* Sticky Header */}
                    <div className="sticky top-0 bg-background z-10 py-2 border-b border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-base text-muted-foreground font-medium">
                          {selectedDispositions.size} of 6 selected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDispositions(new Set())}
                          className="h-10 px-4 text-sm font-medium"
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {['Never Called', 'Booked', 'Not Booked', 'No Connect', 'Email', 'Clear Status'].map((disposition) => (
                        <div 
                          key={disposition} 
                          className={cn(
                            "flex items-center px-3 py-3 rounded-lg transition-colors cursor-pointer",
                            "hover:bg-muted/50 active:bg-muted",
                            selectedDispositions.has(disposition) && "bg-primary/10"
                          )}
                          onClick={() => handleDispositionChange(disposition, !selectedDispositions.has(disposition))}
                        >
                          <Checkbox
                            id={`disposition-${disposition}`}
                            checked={selectedDispositions.has(disposition)}
                            className="h-5 w-5 mr-4 pointer-events-none"
                          />
                          <span 
                            className={cn(
                              "text-base font-normal cursor-pointer flex-1 leading-6",
                              selectedDispositions.has(disposition) 
                                ? "text-foreground font-medium" 
                                : "text-card-foreground"
                            )}
                          >
                            {disposition}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

            </div>

            {/* Sticky Footer with Action Buttons */}
            <div className="flex-shrink-0 border-t border-border bg-background p-4">
              <div className="flex gap-3">
                {hasActiveFilters() ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 h-12"
                      onClick={clearAllFilters}
                    >
                      Clear All
                    </Button>
                    <Button
                      className="flex-1 h-12"
                      onClick={applyFilters}
                    >
                      Apply ({getActiveFilterCount()} Filter{getActiveFilterCount() !== 1 ? 's' : ''})
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full h-12"
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>


      {/* Lead Details Drawer */}
      <Drawer 
        open={!!selectedLead} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLead(null)
          }
        }}
        dismissible={true}
        closeThreshold={0.15}
        shouldScaleBackground={false}
      >
        <DrawerContent className={cn(
          "bg-background overflow-hidden",
          "!h-screen !max-h-none !rounded-none border-0 flex flex-col"
        )}>
          <DrawerTitle className="sr-only">Practice Details</DrawerTitle>
          {selectedLead && (
            <div className="flex flex-col h-full">
              {/* Tap to Close Area */}
              <div 
                className="flex justify-center py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setSelectedLead(null)}
              >
                <span className="text-sm text-muted-foreground">Tap to Close</span>
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <h2 className="text-lg font-semibold text-card-foreground">Practice Details</h2>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCallClick(selectedLead)
                    setSelectedLead(null) // Close drawer after initiating call
                  }}
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </Button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-card-foreground mb-2 text-xl">
                      {selectedLead.company}
                    </h3>
                    <p className="text-base text-muted-foreground mb-4">{selectedLead.contactName}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-base">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <a 
                          href={`tel:${selectedLead.phoneNumber}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {formatPhoneNumber(selectedLead.phoneNumber)}
                        </a>
                      </div>
                      
                      {(selectedLead.city || selectedLead.state) && (
                        <div className="flex items-center gap-2 text-base">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {[selectedLead.city, selectedLead.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      
                      {selectedLead.address && (
                        <div className="flex items-start gap-2 text-base">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">
                            {selectedLead.address}
                          </span>
                        </div>
                      )}
                      
                      {selectedLead.practiceType && (
                        <div className="flex items-center gap-2 text-base">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <span className="text-muted-foreground">{selectedLead.practiceType}</span>
                        </div>
                      )}
                      
                      {selectedLead.callCount !== undefined && selectedLead.callCount > 0 && (
                        <div className="flex items-center gap-2 text-base">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {selectedLead.callCount} previous call{selectedLead.callCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      
                      {selectedLead.website && (
                        <div className="pt-4">
                          <Button
                            variant="outline"
                            size="default"
                            className="w-full h-12"
                            onClick={() => {
                              const website = selectedLead.website!.startsWith('http') 
                                ? selectedLead.website 
                                : `https://${selectedLead.website}`
                              window.open(website, '_blank')
                            }}
                          >
                            <Globe className="h-5 w-5 mr-2" />
                            Visit Website
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Call Outcome Dropdown */}
                  <div className="pt-2">
                    <Select value={callOutcome} onValueChange={setCallOutcome}>
                      <SelectTrigger className="w-full h-12">
                        <SelectValue placeholder="Select call outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Booked">Booked</SelectItem>
                        <SelectItem value="Not Booked">Not Booked</SelectItem>
                        <SelectItem value="No Connect">No Connect</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Clear Status">Clear Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Booking Fields - Only show when "Booked" is selected */}
                  {callOutcome === "Booked" && (
                    <div className="pt-4 space-y-4">
                      {/* Meeting Date & Time */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-card-foreground">Meeting Date & Time</label>
                        <MobileDateTimePicker 
                          date={meetingDate} 
                          setDate={setMeetingDate} 
                          label="Select meeting date and time"
                          placeholder="Select meeting date and time..."
                        />
                      </div>
                      
                      {/* Booked With */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-card-foreground">Booked With</label>
                        <Input
                          type="text"
                          placeholder="Enter name of person booked with"
                          value={bookedWith}
                          onChange={(e) => setBookedWith(e.target.value)}
                          className="h-12"
                        />
                      </div>

                      {/* Schedule Meeting Button */}
                      <div className="pt-2">
                        <Button
                          onClick={scheduleEngagedLead}
                          disabled={!meetingDate || isSaving}
                          className={cn(
                            "w-full h-12 text-white font-semibold transition-all duration-200",
                            (!meetingDate || isSaving)
                              ? "bg-gray-600 opacity-50 cursor-not-allowed" 
                              : "bg-gray-800 hover:bg-gray-700 cursor-pointer rainbow-border"
                          )}
                        >
                          {isSaving ? "Scheduling..." : "Schedule Meeting"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  <div className="pt-6 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      <h4 className="text-base font-semibold text-card-foreground">Notes</h4>
                    </div>
                    
                    {/* Notes List with Scroll Area */}
                    <div className="h-48 border border-border rounded-lg bg-muted/30">
                      <ScrollArea className="h-full">
                        <div className="p-3 space-y-3">
                          {leadNotes.length > 0 ? (
                            leadNotes.map((note) => {
                              const initials = note.user_profiles?.full_name
                                ?.split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .toUpperCase() || 'U'
                              
                              const timeAgo = new Date(note.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                              })
                              
                              return (
                                <div key={note.id} className="flex items-start space-x-2">
                                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-primary">{initials}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline space-x-2 mb-1">
                                      <span className="text-xs font-semibold text-foreground">
                                        {note.user_profiles?.full_name || 'Unknown User'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{timeAgo}</span>
                                    </div>
                                    <div className="bg-background rounded-md p-2 border border-border">
                                      <p className="text-sm text-foreground">{note.note_text}</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No notes yet. Add the first note below!
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Add Note Input */}
                    <div className="mt-3 flex items-end space-x-2">
                      <input
                        type="text"
                        placeholder="Add a note..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newNoteText.trim() && !isSavingNote) {
                            saveNote()
                          }
                        }}
                        disabled={isSavingNote}
                        className="flex-1 h-10 px-3 py-2 text-base bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                      />
                      <button 
                        onClick={saveNote}
                        disabled={!newNoteText.trim() || isSavingNote}
                        className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isSavingNote ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Save Search Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Save Search</DialogTitle>
          <DialogDescription>
            Save your current search filters for future use.
          </DialogDescription>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="search-name" className="text-sm font-medium">
                Search Name
              </label>
              <Input
                id="search-name"
                placeholder="e.g. Dallas Orthodontics"
                value={newSavedSearchName}
                onChange={(e) => {
                  setNewSavedSearchName(e.target.value)
                  if (saveError) setSaveError(null)
                }}
                className="h-11"
              />
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Filters:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Search: {searchQuery || 'None'}</div>
                <div>Practice Types: {selectedPracticeTypes.size} selected</div>
                <div>States: {selectedStates.size} selected</div>
                <div>Cities: {selectedCities.size} selected</div>
                <div>Dispositions: {selectedDispositions.size} selected</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsSaveDialogOpen(false)}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveCurrentSearch}
                className="flex-1 h-11"
              >
                Save Search
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

