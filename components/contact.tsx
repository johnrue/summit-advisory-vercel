"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COMPANY_INFO } from "@/lib/company-info"
import { analytics } from "@/lib/analytics"
import { submitConsultationRequest } from "@/lib/consultation-service"
import { ConsultationFormData } from "@/lib/types"
import { Mail, Phone, MapPin, Clock, CheckCircle } from "lucide-react"
import AnimatedSection from "@/components/animated-section"

export default function Contact() {
  const [formData, setFormData] = useState<ConsultationFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceType: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Special handling for phone number formatting
    if (name === "phone") {
      // Remove all non-digits
      const digits = value.replace(/\D/g, "")

      // Format as (XXX) XXX-XXXX
      let formattedValue = ""
      if (digits.length <= 3) {
        formattedValue = digits.length > 0 ? `(${digits}` : ""
      } else if (digits.length <= 6) {
        formattedValue = `(${digits.slice(0, 3)}) ${digits.slice(3)}`
      } else {
        formattedValue = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
      }

      setFormData((prev) => ({ ...prev, [name]: formattedValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, serviceType: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Track form submission start
    analytics.contactFormSubmit()

    try {
      // Submit to Supabase
      const result = await submitConsultationRequest(formData)

      if (!result.success) {
        // Supabase submission failed - error details logged in consultation service
        throw new Error(result.error || 'Failed to submit consultation request')
      }

      // Form submitted successfully - removed console.log for production
      setIsSubmitted(true)
      
      // Track successful form submission
      analytics.contactFormSuccess()

      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false)
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          serviceType: "",
          message: "",
        })
      }, 3000)
    } catch (error) {
      // Error submitting form - details tracked via analytics
      // Track form submission error
      analytics.contactFormError(error instanceof Error ? error.message : 'Unknown error')
      // Optionally, set an error state here to inform the user
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="w-full py-12 md:py-24 relative">
      <div className="absolute inset-0 z-0">
        <Image
          src="/contact-security.png"
          alt="Security professional at desk"
          fill
          className="object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-background/80"></div>
      </div>
      <div className="container px-4 md:px-6 relative z-10">
        <AnimatedSection>
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary shadow-sm">
                Contact Us
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Get in Touch</h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Contact us today to discuss your security needs and receive a customized quote.
              </p>
            </div>
          </div>
        </AnimatedSection>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2 mt-12">
          <AnimatedSection direction="left">
            <div className="space-y-6">
              <div className="flex items-start gap-4 hover:bg-card/50 p-3 rounded-lg transition-all duration-300">
                <Phone className="h-6 w-6 text-primary shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-medium">Phone</h3>
                  <a 
                    href={`tel:${COMPANY_INFO.phone.call}`}
                    onClick={() => analytics.phoneClick()}
                    className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    {COMPANY_INFO.phone.call}
                  </a>
                  <p className="text-sm text-muted-foreground">Call or text for immediate assistance</p>
                </div>
              </div>

              <div className="flex items-start gap-4 hover:bg-card/50 p-3 rounded-lg transition-all duration-300">
                <Mail className="h-6 w-6 text-primary shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-medium">Email</h3>
                  <a 
                    href={`mailto:${COMPANY_INFO.email.operations}`}
                    onClick={() => analytics.emailClick()}
                    className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    {COMPANY_INFO.email.operations}
                  </a>
                  <p className="text-sm text-muted-foreground">For operations and general inquiries</p>
                </div>
              </div>

              <div className="flex items-start gap-4 hover:bg-card/50 p-3 rounded-lg transition-all duration-300">
                <MapPin className="h-6 w-6 text-primary shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-medium">Office Location</h3>
                  <p className="text-muted-foreground">
                    {COMPANY_INFO.locations.mainOffice.address}, {COMPANY_INFO.locations.mainOffice.city},{" "}
                    {COMPANY_INFO.locations.mainOffice.state} {COMPANY_INFO.locations.mainOffice.zip}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 hover:bg-card/50 p-3 rounded-lg transition-all duration-300">
                <Clock className="h-6 w-6 text-primary shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-medium">Business Hours</h3>
                  <p className="text-muted-foreground">{COMPANY_INFO.hours.weekday}</p>
                  <p className="text-sm text-muted-foreground">{COMPANY_INFO.hours.emergency}</p>
                </div>
              </div>

              <div className="pt-4">
                <h3 className="font-medium mb-2">Service Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_INFO.locations.serviceAreas.map((area, index) => (
                    <div
                      key={index}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm shadow-sm hover:shadow-md hover:bg-primary/20 transition-all duration-300 cursor-default"
                    >
                      {area}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="right" delay={200}>
            <div
              id="consultation-form"
              className="rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-500"
            >
              <h3 className="text-xl font-bold mb-4">Request a Consultation</h3>
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="rounded-full bg-primary/20 p-3 mb-4">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="text-xl font-semibold mb-2">Thank You!</h4>
                  <p className="text-muted-foreground">
                    Your request has been submitted successfully. We'll contact you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="(123) 456-7890"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Select onValueChange={handleSelectChange} value={formData.serviceType}>
                      <SelectTrigger className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="armed">Armed Security</SelectItem>
                        <SelectItem value="unarmed">Unarmed Security</SelectItem>
                        <SelectItem value="event">Event Security</SelectItem>
                        <SelectItem value="executive">Executive Protection</SelectItem>
                        <SelectItem value="commercial">Commercial Security</SelectItem>
                        <SelectItem value="consulting">Security Consulting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Please describe your security needs..."
                      value={formData.message}
                      onChange={handleChange}
                      className="min-h-[120px] transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-accent/30 transition-all duration-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Request a Consultation"}
                  </Button>
                </form>
              )}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
