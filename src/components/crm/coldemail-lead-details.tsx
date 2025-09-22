"use client"

import { ColdEmailLeadDB, ColdEmailStatus } from "@/lib/supabase-coldemail"
import { ExternalLink, Copy, Mail } from "lucide-react"
import { useState } from "react"

interface ColdEmailLeadDetailsProps {
  lead: ColdEmailLeadDB | null
}

export function ColdEmailLeadDetails({ lead }: ColdEmailLeadDetailsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!lead) return null

  const getStatusBadge = (status: ColdEmailStatus) => {
    switch (status) {
      case 'Interested':
        return 'bg-green-500/60 hover:bg-green-600/70 text-white border border-green-400/30'
      case 'Information Request':
        return 'bg-amber-500/60 hover:bg-amber-600/70 text-white border border-amber-400/30'
      case 'Meeting Request':
        return 'bg-blue-500/60 hover:bg-blue-600/70 text-white border border-blue-400/30'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/20">
        <div className="flex items-center justify-between p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{lead.company || 'Unknown Company'}</h2>
            <p className="text-xs text-muted-foreground mt-1">{lead.name || 'Unknown Contact'}</p>
          </div>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
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
                  Email activity tracking coming soon
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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                <div className="mt-1 flex items-center space-x-2">
                  <a
                    href={`mailto:${lead.lead_email}`}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Send Email
                  </a>
                  <button
                    onClick={() => copyToClipboard(lead.lead_email, 'email')}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-card text-muted-foreground border border-border hover:bg-accent"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {copiedField === 'email' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{lead.lead_email}</p>
              </div>

              {lead.company_url && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company URL</label>
                  <div className="mt-1">
                    <button
                      onClick={() => window.open(lead.company_url?.startsWith('http') ? lead.company_url : `https://${lead.company_url}`, '_blank', 'noopener,noreferrer')}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Visit Site
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sending Account</label>
                <div className="mt-1">
                  <p className="text-xs text-foreground">{lead.email_account || '–'}</p>
                </div>
              </div>

              {lead.message_history_url && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Smartlead Thread</label>
                  <div className="mt-1">
                    <button
                      onClick={() => window.open(lead.message_history_url!, '_blank', 'noopener,noreferrer')}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Thread
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Qualification */}
          <div className="lg:col-span-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Qualification
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${getStatusBadge(lead.status)}`}>
                    {lead.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reply At</label>
                <div className="mt-1">
                  <p className="text-xs text-foreground">{formatDate(lead.reply_at)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign Name</label>
                <div className="mt-1">
                  <p className="text-xs text-foreground">{lead.campaign_name || '–'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Last updated: {formatDate(lead.updated_at)}
          </div>
        </div>
      </div>
    </div>
  )
}
