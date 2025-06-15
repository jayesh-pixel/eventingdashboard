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
import { BookingsTable } from "@/components/bookings-table"
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
    return bookings.map((booking, index) => {
      const bookingId = booking._id || booking.id || booking.Booking_id || booking.booking_id || `temp-id-${index}`
      const phoneNumber = booking.PhoneNumber || booking.phoneNumber || booking.phone_number || booking.Phone || ""
      const promoterName = booking.PromoterName || booking.promoterName || booking.promoter_name || ""
      const city = booking.EventCityName || booking.city || booking.event_city || booking.CityName || ""
      const venue = booking.EventVenueName || booking.venue || booking.event_venue || booking.VenueName || ""
      const ticketDate = booking.TicketDate || booking.ticketDate || booking.ticket_date || ""
      const ticketName = booking.TicketName || booking.ticketName || booking.ticket_name || ""
      const ticketType = booking.EventTicketType || booking.ticketType || booking.ticket_type || ""
      const ticketPrice = booking.TicketPrice || booking.ticketPrice || booking.ticket_price || 0
      const quantity = booking.TicketQuantity || booking.quantity || booking.ticket_quantity || 1
      const bookingDate = booking.BookingDateTime || booking.bookingDate || booking.booking_date || booking.FilterationBookingDateTime || booking.createdAt || booking.created_at || ""
      const totalAmount = booking.TotalAmount || booking.totalAmount || booking.total_amount || booking.Price || booking.price || 0

      let status: "Confirmed" | "Pending" | "Cancelled" | "Booked" = "Confirmed"
      if (booking.status !== undefined) {
        if (booking.status === 1 || booking.status === "1") {
          status = "Confirmed"
        } else if (booking.status === 0 || booking.status === "0") {
          status = "Cancelled"
        } else if (typeof booking.status === "string") {
          if (["Confirmed", "Pending", "Cancelled", "Booked"].includes(booking.status)) {
            status = booking.status as "Confirmed" | "Pending" | "Cancelled" | "Booked"
          }
        }
      } else if (booking.Status !== undefined) {
        if (booking.Status === 1 || booking.Status === "1") {
          status = "Confirmed"
        } else if (booking.Status === 0 || booking.Status === "0") {
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
        eventId: booking.eventId || booking.event_id || booking.EventId || "",
        eventName: booking.EventName || booking.eventName || booking.event_name || "N/A",
        customerId: booking.customerId || booking.customer_id || booking.CustomerId || "",
        customerName: booking.CustomerName || booking.customerName || booking.customer_name || "N/A",
        customerEmail: booking.Email || booking.customerEmail || booking.customer_email || booking.email || "",
        phoneNumber: phoneNumber,
        promoterId: booking.promoterId || booking.promoter_id || booking.PromoterId || "",
        promoterName: promoterName,
        bookingChannel: booking.BookingSource || booking.bookingChannel || booking.booking_channel || booking.Channel || "Promoter",
        bookingStatus: status,
        totalAmount: totalAmount,
        ticketPrice: ticketPrice,
        quantity: quantity,
        ticketName: ticketName,
        ticketType: ticketType,
        city: city,
        venue: venue,
        ticketDate: ticketDate,
        bookingDate: bookingDate,
        createdAt: booking.createdAt || booking.created_at || bookingDate || new Date().toISOString(),
        updatedAt: booking.updatedAt || booking.updated_at || bookingDate || new Date().toISOString(),
      }
    })
  }

  // Fetch bookings data
  const fetchBookingsData = async () => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = localStorage.getItem("authToken")

      if (!user || !authToken) {
        setBookingsData(mockBookings)
        setOriginalData(mockBookings)
        setUseMockData(true)
        return
      }

      let apiEndpoint
      let requestPayload: any = {}

      if ((role as UserRole) === "promoter") {
        apiEndpoint = promoterEndPointPannel.GET_PROMOTER_LATEST_BOOKINGS
        requestPayload = {
          promoter_id: user.user_id
        }
      } else {
        apiEndpoint = organizerEndpoint.GET_ALL_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
        requestPayload = {
          AdminRole: getNumericAdminRole(user.AdminRole || (role as UserRole)),
          user_id: user.user_id,
          page: currentPage.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        }
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }      const data = await response.json()

      let bookingsArray = null
      
      // Log the response structure for debugging
      console.log("🔍 API Response Structure:", JSON.stringify(data, null, 2))
      
      if (data && data.data && data.data.latestBookingData && Array.isArray(data.data.latestBookingData)) {
        bookingsArray = data.data.latestBookingData
        console.log("✅ Found latestBookingData array with", bookingsArray.length, "items")
      } else if (data && data.data && data.data.BookingData && Array.isArray(data.data.BookingData)) {
        bookingsArray = data.data.BookingData
        console.log("✅ Found BookingData array with", bookingsArray.length, "items")
      } else if (data && data.data && Array.isArray(data.data)) {
        bookingsArray = data.data
        console.log("✅ Found data.data array with", bookingsArray.length, "items")
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
        console.log("📝 Sample raw booking:", JSON.stringify(bookingsArray[0], null, 2))
        
        const normalizedBookings = normalizeBookingData(bookingsArray)
        console.log("✅ Normalized", normalizedBookings.length, "bookings")
        console.log("📋 Sample normalized booking:", JSON.stringify(normalizedBookings[0], null, 2))
        
        setBookingsData(normalizedBookings)
        setOriginalData(normalizedBookings)
        setUseMockData(false)
        
        toast({
          title: "Success",
          description: `Loaded ${normalizedBookings.length} bookings successfully`,
        })
      } else {
        console.error("❌ No valid bookings array found")
        throw new Error("No valid bookings array found in response")
      }
    } catch (error) {
      setApiError("Could not fetch bookings from server")
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

    if (debouncedSearchTerm !== "") {
      const searchLower = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter(
        (booking) =>
          booking.eventName.toLowerCase().includes(searchLower) ||
          booking.customerName.toLowerCase().includes(searchLower) ||
          booking.customerEmail.toLowerCase().includes(searchLower) ||
          booking._id.toLowerCase().includes(searchLower) ||
          (booking.phoneNumber && booking.phoneNumber.toLowerCase().includes(searchLower)) ||
          (booking.promoterName && booking.promoterName.toLowerCase().includes(searchLower)) ||
          (booking.city && booking.city.toLowerCase().includes(searchLower)) ||
          (booking.venue && booking.venue.toLowerCase().includes(searchLower)) ||
          (booking.ticketName && booking.ticketName.toLowerCase().includes(searchLower))
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.bookingStatus === statusFilter)
    }

    if (channelFilter !== "all") {
      filtered = filtered.filter((booking) => booking.bookingChannel === channelFilter)
    }

    setBookingsData(filtered)
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter, channelFilter, originalData])

  // Initial data fetch
  React.useEffect(() => {
    fetchBookingsData()
  }, [user])
  // Filter bookings based on tab and role
  const filteredBookings = React.useMemo(() => {
    let filtered = bookingsData
    
    console.log("🔍 Filtering bookings:", {
      bookingsDataLength: bookingsData.length,
      activeTab,
      role,
      searchTerm: debouncedSearchTerm,
      statusFilter,
      channelFilter
    })

    if ((role as UserRole) === "promoter") {
      console.log("👤 Promoter role - returning all bookings")
      return filtered
    }

    switch (activeTab) {
      case "all":
        console.log("📊 All tab - returning", filtered.length, "bookings")
        return filtered
      case "promoter":
        const promoterBookings = filtered.filter((booking) => booking.bookingChannel === "Promoter")
        console.log("🎤 Promoter tab - returning", promoterBookings.length, "bookings")
        return promoterBookings
      case "online":
        const onlineBookings = filtered.filter((booking) => booking.bookingChannel === "Online")
        console.log("💻 Online tab - returning", onlineBookings.length, "bookings")
        return onlineBookings
      case "bulk":
        const bulkBookings = filtered.filter((booking) => booking.bookingChannel === "Bulk")
        console.log("📦 Bulk tab - returning", bulkBookings.length, "bookings")
        return bulkBookings
      default:
        console.log("❓ Unknown tab - returning", filtered.length, "bookings")
        return filtered
    }
  }, [bookingsData, activeTab, role, debouncedSearchTerm, statusFilter, channelFilter])

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const currentBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  
  console.log("📄 Pagination info:", {
    filteredBookingsLength: filteredBookings.length,
    totalPages,
    currentPage,
    currentBookingsLength: currentBookings.length,
    itemsPerPage: ITEMS_PER_PAGE
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (date: Date | string | number) => {
    if (!date || date === "N/A" || date === "") {
      return "N/A"
    }
    
    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) {
        return "N/A"
      }
      
      return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "N/A"
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

  if (loading) {
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
        <div className="flex items-center justify-between px-4 sm:px-6">
          <h1 className="text-2xl font-semibold">
            {(role as UserRole) === "promoter" ? "My Bookings" : "Bookings Management"}
          </h1>
        </div>

        {apiError && (
          <div className="px-4 sm:px-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>API Error:</strong> {apiError}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {useMockData && (
          <div className="px-4 sm:px-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Sample Data:</strong> Using sample data because the API is not available.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="w-full max-w-full overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between px-4 sm:px-6">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto">
                <TabsTrigger value="all" className="text-xs lg:text-sm">
                  All Bookings ({filteredBookings.length})
                </TabsTrigger>
                {(role as UserRole) === "superadmin" && (
                  <TabsTrigger value="promoter" className="text-xs lg:text-sm">
                    Promoter ({bookingsData.filter((b) => b.bookingChannel === "Promoter").length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="online" className="text-xs lg:text-sm">
                  Online ({bookingsData.filter((b) => b.bookingChannel === "Online").length})
                </TabsTrigger>
                {(role as UserRole) === "superadmin" && (
                  <TabsTrigger value="bulk" className="text-xs lg:text-sm">
                    Bulk ({bookingsData.filter((b) => b.bookingChannel === "Bulk").length})
                  </TabsTrigger>
                )}
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" /> Filters
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="px-4 sm:px-6">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Filter Bookings</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input
                    placeholder="Search by Customer Name, Booking ID, Phone, Email..."
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
                      <SelectItem value="Booked">Booked</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {(role as UserRole) !== "promoter" && (
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
                  )}
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
            </div>

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
                <CardContent className="p-0 overflow-x-hidden">
                  {/* Mobile Card View */}
                  <div className="block md:hidden p-6 space-y-4">
                    {currentBookings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {searchTerm || statusFilter !== "all" || channelFilter !== "all"
                          ? "No bookings found matching your filters"
                          : "No bookings found"}
                      </div>
                    ) : (
                      currentBookings.map((booking) => (
                        <Card 
                          key={booking._id} 
                          className={`p-4 ${
                            booking.bookingStatus === "Cancelled" 
                              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950" 
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{booking.customerName}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">ID: {booking._id.slice(-8)}</p>
                              </div>
                              <Badge variant={getStatusBadgeVariant(booking.bookingStatus)} className="text-xs">
                                {booking.bookingStatus}
                              </Badge>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                              <p className="font-medium text-blue-900 dark:text-blue-100">{booking.eventName}</p>
                              <div className="mt-1 space-y-1">
                                {booking.city && (
                                  <p className="text-sm text-blue-700 dark:text-blue-300">📍 {booking.city}</p>
                                )}
                                {booking.venue && (
                                  <p className="text-sm text-blue-700 dark:text-blue-300">🏢 {booking.venue}</p>
                                )}
                                {booking.ticketDate && (
                                  <p className="text-sm text-blue-700 dark:text-blue-300">
                                    🎫 {new Date(booking.ticketDate).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric"
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {booking.phoneNumber && (
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Phone:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{booking.phoneNumber}</span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Email:</span>
                                <span className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{booking.customerEmail}</span>
                              </div>
                            </div>

                            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-green-600 dark:text-green-400">Quantity</p>
                                  <p className="font-bold text-green-800 dark:text-green-200">{booking.quantity}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-green-600 dark:text-green-400">Total Amount</p>
                                  <p className="font-bold text-green-800 dark:text-green-200">{formatCurrency(booking.totalAmount)}</p>
                                </div>
                              </div>
                              {booking.ticketName && (
                                <div className="mt-2">
                                  <p className="text-xs text-green-600 dark:text-green-400">Ticket</p>
                                  <p className="text-sm font-medium text-green-800 dark:text-green-200">{booking.ticketName}</p>
                                </div>
                              )}
                              {booking.ticketType && (
                                <div className="mt-1">
                                  <p className="text-xs text-green-600 dark:text-green-400">Type</p>
                                  <p className="text-sm font-medium text-green-800 dark:text-green-200">{booking.ticketType}</p>
                                </div>
                              )}
                            </div>

                            {booking.promoterName && (role as UserRole) !== "promoter" && (
                              <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded">
                                <p className="text-xs text-purple-600 dark:text-purple-400">Promoter</p>
                                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">{booking.promoterName}</p>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Booked on</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(booking.bookingDate)}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="outline" className="h-8 w-8 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                  <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">Actions</DropdownMenuLabel>
                                  <DropdownMenuItem className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">View Details</DropdownMenuItem>
                                  <DropdownMenuItem className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Download Ticket</DropdownMenuItem>
                                  <DropdownMenuItem className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Resend Confirmation</DropdownMenuItem>
                                  {booking.bookingStatus !== "Cancelled" && (
                                    <DropdownMenuItem className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950">Cancel Booking</DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>                  {/* Desktop Table View */}
                  <div className="w-full">
                    <BookingsTable 
                      bookings={currentBookings}
                      role={role as UserRole}
                      searchTerm={searchTerm}
                      statusFilter={statusFilter}
                      channelFilter={channelFilter}
                      formatDate={formatDate}
                      formatCurrency={formatCurrency}
                      getStatusBadgeVariant={getStatusBadgeVariant}
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}