"use client"

import { Lead } from "./leads-table"
import { Edit, Trash2, Save, X, Check } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface LeadDetailsFlexibleProps {
  lead: Lead | null
  onEdit: (lead: Lead) => void
  onDelete: (leadId: string) => void
  onLeadUpdate?: (updatedLead: Lead) => void
  tableName: 'engaged_leads' | 'cold_leads'
}

export function LeadDetailsFlexible({ lead, onEdit, onDelete, onLeadUpdate, tableName }: LeadDetailsFlexibleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details')
  const [notes, setNotes] = useState<any[]>([])
  const [noteText, setNoteText] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)

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
      const month = String(m).padStart(2, '0')
      const day = String(d).padStart(2, '0')
      return `${month}-${day}-${y}`
    }
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}-${day}-${year}`
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
      // Build update object based on table type
      const updateData = tableName === 'cold_leads' ? {
        company_name:  editingLead.company,
        owner_name:    editingLead.contactName,
        practice_type: editingLead.contactRole,
        website:       editingLead.url,
        phone_number:  editingLead.phoneNumber,
        address:       editingLead.address,
        city:          editingLead.city,
        state:         editingLead.state,
        call_date:     editingLead.callDate,
        updated_at:    new Date().toISOString(),
      } : {
        company_name:  editingLead.company,
        owner_name:    editingLead.contactName,
        practice_type: editingLead.contactRole,
        url:           editingLead.url,
        phone_number:  editingLead.phoneNumber,
        meeting_status: mapStatusToSupabase(editingLead.meetingStatus),
        meeting_date:   validatedMeetingDate,   // DATE in DB
        time:           editingLead.meetingTime, // "time" is text in DB
        date_booked:    validatedDateBooked,    // DATE in DB
        assigned_rep:   editingLead.rep,
        booked_with:    editingLead.bookedWith,
        call_recording: editingLead.callRecording,
        address:        editingLead.address,
        city:           editingLead.city,
        state:          editingLead.state,
        call_date:      editingLead.callDate,
        updated_at:     new Date().toISOString(), // ensure it bumps
      }

      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', editingLead.id)
        .select()
        .single()

      if (error) throw error

      // Trust the DB row we just wrote
      const row = data as any
      const updatedLead: Lead = tableName === 'cold_leads' ? {
        id:           row.id,
        company:      row.company_name,
        contactName:  row.owner_name,
        contactRole:  row.practice_type,
        meetingStatus: 'pending' as const,
        meetingDate:   null,
        meetingTime:   null,
        dateBooked:    '',
        phoneNumber:   row.phone_number ?? '',
        url:           row.website ?? '',
        rep:           '',
        bookedWith:    '',
        callRecording: '',
        address:       row.address ?? null,
        city:          row.city ?? null,
        state:         row.state ?? null,
        callDate:      row.call_date ?? null,
        lastUpdated:   row.updated_at,
      } : {
        id:           row.id,
        company:      row.company_name,
        contactName:  row.owner_name,
        contactRole:  row.practice_type,
        meetingStatus: row.meeting_status as Lead['meetingStatus'],
        meetingDate:   row.meeting_date ?? null,
        meetingTime:   row.time ?? '',
        dateBooked:    row.date_booked ?? '',
        phoneNumber:   row.phone_number ?? '',
        url:           row.url ?? '',
        rep:           row.assigned_rep ?? '',
        bookedWith:    row.booked_with ?? '',
        callRecording: row.call_recording ?? '',
        address:       row.address ?? null,
        city:          row.city ?? null,
        state:         row.state ?? null,
        callDate:      row.call_date ?? null,
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
    
    // Different confirmation messages based on table type
    const confirmMessage = tableName === 'cold_leads' 
      ? `Mark ${currentLead.company} as disqualified? This will hide it from your list but keep it in the database to prevent duplicates.`
      : `Delete ${currentLead.company}? This cannot be undone.`
    
    if (!confirm(confirmMessage)) return
    
    try {
      // Soft delete for cold_leads, hard delete for engaged_leads
      if (tableName === 'cold_leads') {
        const { error } = await supabase
          .from(tableName)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', currentLead.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase.from(tableName).delete().eq('id', currentLead.id)
        if (error) throw error
      }
      
      onDelete(currentLead.id)
    } catch (err) {
      console.error('Error deleting lead:', err)
      alert('Failed to delete lead. Please try again.')
    }
  }

  const fetchNotes = async (leadId: string) => {
    try {
      console.log('📋 Fetching notes for lead:', leadId)
      
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
        fetchNotes(lead.id)
      }, 500)
      
    } catch (error) {
      console.error('💥 Unexpected error adding note:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsSavingNote(false)
    }
  }

  // Realtime subscription for notes
  useEffect(() => {
    if (!lead?.id) {
      console.log('📋 No lead selected, clearing notes')
      setNotes([])
      return
    }

    console.log('📋 Setting up realtime subscription for lead:', lead.id)

    // Fetch existing notes
    fetchNotes(lead.id)

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

  const currentLead = isEditing ? editingLead : lead
  if (!currentLead) return null

  return (
    <div className="bg-card rounded-lg border border-border shadow-soft h-full flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            {isEditing ? (
              <input
                type="text"
                value={currentLead.company}
                onChange={(e) => setEditingLead({ ...currentLead, company: e.target.value })}
                className="text-base font-semibold text-card-foreground bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
              />
            ) : (
              <h2 className="text-base font-semibold text-card-foreground">{currentLead.company}</h2>
            )}
            {isEditing ? (
              <input
                type="text"
                value={currentLead.contactName}
                onChange={(e) => setEditingLead({ ...currentLead, contactName: e.target.value })}
                className="text-xs text-muted-foreground mt-1 bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5 w-full"
              />
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{currentLead.contactName}</p>
            )}
            {isEditing ? (
              <input
                type="text"
                value={currentLead.contactRole}
                onChange={(e) => setEditingLead({ ...currentLead, contactRole: e.target.value })}
                className="text-xs text-muted-foreground mt-1 bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5 w-full"
              />
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{currentLead.contactRole}</p>
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

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-border px-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'details'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Details
          {activeTab === 'details' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'notes'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Notes
          {activeTab === 'notes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'details' ? (
          /* Details Tab */
          <div className="flex flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 w-full min-w-0">

              {/* Left Column - Activity */}
              <div className="lg:col-span-1 min-w-0">
                <div className="bg-muted rounded-lg p-4 h-full border border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Activity
                  </h3>
                  <div className="space-y-3">
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      <svg className="w-8 h-8 mx-auto mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Activity tracking coming soon
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Contact Information */}
              <div className="lg:col-span-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Contact Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.url || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, url: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter URL"
                        />
                      ) : (
                        currentLead.url ? (
                          <button
                            onClick={() => window.open(currentLead.url?.startsWith('http') ? currentLead.url : `https://${currentLead.url}`, '_blank', 'noopener,noreferrer')}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Visit Site
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.address || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, address: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter address"
                        />
                      ) : (
                        <p className="text-xs text-foreground">{currentLead.address || '–'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.city || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, city: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter city"
                        />
                      ) : (
                        <p className="text-xs text-foreground">{currentLead.city || '–'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">State</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.state || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, state: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter state"
                        />
                      ) : (
                        <p className="text-xs text-foreground">{currentLead.state || '–'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone Number</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.phoneNumber}
                          onChange={(e) => setEditingLead({ ...currentLead, phoneNumber: e.target.value })}
                          className="w-full text-xs font-mono bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="(XXX) XXX-XXXX"
                        />
                      ) : (
                        <p className="text-xs text-foreground font-mono">{formatPhoneNumber(currentLead.phoneNumber)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Meeting Details */}
              <div className="lg:col-span-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-4 0H4a1 1 0 00-1 1v12a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1h-4z" />
                  </svg>
                  Meeting Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meeting Status</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <select
                          value={currentLead.meetingStatus}
                          onChange={(e) => setEditingLead({ ...currentLead, meetingStatus: e.target.value as Lead['meetingStatus'] })}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-border ${getStatusBadge(currentLead.meetingStatus)} bg-transparent`}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="ran">Ran</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-border ${getStatusBadge(currentLead.meetingStatus)}`}>
                          {currentLead.meetingStatus.charAt(0).toUpperCase() + currentLead.meetingStatus.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Booked</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="date"
                          value={currentLead.dateBooked || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, dateBooked: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                        />
                      ) : (
                        <p className="text-xs text-foreground">{formatDate(currentLead.dateBooked)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meeting Date</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="date"
                          value={currentLead.meetingDate || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, meetingDate: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                        />
                      ) : (
                        <p className="text-xs text-foreground font-medium">{formatDate(currentLead.meetingDate)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meeting Time</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.meetingTime || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, meetingTime: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter meeting time (e.g., 2:00 PM)"
                        />
                      ) : (
                        <p className="text-xs text-foreground">{currentLead.meetingTime || '–'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rep</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.rep || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, rep: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter rep name"
                        />
                      ) : (
                        <p className="text-xs text-foreground">{currentLead.rep || '–'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Booked with</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.bookedWith || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, bookedWith: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter who it was booked with"
                        />
                      ) : (
                        <p className="text-xs text-foreground">{currentLead.bookedWith || '–'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Call Recording</label>
                    <div className="mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentLead.callRecording || ''}
                          onChange={(e) => setEditingLead({ ...currentLead, callRecording: e.target.value })}
                          className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary focus:outline-none px-1 py-0.5"
                          placeholder="Enter call recording URL or ID"
                        />
                      ) : (
                        currentLead.callRecording ? (
                          <button
                            onClick={() => window.open(currentLead.callRecording, '_blank', 'noopener,noreferrer')}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                          >
                            Call Recording
                          </button>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-gray-400 text-gray-200 cursor-not-allowed opacity-50"
                          >
                            Call Recording
                          </button>
                        )
                      )}
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
            <div className="flex-1 overflow-y-auto space-y-3 p-4 pr-2 mb-3">
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
            <div className="flex-shrink-0 border-t border-border p-4">
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
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border px-6 py-3 bg-muted rounded-b-lg flex-shrink-0">
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
    </div>
  )
}
