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

  // Helper function to show error popup
  const showErrorPopup = (message: string) => {
    setErrorMessage(message)
    setIsErrorDialogOpen(true)
  }

  // Search for events by name and date using API
  const handleSearchEvent = async () => {
    if (!eventNameInput.trim() || !dateInput.trim()) {
      toast({ title: "Error", description: "Please enter Event Name and Date.", variant: "destructive" })
      setMatchedEvent(null)
      setReportType("")
      setReportData([])
      return
    }

    setLoading(true)

    try {
      const authToken = localStorage.getItem("authToken")

      if (!user || !authToken) {
        console.warn("No user or auth token available")
        showErrorPopup("Please log in to search for events")
        setLoading(false)
        return
      }console.log("Searching for events with:")
      console.log("- Event name:", eventNameInput)
      console.log("- Event date:", dateInput)
      console.log("- User role:", role)

      let apiEndpoint = ""
      let requestPayload: any = {}      // Determine the correct search endpoint based on role
      if ((role as UserRole) === "promoter") {
        apiEndpoint = promoterEndPointPannel.GET_EVENTS_BY_NAME_AND_DATETIME
        requestPayload = {
          AdminRole: 4, // Promoter role ID
          user_id: user.user_id,
          EventName: eventNameInput.trim(),
          DateTime: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
        }
      } else {
        // For superadmin/organizer - use the paginated events endpoint
        apiEndpoint = eventEndPoint.GET_ALL_EVENTS_PAGINATED
        requestPayload = {
          AdminRole: getNumericAdminRole(user.AdminRole || (role as UserRole)),
          user_id: user.user_id,
          page: "1",
          limit: "50",
        }
      }

      console.log("Using endpoint:", apiEndpoint)
      console.log("Request payload:", requestPayload)

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
        let errorText = ""
        try {
          errorText = await response.text()
          console.log("Error response body:", errorText)
        } catch (e) {
          console.log("Could not read error response body")
        }
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }      const data = await response.json()
      console.log("Search response data:", data)
      console.log("Response structure analysis:")
      console.log("- data exists:", !!data)
      console.log("- data.data exists:", !!(data && data.data))
      console.log("- data.data type:", data && data.data ? typeof data.data : "undefined")
      console.log("- data.data is array:", !!(data && data.data && Array.isArray(data.data)))
      console.log("- data.data has _id:", !!(data && data.data && data.data._id))// Handle API response structure
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
        console.warn("Expected an array or single event object, got:", typeof data.data)
        toast({
          title: "Error",
          description: "Unexpected response format from server",
          variant: "destructive"
        })
        return
      }

      // Filter events by name if needed (for non-promoter roles that don't support search)
      if ((role as UserRole) !== "promoter") {
        eventsArray = eventsArray.filter((event: any) => {
          const eventName = event.EventName || event.eventName || event.Name || event.name || ""
          return eventName.toLowerCase().includes(eventNameInput.toLowerCase().trim())
        })
      }      if (eventsArray.length > 0) {
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
        toast({ title: "Event Found", description: `Select a report type for ${normalizedEvent.EventName}.` })
      } else {
        console.log("❌ No events found")
        setMatchedEvent(null)
        toast({ title: "Not Found", description: "No event matched your criteria.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Event search failed:", error)
      showErrorPopup("Could not search events from server")
      setMatchedEvent(null)
      setReportType("")
      setReportData([])
    } finally {
      setLoading(false)
    }
  }
 
  // Generate reports using API
  const handleGenerateReport = async () => {
    if (!matchedEvent || !reportType) {
      toast({ title: "Error", description: "Please select an event and report type.", variant: "destructive" })
      return
    }

    console.log("🚀 Starting report generation...")
    console.log("- Matched event:", matchedEvent)
    console.log("- Report type:", reportType)
    console.log("- User role:", role)
    setLoading(true)

    try {
      const authToken = localStorage.getItem("authToken")

      if (!user || !authToken) {
        console.warn("No user or auth token available")
        showErrorPopup("Please log in to generate reports")
        setLoading(false)
        return
      }

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
            promoter_id: user.user_id,
            event_id: matchedEvent._id,
          }
        } else if (reportType === "Transaction") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENY_AND_PROMOTER_ID
          requestPayload = {
            promoter_id: user.user_id,
            event_id: matchedEvent._id,
          }
        }
      } else {
        // For superadmin/organizer
        if (reportType === "Summary") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_PROMOTER_EVENT_BOOKING_DATA_BY_EVENT_ID
          requestPayload = {
            AdminRole: getNumericAdminRole(user.AdminRole || (role as UserRole)),
            user_id: user.user_id,
            event_id: matchedEvent._id,
          }
        } else if (reportType === "Transaction") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENY_AND_PROMOTER_ID
          requestPayload = {
            AdminRole: getNumericAdminRole(user.AdminRole || (role as UserRole)),
            user_id: user.user_id,
            event_id: matchedEvent._id,
          }
        }
      }

      console.log("Using endpoint:", apiEndpoint)
      console.log("Request payload:", requestPayload)

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
        let errorText = ""
        try {
          errorText = await response.text()
          console.log("Error response body:", errorText)
        } catch (e) {
          console.log("Could not read error response body")
        }
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Report response data:", data)      // Handle API response structure based on report type
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
          console.warn("Unexpected summary response format:", data)
          console.warn("Available data keys:", data && data.data ? Object.keys(data.data) : "no data.data")
          throw new Error("Unexpected response format from server for summary report")
        }
      } else {
        // For transaction reports, use the standard structure
        if (data && data.data && Array.isArray(data.data)) {
          reportArray = data.data
        } else if (data && Array.isArray(data)) {
          reportArray = data
        } else {
          console.warn("Unexpected transaction response format:", data)
          throw new Error("Unexpected response format from server for transaction report")
        }
      }      // Normalize the data based on report type
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
        if (summaryData.length > 0 && summaryData.some((item: any) => item.quantitySold > 0)) {
          toast({ title: "Report Generated", description: `${reportType} report for ${matchedEvent.EventName} is ready.` })
        } else if (summaryData.length > 0) {
          toast({ 
            title: "Report Generated", 
            description: `${reportType} report shows available ticket types for ${matchedEvent.EventName}. No bookings found yet.`,
          })
        } else {
          toast({ 
            title: "Report Generated", 
            description: `No ticket data available for ${matchedEvent.EventName}.`,
            variant: "destructive"
          })
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
          amount: Number(item.amount || item.Amount || item.TotalAmount || item.total_amount || 0),          remark: item.remark || item.Remark || item.remarks || item.note || "N/A",
          status: item.status || item.Status || item.booking_status || item.bookingStatus || "N/A",
          customerName: item.customerName || item.customer_name || item.CustomerName || "N/A", // Keep for backward compatibility
        }))
        setReportData(transactionData)
        toast({ title: "Report Generated", description: `${reportType} report for ${matchedEvent.EventName} is ready.` })
      }      setCurrentPage(1)
    } catch (error) {
      console.error("Report generation failed:", error)
      showErrorPopup("Could not generate report from server")
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
      </Dialog>

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
  )
}
