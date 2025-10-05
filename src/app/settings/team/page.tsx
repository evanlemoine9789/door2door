'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Users, UserPlus, Mail, Shield, Crown } from 'lucide-react'

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
  avatar_url?: string
}

interface Organization {
  id: string
  name: string
  owner_id: string
}

export default function TeamManagementPage() {
  const { user } = useAuth()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  useEffect(() => {
    fetchTeamData()
  }, [user])

  const fetchTeamData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get current user's organization
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        toast.error('Failed to load team data')
        return
      }

      if (!userProfile?.organization_id) {
        toast.error('No organization found. Please contact support.')
        return
      }

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userProfile.organization_id)
        .single()

      if (orgError) {
        console.error('Error fetching organization:', orgError)
        toast.error('Failed to load organization data')
        return
      }

      setOrganization(orgData)

      // Get all team members in the organization
      const { data: members, error: membersError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })

      if (membersError) {
        console.error('Error fetching team members:', membersError)
        toast.error('Failed to load team members')
        return
      }

      setTeamMembers(members || [])
    } catch (error) {
      console.error('Error in fetchTeamData:', error)
      toast.error('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail || !organization) return

    try {
      setInviteLoading(true)

      // Use the API route to handle user creation
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId: organization.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite team member')
      }

      toast.success('Team member invited successfully!')
      setInviteEmail('')
      setInviteRole('member')
      setIsInviteDialogOpen(false)
      
      // Refresh team data
      fetchTeamData()
    } catch (error: any) {
      console.error('Error inviting member:', error)
      toast.error(error.message || 'Failed to invite team member')
    } finally {
      setInviteLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <Users className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default' as const
      case 'admin':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members for {organization?.name}
            </p>
          </div>
          
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-card-foreground">Invite Team Member</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Send an invitation to join your organization
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-card-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-card-foreground">Role</Label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                    className="w-full p-2 bg-background border border-border text-foreground rounded-md focus:border-primary focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                  className="border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteMember}
                  disabled={inviteLoading || !inviteEmail}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {inviteLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Members Table */}
        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Members ({teamMembers.length})
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage your organization's team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No team members found</p>
                <p className="text-muted-foreground/70 text-sm">Invite members to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Member</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Role</TableHead>
                      <TableHead className="text-muted-foreground">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id} className="border-border hover:bg-muted/50">
                        <TableCell className="text-foreground">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{member.full_name}</span>
                            {member.id === user?.id && (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell className="text-foreground">
                          <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center space-x-1 w-fit">
                            {getRoleIcon(member.role)}
                            <span className="capitalize">{member.role}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </ProtectedRoute>
  )
}
