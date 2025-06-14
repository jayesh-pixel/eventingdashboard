"use client"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MoreHorizontal, Download, Filter, Loader2, AlertCircle } from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import type { Booking } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { getNumericAdminRole } from "@/lib/api-constants"
import { organizerEndpoint, promoterEndPointPannel } from "@/lib/api-endpoints"
import { mockBookings } from "@/lib/mock-data"
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
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

const ITEMS_PER_PAGE = 10

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

  // State management
  const [loading, setLoading] = React.useState(true)
  const [bookingsData, setBookingsData] = React.useState<Booking[]>([])
  const [originalData, setOriginalData] = React.useState<Booking[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [activeTab, setActiveTab] = React.useState("all")
  const [useMockData, setUseMockData] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  // Search and filter state
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [channelFilter, setChannelFilter] = React.useState<string>("all")

  // Helper function to normalize booking data
  const normalizeBookingData = (bookings: any[]): Booking[] => {
    console.log("Normalizing bookings data:", bookings)
    return bookings.map((booking, index) => {
      console.log(`Processing booking ${index}:`, booking)
      
      const normalized = {
        _id: booking._id || booking.id || booking.Booking_id || booking.booking_id || `temp-id-${index}`,
        eventId: booking.eventId || booking.event_id || booking.EventId || "",
        eventName: booking.eventName || booking.event_name || booking.EventName || "N/A",
        customerId: booking.customerId || booking.customer_id || booking.CustomerId || "",
        customerName: booking.customerName || booking.customer_name || booking.CustomerName || "N/A",
        customerEmail: booking.customerEmail || booking.customer_email || booking.Email || booking.email || "",
        promoterId: booking.promoterId || booking.promoter_id || booking.PromoterId || "",
        promoterName: booking.promoterName || booking.promoter_name || booking.PromoterName || "Promoter",
        bookingChannel: booking.bookingChannel || booking.booking_channel || booking.Channel || "Promoter",
        bookingStatus: booking.bookingStatus || booking.booking_status || (booking.status === 1 || booking.Status === 1 ? "Confirmed" : "Pending"),
        totalAmount: booking.totalAmount || booking.total_amount || booking.TotalAmount || booking.Price || booking.price || 0,
        bookingDate: booking.bookingDate || booking.booking_date || booking.BookingDateTime || booking.FilterationBookingDateTime || booking.createdAt || booking.created_at || new Date().toISOString(),
        createdAt: booking.createdAt || booking.created_at || booking.FilterationBookingDateTime || booking.bookingDate || new Date().toISOString(),
        updatedAt: booking.updatedAt || booking.updated_at || booking.FilterationBookingDateTime || booking.bookingDate || new Date().toISOString(),
      }
      
      console.log(`Normalized booking ${index}:`, normalized)
      return normalized
    })
  }

  // Fetch bookings data
  const fetchBookingsData = async () => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = localStorage.getItem("authToken")

      if (!user || !authToken) {
        console.warn("No user or auth token available, using mock data")
        setBookingsData(mockBookings)
        setOriginalData(mockBookings)
        setUseMockData(true)
        return
      }

      let apiEndpoint
      let requestPayload: any = {}

      // Determine endpoint based on role
      if ((role as UserRole) === "promoter") {
        // For promoters, get their latest bookings using promoter_id only
        apiEndpoint = promoterEndPointPannel.GET_PROMOTER_LATEST_BOOKINGS
        requestPayload = {
          promoter_id: user.user_id
        }
      } else {
        // For super admin and organizers, get latest bookings
        apiEndpoint = organizerEndpoint.GET_ALL_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
        requestPayload = {
          AdminRole: getNumericAdminRole(user.AdminRole || (role as UserRole)),
          user_id: user.user_id,
          page: currentPage.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        }
      }

      console.log("Fetching bookings for role:", role)
      console.log("Using endpoint:", apiEndpoint)
      console.log("Full URL being called:", apiEndpoint)
      console.log("Request payload:", requestPayload)
      console.log("Request method: POST")

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

      const responseText = await response.text()
      const data = JSON.parse(responseText)

      console.log("Full API response data:", data)
      console.log("Response data type:", typeof data)
      console.log("Response data keys:", Object.keys(data || {}))
      console.log("Response data structure analysis:", {
        hasData: !!data.data,
        hasBookingData: !!data.BookingData,
        dataIsArray: Array.isArray(data.data),
        bookingDataIsArray: Array.isArray(data.BookingData),
        dataLength: data.data ? data.data.length : 0,
        bookingDataLength: data.BookingData ? data.BookingData.length : 0,
        isDirectArray: Array.isArray(data),
        directArrayLength: Array.isArray(data) ? data.length : 0,
      })

      // Log each potential data path
      if (data) {
        console.log("data.data:", data.data)
        console.log("data.BookingData:", data.BookingData) 
        console.log("data as direct array:", Array.isArray(data) ? data : "Not an array")
        
        // Check for other potential data keys
        const dataKeys = Object.keys(data)
        console.log("All response keys:", dataKeys)
        dataKeys.forEach(key => {
          if (Array.isArray(data[key])) {
            console.log(`Found array at data.${key}:`, data[key])
          }
        })
      }

      // Handle different API response structures
      let bookingsArray = null
      let dataSource = ""
      
      if (data && data.data && data.data.BookingData && Array.isArray(data.data.BookingData)) {
        // Promoter API format: data.data.BookingData
        bookingsArray = data.data.BookingData
        dataSource = "data.data.BookingData"
      } else if (data && data.data && Array.isArray(data.data)) {
        // Organizer API format: data.data
        bookingsArray = data.data
        dataSource = "data.data"
      } else if (data && data.BookingData && Array.isArray(data.BookingData)) {
        // Alternative promoter format: data.BookingData
        bookingsArray = data.BookingData
        dataSource = "data.BookingData"
      } else if (data && Array.isArray(data)) {
        // Direct array format
        bookingsArray = data
        dataSource = "direct array"
      } else {
        // Try to find any array in the response
        if (data && typeof data === 'object') {
          const keys = Object.keys(data)
          for (const key of keys) {
            if (Array.isArray(data[key])) {
              console.log(`Found potential bookings array at data.${key}:`, data[key])
              bookingsArray = data[key]
              dataSource = `data.${key}`
              break
            }
            // Check nested objects for arrays
            if (data[key] && typeof data[key] === 'object') {
              const nestedKeys = Object.keys(data[key])
              for (const nestedKey of nestedKeys) {
                if (Array.isArray(data[key][nestedKey])) {
                  console.log(`Found potential bookings array at data.${key}.${nestedKey}:`, data[key][nestedKey])
                  bookingsArray = data[key][nestedKey]
                  dataSource = `data.${key}.${nestedKey}`
                  break
                }
              }
              if (bookingsArray) break
            }
          }
        }
      }

      console.log("Selected data source:", dataSource)
      console.log("Selected bookings array:", bookingsArray)

      if (bookingsArray && Array.isArray(bookingsArray)) {
        console.log("Processing bookings array with length:", bookingsArray.length)
        const normalizedBookings = normalizeBookingData(bookingsArray)
        console.log("Normalized bookings:", normalizedBookings)
        setBookingsData(normalizedBookings)
        setOriginalData(normalizedBookings)
        setUseMockData(false)
        setApiError(null)
      } else {
        console.error("No valid bookings array found in response")
        console.error("Complete response structure:", JSON.stringify(data, null, 2))
        throw new Error(`Unexpected response format from server. No array found. Keys: ${Object.keys(data || {}).join(', ')}`)
      }
    } catch (apiError) {
      console.error("API request failed:", apiError)
      setApiError("Could not fetch bookings from server")

      // Fall back to mock data
      setBookingsData(mockBookings)
      setOriginalData(mockBookings)
      setUseMockData(true)

      toast({
        title: "API Error",
        description: "Could not fetch bookings from server. Showing sample data instead.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(delay)
  }, [searchTerm])

  // Filter bookings based on search term
  React.useEffect(() => {
    if (debouncedSearchTerm === "" && statusFilter === "all" && channelFilter === "all") {
      setBookingsData(originalData)
      return
    }

    let filtered = originalData

    // Filter by search term
    if (debouncedSearchTerm !== "") {
      filtered = filtered.filter(
        (booking) =>
          booking.eventName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          booking.customerName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          booking._id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.bookingStatus === statusFilter)
    }

    // Filter by channel
    if (channelFilter !== "all") {
      filtered = filtered.filter((booking) => booking.bookingChannel === channelFilter)
    }

    setBookingsData(filtered)
    setCurrentPage(1) // Reset to first page when filtering
  }, [debouncedSearchTerm, statusFilter, channelFilter, originalData])

  // Initial data fetch
  React.useEffect(() => {
    fetchBookingsData()
  }, [user])

  // Filter bookings based on tab and role
  const filteredBookings = React.useMemo(() => {
    let filtered = bookingsData

    // Role-based filtering
    if ((role as UserRole) === "promoter") {
      // For promoters, show all their bookings (they come from their specific API endpoint)
      // No additional filtering needed since the API already returns only their bookings
      // Don't filter by promoterId/promoterName as these may not be populated in the API response
      console.log("Promoter role detected - showing all bookings from API (no additional filtering)")
    }

    // Tab-based filtering
    switch (activeTab) {
      case "all":
        return filtered
      case "promoter":
        return filtered.filter((booking) => booking.bookingChannel === "Promoter")
      case "online":
        return filtered.filter((booking) => booking.bookingChannel === "Online")
      case "bulk":
        return filtered.filter((booking) => booking.bookingChannel === "Bulk")
      default:
        return filtered
    }
  }, [bookingsData, activeTab, role])

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const currentBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "default"
      case "Pending":
        return "secondary"
      case "Cancelled":
        return "destructive"
      default:
        return "default"
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Bookings Management</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading bookings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {(role as UserRole) === "promoter" ? "My Bookings" : "Bookings Management"}
        </h1>
      </div>

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Bookings ({filteredBookings.length})</TabsTrigger>
            {(role as UserRole) === "superadmin" && (
              <TabsTrigger value="promoter">
                Promoter ({bookingsData.filter((b) => b.bookingChannel === "Promoter").length})
              </TabsTrigger>
            )}
            <TabsTrigger value="online">
              Online ({bookingsData.filter((b) => b.bookingChannel === "Online").length})
            </TabsTrigger>
            {(role as UserRole) === "superadmin" && (
              <TabsTrigger value="bulk">
                Bulk ({bookingsData.filter((b) => b.bookingChannel === "Bulk").length})
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export Bookings
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Filter Bookings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search by Customer, Event, or Booking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Promoter">Promoter</SelectItem>
                <SelectItem value="Bulk">Bulk</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
                setChannelFilter("all")
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all"
                  ? "All Bookings"
                  : activeTab === "promoter"
                    ? "Promoter Bookings"
                    : activeTab === "online"
                      ? "Online Bookings"
                      : "Bulk Bookings"}
              </CardTitle>
              <CardDescription>
                {filteredBookings.length} booking(s) found
                {useMockData && " (showing sample data)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="hidden md:table-cell">Customer</TableHead>
                    {(role as UserRole) !== "promoter" && (
                      <TableHead className="hidden lg:table-cell">Promoter</TableHead>
                    )}
                    <TableHead className="hidden md:table-cell">Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBookings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={(role as UserRole) === "promoter" ? 7 : 8}
                        className="text-center py-8"
                      >
                        {searchTerm || statusFilter !== "all" || channelFilter !== "all"
                          ? "No bookings found matching your filters"
                          : "No bookings found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentBookings.map((booking) => (
                      <TableRow key={booking._id}>
                        <TableCell className="font-medium">{booking._id}</TableCell>
                        <TableCell>{booking.eventName}</TableCell>
                        <TableCell className="hidden md:table-cell">{booking.customerName}</TableCell>
                        {(role as UserRole) !== "promoter" && (
                          <TableCell className="hidden lg:table-cell">
                            {booking.promoterName || "N/A"}
                          </TableCell>
                        )}
                        <TableCell className="hidden md:table-cell">{booking.bookingChannel}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(booking.bookingStatus)}>
                            {booking.bookingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(booking.totalAmount)}</TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDate(booking.bookingDate)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Download Ticket</DropdownMenuItem>
                              <DropdownMenuItem>Resend Confirmation</DropdownMenuItem>
                              {booking.bookingStatus !== "Cancelled" && (
                                <DropdownMenuItem className="text-red-600">Cancel Booking</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      const pageNum = i + 1
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === pageNum}
                            onClick={(e) => {
                              e.preventDefault()
                              handlePageChange(pageNum)
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    {totalPages > 5 && (
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
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}