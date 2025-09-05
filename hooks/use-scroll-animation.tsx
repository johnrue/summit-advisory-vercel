"use client"

import type React from "react"

import { useEffect, useState } from "react"

export function useScrollAnimation() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    // Add event listener
    window.addEventListener("scroll", handleScroll, { passive: true })

    // Call handler right away to update scroll position
    handleScroll()

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return scrollY
}

export function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.1) {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only trigger once when element comes into view
        if (entry.isIntersecting && !isInView) {
          setIsInView(true)
        }
      },
      {
        threshold,
        rootMargin: "50px",
      },
    )

    const currentRef = ref.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [ref, threshold, isInView])

  return isInView
}
