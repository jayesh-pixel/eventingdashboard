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

/**
 * Event date/time helpers
 * ------------------------------------------------------------------
 * The API stores an event's date/time exactly as the organizer typed it and
 * serialises it with a +00:00 offset, so 6:00 PM comes back as
 * "2025-01-31T18:00:00.000Z". Those strings are wall-clock values, not real
 * UTC instants: formatting them in "Asia/Kolkata" shifts them by +5:30 and the
 * ticket screens end up showing 11:30 PM for an event created at 6:00 PM.
 *
 * parseEventDateTime returns a Date whose UTC fields hold the stored wall clock,
 * and the formatters below always render it in UTC, so what was entered on the
 * create-event screen is what every screen displays.
 */
export function parseEventDateTime(value?: string | number | Date | null): Date | null {
  if (value === null || value === undefined || value === "") return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "number") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof value !== "string") return null

  const raw = value.trim()
  if (!raw || raw === "Invalid Date") return null

  // ISO-like "YYYY-MM-DD[THH:mm:ss]" with or without a trailing zone marker.
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (iso) {
    return new Date(
      Date.UTC(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3]),
        Number(iso[4] || 0),
        Number(iso[5] || 0),
        Number(iso[6] || 0)
      )
    )
  }

  // Legacy "DD-MM-YYYY HH:mm:ss" shape returned by a few endpoints.
  const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (ddmmyyyy) {
    return new Date(
      Date.UTC(
        Number(ddmmyyyy[3]),
        Number(ddmmyyyy[2]) - 1,
        Number(ddmmyyyy[1]),
        Number(ddmmyyyy[4] || 0),
        Number(ddmmyyyy[5] || 0),
        Number(ddmmyyyy[6] || 0)
      )
    )
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Format an event date without shifting it into another timezone. */
export function formatEventDate(
  value?: string | number | Date | null,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
  locale: string | string[] = "en-IN"
): string {
  const parsed = parseEventDateTime(value)
  if (!parsed) return "N/A"
  return parsed.toLocaleDateString(locale, { ...options, timeZone: "UTC" })
}

/** Format an event time without shifting it into another timezone. */
export function formatEventTime(
  value?: string | number | Date | null,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true },
  locale: string | string[] = "en-IN"
): string {
  const parsed = parseEventDateTime(value)
  if (!parsed) return "N/A"
  return parsed.toLocaleTimeString(locale, { ...options, timeZone: "UTC" })
}

/** "12 Feb 2025, 06:00 PM" style label for an event date/time. */
export function formatEventDateTime(
  value?: string | number | Date | null,
  locale: string | string[] = "en-IN"
): string {
  const parsed = parseEventDateTime(value)
  if (!parsed) return "N/A"
  return `${formatEventDate(parsed, undefined, locale)}, ${formatEventTime(parsed, undefined, locale)}`
}
