"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        const role = user.AdminRole.toLowerCase()
        console.log("Redirecting user with role:", role)

        // Use replace to prevent back navigation issues
        router.replace(`/${role}/dashboard`)
      } else {
        router.replace("/login")
      }
    }
  }, [isLoading, isAuthenticated, user, router])

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  )
}
