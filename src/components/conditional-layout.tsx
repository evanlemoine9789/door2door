"use client"

import { usePathname } from "next/navigation"
import { ClientShell } from "@/components/client-shell"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { MobileNav } from "@/components/ui/mobile-nav"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  
  // Routes that should not have the sidebar
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.includes(pathname)

  // For auth routes, render without any sidebar/shell
  if (isAuthRoute) {
    return <>{children}</>
  }

  // For all other routes, render with sidebar
  return (
    <>
      <ClientShell>
        <AppSidebar />
        <SidebarInset>
          {!isMobile && (
            <header className="flex h-16 shrink-0 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage />
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
          )}
          {children}
        </SidebarInset>
      </ClientShell>
      <MobileNav />
    </>
  )
}

