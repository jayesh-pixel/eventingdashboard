"use client"

import { authFetch } from "@/lib/auth-fetch"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Filter, Loader2, AlertCircle, ChevronDown } from "lucide-react"
import { useIsMobile } from "@/components/ui/use-mobile"
import type { UserRole } from "@/lib/navigation"
import type { Booking } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { getNumericRole } from "@/lib/role-mapping"
import { downloadBookingsWorkbook, exportTimestamp, fetchAllBookingPages, type ExportColumn } from "@/lib/booking-export"
import {
  eventEndPoint,
  getallcityDataEndPoint,
  organizerEndpoint,
  promoterEndpoint,
  promoterEndPointPannel,
  venueEndPoint,
} from "@/lib/api-endpoints"
import { getValidToken } from "@/lib/token-utils"
import { handleApiResponse, getApiErrorMessage, normalizeSearchText } from "@/lib/utils"
import { BookingsTable, type BookingColumnKey } from "@/components/bookings-table"
import { SearchableSelect } from "@/components/searchable-select"

const ONLINE_TAB_COLUMNS: BookingColumnKey[] = [
  "name", "bookingId", "phone", "email", "bookingDateTime", "eventName", "ticketDate",
  "source", "city", "venue", "quantity", "checkIn", "ticketName", "ticketType",
  "referenceId", "ticketPrice", "promocode", "promoValue", "convenienceFee", "gst",
  "totalAmount", "status", "actions",
]

const PROMOTER_TAB_COLUMNS: BookingColumnKey[] = [
  "name", "bookingId", "phone", "email", "bookingDateTime", "eventName", "ticketDate",
  "city", "venue", "promoterName", "quantity", "ticketName", "ticketType",
  "ticketPrice", "totalAmount", "status",
]

// Superset used for the "All Bookings" tab (mixes online + promoter bookings)
const ALL_TAB_COLUMNS: BookingColumnKey[] = [
  "name", "bookingId", "phone", "email", "bookingDateTime", "eventName", "ticketDate",
  "source", "city", "venue", "promoterName", "quantity", "checkIn", "ticketName", "ticketType",
  "referenceId", "ticketPrice", "promocode", "promoValue", "convenienceFee", "gst",
  "totalAmount", "remark", "status", "actions",
]

// Resolve the column set for a given tab so no tab falls back to the reduced default
const getColumnsForTab = (tab: string): BookingColumnKey[] => {
  switch (tab) {
    case "online":
      return ONLINE_TAB_COLUMNS
    case "promoter":
    case "my-bookings":
      return PROMOTER_TAB_COLUMNS
    default:
      return ALL_TAB_COLUMNS
  }
}
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface BookingsPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>}

const ITEMS_PER_PAGE = 10
// Matches `searchkeyword: Joi.string().min(3)` on the bookings endpoints.
const MIN_SEARCH_LENGTH = 3
type DateFilterOption = "all" | "today" | "yesterday" | "last7days" | "last1month" | "manual"

// Bookings come back under a different key depending on which endpoint answered.
const extractBookingsArray = (data: any): any[] => {
  const container = data?.data ?? data

  if (Array.isArray(container)) return container

  for (const key of ["latestBookingData", "TicketsData", "SummaryBookingData", "BookingData"]) {
    if (Array.isArray(container?.[key])) return container[key]
  }

  return []
}

type BookingScopeFilters = {
  searchTerm?: string
  cityName?: string
  venueId?: string
  eventId?: string
  promoterId?: string
  organizerId?: string
}

export default function BookingsPage({ params }: BookingsPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role } = resolvedParams
  const { user } = useAuth()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  
  // State management
  const [loading, setLoading] = React.useState(true)
  const [hasLoadedBookings, setHasLoadedBookings] = React.useState(false)
  const [bookingsData, setBookingsData] = React.useState<Booking[]>([])
  const [originalData, setOriginalData] = React.useState<Booking[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isExporting, setIsExporting] = React.useState(false)
  const [paginationMeta, setPaginationMeta] = React.useState({
    totalPages: 0,
    totalBookings: 0,
  })
  const [activeTab, setActiveTab] = React.useState(role === "promoter" ? "my-bookings" : "all")
  const [bookingDataType] = React.useState<"transaction" | "summary">("transaction")

  // Error popup state
  const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string>("")

  // Search and filter state
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [dateFilter, setDateFilter] = React.useState<DateFilterOption>("all")
  const [manualStartDate, setManualStartDate] = React.useState("")
  const [manualEndDate, setManualEndDate] = React.useState("")
  const [cityFilter, setCityFilter] = React.useState("all")
  const [venueFilter, setVenueFilter] = React.useState("all")
  const [eventFilter, setEventFilter] = React.useState("all")
  const [promoterFilter, setPromoterFilter] = React.useState("all")
  const [draftCityFilter, setDraftCityFilter] = React.useState("all")
  const [draftVenueFilter, setDraftVenueFilter] = React.useState("all")
  const [draftEventFilter, setDraftEventFilter] = React.useState("all")
  const [draftPromoterFilter, setDraftPromoterFilter] = React.useState("all")
  const [organizerFilter, setOrganizerFilter] = React.useState("all")
  const [draftOrganizerFilter, setDraftOrganizerFilter] = React.useState("all")
  const [isFilterDialogOpen, setIsFilterDialogOpen] = React.useState(false)

  // Filter dropdown sources loaded from the dedicated list APIs (see fetchAllFilterOptions).
  // They are refreshed every time the filter icon is clicked so the options are not limited
  // to whatever happens to be on the bookings page currently loaded.
  const [filterOptionsLoading, setFilterOptionsLoading] = React.useState(false)
  const [apiCities, setApiCities] = React.useState<string[]>([])
  const [apiVenues, setApiVenues] = React.useState<Array<{ id: string; name: string }>>([])
  const [apiEvents, setApiEvents] = React.useState<Array<{ id: string; name: string }>>([])
  const [apiOrganizers, setApiOrganizers] = React.useState<Array<{ id: string; name: string }>>([])
  const [apiPromoters, setApiPromoters] = React.useState<Array<{ id: string; name: string }>>([])

  // An organizer only ever sees their own bookings, a promoter never sees organizers.
  const canFilterByOrganizer = (role as UserRole) !== "promoter" && (role as UserRole) !== "organizer"

  // Mobile UI state
  const [isTabsDropdownOpen, setIsTabsDropdownOpen] = React.useState(false)
  // Helper function to show error popup
  const showErrorPopup = (message: string) => {
    setErrorMessage(message)
    setIsErrorDialogOpen(true)
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

  const addMonths = (date: Date, months: number) => {
    const nextDate = new Date(date)
    nextDate.setMonth(nextDate.getMonth() + months)
    return nextDate
  }

  const makeApiDateRange = (startDate: string, endDate = startDate) => ({
    startDate: `${startDate}T00:00:00+00:00`,
    endDate: `${endDate}T23:59:59+00:00`,
  })

  const getSelectedDateRange = React.useCallback(() => {
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
        return manualStartDate && manualEndDate ? makeApiDateRange(manualStartDate, manualEndDate) : null
      default:
        return null
    }
  }, [dateFilter, manualEndDate, manualStartDate])

  // Every bookings request - the table *and* the Excel export - has to carry the same
  // scope. The backend only narrows its query when it is handed organizer_id/promoter_id,
  // so a payload that omits them silently returns every booking on the platform.
  const buildBookingScopePayload = React.useCallback(
    (filters?: BookingScopeFilters) => {
      const payload: Record<string, any> = {}
      const isPromoter = (role as UserRole) === "promoter"

      if (isPromoter) {
        payload.promoter_id = user?.user_id
      } else {
        payload.AdminRole = getNumericRole(role as UserRole)
        payload.user_id = user?.user_id

        // An organizer is always pinned to their own events, never the whole platform.
        if ((role as UserRole) === "organizer" && user?.user_id) {
          payload.organizer_id = user.user_id
        }
      }

      // The API validates searchkeyword as a min-3-character string and rejects the
      // whole request with 400 when it is shorter, so a one or two letter search wiped
      // the table out instead of narrowing it. Below the threshold the keyword is simply
      // not sent and the unfiltered list stays on screen.
      if (filters?.searchTerm && filters.searchTerm.length >= MIN_SEARCH_LENGTH) {
        payload.searchkeyword = filters.searchTerm
      }
      if (filters?.cityName && filters.cityName !== "all") {
        payload.cityname = filters.cityName
      }
      if (filters?.venueId && filters.venueId !== "all") {
        payload.venue_id = filters.venueId
      }
      if (filters?.eventId && filters.eventId !== "all") {
        payload.event_id = filters.eventId
      }
      if (!isPromoter && filters?.promoterId && filters.promoterId !== "all") {
        payload.promoter_id = filters.promoterId
      }
      // Organizers already have organizer_id pinned to themselves above.
      if (canFilterByOrganizer && filters?.organizerId && filters.organizerId !== "all") {
        payload.organizer_id = filters.organizerId
      }

      const selectedDateRange = getSelectedDateRange()
      if (selectedDateRange) {
        payload.startDate = selectedDateRange.startDate
        payload.endDate = selectedDateRange.endDate
      }

      return payload
    },
    [canFilterByOrganizer, getSelectedDateRange, role, user]
  )

  // The endpoint the table is reading. The export reads the very same one, so the
  // file can only ever contain what the user is actually allowed to see.
  const getBookingsListEndpoint = React.useCallback(() => {
    if ((role as UserRole) === "promoter") {
      return promoterEndPointPannel.GET_PROMOTER_LATEST_BOOKINGS
    }

    if (bookingDataType === "summary") {
      return organizerEndpoint.GET_ALL_SUMMARY_BOOKING_DATA_BY_EVENT_AND_ORGANIZER_ID
    }

    switch (activeTab) {
      case "promoter":
        return organizerEndpoint.GET_PROMOTER_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
      case "online":
        return organizerEndpoint.GET_ONLINE_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
      default:
        return organizerEndpoint.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENT_AND_ORGANIZER_ID
    }
  }, [activeTab, bookingDataType, role])

  // Filters currently applied to the table, used to keep the export in sync with it.
  const activeScopeFilters = (): BookingScopeFilters => ({
    searchTerm: debouncedSearchTerm !== "" ? debouncedSearchTerm : undefined,
    cityName: cityFilter,
    venueId: venueFilter,
    eventId: eventFilter,
    promoterId: promoterFilter,
    organizerId: organizerFilter,
  })

  const dateFilterOptions: Array<{ value: DateFilterOption; label: string }> = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last7days", label: "Last 7 Days" },
    { value: "last1month", label: "Last 1 Month" },
    { value: "manual", label: "Manual" },
    { value: "all", label: "Reset" },
  ]

  // Helper function to get available tabs based on role
  const getAvailableTabs = () => {
    const tabs = []
    
    if ((role as UserRole) !== "promoter") {
      tabs.push({
        value: "all",
        label: "All Bookings",
        count: totalBookingsCount
      })
    }

    if ((role as UserRole) === "promoter") {
      tabs.push({
        value: "my-bookings",
        label: "My Bookings",
        count: totalBookingsCount
      })
    }

    if ((role as UserRole) === "superadmin" || (role as UserRole) === "organizer") {
      tabs.push({
        value: "promoter",
        label: "Promoter",
        count: bookingsData.filter((b) => b.bookingChannel === "Promoter").length
      })
    }

    if ((role as UserRole) !== "promoter") {
      tabs.push({
        value: "online",
        label: "Online",
        count: bookingsData.filter((b) => b.bookingChannel === "Online").length
      })
    }

    return tabs
  }

  // Get active tab label for mobile dropdown
  const getActiveTabLabel = () => {
    const tabs = getAvailableTabs()
    const activeTabData = tabs.find(tab => tab.value === activeTab)
    return activeTabData ? activeTabData.label : "Select Tab"
  }
  // Mobile tabs component
  const MobileTabs = () => (
    <div className="space-y-3">
      {/* Active tab dropdown */}
      <DropdownMenu open={isTabsDropdownOpen} onOpenChange={setIsTabsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-12 text-left font-medium"
          >
            <span className="truncate">{getActiveTabLabel()}</span>
            <ChevronDown className={`h-4 w-4 opacity-50 transition-transform duration-200 ${isTabsDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full min-w-[300px]" align="start">
          <DropdownMenuLabel>Select Tab</DropdownMenuLabel>
          {getAvailableTabs().map((tab) => (
            <DropdownMenuItem
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value)
                setIsTabsDropdownOpen(false)
              }}
              className={`${activeTab === tab.value ? "bg-accent text-accent-foreground" : ""} cursor-pointer`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-medium">{tab.label}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  )

  // Desktop tabs component (existing style)
  const DesktopTabs = () => (
    <TabsList className="grid w-full grid-cols-3 rounded-md bg-muted p-1 lg:w-auto lg:inline-flex lg:grid-cols-none">
      {getAvailableTabs().map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className="min-w-0 flex-1 whitespace-nowrap px-4 py-2 text-xs lg:flex-none lg:text-sm"
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )

  // Helper function to normalize booking data
  const normalizeBookingData = (bookings: any[]): Booking[] => {
    return bookings.map((booking, index) => {
      const bookingId = booking._id || booking.id || booking.Booking_id || booking.booking_id || `temp-id-${index}`
      const phoneNumber = booking.PhoneNumber || booking.phoneNumber || booking.phone_number || booking.Phone || ""
      const promoterName =
        booking.PromoterName ||
        booking.promoterName ||
        booking.promoter_name ||
        booking.PromoterFullName ||
        booking.promoter_full_name ||
        booking.promoter?.FullName ||
        booking.Promoter?.FullName ||
        ""
      const organizerName = booking.OrganizerName || booking.organizerName || booking.organizer_name || ""
      const city = booking.EventCityName || booking.city || booking.event_city || booking.CityName || ""
      const venue = booking.EventVenueName || booking.venue || booking.event_venue || booking.VenueName || ""
      const ticketDate = booking.TicketDate || booking.ticketDate || booking.ticket_date || ""
      const ticketName = booking.TicketName || booking.ticketName || booking.ticket_name || ""
      const ticketType = booking.EventTicketType || booking.ticketType || booking.ticket_type || ""
      const ticketPrice = booking.TicketPrice || booking.ticketPrice || booking.ticket_price || 0
      const quantity = booking.TicketQuantity || booking.Quantity || booking.quantity || booking.ticket_quantity || booking.TotalQuantity || 0
      const bookingDate = booking.BookingDateTime || booking.bookingDate || booking.booking_date || booking.FilterationBookingDateTime || booking.createdAt || booking.created_at || ""
      const totalAmount = booking.TotalAmount || booking.totalAmount || booking.total_amount || booking.Price || booking.price || 0
      
      // BookingSource is the CORRECT API field - it returns "Promoter" or "Online"
      // Do NOT use other fields as they may have different values
      const bookingSource =
        booking.BookingSource ||
        ((role as UserRole) === "promoter" || activeTab === "promoter" ? "Promoter" : "Online")

      let status: "Confirmed" | "Pending" | "Cancelled" | "Booked" = "Confirmed"
      if (booking.status !== undefined) {
        if (booking.status === 1 || booking.status === "1") {
          status = "Confirmed"
        } else if (booking.status === 0 || booking.status === "0" || booking.status === 2 || booking.status === "2") {
          status = "Cancelled"
        } else if (typeof booking.status === "string") {
          if (["Confirmed", "Pending", "Cancelled", "Booked"].includes(booking.status)) {
            status = booking.status as "Confirmed" | "Pending" | "Cancelled" | "Booked"
          }
        }
      } else if (booking.Status !== undefined) {
        if (booking.Status === 1 || booking.Status === "1") {
          status = "Confirmed"
        } else if (booking.Status === 0 || booking.Status === "0" || booking.Status === 2 || booking.Status === "2") {
          status = "Cancelled"
        } else if (typeof booking.Status === "string") {
          if (["Confirmed", "Pending", "Cancelled", "Booked"].includes(booking.Status)) {
            status = booking.Status as "Confirmed" | "Pending" | "Cancelled" | "Booked"
          }
        }
      } else {
        const bookingStatus = booking.bookingStatus || booking.booking_status
        if (bookingStatus && ["Confirmed", "Pending", "Cancelled", "Booked"].includes(bookingStatus)) {
          status = bookingStatus as "Confirmed" | "Pending" | "Cancelled" | "Booked"
        }
      }

      return {
        _id: bookingId,
        eventId: booking.eventId || booking.event_id || booking.EventId || booking.Event_id || booking.eventID || booking.EventID || "",
        eventName: booking.EventName || booking.eventName || booking.event_name || "N/A",
        customerId: booking.customerId || booking.customer_id || booking.CustomerId || "",
        customerName: normalizeSearchText(booking.CustomerName || booking.customerName || booking.customer_name) || "N/A",
        customerEmail: booking.Email || booking.customerEmail || booking.customer_email || booking.email || "",
        phoneNumber: phoneNumber,
        promoterId: booking.promoterId || booking.promoter_id || booking.PromoterId || "",
        promoterName: promoterName,
        organizerId: booking.organizerId || booking.organizer_id || booking.OrganizerId || "",
        organizerName: organizerName,
        bookingChannel: bookingSource,
        bookingStatus: status,
        totalAmount: totalAmount,
        ticketPrice: ticketPrice,
        quantity: quantity,
        ticketName: ticketName,
        ticketType: ticketType,
        city: city,
        venue: venue,        ticketDate: ticketDate,
        bookingDate: bookingDate,
        createdAt: booking.createdAt || booking.created_at || bookingDate || new Date().toISOString(),
        updatedAt: booking.updatedAt || booking.updated_at || bookingDate || new Date().toISOString(),
        // Additional API fields for compatibility
        Booking_id: booking.Booking_id || booking.booking_id,
        CustomerName: normalizeSearchText(booking.CustomerName || booking.customerName),
        PhoneNumber: booking.PhoneNumber || booking.phoneNumber,
        Email: booking.Email || booking.email,
        BookingDateTime: booking.BookingDateTime || booking.bookingDate,
        EventName: booking.EventName || booking.eventName,
        TicketDate: booking.TicketDate || booking.ticketDate,
        EventCityName: booking.EventCityName || booking.city,
        EventVenueName: booking.EventVenueName || booking.venue,
        PromoterName: promoterName,
        OrganizerName: booking.OrganizerName || booking.organizerName,
        OrganizerId: booking.OrganizerId || booking.organizerId,
        TicketQuantity: booking.TicketQuantity || booking.Quantity || booking.quantity || booking.TotalQuantity,
        TicketName: booking.TicketName || booking.ticketName,
        EventTicketType: booking.EventTicketType || booking.ticketType,
        TicketPrice: booking.TicketPrice || booking.ticketPrice,
        TotalAmount: booking.TotalAmount || booking.totalAmount,
        status: booking.status,
        Remark: booking.Remark || booking.remark,
        // Extended columns (best-effort mapping of raw API fields; render "-"/0 when absent)
        checkIn: booking.CheckIn ?? booking.checkIn ?? booking.Check_In ?? booking.Checkin ?? booking.CheckinCount ?? 0,
        Check_In: booking.Check_In ?? booking.CheckIn ?? booking.checkIn,
        referenceId: booking.ReferenceId || booking.referenceId || booking.Reference_id || booking.reference_id || booking.ReferenceID || "",
        promocode: booking.CustomerPromocode || booking.Promocode || booking.promocode || booking.PromoCodeName || booking.promocode_name || "",
        promoValue: booking.PromoValue ?? booking.promoValue ?? booking.Discount ?? booking.discount ?? "",
        convenienceFee: booking.ConvinienceFeeValue ?? booking.convenienceFeeValue ?? booking.ConvenienceFee ?? booking.convenienceFee ?? booking.ConvinienceFeeAmount ?? "",
        gst: booking.GST ?? booking.Gst ?? booking.gst ?? booking.GSTAmount ?? "",
        scannedBy: booking.ScannedBy || booking.scannedBy || booking.scanned_by || booking.ScannedByName || "",
      }
    })
  }

  // Fetch bookings data
  const fetchBookingsData = async (filters?: {
    searchTerm?: string
    page?: number
    cityName?: string
    venueId?: string
    eventId?: string
    promoterId?: string
    organizerId?: string
  }) => {
    try {
      setLoading(true)

      const authToken = localStorage.getItem("authToken")

      if (!user || !authToken) {
        console.warn("No user or auth token available")
        showErrorPopup("Please log in to view bookings")
        setLoading(false)
        return
      }

      const apiEndpoint = getBookingsListEndpoint()
      const requestPayload: any = buildBookingScopePayload(filters)

      if ((role as UserRole) !== "promoter") {
        requestPayload.page = (filters?.page ?? currentPage).toString()
        requestPayload.limit = ITEMS_PER_PAGE.toString()
      }

      console.log("🚀 BOOKING API CALL:")
      console.log("- Active tab:", activeTab)
      console.log("- Endpoint:", apiEndpoint)
      console.log("- Payload:", requestPayload)
      console.log("- Applied filters:", filters || "none")
      console.log("- Full URL being called:", apiEndpoint)

      const response = await authFetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      })

      // Treat 404 as no data (show empty state, not an error dialog)
      if (response.status === 404) {
        console.warn("Received 404 from bookings API – showing empty state")
        setBookingsData([])
        setOriginalData([])
        setPaginationMeta({ totalPages: 0, totalBookings: 0 })
        setHasLoadedBookings(true)
        return
      }

      const data = await handleApiResponse(response)
      console.log("🎯 BOOKING API RESPONSE SUCCESS:")
      console.log("- Response status:", response.status)
      console.log("- Response size:", JSON.stringify(data).length, "characters")
      console.log("- Response keys:", Object.keys(data || {}))

      let bookingsArray = null
      const responseData = data?.data && typeof data.data === "object" ? data.data : data
      const apiTotalPages = Number(responseData?.totalPages) || 0
      const apiTotalBookings = Number(responseData?.totalBookings) || 0
      const apiCurrentPage = Number(responseData?.currentPage) || filters?.page || currentPage
      
      // Log the response structure for debugging
      console.log("🔍 API Response Structure:", JSON.stringify(data, null, 2))
      
      if (data && data.data && data.data.latestBookingData && Array.isArray(data.data.latestBookingData)) {
        bookingsArray = data.data.latestBookingData
        console.log("✅ Found latestBookingData array with", bookingsArray.length, "items")
      } else if (data && data.data && data.data.TicketsData && Array.isArray(data.data.TicketsData)) {
        bookingsArray = data.data.TicketsData
        console.log("✅ Found TicketsData array with", bookingsArray.length, "items")
      } else if (data && data.data && data.data.SummaryBookingData && Array.isArray(data.data.SummaryBookingData)) {
        bookingsArray = data.data.SummaryBookingData
        console.log("✅ Found SummaryBookingData array with", bookingsArray.length, "items")
      } else if (data && data.data && data.data.BookingData && Array.isArray(data.data.BookingData)) {
        bookingsArray = data.data.BookingData
        console.log("✅ Found BookingData array with", bookingsArray.length, "items")
      } else if (data && data.data && Array.isArray(data.data)) {
        bookingsArray = data.data
        console.log("✅ Found data.data array with", bookingsArray.length, "items")
      } else if (data && data.TicketsData && Array.isArray(data.TicketsData)) {
        bookingsArray = data.TicketsData
        console.log("✅ Found TicketsData array with", bookingsArray.length, "items")
      } else if (data && data.SummaryBookingData && Array.isArray(data.SummaryBookingData)) {
        bookingsArray = data.SummaryBookingData
        console.log("✅ Found SummaryBookingData array with", bookingsArray.length, "items")
      } else if (data && data.BookingData && Array.isArray(data.BookingData)) {
        bookingsArray = data.BookingData
        console.log("✅ Found BookingData array with", bookingsArray.length, "items")
      } else if (data && data.latestBookingData && Array.isArray(data.latestBookingData)) {
        bookingsArray = data.latestBookingData
        console.log("✅ Found latestBookingData array with", bookingsArray.length, "items")
      } else if (data && Array.isArray(data)) {
        bookingsArray = data
        console.log("✅ Found root data array with", bookingsArray.length, "items")
      } else if (data && typeof data === 'object') {
        const keys = Object.keys(data)
        console.log("🔍 Available keys in response:", keys)
        for (const key of keys) {
          if (Array.isArray(data[key])) {
            bookingsArray = data[key]
            console.log("✅ Found array in key:", key, "with", bookingsArray.length, "items")
            break
          }
        }
      }
      
      if (!bookingsArray) {
        console.error("❌ Could not find bookings array in response structure")
      }      if (bookingsArray && Array.isArray(bookingsArray)) {
        console.log("🔄 Processing", bookingsArray.length, "raw bookings")
        console.log("📝 Sample raw booking:", bookingsArray[0] ? JSON.stringify(bookingsArray[0], null, 2) : "No bookings available")
        
        const normalizedBookings = normalizeBookingData(bookingsArray)
        console.log("✅ Normalized", normalizedBookings.length, "bookings")
        console.log("📋 Sample normalized booking:", normalizedBookings[0] ? JSON.stringify(normalizedBookings[0], null, 2) : "No normalized bookings")
        
        // Sort bookings by booking date (latest first) - using multiple date fields as fallback
        const sortedBookings = normalizedBookings.sort((a, b) => {
          const dateA = parseDate(a.BookingDateTime || a.bookingDate || a.FilterationBookingDateTime || a.createdAt)
          const dateB = parseDate(b.BookingDateTime || b.bookingDate || b.FilterationBookingDateTime || b.createdAt)
          if (!dateA && !dateB) return 0
          if (!dateA) return 1
          if (!dateB) return -1
          return dateB.getTime() - dateA.getTime() // Descending order (latest first)
        })
        console.log("🔃 Sorted", sortedBookings.length, "bookings by date (latest first)")
        if (sortedBookings.length > 0) {
          console.log("📅 First booking date:", sortedBookings[0].BookingDateTime || sortedBookings[0].bookingDate)
          console.log("📅 Last booking date:", sortedBookings[sortedBookings.length - 1].BookingDateTime || sortedBookings[sortedBookings.length - 1].bookingDate)
        }
          
        setBookingsData(sortedBookings)
        setOriginalData(sortedBookings)
        setCurrentPage(apiCurrentPage)
        setPaginationMeta({
          totalPages: apiTotalPages,
          totalBookings: apiTotalBookings,
        })
        
        console.log("📊 FINAL STATE UPDATE:")
        console.log("- bookingsData will be set to", normalizedBookings.length, "items")
        console.log("- originalData will be set to", normalizedBookings.length, "items")
        console.log("- totalPages from API:", apiTotalPages)
        console.log("- totalBookings from API:", apiTotalBookings)
        
        if (normalizedBookings.length > 0) {
          toast({
            title: "Success",
            description: `Loaded ${normalizedBookings.length} bookings successfully`,
          })
        } else {
          console.warn("⚠️ No bookings found after normalization")
          toast({
            title: "No Data",
            description: "No bookings found",
          })
        }
      } else {
        console.error("❌ No valid bookings array found")
        throw new Error("No valid bookings array found in response")
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to fetch bookings"),
        variant: "destructive",
      })
      setBookingsData([])
      setOriginalData([])
      setPaginationMeta({ totalPages: 0, totalBookings: 0 })
    } finally {
      setHasLoadedBookings(true)
      setLoading(false)
    }
  }

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      // Trim/collapse spaces here so a keyword typed as " eventing club llp "
      // still matches; the raw value stays in the input box.
      setDebouncedSearchTerm(normalizeSearchText(searchTerm))
    }, 500)

    return () => clearTimeout(delay)
  }, [searchTerm])

  // Search uses the currently applied filters. Modal/sheet filter changes still wait for Apply.
  React.useEffect(() => {
    if (!user) return

    const filters = {
      searchTerm: debouncedSearchTerm !== "" ? debouncedSearchTerm : undefined,
      page: 1,
      cityName: cityFilter,
      venueId: venueFilter,
      eventId: eventFilter,
      promoterId: promoterFilter,
      organizerId: organizerFilter,
    }

    setCurrentPage(1)
    console.log("🔍 Applying filters via API:", filters)
    fetchBookingsData(filters)
  }, [
    debouncedSearchTerm,
    user,
    bookingDataType,
    dateFilter,
    manualStartDate,
    manualEndDate,
    cityFilter,
    venueFilter,
    eventFilter,
    promoterFilter,
    organizerFilter,
  ])

  // Initial data fetch - refetch when user or activeTab changes
  React.useEffect(() => {
    if (user) {
      // Fetch data without filters initially
      setCurrentPage(1)
      fetchBookingsData({
        page: 1,
        cityName: cityFilter,
        venueId: venueFilter,
        eventId: eventFilter,
        promoterId: promoterFilter,
        organizerId: organizerFilter,
      })
    }
  }, [user, activeTab, bookingDataType])
  
  const handlePageChange = (page: number) => {
    if (page < 1 || (totalPages > 0 && page > totalPages)) return
    setCurrentPage(page)
    fetchBookingsData({
      searchTerm: debouncedSearchTerm !== "" ? debouncedSearchTerm : undefined,
      page,
      cityName: cityFilter,
      venueId: venueFilter,
      eventId: eventFilter,
      promoterId: promoterFilter,
      organizerId: organizerFilter,
    })
  }

  const getUniqueFilterValues = React.useCallback(
    (values: Array<string | undefined>) =>
      Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())))).sort((a, b) =>
        a.localeCompare(b)
      ),
    []
  )

  const uniqueCities = React.useMemo(
    () => getUniqueFilterValues(originalData.map((booking) => booking.city || booking.EventCityName)),
    [getUniqueFilterValues, originalData]
  )
  // Bookings carry an event id, so they can still seed the event dropdown when the
  // events API is unreachable. They carry no venue id, so venues are API-only.
  const bookingEventOptions = React.useMemo(() => {
    const options = new Map<string, { id: string; name: string }>()

    originalData.forEach((booking) => {
      const name = booking.eventName || booking.EventName
      const id = booking.eventId
      if (!id || !name?.trim() || name === "N/A") return
      options.set(id, { id, name })
    })

    return Array.from(options.values())
  }, [originalData])
  const promoterOptions = React.useMemo(() => {
    const options = new Map<string, { id: string; name: string }>()

    originalData.forEach((booking) => {
      const name = booking.promoterName || booking.PromoterName
      if (!name?.trim()) return

      const id = booking.promoterId || name
      options.set(id, { id, name })
    })

    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [originalData])

  // ---------------------------------------------------------------------------
  // Filter option APIs. Each dropdown is backed by its own list endpoint:
  //   /events/getAllEventCities, /venue/getall, /organizer/getAll, /promoter/getAll,
  //   /events/getPublishEvents + /events/getCompletedEvents (event names).
  // All of them are fired together when the filter icon is clicked.
  // ---------------------------------------------------------------------------
  const getFilterApiHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getValidToken() || ""}`,
  })

  // The list APIs are not consistent about where the array sits in the response.
  const readListPayload = (data: any): any[] => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.data?.data)) return data.data.data
    if (Array.isArray(data?.data?.EventData)) return data.data.EventData
    return []
  }

  const getEventsListPayload = () => {
    const payload: Record<string, unknown> = {
      AdminRole: getNumericRole(role as UserRole),
      user_id: user?.user_id,
    }
    if ((role as UserRole) === "organizer" && user?.user_id) {
      payload.organizer_id = user.user_id
    }
    return payload
  }

  const fetchFilterCities = async () => {
    const response = await authFetch(getallcityDataEndPoint.GET_ALL_EVENT_CITY_DATA, {
      method: "POST",
      headers: getFilterApiHeaders(),
    })
    const data = await handleApiResponse(response)
    const cities = readListPayload(data).map((city: any) =>
      typeof city === "string" ? city : city?.CityName || city?.cityName || city?.name || ""
    )
    setApiCities(getUniqueFilterValues(cities))
  }

  const fetchFilterVenues = async () => {
    const response = await authFetch(venueEndPoint.ALL_VENUE_DATA_LIST, {
      method: "GET",
      headers: getFilterApiHeaders(),
    })
    const data = await handleApiResponse(response)
    // Bookings are filtered by venue_id, so the id has to be carried alongside the label.
    const venues = readListPayload(data)
      .map((venue: any) => ({
        id: venue?._id || venue?.id || "",
        name: venue?.VenueName || venue?.venueName || venue?.Name || venue?.name || "",
      }))
      .filter((venue) => venue.id && venue.name)
    setApiVenues(venues.sort((a, b) => a.name.localeCompare(b.name)))
  }

  const fetchFilterOrganizers = async () => {
    const response = await authFetch(organizerEndpoint.GET_ALL_ORGANIZERS_DATA_URL, {
      method: "GET",
      headers: getFilterApiHeaders(),
    })
    const data = await handleApiResponse(response)
    const organizers = readListPayload(data)
      .map((organizer: any) => ({
        id: organizer?._id || organizer?.id || "",
        name:
          organizer?.OrganizerName ||
          organizer?.CompanyName ||
          organizer?.FullName ||
          organizer?.Name ||
          organizer?.Username ||
          organizer?.name ||
          "",
      }))
      .filter((organizer) => organizer.id && organizer.name)
    setApiOrganizers(organizers.sort((a, b) => a.name.localeCompare(b.name)))
  }

  const fetchFilterPromoters = async () => {
    const response = await authFetch(promoterEndpoint.GET_ALL_PROMOTER_DATA_URL, {
      method: "GET",
      headers: getFilterApiHeaders(),
    })
    const data = await handleApiResponse(response)
    const promoters = readListPayload(data)
      .map((promoter: any) => ({
        id: promoter?._id || promoter?.id || "",
        name:
          promoter?.FullName ||
          promoter?.PromoterName ||
          promoter?.CompanyName ||
          promoter?.Name ||
          promoter?.name ||
          "",
      }))
      .filter((promoter) => promoter.id && promoter.name)
    setApiPromoters(promoters.sort((a, b) => a.name.localeCompare(b.name)))
  }

  // Events come from published + completed events, since bookings exist for both.
  const fetchFilterEvents = async () => {
    const payload = JSON.stringify(getEventsListPayload())

    const [published, completed] = await Promise.allSettled([
      authFetch(eventEndPoint.GET_ALL_PUBLISHED_EVENTS_DATA, {
        method: "POST",
        headers: getFilterApiHeaders(),
        body: payload,
      }).then(handleApiResponse),
      authFetch(eventEndPoint.GET_ALL_COMPLETED_EVENTS_DATA, {
        method: "POST",
        headers: getFilterApiHeaders(),
        body: payload,
      }).then(handleApiResponse),
    ])

    if (published.status === "rejected" && completed.status === "rejected") {
      throw published.reason
    }

    const toEvents = (result: PromiseSettledResult<any>) =>
      result.status === "fulfilled"
        ? readListPayload(result.value).map((event: any) => ({
            id: event?._id || event?.id || event?.EventId || event?.event_id || "",
            name: event?.EventName || event?.eventName || event?.Name || event?.name || "",
          }))
        : []

    const events = new Map<string, { id: string; name: string }>()
    ;[...toEvents(published), ...toEvents(completed)].forEach((event) => {
      if (event.id && event.name) events.set(event.id, event)
    })

    setApiEvents(Array.from(events.values()).sort((a, b) => a.name.localeCompare(b.name)))
  }

  // Fired from the filter icon. Each request fails independently so one broken list
  // does not empty the other dropdowns - those simply fall back to the loaded bookings.
  const fetchAllFilterOptions = async () => {
    setFilterOptionsLoading(true)

    const requests: Array<[string, Promise<void>]> = [
      ["cities", fetchFilterCities()],
      ["venues", fetchFilterVenues()],
      ["events", fetchFilterEvents()],
      ["promoters", fetchFilterPromoters()],
    ]

    // Organizers are only selectable for roles that can see more than one organizer.
    if (canFilterByOrganizer) {
      requests.push(["organizers", fetchFilterOrganizers()])
    }

    const results = await Promise.allSettled(requests.map(([, request]) => request))

    const failed = results
      .map((result, index) => (result.status === "rejected" ? requests[index][0] : null))
      .filter((label): label is string => Boolean(label))

    if (failed.length > 0) {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(`Error fetching ${requests[index][0]} filter (handled):`, result.reason)
        }
      })
      toast({
        title: "Filter options",
        description: `Could not refresh ${failed.join(", ")}. Showing options from the loaded bookings.`,
        variant: "destructive",
      })
    }

    setFilterOptionsLoading(false)
  }

  // API list first, values seen in the loaded bookings as a fallback, so an applied
  // filter never disappears from its dropdown.
  const cityOptions = React.useMemo(
    () => getUniqueFilterValues([...apiCities, ...uniqueCities]),
    [apiCities, getUniqueFilterValues, uniqueCities]
  )
  const venueOptions = apiVenues
  const eventOptions = React.useMemo(() => {
    const options = new Map<string, { id: string; name: string }>()
    apiEvents.forEach((event) => options.set(event.id, event))
    bookingEventOptions.forEach((event) => {
      if (!options.has(event.id)) options.set(event.id, event)
    })
    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [apiEvents, bookingEventOptions])
  const promoterSelectOptions = React.useMemo(() => {
    const options = new Map<string, { id: string; name: string }>()
    apiPromoters.forEach((promoter) => options.set(promoter.id, promoter))
    promoterOptions.forEach((promoter) => {
      if (!options.has(promoter.id)) options.set(promoter.id, promoter)
    })
    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [apiPromoters, promoterOptions])

  // Dropdown-ready shapes for the searchable filter comboboxes.
  const citySelectItems = React.useMemo(
    () => cityOptions.map((city) => ({ value: city, label: city })),
    [cityOptions]
  )
  const venueSelectItems = React.useMemo(
    () => venueOptions.map((venue) => ({ value: venue.id, label: venue.name })),
    [venueOptions]
  )
  const eventSelectItems = React.useMemo(
    () => eventOptions.map((event) => ({ value: event.id, label: event.name })),
    [eventOptions]
  )
  const organizerSelectItems = React.useMemo(
    () => apiOrganizers.map((organizer) => ({ value: organizer.id, label: organizer.name })),
    [apiOrganizers]
  )
  const promoterSelectItems = React.useMemo(
    () => promoterSelectOptions.map((promoter) => ({ value: promoter.id, label: promoter.name })),
    [promoterSelectOptions]
  )

  const activeFilterCount = [cityFilter, venueFilter, eventFilter, promoterFilter, organizerFilter].filter(
    (value) => value !== "all"
  ).length

  const resetBookingFilters = () => {
    setDraftCityFilter("all")
    setDraftVenueFilter("all")
    setDraftEventFilter("all")
    setDraftPromoterFilter("all")
    setDraftOrganizerFilter("all")
    setCityFilter("all")
    setVenueFilter("all")
    setEventFilter("all")
    setPromoterFilter("all")
    setOrganizerFilter("all")
    setCurrentPage(1)
  }

  const handleFilterDialogOpenChange = (open: boolean) => {
    if (open) {
      setDraftCityFilter(cityFilter)
      setDraftVenueFilter(venueFilter)
      setDraftEventFilter(eventFilter)
      setDraftPromoterFilter(promoterFilter)
      setDraftOrganizerFilter(organizerFilter)
      // Refresh every dropdown from its own list API each time the filter is opened.
      void fetchAllFilterOptions()
    }
    setIsFilterDialogOpen(open)
  }

  const applyBookingFilters = () => {
    setCityFilter(draftCityFilter)
    setVenueFilter(draftVenueFilter)
    setEventFilter(draftEventFilter)
    setPromoterFilter(draftPromoterFilter)
    setOrganizerFilter(draftOrganizerFilter)
    setCurrentPage(1)
    setIsFilterDialogOpen(false)
  }
  
  // Client-side filtering of bookings
  // The API is the single source of truth for search/city/venue/event/promoter filters
  // and for the pagination counts. Re-applying them here only ever removed rows the
  // server had already matched - a booking whose venue is "to be announced" or whose
  // promoter name differs from the filter label vanished from the table while the
  // footer still counted it, which is why the list looked short against the total.
  const filteredBookings = bookingsData

  // Paginated bookings for current page
  const currentBookings = React.useMemo(() => {
    if (paginationMeta.totalPages > 0) {
      return filteredBookings
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredBookings.slice(startIndex, endIndex)
  }, [filteredBookings, currentPage, paginationMeta.totalPages])

  // Calculate total pages
  const totalPages = paginationMeta.totalPages || Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const totalBookingsCount = paginationMeta.totalBookings || filteredBookings.length
  const visiblePageNumbers = React.useMemo(() => {
    const maxVisiblePages = 5
    const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - maxVisiblePages + 1))
    const pageCount = Math.min(totalPages, maxVisiblePages)

    return Array.from({ length: pageCount }, (_, index) => startPage + index)
  }, [currentPage, totalPages])

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

  const getFilenameFromResponse = (response: Response, fallback: string) => {
    const contentDisposition = response.headers.get("content-disposition")
    const filenameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
    return filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : fallback
  }

  // Builds the workbook in the browser from the same scoped endpoint the table reads.
  // The server's download endpoints were returning every booking on the platform
  // whenever the request body did not spell the scope out, so they are not used here.
  const exportToExcel = async () => {
    // Columns mirror what the table shows, so the file matches the screen.
    const exportColumns: ExportColumn<any>[] = [
    { header: "Customer Name", value: (b) => b.customerName },
    { header: "Booking ID", value: (b) => b.bookingId || b.Booking_id },
    { header: "Phone Number", value: (b) => b.phoneNumber },
    { header: "Email", value: (b) => b.customerEmail },
    { header: "Booking Date & Time", value: (b) => formatDateTime(b.bookingDate) },
    { header: "Event Name", value: (b) => b.eventName },
    { header: "Ticket Date", value: (b) => formatDate(b.ticketDate) },
    { header: "City", value: (b) => b.city || b.EventCityName },
    { header: "Venue", value: (b) => b.venue || b.EventVenueName },
    { header: "Source", value: (b) => b.bookingChannel },
    { header: "Promoter Name", value: (b) => b.promoterName || b.PromoterName },
    { header: "Ticket Name", value: (b) => b.ticketName },
    { header: "Ticket Type", value: (b) => b.ticketType },
    { header: "Quantity", value: (b) => b.quantity },
    { header: "Check In", value: (b) => b.checkIn ?? 0 },
    { header: "Scanned By", value: (b) => b.scannedBy },
    { header: "Ticket Price", value: (b) => b.ticketPrice },
    { header: "Convenience Fee", value: (b) => b.convenienceFee },
    { header: "GST", value: (b) => b.gst },
    { header: "Promocode", value: (b) => b.promocode },
    { header: "Total Amount", value: (b) => b.totalAmount },
    { header: "Status", value: (b) => b.bookingStatus },
    { header: "Remark", value: (b) => b.Remark || b.remark },
    ]

    try {
      const authToken = localStorage.getItem("authToken")

      if (!user || !authToken) {
        showErrorPopup("Please log in to download report")
        return
      }

      const scopePayload = buildBookingScopePayload(activeScopeFilters())

      // Never ship an export that lost its scope - that is the whole-platform dump.
      if ((role as UserRole) === "organizer" && !scopePayload.organizer_id) {
        showErrorPopup("Could not determine your organizer account. Please log in again.")
        return
      }
      if ((role as UserRole) === "promoter" && !scopePayload.promoter_id) {
        showErrorPopup("Could not determine your promoter account. Please log in again.")
        return
      }

      setIsExporting(true)

      const rawRows = await fetchAllBookingPages(
        getBookingsListEndpoint(),
        scopePayload,
        authToken,
        extractBookingsArray
      )

      if (rawRows.length === 0) {
        showErrorPopup("There are no bookings to export for the current filters.")
        return
      }

      const rows = normalizeBookingData(rawRows)

      downloadBookingsWorkbook(
        rows,
        exportColumns,
        `bookings-report-${exportTimestamp()}.xlsx`,
        "Bookings"
      )

      toast({
        title: "Export Successful",
        description: `Exported ${rows.length} booking${rows.length === 1 ? "" : "s"}`,
      })
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      showErrorPopup(error instanceof Error ? error.message : "Failed to download report")
    } finally {
      setIsExporting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  // Format date only (without time) - DD-MMM-YYYY
  const formatDate = (date: Date | string | number | null | undefined) => {
    if (!date || date === '' || date === 'Invalid Date') return "N/A"
    
    const dateObj = parseDate(date)
    if (!dateObj) return "N/A"
    
    try {
      return dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch (error) {
      console.warn('Error formatting date:', date, error)
      return "N/A"
    }
  }
  
  // Format date and time - DD-MMM-YYYY HH:MM AM/PM
  const formatDateTime = (date: Date | string | number | null | undefined) => {
    if (!date || date === '' || date === 'Invalid Date') return "N/A"
    
    const dateObj = parseDate(date)
    if (!dateObj) return "N/A"
    
    try {
      const dateStr = dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      const timeStr = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      return `${dateStr} ${timeStr}`
    } catch (error) {
      console.warn('Error formatting datetime:', date, error)
      return "N/A"
    }
  }

  // Cancel booking function
  const handleCancelBooking = async (booking: Booking) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")
    if (!isConfirmed) {
      return
    }

    try {
      const authToken = localStorage.getItem("authToken")
      if (!authToken) {
        toast({
          title: "Error",
          description: "No authentication token found. Please login again.",
          variant: "destructive",
        })
        return
      }

      console.log("🚫 Cancelling booking:", {
        booking_id: booking.Booking_id || booking._id,
        bookingStatus: booking.bookingStatus
      })

      const response = await authFetch(promoterEndPointPannel.CANCEL_EVENT_TICKET, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          booking_id: booking.Booking_id || booking._id
        }),
      })

      const responseData = await response.json()
      console.log("📝 Cancel API response:", responseData)

      if (response.ok) {
        // Update the booking status locally immediately for better UX
        setBookingsData(prevData => 
          prevData.map(b => 
            (b._id === booking._id || b.Booking_id === booking.Booking_id)
              ? { ...b, bookingStatus: "Cancelled" }
              : b
          )
        )
        setOriginalData(prevData => 
          prevData.map(b => 
            (b._id === booking._id || b.Booking_id === booking.Booking_id)
              ? { ...b, bookingStatus: "Cancelled" }
              : b
          )
        )

        toast({
          title: "Success",
          description: responseData.message || "Booking cancelled successfully",
        })
        
        // Refresh bookings data after a short delay to ensure backend has processed
        setTimeout(() => {
          fetchBookingsData()
        }, 500)
      } else {
        toast({
          title: "Error",
          description: responseData.message || "Failed to cancel booking",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cancelling booking:", error)
      toast({
        title: "Error",
        description: "An error occurred while cancelling the booking",
        variant: "destructive",
      })
    }
  }

  // Resend ticket function
  const handleResendTicket = async (booking: Booking) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm("Are you sure you want to resend the ticket to the customer?")
    if (!isConfirmed) {
      return
    }

    try {
      const authToken = localStorage.getItem("authToken")
      if (!authToken) {
        toast({
          title: "Error",
          description: "No authentication token found. Please login again.",
          variant: "destructive",
        })
        return
      }

      const response = await authFetch(promoterEndPointPannel.RESEND_EVENT_TICKET, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          booking_id: booking.Booking_id || booking._id
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Ticket resent successfully to customer",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to resend ticket",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error resending ticket:", error)
      toast({
        title: "Error",
        description: "An error occurred while resending the ticket",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Confirmed":
      case "Booked":
        return "default"
      case "Pending":
        return "secondary"
      case "Cancelled":
        return "destructive"
      default:
        return "default"
    }
  }

  // Helper to parse both ISO and DD-MM-YYYY HH:mm:ss formats
  function parseDate(date: string | number | Date | null | undefined): Date | null {
    if (!date || date === '' || date === 'Invalid Date') return null
    
    try {
      if (typeof date === "string") {
        // Check for DD-MM-YYYY HH:mm:ss
        const ddmmyyyy = date.match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/)
        if (ddmmyyyy) {
          // new Date(year, monthIndex, day, hour, minute, second)
          const parsedDate = new Date(
            Number(ddmmyyyy[3]),
            Number(ddmmyyyy[2]) - 1,
            Number(ddmmyyyy[1]),
            Number(ddmmyyyy[4]),
            Number(ddmmyyyy[5]),
            Number(ddmmyyyy[6])
          )
          return isNaN(parsedDate.getTime()) ? null : parsedDate
        }
        
        // Check for YYYY-MM-DD format (without time)
        const yyyymmdd = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (yyyymmdd) {
          const parsedDate = new Date(
            Number(yyyymmdd[1]),
            Number(yyyymmdd[2]) - 1,
            Number(yyyymmdd[3])
          )
          return isNaN(parsedDate.getTime()) ? null : parsedDate
        }
        
        // Try ISO or other formats
        const iso = new Date(date)
        if (!isNaN(iso.getTime())) return iso
        return null
      }
      if (typeof date === "number") {
        const d = new Date(date)
        return isNaN(d.getTime()) ? null : d
      }
      if (date instanceof Date) {
        return isNaN(date.getTime()) ? null : date
      }
    } catch (error) {
      console.warn('Error parsing date:', date, error)
    }
    return null
  }

  if (loading && !hasLoadedBookings) {
    return (
      <div className="w-full min-h-screen overflow-x-hidden">
        <div className="flex flex-col gap-6 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Bookings Management</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading bookings...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen">
      <div className="flex flex-col gap-6 max-w-full">
        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h1 className="text-2xl font-semibold">
            {(role as UserRole) === "promoter" ? "My Bookings" : "Bookings Management"}
          </h1>
          <Button
            onClick={exportToExcel}
            disabled={isExporting}
            className="h-10 bg-primary px-6 text-primary-foreground hover:bg-primary/90"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Preparing..." : "Download Report"}
          </Button>
        </div>

        <div className="px-4 sm:px-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,520px)_auto_1fr] lg:items-start">
            <div className="space-y-1">
              <Input
                placeholder="Search by name, booking ID, email or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12"
              />
              {normalizeSearchText(searchTerm).length > 0 &&
                normalizeSearchText(searchTerm).length < MIN_SEARCH_LENGTH && (
                  <p className="text-xs text-muted-foreground">
                    Type at least {MIN_SEARCH_LENGTH} characters to search.
                  </p>
                )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Dialog open={isFilterDialogOpen} onOpenChange={handleFilterDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    title="Filter bookings"
                    aria-label="Filter bookings"
                    className="relative h-12 w-12 shrink-0"
                  >
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <div className="flex items-center justify-between gap-4 pr-6">
                    <DialogTitle>Event Filter</DialogTitle>
                    <Button variant="secondary" type="button" onClick={resetBookingFilters}>
                      Reset All
                    </Button>
                  </div>
                  {filterOptionsLoading && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading filter options...
                    </p>
                  )}
                  <div className="grid gap-6 py-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">City</label>
                      <SearchableSelect
                        value={draftCityFilter}
                        onValueChange={setDraftCityFilter}
                        options={citySelectItems}
                        placeholder="Select City"
                        searchPlaceholder="Search cities..."
                        emptyText="No city found."
                        loading={filterOptionsLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Venue</label>
                      <SearchableSelect
                        value={draftVenueFilter}
                        onValueChange={setDraftVenueFilter}
                        options={venueSelectItems}
                        placeholder="Select Venue"
                        searchPlaceholder="Search venues..."
                        emptyText="No venue found."
                        loading={filterOptionsLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Event Name</label>
                      <SearchableSelect
                        value={draftEventFilter}
                        onValueChange={setDraftEventFilter}
                        options={eventSelectItems}
                        placeholder="Select Event names"
                        searchPlaceholder="Search events..."
                        emptyText="No event found."
                        loading={filterOptionsLoading}
                      />
                    </div>
                    {canFilterByOrganizer && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Organizers</label>
                        <SearchableSelect
                          value={draftOrganizerFilter}
                          onValueChange={setDraftOrganizerFilter}
                          options={organizerSelectItems}
                          placeholder="Select Organizer"
                          searchPlaceholder="Search organizers..."
                          emptyText="No organizer found."
                          loading={filterOptionsLoading}
                        />
                      </div>
                    )}
                    {(role as UserRole) !== "promoter" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Promoters</label>
                        <SearchableSelect
                          value={draftPromoterFilter}
                          onValueChange={setDraftPromoterFilter}
                          options={promoterSelectItems}
                          placeholder="Select Promoter"
                          searchPlaceholder="Search promoters..."
                          emptyText="No promoter found."
                          loading={filterOptionsLoading}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter className="sm:justify-end">
                    <Button variant="outline" type="button" onClick={() => handleFilterDialogOpenChange(false)}>
                      Close
                    </Button>
                    <Button type="button" onClick={applyBookingFilters}>
                      Search
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-12 min-w-[128px] justify-between">
                    {dateFilter === "all"
                      ? "Select Date"
                      : dateFilterOptions.find((option) => option.value === dateFilter)?.label || "Select Date"}
                    <ChevronDown className="ml-3 h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px]">
                  {dateFilterOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        setDateFilter(option.value)
                        if (option.value !== "manual") {
                          setManualStartDate("")
                          setManualEndDate("")
                        }
                      }}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {dateFilter === "manual" && (
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Input
                  type="date"
                  value={manualStartDate}
                  onChange={(event) => setManualStartDate(event.target.value)}
                  aria-label="Start date"
                  className="h-12 sm:w-[170px]"
                />
                <Input
                  type="date"
                  value={manualEndDate}
                  onChange={(event) => setManualEndDate(event.target.value)}
                  aria-label="End date"
                  className="h-12 sm:w-[170px]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-full overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 sm:px-6">
              {/* Mobile layout */}
              {isMobile ? MobileTabs() : DesktopTabs()}
            </div>

            <div className="px-4 sm:px-6">
              <TabsContent value={activeTab} className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {activeTab === "all"
                        ? "All Bookings"
                        : activeTab === "my-bookings"
                          ? "My Bookings"
                          : activeTab === "promoter"
                            ? "Promoter"
                            : "Online"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-hidden">
                  {/* Mobile Card View */}
                                 {/* Desktop Table View */}
                  <div className="w-full">
                    <BookingsTable
                      bookings={currentBookings}
                      role={role as UserRole}
                      searchTerm={searchTerm}
                      statusFilter="all"
                      channelFilter="all"
                      columns={getColumnsForTab(activeTab)}
                      formatDate={formatDate}
                      formatDateTime={formatDateTime}
                      formatCurrency={formatCurrency}
                      getStatusBadgeVariant={getStatusBadgeVariant}
                      onCancelBooking={role === "superadmin" ? handleCancelBooking : undefined}
                      onResendTicket={role === "superadmin" ? handleResendTicket : undefined}
                    />
                  </div>

                  {/* Pagination */}
                  <div className="px-4 sm:px-6 pb-6">
                    {totalPages > 1 && (
                      <Pagination className="mt-6">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                if (currentPage > 1) handlePageChange(currentPage - 1)
                              }}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                              size="default"
                            />
                          </PaginationItem>
                          {visiblePageNumbers[0] > 1 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          {visiblePageNumbers.map((pageNum) => (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                href="#"
                                isActive={currentPage === pageNum}
                                onClick={(e) => {
                                  e.preventDefault()
                                  handlePageChange(pageNum)
                                }}
                                size="default"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          {visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                if (currentPage < totalPages) handlePageChange(currentPage + 1)
                              }}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                              size="default"
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Error Dialog */}
        <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                API Error
              </DialogTitle>
              <DialogDescription>
                An error occurred while communicating with the server.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">{errorMessage}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsErrorDialogOpen(false)}>
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
