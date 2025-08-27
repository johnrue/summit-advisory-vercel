// Simple OpenAI API Test - Just check if the API key works
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    // Check if API key exists
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY environment variable not found',
        message: 'Please set your OpenAI API key in .env.local'
      }, { status: 400 })
    }

    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid OpenAI API key format',
        message: 'API key should start with sk-'
      }, { status: 400 })
    }

    // Test a simple API call
    const openai = new OpenAI({ apiKey })
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    })

    return NextResponse.json({
      success: true,
      data: {
        response: response.choices[0]?.message?.content,
        model: response.model
      },
      message: 'OpenAI API working correctly'
    })

  } catch (error: any) {
    console.error('OpenAI test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: {
        type: error.type,
        code: error.code,
        status: error.status
      },
      message: 'OpenAI API test failed'
    }, { status: 500 })
  }
}