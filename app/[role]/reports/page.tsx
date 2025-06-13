"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Search, Loader2, Filter, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UserRole } from "@/lib/navigation"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getNumericAdminRole } from "@/lib/api-constants"
import { promoterEndpoint, promoterEndPointPannel } from "@/lib/api-endpoints"
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
  eventName: string
  eventDate?: string
  eventDateTime?: string
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

// Mock data for fallback
const mockEventsListForReports = [
  { _id: "evt001", eventName: "Summer Music Festival" },
  { _id: "evt002", eventName: "Tech Conference 2025" },
  { _id: "evt003", eventName: "Art Expo Downtown" },
]

const mockSummaryReportData: SummaryReportData[] = [
  { ticketType: "General Admission", quantitySold: 3500, totalRevenue: 525000 },
  { ticketType: "VIP Pass", quantitySold: 500, totalRevenue: 125000 },
  { ticketType: "Early Bird", quantitySold: 1200, totalRevenue: 150000 },
]

const mockTransactionReportData: TransactionReportData[] = [
  {
    bookingId: "BKG001",
    customerName: "Alice Smith",
    ticketType: "VIP Pass",
    quantity: 2,
    amount: 500,
    date: "2025-06-01",
  },
  {
    bookingId: "BKG002",
    customerName: "Bob Johnson",
    ticketType: "General Admission",
    quantity: 1,
    amount: 150,
    date: "2025-06-02",
  },
  {
    bookingId: "BKG003",
    customerName: "Carol Williams",
    ticketType: "Early Bird",
    quantity: 4,
    amount: 500,
    date: "2025-06-03",
  },
  {
    bookingId: "BKG004",
    customerName: "David Brown",
    ticketType: "General Admission",
    quantity: 2,
    amount: 300,
    date: "2025-06-04",
  },
]

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
  const [useMockData, setUseMockData] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

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
    setApiError(null)

    try {
      const authToken = localStorage.getItem("authToken")

      if (!user || !authToken) {
        console.warn("No user or auth token available, using mock data")
        // Fall back to mock search
        handleMockSearch()
        return
      }

      console.log("Searching for events with:")
      console.log("- Event name:", eventNameInput)
      console.log("- Event date:", dateInput)

      const apiEndpoint = promoterEndpoint.EVENT_REPORT_BY_DATE_AND_SEARCH
      const requestPayload = {
        event_name: eventNameInput.trim(),
        event_date: dateInput,
        // Could also include event_time if needed
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
      console.log("Search response data:", data)

      // Handle API response structure
      let eventsArray = []
      
      if (data && data.data && Array.isArray(data.data)) {
        eventsArray = data.data
      } else if (data && Array.isArray(data)) {
        eventsArray = data
      } else {
        console.warn("Unexpected response format, using mock search")
        handleMockSearch()
        return
      }

      if (eventsArray.length > 0) {
        // Take the first matching event
        const foundEvent = eventsArray[0]
        const normalizedEvent: Event = {
          _id: foundEvent._id || foundEvent.id || "unknown",
          eventName: foundEvent.eventName || foundEvent.event_name || foundEvent.EventName || eventNameInput,
          eventDate: foundEvent.eventDate || foundEvent.event_date || dateInput,
        }

        setMatchedEvent(normalizedEvent)
        setUseMockData(false)
        toast({ title: "Event Found", description: `Select a report type for ${normalizedEvent.eventName}.` })
      } else {
        setMatchedEvent(null)
        toast({ title: "Not Found", description: "No event matched your criteria.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Event search failed:", error)
      setApiError("Could not search events from server")
      // Fall back to mock search
      handleMockSearch()
      
      toast({
        title: "API Error",
        description: "Could not search events from server. Using sample data instead.",
        variant: "destructive",
      })
    } finally {
      setReportType("")
      setReportData([])
      setLoading(false)
    }
  }

  // Mock search fallback
  const handleMockSearch = () => {
    const foundEvent = mockEventsListForReports.find(
      (event) => event.eventName.toLowerCase() === eventNameInput.toLowerCase().trim()
    )
    if (foundEvent) {
      setMatchedEvent(foundEvent)
      setUseMockData(true)
      toast({ title: "Event Found", description: `Select a report type for ${foundEvent.eventName}. (Using sample data)` })
    } else {
      setMatchedEvent(null)
      toast({ title: "Not Found", description: "No event matched your criteria.", variant: "destructive" })
    }
  }

  // Generate reports using API
  const handleGenerateReport = async () => {
    if (!matchedEvent || !reportType) {
      toast({ title: "Error", description: "Please select an event and report type.", variant: "destructive" })
      return
    }

    setLoading(true)
    setApiError(null)

    try {
      const authToken = localStorage.getItem("authToken")

      if (!user || !authToken || useMockData) {
        console.warn("Using mock data for report generation")
        // Fall back to mock reports
        setTimeout(() => {
          if (reportType === "Summary") {
            setReportData(mockSummaryReportData)
          } else if (reportType === "Transaction") {
            setReportData(mockTransactionReportData)
          }
          setCurrentPage(1)
          setLoading(false)
          toast({ title: "Report Generated", description: `${reportType} report for ${matchedEvent.eventName} is ready. (Using sample data)` })
        }, 1500)
        return
      }

      console.log("Generating report for:")
      console.log("- Event:", matchedEvent)
      console.log("- Report type:", reportType)
      console.log("- User role:", role)

      let apiEndpoint = ""
      let requestPayload: any = {}

      // Determine the correct endpoint based on role and report type
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
        // For superadmin/organizer - use the promoter payload structure you provided
        if (reportType === "Summary") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_PROMOTER_EVENT_BOOKING_DATA_BY_EVENT_ID
          requestPayload = {
            AdminRole: getNumericAdminRole(user.AdminRole || (role as UserRole)),
            user_id: user.user_id,
            EventName: matchedEvent.eventName,
            DateTime: dateInput + "T00:00:00.000Z",
          }
        } else if (reportType === "Transaction") {
          apiEndpoint = promoterEndPointPannel.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENY_AND_PROMOTER_ID
          requestPayload = {
            AdminRole: getNumericAdminRole(user.AdminRole || (role as UserRole)),
            user_id: user.user_id,
            EventName: matchedEvent.eventName,
            DateTime: dateInput + "T00:00:00.000Z",
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
      console.log("Report response data:", data)

      // Handle API response structure
      let reportArray = []
      
      if (data && data.data && Array.isArray(data.data)) {
        reportArray = data.data
      } else if (data && Array.isArray(data)) {
        reportArray = data
      } else {
        console.warn("Unexpected response format, using mock data")
        throw new Error("Unexpected response format from server")
      }

      // Normalize the data based on report type
      if (reportType === "Summary") {
        // Transform API data to summary format
        const summaryData = reportArray.map((item: any) => ({
          ticketType: item.ticketType || item.ticket_type || item.TicketType || "Standard",
          quantitySold: item.quantitySold || item.quantity_sold || item.Quantity || item.quantity || 0,
          totalRevenue: item.totalRevenue || item.total_revenue || item.TotalAmount || item.amount || 0,
        }))
        setReportData(summaryData)
      } else if (reportType === "Transaction") {
        // Transform API data to transaction format
        const transactionData = reportArray.map((item: any) => ({
          bookingId: item.bookingId || item.booking_id || item.Booking_id || item._id || "N/A",
          customerName: item.customerName || item.customer_name || item.CustomerName || "N/A",
          ticketType: item.ticketType || item.ticket_type || item.TicketType || "Standard",
          quantity: item.quantity || item.Quantity || item.TicketQuantity || 1,
          amount: item.amount || item.Amount || item.TotalAmount || item.total_amount || 0,
          date: item.date || item.booking_date || item.BookingDateTime || item.created_at || new Date().toISOString(),
        }))
        setReportData(transactionData)
      }

      setCurrentPage(1)
      setUseMockData(false)
      toast({ title: "Report Generated", description: `${reportType} report for ${matchedEvent.eventName} is ready.` })
    } catch (error) {
      console.error("Report generation failed:", error)
      setApiError("Could not generate report from server")
      
      // Fall back to mock data
      if (reportType === "Summary") {
        setReportData(mockSummaryReportData)
      } else if (reportType === "Transaction") {
        setReportData(mockTransactionReportData)
      }
      setCurrentPage(1)
      setUseMockData(true)
      
      toast({
        title: "API Error",
        description: "Could not generate report from server. Showing sample data instead.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE)
  const currentReportData = reportData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const handlePageChange = (page: number) => setCurrentPage(page)

  if ((role as UserRole) !== "superadmin" && (role as UserRole) !== "promoter") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin and Promoter only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {(role as UserRole) === "promoter" ? "My Event Reports" : "Global Event Reports"}
      </h1>
      <CardDescription>
        Generate summary or transaction reports for specific events.
        {(role as UserRole) === "promoter" && " View reports for events you're promoting."}
      </CardDescription>

      {/* Error Alert */}
      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>API Error:</strong> {apiError}
          </AlertDescription>
        </Alert>
      )}

      {/* Mock Data Warning */}
      {useMockData && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sample Data:</strong> Using sample data because the API is not available. This is for
            demonstration purposes only.
          </AlertDescription>
        </Alert>
      )}

      <Card>
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
            <CardTitle>Generate Report for: {matchedEvent.eventName}</CardTitle>
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
                {reportType} Report: {matchedEvent.eventName}
              </CardTitle>
              <CardDescription>
                {currentReportData.length} record(s) found
                {useMockData && " (showing sample data)"}
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
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reportType === "Summary" && (
                        <>
                          <TableHead>Ticket Type</TableHead>
                          <TableHead className="text-right">Quantity Sold</TableHead>
                          <TableHead className="text-right">Total Revenue</TableHead>
                        </>
                      )}
                      {reportType === "Transaction" && (
                        <>
                          <TableHead>Booking ID</TableHead>
                          <TableHead>Customer Name</TableHead>
                          <TableHead className="hidden md:table-cell">Ticket Type</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="hidden lg:table-cell">Date</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentReportData.map((item, index) => (
                      <TableRow key={index}>
                        {reportType === "Summary" && (
                          <>
                            <TableCell>{item.ticketType}</TableCell>
                            <TableCell className="text-right">{item.quantitySold.toLocaleString()}</TableCell>
                            <TableCell className="text-right">${item.totalRevenue.toLocaleString()}</TableCell>
                          </>
                        )}
                        {reportType === "Transaction" && (
                          <>
                            <TableCell className="font-medium">{item.bookingId}</TableCell>
                            <TableCell>{item.customerName}</TableCell>
                            <TableCell className="hidden md:table-cell">{item.ticketType}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">${item.amount.toLocaleString()}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {new Date(item.date).toLocaleDateString()}
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
      )}
    </div>
  )
}
