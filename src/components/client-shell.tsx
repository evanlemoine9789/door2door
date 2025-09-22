"use client"

import { SidebarProvider } from "@/components/ui/sidebar"

interface ClientShellProps {
  children: React.ReactNode
  sidebarWidth?: string
}

export function ClientShell({ children, sidebarWidth = "19rem" }: ClientShellProps) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": sidebarWidth,
      } as React.CSSProperties}
    >
      {children}
    </SidebarProvider>
  )
}



