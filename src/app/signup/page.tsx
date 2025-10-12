'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page immediately
    router.replace('/login')
  }, [router])

  // Show nothing while redirecting
  return null
}
