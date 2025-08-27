// Supabase Edge Function: AI Resume Parser
// Processes uploaded resumes and extracts structured application data using OpenAI

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'
import { OpenAI } from 'https://esm.sh/openai@4.33.0'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Initialize OpenAI client
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
if (!openaiApiKey) {
  throw new Error('OPENAI_API_KEY environment variable is not set')
}
const openai = new OpenAI({ apiKey: openaiApiKey })

// AI prompt for structured data extraction
const AI_PROMPT = `
You are an expert resume parser for a security guard hiring platform. Extract structured data from the provided resume text and return ONLY a valid JSON object with the following structure. Do not include any explanatory text or markdown formatting.

{
  "personal_info": {
    "first_name": "string",
    "last_name": "string", 
    "email": "string",
    "phone": "string",
    "address": {
      "street": "string",
      "city": "string",
      "state": "string (2-letter code)",
      "zip_code": "string"
    }
  },
  "work_experience": [
    {
      "id": "uuid",
      "company": "string",
      "position": "string", 
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or null for current",
      "description": "string",
      "security_related": boolean,
      "duties": ["string array of key duties"],
      "supervisor_name": "string or null",
      "supervisor_contact": "string or null"
    }
  ],
  "certifications": [
    {
      "id": "uuid",
      "name": "string",
      "issuer": "string", 
      "date_obtained": "YYYY-MM-DD",
      "expiry_date": "YYYY-MM-DD or null",
      "certification_type": "security-guard|armed-security|cpr-first-aid|fire-safety|defensive-driving|surveillance|crowd-control|other"
    }
  ],
  "education": [
    {
      "id": "uuid",
      "school": "string",
      "degree": "string",
      "field": "string",
      "graduation_date": "YYYY-MM-DD or null",
      "gpa": number or null
    }
  ],
  "skills": ["string array of relevant skills"],
  "references": [
    {
      "id": "uuid", 
      "name": "string",
      "company": "string",
      "position": "string",
      "phone": "string",
      "email": "string",
      "relationship": "supervisor|colleague|mentor|client|personal"
    }
  ]
}

Instructions:
- Generate UUIDs for all id fields using crypto.randomUUID()
- Mark work experience as security_related: true if it involves security, law enforcement, military, or related fields
- Use null for missing information, don't guess or fabricate data
- Standardize phone numbers to format: (XXX) XXX-XXXX
- Extract only factual information present in the resume
- For dates, use YYYY-MM-DD format or null if not specified
- Classify certifications according to the specified types
- Return confidence scores for each major section based on data quality and completeness

Also provide confidence scores (0.0 to 1.0) for each section:
{
  "confidence_scores": {
    "personal_info": 0.95,
    "work_experience": 0.85, 
    "certifications": 0.70,
    "education": 0.90,
    "skills": 0.80,
    "overall": 0.84
  }
}

Return the complete JSON object with both extracted_fields and confidence_scores.
`

interface ResumeParsingRequest {
  document_path: string
  application_id: string
}

interface ParsedResumeData {
  extracted_fields: any
  confidence_scores: {
    personal_info: number
    work_experience: number
    certifications: number
    education: number
    skills: number
    overall: number
  }
}

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      })
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { document_path, application_id }: ResumeParsingRequest = await req.json()

    if (!document_path || !application_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    // Download document from Supabase Storage
    console.log('Downloading document:', document_path)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('guard-applications')
      .download(document_path)

    if (downloadError) {
      throw new Error(`Failed to download document: ${downloadError.message}`)
    }

    // Extract text from document based on file type
    let documentText: string = ''
    
    if (document_path.toLowerCase().endsWith('.pdf')) {
      // For PDF processing, we'll need a PDF text extraction library
      // For now, using a placeholder - in production, use pdf-parse or similar
      documentText = await extractTextFromPDF(fileData)
    } else if (document_path.toLowerCase().endsWith('.docx')) {
      // For DOCX processing, we'll need a Word document parser
      // For now, using a placeholder - in production, use mammoth or similar  
      documentText = await extractTextFromDOCX(fileData)
    } else {
      throw new Error('Unsupported file type. Only PDF and DOCX are supported.')
    }

    if (!documentText || documentText.trim().length === 0) {
      throw new Error('No text content extracted from document')
    }

    console.log('Extracted text length:', documentText.length)

    // Process with OpenAI
    console.log('Sending to OpenAI for processing...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: AI_PROMPT },
        { role: 'user', content: `Please extract structured data from this resume:\n\n${documentText}` }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 4000,
      timeout: 60000 // 60 second timeout
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    console.log('AI Response received, parsing JSON...')

    // Parse AI response as JSON
    let parsedData: ParsedResumeData
    try {
      parsedData = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse)
      throw new Error('Invalid JSON response from AI parser')
    }

    const processingTime = Date.now() - startTime

    // Store parsed data in database
    console.log('Storing parsed data in database...')
    const aiParsedData = {
      extraction_timestamp: new Date().toISOString(),
      processing_model: 'gpt-4',
      confidence_scores: parsedData.confidence_scores,
      extracted_fields: parsedData.extracted_fields,
      manual_overrides: [],
      parsing_errors: [],
      processing_time_ms: processingTime,
      text_extraction_success: true
    }

    const { error: updateError } = await supabase
      .from('guard_leads')
      .update({
        ai_parsed_data: aiParsedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', application_id)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error(`Failed to store parsed data: ${updateError.message}`)
    }

    console.log('Resume parsing completed successfully')

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          parsed_data: parsedData.extracted_fields,
          confidence_scores: parsedData.confidence_scores,
          processing_time_ms: processingTime
        },
        message: 'Resume parsed successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Resume parsing error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Resume parsing failed'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})

// Text extraction functions - Production implementations

async function extractTextFromPDF(fileData: Blob): Promise<string> {
  try {
    console.log('Starting PDF text extraction with pdf-parse')
    
    // Import pdf-parse via ESM for Deno
    const pdfParse = (await import('https://esm.sh/pdf-parse@1.1.1')).default
    
    // Convert Blob to ArrayBuffer then to Buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    
    // Extract text using pdf-parse
    const pdfData = await pdfParse(buffer)
    
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('No text content found in PDF')
    }
    
    console.log(`PDF text extraction successful. Text length: ${pdfData.text.length}`)
    return pdfData.text
    
  } catch (error) {
    console.error('PDF text extraction failed:', error)
    throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function extractTextFromDOCX(fileData: Blob): Promise<string> {
  try {
    console.log('Starting DOCX text extraction with mammoth')
    
    // Import mammoth via ESM for Deno
    const mammoth = await import('https://esm.sh/mammoth@1.10.0')
    
    // Convert Blob to ArrayBuffer for mammoth
    const arrayBuffer = await fileData.arrayBuffer()
    
    // Extract raw text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    if (result.messages && result.messages.length > 0) {
      console.log('Mammoth processing messages:', result.messages)
    }
    
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No text content found in DOCX')
    }
    
    console.log(`DOCX text extraction successful. Text length: ${result.value.length}`)
    return result.value
    
  } catch (error) {
    console.error('DOCX text extraction failed:', error)
    throw new Error(`DOCX text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}