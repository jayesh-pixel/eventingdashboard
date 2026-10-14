import { authFetch } from "@/lib/auth-fetch"
import * as XLSX from "xlsx"

/**
 * Client-side Excel export for bookings.
 *
 * The server's download endpoints only narrow their query when the request body
 * hands them an organizer_id/event_id, so a payload that loses its scope comes back
 * as a dump of every booking on the platform. Building the workbook here instead
 * removes that failure mode entirely: the file can only ever contain the rows the
 * dashboard already fetched and displayed for this user.
 */

export type ExportColumn<T> = {
  header: string
  value: (row: T) => string | number | null | undefined
}

export function downloadBookingsWorkbook<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName = "Bookings"
) {
  const sheetRows = [
    columns.map((column) => column.header),
    ...rows.map((row) =>
      columns.map((column) => {
        const value = column.value(row)
        return value === null || value === undefined ? "" : value
      })
    ),
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows)
  worksheet["!cols"] = columns.map((column) => ({
    wch: Math.max(12, Math.min(40, column.header.length + 6)),
  }))

  const workbook = XLSX.utils.book_new()
  // Excel rejects sheet names over 31 chars or containing []:*?/\
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, filename)
}

export const exportTimestamp = () => new Date().toISOString().slice(0, 10)

/**
 * Walks every page of a server-paginated bookings endpoint.
 *
 * `basePayload` must already carry the scope (organizer_id / promoter_id / event_id);
 * this only adds paging on top of it. Page 1 is fetched first so the response can say
 * how many more there are, then the rest go out together.
 */
export async function fetchAllBookingPages(
  endpoint: string,
  basePayload: Record<string, any>,
  authToken: string,
  extract: (data: any) => any[],
  pageSize = 200,
  maxPages = 25,
  // Called when the API has more pages than maxPages, so callers can say the list is cut short.
  onTruncated?: (loadedPages: number, totalPages: number) => void
): Promise<any[]> {
  const post = (payload: Record<string, any>) =>
    authFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    })

  const firstPayload = { ...basePayload, page: "1", limit: pageSize.toString() }
  const response = await post(firstPayload)

  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Export failed with status ${response.status}`)

  const firstData = await response.json()
  let rows = extract(firstData)

  const totalPages = Number(firstData?.data?.totalPages ?? firstData?.totalPages) || 1
  const remainingPages = Math.min(totalPages, maxPages) - 1

  if (remainingPages > 0) {
    const pages = await Promise.all(
      Array.from({ length: remainingPages }, (_, index) =>
        post({ ...firstPayload, page: (index + 2).toString() })
          .then((pageResponse) => (pageResponse.ok ? pageResponse.json() : null))
          .catch(() => null)
      )
    )

    // A failed page used to be skipped, so the table/export came back short with no sign.
    const failedPages = pages.filter((pageData) => !pageData || pageData.error).length
    if (failedPages > 0) {
      throw new Error(`Could not load ${failedPages} of ${totalPages} pages of bookings. Please try again.`)
    }

    for (const pageData of pages) {
      rows = rows.concat(extract(pageData))
    }
  }

  if (totalPages > maxPages) onTruncated?.(maxPages, totalPages)

  return rows
}

/**
 * The bookings endpoints answer any crash with a bare "Internal Server Error" - most often
 * a row whose promoter or event was deleted (the API dereferences it without a null check).
 * Give the user something to act on instead.
 */
export function describeBookingsError(message: string): string {
  if (message.trim().toLowerCase() !== "internal server error") return message
  return "The server could not load these bookings. Try a narrower date range or another filter. If it keeps happening, a promoter or event linked to some of these bookings may have been deleted - please contact support."
}

// The bookings endpoints search with `new RegExp("^" + searchkeyword)` on Booking_id and
// CustomerName, plus an exact `PhoneNumber: parseInt(searchkeyword)` (PhoneNumber is a
// Number). So "(", "+", "*" etc. crashed the request with a 500, and a phone typed as
// "+91 98765 43210" was parsed as 91 and never matched.
export const toBookingSearchKeyword = (term: string) => {
  const trimmed = term.trim()
  if (/^\+?[\d\s-]+$/.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, "")
    return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits
  }
  return trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
