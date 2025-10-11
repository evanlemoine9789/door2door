import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const checkIsMobile = () => {
      const width = window.innerWidth
      const isMobileWidth = width < MOBILE_BREAKPOINT
      setIsMobile(isMobileWidth)
    }

    // Check immediately
    checkIsMobile()

    // Listen for resize events
    const handleResize = () => {
      checkIsMobile()
    }

    // Listen for orientation changes (mobile devices)
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(checkIsMobile, 100)
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleOrientationChange)
    
    // Also listen to media query changes for better DevTools support
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", checkIsMobile)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleOrientationChange)
      mql.removeEventListener("change", checkIsMobile)
    }
  }, [])

  return isMobile
}
