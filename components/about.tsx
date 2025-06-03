"use client"

import Image from "next/image"
import { COMPANY_INFO } from "@/lib/company-info"
import { CheckCircle, Shield, Users, Target } from "lucide-react"
import { useRef } from "react"
import { useInView } from "@/hooks/use-scroll-animation"
import AnimatedSection from "@/components/animated-section"

export default function About() {
  const imageRef = useRef<HTMLDivElement>(null)
  const isImageInView = useInView(imageRef, 0.1)

  const benefits = [
    "Licensed & insured security professionals",
    "Rigorous background checks for all personnel",
    "Comprehensive training programs",
    "Customized security solutions",
    "24/7 emergency response capability",
    "Serving all major Texas cities",
  ]

  return (
    <section id="about" className="w-full py-12 md:py-24 bg-muted overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <AnimatedSection direction="left">
            <div className="space-y-4">
              <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary shadow-sm">
                About Us
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Texas Security Experts</h2>
              <p className="text-muted-foreground md:text-lg">
                Summit Advisory is a premier security services provider based in{" "}
                {COMPANY_INFO.locations.mainOffice.city}, {COMPANY_INFO.locations.mainOffice.state}. We specialize in
                delivering professional security solutions for businesses, events, and individuals across Texas.
              </p>
              <p className="text-muted-foreground md:text-lg">
                Our team of highly trained security officers are committed to providing exceptional service and ensuring
                the safety and security of our clients. With our extensive experience and dedication to excellence, we
                have established ourselves as a trusted partner in the security industry.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-4">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 hover:bg-background/50 p-2 rounded-lg transition-all duration-300"
                  >
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
          <div
            ref={imageRef}
            className="relative aspect-video overflow-hidden rounded-xl shadow-xl transition-all duration-700"
            style={{
              transform: isImageInView ? "rotateY(0deg)" : "rotateY(10deg)",
              opacity: isImageInView ? 1 : 0.5,
            }}
          >
            <Image
              src="/office-security-briefing.png"
              alt="Summit Advisory Security Team"
              width={800}
              height={600}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/40 to-transparent"></div>
          </div>
        </div>

        {/* The Summit Difference Section */}
        <AnimatedSection direction="up" delay={200} className="mt-16">
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-lg border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">The Summit Difference</h2>
            </div>
            <div className="space-y-6">
              <p className="text-lg">
                The difference is at the Summit. Summit Advisory Firm was strategically founded from top-tier
                cross-disciplinary specialists. Operation capabilities include a broad range of military-based
                competencies spanning from counter terrorism, counter narcotics, human trafficking, specialized private
                security, and law enforcement.
              </p>
              <p className="text-lg">
                This integrative team brings the comprehensive proficiency required for today's dynamic
                threat-landscape. Our approach combines cutting-edge technology and the nuance of human expertise. From
                the Summit, your solutions are clear.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-background/50 p-5 rounded-lg hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-lg">Elite Expertise</h3>
                  </div>
                  <p>Top-tier cross-disciplinary specialists with military and law enforcement backgrounds</p>
                </div>
                <div className="bg-background/50 p-5 rounded-lg hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-lg">Comprehensive Approach</h3>
                  </div>
                  <p>Combining cutting-edge technology with nuanced human expertise</p>
                </div>
                <div className="bg-background/50 p-5 rounded-lg hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-lg">Tailored Solutions</h3>
                  </div>
                  <p>Customized security strategies that adapt to your unique needs</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Mission Statement Section */}
        <AnimatedSection direction="up" delay={300} className="mt-12">
          <div className="bg-primary/10 rounded-xl p-6 md:p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-8 w-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">Our Mission</h2>
            </div>
            <p className="text-lg leading-relaxed">
              Here at Summit Advisory Firm, we strive to provide elite, discreet, and proactive security solutions that
              protect our clients' people, assets, and reputation, while leveraging innovation, discipline, and
              integrity in every operation. We specialize in tailoring our services to seamlessly fit the unique
              lifestyles, environments, and evolving needs of each client—delivering highly customized solutions to
              complex problems in today's dynamic threat-landscape.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
