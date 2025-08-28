"use client"

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Pen, 
  RotateCcw, 
  Check, 
  X, 
  Info, 
  User, 
  Calendar,
  FileSignature
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DigitalSignatureProps {
  onSignatureCapture: (signatureData: string) => void
  onCancel: () => void
  signerName?: string
  signerTitle?: string
  className?: string
}

interface SignatureMetadata {
  signerName: string
  signerTitle: string
  timestamp: string
  ipAddress: string
  signatureData: string
}

export function DigitalSignature({
  onSignatureCapture,
  onCancel,
  signerName: initialSignerName = '',
  signerTitle: initialSignerTitle = '',
  className
}: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [signerName, setSignerName] = useState(initialSignerName)
  const [signerTitle, setSignerTitle] = useState(initialSignerTitle)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size and styling
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * devicePixelRatio
    canvas.height = rect.height * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)
    
    // Configure drawing style
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    setError(null)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()

    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    setError(null)
  }

  const validateAndSubmit = () => {
    if (!hasSignature) {
      setError('Please provide a signature')
      return
    }

    if (!signerName.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!signerTitle.trim()) {
      setError('Please enter your job title')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    // Capture signature data
    const signatureDataURL = canvas.toDataURL()
    
    // Create comprehensive signature metadata
    const signatureMetadata: SignatureMetadata = {
      signerName: signerName.trim(),
      signerTitle: signerTitle.trim(),
      timestamp: new Date().toISOString(),
      ipAddress: 'client-ip', // Would be populated server-side
      signatureData: signatureDataURL
    }

    // Pass the complete metadata as a JSON string
    onSignatureCapture(JSON.stringify(signatureMetadata))
  }

  const getCurrentDateTime = () => {
    return new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSignature className="h-5 w-5" />
          <span>Digital Signature</span>
        </CardTitle>
        <CardDescription>
          Please sign below to authorize and authenticate your approval decision
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Legal Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your digital signature will be legally binding and used for audit trail purposes. 
            This signature confirms your identity and authorization for this approval decision.
          </AlertDescription>
        </Alert>

        {/* Signer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="signer-name">Full Name *</Label>
            <Input
              id="signer-name"
              placeholder="Enter your full legal name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signer-title">Job Title *</Label>
            <Input
              id="signer-title"
              placeholder="Enter your job title"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Signature Pad */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Signature *</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSignature}
              disabled={!hasSignature}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          
          <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <canvas
              ref={canvasRef}
              className="w-full h-48 cursor-crosshair border rounded-lg bg-white"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-muted-foreground">
                  <Pen className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Sign here using your mouse or touch</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signature Details */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Signature Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Signer: {signerName || 'Not specified'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileSignature className="h-4 w-4 text-muted-foreground" />
              <span>Title: {signerTitle || 'Not specified'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Date/Time: {getCurrentDateTime()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span>Status: {hasSignature ? 'Signed' : 'Pending'}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={validateAndSubmit} disabled={!hasSignature}>
            <Check className="h-4 w-4 mr-2" />
            Confirm Signature
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}