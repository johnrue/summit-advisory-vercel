"use client"

import { useEffect } from "react"
import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import Services from "@/components/services"
import About from "@/components/about"
import Contact from "@/components/contact"
import Footer from "@/components/footer"
import { COMPANY_INFO } from "@/lib/company-info"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function Home() {
  // Smooth scroll to section when clicking on anchor links
  useEffect(() => {
    // Handle anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const href = target.closest("a")?.getAttribute("href")

      if (href?.startsWith("/#")) {
        e.preventDefault()
        const id = href.substring(2)
        const element = document.getElementById(id)

        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
          // Update URL without page reload
          window.history.pushState({}, "", href)
        }
      }
    }

    document.addEventListener("click", handleAnchorClick)

    // Check if URL contains a hash on page load (for navigation from other pages)
    const hash = window.location.hash
    if (hash && hash.startsWith("#")) {
      const id = hash.substring(1)
      const element = document.getElementById(id)

      if (element) {
        // Small delay to ensure the page is fully loaded
        setTimeout(() => {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }, 100)
      }
    }

    return () => {
      document.removeEventListener("click", handleAnchorClick)
    }
  }, [])

  return (
    <TooltipProvider>
      <main className="min-h-screen flex flex-col">
        <Navbar />
        <Hero />
        <Services />
        <About />
        <Contact />
        <Footer companyInfo={COMPANY_INFO} />
      </main>
    </TooltipProvider>
  )
}
