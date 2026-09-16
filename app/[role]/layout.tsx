"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Menu, Settings, UserCircle, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { getNavItemsForRole, type UserRole, type NavItem as NavItemType } from "@/lib/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/lib/auth-context"
import { Logo } from "@/components/logo"
import { TokenExpirationWarning } from "@/components/token-expiration-warning"

interface AdminLayoutProps {
  children: React.ReactNode
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

const AdminLayout = ({ children, params }: AdminLayoutProps) => {
  let resolvedParams: { role: UserRole }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role } = resolvedParams
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Normalize role for navigation
  const normalizedRole = role.toLowerCase() as UserRole
  const navigationItems = React.useMemo(() => getNavItemsForRole(normalizedRole), [normalizedRole])
  // Sidebar state management
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    // Logout confirmation dialog state
  const [showLogoutConfirmation, setShowLogoutConfirmation] = React.useState(false)

  // Handle logout confirmation
  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true)
  }

  const handleLogoutConfirm = () => {
    setShowLogoutConfirmation(false)
    logout()
  }

  const handleLogoutCancel = () => {
    setShowLogoutConfirmation(false)
  }

  // Toggle functions
  const toggleSidebar = React.useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  const toggleMobileMenu = React.useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev)
  }, [])

  const NavItem = React.memo<{ item: NavItemType; isCollapsed: boolean }>(({ item, isCollapsed }) => {
    const isActive =
      pathname === item.href || (item.href !== `/${normalizedRole}/dashboard` && pathname.startsWith(item.href))

    const linkContent = (
      <>
        <item.icon className="h-5 w-5 text-white flex-shrink-0" />
        {!isCollapsed && <span className="truncate text-white">{item.title}</span>}
      </>
    )

    return (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-4 py-3 mx-2 transition-all hover:bg-white/10",
          isActive ? "bg-white/20 text-white font-medium" : "text-white/90 hover:text-white",
          isCollapsed ? "justify-center px-2" : "",
        )}
        prefetch={false}
        onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu on navigation
      >
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3">{linkContent}</div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          linkContent
        )}
      </Link>
    )
  })

  NavItem.displayName = "NavItem"
  const LogoutButton = React.memo<{ isCollapsed: boolean }>(({ isCollapsed }) => (
    <button
      onClick={handleLogoutClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-4 py-3 mx-2 transition-all hover:bg-white/10 text-white/90 hover:text-white w-full",
        isCollapsed ? "justify-center px-2" : "",
      )}
    >
      <LogOut className="h-5 w-5 text-white flex-shrink-0" />
      {!isCollapsed && <span className="truncate text-white">Log out</span>}
    </button>
  ))

  LogoutButton.displayName = "LogoutButton"

  const SidebarContent = React.memo<{ isCollapsed?: boolean }>(({ isCollapsed = false }) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#6366f1] via-[#4f46e5] to-[#3730a3]">
      {/* Logo Section */}
      <div className="flex items-center justify-center px-4 py-6">
        <Link href={`/${normalizedRole}/dashboard`} className="hover:opacity-80 transition-opacity" prefetch={false}>
          <Logo collapsed={isCollapsed} />
        </Link>
      </div>

      {/* Navigation */}
      <div className="scrollbar-hide flex-1 overflow-y-auto py-2">
        <nav className="grid items-start gap-1">
          {navigationItems.map((item) => (
            <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>
      </div>

      {/* Logout at bottom */}
      <div className="p-2 border-t border-white/10">
        <LogoutButton isCollapsed={isCollapsed} />
      </div>
    </div>
  ))

  SidebarContent.displayName = "SidebarContent"
  return (
    <AuthGuard requiredRole={normalizedRole}>
      <div className="min-h-screen w-full">
        {/* Desktop Sidebar - Fixed Position */}
        <div
          className={cn(
            "fixed top-0 left-0 z-40 h-screen border-r border-gray-200 hidden lg:flex lg:flex-col transition-all duration-300 ease-in-out",
            isSidebarOpen ? "lg:w-64" : "lg:w-16",
          )}
        >
          <SidebarContent isCollapsed={!isSidebarOpen} />
        </div>

        {/* Main Content Area */}
        <div className={cn(
          "flex flex-col transition-all duration-300 ease-in-out",
          isSidebarOpen ? "lg:ml-64" : "lg:ml-16"
        )}>
          <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 sticky top-0 z-30">
            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0 w-64 border-r-0">
                <SidebarContent isCollapsed={false} />
              </SheetContent>
            </Sheet>

            {/* Desktop Sidebar Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden lg:flex"
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            <div className="w-full flex-1" />

            <div className="flex items-center gap-2">
              {/* <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
              </Button> */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user?.Username || "User"} ({normalizedRole})
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/${normalizedRole}/settings`} prefetch={false}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>                  <DropdownMenuItem onClick={handleLogoutClick}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-muted/40">
            <TokenExpirationWarning />
            {children}          </main>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirmation} onOpenChange={setShowLogoutConfirmation}>
        <DialogContent className="sm:max-w-md">          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleLogoutCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogoutConfirm}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}

export default AdminLayout
