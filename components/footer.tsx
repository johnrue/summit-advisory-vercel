"use client"

import Link from "next/link"
import Image from "next/image"
import type { COMPANY_INFO } from "@/lib/company-info"
import { services } from "@/lib/services-data" // Import services data
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

interface FooterProps {
  companyInfo: typeof COMPANY_INFO
}

export default function Footer({ companyInfo }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full border-t bg-card text-card-foreground">
      <div className="container px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group" onClick={() => window.scrollTo(0, 0)}>
              <Image
                src="/logo.png"
                alt={`${companyInfo.name} Logo`}
                width={120}
                height={40}
                className="h-auto w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Elite professional security solutions tailored to protect our clients in today's evolving threat
              landscape.
            </p>
            <p className="text-sm text-muted-foreground">{companyInfo.license.dps}</p>
          </div>

          <div>
            <h3 className="font-medium mb-4 relative inline-block">
              Quick Links
              <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#services" className="text-sm hover:text-primary transition-colors relative group">
                  Services
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                </Link>
              </li>
              <li>
                <Link href="/#about" className="text-sm hover:text-primary transition-colors relative group">
                  About Us
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="text-sm hover:text-primary transition-colors relative group">
                  Contact
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4">Services</h3>
            <ul className="space-y-2">
              {services
                .filter(service => service.slug !== "risk-assessment")
                .map((service) => (
                <li key={service.slug}>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Link
                        href={`/services/${service.slug}`}
                        className="text-sm hover:text-primary transition-colors"
                        onClick={() => window.scrollTo(0, 0)}
                      >
                        {service.title}
                      </Link>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="flex justify-between space-x-4">
                        <div>
                          <h4 className="text-sm font-semibold">{service.title}</h4>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="text-sm">
                <span className="text-muted-foreground">Phone: </span>
                <Link
                  href={`tel:${companyInfo.phone.textNoFormatting}`}
                  className="hover:text-primary transition-colors"
                >
                  {companyInfo.phone.call}
                </Link>
              </li>
              <li className="text-sm">
                <span className="text-muted-foreground">Email: </span>
                <Link href={`mailto:${companyInfo.email.operations}`} className="hover:text-primary transition-colors">
                  {companyInfo.email.operations}
                </Link>
              </li>
              <li className="text-sm text-muted-foreground">
                <address className="not-italic">
                  {companyInfo.locations.mainOffice.address}, <br />
                  {companyInfo.locations.mainOffice.city}, {companyInfo.locations.mainOffice.state}{" "}
                  {companyInfo.locations.mainOffice.zip}
                </address>
              </li>
            </ul>
          </div>
        </div>

        {/* The Summit Difference - Footer Version */}
        <div className="mt-10 pt-6 border-t border-border/50">
          <h3 className="text-lg font-medium mb-3">The Summit Difference</h3>
          <p className="text-sm text-muted-foreground">
            From the Summit, your solutions are clear. Our integrative team brings comprehensive proficiency required
            for today's dynamic threat-landscape, combining cutting-edge technology and the nuance of human expertise.
          </p>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {companyInfo.name}. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
