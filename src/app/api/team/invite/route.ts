import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, role, organizationId } = await request.json()

    if (!email || !organizationId) {
      return NextResponse.json(
        { error: 'Email and organization ID are required' },
        { status: 400 }
      )
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'

    // For now, we'll create the user profile directly
    // In production, you'd want to use Supabase Admin API or a server-side function
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    if (authData.user) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: authData.user.id,
            email,
            full_name: email.split('@')[0], // Use email prefix as name
            organization_id: organizationId,
            role: role || 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Team member invited successfully',
        userId: authData.user.id
      })
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error in team invite API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
