import { useState, useEffect } from "react"
import { isTokenValid, getTokenTimeRemaining, formatTimeRemaining, clearExpiredTokens } from "@/lib/token-utils"
import { useAuth } from "@/lib/auth-context"

/**
 * Hook for monitoring token expiration
 */
export function useTokenExpiration() {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isExpired, setIsExpired] = useState<boolean>(false)
  const { logout } = useAuth()

  useEffect(() => {
    const checkTokenExpiration = () => {
      const valid = isTokenValid()
      const remaining = getTokenTimeRemaining()

      setIsExpired(!valid)
      setTimeRemaining(remaining)

      // Auto logout if token is expired
      if (!valid && remaining === 0) {
        console.log("Token expired, logging out automatically")
        clearExpiredTokens()
        logout()
      }
    }

    // Check immediately
    checkTokenExpiration()

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60000)

    return () => clearInterval(interval)
  }, [logout])

  return {
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    isExpired,
    isValid: isTokenValid(),
  }
}
