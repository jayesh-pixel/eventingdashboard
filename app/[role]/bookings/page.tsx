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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MoreHorizontal, Download, Filter, Loader2, AlertCircle, ChevronDown, X } from "lucide-react"
import { useIsMobile } from "@/components/ui/use-mobile"
import * as XLSX from "xlsx"
import type { UserRole } from "@/lib/navigation"
import type { Booking } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { getNumericAdminRole } from "@/lib/api-constants"
import { organizerEndpoint, promoterEndPointPannel } from "@/lib/api-endpoints"
import { handleApiResponse, getApiErrorMessage } from "@/lib/utils"
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
  const isMobile = useIsMobile()
  
  // State management
  const [loading, setLoading] = React.useState(true)
  const [bookingsData, setBookingsData] = React.useState<Booking[]>([])
  const [originalData, setOriginalData] = React.useState<Booking[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [activeTab, setActiveTab] = React.useState(role === "promoter" ? "my-bookings" : "all")

  // Error popup state
  const [isErrorDialogOpen, setIsErrorDialogOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string>("")

  // Search and filter state
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [channelFilter, setChannelFilter] = React.useState<string>("all")
  const [cityFilter, setCityFilter] = React.useState<string>("all")
  const [venueFilter, setVenueFilter] = React.useState<string>("all")
  const [eventNameFilter, setEventNameFilter] = React.useState<string>("all")
  const [organizerFilter, setOrganizerFilter] = React.useState<string>("all")
  const [promoterFilter, setPromoterFilter] = React.useState<string>("all")

  // Temporary filter state (for dialog - only applied on "Apply Filter" click)
  const [tempCityFilter, setTempCityFilter] = React.useState<string>("all")
  const [tempVenueFilter, setTempVenueFilter] = React.useState<string>("all")
  const [tempEventNameFilter, setTempEventNameFilter] = React.useState<string>("all")
  const [tempOrganizerFilter, setTempOrganizerFilter] = React.useState<string>("all")
  const [tempPromoterFilter, setTempPromoterFilter] = React.useState<string>("all")

  // Mobile UI state
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false)
  const [isTabsDropdownOpen, setIsTabsDropdownOpen] = React.useState(false)
  // Helper function to show error popup
  const showErrorPopup = (message: string) => {
    setErrorMessage(message)
    setIsErrorDialogOpen(true)
  }

  // Filter popup state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = React.useState(false)

  // Helper function to get available tabs based on role
  const getAvailableTabs = () => {
    const tabs = []
    
    if ((role as UserRole) !== "promoter") {
      tabs.push({
        value: "all",
        label: "All Bookings",
        count: filteredBookings.length
      })
    }

    if ((role as UserRole) === "promoter") {
      tabs.push({
        value: "my-bookings",
        label: "My Bookings",
        count: filteredBookings.length
      })
    }

    if ((role as UserRole) === "superadmin") {
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
    return activeTabData ? `${activeTabData.label} (${activeTabData.count})` : "Select Tab"
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
                <Badge variant={activeTab === tab.value ? "default" : "secondary"} className="ml-2">
                  {tab.count}
                </Badge>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick action buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex-shrink-0 relative">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {(statusFilter !== "all" || channelFilter !== "all" || cityFilter !== "all" || 
                venueFilter !== "all" || eventNameFilter !== "all" || organizerFilter !== "all" || promoterFilter !== "all") && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full flex items-center justify-center">
                  <div className="h-1.5 w-1.5 bg-white rounded-full" />
                </div>
              )}
            </Button>
          </SheetTrigger>
        </Sheet>
        
        <Button variant="outline" size="sm" onClick={exportToExcel} className="flex-shrink-0">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>

        {/* Quick reset button if filters are active */}
        {(statusFilter !== "all" || channelFilter !== "all" || cityFilter !== "all" || 
          venueFilter !== "all" || eventNameFilter !== "all" || organizerFilter !== "all" || promoterFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={resetAllFilters} className="flex-shrink-0 text-muted-foreground">
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters preview for mobile */}
      {(statusFilter !== "all" || channelFilter !== "all" || cityFilter !== "all" || 
        venueFilter !== "all" || eventNameFilter !== "all" || organizerFilter !== "all" || promoterFilter !== "all") && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              {statusFilter}
            </Badge>
          )}
          {channelFilter !== "all" && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              {channelFilter}
            </Badge>
          )}
          {cityFilter !== "all" && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              {cityFilter}
            </Badge>
          )}
          {venueFilter !== "all" && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              {venueFilter}
            </Badge>
          )}
          {eventNameFilter !== "all" && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              Event: {eventNameFilter.length > 15 ? `${eventNameFilter.substring(0, 15)}...` : eventNameFilter}
            </Badge>
          )}
          {organizerFilter !== "all" && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              Organizer: {organizerFilter.length > 15 ? `${organizerFilter.substring(0, 15)}...` : organizerFilter}
            </Badge>
          )}
          {promoterFilter !== "all" && (
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              Promoter: {promoterFilter.length > 15 ? `${promoterFilter.substring(0, 15)}...` : promoterFilter}
            </Badge>
          )}
        </div>
      )}
    </div>
  )

  // Desktop tabs component (existing style)
  const DesktopTabs = () => (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-md lg:w-auto lg:inline-flex lg:grid-cols-none">
        {getAvailableTabs().map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="text-xs whitespace-nowrap px-4 py-2 min-w-0 flex-1 lg:flex-none lg:text-sm"
          >
            {tab.label} ({tab.count})
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex items-center gap-2">
        <Dialog open={isFilterDialogOpen} onOpenChange={(open) => {
          setIsFilterDialogOpen(open)
          if (open) {
            // Sync temporary filters with current filters when opening
            setTempCityFilter(cityFilter)
            setTempVenueFilter(venueFilter)
            setTempEventNameFilter(eventNameFilter)
            setTempOrganizerFilter(organizerFilter)
            setTempPromoterFilter(promoterFilter)
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Event Filter</DialogTitle>
              <DialogDescription>
                Filter bookings by city, venue, event name, organizers, and promoters
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Select value={tempCityFilter} onValueChange={setTempCityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {getUniqueCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Venue</label>
                <Select value={tempVenueFilter} onValueChange={setTempVenueFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Venues</SelectItem>
                    {getUniqueVenues.map((venue) => (
                      <SelectItem key={venue} value={venue}>
                        {venue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Name</label>
                <Select value={tempEventNameFilter} onValueChange={setTempEventNameFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Event names" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {getUniqueEventNames.map((eventName) => (
                      <SelectItem key={eventName} value={eventName}>
                        {eventName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(role as UserRole) === "organizer" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Promoters</label>
                  <Select value={tempPromoterFilter} onValueChange={setTempPromoterFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Promoter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Promoters</SelectItem>
                      {getUniquePromoters.map((promoter) => (
                        <SelectItem key={promoter} value={promoter}>
                          {promoter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(role as UserRole) === "superadmin" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organizers</label>
                    <Select value={tempOrganizerFilter} onValueChange={setTempOrganizerFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Organizer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Organizers</SelectItem>
                        {getUniqueOrganizers.map((organizer) => (
                          <SelectItem key={organizer} value={organizer}>
                            {organizer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Promoters</label>
                    <Select value={tempPromoterFilter} onValueChange={setTempPromoterFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Promoter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Promoters</SelectItem>
                        {getUniquePromoters.map((promoter) => (
                          <SelectItem key={promoter} value={promoter}>
                            {promoter}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={resetAllFilters}
                className="mr-2"
              >
                Reset All
              </Button>
              <Button onClick={() => {
                setCityFilter(tempCityFilter)
                setVenueFilter(tempVenueFilter)
                setEventNameFilter(tempEventNameFilter)
                setOrganizerFilter(tempOrganizerFilter)
                setPromoterFilter(tempPromoterFilter)
                setIsFilterDialogOpen(false)
              }}>
                Apply Filters
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>
    </div>
  )

  // Helper function to normalize booking data
  const normalizeBookingData = (bookings: any[]): Booking[] => {
    return bookings.map((booking, index) => {
      const bookingId = booking._id || booking.id || booking.Booking_id || booking.booking_id || `temp-id-${index}`
      const phoneNumber = booking.PhoneNumber || booking.phoneNumber || booking.phone_number || booking.Phone || ""
      const promoterName = booking.PromoterName || booking.promoterName || booking.promoter_name || ""
      const organizerName = booking.OrganizerName || booking.organizerName || booking.organizer_name || ""
      const city = booking.EventCityName || booking.city || booking.event_city || booking.CityName || ""
      const venue = booking.EventVenueName || booking.venue || booking.event_venue || booking.VenueName || ""
      const ticketDate = booking.TicketDate || booking.ticketDate || booking.ticket_date || ""
      const ticketName = booking.TicketName || booking.ticketName || booking.ticket_name || ""
      const ticketType = booking.EventTicketType || booking.ticketType || booking.ticket_type || ""
      const ticketPrice = booking.TicketPrice || booking.ticketPrice || booking.ticket_price || 0
      const quantity = booking.TicketQuantity || booking.quantity || booking.ticket_quantity || 1
      const bookingDate = booking.BookingDateTime || booking.bookingDate || booking.booking_date || booking.FilterationBookingDateTime || booking.createdAt || booking.created_at || ""
      const totalAmount = booking.TotalAmount || booking.totalAmount || booking.total_amount || booking.Price || booking.price || 0
      
      // BookingSource is the CORRECT API field - it returns "Promoter" or "Online"
      // Do NOT use other fields as they may have different values
      const bookingSource = booking.BookingSource || "Online"

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
        CustomerName: booking.CustomerName || booking.customerName,
        PhoneNumber: booking.PhoneNumber || booking.phoneNumber,
        Email: booking.Email || booking.email,
        BookingDateTime: booking.BookingDateTime || booking.bookingDate,
        EventName: booking.EventName || booking.eventName,
        TicketDate: booking.TicketDate || booking.ticketDate,
        EventCityName: booking.EventCityName || booking.city,
        EventVenueName: booking.EventVenueName || booking.venue,
        PromoterName: booking.PromoterName || booking.promoterName,
        OrganizerName: booking.OrganizerName || booking.organizerName,
        OrganizerId: booking.OrganizerId || booking.organizerId,
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

  // Fetch bookings data
  const fetchBookingsData = async (filters?: {
    searchTerm?: string
    statusFilter?: string
    channelFilter?: string
    cityFilter?: string
    venueFilter?: string
    eventNameFilter?: string
    organizerFilter?: string
    promoterFilter?: string
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

      let apiEndpoint
      let requestPayload: any = {}

      if ((role as UserRole) === "promoter") {
        apiEndpoint = promoterEndPointPannel.GET_PROMOTER_LATEST_BOOKINGS
        requestPayload = {
          promoter_id: user.user_id
        }
        
        // Add filter parameters for promoter endpoint
        if (filters?.searchTerm) {
          requestPayload.searchkeyword = filters.searchTerm
        }
      } else {
        // For superadmin/organizer, use different endpoints based on active tab
        const adminRole = getNumericAdminRole(user.AdminRole || (role as UserRole))
        
        switch (activeTab) {
          case "promoter":
            apiEndpoint = organizerEndpoint.GET_PROMOTER_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
            console.log("🎤 Using promoter booking endpoint for tab:", activeTab)
            break
          case "online":
            apiEndpoint = organizerEndpoint.GET_ONLINE_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
            console.log("💻 Using online booking endpoint for tab:", activeTab)
            break
          case "all":
          default:
            apiEndpoint = organizerEndpoint.GET_ALL_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER
            console.log("📊 Using all bookings endpoint for tab:", activeTab)
            break
        }
        
        requestPayload = {
          AdminRole: adminRole,
          user_id: user.user_id,
          page: currentPage.toString(),
          limit: "10", // Increased limit to get more data
        }
        
        // For organizer role, add organizer_id to filter only their events' bookings
        if ((role as UserRole) === "organizer" && user.user_id) {
          requestPayload.organizer_id = user.user_id
          console.log("🔒 Organizer filter applied - organizer_id:", user.user_id)
        }
        
        // Add filter parameters to the payload
        // Only sending search and status - other filters are applied client-side
        if (filters?.searchTerm) {
          requestPayload.searchkeyword = filters.searchTerm
        }
        if (filters?.statusFilter && filters.statusFilter !== "all") {
          requestPayload.status = filters.statusFilter
        }
        // City, Venue, Event Name, Organizer, and Promoter filters are applied client-side
        // after fetching data from the API
      }

      console.log("🚀 BOOKING API CALL:")
      console.log("- Active tab:", activeTab)
      console.log("- Endpoint:", apiEndpoint)
      console.log("- Payload:", requestPayload)
      console.log("- Applied filters:", filters || "none")
      console.log("- Full URL being called:", apiEndpoint)

      const response = await fetch(apiEndpoint, {
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
        return
      }

      const data = await handleApiResponse(response)
      console.log("🎯 BOOKING API RESPONSE SUCCESS:")
      console.log("- Response status:", response.status)
      console.log("- Response size:", JSON.stringify(data).length, "characters")
      console.log("- Response keys:", Object.keys(data || {}))

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
        
        console.log("📊 FINAL STATE UPDATE:")
        console.log("- bookingsData will be set to", normalizedBookings.length, "items")
        console.log("- originalData will be set to", normalizedBookings.length, "items")
        
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

  // Filter bookings using API calls for search and status only
  // City, venue, event name, organizer, and promoter filters are applied client-side
  React.useEffect(() => {
    if (!user) return

    const hasActiveFilters = 
      debouncedSearchTerm !== "" || 
      statusFilter !== "all" || 
      channelFilter !== "all"

    // If no filters are active, fetch data without filters
    if (!hasActiveFilters) {
      fetchBookingsData()
      return
    }

    // Prepare filter object for API call (only search and status)
    const filters = {
      searchTerm: debouncedSearchTerm !== "" ? debouncedSearchTerm : undefined,
      statusFilter: statusFilter !== "all" ? statusFilter : undefined,
      channelFilter: channelFilter !== "all" ? channelFilter : undefined,
      // Note: city, venue, eventName, organizer, and promoter filters are applied client-side
      cityFilter: undefined,
      venueFilter: undefined,
      eventNameFilter: undefined,
      organizerFilter: undefined,
      promoterFilter: undefined
    }

    console.log("🔍 Applying filters via API:", filters)
    
    // Call API with filters
    fetchBookingsData(filters)
  }, [debouncedSearchTerm, statusFilter, channelFilter, user])

  // Initial data fetch - refetch when user or activeTab changes
  React.useEffect(() => {
    if (user) {
      // Fetch data without filters initially
      fetchBookingsData()
    }
  }, [user, activeTab])
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  
  // Helper functions to get unique filter options
  const getUniqueCities = React.useMemo(() => {
    const cities = originalData
      .map((booking) => booking.city)
      .filter((city): city is string => Boolean(city && city.trim() !== "" && city !== "N/A"))
    return [...new Set(cities)].sort()
  }, [originalData])

  const getUniqueVenues = React.useMemo(() => {
    const venues = originalData
      .map((booking) => booking.venue)
      .filter((venue): venue is string => Boolean(venue && venue.trim() !== "" && venue !== "N/A"))
    return [...new Set(venues)].sort()
  }, [originalData])

  const getUniqueEventNames = React.useMemo(() => {
    const events = originalData
      .map((booking) => booking.eventName)
      .filter((event): event is string => Boolean(event && event.trim() !== "" && event !== "N/A"))
    return [...new Set(events)].sort()
  }, [originalData])

  const getUniqueOrganizers = React.useMemo(() => {
    const organizers = originalData
      .map((booking) => booking.organizerName)
      .filter((organizer): organizer is string => Boolean(organizer && organizer.trim() !== "" && organizer !== "N/A"))
    return [...new Set(organizers)].sort()
  }, [originalData])

  const getUniquePromoters = React.useMemo(() => {
    const promoters = originalData
      .map((booking) => booking.promoterName || booking.PromoterName)
      .filter((promoter): promoter is string => Boolean(promoter && promoter.trim() !== "" && promoter !== "N/A"))
    return [...new Set(promoters)].sort()
  }, [originalData])

  // Reset all filters
  const resetAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setChannelFilter("all")
    setCityFilter("all")
    setVenueFilter("all")
    setEventNameFilter("all")
    setOrganizerFilter("all")
    setPromoterFilter("all")
  }

  // Client-side filtering of bookings
  const filteredBookings = React.useMemo(() => {
    let filtered = bookingsData

    // Apply search term filter (client-side fallback for phone/email search)
    if (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") {
      const searchLower = debouncedSearchTerm.toLowerCase().trim()
      filtered = filtered.filter((booking) => {
        // Search in multiple fields including phone and email
        const searchableFields = [
          booking.customerName,
          booking.customerEmail,
          booking.phoneNumber || booking.PhoneNumber,
          booking.eventName,
          booking.city,
          booking.venue,
          booking._id,
          booking.Booking_id,
          booking.promoterName,
          booking.PromoterName,
        ]
        
        return searchableFields.some(field => 
          field && String(field).toLowerCase().includes(searchLower)
        )
      })
    }

    // Apply city filter
    if (cityFilter !== "all") {
      filtered = filtered.filter((booking) => booking.city === cityFilter)
    }

    // Apply venue filter
    if (venueFilter !== "all") {
      filtered = filtered.filter((booking) => booking.venue === venueFilter)
    }

    // Apply event name filter
    if (eventNameFilter !== "all") {
      filtered = filtered.filter((booking) => booking.eventName === eventNameFilter)
    }

    // Apply organizer filter
    if (organizerFilter !== "all") {
      filtered = filtered.filter((booking) => booking.organizerName === organizerFilter)
    }

    // Apply promoter filter
    if (promoterFilter !== "all") {
      filtered = filtered.filter((booking) => 
        booking.promoterName === promoterFilter || booking.PromoterName === promoterFilter
      )
    }

    return filtered
  }, [bookingsData, debouncedSearchTerm, cityFilter, venueFilter, eventNameFilter, organizerFilter, promoterFilter])

  // Paginated bookings for current page
  const currentBookings = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredBookings.slice(startIndex, endIndex)
  }, [filteredBookings, currentPage])

  // Calculate total pages
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)

  // Export filtered bookings to Excel
  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredBookings.map((booking) => ({
        "Booking ID": booking.Booking_id || booking._id || "N/A",
        "Event Name": booking.eventName || booking.EventName || "N/A",
        "Customer Name": booking.customerName || booking.CustomerName || "N/A",
        "Customer Email": booking.customerEmail || booking.Email || "N/A",
        "Customer Phone": booking.phoneNumber || booking.PhoneNumber || "N/A",
        "Ticket Type": booking.ticketType || booking.EventTicketType || "N/A",
        "Quantity": booking.quantity || booking.TicketQuantity || 0,
        "Total Amount": `₹${booking.totalAmount || booking.TotalAmount || 0}`,
        "Booking Status": booking.bookingStatus || "N/A",
        "Booking Channel": booking.bookingChannel || "N/A",        "Booking Date": formatDateForExport(booking.bookingDate || booking.BookingDateTime || ""),
        "Ticket Date": formatDateForExport(booking.ticketDate || booking.TicketDate || ""),
        "City": booking.city || booking.EventCityName || "N/A",
        "Venue": booking.venue || booking.EventVenueName || "N/A",
        "Promoter": booking.promoterName || booking.PromoterName || "N/A",
        "Remark": booking.remark || booking.Remark || "N/A"
      }))

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Bookings")

      // Auto-size columns
      const range = XLSX.utils.decode_range(ws['!ref']!)
      const colWidths = []
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 0
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellRef = XLSX.utils.encode_cell({ c: C, r: R })
          const cell = ws[cellRef]
          if (cell && cell.v) {
            const cellValue = cell.v.toString()
            maxWidth = Math.max(maxWidth, cellValue.length)
          }
        }
        colWidths.push({ wch: Math.min(maxWidth + 2, 50) })
      }
      ws['!cols'] = colWidths

      // Generate filename with current date and applied filters
      const currentDate = new Date().toISOString().split('T')[0]
      let filename = `bookings_export_${currentDate}`
      
      // Add filter info to filename
      const activeFilters = []
      if (searchTerm) activeFilters.push(`search_${searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}`)
      if (statusFilter !== "all") activeFilters.push(`status_${statusFilter}`)
      if (channelFilter !== "all") activeFilters.push(`channel_${channelFilter}`)
      if (cityFilter !== "all") activeFilters.push(`city_${cityFilter.replace(/[^a-zA-Z0-9]/g, '_')}`)
      if (venueFilter !== "all") activeFilters.push(`venue_${venueFilter.replace(/[^a-zA-Z0-9]/g, '_')}`)
      if (eventNameFilter !== "all") activeFilters.push(`event_${eventNameFilter.replace(/[^a-zA-Z0-9]/g, '_')}`)
      
      if (activeFilters.length > 0) {
        filename += `_${activeFilters.join('_')}`
      }

      // Write file
      XLSX.writeFile(wb, `${filename}.xlsx`)
      
      console.log(`Successfully exported ${filteredBookings.length} bookings to Excel`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      // You could show a toast notification here if you have a toast system
    }
  }

  // Helper function to format dates for Excel export
  const formatDateForExport = (date: Date | string | number) => {
    const dateObj = parseDate(date)
    if (!dateObj) return "N/A"
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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

      const response = await fetch(promoterEndPointPannel.CANCEL_EVENT_TICKET, {
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

      const response = await fetch(promoterEndPointPannel.RESEND_EVENT_TICKET, {
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
          </h1>        </div>        <div className="w-full max-w-full overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 sm:px-6">
              {/* Mobile layout */}
              {isMobile ? <MobileTabs /> : <DesktopTabs />}
            </div>            {/* Filters Section - Desktop Only */}
            {!isMobile && (
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

                    {(role as UserRole) !== "promoter" && (
                      <Select value={channelFilter} onValueChange={setChannelFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by Channel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Channels</SelectItem>
                          <SelectItem value="Online">Online</SelectItem>
                          <SelectItem value="Promoter">Promoter</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="outline" onClick={resetAllFilters}>
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Mobile Search Bar */}
            {isMobile && (
              <div className="px-4 sm:px-6 mt-4">
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            <div className="px-4 sm:px-6">
              <TabsContent value={activeTab} className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {activeTab === "all"
                        ? `All Bookings (${filteredBookings.length})`
                        : activeTab === "my-bookings"
                          ? `My Bookings (${filteredBookings.length})`
                          : activeTab === "promoter"
                            ? `Promoter (${filteredBookings.length})`
                            : `Online (${filteredBookings.length})`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-hidden">
                  {/* Mobile Card View */}
                                 {/* Desktop Table View */}
                  <div className="w-full">
                    {filteredBookings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                        <AlertCircle className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No data found</p>
                      </div>
                    ) : (
                      <BookingsTable 
                        bookings={currentBookings}
                        role={role as UserRole}
                        searchTerm={searchTerm}
                        statusFilter={statusFilter}
                        channelFilter={channelFilter}
                        formatDate={formatDate}
                        formatDateTime={formatDateTime}
                        formatCurrency={formatCurrency}
                        getStatusBadgeVariant={getStatusBadgeVariant}
                        onCancelBooking={handleCancelBooking}
                        onResendTicket={handleResendTicket}
                      />
                    )}
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
            </div>
          </Tabs>        </div>        {/* Mobile Filter Sheet */}
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetContent side="bottom" className="h-[85vh] flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Bookings
              </SheetTitle>
              <SheetDescription>
                Apply filters to narrow down your booking results
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-6 py-6">
                {/* Quick search in mobile filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search by customer, booking ID, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>



                {/* Channel Filter */}
                {(role as UserRole) !== "promoter" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Booking Channel</label>
                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Filter by Channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Channels</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Promoter">Promoter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* City Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {getUniqueCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Venue Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Venue</label>
                  <Select value={venueFilter} onValueChange={setVenueFilter}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select Venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Venues</SelectItem>
                      {getUniqueVenues.map((venue) => (
                        <SelectItem key={venue} value={venue}>
                          {venue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Event Name Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Name</label>
                  <Select value={eventNameFilter} onValueChange={setEventNameFilter}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select Event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      {getUniqueEventNames.map((eventName) => (
                        <SelectItem key={eventName} value={eventName}>
                          {eventName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Promoter Filter - For Organizer Role */}
                {(role as UserRole) === "organizer" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Promoters</label>
                    <Select value={promoterFilter} onValueChange={setPromoterFilter}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select Promoter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Promoters</SelectItem>
                        {getUniquePromoters.map((promoter) => (
                          <SelectItem key={promoter} value={promoter}>
                            {promoter}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Organizer and Promoter Filters - For SuperAdmin */}
                {(role as UserRole) === "superadmin" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Organizers</label>
                      <Select value={organizerFilter} onValueChange={setOrganizerFilter}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select Organizer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Organizers</SelectItem>
                          {getUniqueOrganizers.map((organizer) => (
                            <SelectItem key={organizer} value={organizer}>
                              {organizer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Promoters</label>
                      <Select value={promoterFilter} onValueChange={setPromoterFilter}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select Promoter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Promoters</SelectItem>
                          {getUniquePromoters.map((promoter) => (
                            <SelectItem key={promoter} value={promoter}>
                              {promoter}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Active Filters Display */}
                {(statusFilter !== "all" || channelFilter !== "all" || cityFilter !== "all" || 
                  venueFilter !== "all" || eventNameFilter !== "all" || organizerFilter !== "all" || promoterFilter !== "all") && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Active Filters</label>
                    <div className="flex flex-wrap gap-2">
                      {statusFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Status: {statusFilter}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => setStatusFilter("all")}
                          />
                        </Badge>
                      )}
                      {channelFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Channel: {channelFilter}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => setChannelFilter("all")}
                          />
                        </Badge>
                      )}
                      {cityFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          City: {cityFilter}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => setCityFilter("all")}
                          />
                        </Badge>
                      )}
                      {venueFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Venue: {venueFilter}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => setVenueFilter("all")}
                          />
                        </Badge>
                      )}
                      {eventNameFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Event: {eventNameFilter}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => setEventNameFilter("all")}
                          />
                        </Badge>
                      )}
                      {organizerFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Organizer: {organizerFilter}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => setOrganizerFilter("all")}
                          />
                        </Badge>
                      )}
                      {promoterFilter !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Promoter: {promoterFilter}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => setPromoterFilter("all")}
                          />
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer Actions */}
            <div className="flex gap-3 pt-4 border-t bg-background">
              <Button
                variant="outline"
                onClick={resetAllFilters}
                className="flex-1 h-12"
              >
                <X className="mr-2 h-4 w-4" />
                Reset All
              </Button>
              <Button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 h-12"
              >
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>

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