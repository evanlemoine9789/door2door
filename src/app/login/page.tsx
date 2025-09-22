'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setDebugInfo('')

    try {
      if (isSignUp) {
        // Sign up
        console.log('Attempting sign up with:', { email, password })
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        console.log('Sign up response:', { data, error })

        if (error) {
          console.error('Sign up error:', error)
          throw error
        }

        if (data.user && !data.session) {
          // Email confirmation required
          setDebugInfo(`User created successfully! User ID: ${data.user.id}. Check your email for confirmation.`)
          toast.success('Check your email for the confirmation link!')
          setEmail('')
          setPassword('')
        } else if (data.session) {
          // Auto-confirmed (if email confirmations are disabled)
          setDebugInfo(`User created and logged in! User ID: ${data.user?.id}`)
          toast.success('Account created and logged in successfully!')
          window.location.href = '/dashboard'
        }
      } else {
        // Sign in
        console.log('Attempting sign in with:', { email })
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        console.log('Sign in response:', { data, error })

        if (error) {
          console.error('Sign in error:', error)
          throw error
        }

        setDebugInfo(`Logged in successfully! User ID: ${data.user?.id}`)
        toast.success('Logged in successfully!')
        window.location.href = '/dashboard'
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setDebugInfo(`Error: ${error.message}`)
      toast.error(error.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isSignUp 
              ? 'Enter your details to create your account' 
              : 'Enter your credentials to access your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          
          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-4 p-3 bg-gray-700 rounded text-sm text-gray-300">
              <strong>Debug Info:</strong><br />
              {debugInfo}
            </div>
          )}
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
