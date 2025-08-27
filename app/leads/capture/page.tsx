"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import GuardLeadCaptureForm from "@/components/leads/GuardLeadCaptureForm"
import AnimatedSection from "@/components/animated-section"
import type { LeadSource } from "@/lib/types/guard-leads"

function LeadCaptureContent() {
  const searchParams = useSearchParams()
  
  // Get source tracking from URL parameters
  const leadSource = (searchParams.get('source') as LeadSource) || 'website'
  const campaign = searchParams.get('campaign')
  const utm_source = searchParams.get('utm_source')
  const utm_campaign = searchParams.get('utm_campaign')
  
  // Build source details for tracking (client-side only)
  const sourceDetails = {
    campaign,
    utm_source,
    utm_campaign,
    referrer: typeof window !== 'undefined' ? document?.referrer : undefined,
    timestamp: new Date().toISOString()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-security.png"
          alt="Security professionals"
          fill
          className="object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 to-background/85"></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-12">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary shadow-sm mb-4">
                Join Our Team
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Start Your Security Career with Summit Advisory
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Licensed professional security company serving Texas. 
                Express your interest and we'll contact you within 24 hours.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <AnimatedSection direction="left">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Why Choose Summit Advisory?</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2 shrink-0">
                        <span className="text-primary font-semibold">✓</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">Licensed & Certified</h3>
                        <p className="text-muted-foreground text-sm">TX DPS #C29754001 - Fully licensed and compliant</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2 shrink-0">
                        <span className="text-primary font-semibold">✓</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">Competitive Pay</h3>
                        <p className="text-muted-foreground text-sm">Industry-leading compensation and benefits</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2 shrink-0">
                        <span className="text-primary font-semibold">✓</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">Professional Development</h3>
                        <p className="text-muted-foreground text-sm">Training, certifications, and career advancement</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2 shrink-0">
                        <span className="text-primary font-semibold">✓</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">Flexible Scheduling</h3>
                        <p className="text-muted-foreground text-sm">Full-time, part-time, and per-diem opportunities</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Service Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Houston', 'Dallas', 'Austin', 'San Antonio'].map((city) => (
                      <div
                        key={city}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        {city}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right" delay={200}>
              <GuardLeadCaptureForm
                leadSource={leadSource}
                sourceDetails={sourceDetails}
                className="max-w-md mx-auto lg:mx-0"
              />
            </AnimatedSection>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LeadCapturePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <LeadCaptureContent />
    </Suspense>
  )
}