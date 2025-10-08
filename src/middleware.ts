import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
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

  // Check if user is authenticated
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user && !error
  const isLoginPage = req.nextUrl.pathname === '/login'

  // If user is authenticated and trying to access /login, redirect to home
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // If user is not authenticated and trying to access any page other than /login, redirect to /login
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Allow the request to proceed
  return res
}

export const config = {
  matcher: [
    /*
     * Match all routes except Next.js internals and static files
     */
    '/((?!_next|api|favicon.ico).*)',
  ],
}

