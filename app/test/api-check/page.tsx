"use client"

// API Test Page - Check if OpenAI API key is working
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, Key } from 'lucide-react'

export default function APITestPage() {
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testOpenAI = async () => {
    setIsChecking(true)
    setResult(null)

    try {
      const response = await fetch('/api/test/openai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      setResult({
        success: false,
        error: 'Network error',
        message: 'Failed to reach API endpoint'
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OpenAI API Configuration Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This will test if your OpenAI API key is properly configured and working.
          </p>

          <Button 
            onClick={testOpenAI}
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing OpenAI API...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Test OpenAI Connection
              </>
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">{result.message}</p>
                      
                      {result.success ? (
                        <div className="text-sm space-y-1">
                          <p><strong>Response:</strong> {result.data?.response}</p>
                          <p><strong>Model:</strong> {result.data?.model}</p>
                          <p className="text-green-600">✅ OpenAI API is working correctly!</p>
                        </div>
                      ) : (
                        <div className="text-sm space-y-1">
                          <p><strong>Error:</strong> {result.error}</p>
                          {result.details && (
                            <div>
                              <p><strong>Type:</strong> {result.details.type}</p>
                              <p><strong>Code:</strong> {result.details.code}</p>
                            </div>
                          )}
                          
                          {result.error?.includes('OPENAI_API_KEY') && (
                            <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                              <p className="text-sm font-medium text-yellow-800">Fix this by:</p>
                              <ol className="text-sm text-yellow-700 mt-1 space-y-1 list-decimal list-inside">
                                <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
                                <li>Add to your .env.local file: <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY=sk-...</code></li>
                                <li>Restart your development server</li>
                              </ol>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}