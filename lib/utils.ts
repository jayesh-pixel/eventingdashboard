import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Handles API errors and extracts meaningful error messages
 * @param error - The error object from try-catch block
 * @param defaultMessage - Default message if no specific error is found
 * @returns A user-friendly error message string
 */
export function getApiErrorMessage(error: unknown, defaultMessage: string = "An error occurred"): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === "string") {
    return error
  }
  
  if (error && typeof error === "object") {
    const errorObj = error as any
    // Check for common error message properties
    if (errorObj.message) return String(errorObj.message)
    if (errorObj.error) return String(errorObj.error)
    if (errorObj.detail) return String(errorObj.detail)
  }
  
  return defaultMessage
}

/**
 * Handles fetch response errors and extracts error messages from API responses
 * @param response - The fetch Response object
 * @returns Promise that resolves to the JSON data or rejects with error message
 */
export async function handleApiResponse<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`
    
    try {
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage
      } else {
        const errorText = await response.text()
        if (errorText) {
          errorMessage = errorText.substring(0, 200) // Limit error text length
        }
      }
    } catch (parseError) {
      // If parsing fails, use the default HTTP error message
      console.error("Failed to parse error response:", parseError)
    }
    
    throw new Error(errorMessage)
  }
  
  const data = await response.json()
  
  // Check if the API returned an error within a successful HTTP response
  if (data && (data.error === true || data.success === false)) {
    throw new Error(data.message || data.error || "API request failed")
  }
  
  return data
}

/**
 * Format date for display, handling both custom DD-MM-YYYY HH:mm:ss format
 * and standard ISO date formats from the API
 */
export function formatDate(dateString: string): string {
  try {
    if (!dateString || typeof dateString !== 'string') return "N/A"
    
    // Check if it's in DD-MM-YYYY HH:mm:ss format (from API)
    if (dateString.includes('-') && dateString.includes(' ') && dateString.includes(':')) {
      const [datePart, timePart] = dateString.split(' ')
      const [day, month, year] = datePart.split('-')
      
      // Validate date components
      if (!day || !month || !year || day.length !== 2 || month.length !== 2 || year.length !== 4) {
        // Try as standard ISO format instead
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return "Invalid Date"
        return date.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Kolkata'
        })
      }
      
      // Convert to ISO format: YYYY-MM-DD HH:mm:ss
      const isoString = `${year}-${month}-${day} ${timePart}`
      const date = new Date(isoString)
      
      if (isNaN(date.getTime())) {
        // If still invalid, try without time
        const dateOnly = new Date(`${year}-${month}-${day}`)
        if (isNaN(dateOnly.getTime())) return "Invalid Date"
        return dateOnly.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
      
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
    
    // Handle standard ISO date format (YYYY-MM-DD or ISO string)
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid Date"
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    })
  } catch {
    return "N/A"
  }
}
