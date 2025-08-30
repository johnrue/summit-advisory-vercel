import { NextRequest, NextResponse } from 'next/server'
import { processBulkImport } from '@/lib/services/lead-bulk-import-service'
import { z } from 'zod'

const bulkImportSchema = z.object({
  csvData: z.string().min(1, 'CSV data is required'),
  sourceType: z.enum([
    'website_form',
    'social_media',
    'referral',
    'networking_event', 
    'digital_marketing',
    'cold_outreach',
    'phone_inquiry',
    'walk_in',
    'other'
  ]),
  defaultServiceType: z.string().min(1, 'Default service type is required'),
  defaultPriority: z.enum(['low', 'medium', 'high']).default('medium'),
  autoAssign: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      csvData,
      sourceType,
      defaultServiceType,
      defaultPriority,
      autoAssign
    } = bulkImportSchema.parse(body)

    const result = await processBulkImport({
      csvData,
      sourceType,
      defaultServiceType,
      defaultPriority,
      autoAssign
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message,
          details: result.data // Include validation errors if any
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid input data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Bulk import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process bulk import'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to download CSV template
export async function GET() {
  const csvTemplate = `first_name,last_name,email,phone,service_type,message,estimated_value,priority
John,Doe,john.doe@example.com,5551234567,armed,Looking for security services,10000,high
Jane,Smith,jane.smith@example.com,5559876543,unarmed,Need event security,5000,medium
Bob,Johnson,bob.johnson@example.com,5555551234,executive,Executive protection needed,25000,high`

  return new Response(csvTemplate, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="lead_import_template.csv"'
    }
  })
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}