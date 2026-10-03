"use client"

import { authFetch } from "@/lib/auth-fetch"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Search, Loader2, Filter, Eye } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { UserRole } from "@/lib/navigation"
import { useAuth } from "@/lib/auth-context"
import { formatEventDate, formatEventDateTime, parseEventDateTime } from "@/lib/utils"
import { getNumericRole } from "@/lib/role-mapping"
import { useToast } from "@/hooks/use-toast"
import { promoterEndpoint, promoterEndPointPannel, eventEndPoint, organizerEndpoint } from "@/lib/api-endpoints"
import { downloadBookingsWorkbook, exportTimestamp, type ExportColumn } from "@/lib/booking-export"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface GlobalReportsPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

// Types for API response
interface Event {
  _id: string
  EventName: string
  eventName?: string
  VenueName?: string
  VenueCity?: string
  arrangedEventDateTime?: Array<{
    EventStartDateTime: string
    EventEndDateTime: string
  }>
  PopUpOrganizerData?: Array<{
    OrganizerName: string
  }>
}

interface SummaryReportData {
  ticketType: string
  quantitySold: number
  totalRevenue: number
}

interface TransactionReportData {
  bookingId: string
  customerName: string
  ticketType: string
  quantity: number
  amount: number
  date: string
}

const ITEMS_PER_PAGE = 10
// Bounds for collecting a server-paginated transaction report in one go.
const TRANSACTION_PAGE_SIZE = 200
const MAX_TRANSACTION_PAGES = 25

export default function GlobalReportsPage({ params }: GlobalReportsPageProps) {
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
  // State management
  const [eventNameInput, setEventNameInput] = React.useState("")
  const [dateInput, setDateInput] = React.useState("")
  const [matchedEvent, setMatchedEvent] = React.useState<Event | null>(null)
  const [reportType, setReportType] = React.useState<"Summary" | "Transaction" | "">("")
  const [reportData, setReportData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  
  // Transaction details modal state
  const [selectedTransaction, setSelectedTransaction] = React.useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false)

  // Clear report data when report type changes
  const handleReportTypeChange = (value: "Summary" | "Transaction" | "") => {
    setReportType(value)
    setReportData([]) // Clear existing data
    setCurrentPage(1) // Reset pagination
  }
  // Check authentication status on component mount
  React.useEffect(() => {
    if (!checkAuthentication()) {
      // Authentication check will show error popup if needed
      return
    }
    
    // Show helpful initial message
    if (!eventNameInput && !dateInput) {
      showSuccessToast(
        "Reports Ready", 
        "Enter an event name and date to search for events and generate reports."
      )
    }
  }, []) // Run only on mount

  // Helper function for success messages
  const showSuccessToast = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "default"
    })
  }

  // Check authentication status
  const checkAuthentication = (): boolean => {
    const authToken = localStorage.getItem("authToken")
    if (!user || !authToken) {
      toast({
        title: "Authentication Required", 
        description: "Please log in to access reports. Your session may have expired.",
        variant: "destructive"
      })
      return false
    }
    return true
  }

  // Enhanced error handling for network requests
  const handleNetworkError = async (response: Response, operation: string, serverMessage = "") => {
    let errorDetails = serverMessage
    if (!errorDetails) {
      try {
        const errorText = await response.text()
        try {
          errorDetails = JSON.parse(errorText)?.message || errorText
        } catch {
          errorDetails = errorText
        }
        errorDetails = errorDetails || `HTTP ${response.status}`
      } catch (e) {
        errorDetails = `HTTP ${response.status} - Unable to read error details`
      }
    }

    const errorMessage = `${operation} failed`
    
    // Specific error handling based on status codes
    switch (response.status) {
      case 401:
        toast({
          title: "Authentication Failed", 
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        })
        break
      case 403:
        toast({
          title: "Access Denied", 
          description: "You don't have permission to access this resource.",
          variant: "destructive"
        })
        break
      case 400:
      case 404:
      case 409:
        // The API explains these ("Event Not Found", a validation message, ...), so show
        // that rather than a generic line that hides what actually went wrong.
        toast({
          title: response.status === 404 ? "Not Found" : errorMessage,
          description: errorDetails,
          variant: "destructive"
        })
        break
      case 429:
        toast({
          title: "Too Many Requests", 
          description: "Please wait a moment before trying again.",
          variant: "destructive"
        })
        break
      case 500:
        toast({
          title: "Server Error", 
          description: "Internal server error. Please try again later or contact support.",
          variant: "destructive"
        })
        break
      default:
        toast({
          title: errorMessage,
          description: errorDetails,
          variant: "destructive"
        })
    }
  }
  // Fallback lookup in Completed events. startDate/endDate are deliberately not sent: the
  // API's date filter compares ObjectIds with string ids and always answers "No Events
  // Found", so the date is matched here the same way getEventsByNameandDateTime does it.
  const findCompletedEventByNameAndDate = async (authToken: string | null): Promise<any | null> => {
    const keyword = eventNameInput.trim()
    if (keyword.length < 3) return null // eventNameSearchKeyword is Joi min(3)

    try {
      const response = await authFetch(eventEndPoint.GET_ALL_COMPLETED_EVENTS_DATA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          AdminRole: getNumericRole(role as UserRole),
          user_id: user!.user_id,
          eventNameSearchKeyword: keyword,
        }),
      })
      if (!response.ok) return null

      const result = await response.json()
      const events: any[] = Array.isArray(result?.data) ? result.data : []
      const requestedDate = new Date(dateInput).toISOString().split("T")[0]

      return (
        events.find((event) =>
          (event.arrangedEventDateTime || []).some((dateTime: any) => {
            const start = new Date(dateTime?.EventStartDateTime)
            return !Number.isNaN(start.getTime()) && start.toISOString().split("T")[0] === requestedDate
          })
        ) || null
      )
    } catch (error) {
      console.warn("Completed events lookup failed (handled):", error)
      return null
    }
  }

  // Search for events by name and date using API
  const handleSearchEvent = async () => {
    // Input validation
    if (!eventNameInput.trim()) {
      toast({
        title: "Missing Event Name",
        description: "Please enter an event name to search.",
        variant: "destructive"
      })
      return
    }
    
    if (!dateInput.trim()) {
      toast({
        title: "Missing Event Date",
        description: "Please select an event date to search.",
        variant: "destructive"
      })
      return
    }

    // Authentication check
    if (!checkAuthentication()) {
      return
    }

    setLoading(true)
    setMatchedEvent(null)
    setReportType("")
    setReportData([])

    try {
      console.log("🚨🚨🚨 REPORTS PAGE - SEARCH FUNCTION CALLED 🚨🚨🚨")
      console.log("Searching for events with:")
      console.log("- Event name:", eventNameInput)
      console.log("- Event date:", dateInput)
      console.log("- User role:", role)

      let apiEndpoint = ""
      let requestPayload: any = {}      
      
      // Use the working promoter endpoint that we know exists
      apiEndpoint = promoterEndPointPannel.GET_EVENTS_BY_NAME_AND_DATETIME
      
      console.log("🚨 DEBUG: Using promoter endpoint:", apiEndpoint)
      console.log("🚨 DEBUG: Should be getEventsByNameandDateTime!")
      
      // Backend AdminRoles: SuperAdmin=1, Employee=2, Organizer=3, Promoter=4.
      // An organizer used to be sent as 2, so the API looked the id up in the
      // Employee collection and every organizer search came back "Not Found".
      const adminRole = getNumericRole(role as UserRole)

      requestPayload = {
        AdminRole: adminRole,
        user_id: user!.user_id,
        EventName: eventNameInput.trim(),
        DateTime: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
      }

      console.log("Using HARDCODED endpoint:", apiEndpoint)
      console.log("Request payload:", requestPayload)
      console.log(" Payload verification:")
      console.log("- AdminRole:", requestPayload.AdminRole, typeof requestPayload.AdminRole)
      console.log("- user_id:", requestPayload.user_id, typeof requestPayload.user_id)
      console.log("- EventName:", requestPayload.EventName, typeof requestPayload.EventName)
      console.log("- DateTime:", requestPayload.DateTime, typeof requestPayload.DateTime)

      const authToken = localStorage.getItem("authToken")
      
      console.log("🚨 FINAL API CALL VERIFICATION:")
      console.log("- Final endpoint URL:", apiEndpoint)
      console.log("- Should contain 'getEventsByNameandDateTime':", apiEndpoint.includes('getEventsByNameandDateTime'))
      console.log("- Should NOT contain 'getAllPaginated':", !apiEndpoint.includes('getAllPaginated'))
      
      const response = await authFetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      })

      console.log("Response status:", response.status)

      let data: any = null

      // For a superadmin, getEventsByNameandDateTime only looks at Published/InReview/
      // Rejected events, so a Completed event can never be found there.
      if (response.status === 404 && (role as UserRole) === "superadmin") {
        const completedEvent = await findCompletedEventByNameAndDate(authToken)
        if (completedEvent) {
          data = { error: false, data: completedEvent }
        }
      }

      if (!data) {
        if (!response.ok) {
          await handleNetworkError(response, "Event search")
          return
        }
        data = await response.json()
      }
      console.log("Search response data:", data)
      
      // Check for API-level errors - but distinguish between real errors and "no data" responses
      if (data.error === true) {
        // Check if this is a "no data found" scenario rather than an actual error
        const isNoDataScenario = data.message && (
          data.message.toLowerCase().includes('no events found') ||
          data.message.toLowerCase().includes('no event found') ||
          data.message.toLowerCase().includes('no data found') ||
          data.message.toLowerCase().includes('no records found') ||
          data.message.toLowerCase().includes('not found')
        )
        
        if (isNoDataScenario) {
          // This is not an error, just no events found
          console.log("No events found matching the criteria")
          setMatchedEvent(null)
          
          toast({
            title: "No Events Found", 
            description: `No events found matching "${eventNameInput}" on ${new Date(dateInput).toLocaleDateString()}. Please check the event name and date.`,
            variant: "destructive"
          })
          return
        } else {
          // This is an actual error
          toast({
            title: "Search Failed", 
            description: data.message || "The server returned an error while searching for events.",
            variant: "destructive"
          })
          return
        }
      }

      console.log("Response structure analysis:")
      console.log("- data exists:", !!data)
      console.log("- data.data exists:", !!(data && data.data))
      console.log("- data.data type:", data && data.data ? typeof data.data : "undefined")
      console.log("- data.data is array:", !!(data && data.data && Array.isArray(data.data)))
      console.log("- data.data has _id:", !!(data && data.data && data.data._id))

      // Handle API response structure for the specific getEventsByNameandDateTime endpoint
      let eventsArray = []
      
      if (data && data.data && typeof data.data === 'object' && data.data._id) {
        // Single event object response
        eventsArray = [data.data]
      } else if (data && data.data && Array.isArray(data.data)) {
        // Array response structure
        eventsArray = data.data
      } else if (data && Array.isArray(data)) {
        // Direct array response
        eventsArray = data
      } else {
        console.warn("Unexpected response format:", data)
        toast({
          title: "Invalid Response Format", 
          description: "The server returned an unexpected response format. Please try again or contact support.",
          variant: "destructive"
        })
        return
      }

      if (eventsArray.length > 0) {
        console.log("✅ Events found:", eventsArray.length)
        // Take the first matching event
        const foundEvent = eventsArray[0]
        console.log("📍 Using first event:", foundEvent)
        
        const normalizedEvent: Event = {
          _id: foundEvent._id || foundEvent.id || "unknown",
          EventName: foundEvent.EventName || foundEvent.eventName || foundEvent.Name || foundEvent.name || eventNameInput,
          eventName: foundEvent.eventName || foundEvent.EventName || foundEvent.Name || foundEvent.name || eventNameInput,
          VenueName: foundEvent.VenueName || foundEvent.venueName || foundEvent.Venue || foundEvent.venue,
          VenueCity: foundEvent.VenueCity || foundEvent.city || foundEvent.City || foundEvent.location,
          arrangedEventDateTime: foundEvent.arrangedEventDateTime || [],
          PopUpOrganizerData: foundEvent.PopUpOrganizerData || [],
        }

        console.log("📋 Normalized event:", normalizedEvent)
        setMatchedEvent(normalizedEvent)
        
        showSuccessToast(
          "Event Found", 
          `Found event "${normalizedEvent.EventName}". Please select a report type to continue.`
        )
        
        if (eventsArray.length > 1) {
          toast({
            title: "Multiple Events Found", 
            description: `Found ${eventsArray.length} matching events. Using the first one: "${normalizedEvent.EventName}".`,
            variant: "destructive"
          })
        }
      } else {
        console.log("❌ No events found")
        setMatchedEvent(null)
        toast({
          title: "No Events Found", 
          description: `No events found matching "${eventNameInput}" on ${new Date(dateInput).toLocaleDateString()}. Please check the event name and date.`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Event search failed:", error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Network Error", 
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Search Failed", 
          description: error instanceof Error ? error.message : "An unexpected error occurred while searching for events.",
          variant: "destructive"
        })
      }
      
      setMatchedEvent(null)
      setReportType("")
      setReportData([])
    } finally {
      setLoading(false)
    }
  }
   // Generate reports using API
  const handleGenerateReport = async () => {
    // Input validation
    if (!matchedEvent) {
      toast({
        title: "No Event Selected",
        description: "Please search for and select an event first.",
        variant: "destructive"
      })
      return
    }
    
    if (!reportType) {
      toast({
        title: "No Report Type",
        description: "Please select a report type (Summary or Transaction).",
        variant: "destructive"
      })
      return
    }

    // Authentication check
    if (!checkAuthentication()) {
      return
    }

    console.log("🚀 Starting report generation...")
    console.log("- Matched event:", matchedEvent)
    console.log("- Report type:", reportType)
    console.log("- User role:", role)
    setLoading(true)

    try {
      console.log("Generating report for:")
      console.log("- Event:", matchedEvent)
      console.log("- Report type:", reportType)
      console.log("- User role:", role)

      let apiEndpoint = ""
      let requestPayload: any = {}      // Determine the correct endpoint based on role and report type
      const isPromoter = (role as UserRole) === "promoter"
      const adminRole = getNumericRole(role as UserRole)

      if (reportType === "Summary") {
        if (isPromoter) {
          // The promoter summary endpoint validates its body strictly: limit/page are
          // rejected, and that validation error was what surfaced as "not found".
          apiEndpoint = promoterEndPointPannel.GET_ALL_PROMOTER_EVENT_BOOKING_DATA_BY_EVENT_ID
          requestPayload = {
            promoter_id: user!.user_id,
            event_id: matchedEvent._id,
          }
        } else {
          apiEndpoint = organizerEndpoint.GET_ALL_SUMMARY_BOOKING_DATA_BY_EVENT_AND_ORGANIZER_ID
          requestPayload = {
            AdminRole: adminRole,
            user_id: user!.user_id,
            event_id: matchedEvent._id,
            limit: "10",
            page: "1"
          }
        }
      } else if (reportType === "Transaction") {
        // Every role reads the shared bookings endpoint; a promoter is pinned to their
        // own promoter_id. The promoter-only transaction endpoint rejected limit/page
        // with a 404 and its rows carry no city, venue, check-in, scanner or source.
        apiEndpoint = organizerEndpoint.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENT_AND_ORGANIZER_ID
        requestPayload = {
          AdminRole: adminRole,
          user_id: user!.user_id,
          event_id: matchedEvent._id,
          ...(isPromoter ? { promoter_id: user!.user_id } : {}),
          limit: TRANSACTION_PAGE_SIZE.toString(),
          page: "1"
        }
      }

      if (!apiEndpoint) {
        toast({
          title: "Invalid Configuration", 
          description: "Unable to determine the correct API endpoint for your role and report type.",
          variant: "destructive"
        })
        return
      }

      console.log("🚨 REPORT GENERATION - ENDPOINT VERIFICATION 🚨")
      console.log("Using endpoint:", apiEndpoint)
      console.log("Request payload:", requestPayload)
      console.log("🔍 Endpoint verification:")
      console.log("- Full endpoint URL:", apiEndpoint)
      console.log("- Should contain 'getEventSummaryBookingsDataforSuperAdminOrganizer' for Summary:", apiEndpoint.includes('getEventSummaryBookingsDataforSuperAdminOrganizer'))
      console.log("- Should contain 'getAllLatestBookingsForSuperAdminOrganizer' for Transaction:", apiEndpoint.includes('getAllLatestBookingsForSuperAdminOrganizer'))
      console.log("- Base URL from env:", process.env.NEXT_PUBLIC_API_BASE_URL)
      console.log("🔍 Payload verification:")
      console.log("- AdminRole:", requestPayload.AdminRole, typeof requestPayload.AdminRole)
      console.log("- user_id:", requestPayload.user_id, typeof requestPayload.user_id)
      console.log("- event_id:", requestPayload.event_id, typeof requestPayload.event_id)
      console.log("- limit:", requestPayload.limit, typeof requestPayload.limit)
      console.log("- page:", requestPayload.page, typeof requestPayload.page)

      const authToken = localStorage.getItem("authToken")
      const response = await authFetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      })

      console.log("Response status:", response.status)

      // Older API builds answer "no bookings for this event" with a 404/409 carrying a
      // JSON message. That is an empty report, not a missing resource.
      if (!response.ok) {
        const errorBody = await response.clone().json().catch(() => null)
        const serverMessage: string = typeof errorBody?.message === "string" ? errorBody.message : ""
        if (/no (event )?bookings found|tickets not found/i.test(serverMessage)) {
          setReportData([])
          setCurrentPage(1)
          toast({
            title: "No Bookings Found",
            description: `No booking data available for ${matchedEvent.EventName}. This event may not have any bookings yet.`,
          })
          return
        }
        await handleNetworkError(response, "Report generation", serverMessage)
        return
      }

      const data = await response.json()

      // The transaction endpoint is server-paginated. The report paginates on the
      // client, so collect every page - it used to stop at the first 10 bookings.
      if (reportType === "Transaction" && Array.isArray(data?.data?.latestBookingData)) {
        const totalPagesFromApi = Number(data.data.totalPages) || 1
        const remainingPages = Math.min(totalPagesFromApi, MAX_TRANSACTION_PAGES) - 1

        if (remainingPages > 0) {
          const pages = await Promise.all(
            Array.from({ length: remainingPages }, (_, index) =>
              authFetch(apiEndpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ ...requestPayload, page: (index + 2).toString() }),
              })
                .then((pageResponse) => (pageResponse.ok ? pageResponse.json() : null))
                .catch(() => null)
            )
          )

          for (const pageData of pages) {
            if (Array.isArray(pageData?.data?.latestBookingData)) {
              data.data.latestBookingData = data.data.latestBookingData.concat(pageData.data.latestBookingData)
            }
          }
        }
      }
      console.log("📋 FULL REPORT RESPONSE DATA:", data)
      
      // Detailed analysis of response structure for debugging
      console.log("🔍 RESPONSE STRUCTURE ANALYSIS:")
      console.log("- data exists:", !!data)
      console.log("- data.error:", data.error)
      console.log("- data.message:", data.message)
      console.log("- data.data exists:", !!(data && data.data))
      console.log("- data.TicketsData exists:", !!(data && data.TicketsData))
      if (data && data.data) {
        console.log("- data.data.TicketsData exists:", !!(data.data.TicketsData))
        console.log("- data.data.TicketsData length:", data.data.TicketsData ? data.data.TicketsData.length : 'N/A')
        console.log("- data.data.TicketNamesArray exists:", !!(data.data.TicketNamesArray))
        console.log("- data.data.EventDateTimeData exists:", !!(data.data.EventDateTimeData))
        if (data.data.TicketsData && data.data.TicketsData.length > 0) {
          console.log("- First TicketsData item:", data.data.TicketsData[0])
        }
      }      // Check for API-level errors - but distinguish between real errors and "no data" responses
      if (data.error === true) {
        // Check if this is a "no data found" scenario rather than an actual error
        const isNoDataScenario = data.message && (
          data.message.toLowerCase().includes('no event bookings found') ||
          data.message.toLowerCase().includes('no bookings found') ||
          data.message.toLowerCase().includes('no data found') ||
          data.message.toLowerCase().includes('no records found') ||
          data.message.toLowerCase().includes('not found')
        )
        
        if (isNoDataScenario) {
          // This is not an error, just no data available
          console.log("No bookings found for this event")
          setReportData([])
          setCurrentPage(1)
          
          toast({
            title: "No Bookings Found", 
            description: `No booking data available for ${matchedEvent.EventName}. This event may not have any bookings yet.`,
            variant: "destructive"
          })
          return
        } else {
          // This is an actual error
          toast({
            title: "Report Generation Failed", 
            description: data.message || "The server returned an error while generating the report.",
            variant: "destructive"
          })
          return
        }
      }      // Handle API response structure based on report type
      let reportArray = []
      
      if (reportType === "Summary") {
        console.log("🔄 PROCESSING SUMMARY REPORT DATA...")
        // For summary reports, check multiple possible data sources
        if (data && data.data && data.data.TicketsData && Array.isArray(data.data.TicketsData)) {
          reportArray = data.data.TicketsData
          console.log("📊 PATH 1: Using data.data.TicketsData array:", reportArray.length, "items")
        } else if (data && data.TicketsData && Array.isArray(data.TicketsData)) {
          reportArray = data.TicketsData
          console.log("📊 PATH 2: Using data.TicketsData array (direct):", reportArray.length, "items")
        } else if (data && data.data && Array.isArray(data.data)) {
          reportArray = data.data
          console.log("📊 PATH 3: Using data.data array directly:", reportArray.length, "items")
        } else if (data && Array.isArray(data)) {
          reportArray = data
          console.log("📊 PATH 4: Using data array directly:", reportArray.length, "items")
        } else if (data && data.data && data.data.TicketNamesArray && Array.isArray(data.data.TicketNamesArray)) {
          // Handle case where TicketsData is empty but we have TicketNamesArray
          console.log("📊 PATH 5: TicketsData is empty, creating placeholder data from TicketNamesArray")
          reportArray = data.data.TicketNamesArray.map((ticketName: string) => ({
            TicketName: ticketName,
            Quantity: 0,
            TicketPrice: 0,
            TotalAmount: 0,
            TicketDate: data.data.EventDateTimeData?.[0]?.EventStartDateTime || null
          }))
          console.log("📊 Created placeholder summary data:", reportArray)
        } else {
          // No data found - this is normal, not an error
          console.log("📊 PATH 6: No ticket data found - this may be normal for events without bookings")
          reportArray = []
        }
      } else {
        // For transaction reports, handle the latestBookingData structure
        console.log("🔄 PROCESSING TRANSACTION REPORT DATA...")
        if (data && data.data && data.data.latestBookingData && Array.isArray(data.data.latestBookingData)) {
          reportArray = data.data.latestBookingData
          console.log("📊 PATH 1: Using data.data.latestBookingData array:", reportArray.length, "items")
        } else if (data && data.data && Array.isArray(data.data)) {
          reportArray = data.data
          console.log("📊 PATH 2: Using data.data array:", reportArray.length, "items")
        } else if (data && Array.isArray(data)) {
          reportArray = data
          console.log("📊 PATH 3: Using data array directly:", reportArray.length, "items")
        } else {
          // No transaction data found - this is normal, not an error
          console.log("📊 No transaction data found - this may be normal for events without bookings")
          reportArray = []
        }
      }

      // Normalize the data based on report type
      if (reportType === "Summary") {
        // Log the raw reportArray for debugging
        console.log("🎫 RAW REPORT ARRAY FOR SUMMARY:", reportArray)
        if (reportArray.length > 0) {
          console.log("🎫 FIRST ITEM STRUCTURE:", reportArray[0])
          console.log("🎫 AVAILABLE FIELDS:", Object.keys(reportArray[0]))
        }
        
        // Transform API data to summary format using the TicketsData structure
        const summaryData = reportArray.map((item: any, index: number) => {
          console.log(`🎫 PROCESSING ITEM ${index}:`, item)
          
          const quantitySold = Number(item.Quantity || item.quantity || item.quantity_sold || item.QuantitySold || item.TotalQuantity || 0)
          const ticketPrice = Number(item.TicketPrice || item.ticketPrice || item.ticket_price || item.Price || 0)
          const totalRevenue = Number(item.TotalAmount || item.totalAmount || item.total_amount || item.TotalRevenue || (quantitySold * ticketPrice))
          
          console.log(`🎫 EXTRACTED VALUES FOR ITEM ${index}:`)
          console.log("- quantitySold:", quantitySold, "from fields:", { 
            Quantity: item.Quantity, 
            quantity: item.quantity, 
            quantity_sold: item.quantity_sold,
            QuantitySold: item.QuantitySold,
            TotalQuantity: item.TotalQuantity
          })
          console.log("- ticketPrice:", ticketPrice, "from fields:", { 
            TicketPrice: item.TicketPrice, 
            ticketPrice: item.ticketPrice, 
            ticket_price: item.ticket_price,
            Price: item.Price
          })
          console.log("- totalRevenue:", totalRevenue, "from fields:", { 
            TotalAmount: item.TotalAmount, 
            totalAmount: item.totalAmount, 
            total_amount: item.total_amount,
            TotalRevenue: item.TotalRevenue
          })
          
          return {
            ticketName: item.TicketName || item.ticketName || item.ticket_name || "N/A",
            ticketType: item.TicketName || item.ticketName || item.ticket_name || "Standard",
            quantitySold: quantitySold,
            ticketPrice: ticketPrice,
            ticketDate: item.TicketDate || item.ticketDate || item.ticket_date || null,
            totalRevenue: totalRevenue,
            // Summary rows carry no booking type. CheckIn is present on the admin/organizer
            // summary but not the promoter one, so keep it null there rather than a fake 0.
            checkIn: item.CheckIn ?? item.checkIn ?? null,
          }
        })
        
        // Sort summary data by quantitySold (highest first)
        const sortedSummaryData = summaryData.sort((a: any, b: any) => b.quantitySold - a.quantitySold)
        
        console.log("📈 Processed and sorted summary data:", sortedSummaryData)
        setReportData(sortedSummaryData)
          // Show appropriate message based on data availability
        if (summaryData.length === 0) {
          showSuccessToast(
            "Report Generated", 
            `No booking data found for ${matchedEvent.EventName}. This event may not have any bookings yet.`
          )
        } else if (summaryData.some((item: any) => item.quantitySold > 0)) {
          const totalSold = summaryData.reduce((sum: number, item: any) => sum + item.quantitySold, 0)
          const totalRevenue = summaryData.reduce((sum: number, item: any) => sum + item.totalRevenue, 0)
          showSuccessToast(
            "Summary Report Generated", 
            `Report ready: ${totalSold} tickets sold, ₹${totalRevenue.toLocaleString()} revenue for ${matchedEvent.EventName}.`
          )
        } else {
          showSuccessToast(
            "Summary Report Generated", 
            `Summary report shows available ticket types for ${matchedEvent.EventName}, but no bookings found yet.`
          )
        }
      } else if (reportType === "Transaction") {
        // Transform API data to transaction format using the correct field names
        console.log("🎫 RAW TRANSACTION ARRAY:", reportArray)
        if (reportArray.length > 0) {
          console.log("🎫 FIRST TRANSACTION ITEM:", reportArray[0])
        }
        
        const transactionData = reportArray.map((item: any) => ({
          bookingId: item.Booking_id || item.bookingId || item.booking_id || item._id || "N/A",
          customerName: item.CustomerName || item.customerName || item.customer_name || "N/A",
          phoneNumber: item.PhoneNumber || item.phoneNumber || item.phone_number || "N/A",
          email: item.Email || item.email || item.customer_email || "N/A",
          bookingDate: item.BookingDateTime || item.bookingDate || item.booking_date || item.date || "N/A",
          eventName: item.EventName || item.eventName || item.event_name || "N/A",
          ticketDate: item.TicketDate || item.ticketDate || item.ticket_date || "N/A",
          source: item.BookingSource || item.bookingChannel || item.Source || item.source || ((role as UserRole) === "promoter" ? "Promoter" : "Online"),
          city: item.EventCityName || item.city || item.City || item.event_city || matchedEvent.VenueCity || "N/A",
          venue: item.EventVenueName || item.venue || item.Venue || item.event_venue || matchedEvent.VenueName || "N/A",
          checkIn: Number(item.Check_In ?? item.CheckIn ?? item.checkIn ?? item.CheckedIn ?? 0),
          scannedBy: item.ScannerUserName || item.ScannedBy || item.scannedBy || item.scanned_by || item.ScannedByName || "N/A",
          quantity: Number(item.TicketQuantity || item.quantity || item.Quantity || 0),
          ticketName: item.TicketName || item.ticketName || item.ticket_name || "N/A",
          ticketType: item.EventTicketType || item.ticketType || item.ticket_type || "Standard",
          ticketPrice: Number(item.TicketPrice || item.ticketPrice || item.ticket_price || 0),
          amount: Number(item.TotalAmount || item.amount || item.Amount || 0),
          remark: item.remark || item.Remark || item.remarks || item.note || "N/A",
          status: item.status === 1 ? "Confirmed" : item.status === 2 ? "Cancelled" : item.status || "Unknown",
          bookingType: item.EventTicketType === 1 || item.eventTicketType === 1 ? "Promoter" : item.EventTicketType === 2 || item.eventTicketType === 2 ? "Online" : item.BookingType || item.bookingType || "N/A",
        }))
        
        // Sort transaction data by bookingDate (latest first)
        const sortedTransactionData = transactionData.sort((a: any, b: any) => {
          // BookingDateTime is "DD-MM-YYYY HH:mm:ss", which new Date() cannot parse.
          const dateA = parseEventDateTime(a.bookingDate)?.getTime()
          const dateB = parseEventDateTime(b.bookingDate)?.getTime()
          if (dateA === undefined && dateB === undefined) return 0
          if (dateA === undefined) return 1
          if (dateB === undefined) return -1
          return dateB - dateA // Descending order (latest first)
        })
          
          setReportData(sortedTransactionData)
        
        if (transactionData.length === 0) {
          showSuccessToast(
            "Report Generated", 
            `No booking transactions found for ${matchedEvent.EventName}. This event may not have any bookings yet.`
          )
        } else {
          const totalTransactions = transactionData.length
          const totalAmount = transactionData.reduce((sum: number, item: any) => sum + item.amount, 0)
          showSuccessToast(
            "Transaction Report Generated", 
            `Report ready: ${totalTransactions} transactions, ₹${totalAmount.toLocaleString()} total value for ${matchedEvent.EventName}.`
          )
        }
      }

      setCurrentPage(1)
    } catch (error) {
      console.error("Report generation failed:", error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Network Error", 
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Report Generation Failed", 
          description: error instanceof Error ? error.message : "An unexpected error occurred while generating the report.",
          variant: "destructive"
        })
      }
      
      // Set empty data
      setReportData([])
      setCurrentPage(1)
    } finally {
      setLoading(false)
    }
  }

  // Exports every row of the generated report (all pages), with the columns on screen.
  const handleExportReport = () => {
    if (!matchedEvent || reportData.length === 0) return

    const formatTicketDate = (value: any) =>
      value && value !== "N/A" ? formatEventDate(value, undefined, []) : "N/A"

    const columns: ExportColumn<any>[] =
      reportType === "Summary"
        ? [
            { header: "Ticket Name", value: (r) => r.ticketName || r.ticketType },
            { header: "Quantity", value: (r) => r.quantitySold },
            { header: "Ticket Price", value: (r) => r.ticketPrice },
            { header: "Ticket Date", value: (r) => formatTicketDate(r.ticketDate) },
            { header: "Total Amount", value: (r) => r.totalRevenue },
            { header: "Check In", value: (r) => r.checkIn ?? "-" },
          ]
        : [
            { header: "Name", value: (r) => r.customerName },
            { header: "Booking ID", value: (r) => r.bookingId },
            { header: "Phone No.", value: (r) => r.phoneNumber },
            { header: "Email", value: (r) => r.email },
            { header: "Booking Date & Time", value: (r) => formatEventDateTime(r.bookingDate) },
            { header: "Event", value: (r) => r.eventName },
            { header: "Ticket Date", value: (r) => formatTicketDate(r.ticketDate) },
            { header: "Sources", value: (r) => r.source },
            { header: "City", value: (r) => r.city },
            { header: "Venue", value: (r) => r.venue },
            { header: "Quantity", value: (r) => r.quantity },
            { header: "Check In", value: (r) => r.checkIn },
            { header: "Scanned By", value: (r) => r.scannedBy },
            { header: "Ticket Name", value: (r) => r.ticketName },
            { header: "Ticket Type", value: (r) => r.ticketType },
            { header: "Ticket Price", value: (r) => r.ticketPrice },
            { header: "Total Amount", value: (r) => r.amount },
            { header: "Status", value: (r) => r.status },
            { header: "Remark", value: (r) => r.remark },
          ]

    const safeEventName = (matchedEvent.EventName || "event").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")
    downloadBookingsWorkbook(
      reportData,
      columns,
      `${safeEventName}-${reportType.toLowerCase()}-report-${exportTimestamp()}.xlsx`,
      `${reportType} Report`
    )
    showSuccessToast("Export Successful", `Exported ${reportData.length} row${reportData.length === 1 ? "" : "s"}.`)
  }

  // Handle viewing transaction details
  const handleViewTransactionDetails = (transaction: any) => {
    setSelectedTransaction(transaction)
    setIsDetailsModalOpen(true)
  }

  const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE)
  const currentReportData = reportData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const handlePageChange = (page: number) => setCurrentPage(page)
  if ((role as UserRole) !== "superadmin" && (role as UserRole) !== "organizer" && (role as UserRole) !== "promoter") {
    return <div className="p-6 text-muted-foreground">Access Denied. Authorized roles only.</div>
  }

  return (
    <div className="flex flex-col gap-6">      <h1 className="text-2xl font-semibold">
        {(role as UserRole) === "promoter" ? "My Event Reports" : "Event Reports"}
      </h1>
      <CardDescription>
        Generate summary or transaction reports for specific events.
        {(role as UserRole) === "promoter" && " View reports for events you're promoting."}
        {(role as UserRole) === "organizer" && " View reports for events you're organizing."}
        {(role as UserRole) === "superadmin" && " View reports for all events in the system."}      </CardDescription>      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="eventNameInput">Event Name</Label>
              <Input
                id="eventNameInput"
                placeholder="Enter event name"
                value={eventNameInput}
                onChange={(e) => setEventNameInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateInput">Event Date (or Start Date)</Label>
              <Input id="dateInput" type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
            </div>
            <Button onClick={handleSearchEvent} disabled={loading} className="md:self-end">
              {loading && !reportData.length ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search Event
            </Button>
          </div>
        </CardContent>
      </Card>

      {matchedEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Report for: {matchedEvent.EventName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select
                  value={reportType}
                  onValueChange={handleReportTypeChange}
                >
                  <SelectTrigger id="reportType">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Summary">Summary Report</SelectItem>
                    <SelectItem value="Transaction">Transaction Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerateReport} disabled={loading || !reportType} className="md:self-end">
                {loading && reportData.length === 0 ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Filter className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totals summary cards */}
      {reportData.length > 0 && matchedEvent && (() => {
        const num = (v: unknown) => {
          const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""))
          return Number.isFinite(n) ? n : 0
        }
        const isSummary = reportType === "Summary"
        const totalQuantity = reportData.reduce((sum, r) => sum + num(isSummary ? r.quantitySold : r.quantity), 0)
        const totalCheckIn = reportData.reduce((sum, r) => sum + num(r.checkIn), 0)
        const totalPrice = reportData.reduce((sum, r) => sum + num(isSummary ? r.totalRevenue : r.amount), 0)
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-6 shadow-sm">
              <p className="text-base font-medium text-blue-950">Total Quantity</p>
              <p className="mt-2 text-2xl font-semibold text-primary">{totalQuantity.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-6 shadow-sm">
              <p className="text-base font-medium text-blue-950">Total Checkin</p>
              <p className="mt-2 text-2xl font-semibold text-primary">{totalCheckIn.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-6 shadow-sm">
              <p className="text-base font-medium text-blue-950">Total Price</p>
              <p className="mt-2 text-2xl font-semibold text-primary">₹{totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        )
      })()}

      {reportData.length > 0 && matchedEvent && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {reportType} Report: {matchedEvent.EventName}
              </CardTitle>              <CardDescription>
                {currentReportData.length} record(s) found
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" disabled={loading} onClick={handleExportReport}>
              <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading report data...
              </div>            ) : currentReportData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">No data available</p>
                  <p className="text-sm">No report data found for the selected criteria</p>
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>                      {reportType === "Summary" && (
                        <>
                          <TableHead>Ticket Name</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-right">Ticket Price</TableHead>
                          <TableHead className="text-center">Ticket Date</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-center">Check In</TableHead>
                        </>
                      )}                      {reportType === "Transaction" && (
                        <>
                          <TableHead>Name</TableHead>
                          <TableHead>Booking ID</TableHead>
                          <TableHead>Phone No.</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Booking Date & Time</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead>Ticket Date</TableHead>
                          <TableHead>Sources</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Venue</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-center">Check In</TableHead>
                          <TableHead>Scanned By</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentReportData.map((item, index) => (
                      <TableRow key={index}>                        {reportType === "Summary" && (
                          <>
                            <TableCell>{item.ticketName || item.ticketType || "N/A"}</TableCell>
                            <TableCell className="text-center">{(item.quantitySold || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">₹{(item.ticketPrice || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-center">{formatEventDate(item.ticketDate, undefined, [])}</TableCell>
                            <TableCell className="text-right">₹{(item.totalRevenue || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-center">{item.checkIn ?? "-"}</TableCell>
                          </>
                        )}                        {reportType === "Transaction" && (
                          <>
                            <TableCell>{item.customerName || "N/A"}</TableCell>
                            <TableCell className="font-medium">{item.bookingId}</TableCell>
                            <TableCell>{item.phoneNumber || "N/A"}</TableCell>
                            <TableCell>{item.email || "N/A"}</TableCell>
                            <TableCell>{formatEventDateTime(item.bookingDate)}</TableCell>
                            <TableCell>{item.eventName || "N/A"}</TableCell>
                            <TableCell>{item.ticketDate && item.ticketDate !== "N/A" ? formatEventDate(item.ticketDate, undefined, []) : "N/A"}</TableCell>
                            <TableCell>{item.source || "Online"}</TableCell>
                            <TableCell>{item.city || "N/A"}</TableCell>
                            <TableCell>{item.venue || "N/A"}</TableCell>
                            <TableCell className="text-center">{item.quantity || 0}</TableCell>
                            <TableCell className="text-center">{item.checkIn || 0}</TableCell>
                            <TableCell>{item.scannedBy || "N/A"}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                        />
                      </PaginationItem>
                      {[...Array(totalPages)].map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === i + 1}
                            onClick={(e) => {
                              e.preventDefault()
                              handlePageChange(i + 1)
                            }}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) handlePageChange(currentPage + 1)
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}      {/* Transaction Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete details of booking ID: {selectedTransaction?.bookingId}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            {selectedTransaction && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Booking ID</Label>
                    <div className="p-2 bg-muted rounded text-sm">{selectedTransaction.bookingId || "N/A"}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="p-2">
                      <Badge variant={selectedTransaction.status === "Confirmed" ? "default" : selectedTransaction.status === "Cancelled" ? "destructive" : "secondary"}>
                        {selectedTransaction.status || "N/A"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <div className="p-2 bg-muted rounded text-sm">{selectedTransaction.phoneNumber || "N/A"}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <div className="p-2 bg-muted rounded text-sm">{selectedTransaction.email || "N/A"}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Booking Date & Time</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formatEventDateTime(selectedTransaction.bookingDate)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Event Name</Label>
                    <div className="p-2 bg-muted rounded text-sm">{selectedTransaction.eventName || "N/A"}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Ticket Date</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formatEventDate(selectedTransaction.ticketDate, undefined, [])}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Quantity</Label>
                    <div className="p-2 bg-muted rounded text-sm">{selectedTransaction.quantity || 0}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Ticket Name</Label>
                    <div className="p-2 bg-muted rounded text-sm">{selectedTransaction.ticketName || "N/A"}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Ticket Type</Label>
                    <div className="p-2 bg-muted rounded text-sm">{selectedTransaction.ticketType || "N/A"}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Ticket Price</Label>
                    <div className="p-2 bg-muted rounded text-sm font-medium">₹{(selectedTransaction.ticketPrice || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Amount</Label>
                    <div className="p-2 bg-muted rounded text-sm font-medium text-green-600">₹{(selectedTransaction.amount || 0).toLocaleString()}</div>
                  </div>
                </div>
                
                {selectedTransaction.remark && selectedTransaction.remark !== "N/A" && (
                  <div>
                    <Label className="text-sm font-medium">Remark</Label>
                    <div className="p-2 bg-muted rounded text-sm">{selectedTransaction.remark}</div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
