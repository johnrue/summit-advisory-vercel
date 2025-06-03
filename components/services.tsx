"use client"

import { Shield, Building, Users, Calendar, Briefcase, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"

export default function Services() {
  const services = [
    {
      icon: <Shield className="h-10 w-10 text-primary" />,
      title: "Armed & Unarmed Security",
      description: "Professional security officers trained to protect your property, assets, and personnel.",
      badge: "Popular",
      slug: "armed-unarmed-security",
    },
    {
      icon: <Building className="h-10 w-10 text-primary" />,
      title: "Commercial Security",
      description: "Comprehensive security solutions for office buildings, retail spaces, and industrial facilities.",
      slug: "commercial-security",
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: "Executive Protection",
      description: "Personalized security services for executives, VIPs, and high-profile individuals.",
      badge: "Premium",
      slug: "executive-protection",
    },
    {
      icon: <Calendar className="h-10 w-10 text-primary" />,
      title: "Event Security",
      description: "Specialized security for corporate events, conferences, concerts, and private functions.",
      slug: "event-security",
    },
    {
      icon: <Briefcase className="h-10 w-10 text-primary" />,
      title: "Loss Prevention",
      description: "Strategic security measures to prevent theft, fraud, and inventory shrinkage.",
      slug: "loss-prevention",
    },
    {
      icon: <FileText className="h-10 w-10 text-primary" />,
      title: "Security Consulting",
      description: "Expert guidance on security protocols, compliance, and best practices.",
      slug: "security-consulting",
    },
  ]

  return (
    <section id="services" className="w-full py-12 md:py-24 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">Our Services</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Comprehensive Security Solutions
            </h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We provide elite, discreet, and proactive security solutions tailored to your unique needs.
            </p>
          </div>
        </div>

        <TooltipProvider>
          <div className="mx-auto max-w-5xl mt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <div key={index}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="block h-full"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    <Card className="border-border hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 h-full flex flex-col cursor-pointer">
                      <CardHeader className="pb-2 relative">
                        <div className="mb-2 transition-transform duration-300 group-hover:scale-110">
                          {service.icon}
                        </div>
                        <CardTitle className="flex items-center gap-2">
                          {service.title}
                          {service.badge && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant={service.badge === "Premium" ? "secondary" : "default"} className="ml-2">
                                  {service.badge}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {service.badge === "Premium" ? "High-end security service" : "Most requested service"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <CardDescription className="text-base">{service.description}</CardDescription>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      </div>
    </section>
  )
}
