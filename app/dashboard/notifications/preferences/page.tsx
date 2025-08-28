"use client"

import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'

export default function NotificationPreferencesPage() {
  // TODO: Get actual user ID from auth context
  const userId = 'current-user-id'

  return (
    <div className="flex-1 space-y-4 p-6">
      <NotificationPreferences userId={userId} />
    </div>
  )
}