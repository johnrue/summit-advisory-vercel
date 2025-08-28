import { NextRequest, NextResponse } from 'next/server'
import { NotificationDeliveryService } from '@/lib/services/notification-delivery-service'

const deliveryService = NotificationDeliveryService.getInstance()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const notificationId = searchParams.get('notificationId')
    const timeRange = {
      from: searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      to: searchParams.get('to') || new Date().toISOString()
    }

    if (notificationId) {
      // Get delivery history for a specific notification
      const result = await deliveryService.getDeliveryHistory(notificationId)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      // Get delivery analytics for a time range
      const result = await deliveryService.getDeliveryAnalytics(timeRange)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        time_range: timeRange
      })
    }
  } catch (error) {
    console.error('Error fetching notification history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}