import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`)
      }

      if (data.user) {
        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile check error:', profileError)
        }

        // If no profile exists, redirect to complete setup
        if (!profile) {
          return NextResponse.redirect(`${requestUrl.origin}/signup?step=complete_profile`)
        }

        // Successful authentication, redirect to dashboard
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_exception`)
    }
  }

  // No code provided or other error
  return NextResponse.redirect(`${requestUrl.origin}/login?error=no_auth_code`)
}

export async function POST(request: NextRequest) {
  return GET(request)
}
