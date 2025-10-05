/**
 * Webhook API Helper Functions
 * 
 * This module provides functions for sending lead data to N8N webhooks
 * for automated call summary processing.
 */

// N8N Webhook configuration
const N8N_LEAD_AGENT_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_LEAD_AGENT_WEBHOOK_URL

/**
 * Interface for the lead data payload sent to the webhook
 */
interface LeadWebhookPayload {
  // Core lead information
  lead_id: string
  lead_name: string
  practice_name: string
  phone_number: string
  email?: string
  
  // Location information
  address?: string
  city?: string
  state?: string
  
  // Practice details
  practice_type?: string
  website?: string
  
  // Call outcome information
  call_outcome: string
  outcome_timestamp: string
  
  // Meeting details (if applicable)
  meeting_date?: string
  meeting_time?: string
  booked_with?: string
  
  // Additional metadata
  source: string
  lead_source: string
  assigned_rep?: string
  
  // Timestamps
  created_at?: string
  last_updated?: string
}

/**
 * Sends lead data to the N8N webhook for automated processing
 * @param leadData - The complete lead data from the dialer
 * @param callOutcome - The call outcome selected by the user
 * @returns Promise with webhook response
 */
export const sendLeadToWebhook = async (
  leadData: any, // Using any for flexibility with the Caller interface
  callOutcome: string
): Promise<{ success: true; data: any } | { success: false; error: string }> => {
  try {
    // Validate webhook URL
    if (!N8N_WEBHOOK_URL) {
      console.error('❌ WEBHOOK ERROR: N8N webhook URL not configured')
      throw new Error('N8N webhook URL not configured. Please check NEXT_PUBLIC_N8N_WEBHOOK_URL in .env.local')
    }
    
    // Prepare the payload with ALL lead information
    const payload: LeadWebhookPayload = {
      // Core lead information
      lead_id: leadData.id,
      lead_name: leadData.name,
      practice_name: leadData.practice,
      phone_number: leadData.phone,
      email: leadData.email || undefined,
      
      // Location information
      address: leadData.address || undefined,
      city: leadData.city || undefined,
      state: leadData.state || undefined,
      
      // Practice details
      practice_type: leadData.practiceType || undefined,
      website: leadData.website || undefined,
      
      // Call outcome information
      call_outcome: callOutcome,
      outcome_timestamp: new Date().toISOString(),
      
      // Meeting details (if "Booked" outcome)
      meeting_date: callOutcome === 'Booked' ? leadData.meetingDate || undefined : undefined,
      meeting_time: callOutcome === 'Booked' ? leadData.meetingTime || undefined : undefined,
      booked_with: callOutcome === 'Booked' ? leadData.bookedWith || undefined : undefined,
      
      // Additional metadata
      source: 'dialer',
      lead_source: 'Cold Call',
      assigned_rep: leadData.assignedRep || undefined,
      
      // Timestamps
      created_at: leadData.createdAt || undefined,
      last_updated: new Date().toISOString()
    }
    
    // Make POST request to N8N webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    // Handle response
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Webhook request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`)
    }
    
    // Parse response
    const responseData = await response.json()
    
    return {
      success: true,
      data: responseData
    }
    
  } catch (error) {
    console.error('💥 Error sending lead to webhook:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending to webhook'
    }
  }
}

/**
 * Interface for the generate leads form payload
 */
interface GenerateLeadsPayload {
  practice_type: string
  city: string
  state: string
  timestamp: string
  source: string
}

/**
 * Sends generate leads form data to the N8N webhook for lead generation
 * @param formData - The form data from the generate leads form
 * @returns Promise with webhook response
 */
export const sendGenerateLeadsToWebhook = async (
  formData: {
    practiceType: string
    city: string
    state: string
  }
): Promise<{ success: true; data: any } | { success: false; error: string }> => {
  try {
    // Validate webhook URL
    if (!N8N_LEAD_AGENT_WEBHOOK_URL) {
      console.error('❌ GENERATE LEADS WEBHOOK ERROR: N8N Lead Agent webhook URL not configured')
      throw new Error('N8N Lead Agent webhook URL not configured. Please check NEXT_PUBLIC_N8N_LEAD_AGENT_WEBHOOK_URL in .env.local')
    }
    
    // Prepare the payload
    const payload: GenerateLeadsPayload = {
      practice_type: formData.practiceType,
      city: formData.city,
      state: formData.state,
      timestamp: new Date().toISOString(),
      source: 'generate_leads_form'
    }
    
    // Make POST request to N8N Lead Agent webhook
    const response = await fetch(N8N_LEAD_AGENT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    // Handle response
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Generate leads webhook request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`)
    }
    
    // Parse response
    const responseData = await response.json()
    
    return {
      success: true,
      data: responseData
    }
    
  } catch (error) {
    console.error('💥 Error sending generate leads to webhook:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while sending to webhook'
    }
  }
}

/**
 * Test function to verify webhook connectivity
 * Sends a test payload to ensure the webhook is working
 */
export const testWebhookAPI = async () => {
  // Validate webhook URL
  if (!N8N_WEBHOOK_URL) {
    console.error('❌ WEBHOOK TEST: N8N webhook URL not configured')
    return { 
      success: false, 
      error: 'N8N webhook URL not configured. Please add NEXT_PUBLIC_N8N_WEBHOOK_URL to .env.local' 
    }
  }
  
  // Create test payload
  const testPayload = {
    lead_id: 'test-lead-123',
    lead_name: 'Test Lead',
    practice_name: 'Test Practice',
    phone_number: '+1234567890',
    call_outcome: 'Test',
    outcome_timestamp: new Date().toISOString(),
    source: 'test',
    lead_source: 'Test'
  }
  
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })
    
    if (response.ok) {
      const responseData = await response.json()
      return { success: true, data: responseData }
    } else {
      const errorText = await response.text()
      console.error('❌ Webhook test failed:', errorText)
      return { success: false, error: `Test failed: ${response.status} ${errorText}` }
    }
    
  } catch (error) {
    console.error('❌ Webhook test error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown test error' 
    }
  }
}
