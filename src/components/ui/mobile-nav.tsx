"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Snowflake, Flame, Search, Menu, Phone, Map, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

type NavItem = {
  title: string
  href: string
  icon: any
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Cold Leads",
    href: "/crm/leads/cold-leads",
    icon: Snowflake,
  },
  {
    title: "Engaged Leads",
    href: "/crm/leads/engaged-leads",
    icon: Flame,
  },
  {
    title: "Generate Leads",
    href: "/generate-leads",
    icon: Search,
  },
]

const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    title: "Dialer",
    href: "/dialer",
    icon: Phone,
  },
  {
    title: "Map",
    href: "/map",
    icon: Map,
  },
  {
    title: "Team Settings",
    href: "/settings/team",
    icon: Users,
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  // Don't show on auth pages
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.includes(pathname)

  if (!isMobile || isAuthRoute) {
    return null
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            )
          })}
          
          {/* Menu Sheet for Additional Options */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <div className="py-4">
                <SheetTitle className="text-lg font-semibold mb-4">More Options</SheetTitle>
                <div className="space-y-2">
                  {SECONDARY_NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          isActive 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-accent"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      
      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-16" />
    </>
  )
}

