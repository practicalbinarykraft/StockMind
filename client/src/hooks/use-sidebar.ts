import { useState, useEffect } from "react"

const SIDEBAR_STORAGE_KEY = "sidebar-open"

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(() => {
    // Check localStorage on mount
    if (typeof window === "undefined") return true
    
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (saved !== null) {
      return JSON.parse(saved)
    }
    
    // Default: open on desktop, closed on mobile
    return window.innerWidth >= 1024
  })

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < 768
  })

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // Auto-close on mobile, auto-open on desktop
      if (mobile) {
        setIsOpen(false)
      } else if (window.innerWidth >= 1024) {
        setIsOpen(true)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const toggle = () => {
    setIsOpen((prev) => {
      const newValue = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newValue))
      return newValue
    })
  }

  const open = () => {
    setIsOpen(true)
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(true))
  }

  const close = () => {
    setIsOpen(false)
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(false))
  }

  return {
    isOpen,
    isMobile,
    toggle,
    open,
    close,
    setIsOpen,
  }
}

