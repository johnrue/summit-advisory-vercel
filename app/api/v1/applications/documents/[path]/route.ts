// API Route: Document Access for Guard Applications
// GET /api/v1/applications/documents/[path]
// Provides secure document access via signed URLs

import { NextRequest, NextResponse } from 'next/server'
import { getDocumentSignedUrl } from '@/lib/services/document-service'

interface RouteParams {
  params: Promise<{
    path: string[]
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Reconstruct the full storage path from URL segments
    const { path } = await params
    const storagePath = path.join('/')

    if (!storagePath) {
      return NextResponse.json(
        { success: false, error: 'Document path is required' },
        { status: 400 }
      )
    }

    // TODO: Add authentication check here
    // For now, allowing access for development
    // In production, verify user has permission to access this document

    // Get signed URL for document access
    const result = await getDocumentSignedUrl(storagePath)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        { status: 404 }
      )
    }

    // Return signed URL
    return NextResponse.json({
      success: true,
      data: {
        signedUrl: result.data,
        expiresIn: 3600 // 1 hour
      },
      message: result.message
    })

  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to access document'
      },
      { status: 500 }
    )
  }
}