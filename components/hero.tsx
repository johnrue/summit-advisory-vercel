"use client"

import Link from "next/link"
import Image from "next/image"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { COMPANY_INFO } from "@/lib/company-info"
import { Shield, Clock, MapPin, ChevronDown } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import AnimatedSection from "@/components/animated-section"

export default function Hero() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollY = useScrollAnimation()

  const handleScrollDown = () => {
    const servicesSection = document.getElementById("services")
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 relative min-h-[90vh] flex items-center">
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-security.png"
          alt="Professional security officer"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background/95"></div>
      </div>
      <div className="container px-4 md:px-6 relative z-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <AnimatedSection direction="left">
            <div className="space-y-4">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary shadow-sm">
                {COMPANY_INFO.license.dps}
              </div>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Professional Security Services
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Elite professional security solutions tailored to protect our clients in today's evolving threat
                landscape.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-accent/30 transition-all duration-300">
                  <Link href="/#consultation-form">Request a Consultation</Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground shadow-sm hover:shadow-primary/20 transition-all duration-300"
                >
                  <Link href="/#services">Our Services</Link>
                </Button>
              </div>
            </div>
          </AnimatedSection>
          <AnimatedSection direction="right" delay={200}>
            <div className="flex flex-col space-y-4 rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-500">
              <div className="grid gap-6">
                <div className="flex items-start gap-4 hover:bg-muted/50 p-2 rounded-lg transition-colors duration-300">
                  <Shield className="h-6 w-6 text-primary shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-medium">Licensed & Insured</h3>
                    <p className="text-sm text-muted-foreground">
                      Fully licensed security professionals with comprehensive insurance coverage.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 hover:bg-muted/50 p-2 rounded-lg transition-colors duration-300">
                  <Clock className="h-6 w-6 text-primary shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-medium">24/7 Emergency Response</h3>
                    <p className="text-sm text-muted-foreground">{COMPANY_INFO.hours.emergency}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 hover:bg-muted/50 p-2 rounded-lg transition-colors duration-300">
                  <MapPin className="h-6 w-6 text-primary shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-medium">Serving Major Texas Cities</h3>
                    <p className="text-sm text-muted-foreground">{COMPANY_INFO.locations.serviceAreas.join(", ")}</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <button
            onClick={handleScrollDown}
            className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors"
            aria-label="Scroll down"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>
      </div>
    </section>
  )
}
