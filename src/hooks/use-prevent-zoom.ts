"use client"

import { useEffect } from 'react'

export function usePreventZoom() {
  useEffect(() => {
    // Function to prevent zoom on input focus
    const preventZoom = () => {
      // Store original viewport
      const originalViewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content')
      
      // Function to set viewport to prevent zoom
      const setViewport = (content: string) => {
        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport) {
          viewport.setAttribute('content', content)
        }
      }
      
      // Prevent zoom viewport
      const preventZoomViewport = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no'
      
      // Handle focus events
      const handleFocus = (e: FocusEvent) => {
        const target = e.target as HTMLElement
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
          setViewport(preventZoomViewport)
        }
      }
      
      // Handle blur events
      const handleBlur = (e: FocusEvent) => {
        const target = e.target as HTMLElement
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
          // Restore original viewport after a short delay
          setTimeout(() => {
            if (originalViewport) {
              setViewport(originalViewport)
            }
          }, 100)
        }
      }
      
      // Add event listeners
      document.addEventListener('focusin', handleFocus, true)
      document.addEventListener('focusout', handleBlur, true)
      
      // Cleanup
      return () => {
        document.removeEventListener('focusin', handleFocus, true)
        document.removeEventListener('focusout', handleBlur, true)
      }
    }
    
    // Only run on mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      preventZoom()
    }
  }, [])
}
