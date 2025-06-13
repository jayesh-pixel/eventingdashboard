"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getStringAdminRole } from "@/lib/api-constants"
import { isTokenValid, clearExpiredTokens, clearAllTokens } from "@/lib/token-utils"

interface AuthUser {
  AdminRole: string
  user_id: string
  Username?: string
  Email?: string
}

interface AuthContextType {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => void
  login: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check for stored auth data on mount
    const storedUser = localStorage.getItem("authUser")

    if (storedUser && isTokenValid()) {
      try {
        const userData = JSON.parse(storedUser)

        // Ensure AdminRole is a string for consistency
        if (typeof userData.AdminRole === "number") {
          userData.AdminRole = getStringAdminRole(userData.AdminRole)
        }

        // Normalize role to lowercase for consistency
        userData.AdminRole = userData.AdminRole.toLowerCase()

        setUser(userData)
      } catch (error) {
        console.error("Error parsing stored user data:", error)
        clearExpiredTokens()
      }
    } else {
      // Clear any expired or invalid tokens
      clearExpiredTokens()
    }

    setIsLoading(false)
  }, [])

  const handleSetUser = (userData: AuthUser | null) => {
    if (userData) {
      // Ensure AdminRole is stored as string and normalized
      if (typeof userData.AdminRole === "number") {
        userData.AdminRole = getStringAdminRole(userData.AdminRole)
      }

      // Normalize to lowercase
      userData.AdminRole = userData.AdminRole.toLowerCase()
      
      console.log("🏪 AUTH CONTEXT: Storing user data:", userData)
      console.log("🆔 AUTH CONTEXT: Final user_id in context:", userData.user_id)
    }

    setUser(userData)

    if (userData) {
      localStorage.setItem("authUser", JSON.stringify(userData))
      console.log("💾 AUTH CONTEXT: User data saved to localStorage")
    } else {
      localStorage.removeItem("authUser")
      console.log("🗑️ AUTH CONTEXT: User data removed from localStorage")
    }
  }

  const login = async (email: string, password: string) => {
    // This is just a stub - the actual implementation is in the login page
  }

  const logout = () => {
    console.log("🚪 AUTH CONTEXT: Logging out user")
    setUser(null)
    clearAllTokens()
    console.log("🧹 AUTH CONTEXT: All tokens and data cleared")
    router.replace("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: handleSetUser,
        isAuthenticated: !!user,
        isLoading,
        logout,
        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
