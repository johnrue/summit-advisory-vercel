"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfidenceIndicatorProps {
  confidence: number // 0-1 confidence score
  field: string
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function ConfidenceIndicator({
  confidence,
  field,
  showLabel = true,
  size = "md",
  className
}: ConfidenceIndicatorProps) {
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getConfidenceIcon = (score: number) => {
    if (score >= 0.8) return CheckCircle
    if (score >= 0.6) return AlertTriangle
    return XCircle
  }

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return "High"
    if (score >= 0.6) return "Medium"
    return "Low"
  }

  const percentage = Math.round(confidence * 100)
  const Icon = getConfidenceIcon(confidence)
  const colorClass = getConfidenceColor(confidence)

  const sizeClasses = {
    sm: "text-xs h-4",
    md: "text-sm h-5",
    lg: "text-base h-6"
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {showLabel && (
        <span className="text-sm text-muted-foreground font-medium">
          {field}:
        </span>
      )}
      <Badge
        variant="outline"
        className={cn(
          "flex items-center space-x-1",
          colorClass,
          sizeClasses[size]
        )}
      >
        <Icon className={iconSizes[size]} />
        <span className="font-medium">
          {getConfidenceText(confidence)}
        </span>
        <span className="text-xs opacity-75">
          ({percentage}%)
        </span>
      </Badge>
    </div>
  )
}

// Re-export for convenience
export { ConfidenceIndicator }