"use client"

import { useState } from "react"
import { ColdLeadsTable, ColdLead } from "@/components/crm/cold-leads-table"
import { LeadDetailsFlexible } from "@/components/crm/lead-details-flexible"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useColdLeads } from "@/hooks/use-cold-leads"
import { supabase } from "@/lib/supabase"
import { toast } from 'sonner'

export default function ColdLeadsPage() {
  const { 
    leads, 
    loading, 
    error, 
    refreshLeads,
    currentPage,
    pageSize,
    totalPages,
    totalLeads,
    fetchLeads,
    setPageSize,
    filters,
    updateFilters
  } = useColdLeads()
  const [selectedLead, setSelectedLead] = useState<ColdLead | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])

  const handleLeadSelect = (lead: ColdLead) => {
    setSelectedLead(lead)
    setShowDetails(true)
  }

  const handleCloseDetails = () => {
    setShowDetails(false)
    setSelectedLead(null)
  }

  const handleEditLead = (lead: ColdLead) => {
    // Refresh the leads data after editing
    refreshLeads()
    
    // Update the selected lead if it's the same one
    if (selectedLead && selectedLead.id === lead.id) {
      setSelectedLead(lead)
    }
  }

  const handleDeleteLead = (leadId: string) => {
    // TODO: Implement delete functionality
    if (selectedLead?.id === leadId) {
      handleCloseDetails()
    }
    // Refresh leads after deletion
    refreshLeads()
  }

  const handleLeadUpdate = (updatedLead: ColdLead) => {
    // Update the selected lead with the new data
    setSelectedLead(updatedLead)
    // Refresh the leads list
    refreshLeads()
  }

  const handlePageChange = (newPage: number) => {
    fetchLeads(newPage, pageSize)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    fetchLeads(1, newPageSize) // Reset to page 1 when changing page size
  }

  const handleBulkDelete = async (leadIds: string[]) => {
    try {
      
      // Soft delete leads from Supabase (set deleted_at timestamp)
      const { error } = await supabase
        .from('cold_leads')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', leadIds)

      if (error) {
        console.error('❌ Error soft deleting cold leads:', error)
        throw new Error(`Failed to delete leads: ${error.message}`)
      }
      
      // Show success toast
      toast.success(`Successfully deleted ${leadIds.length} lead${leadIds.length > 1 ? 's' : ''}`)
      
      // Refresh the leads list
      refreshLeads()
      
      // Close details if the deleted lead was selected
      if (selectedLead && leadIds.includes(selectedLead.id)) {
        setShowDetails(false)
        setSelectedLead(null)
      }
      
    } catch (error) {
      console.error('💥 Error in bulk delete:', error)
      throw error // Re-throw to let the table handle the error display
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading cold leads...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error loading cold leads: {error}</p>
              <Button onClick={refreshLeads} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
      <div className="container mx-auto px-4 py-4">
        {/* Main Content */}
        <div className="w-full">
          <ColdLeadsTable
            leads={leads}
            onLeadSelect={handleLeadSelect}
            selectedLeadId={selectedLead?.id}
            currentPage={currentPage}
            totalPages={totalPages}
            totalLeads={totalLeads}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
            selectedLeadIds={selectedLeadIds}
            onSelectionChange={setSelectedLeadIds}
            onBulkDelete={handleBulkDelete}
            filters={filters}
            onFiltersChange={updateFilters}
          />
        </div>

        {/* Lead Details Drawer */}
        <Drawer open={showDetails} onOpenChange={setShowDetails} direction="right">
          <DrawerContent className="!w-1/2 !max-w-none bg-background border-l border-border overflow-y-auto overflow-x-hidden">
            <DrawerTitle className="sr-only">Lead Details</DrawerTitle>
            {selectedLead && (
              <LeadDetailsFlexible
                lead={selectedLead}
                onEdit={handleEditLead}
                onDelete={handleDeleteLead}
                onLeadUpdate={handleLeadUpdate}
                tableName="cold_leads"
              />
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
