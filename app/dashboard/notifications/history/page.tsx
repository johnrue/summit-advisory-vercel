"use client"

import { NotificationHistory } from '@/components/notifications/NotificationHistory'

export default function NotificationHistoryPage() {
  // TODO: Get actual user ID from auth context
  const userId = 'current-user-id'

  return (
    <div className="flex-1 space-y-4 p-6">
      <NotificationHistory userId={userId} />
    </div>
  )
}