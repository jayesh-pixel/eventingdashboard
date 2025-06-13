/**
 * Token management utilities
 */

export interface TokenData {
  token: string
  expiresAt: number
}

/**
 * Check if a token is valid and not expired
 */
export function isTokenValid(): boolean {
  try {
    const storedTokenData = localStorage.getItem("authToken")
    
    if (!storedTokenData) {
      return false
    }

    const tokenData: TokenData = JSON.parse(storedTokenData)
    
    // Handle legacy token format (just a string)
    if (typeof tokenData === 'string') {
      console.log("Legacy token format detected, treating as expired")
      return false
    }

    // Check if token structure is valid
    if (!tokenData.token || !tokenData.expiresAt) {
      return false
    }

    // Check if token is expired
    return Date.now() < tokenData.expiresAt
  } catch (error) {
    console.error("Error checking token validity:", error)
    return false
  }
}

/**
 * Get the current valid token
 */
export function getValidToken(): string | null {
  if (!isTokenValid()) {
    return null
  }

  try {
    const storedTokenData = localStorage.getItem("authToken")
    if (!storedTokenData) return null

    const tokenData: TokenData = JSON.parse(storedTokenData)
    return tokenData.token
  } catch (error) {
    console.error("Error getting token:", error)
    return null
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(): Date | null {
  try {
    const storedTokenData = localStorage.getItem("authToken")
    if (!storedTokenData) return null

    const tokenData: TokenData = JSON.parse(storedTokenData)
    
    if (typeof tokenData === 'string' || !tokenData.expiresAt) {
      return null
    }

    return new Date(tokenData.expiresAt)
  } catch (error) {
    console.error("Error getting token expiration:", error)
    return null
  }
}

/**
 * Get time remaining until token expires
 */
export function getTokenTimeRemaining(): number {
  const expiration = getTokenExpiration()
  if (!expiration) return 0

  const remaining = expiration.getTime() - Date.now()
  return Math.max(0, remaining)
}

/**
 * Format time remaining in human readable format
 */
export function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
}

/**
 * Clear expired tokens
 */
export function clearExpiredTokens(): void {
  if (!isTokenValid()) {
    localStorage.removeItem("authToken")
    localStorage.removeItem("authUser")
    // Clear the cookie as well
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  }
}

/**
 * Clear all tokens (for logout)
 */
export function clearAllTokens(): void {
  console.log("🧹 Clearing all tokens and user data...")
  localStorage.removeItem("authToken")
  localStorage.removeItem("authUser")
  
  // Clear any other auth-related localStorage items
  localStorage.removeItem("userRole")
  localStorage.removeItem("authState")
  
  // Clear the cookie as well
  document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  document.cookie = "authUser=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  
  console.log("✅ All tokens and user data cleared")
}
