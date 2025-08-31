// Simple AI File Parser Test API
// Uses OpenAI Responses API for proper PDF/DOCX processing

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const AI_PROMPT = `
You are Summit Advisory's AI resume analysis system. Extract structured data from this security guard resume/CV document and return ONLY a valid JSON object. Do not include any explanatory text or markdown formatting.

Return this exact structure:
{
  "personal_info": {
    "first_name": "string",
    "last_name": "string",
    "email": "string", 
    "phone": "string",
    "address": {
      "street": "string",
      "city": "string", 
      "state": "string",
      "zip_code": "string"
    }
  },
  "work_experience": [
    {
      "company": "string",
      "position": "string",
      "start_date": "YYYY-MM-DD or approximate",
      "end_date": "YYYY-MM-DD or null if current",
      "description": "string",
      "security_related": true/false
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date_obtained": "YYYY-MM-DD or approximate",
      "expiry_date": "YYYY-MM-DD or null",
      "certification_type": "security-guard|armed-security|cpr-first-aid|other"
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "field": "string", 
      "graduation_date": "YYYY-MM-DD or approximate"
    }
  ],
  "skills": ["array of relevant skills"],
  "references": [
    {
      "name": "string",
      "company": "string",
      "position": "string",
      "phone": "string",
      "email": "string"
    }
  ],
  "confidence_scores": {
    "personal_info": 0.95,
    "work_experience": 0.85,
    "certifications": 0.70,
    "education": 0.90,
    "skills": 0.80,
    "overall": 0.84
  }
}

Instructions:
- Use null for missing information, don't fabricate data
- Mark work_experience as security_related: true if it involves security, law enforcement, military
- Provide realistic confidence scores (0.0 to 1.0) based on data clarity
- Return ONLY the JSON object, no other text
`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type - All types accepted but only PDF works reliably with AI parsing
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ]
    
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Please upload PDF, DOCX, or image files.` },
        { status: 400 }
      )
    }

    // Check if file is PDF for AI parsing capability
    const isPDF = file.type === 'application/pdf'
    if (!isPDF) {
      return NextResponse.json({
        success: false,
        error: 'AI parsing only works with PDF files. Please upload a PDF resume for automatic parsing, or upload DOCX/images and fill forms manually.',
        message: 'PDF required for AI parsing'
      }, { status: 400 })
    }

    const startTime = Date.now()

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64Content = Buffer.from(bytes).toString('base64')

    // Use Summit AI engine for PDF resume analysis
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: file.name,
              file_data: `data:${file.type};base64,${base64Content}`
            },
            {
              type: "input_text", 
              text: AI_PROMPT
            }
          ]
        }
      ]
    })

    const aiResponse = response.output_text || response.output
    if (!aiResponse) {
      throw new Error('No response from Summit AI engine')
    }

    // Handle both string and array response formats
    const responseText = typeof aiResponse === 'string' 
      ? aiResponse 
      : Array.isArray(aiResponse) 
        ? JSON.stringify(aiResponse)
        : String(aiResponse)

    // Parse the JSON response
    let parsedData
    try {
      parsedData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      throw new Error('Invalid response format from Summit AI')
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        extracted_fields: parsedData,
        confidence_scores: parsedData.confidence_scores,
        processing_time_ms: processingTime,
        processing_model: 'summit-ai-engine',
        file_info: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      },
      message: 'Resume analyzed successfully by Summit AI'
    })

  } catch (error) {
    console.error('AI parsing error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Summit AI parsing failed'
    }, { status: 500 })
  }
}