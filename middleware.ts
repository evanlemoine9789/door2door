import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('🔒 Middleware running for:', req.nextUrl.pathname)
  
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Check if user is authenticated - use getUser for more reliable check
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user && !error
  const isLoginPage = req.nextUrl.pathname === '/login'

  console.log('🔒 Auth check:', { 
    path: req.nextUrl.pathname, 
    isAuthenticated, 
    hasUser: !!user,
    hasError: !!error,
    isLoginPage 
  })

  // If user is authenticated and trying to access /login, redirect to home
  if (isAuthenticated && isLoginPage) {
    console.log('✅ Redirecting authenticated user from /login to /')
    return NextResponse.redirect(new URL('/', req.url))
  }

  // If user is not authenticated and trying to access any page other than /login, redirect to /login
  if (!isAuthenticated && !isLoginPage) {
    console.log('❌ Redirecting unauthenticated user to /login from:', req.nextUrl.pathname)
    return NextResponse.redirect(new URL('/login', req.url))
  }

  console.log('✅ Allowing request to proceed')
  // Allow the request to proceed
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

