"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Snowflake, Flame, Search, Menu, Phone, Map, Users, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/auth-provider"

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
    title: "Engaged Leads",
    href: "/crm/leads/engaged-leads",
    icon: Flame,
  },
  {
    title: "Map",
    href: "/map",
    icon: Map,
  },
  {
    title: "Dialer",
    href: "/dialer-mobile",
    icon: Phone,
  },
]

const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    title: "Cold Leads",
    href: "/crm/leads/cold-leads",
    icon: Snowflake,
  },
  {
    title: "Generate Leads",
    href: "/generate-leads",
    icon: Search,
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
  const { signOut } = useAuth()

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
        <div className="flex items-center justify-around h-20 px-2">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors py-2 px-1 min-h-[44px]",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
              </Link>
            )
          })}
          
          {/* Menu Sheet for Additional Options */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors py-2 px-1 min-h-[44px]"
              >
                <Menu className="h-6 w-6" />
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
                  
                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      setOpen(false)
                      signOut()
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors text-red-500 hover:text-red-400 hover:bg-red-500/10 w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Log Out</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      
      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-20" />
    </>
  )
}

