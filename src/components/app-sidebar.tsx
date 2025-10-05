"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, LogOut, Phone, Snowflake, Flame, Search, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useAuth } from "@/components/providers/auth-provider"

type NavItem = {
  title: string
  href: string
  icon: any
  children?: { title: string; href: string; icon?: any }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Generate Leads",
    href: "/generate-leads",
    icon: Search,
  },
  {
    title: "Leads",
    href: "/crm/leads/engaged-leads",
    icon: Users,
    children: [
      { title: 'Cold Leads', href: '/crm/leads/cold-leads', icon: Snowflake },
      { title: 'Engaged Leads', href: '/crm/leads/engaged-leads', icon: Flame }
    ]
  },
  {
    title: "Dialer",
    href: "/dialer",
    icon: Phone,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <span className="text-sm font-bold">D2D</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Door2Door</span>
                  <span className="text-xs">V2</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              
              if (item.children) {
                // Check if any child route is active to auto-expand the parent
                const isChildActive = item.children.some(child => pathname.startsWith(child.href))
                
                return (
                  <Collapsible 
                    key={item.href} 
                    defaultOpen={isChildActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="font-medium">
                          <Icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                          {item.children.map((child) => {
                            const isActive = pathname === child.href
                            const ChildIcon = child.icon
                            
                            return (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  <Link href={child.href}>
                                    {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              } else {
                const isActive = pathname === item.href
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild className="font-medium">
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }
            })}
          </SidebarMenu>
        </SidebarGroup>
        
        {/* Bottom Section - Team & Logout */}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/settings/team">
                  <Users />
                  <span>Team</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={signOut}
                className="font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
