"use client"

import { authFetch } from "@/lib/auth-fetch"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Download,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { formatEventDate, normalizeSearchText } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { organizerEndpoint, promoterEndPointPannel } from "@/lib/api-endpoints"
import { getNumericRole } from "@/lib/role-mapping"
import { downloadBookingsWorkbook, exportTimestamp, type ExportColumn } from "@/lib/booking-export"
import { getValidToken } from "@/lib/token-utils"
import { useRouter } from "next/navigation"
import type { UserRole } from "@/lib/navigation"
import { BookingsTable, type BookingColumnKey } from "@/components/bookings-table"

const REPORT_SUMMARY_COLUMNS: BookingColumnKey[] = [
  "ticketName", "quantity", "ticketPrice", "ticketDate", "totalAmount",
]

const REPORT_TRANSACTION_COLUMNS: BookingColumnKey[] = [
  "name", "bookingId", "phone", "email", "bookingDateTime", "eventName", "ticketDate",
  "source", "city", "venue", "quantity", "checkIn", "scannedBy",
]
import type { Booking } from "@/lib/types"

interface EventReportPageProps {
  params: { role: UserRole; eventId: string } | Promise<{ role: UserRole; eventId: string }>
}

// The organizer/superadmin bookings endpoint is server-paginated; these bound how much
// of it the report pulls in one go.
const REPORT_PAGE_SIZE = 200
const MAX_REPORT_PAGES = 25

const BookingTypeOptions = [
  { id: 1, value: 1, text: "Summary Booking" },
  { id: 2, value: 2, text: "Transaction Booking" },
]

export default function EventReportPage({ params }: EventReportPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole; eventId: string }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role, eventId } = resolvedParams

  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  // This report used to call the promoter-only endpoints for every role. For an
  // organizer or superadmin that meant the transaction report only ever contained the
  // bookings made by one promoter id (their own user id), which is why the report
  // totalled fewer bookings than the event's Bookings tab. Each role now talks to the
  // endpoint that matches it, so both screens query the same set.
  const isPromoter = (role as UserRole) === "promoter"

  const scopePayload = React.useCallback(() => {
    if (isPromoter) {
      return { promoter_id: user?.user_id, event_id: eventId }
    }

    const payload: Record<string, any> = {
      AdminRole: getNumericRole(role as UserRole),
      user_id: user?.user_id,
      event_id: eventId,
    }

    if ((role as UserRole) === "organizer" && user?.user_id) {
      payload.organizer_id = user.user_id
    }

    return payload
  }, [eventId, isPromoter, role, user])

  // State management
  const [loading, setLoading] = React.useState(true)
  const [downloadLoading, setDownloadLoading] = React.useState(false)
  
  // Filter state
  const [nameDropDownVisible, setNameDropDownVisible] = React.useState(false)
  const [selectedNameIndex, setSelectedNameIndex] = React.useState<number | null>(null)
  const [ticketNameFilterData, setTicketNameFilterData] = React.useState<string[]>([])
  const [storeFilterDates, setStoreFilterDates] = React.useState<any[]>([])
  
  const [dropdownVisible, setDropdownVisible] = React.useState(false)
  const [dropdownVisibleBooking, setDropdownVisibleBooking] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [selectedBookingType, setSelectedBookingType] = React.useState(2)
  
  // Data state
  const [eventTicketsData, setEventTicketsData] = React.useState<any[]>([])
  const [allTransactionBookingData, setAllTransactionBookingData] = React.useState<any[]>([])
  const [originalData, setOriginalData] = React.useState<any[]>([])
  
  // Search state
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  
  const [storeFilterdDatePayload, setFilterdDatePayload] = React.useState<any>({})
  const [filters, setFilters] = React.useState({
    eventDateTime_id: "",
    ticketName: "",
  })

  // Get event report data
  const getAllEventReportDataByEventID = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken || !eventId) return

      const payload = scopePayload()

      const response = await authFetch(
        isPromoter
          ? promoterEndPointPannel.GET_ALL_PROMOTER_EVENT_BOOKING_DATA_BY_EVENT_ID
          : organizerEndpoint.GET_ALL_SUMMARY_BOOKING_DATA_BY_EVENT_AND_ORGANIZER_ID,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setTicketNameFilterData(data.data.TicketNamesArray || [])
        setStoreFilterDates(data.data.EventDateTimeData || [])
        setEventTicketsData(data.data.TicketsData || [])
        setOriginalData(data.data.TicketsData || [])
      } else {
        throw new Error("Failed to fetch event report data")
      }
    } catch (error) {
      console.error("Error fetching event report:", error)
      toast({
        title: "Error",
        description: "Failed to load event report data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Pulls the event's transaction rows for the current role. The bookings endpoint is
  // server-paginated, so every page is collected - a single page of results was another
  // reason the report undercounted against the Bookings tab.
  const fetchTransactionRows = React.useCallback(
    async (searchKeyword?: string): Promise<any[]> => {
      const authToken = getValidToken()
      if (!user || !authToken || !eventId) return []

      // A promoter reads the shared bookings endpoint pinned to their own promoter_id.
      // The promoter-only transaction endpoint returns no city, venue, check-in, scanner
      // or booking source, which is why the promoter's report looked incomplete.
      const basePayload: Record<string, any> = isPromoter
        ? {
            AdminRole: getNumericRole(role as UserRole),
            user_id: user.user_id,
            promoter_id: user.user_id,
            event_id: eventId,
          }
        : scopePayload()
      if (searchKeyword) {
        basePayload.searchkeyword = searchKeyword
      }

      const endpoint = organizerEndpoint.GET_ALL_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER

      const post = (payload: Record<string, any>) =>
        authFetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        })

      const extract = (data: any): any[] =>
        Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.latestBookingData)
            ? data.data.latestBookingData
            : []

      const firstPayload = { ...basePayload, page: "1", limit: REPORT_PAGE_SIZE.toString() }
      const response = await post(firstPayload)
      if (response.status === 404) return []
      if (!response.ok) throw new Error("Failed to fetch transaction booking data")

      const firstData = await response.json()
      let rows = extract(firstData)

      const totalPagesFromApi = Number(firstData?.data?.totalPages) || 1
      const remainingPages = Math.min(totalPagesFromApi, MAX_REPORT_PAGES) - 1

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
    },
    [eventId, isPromoter, role, scopePayload, user]
  )

  // Get transaction booking data
  const getAllTransactionBookingData = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken || !eventId) return

      const rows = await fetchTransactionRows()
      setAllTransactionBookingData(rows)
      setOriginalData(rows)
    } catch (error) {
      console.error("Error fetching transaction data:", error)
      toast({
        title: "Error",
        description: "Failed to load transaction booking data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter functions
  const handleNameFilter = (ticketName: string, index: number | null) => {
    setSelectedNameIndex(index)

    if (ticketName === "resetAllNames") {
      setEventTicketsData(originalData)
      setFilters({ eventDateTime_id: "", ticketName: "" })
      setFilterdDatePayload({})
    } else {
      const newFilters = { ...filters, ticketName: ticketName }
      setFilters(newFilters)
      fetchFilteredData(newFilters)
    }
    setNameDropDownVisible(false)
  }

  const handleDateFilter = (eventDateId: string | null, eventDate: string) => {
    setSelectedDate(eventDateId)
    setSelectedNameIndex(null)

    if (eventDate === "reset") {
      setEventTicketsData(originalData)
      setFilters({ eventDateTime_id: "", ticketName: "" })
      setFilterdDatePayload({})
    } else {
      const newFilters = { ...filters, eventDateTime_id: eventDateId || "" }
      setFilters(newFilters)
      fetchFilteredData(newFilters)
    }
    setDropdownVisible(false)
  }

  const fetchFilteredData = async (filterParams: any) => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken || !eventId) return

      const filteredParams = Object.keys(filterParams).reduce((acc: any, key) => {
        if (filterParams[key]) {
          acc[key] = filterParams[key]
        }
        return acc
      }, {})

      const payload = {
        ...scopePayload(),
        ...filteredParams,
      }

      const response = await authFetch(
        isPromoter
          ? promoterEndPointPannel.FILTER_EVENT_BOOKING_DATA_BY_NAME_AND_DATE_IN_PROMOTER
          : organizerEndpoint.FILTER_EVENT_BOOKING_DATA_BY_NAME_AND_DATE_IN_PROMOTER,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (response.ok) {
        const data = await response.json()
        // The promoter endpoint returns the rows directly, the organizer one nests
        // them under processedTicketsData alongside its totals.
        const filteredRows = Array.isArray(data.data)
          ? data.data
          : data.data?.processedTicketsData || []
        setEventTicketsData(filteredRows)
        setFilterdDatePayload(payload)
        toast({
          title: "Success",
          description: data.message || "Data filtered successfully",
        })
      } else {
        setEventTicketsData([])
        toast({
          title: "No Data",
          description: "No data found for the selected filters",
        })
      }
    } catch (error) {
      console.error("Filter error:", error)
      setEventTicketsData([])
      toast({
        title: "Error",
        description: "Failed to filter data",
        variant: "destructive",
      })
    }
  }

  // Download report handler.
  //
  // Both tabs are written in the browser from the rows already on screen. The server's
  // download endpoints only narrow their query when the request body spells out the
  // scope, so one lost field turned a per-event report into a dump of every booking on
  // the platform. Building the file here removes that possibility - it can only ever
  // contain what this report already fetched for this user and this event.
  const downloadReportHandler = async () => {
    try {
      setDownloadLoading(true)

      const isSummary = selectedBookingType === 1
      const rows = isSummary ? transformedSummaryData : transformedTransactionData

      if (rows.length === 0) {
        toast({
          title: "No Data",
          description: isSummary
            ? "No Summary Booking data found for this event."
            : "No transaction data found for this event.",
          variant: "destructive",
        })
        return
      }

      const summaryColumns: ExportColumn<any>[] = [
        { header: "Ticket Name", value: (row) => row.ticketName },
        { header: "Quantity Sold", value: (row) => row.quantity },
        { header: "Ticket Price", value: (row) => row.ticketPrice },
        { header: "Ticket Date", value: (row) => formatDate(row.ticketDate) },
        { header: "Total Amount", value: (row) => row.totalAmount },
      ]

      const transactionColumns: ExportColumn<any>[] = [
        { header: "Customer Name", value: (row) => row.customerName },
        { header: "Booking ID", value: (row) => row.Booking_id },
        { header: "Phone Number", value: (row) => row.phoneNumber },
        { header: "Email", value: (row) => row.customerEmail },
        { header: "Booking Date & Time", value: (row) => row.BookingDateTime },
        { header: "Event Name", value: (row) => row.eventName },
        { header: "Ticket Date", value: (row) => formatDate(row.ticketDate) },
        { header: "City", value: (row) => row.city },
        { header: "Venue", value: (row) => row.venue },
        { header: "Ticket Name", value: (row) => row.ticketName },
        { header: "Ticket Type", value: (row) => row.ticketType },
        { header: "Quantity", value: (row) => row.quantity },
        { header: "Check In", value: (row) => row.checkIn ?? 0 },
        { header: "Scanned By", value: (row) => row.scannedBy },
        { header: "Ticket Price", value: (row) => row.ticketPrice },
        { header: "Total Amount", value: (row) => row.totalAmount },
        { header: "Status", value: (row) => row.bookingStatus },
      ]

      downloadBookingsWorkbook(
        rows,
        isSummary ? summaryColumns : transactionColumns,
        `${isSummary ? "summary" : "transaction"}-report-${eventId}-${exportTimestamp()}.xlsx`,
        isSummary ? "Summary Report" : "Transaction Report"
      )

      toast({
        title: "Success",
        description: `Exported ${rows.length} row${rows.length === 1 ? "" : "s"}`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      })
    } finally {
      setDownloadLoading(false)
    }
  }

  // Load initial data
  React.useEffect(() => {
    if (selectedBookingType === 1) {
      getAllEventReportDataByEventID()
    } else if (selectedBookingType === 2) {
      getAllTransactionBookingData()
    }
  }, [selectedBookingType, eventId, user])

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 1000)

    return () => clearTimeout(delay)
  }, [searchTerm])

  // Search functionality for transaction data
  React.useEffect(() => {
    const fetchSearchData = async () => {
      if (selectedBookingType !== 2) return
      
      try {
        if (debouncedSearchTerm.length < 3) {
          if (debouncedSearchTerm.length > 0) {
            toast({
              title: "Search",
              description: "Search keyword must be at least 3 characters long.",
            })
          }
          return
        }

        const authToken = getValidToken()
        if (!user || !authToken || !eventId) return

        setAllTransactionBookingData(
          await fetchTransactionRows(normalizeSearchText(debouncedSearchTerm))
        )
      } catch (error) {
        console.error("Error searching transaction data:", error)
        toast({
          title: "Search Error",
          description: "Failed to search transaction data",
          variant: "destructive",
        })
      }
    }

    if (debouncedSearchTerm) {
      fetchSearchData()
    }  }, [debouncedSearchTerm, selectedBookingType, eventId, user])

  // Event date/times are stored as the entered wall clock tagged +00:00, so they
  // are rendered as stored rather than converted into the browser's timezone.
  const formatDate = (date: Date | string | number) =>
    formatEventDate(date, { day: "numeric", month: "long", year: "numeric" }, "en-GB")

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`
  }

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case "confirmed":
      case "success":
      case "completed":
        return "default"
      case "pending":
      case "processing":
        return "secondary"
      case "cancelled":
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }
  // Transform data for BookingsTable component
  const transformedSummaryData: Booking[] = eventTicketsData.map((ticket, index) => ({
    _id: `summary-${index}`,
    eventId: eventId,
    eventName: ticket.TicketName || "N/A",
    customerId: "N/A",
    customerName: "N/A", // Summary data doesn't have customer info
    customerEmail: "",
    phoneNumber: "",
    bookingChannel: "Online" as const,
    bookingStatus: "Confirmed" as const,
    totalAmount: ticket.TotalAmount || 0,
    ticketPrice: ticket.TicketPrice,
    bookingDate: ticket.TicketDate || new Date().toISOString(),
    ticketDate: ticket.TicketDate,
    quantity: ticket.Quantity,
    ticketName: ticket.TicketName,
    ticketType: "Summary",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Additional fields for compatibility
    Booking_id: `SUM-${index + 1}`,
    CustomerName: "N/A",
    PhoneNumber: "",
    Email: "",
    BookingDateTime: ticket.TicketDate,
    EventName: ticket.TicketName,
    TicketDate: ticket.TicketDate,
    TicketQuantity: ticket.Quantity,
    TicketName: ticket.TicketName,
    EventTicketType: "Summary",
    TicketPrice: ticket.TicketPrice,
    TotalAmount: ticket.TotalAmount,
  }))

  const transformedTransactionData: Booking[] = allTransactionBookingData.map((transaction) => ({
    _id: transaction._id || transaction.Booking_id || `trans-${Math.random()}`,
    eventId: eventId,
    eventName: transaction.EventName || "N/A",
    customerId: transaction.CustomerId || "N/A",
    customerName: transaction.CustomerName || "N/A",
    customerEmail: transaction.Email || "",
    phoneNumber: transaction.PhoneNumber,
    // Every row was labelled "Online", including a promoter's own bookings.
    bookingChannel: (transaction.BookingSource || (isPromoter ? "Promoter" : "Online")) as Booking["bookingChannel"],
    bookingStatus: String(transaction.status ?? transaction.Status) === "2" ? "Cancelled" : "Confirmed",
    totalAmount: transaction.TotalAmount || 0,
    ticketPrice: transaction.TicketPrice,
    bookingDate: transaction.BookingDateTime || new Date().toISOString(),
    ticketDate: transaction.TicketDate,
    city: transaction.EventCityName,
    venue: transaction.EventVenueName,
    quantity: transaction.TicketQuantity,
    ticketName: transaction.TicketName,
    ticketType: transaction.EventTicketType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Additional fields for compatibility
    Booking_id: transaction.Booking_id,
    CustomerName: transaction.CustomerName,
    PhoneNumber: transaction.PhoneNumber,
    Email: transaction.Email,
    BookingDateTime: transaction.BookingDateTime,
    EventName: transaction.EventName,
    TicketDate: transaction.TicketDate,
    EventCityName: transaction.EventCityName,
    EventVenueName: transaction.EventVenueName,
    TicketQuantity: transaction.TicketQuantity,
    TicketName: transaction.TicketName,
    EventTicketType: transaction.EventTicketType,
    TicketPrice: transaction.TicketPrice,
    TotalAmount: transaction.TotalAmount,
    Check_In: transaction.Check_In,
    checkIn: transaction.Check_In ?? transaction.CheckIn ?? transaction.checkIn ?? 0,
    scannedBy: transaction.ScannerUserName || transaction.ScannedBy || transaction.scannedBy || transaction.scanned_by || transaction.ScannedByName || "",
  }))

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Event Booking Report</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading report data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/${role}/events`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
          <h1 className="text-2xl font-semibold">Event Booking Report</h1>
        </div>
        
        <Button
          onClick={downloadReportHandler}
          disabled={downloadLoading}
          className="flex items-center gap-2"
        >
          {downloadLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
            {/* Booking Type Filter */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setDropdownVisibleBooking(!dropdownVisibleBooking)}
                className="flex items-center justify-between w-48"
              >
                {selectedBookingType === 1 ? "Summary Booking" : "Transaction Booking"}
                {dropdownVisibleBooking ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              {dropdownVisibleBooking && (
                <div className="absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {BookingTypeOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => {
                        setSelectedBookingType(option.value)
                        setDropdownVisibleBooking(false)
                      }}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                        selectedBookingType === option.value ? "bg-gray-100" : ""
                      }`}
                    >
                      {option.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conditional Filters */}
            {selectedBookingType === 1 ? (
              <div className="flex gap-4">
                {/* Name Filter */}
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setNameDropDownVisible(!nameDropDownVisible)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Name Filter
                  </Button>

                  {nameDropDownVisible && (
                    <div className="absolute top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {ticketNameFilterData.map((name, index) => (
                        <div
                          key={index}
                          onClick={() => handleNameFilter(name, index)}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                            selectedNameIndex === index ? "bg-gray-100" : ""
                          }`}
                        >
                          {name}
                        </div>
                      ))}
                      <div
                        onClick={() => handleNameFilter("resetAllNames", null)}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200"
                      >
                        Reset Filter
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Filter */}
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setDropdownVisible(!dropdownVisible)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Date Filter
                  </Button>

                  {dropdownVisible && (
                    <div className="absolute top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {storeFilterDates.map((date) => (
                        <div
                          key={date._id}
                          onClick={() => handleDateFilter(date._id, date.EventStartDateTime || date.EventStartDate)}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                            selectedDate === date._id ? "bg-gray-100" : ""
                          }`}
                        >
                          {formatDate(date.EventStartDateTime || date.EventStartDate)}
                        </div>
                      ))}
                      <div
                        onClick={() => handleDateFilter(null, "reset")}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200"
                      >
                        Reset Filter
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by Booking ID and Customer Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Totals summary cards */}
      {(() => {
        const rows = selectedBookingType === 1 ? transformedSummaryData : transformedTransactionData
        const num = (v: unknown) => {
          const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""))
          return Number.isFinite(n) ? n : 0
        }
        const totalQuantity = rows.reduce((sum, r) => sum + num(r.TicketQuantity ?? r.quantity), 0)
        const totalCheckIn = rows.reduce((sum, r) => sum + num((r as any).checkIn ?? (r as any).Check_In), 0)
        const totalPrice = rows.reduce((sum, r) => sum + num(r.TotalAmount ?? r.totalAmount), 0)
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-6 shadow-sm">
              <p className="text-base font-medium text-blue-950">Total Quantity</p>
              <p className="mt-2 text-2xl font-semibold text-primary">{totalQuantity}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-6 shadow-sm">
              <p className="text-base font-medium text-blue-950">Total Checkin</p>
              <p className="mt-2 text-2xl font-semibold text-primary">{totalCheckIn}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-6 shadow-sm">
              <p className="text-base font-medium text-blue-950">Total Price</p>
              <p className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(totalPrice)}</p>
            </div>
          </div>
        )
      })()}

      {/* Data Tables */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedBookingType === 1 ? "Summary Booking Report" : "Transaction Booking Report"}
          </CardTitle>
          <CardDescription>
            {selectedBookingType === 1 
              ? `${eventTicketsData.length} ticket record(s) found`
              : `${allTransactionBookingData.length} transaction record(s) found`
            }
          </CardDescription>
        </CardHeader>        <CardContent>
          {selectedBookingType === 1 ? (
            <BookingsTable
              bookings={transformedSummaryData}
              role={role}
              searchTerm=""
              statusFilter="all"
              channelFilter="all"
              columns={REPORT_SUMMARY_COLUMNS}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              getStatusBadgeVariant={getStatusBadgeVariant}
            />
          ) : (
            <BookingsTable
              bookings={transformedTransactionData}
              role={role}
              searchTerm={searchTerm}
              statusFilter="all"
              channelFilter="all"
              columns={REPORT_TRANSACTION_COLUMNS}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              getStatusBadgeVariant={getStatusBadgeVariant}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
