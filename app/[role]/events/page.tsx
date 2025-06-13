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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MoreHorizontal,
  PlusCircle,
  Download,
  Loader2,
  Search,
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  Share2,
  Eye,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { eventEndPoint, promoterEndPointPannel } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { mockEvents } from "@/lib/mock-data"
import { getNumericAdminRole, getStringEventStatus } from "@/lib/api-constants"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getValidToken } from "@/lib/token-utils"

interface EventsPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

const ITEMS_PER_PAGE = 9 // Changed to 9 for better card grid layout

// Mock promoter-specific events with additional data
const mockPromoterEvents = [
  {
    _id: "evt001",
    eventName: "Summer Music Festival",
    eventDescription: "A three-day music festival featuring top artists from around the world",
    eventStatus: "Published",
    eventType: "Multi-Day",
    organizerId: "org001",
    organizerName: "MusicFest Inc.",
    venueId: "ven001",
    venueName: "Central Park",
    city: "New York",
    eventStartDate: "2025-07-15T10:00:00.000Z",
    eventEndDate: "2025-07-17T22:00:00.000Z",
    createdAt: "2025-01-15T08:30:00.000Z",
    updatedAt: "2025-01-20T14:45:00.000Z",
    // Promoter-specific data
    commissionRate: 15,
    ticketsSold: 1250,
    totalRevenue: 187500,
    myCommission: 28125,
    promoterLink: "https://eventingclub.com/promo/summer-music-fest?ref=PROMO123",
    eventImage: "/placeholder.svg?height=200&width=300&text=Summer+Music+Festival",
    ticketPrice: 150,
    availableTickets: 2750,
    totalTickets: 4000,
  },
  {
    _id: "evt002",
    eventName: "Tech Conference 2025",
    eventDescription: "Annual technology conference with industry leaders and innovative workshops",
    eventStatus: "Published",
    eventType: "Single-Day",
    organizerId: "org002",
    organizerName: "TechMinds LLC",
    venueId: "ven002",
    venueName: "Convention Center",
    city: "San Francisco",
    eventStartDate: "2025-09-10T09:00:00.000Z",
    eventEndDate: "2025-09-10T18:00:00.000Z",
    createdAt: "2025-02-05T10:15:00.000Z",
    updatedAt: "2025-02-10T16:30:00.000Z",
    // Promoter-specific data
    commissionRate: 12,
    ticketsSold: 85,
    totalRevenue: 25415,
    myCommission: 3049.8,
    promoterLink: "https://eventingclub.com/promo/tech-conf-2025?ref=PROMO123",
    eventImage: "/placeholder.svg?height=200&width=300&text=Tech+Conference",
    ticketPrice: 299,
    availableTickets: 415,
    totalTickets: 500,
  },
  {
    _id: "evt003",
    eventName: "Food & Wine Fair",
    eventDescription: "Culinary event featuring top chefs and premium wineries from around the region",
    eventStatus: "Published",
    eventType: "Multi-Day",
    organizerId: "org005",
    organizerName: "Gourmet Events",
    venueId: "ven005",
    venueName: "Exhibition Hall",
    city: "Miami",
    eventStartDate: "2025-11-20T12:00:00.000Z",
    eventEndDate: "2025-11-22T22:00:00.000Z",
    createdAt: "2025-05-15T11:25:00.000Z",
    updatedAt: "2025-05-20T16:40:00.000Z",
    // Promoter-specific data
    commissionRate: 18,
    ticketsSold: 320,
    totalRevenue: 24000,
    myCommission: 4320,
    promoterLink: "https://eventingclub.com/promo/food-wine-fair?ref=PROMO123",
    eventImage: "/placeholder.svg?height=200&width=300&text=Food+Wine+Fair",
    ticketPrice: 75,
    availableTickets: 680,
    totalTickets: 1000,
  },
  {
    _id: "evt004",
    eventName: "Art Gallery Opening",
    eventDescription: "Exclusive opening of contemporary art exhibition featuring emerging artists",
    eventStatus: "Published",
    eventType: "Single-Day",
    organizerId: "org003",
    organizerName: "ArtWorld Org",
    venueId: "ven003",
    venueName: "City Gallery",
    city: "Los Angeles",
    eventStartDate: "2025-08-01T18:00:00.000Z",
    eventEndDate: "2025-08-01T23:00:00.000Z",
    createdAt: "2025-03-12T09:45:00.000Z",
    updatedAt: "2025-03-15T11:20:00.000Z",
    // Promoter-specific data
    commissionRate: 20,
    ticketsSold: 45,
    totalRevenue: 2250,
    myCommission: 450,
    promoterLink: "https://eventingclub.com/promo/art-gallery-opening?ref=PROMO123",
    eventImage: "/placeholder.svg?height=200&width=300&text=Art+Gallery",
    ticketPrice: 50,
    availableTickets: 155,
    totalTickets: 200,
  },
  {
    _id: "evt005",
    eventName: "Business Networking Summit",
    eventDescription: "Connect with industry leaders and expand your professional network",
    eventStatus: "Published",
    eventType: "Single-Day",
    organizerId: "org006",
    organizerName: "Business Connect",
    venueId: "ven006",
    venueName: "Business Center",
    city: "Chicago",
    eventStartDate: "2025-10-15T08:00:00.000Z",
    eventEndDate: "2025-10-15T17:00:00.000Z",
    createdAt: "2025-04-10T10:30:00.000Z",
    updatedAt: "2025-04-15T14:20:00.000Z",
    // Promoter-specific data
    commissionRate: 10,
    ticketsSold: 120,
    totalRevenue: 12000,
    myCommission: 1200,
    promoterLink: "https://eventingclub.com/promo/business-summit?ref=PROMO123",
    eventImage: "/placeholder.svg?height=200&width=300&text=Business+Summit",
    ticketPrice: 100,
    availableTickets: 180,
    totalTickets: 300,
  },
  {
    _id: "evt006",
    eventName: "Charity Gala Night",
    eventDescription: "Elegant charity event supporting local community initiatives",
    eventStatus: "Published",
    eventType: "Single-Day",
    organizerId: "org007",
    organizerName: "Hope Foundation",
    venueId: "ven007",
    venueName: "Grand Ballroom",
    city: "Boston",
    eventStartDate: "2025-12-05T19:00:00.000Z",
    eventEndDate: "2025-12-05T23:30:00.000Z",
    createdAt: "2025-06-01T12:00:00.000Z",
    updatedAt: "2025-06-05T16:45:00.000Z",
    // Promoter-specific data
    commissionRate: 8,
    ticketsSold: 75,
    totalRevenue: 18750,
    myCommission: 1500,
    promoterLink: "https://eventingclub.com/promo/charity-gala?ref=PROMO123",
    eventImage: "/placeholder.svg?height=200&width=300&text=Charity+Gala",
    ticketPrice: 250,
    availableTickets: 125,
    totalTickets: 200,
  },
]

export default function EventsPage({ params }: EventsPageProps) {
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
  const [allEventsData, setAllEventsData] = React.useState<any[]>([])
  const [originalData, setOriginalData] = React.useState<any[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [activeTab, setActiveTab] = React.useState("all")
  const [useMockData, setUseMockData] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards")

  // Search state
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")

  // Filter state
  const [openFilterDialog, setOpenFilterDialog] = React.useState(false)
  const [selectedCity, setSelectedCity] = React.useState("")

  // Helper function to normalize event status for display
  const normalizeEventStatus = (status: number | string): string => {
    if (typeof status === "number") {
      return getStringEventStatus(status)
    }
    return status
  }

  // Helper function to normalize events data
  const normalizeEventsData = (events: any[]): any[] => {
    console.log("🔍 NORMALIZING EVENTS DATA:")
    console.log("- Input events count:", events.length)
    if (events.length > 0) {
      console.log("- First event keys:", Object.keys(events[0]))
      console.log("- First event sample:", JSON.stringify(events[0], null, 2))
    }
    
    return events.map((event, index) => {
      // Create a comprehensive mapping from API field names to frontend field names
      const normalizedEvent = {
        // Core identifiers
        _id: event._id || event.id || event.EventId || event.event_id || `event_${index}`,
        
        // Event basic info
        eventName: event.eventName || event.EventName || event.Name || event.name || event.title || "Untitled Event",
        eventDescription: event.eventDescription || event.EventDescription || event.Description || event.description || "No description available",
        eventType: event.eventType || event.EventType || event.Type || event.type || "Single-Day",
        
        // Dates
        eventStartDate: event.eventStartDate || event.EventStartDate || event.StartDate || event.start_date || event.startDate,
        eventEndDate: event.eventEndDate || event.EventEndDate || event.EndDate || event.end_date || event.endDate,
        createdAt: event.createdAt || event.CreatedAt || event.created_at || new Date().toISOString(),
        updatedAt: event.updatedAt || event.UpdatedAt || event.updated_at || new Date().toISOString(),
        
        // Location info
        city: event.city || event.City || event.location || event.Location || "Unknown City",
        venueName: event.venueName || event.VenueName || event.Venue || event.venue || "Unknown Venue",
        venueId: event.venueId || event.VenueId || event.venue_id,
        
        // Organizer info
        organizerId: event.organizerId || event.OrganizerId || event.organizer_id,
        organizerName: event.organizerName || event.OrganizerName || event.Organizer || event.organizer || "Unknown Organizer",
        
        // Status (with normalization)
        eventStatus: normalizeEventStatus(event.eventStatus || event.EventStatus || event.Status || event.status || "Draft"),
        
        // Promoter-specific fields (for promoter role)
        commissionRate: event.commissionRate || event.CommissionRate || event.commission_rate || 0,
        ticketsSold: event.ticketsSold || event.TicketsSold || event.tickets_sold || 0,
        totalRevenue: event.totalRevenue || event.TotalRevenue || event.total_revenue || 0,
        myCommission: event.myCommission || event.MyCommission || event.my_commission || event.earnings || 0,
        promoterLink: event.promoterLink || event.PromoterLink || event.promoter_link || "#",
        
        // Ticket info
        ticketPrice: event.ticketPrice || event.TicketPrice || event.Price || event.price || 0,
        availableTickets: event.availableTickets || event.AvailableTickets || event.available_tickets || 0,
        totalTickets: event.totalTickets || event.TotalTickets || event.total_tickets || 0,
        
        // Images
        eventImage: event.eventImage || event.EventImage || event.Image || event.image || "/placeholder.svg",
        
        // Keep any additional fields as-is
        ...event
      }
      
      if (index === 0) {
        console.log("🔄 NORMALIZED EVENT SAMPLE:")
        console.log("- Original keys:", Object.keys(event))
        console.log("- Normalized keys:", Object.keys(normalizedEvent))
        console.log("- Key mappings:")
        console.log("  - eventName:", event.eventName || event.EventName || event.Name || "❌ MISSING")
        console.log("  - eventStartDate:", event.eventStartDate || event.EventStartDate || event.StartDate || "❌ MISSING")
        console.log("  - organizerName:", event.organizerName || event.OrganizerName || event.Organizer || "❌ MISSING")
        console.log("  - venueName:", event.venueName || event.VenueName || event.Venue || "❌ MISSING")
        console.log("  - city:", event.city || event.City || event.location || "❌ MISSING")
        console.log("  - eventStatus:", event.eventStatus || event.EventStatus || event.Status || "❌ MISSING")
      }
      
      return normalizedEvent
    })
  }

  // Fetch all events data with improved error handling
  const getAllEventData = async () => {
    try {
      setLoading(true)
      setApiError(null)

      // Check if we have a user and auth token
      const authToken = getValidToken()
      const storedUser = localStorage.getItem("authUser")

      console.log("Debug localStorage:")
      console.log("- authToken:", authToken ? "present" : "missing")
      console.log("- authUser:", storedUser ? "present" : "missing")
      console.log("- current user object:", user)
      console.log("- user.user_id specifically:", user?.user_id)
      console.log("- typeof user.user_id:", typeof user?.user_id)

      if (!user || !authToken) {
        console.error("No user or valid auth token available")
        setApiError("Authentication required. Please log in to view events.")
        setLoading(false)
        return
      }

      // Determine the correct API endpoint and payload based on role
      let apiEndpoint
      let requestPayload
      
 
      console.log("📊 ===== EVENTS API CALL DEBUG =====")
      console.log("🔍 DETAILED Role detection debug:")
      console.log("- role variable:", role)
      console.log("- role type:", typeof role)
      console.log("- JSON.stringify(role):", JSON.stringify(role))
      console.log("- role === 'promoter':", role === "promoter")
      console.log("- (role as UserRole) === 'promoter':", (role as UserRole) === "promoter")
      console.log("- user object:", user)
      console.log("- user.AdminRole:", user?.AdminRole)
      console.log("- user.role:", (user as any)?.role)
      console.log("- localStorage authUser:", localStorage.getItem("authUser"))
      console.log("🎯 USER_ID BEING USED:", user.user_id)
      console.log("=====================================")
      
      // Check if role is actually "promoter"
      const isPromoter = role === "promoter" || (role as string) === "promoter"
      console.log("- isPromoter calculation:", isPromoter)
      
      if (isPromoter) {
        console.log("🎯 DEFINITELY Using PROMOTER endpoint")
        apiEndpoint = promoterEndPointPannel.GET_ALL_EVENTS_DATA_BY_PROMOTER
        requestPayload = {
          AdminRole: 4, // Promoter role ID
          user_id: user.user_id,
        }
        console.log("Promoter endpoint URL:", apiEndpoint)
        console.log("Promoter payload JSON:", JSON.stringify(requestPayload))
      } else {
        console.log("🎯 DEFINITELY Using ADMIN PAGINATED endpoint")
        // Use the paginated endpoint for admin roles with the correct payload structure
        const numericRole = getNumericAdminRole(user.AdminRole || (role as UserRole))
        apiEndpoint = eventEndPoint.GET_ALL_EVENTS_PAGINATED
        requestPayload = {
          AdminRole: numericRole,
          user_id: user.user_id,
          page: "1",
          limit: "100", // Get more events for better UX
        }
        console.log("Admin paginated endpoint URL:", apiEndpoint)
        console.log("Admin paginated payload JSON:", JSON.stringify(requestPayload))
        console.log("🔍 CRITICAL: Final user_id in payload:", requestPayload.user_id)
        console.log("🔍 CRITICAL: Expected user_id should be:", "99095128-0c68-4aad-adf4-089b47502925")
        console.log("🔍 CRITICAL: User ID matches expected?:", requestPayload.user_id === "99095128-0c68-4aad-adf4-089b47502925")
      }

      console.log("Fetching events for role:", role)
      console.log("Using endpoint:", apiEndpoint)
      console.log("Request payload:", requestPayload)

      try {
        console.log("Making API request to:", apiEndpoint)
        console.log("Auth token available:", !!authToken)
        console.log("User ID:", user.user_id)

        // Make the API call
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(requestPayload),
        })

        console.log("Response status:", response.status)
        console.log("Response ok:", response.ok)

        if (!response.ok) {
          // Try to get error details from response
          let errorText = ""
          let errorData = null
          try {
            errorText = await response.text()
            console.error("Error response:", errorText)
            
            // Try to parse as JSON to get structured error
            try {
              errorData = JSON.parse(errorText)
            } catch (e) {
              // Not JSON, use as plain text
            }
          } catch (e) {
            console.error("Could not read error response")
          }

          // Handle 404 "not found" responses as empty data rather than errors
          if (response.status === 404 && errorData && 
              (errorData.message?.toLowerCase().includes('not found') || 
               errorData.message?.toLowerCase().includes('no data'))) {
            console.log("API returned 404 - no events found, treating as empty dataset")
            setAllEventsData([])
            setOriginalData([])
            setUseMockData(false)
            setApiError(null)
            setLoading(false)
            return
          }

          // For any other API errors, also treat as no data available
          console.log("API error - treating as no data available")
          setAllEventsData([])
          setOriginalData([])
          setUseMockData(false)
          setApiError(null)
          setLoading(false)
          return
        }

        const responseText = await response.text()
        console.log("Response received, length:", responseText.length)
        console.log("Raw response (first 500 chars):", responseText.substring(0, 500))
        
        const data = JSON.parse(responseText)
        console.log("Parsed data structure:", {
          hasData: !!data.data,
          isArray: Array.isArray(data.data),
          dataLength: data.data ? data.data.length : 0,
          hasEvents: !!data.events,
          eventsIsArray: Array.isArray(data.events),
          eventsLength: data.events ? data.events.length : 0,
          topLevelKeys: Object.keys(data)
        })

        // Handle different response structures for paginated vs non-paginated endpoints
        let eventsArray = null
        if (data && data.data && data.data.EventsData && Array.isArray(data.data.EventsData)) {
          // Paginated endpoint response structure
          eventsArray = data.data.EventsData
        } else if (data && data.data && Array.isArray(data.data)) {
          // Standard response structure
          eventsArray = data.data
        } else if (data && data.events && Array.isArray(data.events)) {
          // Alternative response structure
          eventsArray = data.events
        } else if (Array.isArray(data)) {
          // Direct array response
          eventsArray = data
        }

        console.log("Detected response structure:", {
          hasDataProperty: !!data.data,
          hasEventsDataProperty: data.data && !!data.data.EventsData,
          eventsDataLength: data.data && data.data.EventsData ? data.data.EventsData.length : 0,
          totalEvents: data.data ? data.data.totalEvents : 'unknown',
          totalPages: data.data ? data.data.totalPages : 'unknown'
        })

        if (eventsArray) {
          console.log("🔍 EVENTS ARRAY ANALYSIS:")
          console.log("- Events found:", eventsArray.length)
          if (eventsArray.length > 0) {
            console.log("- First event object:", JSON.stringify(eventsArray[0], null, 2))
            console.log("- Available field names in API response:", Object.keys(eventsArray[0]))
            
            // Check for common field patterns
            const firstEvent = eventsArray[0]
            console.log("- Field existence check:")
            console.log("  ✓ eventName variants:", firstEvent.eventName || firstEvent.EventName || firstEvent.Name || firstEvent.name)
            console.log("  ✓ organizerName variants:", firstEvent.organizerName || firstEvent.OrganizerName || firstEvent.Organizer || firstEvent.organizer)
            console.log("  ✓ venueName variants:", firstEvent.venueName || firstEvent.VenueName || firstEvent.Venue || firstEvent.venue)
            console.log("  ✓ city variants:", firstEvent.city || firstEvent.City || firstEvent.location || firstEvent.Location)
            console.log("  ✓ eventStatus variants:", firstEvent.eventStatus || firstEvent.EventStatus || firstEvent.Status || firstEvent.status)
            console.log("  ✓ startDate variants:", firstEvent.eventStartDate || firstEvent.EventStartDate || firstEvent.StartDate || firstEvent.start_date)
          }
          
          const normalizedEvents = normalizeEventsData(eventsArray)
          console.log("🎯 NORMALIZATION COMPLETE:")
          console.log("- Normalized events count:", normalizedEvents.length)
          if (normalizedEvents.length > 0) {
            console.log("- First normalized event:", {
              eventName: normalizedEvents[0].eventName,
              organizerName: normalizedEvents[0].organizerName,
              venueName: normalizedEvents[0].venueName,
              city: normalizedEvents[0].city,
              eventStatus: normalizedEvents[0].eventStatus,
              eventStartDate: normalizedEvents[0].eventStartDate
            })
          }
          
          setAllEventsData(normalizedEvents)
          setOriginalData(normalizedEvents)
          setUseMockData(false)
          setApiError(null)
          console.log("✅ Successfully loaded", normalizedEvents.length, "events from API")
        } else {
          console.log("Unexpected response structure:", data)
          throw new Error("Unexpected response format from server - no events array found")
        }
      } catch (apiError) {
        console.error("API request failed:", apiError)
        
        // Treat all API errors as no data available
        setAllEventsData([])
        setOriginalData([])
        setUseMockData(false)
        setApiError(null)
      }
    } catch (error) {
      console.error("Error in getAllEventData:", error)
      
      // Treat all errors as no data available
      setAllEventsData([])
      setOriginalData([])
      setUseMockData(false)
      setApiError(null)
    } finally {
      setLoading(false)
    }
  }

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 700)

    return () => clearTimeout(delay)
  }, [searchTerm])

  React.useEffect(() => {
    if (debouncedSearchTerm === "") {
      setAllEventsData(originalData)
      return
    }

    const filtered = originalData.filter((event) =>
      event.eventName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
    )
    setAllEventsData(filtered)
  }, [debouncedSearchTerm, originalData])

  // Initial data fetch
  React.useEffect(() => {
    getAllEventData()
  }, [])

  // Filter events based on tab
  const filteredEvents = React.useMemo(() => {
    if (activeTab === "all") return allEventsData

    return allEventsData.filter((event) => {
      const eventStatus = normalizeEventStatus(event.eventStatus)
      switch (activeTab) {
        case "published":
          return eventStatus === "Published"
        case "draft":
          return eventStatus === "Draft"
        case "review":
          return eventStatus === "To Be Reviewed"
        case "rejected":
          return eventStatus === "Rejected"
        default:
          return true
      }
    })
  }, [allEventsData, activeTab])

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)
  const currentEvents = filteredEvents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  const canAddEvent = (role as UserRole) === "superadmin" || (role as UserRole) === "organizer"

  const getStatusBadgeVariant = (status: string | number) => {
    const normalizedStatus = normalizeEventStatus(status)
    switch (normalizedStatus) {
      case "Published":
        return "default"
      case "Draft":
        return "secondary"
      case "To Be Reviewed":
        return "outline"
      case "Rejected":
        return "destructive"
      default:
        return "default"
    }
  }

  const copyPromoterLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast({
      title: "Success",
      description: "Promoter link copied to clipboard!",
    })
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
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Events Management</h1>
          {canAddEvent && (
            <Button disabled>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
            </Button>
          )}
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading events...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {(role as UserRole) === "promoter" ? "Available Events to Promote" : "Events Management"}
        </h1>
        <div className="flex items-center gap-2">
          {(role as UserRole) === "promoter" && (
            <div className="flex items-center gap-2 mr-4">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
            </div>
          )}
          {canAddEvent && (
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by event name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All ({allEventsData.length})</TabsTrigger>
          <TabsTrigger value="published">
            Published ({allEventsData.filter((e) => normalizeEventStatus(e.eventStatus) === "Published").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {(role as UserRole) === "promoter" && viewMode === "cards" ? (
            // Card View for Promoters
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentEvents.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="space-y-2">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No events data available</p>
                    <Button variant="outline" onClick={getAllEventData} disabled={loading}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              ) : (
                currentEvents.map((event) => (
                  <Card key={event._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={event.eventImage || "/placeholder.svg"}
                        alt={event.eventName}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        <Badge variant={getStatusBadgeVariant(event.eventStatus)}>
                          {normalizeEventStatus(event.eventStatus)}
                        </Badge>
                      </div>
                      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {formatCurrency(event.ticketPrice)}
                      </div>
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-1">{event.eventName}</CardTitle>
                      <CardDescription className="line-clamp-2">{event.eventDescription}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Event Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(event.eventStartDate)}</span>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>{formatTime(event.eventStartDate)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {event.venueName}, {event.city}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>
                            {event.availableTickets} / {event.totalTickets} tickets available
                          </span>
                        </div>
                      </div>

                      {/* Performance Stats */}
                      <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">{event.commissionRate}%</div>
                          <div className="text-xs text-muted-foreground">Commission</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">{event.ticketsSold}</div>
                          <div className="text-xs text-muted-foreground">Sold by You</div>
                        </div>
                      </div>

                      {/* Earnings */}
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Your Earnings</span>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-600">{formatCurrency(event.myCommission)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => copyPromoterLink(event.promoterLink)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button size="sm" variant="outline">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Stats
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            // Table View (for all roles or when table view is selected)
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "all"
                    ? "All Events"
                    : activeTab === "published"
                      ? "Published Events"
                      : activeTab === "draft"
                        ? "Draft Events"
                        : activeTab === "review"
                          ? "Events Under Review"
                          : "Rejected Events"}
                </CardTitle>
                <CardDescription>{filteredEvents.length} event(s) found</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead className="hidden md:table-cell">Start Date</TableHead>
                      <TableHead className="hidden lg:table-cell">Organizer</TableHead>
                      <TableHead className="hidden lg:table-cell">Venue</TableHead>
                      <TableHead className="hidden lg:table-cell">City</TableHead>
                      {(role as UserRole) === "promoter" && (
                        <>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead className="text-right">Earnings</TableHead>
                        </>
                      )}
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={(role as UserRole) === "promoter" ? 9 : 7} className="text-center py-8">
                          <div className="space-y-2">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                            <p className="text-muted-foreground">No events data available</p>
                            <Button variant="outline" onClick={getAllEventData} disabled={loading} size="sm">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refresh
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentEvents.map((event) => (
                        <TableRow key={event._id}>
                          <TableCell className="font-medium">{event.eventName}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {event.eventStartDate ? formatDate(event.eventStartDate) : "N/A"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{event.organizerName || "N/A"}</TableCell>
                          <TableCell className="hidden lg:table-cell">{event.venueName || "N/A"}</TableCell>
                          <TableCell className="hidden lg:table-cell">{event.city || "N/A"}</TableCell>
                          {(role as UserRole) === "promoter" && (
                            <>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{event.commissionRate}%</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrency(event.myCommission)}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(event.eventStatus)}>
                              {normalizeEventStatus(event.eventStatus)}
                            </Badge>
                          </TableCell>
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
                                {(role as UserRole) === "promoter" ? (
                                  <>
                                    <DropdownMenuItem onClick={() => copyPromoterLink(event.promoterLink)}>
                                      <Share2 className="mr-2 h-4 w-4" />
                                      Copy Promoter Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <BarChart3 className="mr-2 h-4 w-4" />
                                      View Statistics
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem>View & Edit</DropdownMenuItem>
                                    <DropdownMenuItem>Booking</DropdownMenuItem>
                                    {(canAddEvent) && (
                                      <DropdownMenuItem>View & Add Tickets</DropdownMenuItem>
                                    )}
                                    {(role as UserRole) === "superadmin" && (
                                      <DropdownMenuItem className="text-red-600">Disable</DropdownMenuItem>
                                    )}
                                  </>
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
