'use client'

import { useState } from 'react'
import { AuthProvider } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { SidebarNavigation } from '@/components/dashboard/sidebar-navigation'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RoleViewIndicator } from '@/components/admin/role-view'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="flex h-screen bg-background">
          {/* Sidebar Navigation */}
          <SidebarNavigation
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <DashboardHeader />
            
            {/* Role View Indicator */}
            <RoleViewIndicator variant="banner" className="mx-6 mt-4" />
            
            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
              {children}
            </main>
          </div>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  )
}