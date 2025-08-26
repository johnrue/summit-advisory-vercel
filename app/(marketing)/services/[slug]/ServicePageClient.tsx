"use client"

import { services } from "@/lib/services-data"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Building,
  Users,
  Calendar,
  Briefcase,
  AlertTriangle,
  FileText,
  ArrowLeft,
  CheckCircle,
  Target,
} from "lucide-react"
import { COMPANY_INFO } from "@/lib/company-info"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import AnimatedSection from "@/components/animated-section"
import ReactMarkdown from "react-markdown"

type Props = {
  params: { slug: string }
}

export default function ServicePageClient({ params }: Props) {
  const service = services.find((service) => service.slug === params.slug)

  if (!service) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <div className="container px-4 md:px-6 py-8 md:py-12">
          <Link
            href="/#services"
            className="inline-flex items-center text-primary hover:text-primary/80 mb-6"
            onClick={() => window.scrollTo(0, 0)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="lg:w-2/3">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                Security Services
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-6">{service.title}</h1>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown>{service.content}</ReactMarkdown>
              </div>

              {/* The Summit Difference - Service Page Version */}
              <AnimatedSection direction="up" delay={200} className="mt-12">
                <div className="bg-primary/5 rounded-lg p-6 border border-primary/10 shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-semibold">The Summit Difference</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Our integrative team brings the comprehensive proficiency required for today's dynamic
                    threat-landscape. We combine cutting-edge technology and the nuance of human expertise to deliver
                    elite, discreet, and proactive security solutions tailored to your unique needs.
                  </p>
                </div>
              </AnimatedSection>
            </div>

            <div className="lg:w-1/3 bg-card border rounded-lg p-6 shadow-lg sticky top-20">
              <div className="flex justify-center mb-6">{service.icon}</div>
              <h3 className="text-xl font-bold mb-4">Key Benefits</h3>
              <ul className="space-y-3">
                {service.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-accent/30 transition-all duration-300"
                  asChild
                >
                  <Link href="/#contact">Request a Consultation</Link>
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>Questions? Contact us at</p>
                <Link href={`mailto:${COMPANY_INFO.email.operations}`} className="text-primary hover:underline">
                  {COMPANY_INFO.email.operations}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer companyInfo={COMPANY_INFO} />
    </>
  )
}
