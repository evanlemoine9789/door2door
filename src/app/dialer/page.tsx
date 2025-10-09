"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Phone, Building2, MapPin, Clock, User, ExternalLink, Search, ChevronDown, X, Save, Bookmark, Trash2, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { JustCallDialer } from "@justcall/justcall-dialer-sdk"
import { toast } from 'sonner'
import { sendLeadToWebhook, testWebhookAPI } from "@/lib/webhook-api"

interface Caller {
  id: string
  name: string
  practice: string
  phone: string
  lastCall: string
  status: string
  city?: string
  state?: string
  practiceType?: string
  callDate?: string
  callStatus?: string
  address?: string
  website?: string
}

interface FilterState {
  searchQuery: string
  selectedStates: string[]
  selectedCities: string[]
  selectedPracticeTypes: string[]
  selectedDispositions: string[]
  sortField: 'name' | 'practice' | 'city' | 'state' | 'practiceType' | 'callDate'
  sortDir: 'asc' | 'desc' | undefined
}

interface SavedSearch {
  id: string
  name: string
  filters: FilterState
  createdAt: string
}

const SAVED_SEARCHES_STORAGE_KEY = "dialer_saved_searches"

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
  const [citySearchTerm, setCitySearchTerm] = useState("")
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [newSavedSearchName, setNewSavedSearchName] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [contactTab, setContactTab] = useState<'details' | 'notes'>('details')
  const [noteText, setNoteText] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [notes, setNotes] = useState<any[]>([])
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    selectedStates: [],
    selectedCities: [],
    selectedPracticeTypes: [],
    selectedDispositions: [],
    sortField: 'name',
    sortDir: undefined
  })
  const dialerRef = useRef<JustCallDialer | null>(null)
  const [meetingDate, setMeetingDate] = useState("")
  const [meetingTime, setMeetingTime] = useState("")
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Caller | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    practice: "",
    phone: "",
    city: "",
    state: "",
    address: "",
    website: "",
    practiceType: ""
  })
  
  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bookedWith, setBookedWith] = useState("")
  const [isScheduling, setIsScheduling] = useState(false)
  const [existingEngagedLeads, setExistingEngagedLeads] = useState<Set<string>>(new Set())
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0)
  
  // Pagination state for dialer leads
  const [dialerCurrentPage, setDialerCurrentPage] = useState(1)
  const [dialerPageSize, setDialerPageSize] = useState(25) // Load 25 leads at a time for dialer
  const [dialerTotalPages, setDialerTotalPages] = useState(0)
  const [dialerTotalLeads, setDialerTotalLeads] = useState(0)
  const [dialerLoading, setDialerLoading] = useState(false)

  // State for all dropdown options from entire database
  const [allPracticeTypes, setAllPracticeTypes] = useState<string[]>([])
  const [allStates, setAllStates] = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])

  useEffect(() => {
    fetchCallers(dialerCurrentPage, dialerPageSize, filters)
    initializeDialer()
    loadSavedSearches()
    loadExistingEngagedLeads()
    
    // Fetch all dropdown options from entire database in a single optimized query
    fetchAllDropdownOptions()
    
    return () => {
      if (dialerRef.current) {
        dialerRef.current = null
      }
    }
  }, [])

  // Debounced search effect to prevent too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Always fetch with current filters when they change
      fetchCallers(1, dialerPageSize, filters)
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [filters.searchQuery, filters.selectedStates, filters.selectedCities, filters.selectedPracticeTypes, filters.selectedDispositions, filters.sortField, filters.sortDir])

  useEffect(() => {
    setMeetingDate("")
    setMeetingTime("")
    setBookedWith("")
    setIsScheduling(false)
  }, [selectedCaller?.id])

  // Realtime subscription for notes
  useEffect(() => {
    if (!selectedCaller?.id) {
      console.log('📋 No selected caller, clearing notes')
      setNotes([])
      return
    }

    console.log('📋 Setting up realtime subscription for lead:', selectedCaller.id)

    // Fetch existing notes
    fetchNotes(selectedCaller.id)

    // Set up realtime subscription
    const channel = supabase
      .channel(`lead-notes-${selectedCaller.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_notes'
        },
        async (payload) => {
          console.log('📨 New note received via realtime (all notes):', payload)
          
          // Check if this note belongs to the current lead
          if (payload.new.lead_id !== selectedCaller.id) {
            console.log('📨 Note is for different lead, ignoring')
            return
          }
          
          console.log('📨 Note is for current lead, processing...')
          
          // Get user profile for the new note
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', payload.new.user_id)
            .single()
          
          // Create the new note object
          const newNote = {
            id: payload.new.id,
            note_text: payload.new.note_text,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            user_profiles: {
              full_name: userProfile?.full_name || 'Unknown User'
            }
          }
          
          console.log('📨 Adding new note to state:', newNote)
          
          // Add to the top of the notes list (newest first)
          setNotes(prevNotes => {
            // Check if note already exists to prevent duplicates
            const exists = prevNotes.some(note => note.id === newNote.id)
            if (exists) {
              console.log('📨 Note already exists, skipping duplicate')
              return prevNotes
            }
            
            console.log('📨 Adding note to list, new length:', prevNotes.length + 1)
            return [...prevNotes, newNote]
          })
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('📡 Successfully subscribed to realtime changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('📡 Realtime subscription error')
        }
      })

    // Cleanup subscription
    return () => {
      console.log('📋 Cleaning up realtime subscription for lead:', selectedCaller.id)
      supabase.removeChannel(channel)
    }
  }, [selectedCaller?.id])

  // Get unique values for filter options - now using all data from database
  const uniqueStates = useMemo(() => {
    return allStates
  }, [allStates])

  const availableCities = useMemo(() => {
    // For now, return all cities from database
    // TODO: In future, we could filter cities based on selected states if needed
    return allCities
  }, [allCities])

  const filteredCities = useMemo(() => {
    if (!citySearchTerm.trim()) return availableCities
    const query = citySearchTerm.toLowerCase()
    return availableCities.filter(city => city.toLowerCase().includes(query))
  }, [citySearchTerm, availableCities])

  useEffect(() => {
    setFilters(prev => {
      const nextSelected = prev.selectedCities.filter(city => availableCities.includes(city))
      if (nextSelected.length === prev.selectedCities.length) {
        return prev
      }
      return { ...prev, selectedCities: nextSelected }
    })
  }, [availableCities])

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


  const loadExistingEngagedLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('engaged_leads')
        .select('phone_number')

      if (error) {
        console.error('Error loading existing engaged leads:', error)
        return
      }

      if (data) {
        const phoneNumbers = new Set(data.map(lead => lead.phone_number))
        setExistingEngagedLeads(phoneNumbers)
      }
    } catch (err) {
      console.error("Failed to load existing engaged leads", err)
    }
  }

  // Fetch all dropdown options from entire cold_leads table in a single optimized query
  const fetchAllDropdownOptions = async () => {
    try {
      
      let allData: any[] = []
      let start = 0
      const batchSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('cold_leads')
          .select('practice_type, state, city')
          .range(start, start + batchSize - 1)

        if (error) {
          console.error('❌ Error fetching dropdown options batch:', error)
          return
        }

        if (!data || data.length === 0) break
        
        allData = [...allData, ...data]
        
        if (data.length < batchSize) break
        start += batchSize
      }


      // Extract unique values from the combined dataset
      const practiceTypes = Array.from(new Set(allData.map(row => row.practice_type).filter(Boolean))).sort()
      const states = Array.from(new Set(allData.map(row => row.state).filter(Boolean))).sort()
      const cities = Array.from(new Set(allData.map(row => row.city).filter(Boolean))).sort()

      // Update all state variables
      setAllPracticeTypes(practiceTypes)
      setAllStates(states)
      setAllCities(cities)

    } catch (err) {
      console.error("Failed to fetch dropdown options", err)
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
      filters,
      createdAt: now,
    }

    const updated = [...savedSearches, newSavedSearch]
    setSavedSearches(updated)
    persistSavedSearches(updated)
    setIsSaveDialogOpen(false)
    setNewSavedSearchName("")
    setSaveError(null)
  }

  const applySavedSearch = (search: SavedSearch) => {
    // Ensure all filter properties exist (for backward compatibility with old saved searches)
    setFilters({
      ...search.filters,
      selectedDispositions: search.filters.selectedDispositions || []
    })
  }

  const deleteSavedSearch = (searchId: string) => {
    const updated = savedSearches.filter(search => search.id !== searchId)
    setSavedSearches(updated)
    persistSavedSearches(updated)
  }

  const clearSavedSearches = () => {
    setSavedSearches([])
    persistSavedSearches([])
  }

  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.searchQuery ||
      filters.selectedStates.length > 0 ||
      filters.selectedCities.length > 0 ||
      filters.selectedPracticeTypes.length > 0 ||
      filters.selectedDispositions.length > 0 ||
      filters.sortField === 'callDate'
    )
  }, [filters])

  const uniquePracticeTypes = useMemo(() => {
    return allPracticeTypes
  }, [allPracticeTypes])

  // No client-side filtering needed - filtering is done at database level
  const filteredAndSortedCallers = callers

  // Reset current lead index when filtered list changes
  useEffect(() => {
    if (filteredAndSortedCallers.length === 0) {
      setCurrentLeadIndex(0)
      setSelectedCaller(null)
    } else if (currentLeadIndex >= filteredAndSortedCallers.length) {
      // If current index is out of bounds, reset to first lead
      setCurrentLeadIndex(0)
      setSelectedCaller(filteredAndSortedCallers[0])
      populateDialer(filteredAndSortedCallers[0].phone)
    } else if (selectedCaller && !filteredAndSortedCallers.find(c => c.id === selectedCaller.id)) {
      // If currently selected lead is not in filtered results, go to first available
      setCurrentLeadIndex(0)
      setSelectedCaller(filteredAndSortedCallers[0])
      populateDialer(filteredAndSortedCallers[0].phone)
    }
  }, [filteredAndSortedCallers, currentLeadIndex, selectedCaller])

  const initializeDialer = () => {
    // Client-side only initialization
    if (typeof window === 'undefined') return
    
    try {
      dialerRef.current = new JustCallDialer({
        dialerId: "justcall-dialer",
        onLogin: (data) => {
          // User logged in
        },
        onLogout: () => {
          // User logged out
        },
        onReady: () => {
          // Dialer is ready
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

  const fetchCallers = async (page: number = 1, pageSize: number = 25, currentFilters?: FilterState) => {
    try {
      setDialerLoading(true)
      setError(null)

      const activeFilters = currentFilters || filters

      // Performance optimization: Add timeout for large queries
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        // Build the base query
        let countQuery = supabase.from('cold_leads').select('*', { count: 'exact', head: true })
        let dataQuery = supabase.from('cold_leads').select('id, owner_name, company_name, phone_number, practice_type, city, state, address, website, created_at, call_date, call_status')

        // Apply filters to both count and data queries
        if (activeFilters.searchQuery) {
          const searchTerm = activeFilters.searchQuery.toLowerCase()
          countQuery = countQuery.or(`company_name.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,practice_type.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
          dataQuery = dataQuery.or(`company_name.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%,practice_type.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
        }

        if (activeFilters.selectedStates.length > 0) {
          countQuery = countQuery.in('state', activeFilters.selectedStates)
          dataQuery = dataQuery.in('state', activeFilters.selectedStates)
        }

        if (activeFilters.selectedCities.length > 0) {
          countQuery = countQuery.in('city', activeFilters.selectedCities)
          dataQuery = dataQuery.in('city', activeFilters.selectedCities)
        }

        if (activeFilters.selectedPracticeTypes.length > 0) {
          countQuery = countQuery.in('practice_type', activeFilters.selectedPracticeTypes)
          dataQuery = dataQuery.in('practice_type', activeFilters.selectedPracticeTypes)
        }

        if (activeFilters.selectedDispositions.length > 0) {
          // Separate "Not Called" from other dispositions
          const hasNotCalled = activeFilters.selectedDispositions.includes('Not Called')
          const otherDispositions = activeFilters.selectedDispositions.filter(d => d !== 'Not Called')
          
          if (hasNotCalled && otherDispositions.length > 0) {
            // Both null and specific statuses
            countQuery = countQuery.or(`call_status.is.null,call_status.in.(${otherDispositions.join(',')})`)
            dataQuery = dataQuery.or(`call_status.is.null,call_status.in.(${otherDispositions.join(',')})`)
          } else if (hasNotCalled) {
            // Only null statuses
            countQuery = countQuery.is('call_status', null)
            dataQuery = dataQuery.is('call_status', null)
          } else {
            // Only specific statuses (no null)
            countQuery = countQuery.in('call_status', otherDispositions)
            dataQuery = dataQuery.in('call_status', otherDispositions)
          }
        }

        // Get total count for pagination
        const { count, error: countError } = await countQuery

        if (countError) {
          console.error('❌ Error getting lead count:', countError)
          throw new Error('Failed to get lead count')
        }

        const totalLeads = count || 0
        
        // Fail-safe: Limit maximum leads to prevent performance issues
        const maxLeads = 10000
        if (totalLeads > maxLeads) {
          toast.warning(`Large dataset (${totalLeads} leads). Showing first ${maxLeads} for optimal performance.`)
        }

        const effectiveTotalLeads = Math.min(totalLeads, maxLeads)
        const totalPages = Math.ceil(effectiveTotalLeads / pageSize)
        
        // Validate page number
        const validPage = Math.max(1, Math.min(page, totalPages))
        if (page !== validPage) {
          page = validPage
        }

        // Calculate offset for pagination
        const offset = (page - 1) * pageSize

        // Apply sorting
        let sortField = 'created_at'
        let sortAscending = false

        switch (activeFilters.sortField) {
          case 'name':
            sortField = 'owner_name'
            break
          case 'practice':
            sortField = 'company_name'
            break
          case 'city':
            sortField = 'city'
            break
          case 'state':
            sortField = 'state'
            break
          case 'practiceType':
            sortField = 'practice_type'
            break
          case 'callDate':
            sortField = 'call_date'
            break
        }

        if (activeFilters.sortDir) {
          sortAscending = activeFilters.sortDir === 'asc'
        }

        // Fetch paginated data with filters and sorting
        const { data, error: supabaseError } = await dataQuery
          .order(sortField, { ascending: sortAscending })
          .range(offset, offset + pageSize - 1)
          .limit(pageSize) // Extra safety limit

        clearTimeout(timeoutId)

        if (supabaseError) {
          console.error('❌ Supabase error details:', supabaseError)
          throw new Error(supabaseError.message || 'Supabase error occurred')
        }

        if (data) {
          // Performance optimization: Batch transform data
          const transformedCallers: Caller[] = data.map((row) => ({
            id: row.id,
            name: row.owner_name || '',
            practice: row.company_name || '',
            phone: row.phone_number || '',
            lastCall: row.call_date ? new Date(row.call_date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }) : '—',
            status: 'Cold Lead',
            city: row.city || undefined,
            state: row.state || undefined,
            practiceType: row.practice_type || undefined,
            callDate: row.call_date || undefined,
            callStatus: row.call_status || undefined,
            address: row.address || undefined,
            website: row.website || undefined
          }))


          setCallers(transformedCallers)
          setDialerTotalPages(totalPages)
          setDialerTotalLeads(effectiveTotalLeads)
          setDialerCurrentPage(page)
          
          if (transformedCallers.length > 0) {
            setCurrentLeadIndex(0)
            setSelectedCaller(transformedCallers[0])
          } else {
            setCurrentLeadIndex(0)
            setSelectedCaller(null)
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.')
        }
        throw fetchError
      }
    } catch (err) {
      console.error('Error fetching callers:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch callers'
      setError(errorMessage)
      
      // Show user-friendly error toast
      if (errorMessage.includes('timeout')) {
        toast.error('Request timed out. Please try again.')
      } else if (errorMessage.includes('Failed to get lead count')) {
        toast.error('Unable to load leads. Please check your connection.')
      } else {
        toast.error('Failed to load leads. Please try again.')
      }
    } finally {
      setDialerLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      selectedStates: [],
      selectedCities: [],
      selectedPracticeTypes: [],
      selectedDispositions: [],
      sortField: 'name',
      sortDir: undefined
    })
  }

  const updateCallStatus = async (callerId: string, newStatus: string) => {
    try {
      // Convert CLEAR_STATUS to null for database
      const dbStatus = newStatus === 'CLEAR_STATUS' ? null : newStatus
      
      const { error } = await supabase
        .from('cold_leads')
        .update({ call_status: dbStatus })
        .eq('id', callerId)

      if (error) throw error

      // Update local state (use undefined for CLEAR_STATUS to match interface)
      const localStatus = newStatus === 'CLEAR_STATUS' ? undefined : newStatus
      
      setCallers(prevCallers => 
        prevCallers.map(caller => 
          caller.id === callerId 
            ? { ...caller, callStatus: localStatus }
            : caller
        )
      )

      // Update selected caller if it's the one being updated
      if (selectedCaller?.id === callerId) {
        setSelectedCaller(prev => prev ? { ...prev, callStatus: localStatus } : null)
      }

      // Trigger webhook call for all call outcomes (exclude CLEAR_STATUS)
      const shouldSendToWebhook = newStatus !== 'CLEAR_STATUS' && ['Not Booked', 'Booked', 'Email', 'No Connect', 'Do Not Call'].includes(newStatus)
      
      if (shouldSendToWebhook && selectedCaller && selectedCaller.id === callerId) {
        // Run asynchronously to not block the UI
        sendLeadToWebhookHandler(newStatus)
      }

    } catch (err) {
      console.error('Error updating call status:', err)
      alert('Failed to update call status')
    }
  }

  const deleteLead = async (callerId: string) => {
    try {
      const { error } = await supabase
        .from('cold_leads')
        .delete()
        .eq('id', callerId)

      if (error) throw error

      // Find the index of the lead being deleted
      const deletedIndex = callers.findIndex(caller => caller.id === callerId)
      
      // Remove from local state
      const updatedCallers = callers.filter(caller => caller.id !== callerId)
      setCallers(updatedCallers)
      
      // Select the next appropriate lead to maintain position
      if (selectedCaller?.id === callerId && updatedCallers.length > 0) {
        // If we deleted the last lead in the list, select the new last lead
        // Otherwise, select the lead at the same index (which is now the "next" lead)
        const nextIndex = Math.min(deletedIndex, updatedCallers.length - 1)
        const nextCaller = updatedCallers[nextIndex]
        setSelectedCaller(nextCaller)
        setCurrentLeadIndex(nextIndex)
        populateDialer(nextCaller.phone)
      } else if (updatedCallers.length === 0) {
        // If no leads left, clear selection
        setSelectedCaller(null)
        setCurrentLeadIndex(0)
      }

      toast.success('Lead deleted successfully')
      
    } catch (err) {
      console.error('Error deleting lead:', err)
      toast.error('Failed to delete lead')
    }
  }

  const openEditDialog = (caller: Caller) => {
    setEditingLead(caller)
    setEditFormData({
      name: caller.name || "",
      practice: caller.practice || "",
      phone: caller.phone || "",
      city: caller.city || "",
      state: caller.state || "",
      address: caller.address || "",
      website: caller.website || "",
      practiceType: caller.practiceType || ""
    })
    setIsEditDialogOpen(true)
  }

  const updateLead = async () => {
    if (!editingLead) return

    try {
      const { error } = await supabase
        .from('cold_leads')
        .update({
          owner_name: editFormData.name,
          company_name: editFormData.practice,
          phone_number: editFormData.phone,
          city: editFormData.city,
          state: editFormData.state,
          address: editFormData.address,
          website: editFormData.website,
          practice_type: editFormData.practiceType
        })
        .eq('id', editingLead.id)

      if (error) throw error

      // Update local state
      setCallers(prevCallers => 
        prevCallers.map(caller => 
          caller.id === editingLead.id 
            ? { 
                ...caller, 
                name: editFormData.name,
                practice: editFormData.practice,
                phone: editFormData.phone,
                city: editFormData.city,
                state: editFormData.state,
                address: editFormData.address,
                website: editFormData.website,
                practiceType: editFormData.practiceType
              }
            : caller
        )
      )
      
      // Update selected caller if it's the one being edited
      if (selectedCaller?.id === editingLead.id) {
        setSelectedCaller(prev => prev ? {
          ...prev,
          name: editFormData.name,
          practice: editFormData.practice,
          phone: editFormData.phone,
          city: editFormData.city,
          state: editFormData.state,
          address: editFormData.address,
          website: editFormData.website,
          practiceType: editFormData.practiceType
        } : null)
      }

      toast.success('Lead updated successfully')
      setIsEditDialogOpen(false)
      setEditingLead(null)
      
    } catch (err) {
      console.error('Error updating lead:', err)
      toast.error('Failed to update lead')
    }
  }

  // Bulk selection helper functions
  const isLeadSelected = (leadId: string) => {
    return selectedLeadIds.includes(leadId)
  }

  const isAllSelected = () => {
    return callers.length > 0 && callers.every(lead => selectedLeadIds.includes(lead.id))
  }

  const isPartiallySelected = () => {
    const selectedCount = callers.filter(lead => selectedLeadIds.includes(lead.id)).length
    return selectedCount > 0 && selectedCount < callers.length
  }

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, leadId])
    } else {
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = callers.map(lead => lead.id)
      setSelectedLeadIds(prev => [...prev, ...allIds.filter(id => !prev.includes(id))])
    } else {
      const currentPageIds = callers.map(lead => lead.id)
      setSelectedLeadIds(prev => prev.filter(id => !currentPageIds.includes(id)))
    }
  }

  const bulkDeleteLeads = async () => {
    if (selectedLeadIds.length === 0) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedLeadIds.length} selected lead${selectedLeadIds.length > 1 ? 's' : ''}? This action cannot be undone.`
    )
    
    if (!confirmed) return
    
    try {
      setIsBulkDeleting(true)
      
      // Delete all selected leads from database
      const { error } = await supabase
        .from('cold_leads')
        .delete()
        .in('id', selectedLeadIds)

      if (error) throw error

      // Remove from local state
      const updatedCallers = callers.filter(caller => !selectedLeadIds.includes(caller.id))
      setCallers(updatedCallers)
      
      // Select the next appropriate lead to maintain position if current is being deleted
      if (selectedCaller && selectedLeadIds.includes(selectedCaller.id)) {
        if (updatedCallers.length > 0) {
          // Find the first lead that wasn't deleted, starting from current position
          const currentIndex = callers.findIndex(c => c.id === selectedCaller.id)
          const nextIndex = Math.min(currentIndex, updatedCallers.length - 1)
          const nextCaller = updatedCallers[nextIndex]
          setSelectedCaller(nextCaller)
          setCurrentLeadIndex(nextIndex)
          populateDialer(nextCaller.phone)
        } else {
          setSelectedCaller(null)
          setCurrentLeadIndex(0)
        }
      }

      // Clear selection
      setSelectedLeadIds([])
      
      toast.success(`Successfully deleted ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}`)
      
    } catch (err) {
      console.error('Error bulk deleting leads:', err)
      toast.error('Failed to delete selected leads')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const getCallStatusColor = (status?: string) => {
    switch (status) {
      case 'Booked':
        return 'bg-green-500 text-white border-green-600'
      case 'Not Booked':
        return 'bg-red-500 text-white border-red-600'
      case 'No Connect':
        return 'bg-yellow-500 text-white border-yellow-600'
      case 'Do Not Call':
        return 'bg-gray-500 text-white border-gray-600'
      case 'Email':
        return 'bg-blue-500 text-white border-blue-600'
      default:
        return 'bg-card text-foreground border-border'
    }
  }

  const isLeadInEngagedLeads = selectedCaller ? existingEngagedLeads.has(selectedCaller.phone) : false
  
  const isButtonEnabled = 
    selectedCaller?.callStatus === "Booked" && 
    meetingDate && 
    meetingTime && 
    !isScheduling

  const scheduleEngagedLead = async (leadData: Caller, meetingDate: string, meetingTime: string) => {
    // Format meeting time for Supabase time type (ensure HH:MM format)
    const formattedMeetingTime = meetingTime.includes(':') ? meetingTime : `${meetingTime}:00`
    
    try {
      // Get the current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Error getting user:', authError)
        throw new Error('You must be logged in to schedule a meeting')
      }
      
      // Fetch user_id and organization_id from user_profiles
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, organization_id')
        .eq('id', user.id)
        .single()
      
      if (profileError || !userProfile) {
        console.error('❌ Error fetching user profile:', profileError)
        throw new Error('Failed to fetch user profile')
      }
      
      const engagedLeadData = {
        // Core lead information from cold_leads
        company_name: leadData.practice,
        practice_type: leadData.practiceType || '',
        owner_name: leadData.name,
        phone_number: leadData.phone,
        
        // Meeting details
        meeting_date: meetingDate,
        meeting_time: formattedMeetingTime,
        date_booked: new Date().toISOString().split('T')[0], // Today's date
        meeting_status: 'scheduled',
        
        // Location information (if available from cold_leads)
        city: leadData.city || null,
        state: leadData.state || null,
        address: leadData.address || null,
        
        // URL information from cold_leads
        url: leadData.website || null,
        
        // Default values for engaged_leads specific fields
        lead_source: 'Cold Call',
        assigned_rep: null,
        notes: `Converted from cold lead on ${new Date().toLocaleDateString()}`,
        next_step: null,
        credit: null,
        booked_with: bookedWith || null,
        call_recording: null,
        
        // Add user_id and organization_id from user_profiles
        user_id: userProfile.id,
        organization_id: userProfile.organization_id
      }
      
      // Check if lead already exists in engaged_leads by phone number
      const { data: existingLead, error: checkError } = await supabase
        .from('engaged_leads')
        .select('id')
        .eq('phone_number', leadData.phone)
        .single()

      let result
      
      if (existingLead && !checkError) {
        // Update existing lead
        const { data, error } = await supabase
          .from('engaged_leads')
          .update({
            meeting_date: meetingDate,
            meeting_time: formattedMeetingTime,
            date_booked: new Date().toISOString().split('T')[0],
            booked_with: bookedWith || null,
            user_id: userProfile.id,
            organization_id: userProfile.organization_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)
          .select()

        if (error) {
          console.error('Error updating engaged_leads:', error)
          throw error
        }
        
        result = { success: true, data, action: 'update' }
      } else {
        // Insert new lead
        const { data, error } = await supabase
          .from('engaged_leads')
          .insert([engagedLeadData])
          .select()

        if (error) {
          console.error('Error inserting into engaged_leads:', error)
          throw error
        }
        
        result = { success: true, data, action: 'insert' }
      }

      // Update our tracking state
      if (result.success) {
        setExistingEngagedLeads(prev => new Set(prev).add(leadData.phone))
      }

      return result
    } catch (error) {
      console.error('Error in scheduleEngagedLead:', error)
      return { success: false, error }
    }
  }

  const handleScheduleMeeting = async () => {
    if (!selectedCaller || isScheduling) return
    
    setIsScheduling(true)
    
    try {
      // Get current lead data
      const leadData = selectedCaller
      
      // Get meeting values from input fields
      const meetingDateValue = meetingDate
      const meetingTimeValue = meetingTime
      
      // Call scheduleEngagedLead function
      const result = await scheduleEngagedLead(leadData, meetingDateValue, meetingTimeValue)
      
      if (result.success) {
        // Update tracking state
        setExistingEngagedLeads(prev => new Set(prev).add(leadData.phone))
        
        // Show appropriate success message
        if (result.action === 'update') {
          toast.success("Meeting rescheduled successfully!")
        } else {
          toast.success("Meeting scheduled successfully!")
        }
      } else {
        // Error: Show error toast
        const errorMessage = typeof result.error === 'string' ? result.error : 'Failed to schedule meeting'
        toast.error(errorMessage)
      }
      
    } catch (error) {
      // Catch any unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(errorMessage)
    } finally {
      setIsScheduling(false)
    }
  }

  const sendLeadToWebhookHandler = async (callOutcome: string) => {
    if (!selectedCaller) {
      return
    }

    // Show loading toast
    toast.loading("Processing call outcome...", { id: 'webhook-call' })

    try {
      const result = await sendLeadToWebhook(selectedCaller, callOutcome)
      
      if (result.success) {
        toast.success("Call outcome recorded", { id: 'webhook-call' })
      } else {
        console.error('❌ Webhook call failed:', result.error)
        toast.error(result.error, { id: 'webhook-call' })
      }

    } catch (error) {
      console.error('💥 Unexpected error in webhook call:', error)
      toast.error("An unexpected error occurred", { id: 'webhook-call' })
    }
  }

  const fetchNotes = async (leadId: string) => {
    try {
      console.log('📋 Fetching notes for lead:', leadId)
      
      // First, let's try without the JOIN to see if we get basic notes
      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('❌ Error fetching notes:', error)
        return
      }
      
      console.log('📋 Raw notes data:', data)
      
      if (data && data.length > 0) {
        // Fetch user profiles separately for each note
        const notesWithUsers = await Promise.all(
          data.map(async (note) => {
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('id', note.user_id)
              .single()
            
            return {
              ...note,
              user_profiles: {
                full_name: userProfile?.full_name || 'Unknown User'
              }
            }
          })
        )
        
        console.log('📋 Notes with user profiles:', notesWithUsers)
        setNotes(notesWithUsers)
      } else {
        console.log('📋 No notes found for this lead')
        setNotes([])
      }
    } catch (error) {
      console.error('💥 Unexpected error fetching notes:', error)
    }
  }

  const handleAddNote = async () => {
    if (!selectedCaller || !noteText.trim() || isSavingNote) return
    
    setIsSavingNote(true)
    
    try {
      // Get the current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Error getting user:', authError)
        toast.error('You must be logged in to add notes')
        setIsSavingNote(false)
        return
      }
      
      console.log('📝 Attempting to insert note:', {
        lead_id: selectedCaller.id,
        note_text: noteText.trim(),
        user_id: user.id
      })
      
      // Insert note into lead_notes table
      const { data, error: insertError } = await supabase
        .from('lead_notes')
        .insert({
          lead_id: selectedCaller.id,
          note_text: noteText.trim(),
          user_id: user.id
        })
        .select()
      
      if (insertError) {
        console.error('❌ Error inserting note:', {
          error: insertError,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        })
        toast.error(`Failed to save note: ${insertError.message || 'Please try again.'}`)
        setIsSavingNote(false)
        return
      }
      
      console.log('✅ Note inserted successfully:', data)
      
      // Success - clear the input
      setNoteText("")
      toast.success('Note added successfully')
      
      // Refresh notes to ensure UI is updated (fallback if realtime doesn't work)
      setTimeout(() => {
        fetchNotes(selectedCaller.id)
      }, 500)
      
    } catch (error) {
      console.error('💥 Unexpected error adding note:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSavingNote(false)
    }
  }

  // Navigation functions for Next/Previous buttons
  const goToNextLead = () => {
    if (callers.length === 0) return
    
    // If at the end of current page and there's a next page, load it
    if (currentLeadIndex === callers.length - 1 && dialerCurrentPage < dialerTotalPages) {
      fetchCallers(dialerCurrentPage + 1, dialerPageSize, filters)
      return
    }
    
    // If at the end of the last page, wrap to first page
    if (currentLeadIndex === callers.length - 1 && dialerCurrentPage === dialerTotalPages) {
      fetchCallers(1, dialerPageSize, filters)
      return
    }
    
    // Normal next navigation within current page
    const nextIndex = (currentLeadIndex + 1) % callers.length
    const nextCaller = callers[nextIndex]
    
    setCurrentLeadIndex(nextIndex)
    setSelectedCaller(nextCaller)
    populateDialer(nextCaller.phone)
  }

  const goToPreviousLead = () => {
    if (callers.length === 0) return
    
    // If at the beginning of current page and there's a previous page, load it
    if (currentLeadIndex === 0 && dialerCurrentPage > 1) {
      fetchCallers(dialerCurrentPage - 1, dialerPageSize, filters)
      return
    }
    
    // If at the beginning of the first page, wrap to last page
    if (currentLeadIndex === 0 && dialerCurrentPage === 1) {
      fetchCallers(dialerTotalPages, dialerPageSize, filters)
      return
    }
    
    // Normal previous navigation within current page
    const prevIndex = currentLeadIndex === 0 ? callers.length - 1 : currentLeadIndex - 1
    const prevCaller = callers[prevIndex]
    
    setCurrentLeadIndex(prevIndex)
    setSelectedCaller(prevCaller)
    populateDialer(prevCaller.phone)
  }

  // Make test function available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).testWebhookAPI = testWebhookAPI
  }

  return (
    <div className="min-h-screen bg-black *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
      <div className="container mx-auto px-4 py-4">

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search leads, practices, or locations..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-card border-border text-foreground hover:bg-accent"
                  disabled={!hasActiveFilters}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Search
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Filters</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="dialer-saved-search-name">
                      Search Name
                    </label>
                    <Input
                      id="dialer-saved-search-name"
                      placeholder="e.g. Dallas Orthodontics"
                      value={newSavedSearchName}
                      onChange={(event) => {
                        setNewSavedSearchName(event.target.value)
                        if (saveError) {
                          setSaveError(null)
                        }
                      }}
                    />
                    {saveError && (
                      <p className="text-xs text-destructive">{saveError}</p>
                    )}
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">Filters to be saved:</p>
                    <ul className="space-y-1">
                      <li>
                        <span className="font-medium">Search:</span> {filters.searchQuery || '—'}
                      </li>
                      <li>
                        <span className="font-medium">States:</span> {filters.selectedStates.length ? filters.selectedStates.join(', ') : '—'}
                      </li>
                      <li>
                        <span className="font-medium">Cities:</span> {filters.selectedCities.length ? filters.selectedCities.join(', ') : '—'}
                      </li>
                      <li>
                        <span className="font-medium">Practice Types:</span> {filters.selectedPracticeTypes.length ? filters.selectedPracticeTypes.join(', ') : '—'}
                      </li>
                      <li>
                        <span className="font-medium">Dispositions:</span> {filters.selectedDispositions?.length ? filters.selectedDispositions.join(', ') : '—'}
                      </li>
                      <li>
                        <span className="font-medium">Sort:</span> {filters.sortField === 'callDate' 
                          ? `Call Date (${filters.sortDir === 'desc' ? 'Newest' : 'Oldest'})` 
                          : 'Default'}
                      </li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveCurrentSearch}>Save Search</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-card border-border text-foreground hover:bg-accent"
                  disabled={savedSearches.length === 0}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Saved Searches
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Saved Searches</span>
                  {savedSearches.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(event) => {
                        event.preventDefault()
                        clearSavedSearches()
                      }}
                    >
                      Clear All
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {savedSearches.length === 0 ? (
                  <div className="px-2 py-6 text-xs text-muted-foreground text-center">
                    No saved searches yet.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {savedSearches.map((search) => (
                      <div key={search.id} className="flex items-center gap-1 px-1 py-0.5">
                        <DropdownMenuItem
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            applySavedSearch(search)
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {search.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(search.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </DropdownMenuItem>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSavedSearch(search.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Practice Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-card border-border text-foreground hover:bg-accent"
                >
                  Practice Type
                  {filters.selectedPracticeTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {filters.selectedPracticeTypes.length}
                    </Badge>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] bg-popover border-border" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">Practice Types</h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {uniquePracticeTypes.map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`practice-${type}`}
                              checked={filters.selectedPracticeTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({
                                    ...prev,
                                    selectedPracticeTypes: [...prev.selectedPracticeTypes, type]
                                  }))
                                } else {
                                  setFilters(prev => ({
                                    ...prev,
                                    selectedPracticeTypes: prev.selectedPracticeTypes.filter(t => t !== type)
                                  }))
                                }
                              }}
                            />
                            <label
                              htmlFor={`practice-${type}`}
                              className="text-sm text-foreground cursor-pointer flex-1"
                            >
                              {type}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {filters.selectedPracticeTypes.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, selectedPracticeTypes: [] }))}
                        className="w-full text-xs"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* State Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-card border-border text-foreground hover:bg-accent"
                >
                  State
                  {filters.selectedStates.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {filters.selectedStates.length}
                    </Badge>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] bg-popover border-border" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">States</h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {uniqueStates.map((state) => (
                          <div key={state} className="flex items-center space-x-2">
                            <Checkbox
                              id={`state-${state}`}
                              checked={filters.selectedStates.includes(state)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({
                                    ...prev,
                                    selectedStates: [...prev.selectedStates, state]
                                  }))
                                } else {
                                  setFilters(prev => ({
                                    ...prev,
                                    selectedStates: prev.selectedStates.filter(s => s !== state)
                                  }))
                                }
                              }}
                            />
                            <label
                              htmlFor={`state-${state}`}
                              className="text-sm text-foreground cursor-pointer flex-1"
                            >
                              {state}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {filters.selectedStates.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, selectedStates: [] }))}
                        className="w-full text-xs"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* City Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-card border-border text-foreground hover:bg-accent"
                >
                  City
                  {filters.selectedCities.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {filters.selectedCities.length}
                    </Badge>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] bg-popover border-border" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">Cities</h4>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={citySearchTerm}
                        onChange={(event) => setCitySearchTerm(event.target.value)}
                        placeholder="Search cities..."
                        className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
                      />
                      {citySearchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                          onClick={() => setCitySearchTerm("")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {filteredCities.length > 0 ? (
                          filteredCities.map((city) => (
                            <div key={city} className="flex items-center space-x-2">
                              <Checkbox
                                id={`city-${city}`}
                                checked={filters.selectedCities.includes(city)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFilters(prev => ({
                                      ...prev,
                                      selectedCities: [...prev.selectedCities, city]
                                    }))
                                  } else {
                                    setFilters(prev => ({
                                      ...prev,
                                      selectedCities: prev.selectedCities.filter(c => c !== city)
                                    }))
                                  }
                                }}
                              />
                              <label
                                htmlFor={`city-${city}`}
                                className="text-sm text-foreground cursor-pointer flex-1"
                              >
                                {city}
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-6">No cities found</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {filters.selectedCities.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, selectedCities: [] }))}
                        className="w-full text-xs"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Disposition Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-card border-border text-foreground hover:bg-accent"
                >
                  Disposition
                  {filters.selectedDispositions.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {filters.selectedDispositions.length}
                    </Badge>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] bg-popover border-border" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">Call Outcomes</h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {['Not Called', 'No Connect', 'Not Booked', 'Booked', 'Do Not Call', 'Email'].map((disposition) => (
                          <div key={disposition} className="flex items-center space-x-2">
                            <Checkbox
                              id={`disposition-${disposition}`}
                              checked={filters.selectedDispositions.includes(disposition)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({
                                    ...prev,
                                    selectedDispositions: [...prev.selectedDispositions, disposition]
                                  }))
                                } else {
                                  setFilters(prev => ({
                                    ...prev,
                                    selectedDispositions: prev.selectedDispositions.filter(d => d !== disposition)
                                  }))
                                }
                              }}
                            />
                            <label
                              htmlFor={`disposition-${disposition}`}
                              className="text-sm text-foreground cursor-pointer flex-1"
                            >
                              {disposition}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {filters.selectedDispositions.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, selectedDispositions: [] }))}
                        className="w-full text-xs"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>


          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Card - Callers List */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-card-foreground">Leads to Call</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilters(prev => {
                        // If not currently sorting by call date, start with most recent (desc)
                        if (prev.sortField !== 'callDate') {
                          return {
                            ...prev,
                            sortField: 'callDate',
                            sortDir: 'desc'
                          }
                        }
                        // If already sorting by call date, toggle between desc and asc
                        return {
                          ...prev,
                          sortDir: prev.sortDir === 'desc' ? 'asc' : 'desc'
                        }
                      })
                    }}
                    className={`h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 ${
                      filters.sortField === 'callDate' ? 'text-primary bg-primary/10' : ''
                    }`}
                    title={filters.sortField === 'callDate' 
                      ? (filters.sortDir === 'desc' ? 'Sort by oldest call date' : 'Sort by newest call date')
                      : 'Sort by call date'
                    }
                  >
                    {filters.sortField === 'callDate' 
                      ? (filters.sortDir === 'desc' ? '↓' : '↑')
                      : '↕'
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-full">
                {dialerLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading leads...
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-red-500">
                    {error}
                  </div>
                ) : (
                  <>
                    {/* Select All Header */}
                    {callers.length > 0 && (
                      <div className="p-3 border-b border-border bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isAllSelected()}
                              onCheckedChange={handleSelectAll}
                              ref={(el) => {
                                if (el) {
                                  (el as any).indeterminate = isPartiallySelected()
                                }
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {selectedLeadIds.length > 0 
                                ? `${selectedLeadIds.length} selected`
                                : 'Select all'
                              }
                            </span>
                          </div>
                          {selectedLeadIds.length > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={bulkDeleteLeads}
                              disabled={isBulkDeleting}
                              className="h-7 px-2 text-xs"
                            >
                              {isBulkDeleting ? 'Deleting...' : `Delete ${selectedLeadIds.length}`}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Leads List - Back to original compact size */}
                    <ScrollArea className="h-[calc(80vh-120px)]">
                      <div className="space-y-1">
                        {callers.map((caller) => (
                          <div
                            key={caller.id}
                            className={`p-3 transition-all border-b last:border-b-0 ${
                              selectedCaller?.id === caller.id 
                                ? 'bg-primary/10 border-l-4 border-l-primary border-b-border shadow-sm' 
                                : 'hover:bg-muted/50 border-l-4 border-l-transparent border-b-border'
                            } ${
                              isLeadSelected(caller.id) ? 'bg-primary/5 border-primary/20' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isLeadSelected(caller.id)}
                                onCheckedChange={(checked) => {
                                  handleSelectLead(caller.id, checked as boolean)
                                }}
                                onClick={(e) => e.stopPropagation()} // Prevent row selection when clicking checkbox
                                className="mt-1"
                              />
                              <div
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                  const callerIndex = callers.findIndex(c => c.id === caller.id)
                                  setCurrentLeadIndex(callerIndex)
                                  setSelectedCaller(caller)
                                  populateDialer(caller.phone)
                                }}
                              >
                            <h4 className="font-medium text-card-foreground mb-1 text-sm">{caller.name}</h4>
                            <p className="text-xs text-muted-foreground mb-1">{caller.practice}</p>
                            <p className="text-xs text-muted-foreground font-mono">{caller.phone}</p>
                            {(caller.city || caller.state) && (
                              <p className="text-xs text-muted-foreground">
                                {[caller.city, caller.state].filter(Boolean).join(', ')}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2 gap-2">
                              {caller.callStatus ? (
                                <span className={`text-xs px-2 py-1 rounded-full ${getCallStatusColor(caller.callStatus)}`}>
                                  {caller.callStatus}
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                                  No Status
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{caller.lastCall}</span>
                            </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    {/* Compact Pagination Controls */}
                    <div className="border-t border-border p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {dialerCurrentPage}/{dialerTotalPages} ({dialerTotalLeads} total)
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (dialerCurrentPage > 1) {
                                fetchCallers(dialerCurrentPage - 1, dialerPageSize, filters)
                              }
                            }}
                            disabled={dialerCurrentPage <= 1 || dialerLoading}
                            className="h-6 px-2 text-xs"
                          >
                            Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (dialerCurrentPage < dialerTotalPages) {
                                fetchCallers(dialerCurrentPage + 1, dialerPageSize, filters)
                              }
                            }}
                            disabled={dialerCurrentPage >= dialerTotalPages || dialerLoading}
                            className="h-6 px-2 text-xs"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Card - JustCall Dialer */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardContent className="p-0 h-full flex flex-col">
                {/* Dialer Container */}
                <div className="flex-1 flex items-center justify-center">
                  <div id="justcall-dialer" className="h-full w-full flex items-center justify-center max-w-full"></div>
                </div>
                
                {/* Compact Navigation Buttons */}
                <div className="border-t border-border p-2">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousLead}
                      disabled={callers.length === 0}
                      className="flex items-center gap-1 h-7 px-2"
                    >
                      <ChevronDown className="h-3 w-3 rotate-90" />
                      Prev
                    </Button>
                    
                    <div className="text-xs text-muted-foreground px-2">
                      {callers.length > 0 ? (
                        `${((dialerCurrentPage - 1) * dialerPageSize) + currentLeadIndex + 1}/${dialerTotalLeads}`
                      ) : (
                        'No leads'
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextLead}
                      disabled={callers.length === 0}
                      className="flex items-center gap-1 h-7 px-2"
                    >
                      Next
                      <ChevronDown className="h-3 w-3 -rotate-90" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Card - Contact Details */}
          <div className="col-span-4">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-card-foreground">Contact Details</CardTitle>
                  {selectedCaller && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(selectedCaller)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${selectedCaller.name}? This action cannot be undone.`)) {
                            deleteLead(selectedCaller.id)
                          }
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              {selectedCaller ? (
                <>
                  {/* Tab Navigation */}
                  <div className="flex items-center border-b border-border px-6">
                    <button
                      onClick={() => setContactTab('details')}
                      className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                        contactTab === 'details'
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Details
                      {contactTab === 'details' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setContactTab('notes')}
                      className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                        contactTab === 'notes'
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Notes
                      {notes.length > 0 && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-gray-400 text-white text-xs font-semibold">
                          {notes.length}
                        </span>
                      )}
                      {contactTab === 'notes' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                      )}
                    </button>
                  </div>

                  {/* Tab Content */}
                  <CardContent className="flex-1 overflow-hidden flex flex-col">
                    {contactTab === 'details' ? (
                      /* Details Tab */
                      <div className="space-y-4 overflow-y-auto">
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
                            
                            {(selectedCaller.city || selectedCaller.state) && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {[selectedCaller.city, selectedCaller.state].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                            
                            {selectedCaller.practiceType && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{selectedCaller.practiceType}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Last Call: {selectedCaller.lastCall}</span>
                            </div>
                            
                            
                            <div className="pt-4 space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-white border-white hover:bg-white hover:text-black"
                                onClick={() => {
                                  if (selectedCaller.website) {
                                    // Use the actual website from the database
                                    const website = selectedCaller.website.startsWith('http') 
                                      ? selectedCaller.website 
                                      : `https://${selectedCaller.website}`
                                    window.open(website, '_blank')
                                  } else {
                                    toast.error('No website available for this lead')
                                  }
                                }}
                                disabled={!selectedCaller.website}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visit Site
                              </Button>
                              
                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">Call Outcome</label>
                                <Select 
                                  value={selectedCaller.callStatus || ""}
                                  onValueChange={(value) => updateCallStatus(selectedCaller.id, value)}
                                >
                                  <SelectTrigger className={`w-full ${getCallStatusColor(selectedCaller.callStatus)}`}>
                                    <SelectValue placeholder="Set outcome" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="No Connect">No Connect</SelectItem>
                                    <SelectItem value="Not Booked">Not Booked</SelectItem>
                                    <SelectItem value="Booked">Booked</SelectItem>
                                    <SelectItem value="Do Not Call">Do Not Call</SelectItem>
                                    <SelectItem value="Email">Email</SelectItem>
                                    <SelectItem value="CLEAR_STATUS">Clear Status</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Date and Time Inputs */}
                              <div className="pt-2 space-y-2">
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">Meeting Date</label>
                                  <Input
                                    type="date"
                                    className="w-full bg-card border-border text-foreground"
                                    value={meetingDate}
                                    onChange={(event) => setMeetingDate(event.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">Meeting Time</label>
                                  <Input
                                    type="time"
                                    className="w-full bg-card border-border text-foreground"
                                    value={meetingTime}
                                    onChange={(event) => setMeetingTime(event.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground block mb-1">Booked With</label>
                                  <Input
                                    type="text"
                                    className="w-full bg-card border-border text-foreground"
                                    placeholder="Enter who the meeting was booked with"
                                    value={bookedWith}
                                    onChange={(event) => setBookedWith(event.target.value)}
                                  />
                                </div>
                                <div className={`relative w-full ${isButtonEnabled ? 'p-[2px]' : ''}`}>
                                  {isButtonEnabled && (
                                    <div 
                                      className="absolute inset-0 rounded-md"
                                      style={{
                                        background: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000)',
                                        backgroundSize: '400% 400%',
                                        animation: 'rainbowBorder 2s linear infinite',
                                      }}
                                    />
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`w-full relative transition-all duration-300 ${
                                      isButtonEnabled 
                                        ? 'bg-gray-800 text-white border-0 hover:bg-gray-700' 
                                        : 'bg-gray-600 text-gray-400 border-2 border-gray-500 opacity-50'
                                    }`}
                                    onClick={handleScheduleMeeting}
                                    disabled={!isButtonEnabled}
                                  >
                                    <div className="relative z-10 flex items-center justify-center">
                                      {isScheduling ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                          {isLeadInEngagedLeads ? "Updating..." : "Scheduling..."}
                                        </>
                                      ) : isLeadInEngagedLeads ? (
                                        "Reschedule Meeting"
                                      ) : (
                                        "Schedule Meeting"
                                      )}
                                    </div>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Notes Tab */
                      <div className="flex flex-col flex-1 min-h-0">
                        {/* Notes Feed - Scrollable */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3">
                          {notes.length > 0 ? (
                            notes.map((note) => {
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
                                hour12: true
                              })
                              
                              return (
                                <div key={note.id} className="flex items-start space-x-2">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-primary">{initials}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline space-x-2 mb-1">
                                      <span className="text-xs font-semibold text-foreground">
                                        {note.user_profiles?.full_name || 'Unknown User'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{timeAgo}</span>
                                    </div>
                                    <div className="bg-muted rounded-lg p-2 border border-border">
                                      <p className="text-xs text-foreground">{note.note_text}</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-xs">
                              No notes yet. Add the first note below!
                            </div>
                          )}
                        </div>

                        {/* Message Input - Sticky at bottom */}
                        <div className="flex-shrink-0 border-t border-border pt-3">
                          <div className="flex items-end space-x-2">
                            <input
                              type="text"
                              placeholder="Add a note..."
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && noteText.trim() && !isSavingNote) {
                                  handleAddNote()
                                }
                              }}
                              disabled={isSavingNote}
                              className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                            />
                            <button 
                              onClick={handleAddNote}
                              disabled={!noteText.trim() || isSavingNote}
                              className="flex-shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    )}
                  </CardContent>
                </>
              ) : (
                <CardContent>
                  <div className="text-center text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a contact to view details</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead Information</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Practice/Company</label>
              <Input
                value={editFormData.practice}
                onChange={(e) => setEditFormData(prev => ({ ...prev, practice: e.target.value }))}
                placeholder="Enter practice name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Practice Type</label>
              <Input
                value={editFormData.practiceType}
                onChange={(e) => setEditFormData(prev => ({ ...prev, practiceType: e.target.value }))}
                placeholder="Enter practice type"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Input
                value={editFormData.city}
                onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Enter city"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Input
                value={editFormData.state}
                onChange={(e) => setEditFormData(prev => ({ ...prev, state: e.target.value }))}
                placeholder="Enter state"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={editFormData.address}
                onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Website</label>
              <Input
                value={editFormData.website}
                onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="Enter website URL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateLead}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

