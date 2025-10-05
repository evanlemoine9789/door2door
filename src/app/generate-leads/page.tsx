"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { sendGenerateLeadsToWebhook } from "@/lib/webhook-api"

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

export default function GenerateLeadsPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      const result = await sendGenerateLeadsToWebhook(formData)
      
      if (result.success) {
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
        setSubmitStatus({
          type: 'error',
          message: `Failed to send request: ${result.error}`
        })
      }
    } catch (error) {
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
                <Input
                  id="state"
                  placeholder="Enter state name"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
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
