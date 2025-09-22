"use client"

import { useState } from "react"
import { LeadsTable, Lead } from "@/components/crm/leads-table"
import { LeadDetails } from "@/components/crm/lead-details"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useLeads } from "@/hooks/use-leads"

export default function CRMPage() {
  const { leads, loading, error, refreshLeads } = useLeads()
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead)
    setShowDetails(true)
  }

  const handleCloseDetails = () => {
    setShowDetails(false)
    setSelectedLead(null)
  }

  const handleEditLead = (lead: Lead) => {
    // Refresh the leads data after editing
    refreshLeads()
    
    // Update the selected lead if it's the same one
    if (selectedLead && selectedLead.id === lead.id) {
      setSelectedLead(lead)
    }
  }

  const handleDeleteLead = (leadId: string) => {
    // TODO: Implement delete functionality
    console.log("Delete lead:", leadId)
    if (selectedLead?.id === leadId) {
      handleCloseDetails()
    }
    // Refresh leads after deletion
    refreshLeads()
  }

  const handleLeadUpdate = (updatedLead: Lead) => {
    // Update the selected lead with the new data
    setSelectedLead(updatedLead)
    // Refresh the leads list
    refreshLeads()
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading leads...</p>
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
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error loading leads: {error}</p>
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-lg font-semibold mb-2 text-card-foreground">Leads</h1>
            <p className="text-muted-foreground text-xs">Manage your sales leads and customer relationships</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full">
          <LeadsTable
            leads={leads}
            onLeadSelect={handleLeadSelect}
            selectedLeadId={selectedLead?.id}
          />
        </div>

        {/* Lead Details Drawer */}
        <Drawer open={showDetails} onOpenChange={setShowDetails} direction="right">
          <DrawerContent className="!w-1/2 !max-w-none bg-background border-l border-border overflow-y-auto overflow-x-hidden">
            {selectedLead && (
              <LeadDetails
                lead={selectedLead}
                onEdit={handleEditLead}
                onDelete={handleDeleteLead}
                onLeadUpdate={handleLeadUpdate}
              />
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
