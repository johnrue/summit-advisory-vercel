'use client'

import { Suspense } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData, rateLimitTracker } from '@/lib/auth/auth-schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, AlertCircle, Lock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitMessage, setRateLimitMessage] = useState('')
  
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleSubmit = async (data: LoginFormData) => {
    // Check rate limiting
    const rateLimitKey = `login:${data.email}`
    
    if (rateLimitTracker.isRateLimited(rateLimitKey)) {
      const timeUntilReset = rateLimitTracker.getTimeUntilReset(rateLimitKey)
      const minutes = Math.ceil(timeUntilReset / 60000)
      setRateLimitMessage(`Too many failed attempts. Please try again in ${minutes} minutes.`)
      setIsRateLimited(true)
      return
    }

    const { error } = await signIn(data.email, data.password)
    
    if (error) {
      // Record failed attempt for rate limiting
      rateLimitTracker.recordAttempt(rateLimitKey)
      
      // Check if now rate limited
      if (rateLimitTracker.isRateLimited(rateLimitKey)) {
        const remaining = rateLimitTracker.getRemainingAttempts(rateLimitKey)
        setRateLimitMessage(`Login failed. ${remaining} attempts remaining before temporary lockout.`)
        setIsRateLimited(true)
      } else {
        form.setError('root', {
          message: error.message || 'Login failed. Please check your credentials and try again.'
        })
      }
    } else {
      router.push(redirectTo)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Sign in
        </CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
          <CardContent className="space-y-4">
            {/* Rate limiting alert */}
            {isRateLimited && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{rateLimitMessage}</AlertDescription>
              </Alert>
            )}
            
            {/* General form errors */}
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            )}

            {/* Email field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={form.formState.isSubmitting || isRateLimited}
            >
              {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
            
            <div className="flex flex-col space-y-2 text-sm text-center text-muted-foreground">
              <div>
                Don't have an account?{' '}
                <Link href="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
              <div>
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}