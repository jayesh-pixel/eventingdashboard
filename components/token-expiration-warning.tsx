"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Clock, RefreshCw } from "lucide-react"
import { useTokenExpiration } from "@/hooks/use-token-expiration"
import { useAuth } from "@/lib/auth-context"

/**
 * Component that shows a warning when the token is about to expire
 */
export function TokenExpirationWarning() {
  const { timeRemaining, timeRemainingFormatted, isExpired } = useTokenExpiration()
  const { logout } = useAuth()
  const [showWarning, setShowWarning] = useState(false)

  // Show warning when less than 30 minutes remaining
  const WARNING_THRESHOLD = 30 * 60 * 1000 // 30 minutes in milliseconds

  useEffect(() => {
    setShowWarning(timeRemaining > 0 && timeRemaining <= WARNING_THRESHOLD)
  }, [timeRemaining])

  const handleExtendSession = () => {
    // In a real app, you would make an API call to refresh the token
    // For now, we'll just redirect to login
    logout()
  }

  if (isExpired || !showWarning) {
    return null
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Session Expiring Soon</AlertTitle>
      <AlertDescription className="text-orange-700">
        <div className="flex items-center justify-between mt-2">
          <span>
            Your session will expire in {timeRemainingFormatted}. Please save your work.
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExtendSession}
            className="ml-4"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Extend Session
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
