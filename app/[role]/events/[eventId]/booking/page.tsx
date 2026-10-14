"use client"

import { authFetch } from "@/lib/auth-fetch"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Download, Filter, Loader2, Search } from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import { formatEventDate, normalizeSearchText, parseEventDateTime } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { eventEndPoint, organizerEndpoint, promoterEndpoint, ticketEndPoint } from "@/lib/api-endpoints"
import { describeBookingsError, downloadBookingsWorkbook, exportTimestamp, type ExportColumn } from "@/lib/booking-export"
import { getNumericRole } from "@/lib/role-mapping"
import { getValidToken } from "@/lib/token-utils"

interface EventBookingPageProps {
  params: { role: UserRole; eventId: string } | Promise<{ role: UserRole; eventId: string }>
}

interface Booking {
  _id: string
  eventId: string
  eventName: string
  customerName: string
  customerEmail: string
  phoneNumber: string
  bookingId: string
  bookingChannel: "Promoter" | "Online" | "Bulk" | string
  bookingStatus: "Confirmed" | "Pending" | "Cancelled" | "Booked" | string
  totalAmount: number
  quantity: number
  checkIn: number | string
  ticketType: string
  ticketName: string
  ticketPrice: number
  ticketDate: string
  bookingDate: string
  promoterId: string
  promoterName: string
  city: string
  venue: string
  source: string
  [key: string]: any
}

interface PromoterOption {
  id: string
  name: string
}

interface TransactionTotals {
  totalQuantity: number
  totalCheckIn: number
  totalPrice: number
}

interface SummaryDateOption {
  id: string
  label: string
  startDate: string
  endDate: string
}

const ITEMS_PER_PAGE = 10
// Server page size used while pulling the event's full booking set, and a hard cap
// so a very large event can never turn this into an unbounded fan-out.
const SERVER_PAGE_SIZE = 200
const MAX_SERVER_PAGES = 25
// Promoter filter value for an unassigned promoter whose _id is unknown; filtered client-side.
const PROMOTER_NAME_FILTER_PREFIX = "username:"
const CONTROL_CLASS =
  "h-12 border-blue-100 bg-white text-base shadow-sm focus:ring-primary/30 focus-visible:ring-primary/30"
const ICON_BUTTON_CLASS =
  "h-12 w-12 shrink-0 border-blue-100 bg-white text-primary shadow-sm hover:bg-blue-50 hover:text-primary"
const TABLE_CARD_CLASS = "min-w-0 max-w-full overflow-hidden border-blue-100 shadow-sm"
const TABLE_HEADER_CLASS = "bg-blue-50/80"
const TABLE_HEAD_CLASS = "text-xs font-bold uppercase text-blue-950"

// Export columns for this event's transaction rows, matching what the table renders.
const EVENT_BOOKING_EXPORT_COLUMNS = (
  formatDate: (value: any) => string,
  formatDateTime: (value: any) => string
): ExportColumn<any>[] => [
  { header: "Name", value: (b) => b.customerName },
  { header: "Booking ID", value: (b) => b.bookingId || b.Booking_id },
  { header: "Phone No.", value: (b) => b.phoneNumber },
  { header: "Email", value: (b) => b.customerEmail },
  { header: "Booking Date & Time", value: (b) => formatDateTime(b.bookingDate) },
  { header: "Event", value: (b) => b.eventName },
  { header: "Ticket Date", value: (b) => formatDate(b.ticketDate) },
  { header: "City", value: (b) => b.city },
  { header: "Venue", value: (b) => b.venue },
  { header: "Promoter Name", value: (b) => b.promoterName || b.PromoterName },
  { header: "Quantity", value: (b) => b.quantity },
  { header: "Check In", value: (b) => b.checkIn ?? 0 },
  { header: "Ticket Name", value: (b) => b.ticketName },
  { header: "Ticket Type", value: (b) => b.ticketType },
  { header: "Ticket Price", value: (b) => b.ticketPrice },
  { header: "Total Amount", value: (b) => b.totalAmount },
]

// Page buttons for the table: always the first and last page, a window of five around
// the current page, and ellipses for the gaps - e.g. 1 2 3 4 5 … 40, 1 … 17 18 19 … 40.
const getPageItems = (currentPage: number, totalPages: number): Array<number | "ellipsis"> => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  let start = Math.max(2, currentPage - 1)
  let end = Math.min(totalPages - 1, currentPage + 1)
  if (currentPage <= 4) {
    start = 2
    end = 5
  } else if (currentPage >= totalPages - 3) {
    start = totalPages - 4
    end = totalPages - 1
  }

  return [
    1,
    ...(start > 2 ? ["ellipsis" as const] : []),
    ...Array.from({ length: end - start + 1 }, (_, index) => start + index),
    ...(end < totalPages - 1 ? ["ellipsis" as const] : []),
    totalPages,
  ]
}

type BookingDataType = "transaction" | "summary"
type BookingTab = "all" | "promoter" | "online" | "bulk"
type DateFilterOption = "all" | "today" | "yesterday" | "last7days" | "last1month" | "manual"

export default function EventBookingPage({ params }: EventBookingPageProps) {
  const resolvedParams = params instanceof Promise ? React.use(params) : params
  const { role, eventId } = resolvedParams

  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = React.useState(true)
  const [bookingsData, setBookingsData] = React.useState<Booking[]>([])
  const [originalData, setOriginalData] = React.useState<Booking[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [activeTab, setActiveTab] = React.useState<BookingTab>("all")
  const [eventName, setEventName] = React.useState("")
  const [bookingDataType, setBookingDataType] = React.useState<BookingDataType>("transaction")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [dateFilter, setDateFilter] = React.useState<DateFilterOption>("all")
  const [manualStartDate, setManualStartDate] = React.useState("")
  const [manualEndDate, setManualEndDate] = React.useState("")
  const [promoterFilter, setPromoterFilter] = React.useState("all")
  const [isDateFilterOpen, setIsDateFilterOpen] = React.useState(false)
  const [summaryTicketFilter, setSummaryTicketFilter] = React.useState("all")
  const [summaryDateFilter, setSummaryDateFilter] = React.useState("all")
  const [summaryTicketOptions, setSummaryTicketOptions] = React.useState<string[]>([])
  const [summaryDateOptions, setSummaryDateOptions] = React.useState<SummaryDateOption[]>([])
  const [promoters, setPromoters] = React.useState<PromoterOption[]>([])
  // Usernames of promoters who punched tickets for this event. Kept across fetches so a
  // promoter stays in the dropdown after the list is narrowed to someone else.
  const [bookingPromoterNames, setBookingPromoterNames] = React.useState<string[]>([])
  // Username -> promoter _id from /promoter/getAll, looked up only for promoters that
  // are no longer assigned to the event (booking rows carry no promoter_id).
  const [promoterIdsByUsername, setPromoterIdsByUsername] = React.useState<Map<string, string> | null>(null)
  const promoterLookupRequested = React.useRef(false)
  // Every filter change refetches the event's bookings (up to 25 server pages). Only the
  // newest request may touch the table, or a slow unfiltered load that finishes after a
  // quick filtered one overwrites it and the filter looks like it did nothing.
  const latestFetchId = React.useRef(0)
  const [apiErrorMessage, setApiErrorMessage] = React.useState("")
  const [transactionTotals, setTransactionTotals] = React.useState<TransactionTotals>({
    totalQuantity: 0,
    totalCheckIn: 0,
    totalPrice: 0,
  })

  const getStringValue = (...values: any[]) => {
    const value = values.find((item) => item !== undefined && item !== null && item !== "")
    return value === undefined || value === null ? "" : String(value)
  }

  const getNumberValue = (...values: any[]) => {
    const value = values.find((item) => item !== undefined && item !== null && item !== "")
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Companion to toDateInputValue for event date/times, whose wall clock lives
  // in the UTC fields of the Date returned by parseEventDateTime.
  const toEventDateInputValue = (date: Date) => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, "0")
    const day = String(date.getUTCDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const addDays = (date: Date, days: number) => {
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + days)
    return nextDate
  }

  // Clamp to the target month's last day: setMonth alone overflowed, so "Last 1 Month"
  // on 31 Mar started at 3 Mar instead of 28/29 Feb.
  const addMonths = (date: Date, months: number) => {
    const nextDate = new Date(date)
    nextDate.setDate(1)
    nextDate.setMonth(nextDate.getMonth() + months)
    const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
    nextDate.setDate(Math.min(date.getDate(), lastDay))
    return nextDate
  }

  const makeApiDateRange = (startDate: string, endDate = startDate) => ({
    startDate: `${startDate}T00:00:00+00:00`,
    endDate: `${endDate}T23:59:59+00:00`,
  })

  const getSelectedDateRange = React.useCallback(() => {
    if (bookingDataType === "summary" && summaryDateFilter !== "all") {
      const [startDate, endDate] = summaryDateFilter.split("|")
      return startDate ? makeApiDateRange(startDate, endDate || startDate) : null
    }

    const today = new Date()
    const todayValue = toDateInputValue(today)

    switch (dateFilter) {
      case "today":
        return makeApiDateRange(todayValue)
      case "yesterday":
        return makeApiDateRange(toDateInputValue(addDays(today, -1)))
      case "last7days":
        return makeApiDateRange(toDateInputValue(addDays(today, -6)), todayValue)
      case "last1month":
        return makeApiDateRange(toDateInputValue(addMonths(today, -1)), todayValue)
      case "manual":
        if (!manualStartDate || !manualEndDate) return null
        // A range picked end-first used to match nothing; YYYY-MM-DD sorts as text.
        return manualStartDate <= manualEndDate
          ? makeApiDateRange(manualStartDate, manualEndDate)
          : makeApiDateRange(manualEndDate, manualStartDate)
      default:
        return null
    }
  }, [bookingDataType, dateFilter, manualEndDate, manualStartDate, summaryDateFilter])

  const parseDate = (date: string | number | Date | null | undefined): Date | null => {
    if (!date || date === "Invalid Date") return null

    if (date instanceof Date) {
      return Number.isNaN(date.getTime()) ? null : date
    }

    if (typeof date === "number") {
      const parsed = new Date(date)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const ddmmyyyy = date.match(/^(\d{2})-(\d{2})-(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/)
    if (ddmmyyyy) {
      const parsed = new Date(
        Number(ddmmyyyy[3]),
        Number(ddmmyyyy[2]) - 1,
        Number(ddmmyyyy[1]),
        Number(ddmmyyyy[4] || 0),
        Number(ddmmyyyy[5] || 0),
        Number(ddmmyyyy[6] || 0)
      )
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const parsed = new Date(date)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const formatDate = (date: string | number | Date) => {
    const parsed = parseDate(date)
    if (!parsed) return "N/A"

    return parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatDateTime = (date: string | number | Date) => {
    const parsed = parseDate(date)
    if (!parsed) return "N/A"

    const datePart = parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    const timePart = parsed.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    return `${datePart.replace(/\//g, "-")} ${timePart}`
  }

  const getBookingChannel = (booking: any) => {
    const source = getStringValue(
      booking.BookingSource,
      booking.bookingChannel,
      booking.booking_channel,
      booking.Channel,
      booking.Source,
      booking.source,
      booking.Sources
    )

    if (source.toLowerCase().includes("promoter")) return "Promoter"
    if (source.toLowerCase().includes("bulk")) return "Bulk"
    if (source.toLowerCase().includes("online")) return "Online"
    return source || "Online"
  }

  const normalizeBookingData = (bookings: any[]): Booking[] => {
    return bookings.map((booking, index) => {
      const quantity = getNumberValue(
        booking.TicketQuantity,
        booking.Quantity,
        booking.quantity,
        booking.ticket_quantity,
        booking.TotalQuantity
      )
      const ticketPrice = getNumberValue(booking.TicketPrice, booking.ticketPrice, booking.ticket_price, booking.Price)
      const totalAmount = getNumberValue(
        booking.TotalAmount,
        booking.totalAmount,
        booking.total_amount,
        booking.TotalPrice,
        quantity * ticketPrice
      )
      const ticketName = getStringValue(booking.TicketName, booking.ticketName, booking.ticket_name, booking.Name)
      // Bulk-ticket rows use EventStartDateTime / BatchId / CreatedAt instead.
      const ticketDate = getStringValue(
        booking.TicketDate,
        booking.ticketDate,
        booking.ticket_date,
        booking.EventDate,
        booking.EventStartDateTime
      )
      const eventNameValue = getStringValue(booking.EventName, booking.eventName, booking.event_name)
      const bookingId = getStringValue(
        booking.Booking_id,
        booking.booking_id,
        booking.bookingId,
        booking.BatchId,
        booking.id,
        booking._id
      )
      const channel = getBookingChannel(booking)
      const promoterId = getStringValue(booking.promoter_id, booking.PromoterId, booking.promoterId)
      const statusValue = getStringValue(booking.bookingStatus, booking.BookingStatus, booking.status, booking.Status) || "Confirmed"

      return {
        _id: getStringValue(booking._id, booking.id, bookingId, `booking-${index}`),
        eventId: getStringValue(booking.eventId, booking.event_id, booking.EventId, booking.Event_id, eventId),
        eventName: eventNameValue || "N/A",
        customerName: getStringValue(booking.CustomerName, booking.customerName, booking.customer_name, booking.Name) || "N/A",
        customerEmail: getStringValue(booking.Email, booking.customerEmail, booking.customer_email, booking.email),
        phoneNumber: getStringValue(booking.PhoneNumber, booking.phoneNumber, booking.phone_number, booking.Phone),
        bookingId: bookingId || `booking-${index + 1}`,
        bookingChannel: channel,
        bookingStatus: statusValue,
        totalAmount,
        quantity,
        checkIn: getStringValue(booking.CheckIn, booking.checkIn, booking.Check_In, booking.checkedIn, booking.CheckinCount) || 0,
        ticketType: getStringValue(booking.EventTicketType, booking.ticketType, booking.ticket_type, booking.TicketType),
        ticketName,
        ticketPrice,
        ticketDate,
        bookingDate: getStringValue(
          booking.BookingDateTime,
          booking.bookingDate,
          booking.booking_date,
          booking.FilterationBookingDateTime,
          booking.createdAt,
          booking.CreatedAt,
          booking.created_at
        ),
        promoterId,
        promoterName: getStringValue(booking.Username, booking.username, booking.PromoterName, booking.promoterName, booking.promoter_name) || "-",
        city: getStringValue(booking.EventCityName, booking.city, booking.event_city, booking.CityName) || "-",
        venue: getStringValue(booking.EventVenueName, booking.venue, booking.event_venue, booking.VenueName) || "-",
        source: channel,
        Booking_id: bookingId,
        CustomerName: getStringValue(booking.CustomerName, booking.customerName),
        PhoneNumber: getStringValue(booking.PhoneNumber, booking.phoneNumber),
        Email: getStringValue(booking.Email, booking.email),
        BookingDateTime: getStringValue(booking.BookingDateTime, booking.bookingDate),
        EventName: eventNameValue,
        TicketDate: ticketDate,
        EventCityName: getStringValue(booking.EventCityName, booking.city),
        EventVenueName: getStringValue(booking.EventVenueName, booking.venue),
        PromoterName: getStringValue(booking.Username, booking.username, booking.PromoterName, booking.promoterName),
        TicketQuantity: quantity,
        TicketName: ticketName,
        EventTicketType: getStringValue(booking.EventTicketType, booking.ticketType),
        TicketPrice: ticketPrice,
        TotalAmount: totalAmount,
      }
    })
  }

  const extractBookingsArray = (data: any): any[] => {
    const candidates = [
      data?.data?.latestBookingData,
      data?.data?.EventBulkTicketsData,
      data?.data?.TicketsData,
      data?.data?.SummaryBookingData,
      data?.data?.BookingData,
      data?.data?.bookings,
      data?.latestBookingData,
      data?.TicketsData,
      data?.SummaryBookingData,
      data?.BookingData,
      data?.bookings,
      data?.data,
      data,
    ]

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate
    }

    return []
  }

  const extractSummaryTicketOptions = (data: any, fallbackBookings: Booking[] = []) => {
    const rawTickets = data?.data?.TicketNamesArray || data?.TicketNamesArray || []
    const tickets = Array.isArray(rawTickets)
      ? rawTickets.map((ticket) => getStringValue(ticket)).filter(Boolean)
      : []
    const fallbackTickets = fallbackBookings.map((booking) => booking.ticketName).filter(Boolean)

    return Array.from(new Set([...tickets, ...fallbackTickets]))
  }

  const extractSummaryDateOptions = (data: any, fallbackBookings: Booking[] = []): SummaryDateOption[] => {
    const rawDates = data?.data?.EventDateTimeData || data?.EventDateTimeData || []
    const options = new Map<string, SummaryDateOption>()

    if (Array.isArray(rawDates)) {
      rawDates.forEach((dateItem) => {
        // Event date/times are stored as wall-clock values tagged +00:00, so they
        // are read back as entered instead of being shifted into the local zone.
        const start = parseEventDateTime(dateItem?.EventStartDateTime || dateItem?.startDate || dateItem?.TicketDate)
        if (!start) return

        // One calendar day: the start date. A summary row's TicketDate is its show's
        // EventStartDateTime, and the summary API ignores startDate/endDate, so this range
        // is matched against those rows here. Ending it at EventEndDateTime made a night
        // running past midnight (11 Oct 19:00 - 12 Oct 01:00) also take in 12 Oct's show.
        const startDate = toEventDateInputValue(start)
        const endDate = startDate
        const id = `${startDate}|${endDate}`
        options.set(id, {
          id,
          label: formatEventDate(start, { day: "numeric", month: "long", year: "numeric" }, "en-GB"),
          startDate,
          endDate,
        })
      })
    }

    fallbackBookings.forEach((booking) => {
      const parsed = parseEventDateTime(booking.ticketDate)
      if (!parsed) return

      const date = toEventDateInputValue(parsed)
      const id = `${date}|${date}`
      if (!options.has(id)) {
        options.set(id, {
          id,
          label: formatEventDate(parsed, { day: "numeric", month: "long", year: "numeric" }, "en-GB"),
          startDate: date,
          endDate: date,
        })
      }
    })

    return Array.from(options.values())
  }

  const extractTransactionTotals = (data: any, fallbackBookings: Booking[]): TransactionTotals => {
    const responseData = data?.data || data || {}
    const fallbackTotals = fallbackBookings.reduce(
      (totals, booking) => ({
        totalQuantity: totals.totalQuantity + getNumberValue(booking.quantity),
        totalCheckIn: totals.totalCheckIn + getNumberValue(booking.checkIn),
        totalPrice: totals.totalPrice + getNumberValue(booking.totalAmount),
      }),
      { totalQuantity: 0, totalCheckIn: 0, totalPrice: 0 }
    )

    return {
      totalQuantity: getNumberValue(responseData.totalQuantity, responseData.TotalQuantity, fallbackTotals.totalQuantity),
      totalCheckIn: getNumberValue(
        responseData.totalCheckInCount,
        responseData.totalCheckIn,
        responseData.TotalCheckIn,
        fallbackTotals.totalCheckIn
      ),
      totalPrice: getNumberValue(responseData.totalPrice, responseData.TotalPrice, responseData.totalAmount, fallbackTotals.totalPrice),
    }
  }

  const extractPromotersArray = (data: any): any[] => {
    const candidates = [
      data?.data?.EventPromoters,
      data?.data?.EventPromoter,
      data?.data?.Promoters,
      data?.data?.promoters,
      data?.EventPromoters,
      data?.EventPromoter,
      data?.Promoters,
      data?.promoters,
      data?.data,
      data,
    ]

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate
    }

    return []
  }

  const normalizePromoterOptions = (rawPromoters: any[]): PromoterOption[] => {
    const promoterMap = new Map<string, PromoterOption>()

    rawPromoters.forEach((promoter, index) => {
      const nestedPromoter = promoter?.promoter || promoter?.Promoter || promoter?.PromoterData || promoter
      const id = getStringValue(
        promoter?.promoter_id,
        promoter?.PromoterId,
        promoter?._id,
        nestedPromoter?.promoter_id,
        nestedPromoter?.PromoterId,
        nestedPromoter?._id,
        nestedPromoter?.id
      )
      // /events/getEventPromoters answers { promoter_id, PromoterUsername }.
      const name =
        getStringValue(
          promoter?.PromoterUsername,
          promoter?.PromoterName,
          promoter?.promoterName,
          promoter?.FullName,
          promoter?.Username,
          nestedPromoter?.PromoterName,
          nestedPromoter?.promoterName,
          nestedPromoter?.FullName,
          nestedPromoter?.Username,
          nestedPromoter?.name
        ) || `Promoter ${index + 1}`

      if (id) promoterMap.set(id, { id, name })
    })

    return Array.from(promoterMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  const fetchEventPromoters = React.useCallback(async () => {
    try {
      const authToken = getValidToken()
      if (!authToken) return

      const response = await authFetch(eventEndPoint.GET_EVENT_PROMOTERS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ event_id: eventId }),
      })

      if (!response.ok) {
        setPromoters([])
        return
      }

      const data = await response.json()
      setPromoters(normalizePromoterOptions(extractPromotersArray(data)))
    } catch (error) {
      console.error("Error fetching event promoters:", error)
      setPromoters([])
    }
  }, [eventId])

  const fetchEventBookingsData = React.useCallback(async () => {
    const fetchId = ++latestFetchId.current
    const isStale = () => fetchId !== latestFetchId.current
    try {
      setLoading(true)
      setApiErrorMessage("")

      const authToken = getValidToken()
      if (!user || !authToken) {
        toast({
          title: "Error",
          description: "Please log in to view bookings",
          variant: "destructive",
        })
        setBookingsData([])
        setOriginalData([])
        return
      }

      const isPromoter = (role as UserRole) === "promoter"
      // A promoter reads the shared bookings endpoint pinned to their own promoter_id.
      // /getPromoterLatestBookings accepts only promoter_id, so the event_id and date
      // range this page sends were rejected with a 400.
      let apiEndpoint = organizerEndpoint.GET_ALL_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
      // Bookings never carry a "Bulk" source; bulk tickets live in their own collection.
      const isBulkTab = !isPromoter && bookingDataType === "transaction" && activeTab === "bulk"

      if (!isPromoter && bookingDataType === "summary") {
        apiEndpoint = organizerEndpoint.GET_ALL_SUMMARY_BOOKING_DATA_BY_EVENT_AND_ORGANIZER_ID
      } else if (isBulkTab) {
        apiEndpoint = ticketEndPoint.GET_ALL_BULK_TICKETS_BY_EVENT
      } else if (!isPromoter && activeTab === "promoter") {
        apiEndpoint = organizerEndpoint.GET_PROMOTER_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
      } else if (!isPromoter && activeTab === "online") {
        apiEndpoint = organizerEndpoint.GET_ONLINE_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
      } else if (!isPromoter) {
        apiEndpoint = organizerEndpoint.GET_ALL_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
      }

      const requestPayload: Record<string, any> = {
        event_id: eventId,
      }
      const selectedDateRange = getSelectedDateRange()

      // getBulkTicketsOfEvent reads only event_id; dates are applied client-side below.
      if (!isBulkTab) {
        if (selectedDateRange) {
          requestPayload.startDate = selectedDateRange.startDate
          requestPayload.endDate = selectedDateRange.endDate
        }

        requestPayload.AdminRole = getNumericRole(role as UserRole)
        requestPayload.user_id = user.user_id

        // No organizer_id here: the bookings endpoints overwrite event_id with "all of
        // the organizer's events" when it is present, so this page listed every event.
        if (isPromoter) {
          requestPayload.promoter_id = user.user_id
        } else if (
          promoterFilter !== "all" &&
          !promoterFilter.startsWith(PROMOTER_NAME_FILTER_PREFIX) &&
          bookingDataType === "transaction" &&
          activeTab !== "online"
        ) {
          // The online endpoint's validator has no promoter_id and answers 400.
          requestPayload.promoter_id = promoterFilter
        }
      }

      const postPayload = (payload: Record<string, any>) =>
        authFetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        })

      // Transaction endpoints are server-paginated. This page filters, totals and
      // paginates on the client, so it needs the event's full booking set - asking for
      // a single page of 10 was why events with more bookings showed a short table.
      const isPaginated = isPromoter || (bookingDataType !== "summary" && !isBulkTab)
      if (isPaginated) {
        requestPayload.page = "1"
        requestPayload.limit = SERVER_PAGE_SIZE.toString()
      }

      const response = await postPayload(requestPayload)

      const data = await response.json().catch(() => null)
      if (isStale()) return

      if (response.status === 404) {
        setBookingsData([])
        setOriginalData([])
        setTransactionTotals({ totalQuantity: 0, totalCheckIn: 0, totalPrice: 0 })
        setApiErrorMessage(data?.message || "No bookings found")
        return
      }

      if (!response.ok || data?.error) {
        throw new Error(data?.message || `HTTP error! status: ${response.status}`)
      }

      let bookingsArray = extractBookingsArray(data)

      if (isPaginated) {
        const totalPagesFromApi = Number(data?.data?.totalPages ?? data?.totalPages) || 1
        const remainingPages = Math.min(totalPagesFromApi, MAX_SERVER_PAGES) - 1

        if (remainingPages > 0) {
          const pageResponses = await Promise.all(
            Array.from({ length: remainingPages }, (_, index) =>
              postPayload({ ...requestPayload, page: (index + 2).toString() })
                .then((pageResponse) => (pageResponse.ok ? pageResponse.json() : null))
                .catch(() => null)
            )
          )

          // A failed page used to be skipped, so the table and totals came back short.
          const failedPages = pageResponses.filter((pageData) => !pageData || pageData.error).length
          if (failedPages > 0) {
            throw new Error(`Could not load ${failedPages} of ${totalPagesFromApi} pages of bookings. Please try again.`)
          }

          for (const pageData of pageResponses) {
            bookingsArray = bookingsArray.concat(extractBookingsArray(pageData))
          }
        }

        if (totalPagesFromApi > MAX_SERVER_PAGES && !isStale()) {
          toast({
            title: "Showing partial results",
            description: `Only the first ${MAX_SERVER_PAGES * SERVER_PAGE_SIZE} bookings were loaded. Add a date or promoter filter to see the rest.`,
            variant: "destructive",
          })
        }
      }
      if (isStale()) return
      const eventBookings = bookingsArray.filter((booking) => {
        const rowEventId = getStringValue(booking.eventId, booking.event_id, booking.EventId, booking.Event_id)
        return !rowEventId || rowEventId === eventId
      })

      let normalizedBookings = normalizeBookingData(eventBookings)

      if (bookingDataType === "transaction" && ["promoter", "online", "bulk"].includes(activeTab)) {
        const channel = activeTab === "promoter" ? "Promoter" : activeTab === "bulk" ? "Bulk" : "Online"
        normalizedBookings = normalizedBookings.map((booking) => ({
          ...booking,
          bookingChannel: channel,
          source: channel,
          ...(activeTab === "bulk" ? { promoterName: "-" } : {}),
        }))
      }

      if (bookingDataType === "summary") {
        const ticketOptions = extractSummaryTicketOptions(data, normalizedBookings)
        const dateOptions = extractSummaryDateOptions(data, normalizedBookings)
        setSummaryTicketOptions(ticketOptions)
        setSummaryDateOptions(dateOptions)

        setSummaryTicketFilter((current) => (current !== "all" && !ticketOptions.includes(current) ? "all" : current))
        setSummaryDateFilter((current) =>
          current !== "all" && !dateOptions.some((option) => option.id === current) ? "all" : current
        )
      }

      if (bookingDataType === "transaction") {
        const punchedBy = normalizedBookings
          .filter((booking) => booking.bookingChannel === "Promoter" && booking.promoterName !== "-")
          .map((booking) => booking.promoterName.trim())
        if (punchedBy.length > 0) {
          setBookingPromoterNames((current) => Array.from(new Set([...current, ...punchedBy])))
        }
      }

      setBookingsData(normalizedBookings)
      setOriginalData(normalizedBookings)
      // The summary endpoint returns totalQuantity / totalCheckInCount / totalPrice too.
      setTransactionTotals(extractTransactionTotals(data, normalizedBookings))
      setCurrentPage(1)

      const firstEventName = normalizedBookings.find((booking) => booking.eventName && booking.eventName !== "N/A")?.eventName
      if (firstEventName) setEventName(firstEventName)
    } catch (error) {
      if (isStale()) return
      console.error("Error fetching event bookings:", error)
      const message = describeBookingsError(error instanceof Error ? error.message : "Could not fetch bookings from server")
      setApiErrorMessage(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
      setBookingsData([])
      setOriginalData([])
      setTransactionTotals({ totalQuantity: 0, totalCheckIn: 0, totalPrice: 0 })
    } finally {
      if (!isStale()) setLoading(false)
    }
  }, [activeTab, bookingDataType, eventId, getSelectedDateRange, promoterFilter, role, toast, user])

  React.useEffect(() => {
    fetchEventBookingsData()
  }, [fetchEventBookingsData])

  React.useEffect(() => {
    if ((role as UserRole) !== "promoter") {
      fetchEventPromoters()
    }
  }, [fetchEventPromoters, role])

  React.useEffect(() => {
    const searchLower = normalizeSearchText(searchTerm).toLowerCase()
    const selectedDateRange = getSelectedDateRange()
    const selectedStartTime = selectedDateRange ? new Date(selectedDateRange.startDate).getTime() : null
    const selectedEndTime = selectedDateRange ? new Date(selectedDateRange.endDate).getTime() : null

    const filtered = originalData.filter((booking) => {
      const matchesSearch =
        bookingDataType === "summary"
          ? summaryTicketFilter === "all" ||
            normalizeSearchText(booking.ticketName).trim().toLowerCase() ===
              normalizeSearchText(summaryTicketFilter).trim().toLowerCase()
          : !searchLower ||
            [
              booking.customerName,
              booking.customerEmail,
              booking.phoneNumber,
              booking.bookingId,
              booking.eventName,
              booking.ticketName,
              booking.promoterName,
            ].some((field) => normalizeSearchText(field).toLowerCase().includes(searchLower))

      const matchesDate =
        !selectedDateRange ||
        (() => {
          // The range is a wall-clock day tagged +00:00, so the dates must be read the
          // same way. parseDate reads "11 Oct,2026" as IST midnight (10 Oct 18:30 UTC),
          // which fell outside the selected day and emptied the table.
          const rowDates = [parseEventDateTime(booking.ticketDate), parseEventDateTime(booking.bookingDate)].filter(
            (date): date is Date => date !== null
          )
          // The API already applied this range (all tabs but bulk); a row it returned
          // without a readable date cannot be judged here, so keep it.
          if (rowDates.length === 0 || selectedStartTime === null || selectedEndTime === null) return true
          return rowDates.some((date) => date.getTime() >= selectedStartTime && date.getTime() <= selectedEndTime)
        })()

      // The promoter filter is applied by the API (promoter_id), except for an unassigned
      // promoter whose _id could not be resolved - that one is matched by username here.
      const matchesPromoter =
        bookingDataType !== "transaction" ||
        !promoterFilter.startsWith(PROMOTER_NAME_FILTER_PREFIX) ||
        booking.promoterName.trim().toLowerCase() ===
          promoterFilter.slice(PROMOTER_NAME_FILTER_PREFIX.length).toLowerCase()

      return matchesSearch && matchesDate && matchesPromoter
    })

    setBookingsData(filtered)
    setCurrentPage(1)
  }, [bookingDataType, getSelectedDateRange, originalData, promoterFilter, searchTerm, summaryTicketFilter])

  const assignedPromoterNames = React.useMemo(
    () => new Set(promoters.map((promoter) => promoter.name.trim().toLowerCase())),
    [promoters]
  )
  const unassignedPromoterNames = React.useMemo(
    () => bookingPromoterNames.filter((name) => !assignedPromoterNames.has(name.toLowerCase())),
    [assignedPromoterNames, bookingPromoterNames]
  )

  React.useEffect(() => {
    if (unassignedPromoterNames.length === 0 || promoterLookupRequested.current) return
    promoterLookupRequested.current = true

    const lookupPromoterIds = async () => {
      try {
        const authToken = getValidToken()
        if (!authToken) return

        const response = await authFetch(promoterEndpoint.GET_ALL_PROMOTER_DATA_URL, {
          method: "GET",
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!response.ok) return

        const data = await response.json()
        const rows: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : data?.data?.data || []
        const idsByUsername = new Map<string, string>()
        rows.forEach((promoter) => {
          const id = getStringValue(promoter?._id, promoter?.id)
          const username = getStringValue(promoter?.Username, promoter?.username).trim().toLowerCase()
          if (id && username) idsByUsername.set(username, id)
        })
        setPromoterIdsByUsername(idsByUsername)
      } catch (error) {
        // Not fatal: unresolved promoters are still filterable by username.
        console.warn("Error looking up unassigned promoters (handled):", error)
      }
    }

    lookupPromoterIds()
  }, [unassignedPromoterNames])

  // Assigned promoters plus anyone who punched tickets for this event and was unassigned later.
  const promoterOptions = React.useMemo(() => {
    const options = new Map(promoters.map((promoter) => [promoter.id, promoter]))
    unassignedPromoterNames.forEach((name) => {
      const id = promoterIdsByUsername?.get(name.toLowerCase()) || `${PROMOTER_NAME_FILTER_PREFIX}${name}`
      if (!options.has(id)) options.set(id, { id, name })
    })
    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [promoterIdsByUsername, promoters, unassignedPromoterNames])

  const filteredBookings = bookingsData
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const currentBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const dateFilterOptions: Array<{ value: DateFilterOption; label: string }> = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last7days", label: "Last 7 Days" },
    { value: "last1month", label: "Last 1 Month" },
    { value: "manual", label: "Manual" },
    { value: "all", label: "Reset" },
  ]

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = filename
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // The promoter report used to come from the server's download endpoint, which only
  // narrows its query when the body spells out event_id/organizer_id - without them it
  // returned every booking on the platform. The rows on this page are already scoped to
  // this event, so the workbook is built from them instead.
  const downloadPromoterReport = async () => {
    const promoterRows = filteredBookings.filter(
      (booking) => (booking.bookingChannel || "").toLowerCase() === "promoter"
    )

    if (promoterRows.length === 0) {
      throw new Error("There are no promoter bookings to export for the current filters.")
    }

    downloadBookingsWorkbook(
      promoterRows,
      EVENT_BOOKING_EXPORT_COLUMNS(formatDate, formatDateTime),
      `promoter-bookings-${eventId}-${exportTimestamp()}.xlsx`,
      "Promoter Bookings"
    )
  }

  const exportToExcel = async () => {
    try {
      setApiErrorMessage("")

      if (bookingDataType === "transaction" && activeTab === "promoter") {
        await downloadPromoterReport()
        toast({
          title: "Export Successful",
          description: "Promoter report downloaded successfully",
        })
        return
      }

      const isSummary = bookingDataType === "summary"
      const headers = isSummary
        ? ["Ticket Name", "Quantity", "Ticket Price", "Ticket Date", "Total Amount"]
        : [
            "Name",
            "Booking ID",
            "Phone No.",
            "Email",
            "Booking Date & Time",
            "Event",
            "Ticket Date",
            "City",
            "Venue",
            "Promoter Name",
            "Quantity",
            "Check In",
            "Ticket Name",
            "Ticket Type",
            "Ticket Price",
            "Total Amount",
          ]

      const rows = filteredBookings.map((booking) =>
        isSummary
          ? [
              booking.ticketName,
              booking.quantity,
              booking.ticketPrice,
              formatDate(booking.ticketDate),
              booking.totalAmount,
            ]
          : [
              booking.customerName,
              booking.bookingId,
              booking.phoneNumber,
              booking.customerEmail,
              formatDateTime(booking.bookingDate),
              booking.eventName,
              formatDate(booking.ticketDate),
              booking.city,
              booking.venue,
              booking.promoterName,
              booking.quantity,
              booking.checkIn,
              booking.ticketName,
              booking.ticketType,
              booking.ticketPrice,
              booking.totalAmount,
            ]
      )

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      downloadBlob(blob, `event-${eventId}-${bookingDataType}-bookings-${new Date().toISOString().slice(0, 10)}.csv`)

      toast({
        title: "Export Successful",
        description: `Exported ${filteredBookings.length} bookings to CSV`,
      })
    } catch (error) {
      console.error("Export error:", error)
      const message = error instanceof Error ? error.message : "Failed to export bookings"
      setApiErrorMessage(message)
      toast({
        title: "Export Failed",
        description: message,
        variant: "destructive",
      })
    }
  }

  const renderEmptyRow = (colSpan: number) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
        No data found
      </TableCell>
    </TableRow>
  )

  const SummaryTable = () => (
    <Card className={TABLE_CARD_CLASS}>
      <CardContent className="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[810px]">
            <TableHeader>
              <TableRow className={TABLE_HEADER_CLASS}>
                <TableHead className={`min-w-[220px] ${TABLE_HEAD_CLASS}`}>Ticket Name</TableHead>
                <TableHead className={`min-w-[120px] ${TABLE_HEAD_CLASS}`}>Quantity</TableHead>
                <TableHead className={`min-w-[150px] ${TABLE_HEAD_CLASS}`}>Ticket Price</TableHead>
                <TableHead className={`min-w-[160px] ${TABLE_HEAD_CLASS}`}>Ticket Date</TableHead>
                <TableHead className={`min-w-[160px] ${TABLE_HEAD_CLASS}`}>Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBookings.length === 0
                ? renderEmptyRow(5)
                : currentBookings.map((booking) => {
                    const isCancelled = booking.bookingStatus === "2" || booking.bookingStatus === "Cancelled"

                    return (
                    <TableRow key={booking._id} className={isCancelled ? "bg-red-200 hover:bg-red-200" : "hover:bg-blue-50/40"}>
                      <TableCell className="font-semibold uppercase text-slate-950">{booking.ticketName || "N/A"}</TableCell>
                      <TableCell>{booking.quantity}</TableCell>
                      <TableCell>{booking.ticketPrice}</TableCell>
                      <TableCell>{formatDate(booking.ticketDate)}</TableCell>
                      <TableCell>{booking.totalAmount}</TableCell>
                    </TableRow>
                    )
                  })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  const getDisplayedTransactionTotals = () => {
    const shouldUseFilteredTotals =
      bookingDataType === "summary"
        ? summaryTicketFilter !== "all" || summaryDateFilter !== "all"
        : activeTab === "bulk" || searchTerm.trim() !== "" || dateFilter !== "all" || promoterFilter !== "all"

    if (!shouldUseFilteredTotals) return transactionTotals

    return filteredBookings.reduce(
      (totals, booking) => ({
        totalQuantity: totals.totalQuantity + getNumberValue(booking.quantity),
        totalCheckIn: totals.totalCheckIn + getNumberValue(booking.checkIn),
        totalPrice: totals.totalPrice + getNumberValue(booking.totalAmount),
      }),
      { totalQuantity: 0, totalCheckIn: 0, totalPrice: 0 }
    )
  }

  const TransactionSummaryCards = () => {
    const totals = getDisplayedTransactionTotals()

    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-8 shadow-sm">
          <p className="text-base font-medium text-blue-950">Total Quantity</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{totals.totalQuantity}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-8 shadow-sm">
          <p className="text-base font-medium text-blue-950">Total Checkin</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{totals.totalCheckIn}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-8 shadow-sm">
          <p className="text-base font-medium text-blue-950">Total Price</p>
          <p className="mt-2 text-2xl font-semibold text-primary">Rs.{formatAmount(totals.totalPrice)}</p>
        </div>
      </div>
    )
  }

  const TransactionTable = () => (
    <Card className={TABLE_CARD_CLASS}>
      <CardContent className="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[1500px]">
            <TableHeader>
              <TableRow className={TABLE_HEADER_CLASS}>
                {[
                  "Name",
                  "Booking ID",
                  "Phone No.",
                  "Email",
                  "Booking Date & Time",
                  "Event",
                  "Ticket Date",
                  "City",
                  "Venue",
                  "Promoter Name",
                  "Quantity",
                  "Check In",
                  "Ticket Name",
                  "Ticket Type",
                  "Ticket Price",
                  "Total Amount",
                ].map((heading) => (
                  <TableHead key={heading} className={TABLE_HEAD_CLASS}>
                    {heading}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBookings.length === 0
                ? renderEmptyRow(16)
                : currentBookings.map((booking) => {
                    const isCancelled = booking.bookingStatus === "2" || booking.bookingStatus === "Cancelled"

                    return (
                    <TableRow key={booking._id} className={isCancelled ? "bg-red-200 hover:bg-red-200" : "hover:bg-blue-50/40"}>
                      <TableCell className="font-semibold text-slate-950">{booking.customerName}</TableCell>
                      <TableCell className="font-medium">{booking.bookingId}</TableCell>
                      <TableCell>{booking.phoneNumber || "N/A"}</TableCell>
                      <TableCell>{booking.customerEmail || "N/A"}</TableCell>
                      <TableCell className="font-medium">{formatDateTime(booking.bookingDate)}</TableCell>
                      <TableCell className="font-semibold">{booking.eventName}</TableCell>
                      <TableCell className="font-medium">{formatDate(booking.ticketDate)}</TableCell>
                      <TableCell>{booking.city}</TableCell>
                      <TableCell>{booking.venue}</TableCell>
                      <TableCell>{booking.promoterName}</TableCell>
                      <TableCell>{booking.quantity}</TableCell>
                      <TableCell>{booking.checkIn}</TableCell>
                      <TableCell>{booking.ticketName || "N/A"}</TableCell>
                      <TableCell>{booking.ticketType || "N/A"}</TableCell>
                      <TableCell>{booking.ticketPrice}</TableCell>
                      <TableCell>{booking.totalAmount}</TableCell>
                    </TableRow>
                    )
                  })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  const PaginationControls = () => {
    if (totalPages <= 1) return null

    return (
      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault()
                if (currentPage > 1) setCurrentPage(currentPage - 1)
              }}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          {getPageItems(currentPage, totalPages).map((page, index) =>
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === page}
                  onClick={(event) => {
                    event.preventDefault()
                    setCurrentPage(page)
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault()
                if (currentPage < totalPages) setCurrentPage(currentPage + 1)
              }}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading bookings...</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden">
      <div className="flex min-w-0 max-w-full flex-col gap-8">
        <div className="flex min-w-0 flex-col gap-4 border-b px-4 pb-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Bookings</h1>
            {eventName && <p className="mt-1 text-sm text-muted-foreground">{eventName}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => router.push(`/${role}/events`)}
              className="h-12 border-blue-100 bg-white px-6 text-primary shadow-sm hover:bg-blue-50 hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 gap-5 px-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
              {(role as UserRole) !== "promoter" && (
                <Select
                  value={bookingDataType}
                  onValueChange={(value) => {
                    setBookingDataType(value as BookingDataType)
                    setActiveTab("all")
                    setSearchTerm("")
                    setDateFilter("all")
                    setManualStartDate("")
                    setManualEndDate("")
                    setPromoterFilter("all")
                    setSummaryTicketFilter("all")
                    setSummaryDateFilter("all")
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className={`${CONTROL_CLASS} w-full md:w-[360px]`}>
                    <SelectValue placeholder="Booking Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Booking</SelectItem>
                    <SelectItem value="transaction">Transaction Booking</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {bookingDataType === "summary" ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={`${CONTROL_CLASS} w-full justify-start gap-2 px-4 text-muted-foreground md:w-[150px]`}
                      >
                        <Filter className="h-4 w-4" />
                        Name Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[360px] w-[280px] overflow-y-auto p-2">
                      {summaryTicketOptions.length === 0 ? (
                        <DropdownMenuItem disabled>No tickets found</DropdownMenuItem>
                      ) : (
                        summaryTicketOptions.map((ticketName) => (
                          <DropdownMenuItem
                            key={ticketName}
                            onClick={() => setSummaryTicketFilter(ticketName)}
                            className={summaryTicketFilter === ticketName ? "bg-blue-50 text-primary" : ""}
                          >
                            {ticketName}
                          </DropdownMenuItem>
                        ))
                      )}
                      <DropdownMenuItem
                        onClick={() => setSummaryTicketFilter("all")}
                        className="mt-1 border-t pt-2 font-medium text-primary"
                      >
                        Reset Filter
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={`${CONTROL_CLASS} w-full justify-start gap-2 px-4 text-muted-foreground md:w-[150px]`}
                      >
                        <Filter className="h-4 w-4" />
                        Date Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[220px] p-2">
                      {summaryDateOptions.length === 0 ? (
                        <DropdownMenuItem disabled>No dates found</DropdownMenuItem>
                      ) : (
                        summaryDateOptions.map((dateOption) => (
                          <DropdownMenuItem
                            key={dateOption.id}
                            onClick={() => setSummaryDateFilter(dateOption.id)}
                            className={summaryDateFilter === dateOption.id ? "bg-blue-50 text-primary" : ""}
                          >
                            {dateOption.label}
                          </DropdownMenuItem>
                        ))
                      )}
                      <DropdownMenuItem
                        onClick={() => setSummaryDateFilter("all")}
                        className="mt-1 border-t pt-2 font-medium text-primary"
                      >
                        Reset Filter
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <div className="relative w-full md:w-[460px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by name, booking ID, email or phone"
                      className={`${CONTROL_CLASS} pl-10`}
                    />
                  </div>
                  {(role as UserRole) !== "promoter" && activeTab !== "online" && activeTab !== "bulk" && (
                    <Select value={promoterFilter} onValueChange={setPromoterFilter}>
                      <SelectTrigger className={`${CONTROL_CLASS} w-full md:w-[200px]`}>
                        <SelectValue placeholder="Promoter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Promoter</SelectItem>
                        {promoterOptions.map((promoter) => (
                          <SelectItem key={promoter.id} value={promoter.id}>
                            {promoter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Totals were hidden on the default "All" tab and in the summary view. */}
          <TransactionSummaryCards />

          {bookingDataType === "transaction" && (role as UserRole) !== "promoter" && (
            <div className="flex min-w-0 flex-wrap items-center gap-4 md:gap-8">
              {(["all", "promoter", "online", "bulk"] as BookingTab[]).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setActiveTab(tab)
                    setCurrentPage(1)
                    // Online and bulk rows have no promoter, and the online endpoint
                    // rejects promoter_id - drop the filter instead of sending it.
                    if (tab === "online" || tab === "bulk") setPromoterFilter("all")
                  }}
                  className={
                    activeTab === tab
                      ? "h-10 min-w-20 capitalize bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "h-10 min-w-20 capitalize text-blue-950 hover:bg-blue-50 hover:text-primary"
                  }
                >
                  {tab}
                </Button>
              ))}
              <div className="w-full sm:ml-auto sm:w-auto">
                <div className="flex w-full gap-3 sm:w-auto">
                  {/* This button had no handler; it now opens the date filter beside it. */}
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    aria-label="Filter by date"
                    onClick={() => setIsDateFilterOpen(true)}
                    className={`${ICON_BUTTON_CLASS} ${dateFilter !== "all" ? "border-primary text-primary" : ""}`}
                  >
                    <Filter className="h-5 w-5" />
                  </Button>
                  <Select
                    open={isDateFilterOpen}
                    onOpenChange={setIsDateFilterOpen}
                    value={dateFilter}
                    onValueChange={(value) => {
                      setDateFilter(value as DateFilterOption)
                      if (value !== "manual") {
                        setManualStartDate("")
                        setManualEndDate("")
                      }
                    }}
                  >
                  <SelectTrigger className={`${CONTROL_CLASS} w-full sm:w-[170px]`}>
                    <span>
                      {dateFilter === "all"
                        ? "Select date"
                        : dateFilterOptions.find((option) => option.value === dateFilter)?.label || "Select date"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {dateFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
                {dateFilter === "manual" && (
                  <div className="mt-3 flex w-full flex-col gap-3 sm:flex-row">
                    <Input
                      type="date"
                      value={manualStartDate}
                      onChange={(event) => setManualStartDate(event.target.value)}
                      aria-label="Start date"
                      className={`${CONTROL_CLASS} w-full sm:w-[170px]`}
                    />
                    <Input
                      type="date"
                      value={manualEndDate}
                      onChange={(event) => setManualEndDate(event.target.value)}
                      aria-label="End date"
                      className={`${CONTROL_CLASS} w-full sm:w-[170px]`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid min-w-0 gap-4 px-4 sm:px-6">
          {apiErrorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {apiErrorMessage}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={exportToExcel} className="h-12 bg-primary px-6 text-primary-foreground shadow-sm hover:bg-primary/90">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
          {bookingDataType === "summary" ? <SummaryTable /> : <TransactionTable />}
          <PaginationControls />
        </div>
      </div>
    </div>
  )
}
