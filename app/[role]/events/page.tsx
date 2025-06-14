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
  Star,
  Phone,
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
  const [searchLoading, setSearchLoading] = React.useState(false)
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
  
  // Date filter state
  const [startDate, setStartDate] = React.useState<string | null>(null)
  const [endDate, setEndDate] = React.useState<string | null>(null)
  const [isManual, setIsManual] = React.useState(false)
  const [dateFilterOption, setDateFilterOption] = React.useState("")

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
      // Handle the new API response structure
      const normalizedEvent = {
        // Core identifiers
        _id: event._id || event.id || event.EventId || event.event_id || `event_${index}`,
        
        // Event basic info from new API structure
        eventName: event.EventName || event.eventName || event.Name || event.name || event.title || "Untitled Event",
        eventDescription: event.EventDescription || event.eventDescription || event.Description || event.description || "No description available",
        eventType: event.EventType === 1 ? "Single-Day" : "Multi-Day",
        
        // Dates from arrangedEventDateTime array
        eventStartDate: event.arrangedEventDateTime?.[0]?.EventStartDateTime || event.eventStartDate || event.EventStartDate,
        eventEndDate: event.arrangedEventDateTime?.[0]?.EventEndDateTime || event.eventEndDate || event.EventEndDate,
        createdAt: event.createdAt || event.CreatedAt || event.created_at || new Date().toISOString(),
        updatedAt: event.updatedAt || event.UpdatedAt || event.updated_at || new Date().toISOString(),
        
        // Location info from new API structure
        city: event.VenueCity || event.city || event.City || event.location || event.Location || "Unknown City",
        venueName: event.VenueName || event.venueName || event.Venue || event.venue || "Unknown Venue",
        venueId: event.venue_id || event.venueId || event.VenueId,
        
        // Organizer info from PopUpOrganizerData
        organizerId: event.PopUpOrganizerData?.[0]?.organizer_id || event.organizerId || event.OrganizerId,
        organizerName: event.PopUpOrganizerData?.[0]?.OrganizerName || event.organizerName || event.OrganizerName || "Unknown Organizer",
        
        // Promoter info from PopUpPromoterData
        promoterId: event.PopUpPromoterData?.[0]?.promoter_id || event.promoterId,
        promoterName: event.PopUpPromoterData?.[0]?.PromoterName || event.promoterName,
        
        // Category info
        categoryName: event.categoryName || "Unknown Category",
        
        // Status (with normalization)
        eventStatus: normalizeEventStatus(event.EventStatus || event.eventStatus || event.Status || event.status || 3),
        
        // Event flags and settings
        featuredEvent: event.FeaturedEventFlag === 1,
        eventVisibility: event.EventVisibility === 1,
        venueEventFlag: event.VenueEventFlag === 1,
        onlineEventFlag: event.OnlineEventFlag === 1,
        onlineEventLink: event.Online_Event_Link,
        venueToBeAnnounced: event.VenueToBeAnnounced === 1,
        
        // Additional info
        bestSuitedFor: event.BestSuitedFor,
        eventLanguages: event.EventLanguages || [],
        eventTermsCondition: event.EventTermsCondition,
        eventFAQs: event.EventFAQs || [],
        bookingPhoneNumber: event.BookingPhoneNumber,
        convenienceFeeUnit: event.ConvinienceFeeUnit,
        convenienceFeeValue: event.ConvinienceFeeValue,
          // Images
        eventImage: event.EventCarouselImages?.[0]?.image_path 
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/${event.EventCarouselImages[0].image_path}` 
          : "/placeholder.svg",
        carouselImages: event.EventCarouselImages || [],
        galleryImages: event.EventGalleryImages || [],
        
        // Arrays for related entities
        eventOrganizers: event.EventOrganizers || [],
        eventCategories: event.EventCategories || [],
        eventArtists: event.EventArtist || [],
        eventGenres: event.EventGenre || [],
        eventPromoters: event.EventPromoter || [],
        
        // Season pass info
        seasonPassCount: event.SeasonPassCount || 0,
          // For promoter-specific data (placeholder values for now)
        commissionRate: 15, // Default commission rate
        ticketsSold: 0, // This would come from booking reports
        totalRevenue: 0, // This would come from booking reports
        myCommission: 0, // This would be calculated from bookings
        promoterLink: `/book/${event._id}?promoter=${event.PopUpPromoterData?.[0]?.promoter_id || ''}`,
        
        // Keep original event data
        ...event
      }
      
      if (index === 0) {
        console.log("🔄 NORMALIZED EVENT SAMPLE:")
        console.log("- Original keys:", Object.keys(event))
        console.log("- Normalized keys:", Object.keys(normalizedEvent))
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
    }, 1000)

    return () => clearTimeout(delay)
  }, [searchTerm])

  React.useEffect(() => {
    if (debouncedSearchTerm === "") {
      setAllEventsData(originalData)
      return
    }

    // For promoter role, make API call with search keyword
    if (role === "promoter" && debouncedSearchTerm.length >= 3) {
      searchEventsWithKeyword(debouncedSearchTerm)
    } else {
      // For other roles, filter locally
      const filtered = originalData.filter((event) =>
        event.eventName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
      )
      setAllEventsData(filtered)
    }
  }, [debouncedSearchTerm, originalData, role])
  // Search events with API call for promoters
  const searchEventsWithKeyword = async (keyword: string) => {
    try {
      setSearchLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      const payload = {
        AdminRole: 4, // Promoter role ID
        user_id: user.user_id,
        eventNameSearchKeyword: keyword,
      }

      const response = await fetch(promoterEndPointPannel.GET_ALL_EVENTS_DATA_BY_PROMOTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        const eventsArray = data.data || []
        const normalizedEvents = normalizeEventsData(eventsArray)
        setAllEventsData(normalizedEvents)
      } else {
        setAllEventsData([])
      }
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Error",
        description: "Failed to search events",
        variant: "destructive",
      })
    } finally {
      setSearchLoading(false)
    }
  }

  // Date filter functionality
  const handleDateSelection = (option: string) => {
    setDateFilterOption(option)
    setIsManual(option === "Manual")

    if (option !== "Manual") {
      const currentDate = new Date()
      let start: Date | null = null
      let end: Date | null = null

      switch (option) {
        case "Today":
          start = new Date(currentDate.setHours(0, 1, 1, 0))
          end = new Date(currentDate.setHours(23, 59, 59, 999))
          break
        case "Yesterday":
          start = new Date(currentDate.setDate(currentDate.getDate() - 1))
          start.setHours(0, 1, 1, 0)
          end = new Date(start)
          end.setHours(23, 59, 59, 999)
          break
        case "Last 7 Days":
          start = new Date(currentDate.setDate(currentDate.getDate() - 7))
          start.setHours(0, 1, 1, 0)
          end = new Date()
          end.setHours(23, 59, 59, 999)
          break
        case "Last 1 Month":
          start = new Date(currentDate.setMonth(currentDate.getMonth() - 1))
          start.setHours(0, 1, 1, 0)
          end = new Date()
          end.setHours(23, 59, 59, 999)
          break
        default:
          start = null
          end = null
      }

      if (start && end) {
        setStartDate(start.toISOString())
        setEndDate(end.toISOString())
        dateFilterApiCall(start.toISOString(), end.toISOString())
      }
    }
  }

  const handleManualDateChange = (value: string, type: "start" | "end") => {
    if (type === "start") {
      setStartDate(value)
    } else {
      setEndDate(value)
    }
  }

  const handleManualSubmit = () => {
    if (startDate && endDate) {
      dateFilterApiCall(startDate, endDate)
    }
  }

  const dateFilterApiCall = async (startDateApiCall: string, endDateApiCall: string) => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken) return

      const payload = {
        AdminRole: 4, // Promoter role ID
        user_id: user.user_id,
        startDate: startDateApiCall,
        endDate: endDateApiCall,
      }

      const response = await fetch(promoterEndPointPannel.GET_ALL_EVENTS_DATA_BY_PROMOTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        const eventsArray = data.data || []
        const normalizedEvents = normalizeEventsData(eventsArray)
        setAllEventsData(normalizedEvents)
        toast({
          title: "Success",
          description: data.message || "Events filtered successfully",
        })
      } else {
        setAllEventsData([])
        toast({
          title: "No Data",
          description: "No events found for the selected date range",
        })
      }
    } catch (error) {
      console.error("Date filter error:", error)
      setAllEventsData([])
      toast({
        title: "Error",
        description: "Failed to filter events by date",
        variant: "destructive",
      })
    }
  }

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
    })  }

  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
  }

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const resetFilters = () => {
    setSearchTerm("")
    setDebouncedSearchTerm("")
    setStartDate(null)
    setEndDate(null)
    setIsManual(false)
    setDateFilterOption("")
    setAllEventsData(originalData)
    toast({
      title: "Filters Reset",
      description: "All filters have been cleared",
    })
  }

  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim()  }

  const handleCheckReport = (eventId: string) => {
    // Navigate to reports page to check bookings for this event
    window.open(`/${role}/events/${eventId}/report`, '_blank')
  }

  const handleBookTicket = (eventId: string, arrangedEventDateTime?: any[]) => {
    // Navigate to booking page for this event with event date time data
    window.open(`/${role}/events/${eventId}/booking-tickets`, '_blank')
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
      </div>      {/* Search Bar and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
              )}
              <Input
                placeholder="Search by event name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
                disabled={searchLoading}
              />
            </div>

            {(role as UserRole) === "promoter" && (
              <div className="flex gap-2 items-center">
                {/* Date Filter Dropdown */}
                <div className="relative">
                  <select
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={dateFilterOption}
                    onChange={(e) => handleDateSelection(e.target.value)}
                  >
                    <option value="">Select Date Filter</option>
                    <option value="Today">Today</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 1 Month">Last 1 Month</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                {/* Manual Date Selection */}
                {isManual && (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={startDate ? startDate.split('T')[0] : ''}
                      onChange={(e) => handleManualDateChange(e.target.value, "start")}
                      className="w-auto"
                    />
                    <Input
                      type="date"
                      value={endDate ? endDate.split('T')[0] : ''}
                      onChange={(e) => handleManualDateChange(e.target.value, "end")}
                      className="w-auto"
                    />                    <Button onClick={handleManualSubmit} size="sm">
                      Apply
                    </Button>
                  </div>
                )}

                {/* Reset Filters Button */}
                {(searchTerm || dateFilterOption) && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>
            )}

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
                currentEvents.map((event) => (                  <Card key={event._id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                      {event.featuredEvent && (
                        <div className="absolute top-4 left-4 bg-yellow-500 text-white px-2 py-1 rounded text-sm font-medium">
                          Featured
                        </div>
                      )}
                    </div>                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-1">{event.eventName}</CardTitle>
                      <CardDescription 
                        className="line-clamp-2 text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ 
                          __html: event.eventDescription.length > 100 
                            ? event.eventDescription.substring(0, 100) + '...' 
                            : event.eventDescription 
                        }}
                      />
                    </CardHeader>

                    <CardContent className="space-y-4">                      {/* Event Details */}
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
                          <span>Organizer: {event.organizerName}</span>
                        </div>

                        {event.categoryName && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {event.categoryName}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Best Suited For */}
                      {event.bestSuitedFor && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Best suited for age: {event.bestSuitedFor}+
                          </div>
                        </div>
                      )}

                      {/* Contact Info */}
                      {event.bookingPhoneNumber && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                          <div className="text-sm">
                            <span className="font-medium">Booking Phone: </span>
                            <span className="text-blue-600">{event.bookingPhoneNumber}</span>
                          </div>
                        </div>
                      )}                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1" 
                          onClick={() => handleCheckReport(event._id)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Check Report
                        </Button>                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleBookTicket(event._id, event.arrangedEventDateTime)}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Book Ticket
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
                <Table>                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead className="hidden md:table-cell">Start Date</TableHead>
                      <TableHead className="hidden lg:table-cell">Organizer</TableHead>
                      <TableHead className="hidden lg:table-cell">Venue</TableHead>
                      <TableHead className="hidden lg:table-cell">City</TableHead>
                      {(role as UserRole) === "promoter" && (
                        <>
                          <TableHead className="hidden xl:table-cell">Category</TableHead>
                          <TableHead className="hidden xl:table-cell">Phone</TableHead>
                        </>
                      )}
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEvents.length === 0 ? (                      <TableRow>
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
                    ) : (                      currentEvents.map((event) => (
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
                              <TableCell className="hidden xl:table-cell">
                                <Badge variant="outline">{event.categoryName || "N/A"}</Badge>
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                {event.bookingPhoneNumber || "N/A"}
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
                              </DropdownMenuTrigger>                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                {(role as UserRole) === "promoter" ? (
                                  <>                                    <DropdownMenuItem 
                                      onClick={() => handleCheckReport(event._id)}
                                    >
                                      <BarChart3 className="mr-2 h-4 w-4" />
                                      Check Report
                                    </DropdownMenuItem>                                    <DropdownMenuItem 
                                      onClick={() => handleBookTicket(event._id, event.arrangedEventDateTime)}
                                    >
                                      <DollarSign className="mr-2 h-4 w-4" />
                                      Book Ticket
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => copyPromoterLink(event.promoterLink)}>
                                      <Share2 className="mr-2 h-4 w-4" />
                                      Copy Promoter Link
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
