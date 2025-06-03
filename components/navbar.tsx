"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { COMPANY_INFO } from "@/lib/company-info"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2" onClick={() => window.scrollTo(0, 0)}>
            <Image
              src="/saf-logo-cropped.png"
              alt={`${COMPANY_INFO.name} Logo`}
              width={40}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
        </div>

        <nav className="hidden md:flex gap-6">
          <Link href="/#services" className="text-sm font-medium hover:text-primary transition-colors">
            Services
          </Link>
          <Link href="/#about" className="text-sm font-medium hover:text-primary transition-colors">
            About
          </Link>
          <Link href="/#contact" className="text-sm font-medium hover:text-primary transition-colors">
            Contact
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/#contact">Request a Consultation</Link>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b p-4 flex flex-col gap-4">
          <Link
            href="/#services"
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
            onClick={() => setIsMenuOpen(false)}
          >
            Services
          </Link>
          <Link
            href="/#about"
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
            onClick={() => setIsMenuOpen(false)}
          >
            About
          </Link>
          <Link
            href="/#contact"
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
            onClick={() => setIsMenuOpen(false)}
          >
            Contact
          </Link>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 w-full">
            <Link href="/#contact" onClick={() => setIsMenuOpen(false)} className="w-full text-center">
              Request a Consultation
            </Link>
          </Button>
        </div>
      )}
    </header>
  )
}
