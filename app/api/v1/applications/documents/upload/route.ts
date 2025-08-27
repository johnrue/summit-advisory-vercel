// API Route: Document Upload for Guard Applications
// POST /api/v1/applications/documents/upload
// Handles secure file uploads for application documents

import { NextRequest, NextResponse } from 'next/server'
import { uploadDocument, type DocumentType } from '@/lib/services/document-service'

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const applicationId = formData.get('applicationId') as string
    const documentType = formData.get('documentType') as DocumentType

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: 'Document type is required' },
        { status: 400 }
      )
    }

    // Validate document type
    const validTypes: DocumentType[] = ['resume', 'certification', 'identification', 'additional']
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document type' },
        { status: 400 }
      )
    }

    // Upload document
    const result = await uploadDocument(file, applicationId, documentType)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        { status: 400 }
      )
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error) {
    console.error('Document upload error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Document upload failed'
      },
      { status: 500 }
    )
  }
}