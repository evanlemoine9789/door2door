"use client"

import { Lead } from "./leads-table"
import { Edit, Trash2, Save, X, Check, Phone, MapPin, Building2, Globe, MessageSquare } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { MobileDateTimePicker } from "@/components/ui/mobile-datetime-picker"


interface LeadDetailsProps {
  lead: Lead | null
  onEdit: (lead: Lead) => void
  onDelete: (leadId: string) => void
  onLeadUpdate?: (updatedLead: Lead) => void
}

export function LeadDetails({ lead, onEdit, onDelete, onLeadUpdate }: LeadDetailsProps) {
  const isMobile = useIsMobile()
  const [isEditing, setIsEditing] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<any[]>([])
  const [noteText, setNoteText] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [dateBookedPicker, setDateBookedPicker] = useState<Date | undefined>(undefined)
  const [meetingDatePicker, setMeetingDatePicker] = useState<Date | undefined>(undefined)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const notesInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Realtime subscription for notes
  useEffect(() => {
    if (!lead?.id) {
      console.log('📋 No lead selected, clearing notes')
      setNotes([])
      return
    }

    console.log('📋 Setting up realtime subscription for lead:', lead.id)

    // Fetch existing notes
    fetchLeadNotes(lead.id)

    // Set up realtime subscription
    const channel = supabase
      .channel(`lead-notes-${lead.id}`)
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
          if (payload.new.lead_id !== lead.id) {
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
          
          // Add to the end of the notes list (newest at bottom)
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
      console.log('📋 Cleaning up realtime subscription for lead:', lead.id)
      supabase.removeChannel(channel)
    }
  }, [lead?.id])

  // Sync date picker states with editing lead data
  useEffect(() => {
    if (editingLead) {
      setDateBookedPicker(editingLead.dateBooked ? new Date(editingLead.dateBooked) : undefined)
      setMeetingDatePicker(editingLead.meetingDate ? new Date(editingLead.meetingDate) : undefined)
    }
  }, [editingLead])

  // iOS keyboard detection and handling
  useEffect(() => {
    if (!isMobile) return

    const handleResize = () => {
      const initialViewportHeight = window.innerHeight
      const currentViewportHeight = window.visualViewport?.height || window.innerHeight
      const keyboardHeight = initialViewportHeight - currentViewportHeight
      const keyboardIsOpen = keyboardHeight > 150 // Threshold for keyboard detection
      
      setIsKeyboardOpen(keyboardIsOpen)
      
      // Scroll to input when keyboard opens
      if (keyboardIsOpen && notesInputRef.current && scrollContainerRef.current) {
        setTimeout(() => {
          notesInputRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
        }, 100)
      }
    }

    // Listen to both resize and visualViewport changes for better iOS support
    window.addEventListener('resize', handleResize)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }, [isMobile])

  if (!lead) return null

  const getStatusBadge = (status: Lead['meetingStatus']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/60 hover:bg-blue-600/70 text-white border border-blue-400/30'
      case 'cancelled':
        return 'bg-red-500/60 hover:bg-red-600/70 text-white border border-red-400/30'
      case 'ran':
        return 'bg-green-500/60 hover:bg-green-600/70 text-white border border-green-400/30'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateString.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    }
    return new Date(dateString).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  }

  const formatDateForPicker = (date: Date | undefined) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  const validateAndFormatDate = (dateString: string): string | null => {
    if (!dateString) return null
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateString.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      return (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) ? dateString : null
    }
    const dt = new Date(dateString)
    if (isNaN(dt.getTime())) return null
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const validateDateInput = (dateString: string): boolean => validateAndFormatDate(dateString) !== null

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'N/A') return phone
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    return phone
  }

  const handleEditClick = () => {
    setEditingLead({ ...lead })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingLead(null)
  }

  const mapStatusToSupabase = (status: Lead['meetingStatus']): string => {
    switch (status) {
      case 'scheduled': return 'scheduled'
      case 'cancelled': return 'cancelled'
      case 'ran':       return 'ran'
      default:          return 'scheduled'
    }
  }

  const handleSaveEdit = async () => {
    if (!editingLead) return

    const validatedMeetingDate = validateAndFormatDate(editingLead.meetingDate || '')
    const validatedDateBooked  = validateAndFormatDate(editingLead.dateBooked || '')

    if (editingLead.meetingDate && !validatedMeetingDate) {
      alert('Invalid meeting date format. Use YYYY-MM-DD.')
      return
    }
    if (editingLead.dateBooked && !validatedDateBooked) {
      alert('Invalid date booked format. Use YYYY-MM-DD.')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('engaged_leads')
        .update({
          company_name:  editingLead.company,
          owner_name:    editingLead.contactName,
          practice_type: editingLead.contactRole,
          url:           editingLead.url,
          phone_number:  editingLead.phoneNumber,
          meeting_status: mapStatusToSupabase(editingLead.meetingStatus),
          meeting_date:   validatedMeetingDate,   // DATE in DB
          meeting_time:   editingLead.meetingTime, // "meeting_time" is text in DB
          date_booked:    validatedDateBooked,    // DATE in DB
          assigned_rep:   editingLead.rep,
          booked_with:    editingLead.bookedWith,
          call_recording: editingLead.callRecording,
          address:        editingLead.address,
          city:           editingLead.city,
          state:          editingLead.state,
          updated_at:     new Date().toISOString(), // ensure it bumps
        })
        .eq('id', editingLead.id)
        .select()
        .single()

      if (error) throw error

      // Trust the DB row we just wrote
      const row = data as any
      const updatedLead: Lead = {
        id:           row.id,
        company:      row.company_name,
        contactName:  row.owner_name,
        contactRole:  row.practice_type,
        meetingStatus: row.meeting_status as Lead['meetingStatus'],
        meetingDate:   row.meeting_date ?? null,
        meetingTime:   row.meeting_time ?? '',
        dateBooked:    row.date_booked ?? '',
        phoneNumber:   row.phone_number ?? '',
        url:           row.url ?? '',
        rep:           row.assigned_rep ?? '',
        bookedWith:    row.booked_with ?? '',
        callRecording: row.call_recording ?? '',
        address:       row.address ?? null,
        city:          row.city ?? null,
        state:         row.state ?? null,
        lastUpdated:   row.updated_at,
      }

      onLeadUpdate?.(updatedLead)
      setIsEditing(false)
      setEditingLead(null)
      onEdit(updatedLead)
    } catch (err) {
      console.error('Error updating lead:', err)
      alert('Failed to update lead. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLead = async () => {
    if (!currentLead) return
    if (!confirm(`Delete ${currentLead.company}? This cannot be undone.`)) return
    try {
      console.log('🗑️ Deleting lead from engaged_leads table:', currentLead.id)
      const { error } = await supabase.from('engaged_leads').delete().eq('id', currentLead.id)
      if (error) {
        console.error('❌ Supabase delete error:', error)
        throw error
      }
      console.log('✅ Lead deleted successfully')
      onDelete(currentLead.id)
    } catch (err) {
      console.error('💥 Error deleting lead:', err)
      alert('Failed to delete lead. Please try again.')
    }
  }

  const currentLead = isEditing ? editingLead : lead
  if (!currentLead) return null

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

      setNotes(notesWithProfiles)
    } catch (error) {
      console.error('Error fetching lead notes:', error)
      setNotes([])
    }
  }

  const handleAddNote = async () => {
    if (!lead || !noteText.trim() || isSavingNote) return
    
    setIsSavingNote(true)
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Error getting user:', authError)
        alert('You must be logged in to add notes')
        setIsSavingNote(false)
        return
      }
      
      console.log('📝 Attempting to insert note:', {
        lead_id: lead.id,
        note_text: noteText.trim(),
        user_id: user.id
      })
      
      const { data, error: insertError } = await supabase
        .from('lead_notes')
        .insert({
          lead_id: lead.id,
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
        alert(`Failed to save note: ${insertError.message || 'Please try again.'}`)
        setIsSavingNote(false)
        return
      }
      
      console.log('✅ Note inserted successfully:', data)
      
      setNoteText("")
      
      setTimeout(() => {
        fetchLeadNotes(lead.id)
      }, 500)
      
    } catch (error) {
      console.error('💥 Unexpected error adding note:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <div className="bg-card h-full flex flex-col min-w-0">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            {isEditing ? (
              <input
                type="text"
                value={currentLead.company}
                onChange={(e) => setEditingLead({ ...currentLead, company: e.target.value })}
                className="text-xl font-semibold text-card-foreground bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
              />
            ) : (
              <h2 className="text-xl font-semibold text-card-foreground">{currentLead.company}</h2>
            )}
            {isEditing ? (
              <input
                type="text"
                value={currentLead.contactName}
                onChange={(e) => setEditingLead({ ...currentLead, contactName: e.target.value })}
                className="text-base text-muted-foreground mt-2 bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5 w-full"
              />
            ) : (
              <p className="text-base text-muted-foreground mt-2">{currentLead.contactName}</p>
            )}
          </div>
          <div className="flex items-center space-x-1 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="p-2 text-green-600 hover:text-green-700 transition-colors rounded-md hover:bg-accent disabled:opacity-50"
                  title="Save changes"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent disabled:opacity-50"
                  title="Cancel editing"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditClick}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
                  title="Edit contact"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteLead}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-accent"
                  title="Delete contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto p-4 transition-all duration-200 ${
          isMobile && isKeyboardOpen ? 'pb-2' : ''
        }`}
      >
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              <div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-base">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a 
                      href={`tel:${currentLead.phoneNumber}`}
                      className="text-primary font-medium hover:underline"
                    >
                      {formatPhoneNumber(currentLead.phoneNumber)}
                    </a>
                  </div>
                  
                  
                  {currentLead.address && (
                    <div className="flex items-start gap-2 text-base">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">
                        {currentLead.address}
                      </span>
                    </div>
                  )}
                  
                  {currentLead.contactRole && (
                    <div className="flex items-center gap-2 text-base">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">{currentLead.contactRole}</span>
                    </div>
                  )}
                  
                  {currentLead.url && (
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full h-12"
                        onClick={() => {
                          const website = currentLead.url!.startsWith('http') 
                            ? currentLead.url 
                            : `https://${currentLead.url}`
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

              {/* Meeting Details Section */}
              <div className="pt-2">
                <h4 className="text-base font-semibold text-card-foreground mb-3">Meeting Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-card-foreground">Meeting Status</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <select
                          value={currentLead.meetingStatus}
                          onChange={(e) => setEditingLead({ ...currentLead, meetingStatus: e.target.value as Lead['meetingStatus'] })}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border border-border ${getStatusBadge(currentLead.meetingStatus)} bg-transparent`}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="ran">Ran</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border border-border ${getStatusBadge(currentLead.meetingStatus)}`}>
                          {currentLead.meetingStatus.charAt(0).toUpperCase() + currentLead.meetingStatus.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">Date Booked</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <MobileDateTimePicker
                          date={dateBookedPicker}
                          setDate={(date) => {
                            setDateBookedPicker(date)
                            if (editingLead) {
                              setEditingLead({ 
                                ...editingLead, 
                                dateBooked: date ? formatDateForPicker(date) : '' 
                              })
                            }
                          }}
                          label="Select date booked"
                          placeholder="Select date booked..."
                        />
                      ) : (
                        <p className="text-base text-muted-foreground">{formatDate(currentLead.dateBooked)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">Meeting Date</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <MobileDateTimePicker
                          date={meetingDatePicker}
                          setDate={(date) => {
                            setMeetingDatePicker(date)
                            if (editingLead) {
                              setEditingLead({ 
                                ...editingLead, 
                                meetingDate: date ? formatDateForPicker(date) : '' 
                              })
                            }
                          }}
                          label="Select meeting date"
                          placeholder="Select meeting date..."
                        />
                      ) : (
                        <p className="text-base text-muted-foreground font-medium">{formatDate(currentLead.meetingDate)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-card-foreground">Meeting Time</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.meetingTime || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, meetingTime: e.target.value })}
                          className="w-full text-base bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter meeting time (e.g., 2:00 PM)"
                        />
                      ) : (
                        <p className="text-base text-muted-foreground">{currentLead.meetingTime || '–'}</p>
                      )}
                    </div>
                  </div>

                  {!isMobile && (
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Rep</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={currentLead.rep || ''}
                            onChange={(e) => setEditingLead({ ...currentLead, rep: e.target.value })}
                            className="w-full text-base bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                            placeholder="Enter rep name"
                          />
                        ) : (
                          <p className="text-base text-muted-foreground">{currentLead.rep || '–'}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-card-foreground">Booked with</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.bookedWith || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, bookedWith: e.target.value })}
                          className="w-full text-base bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter who it was booked with"
                        />
                      ) : (
                        <p className="text-base text-muted-foreground">{currentLead.bookedWith || '–'}</p>
                      )}
                    </div>
                  </div>

                  {!isMobile && (
                    <div>
                      <label className="text-sm font-medium text-card-foreground">Call Recording</label>
                      <div className="mt-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={currentLead.callRecording || ''}
                            onChange={(e) => setEditingLead({ ...currentLead, callRecording: e.target.value })}
                            className="w-full text-base bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                            placeholder="Enter call recording URL or ID"
                          />
                        ) : (
                          currentLead.callRecording ? (
                            <button
                              onClick={() => window.open(currentLead.callRecording, '_blank', 'noopener,noreferrer')}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded transition-colors bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                            >
                              Call Recording
                            </button>
                          ) : (
                            <button
                              disabled
                              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded transition-colors bg-gray-400 text-gray-200 cursor-not-allowed opacity-50"
                            >
                              Call Recording
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="notes" className="mt-4">
            <div className="flex flex-col flex-1 min-h-0">
              {/* Notes Feed - Scrollable */}
              <div className="flex-1 overflow-y-auto space-y-3 p-4 pr-2 pb-20">
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

              {/* Message Input - Pinned at bottom of screen */}
              <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 z-50">
                <div className="flex items-end space-x-2">
                  <input
                    ref={notesInputRef}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Actions - Desktop Only */}
      {!isMobile && (
        <div className="border-t border-border px-6 py-3 bg-muted flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Last updated: {formatDate(currentLead.lastUpdated)}
            </div>
            <div className="flex items-center space-x-2">
              <button className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-card text-muted-foreground border border-border hover:bg-accent">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Add Note
              </button>
              <button className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-card text-muted-foreground border border-border hover:bg-accent">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call
              </button>
              <button className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-4 0H4a1 1 0 00-1 1v12a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1h-4z" />
                </svg>
                Schedule Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
