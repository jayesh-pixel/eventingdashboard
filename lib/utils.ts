import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display, handling both custom DD-MM-YYYY HH:mm:ss format
 * and standard ISO date formats from the API
 */
export function formatDate(dateString: string): string {
  try {
    if (!dateString) return "N/A"
    
    // Check if it's in DD-MM-YYYY HH:mm:ss format (from API)
    if (dateString.includes('-') && dateString.includes(' ') && dateString.includes(':')) {
      const [datePart, timePart] = dateString.split(' ')
      const [day, month, year] = datePart.split('-')
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
    
    // Handle standard ISO date format
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid Date"
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return "N/A"
  }
}
