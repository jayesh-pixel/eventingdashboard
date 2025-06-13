"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string | string[]
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === "/login") return

    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    // If role check is required
    if (!isLoading && isAuthenticated && requiredRole && user) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

      // If user doesn't have the required role, redirect to unauthorized page
      if (!roles.includes(user.AdminRole)) {
        router.push("/unauthorized")
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router, pathname])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If on login page or authenticated with correct role, render children
  if (pathname === "/login" || isAuthenticated) {
    if (requiredRole && user) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      if (!roles.includes(user.AdminRole)) {
        return null // Will redirect in the useEffect
      }
    }
    return <>{children}</>
  }

  // Default case - don't render anything while redirecting
  return null
}
