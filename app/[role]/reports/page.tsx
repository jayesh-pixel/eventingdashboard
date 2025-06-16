"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Search, Loader2, Filter, AlertCircle, Eye } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { getNumericAdminRole } from "@/lib/api-constants"
import { promoterEndpoint, promoterEndPointPannel, eventEndPoint } from "@/lib/api-endpoints"
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
  
  // Error popup state
  const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string>("")
  
  // Transaction details modal state
  const [selectedTransaction, setSelectedTransaction] = React.useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false)
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

  // Helper function to show error popup with enhanced error categorization
  const showErrorPopup = (message: string, details?: string) => {
    setErrorMessage(details ? `${message}\n\nDetails: ${details}` : message)
    setIsErrorDialogOpen(true)
    
    // Also show toast for immediate feedback
    toast({
      title: "Error",
      description: message,
      variant: "destructive"
    })
  }

  // Helper function for success messages
  const showSuccessToast = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "default"
    })
  }

  // Helper function for warning messages
  const showWarningToast = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive"
    })
  }

  // Check authentication status
  const checkAuthentication = (): boolean => {
    const authToken = localStorage.getItem("authToken")
    if (!user || !authToken) {
      showErrorPopup(
        "Authentication Required", 
        "Please log in to access reports. Your session may have expired."
      )
      return false
    }
    return true
  }

  // Enhanced error handling for network requests
  const handleNetworkError = async (response: Response, operation: string) => {
    let errorDetails = ""
    try {
      const errorText = await response.text()
      errorDetails = errorText || `HTTP ${response.status}`
    } catch (e) {
      errorDetails = `HTTP ${response.status} - Unable to read error details`
    }

    const errorMessage = `${operation} failed`
    
    // Specific error handling based on status codes
    switch (response.status) {
      case 401:
        showErrorPopup(
          "Authentication Failed", 
          "Your session has expired. Please log in again."
        )
        break
      case 403:
        showErrorPopup(
          "Access Denied", 
          "You don't have permission to access this resource."
        )
        break
      case 404:
        showErrorPopup(
          "Resource Not Found", 
          "The requested resource could not be found on the server."
        )
        break
      case 429:
        showErrorPopup(
          "Too Many Requests", 
          "Please wait a moment before trying again."
        )
        break
      case 500:
        showErrorPopup(
          "Server Error", 
          "Internal server error. Please try again later or contact support."
        )
        break
      default:
        showErrorPopup(errorMessage, errorDetails)
    }
  }
  // Search for events by name and date using API
  const handleSearchEvent = async () => {
    // Input validation
    if (!eventNameInput.trim()) {
      showWarningToast("Missing Event Name", "Please enter an event name to search.")
      return
    }
    
    if (!dateInput.trim()) {
      showWarningToast("Missing Event Date", "Please select an event date to search.")
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
      console.log("Searching for events with:")
      console.log("- Event name:", eventNameInput)
      console.log("- Event date:", dateInput)
      console.log("- User role:", role)

      let apiEndpoint = ""
      let requestPayload: any = {}      // Determine the correct search endpoint based on role
      if ((role as UserRole) === "promoter") {
        apiEndpoint = promoterEndPointPannel.GET_EVENTS_BY_NAME_AND_DATETIME
        requestPayload = {
          AdminRole: 4, // Promoter role ID
          user_id: user!.user_id,
          EventName: eventNameInput.trim(),
          DateTime: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
        }
      } else {
        // For superadmin/organizer - use the paginated events endpoint
        apiEndpoint = eventEndPoint.GET_ALL_EVENTS_PAGINATED
        requestPayload = {
          AdminRole: getNumericAdminRole(user!.AdminRole || (role as UserRole)),
          user_id: user!.user_id,
          page: "1",
          limit: "50",
        }
      }

      console.log("Using endpoint:", apiEndpoint)
      console.log("Request payload:", requestPayload)

      const authToken = localStorage.getItem("authToken")
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        await handleNetworkError(response, "Event search")
        return
      }

      const data = await response.json()
      console.log("Search response data:", data)      // Check for API-level errors - but distinguish between real errors and "no data" responses
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
          
          showWarningToast(
            "No Events Found", 
            `No events found matching "${eventNameInput}" on ${new Date(dateInput).toLocaleDateString()}. Please check the event name and date.`
          )
          return
        } else {
          // This is an actual error
          showErrorPopup(
            "Search Failed", 
            data.message || "The server returned an error while searching for events."
          )
          return
        }
      }

      console.log("Response structure analysis:")
      console.log("- data exists:", !!data)
      console.log("- data.data exists:", !!(data && data.data))
      console.log("- data.data type:", data && data.data ? typeof data.data : "undefined")
      console.log("- data.data is array:", !!(data && data.data && Array.isArray(data.data)))
      console.log("- data.data has _id:", !!(data && data.data && data.data._id))

      // Handle API response structure
      let eventsArray = []
      
      if (data && data.data && data.data.EventsData && Array.isArray(data.data.EventsData)) {
        // Paginated endpoint response structure
        eventsArray = data.data.EventsData
      } else if (data && data.data && Array.isArray(data.data)) {
        // Standard response structure
        eventsArray = data.data
      } else if (data && data.data && typeof data.data === 'object' && data.data._id) {
        // Single event object response (for promoter search)
        eventsArray = [data.data]
      } else if (data && Array.isArray(data)) {
        // Direct array response
        eventsArray = data
      } else {
        console.warn("Unexpected response format:", data)
        showErrorPopup(
          "Invalid Response Format", 
          "The server returned an unexpected response format. Please try again or contact support."
        )
        return
      }

      // Filter events by name if needed (for non-promoter roles that don't support search)
      if ((role as UserRole) !== "promoter") {
        eventsArray = eventsArray.filter((event: any) => {
          const eventName = event.EventName || event.eventName || event.Name || event.name || ""
          return eventName.toLowerCase().includes(eventNameInput.toLowerCase().trim())
        })
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
          showWarningToast(
            "Multiple Events Found", 
            `Found ${eventsArray.length} matching events. Using the first one: "${normalizedEvent.EventName}".`
          )
        }
      } else {
        console.log("❌ No events found")
        setMatchedEvent(null)
        showWarningToast(
          "No Events Found", 
          `No events found matching "${eventNameInput}" on ${new Date(dateInput).toLocaleDateString()}. Please check the event name and date.`
        )
      }
    } catch (error) {
      console.error("Event search failed:", error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showErrorPopup(
          "Network Error", 
          "Unable to connect to the server. Please check your internet connection and try again."
        )
      } else {
        showErrorPopup(
          "Search Failed", 
          error instanceof Error ? error.message : "An unexpected error occurred while searching for events."
        )
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
      showWarningToast("No Event Selected", "Please search for and select an event first.")
      return
    }
    
    if (!reportType) {
      showWarningToast("No Report Type", "Please select a report type (Summary or Transaction).")
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
      if ((role as UserRole) === "promoter") {
        if (reportType === "Summary") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_PROMOTER_EVENT_BOOKING_DATA_BY_EVENT_ID
          requestPayload = {
            promoter_id: user!.user_id,
            event_id: matchedEvent._id,
          }
        } else if (reportType === "Transaction") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENY_AND_PROMOTER_ID
          requestPayload = {
            promoter_id: user!.user_id,
            event_id: matchedEvent._id,
          }
        }
      } else {
        // For superadmin/organizer
        if (reportType === "Summary") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_PROMOTER_EVENT_BOOKING_DATA_BY_EVENT_ID
          requestPayload = {
            AdminRole: getNumericAdminRole(user!.AdminRole || (role as UserRole)),
            user_id: user!.user_id,
            event_id: matchedEvent._id,
          }
        } else if (reportType === "Transaction") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENY_AND_PROMOTER_ID
          requestPayload = {
            AdminRole: getNumericAdminRole(user!.AdminRole || (role as UserRole)),
            user_id: user!.user_id,
            event_id: matchedEvent._id,
          }
        }
      }

      if (!apiEndpoint) {
        showErrorPopup(
          "Invalid Configuration", 
          "Unable to determine the correct API endpoint for your role and report type."
        )
        return
      }

      console.log("Using endpoint:", apiEndpoint)
      console.log("Request payload:", requestPayload)

      const authToken = localStorage.getItem("authToken")
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        await handleNetworkError(response, "Report generation")
        return
      }

      const data = await response.json()
      console.log("Report response data:", data)      // Check for API-level errors - but distinguish between real errors and "no data" responses
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
          
          showWarningToast(
            "No Bookings Found", 
            `No booking data available for ${matchedEvent.EventName}. This event may not have any bookings yet.`
          )
          return
        } else {
          // This is an actual error
          showErrorPopup(
            "Report Generation Failed", 
            data.message || "The server returned an error while generating the report."
          )
          return
        }
      }      // Handle API response structure based on report type
      let reportArray = []
      
      if (reportType === "Summary") {
        // For summary reports, check multiple possible data sources
        if (data && data.data && data.data.TicketsData && Array.isArray(data.data.TicketsData)) {
          reportArray = data.data.TicketsData
          console.log("📊 Using TicketsData array:", reportArray.length, "items")
        } else if (data && data.TicketsData && Array.isArray(data.TicketsData)) {
          reportArray = data.TicketsData
          console.log("📊 Using TicketsData array (direct):", reportArray.length, "items")
        } else if (data && data.data && data.data.TicketNamesArray && Array.isArray(data.data.TicketNamesArray)) {
          // Handle case where TicketsData is empty but we have TicketNamesArray
          console.log("📊 TicketsData is empty, creating placeholder data from TicketNamesArray")
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
          console.log("📊 No ticket data found - this may be normal for events without bookings")
          reportArray = []
        }
      } else {
        // For transaction reports, use the standard structure
        if (data && data.data && Array.isArray(data.data)) {
          reportArray = data.data
        } else if (data && Array.isArray(data)) {
          reportArray = data
        } else {
          // No transaction data found - this is normal, not an error
          console.log("📊 No transaction data found - this may be normal for events without bookings")
          reportArray = []
        }
      }

      // Normalize the data based on report type
      if (reportType === "Summary") {
        // Transform API data to summary format using the TicketsData structure
        const summaryData = reportArray.map((item: any) => {
          const quantitySold = Number(item.Quantity || item.quantity || item.quantity_sold || 0)
          const ticketPrice = Number(item.TicketPrice || item.ticketPrice || item.ticket_price || 0)
          const totalRevenue = Number(item.TotalAmount || item.totalAmount || item.total_amount || (quantitySold * ticketPrice))
          
          return {
            ticketName: item.TicketName || item.ticketName || item.ticket_name || "N/A",
            ticketType: item.TicketName || item.ticketName || item.ticket_name || "Standard",
            quantitySold: quantitySold,
            ticketPrice: ticketPrice,
            ticketDate: item.TicketDate || item.ticketDate || item.ticket_date || null,
            totalRevenue: totalRevenue,
          }
        })
        
        console.log("📈 Processed summary data:", summaryData)
        setReportData(summaryData)
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
        // Transform API data to transaction format
        const transactionData = reportArray.map((item: any) => ({
          bookingId: item.bookingId || item.booking_id || item.Booking_id || item._id || "N/A",
          phoneNumber: item.phoneNumber || item.phone_number || item.PhoneNumber || item.mobile || "N/A",
          email: item.email || item.Email || item.customer_email || item.customerEmail || "N/A",
          bookingDate: item.bookingDate || item.booking_date || item.BookingDateTime || item.date || item.created_at || new Date().toISOString(),
          eventName: item.eventName || item.event_name || item.EventName || "N/A",
          ticketDate: item.ticketDate || item.ticket_date || item.TicketDate || null,
          quantity: Number(item.quantity || item.Quantity || item.TicketQuantity || 0),
          ticketName: item.ticketName || item.ticket_name || item.TicketName || "N/A",
          ticketType: item.ticketType || item.ticket_type || item.TicketType || "Standard",
          ticketPrice: Number(item.ticketPrice || item.ticket_price || item.TicketPrice || 0),
          amount: Number(item.amount || item.Amount || item.TotalAmount || item.total_amount || 0),
          remark: item.remark || item.Remark || item.remarks || item.note || "N/A",
          status: item.status || item.Status || item.booking_status || item.bookingStatus || "N/A",
          customerName: item.customerName || item.customer_name || item.CustomerName || "N/A", // Keep for backward compatibility
        }))
          setReportData(transactionData)
        
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
        showErrorPopup(
          "Network Error", 
          "Unable to connect to the server. Please check your internet connection and try again."
        )
      } else {
        showErrorPopup(
          "Report Generation Failed", 
          error instanceof Error ? error.message : "An unexpected error occurred while generating the report."
        )
      }
      
      // Set empty data
      setReportData([])
      setCurrentPage(1)
    } finally {
      setLoading(false)
    }
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
                  onValueChange={(value: "Summary" | "Transaction" | "") => setReportType(value)}
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
            <Button variant="outline" size="sm" disabled={loading}>
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
                        </>
                      )}                      {reportType === "Transaction" && (
                        <>
                          <TableHead>Booking ID</TableHead>
                          <TableHead>Phone No.</TableHead>
                          <TableHead>Booking Date & Time</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Action</TableHead>
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
                            <TableCell className="text-center">{item.ticketDate ? new Date(item.ticketDate).toLocaleDateString() : "N/A"}</TableCell>
                            <TableCell className="text-right">₹{(item.totalRevenue || 0).toLocaleString()}</TableCell>
                          </>
                        )}                        {reportType === "Transaction" && (
                          <>
                            <TableCell className="font-medium">{item.bookingId}</TableCell>
                            <TableCell>{item.phoneNumber || "N/A"}</TableCell>
                            <TableCell>{item.bookingDate ? new Date(item.bookingDate).toLocaleDateString() : "N/A"}</TableCell>
                            <TableCell className="text-center">{item.quantity || 0}</TableCell>
                            <TableCell className="text-right">₹{(item.amount || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === "Confirmed" ? "default" : item.status === "Cancelled" ? "destructive" : "secondary"}>
                                {item.status || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewTransactionDetails(item)}
                                className="text-xs"
                              >
                                View Details
                              </Button>
                            </TableCell>
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
                      {selectedTransaction.bookingDate ? new Date(selectedTransaction.bookingDate).toLocaleDateString() : "N/A"}
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
                      {selectedTransaction.ticketDate ? new Date(selectedTransaction.ticketDate).toLocaleDateString() : "N/A"}
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
      </Dialog>      {/* Enhanced Error Dialog */}
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error
            </DialogTitle>
            <DialogDescription>
              An error occurred while processing your request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium whitespace-pre-line">{errorMessage}</p>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>If this error persists, please:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Check your internet connection</li>
                <li>Refresh the page and try again</li>
                <li>Contact support if the issue continues</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsErrorDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsErrorDialogOpen(false)
              // Optional: Add retry functionality
              if (matchedEvent && reportType) {
                handleGenerateReport()
              } else {
                handleSearchEvent()
              }
            }}>
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
