'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function AuthDebug() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-gray-400">Loading auth...</p>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Auth Status:</span>
        {user ? (
          <Badge className="bg-green-600 hover:bg-green-700">Logged In</Badge>
        ) : (
          <Badge variant="destructive">Logged Out</Badge>
        )}
      </div>
      
      {user && (
        <>
          <div className="text-xs text-gray-300">
            <span className="text-gray-400">Email:</span> {user.email}
          </div>
          <div className="text-xs text-gray-300">
            <span className="text-gray-400">ID:</span> {user.id.slice(0, 8)}...
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full text-xs h-7"
          >
            Logout
          </Button>
        </>
      )}
    </div>
  )
}

