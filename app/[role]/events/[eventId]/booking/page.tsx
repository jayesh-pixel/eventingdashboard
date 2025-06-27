"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  ArrowLeft,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { BookingsTable } from "@/components/bookings-table"
import { organizerEndpoint, promoterEndPointPannel } from "@/lib/api-endpoints"
import { getNumericAdminRole } from "@/lib/api-constants"
import { getValidToken } from "@/lib/token-utils"

interface EventBookingPageProps {
  params: { role: UserRole; eventId: string } | Promise<{ role: UserRole; eventId: string }>
}

interface Booking {
  _id: string
  eventId: string
  eventName: string
  customerId: string
  customerName: string
  customerEmail: string
  phoneNumber: string
  promoterId?: string
  promoterName?: string
  bookingChannel: "Promoter" | "Online" | "Bulk"
  bookingStatus: "Confirmed" | "Pending" | "Cancelled" | "Booked"
  totalAmount: number
  quantity: number
  ticketType: string
  ticketName: string
  ticketPrice: number
  city: string
  venue: string
  ticketDate: string
  bookingDate: string
  createdAt: string
  updatedAt: string
  [key: string]: any
}

const ITEMS_PER_PAGE = 10

export default function EventBookingPage({ params }: EventBookingPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole; eventId: string }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role, eventId } = resolvedParams

  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // State management
  const [loading, setLoading] = React.useState(true)
  const [bookingsData, setBookingsData] = React.useState<Booking[]>([])
  const [originalData, setOriginalData] = React.useState<Booking[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [activeTab, setActiveTab] = React.useState("all")
  const [eventName, setEventName] = React.useState<string>("")

  // Search and filter state
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [channelFilter, setChannelFilter] = React.useState<string>("all")
  const [isFilterDialogOpen, setIsFilterDialogOpen] = React.useState(false)

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
        quantity: quantity,
        ticketType: ticketType,
        ticketName: ticketName,
        ticketPrice: ticketPrice,
        city: city,
        venue: venue,
        ticketDate: ticketDate,
        bookingDate: bookingDate,
        createdAt: booking.createdAt || booking.CreatedAt || booking.created_at || new Date().toISOString(),
        updatedAt: booking.updatedAt || booking.UpdatedAt || booking.updated_at || new Date().toISOString(),
        // Additional API fields for compatibility
        Booking_id: booking.Booking_id || booking.booking_id,
        CustomerName: booking.CustomerName || booking.customerName,
        PhoneNumber: booking.PhoneNumber || booking.phoneNumber,
        Email: booking.Email || booking.email,
        BookingDateTime: booking.BookingDateTime || booking.bookingDate,
        EventName: booking.EventName || booking.eventName,
        TicketDate: booking.TicketDate || booking.ticketDate,
        EventCityName: booking.EventCityName || booking.city,
        EventVenueName: booking.EventVenueName || booking.venue,
        PromoterName: booking.PromoterName || booking.promoterName,
        TicketQuantity: booking.TicketQuantity || booking.quantity,
        TicketName: booking.TicketName || booking.ticketName,
        EventTicketType: booking.EventTicketType || booking.ticketType,
        TicketPrice: booking.TicketPrice || booking.ticketPrice,
        TotalAmount: booking.TotalAmount || booking.totalAmount,
        status: booking.status,
        Remark: booking.Remark || booking.remark,
      }
    })
  }

  // Fetch promoter tickets by event date
  const fetchPromoterTicketsByEventDate = async (eventId: string, eventDateTimeId: string, promoterId: string) => {
    try {
      setLoading(true)
      const apiUrl = "https://devapi.eventingclub.in/eventstickets/getPromoterTicketsbyEventDate"
      const payload = {
        event_id: eventId,
        eventDateTime_id: eventDateTimeId,
        promoter_id: promoterId,
      }
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error fetching promoter tickets by event date:", error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Fetch bookings data for specific event
  const fetchEventBookingsData = async () => {
    try {
      setLoading(true)

      const authToken = getValidToken()
      if (!user || !authToken) {
        console.warn("No user or auth token available")
        toast({
          title: "Error",
          description: "Please log in to view bookings",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      let apiEndpoint
      let requestPayload: any = {}

      if ((role as UserRole) === "promoter") {
        // --- INTEGRATED: Use the new API for promoters ---
        // TODO: Replace this with actual eventDateTime_id source
        const eventDateTimeId = "<eventDateTime_id_here>" // <-- Replace with actual value
        const promoterId = user.user_id
        const promoterTicketsData = await fetchPromoterTicketsByEventDate(eventId, eventDateTimeId, promoterId)
        if (promoterTicketsData && Array.isArray(promoterTicketsData.data)) {
          const normalizedBookings = normalizeBookingData(promoterTicketsData.data)
          setBookingsData(normalizedBookings)
          setOriginalData(normalizedBookings)
          if (normalizedBookings.length > 0) {
            setEventName(normalizedBookings[0].eventName)
          }
          toast({
            title: "Success",
            description: `Loaded ${normalizedBookings.length} promoter tickets for this event date`,
          })
        } else {
          setBookingsData([])
          setOriginalData([])
          toast({
            title: "No Data",
            description: "No promoter tickets found for this event date",
          })
        }
        setLoading(false)
        return
      } else {
        apiEndpoint = organizerEndpoint.GET_ALL_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
        requestPayload = {
          AdminRole: getNumericAdminRole(user.AdminRole || (role as UserRole)),
          user_id: user.user_id,
          event_id: eventId, // Filter by specific event
          page: "1",
          limit: "10", // Get more bookings for this specific event
        }
      }

      console.log("Fetching event bookings:", { eventId, apiEndpoint, requestPayload })

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
      }

      const data = await response.json()
      console.log("API Response:", data)

      let bookingsArray = null
      
      if (data && data.data && data.data.latestBookingData && Array.isArray(data.data.latestBookingData)) {
        bookingsArray = data.data.latestBookingData
      } else if (data && data.data && data.data.BookingData && Array.isArray(data.data.BookingData)) {
        bookingsArray = data.data.BookingData
      } else if (data && data.data && Array.isArray(data.data)) {
        bookingsArray = data.data
      } else if (data && data.BookingData && Array.isArray(data.BookingData)) {
        bookingsArray = data.BookingData
      } else if (data && data.latestBookingData && Array.isArray(data.latestBookingData)) {
        bookingsArray = data.latestBookingData
      } else if (data && Array.isArray(data)) {
        bookingsArray = data
      }

      if (bookingsArray && Array.isArray(bookingsArray)) {
        console.log("Processing", bookingsArray.length, "raw bookings")
        
        // Filter bookings for this specific event
        const eventBookings = bookingsArray.filter(booking => {
          const eventIdFromBooking = booking.eventId || booking.event_id || booking.EventId
          return eventIdFromBooking === eventId
        })
        
        const normalizedBookings = normalizeBookingData(eventBookings)
        console.log("Normalized", normalizedBookings.length, "bookings for event", eventId)
        
        // Set event name from first booking if available
        if (normalizedBookings.length > 0) {
          setEventName(normalizedBookings[0].eventName)
        }
        
        setBookingsData(normalizedBookings)
        setOriginalData(normalizedBookings)
        
        toast({
          title: "Success",
          description: `Loaded ${normalizedBookings.length} bookings for this event`,
        })
      } else {
        console.error("No valid bookings array found")
        setBookingsData([])
        setOriginalData([])
        toast({
          title: "No Data",
          description: "No bookings found for this event",
        })
      }
    } catch (error) {
      console.error("Error fetching event bookings:", error)
      toast({
        title: "Error",
        description: "Could not fetch bookings from server",
        variant: "destructive",
      })
      setBookingsData([])
      setOriginalData([])
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

  // Filter bookings based on search term and filters
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
          (booking.promoterName && booking.promoterName.toLowerCase().includes(searchLower))
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

  // Filter bookings based on tab
  const filteredBookings = React.useMemo(() => {
    let filtered = bookingsData

    switch (activeTab) {
      case "all":
        return filtered
      case "promoter":
        return filtered.filter((booking) => booking.bookingChannel === "Promoter")
      case "online":
        return filtered.filter((booking) => booking.bookingChannel === "Online")
      default:
        return filtered
    }
  }, [bookingsData, activeTab])

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const currentBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Initial data fetch
  React.useEffect(() => {
    fetchEventBookingsData()
  }, [eventId, user])
  // Helper functions
  const formatDate = (date: string | number | Date) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "default"
      case "Pending":
        return "secondary"
      case "Cancelled":
        return "destructive"
      case "Booked":
        return "outline"
      default:
        return "default"
    }
  }

  // Reset all filters
  const resetAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setChannelFilter("all")
  }

  // Export filtered bookings to Excel
  const exportToExcel = () => {
    try {
      const exportData = filteredBookings.map((booking) => ({
        "Booking ID": booking.Booking_id || booking._id || "N/A",
        "Event Name": booking.eventName || "N/A",
        "Customer Name": booking.customerName || "N/A",
        "Customer Email": booking.customerEmail || "N/A",
        "Customer Phone": booking.phoneNumber || "N/A",
        "Ticket Type": booking.ticketType || "N/A",
        "Quantity": booking.quantity || 0,
        "Total Amount": `₹${booking.totalAmount || 0}`,
        "Booking Status": booking.bookingStatus || "N/A",
        "Booking Channel": booking.bookingChannel || "N/A",
        "Promoter Name": booking.promoterName || "N/A",
        "City": booking.city || "N/A",
        "Venue": booking.venue || "N/A",
        "Booking Date": formatDate(booking.bookingDate),
        "Ticket Date": formatDate(booking.ticketDate),
      }))

      // Create CSV content
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(","),
        ...exportData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ""}"`).join(","))
      ].join("\n")

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `event-${eventId}-bookings-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} bookings to CSV`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export bookings",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
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
            <h1 className="text-2xl font-semibold">Event Bookings</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading bookings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen">
      <div className="flex flex-col gap-6 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/${role}/events`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Event Bookings</h1>
              {eventName && (
                <p className="text-sm text-muted-foreground">{eventName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="px-4 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter Bookings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Search by Customer Name, Booking ID, Phone, Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {(role as UserRole) !== "promoter" && (
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
              )}
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="Promoter">Promoter</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Bulk">Bulk</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetAllFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button variant="outline" onClick={exportToExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Content */}
        <div className="w-full max-w-full overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 sm:px-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
                <TabsTrigger value="all">
                  All ({originalData.length})
                </TabsTrigger>
                <TabsTrigger value="promoter">
                  Promoter ({originalData.filter((b) => b.bookingChannel === "Promoter").length})
                </TabsTrigger>
                <TabsTrigger value="online">
                  Online ({originalData.filter((b) => b.bookingChannel === "Online").length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {activeTab === "all"
                      ? "All Bookings"
                      : activeTab === "promoter"
                        ? "Promoter Bookings"
                        : "Online Bookings"}
                  </CardTitle>
                  <CardDescription>
                    {filteredBookings.length} booking(s) found
                  </CardDescription>
                </CardHeader>                <CardContent className="p-0 overflow-x-hidden">
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
                  {totalPages > 1 && (
                    <div className="p-4 border-t">
                      <Pagination>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
