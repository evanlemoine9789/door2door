"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { sendGenerateLeadsToWebhook } from "@/lib/webhook-api"
import { useAuth } from "@/components/providers/auth-provider"
import { supabase } from "@/lib/supabase"

const practiceTypes = [
  "Academic Dermatology",
  "Academic Plastic Surgery",
  "Bariatric Program",
  "Burn Center",
  "Chiropractic",
  "Concierge Medicine",
  "Day Spa",
  "Dental",
  "Dermatology",
  "ENT",
  "Facial Plastic Surgery",
  "Family Practice",
  "Gym",
  "Hair Removal Clinic",
  "Hair Restoration Clinic",
  "Internal Medicine",
  "LGBTQ Health Clinic",
  "Medspa",
  "Men's Health Clinic",
  "Mobile Injector",
  "OBGYN",
  "Oncology Survivorship Clinic",
  "Ophthalmology",
  "Optometry",
  "Oral Surgery",
  "Pain Management",
  "Physical Therapy",
  "Plastic Surgery",
  "Podiatry",
  "Regenerative Medicine Clinic",
  "Resort Spa",
  "Scar Revision Center",
  "Sports Medicine",
  "Tattoo Studio",
  "Teledermatology",
  "Urgent Care",
  "Urology",
  "Urogynecology",
  "Vein Clinic",
  "Weight Loss Clinic",
  "Women's Health Clinic"
]

const usStates = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming"
]

export default function GenerateLeadsPage() {
  const { user } = useAuth()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    practiceType: "",
    city: "",
    state: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: "" })

  // Fetch user's organization_id on mount
  useEffect(() => {
    async function fetchUserOrganization() {
      if (!user) {
        console.error('⚠️ No user found for generate leads')
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('❌ Error fetching user organization:', error)
          setSubmitStatus({
            type: 'error',
            message: 'Unable to fetch user organization. Please try again.'
          })
          return
        }

        if (data?.organization_id) {
          console.log('✅ Organization ID loaded:', data.organization_id)
          setOrganizationId(data.organization_id)
        } else {
          console.error('⚠️ User has no organization assigned')
          setSubmitStatus({
            type: 'error',
            message: 'User has no organization assigned. Please contact support.'
          })
        }
      } catch (err) {
        console.error('💥 Exception fetching organization:', err)
      }
    }

    fetchUserOrganization()
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handlePracticeTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      practiceType: value
    }))
  }

  const handleStateChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      state: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    // Validate user and organization
    if (!user) {
      setSubmitStatus({
        type: 'error',
        message: 'You must be logged in to generate leads.'
      })
      setIsSubmitting(false)
      return
    }

    if (!organizationId) {
      setSubmitStatus({
        type: 'error',
        message: 'Unable to determine your organization. Please try again or contact support.'
      })
      setIsSubmitting(false)
      return
    }

    try {
      console.log('🚀 Starting lead generation request with data:', {
        ...formData,
        user_id: user.id,
        organization_id: organizationId
      })
      const result = await sendGenerateLeadsToWebhook({
        ...formData,
        user_id: user.id,
        organization_id: organizationId
      })
      
      if (result.success) {
        console.log('✅ Lead generation request successful:', result.data)
        setSubmitStatus({
          type: 'success',
          message: 'Lead generation request sent successfully! Your N8N workflow has been triggered.'
        })
        // Reset form
        setFormData({
          practiceType: "",
          city: "",
          state: ""
        })
      } else {
        console.error('❌ Lead generation request failed:', result.error)
        setSubmitStatus({
          type: 'error',
          message: `Failed to send request: ${result.error}`
        })
      }
    } catch (error) {
      console.error('💥 Unexpected error in handleSubmit:', error)
      setSubmitStatus({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Generate Leads
            </CardTitle>
            <CardDescription>
              Trigger an N8N workflow to generate new leads for your campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="practice-type">Practice Type</Label>
                <Select value={formData.practiceType} onValueChange={handlePracticeTypeChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a practice type" />
                  </SelectTrigger>
                  <SelectContent>
                    {practiceTypes.map((practiceType) => (
                      <SelectItem key={practiceType} value={practiceType}>
                        {practiceType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter city name"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={formData.state} onValueChange={handleStateChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {usStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              
              {/* Status Message */}
              {submitStatus.type && (
                <div className={`flex items-center gap-2 p-3 rounded-md ${
                  submitStatus.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {submitStatus.type === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">{submitStatus.message}</span>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Generate Leads
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
