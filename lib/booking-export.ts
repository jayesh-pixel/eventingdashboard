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
  maxPages = 25
): Promise<any[]> {
  const post = (payload: Record<string, any>) =>
    fetch(endpoint, {
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

    for (const pageData of pages) {
      if (pageData) rows = rows.concat(extract(pageData))
    }
  }

  return rows
}
