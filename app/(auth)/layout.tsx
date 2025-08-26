'use client'

import { AuthProvider } from '@/lib/auth/auth-context'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-6">
          {children}
        </div>
      </div>
    </AuthProvider>
  )
}