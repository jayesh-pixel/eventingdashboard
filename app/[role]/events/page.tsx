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
  IndianRupee,
  Share2,
  Eye,
  BarChart3,
  RefreshCw,
  Star,
  Phone,
  X,
  ArrowLeft,
  CheckCircle,
  Filter,
  Ticket,
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
import { getNumericAdminRole, getStringEventStatus, EventStatus } from "@/lib/api-constants"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getValidToken } from "@/lib/token-utils"
import PromoterEventCard from "@/components/create-event/promotereventcard"
import AddPromoterAndShow from "@/components/add-promoter-and-show"
import MultipleOrganizersDisplay from "@/components/multiple-organizers-display"
import PromoterIndicator from "@/components/promoter-indicator"
import PromoterPopup from "@/components/promoter-popup"
import OrganizerIndicator from "@/components/organizer-indicator"
import OrganizerPopup from "@/components/organizer-popup"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EventsPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

const ITEMS_PER_PAGE = 10 // Changed to 9 for better card grid layout

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
  const router = useRouter()
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
  const [selectedCity, setSelectedCity] = React.useState("__all__")
  const [selectedVenue, setSelectedVenue] = React.useState("__all__")
  const [selectedOrganizer, setSelectedOrganizer] = React.useState("__all__")
  const [selectedPromoter, setSelectedPromoter] = React.useState("__all__")
  
  // Date filter state
  const [startDate, setStartDate] = React.useState<string | null>(null)
  const [endDate, setEndDate] = React.useState<string | null>(null)
  const [isManual, setIsManual] = React.useState(false)
  const [dateFilterOption, setDateFilterOption] = React.useState("")
  // Event format modal state
  const [showEventFormatModal, setShowEventFormatModal] = React.useState(false)
  
  // Promoter popup state
  const [showPromoterPopup, setShowPromoterPopup] = React.useState(false)
  const [selectedPromoterData, setSelectedPromoterData] = React.useState<any>(null)
  const [selectedEventId, setSelectedEventId] = React.useState<string>("")

  // Organizer popup state
  const [showOrganizerPopup, setShowOrganizerPopup] = React.useState(false)
  const [selectedOrganizerData, setSelectedOrganizerData] = React.useState<any>(null)

  // Helper function to normalize event status for display
  const normalizeEventStatus = (status: number | string): string => {
    if (typeof status === "number") {
      return getStringEventStatus(status)
    }
    return status
  }

  // Helper function to check if event is disabled
  const isEventDisabled = (event: any): boolean => {
    return event.EventIsEnableOrDisable === 2
  }

  // Helper functions to get unique filter options
  const getUniqueCities = (): string[] => {
    const cities = originalData.map(event => event.city).filter(Boolean)
    return [...new Set(cities)].sort()
  }

  const getUniqueVenues = (): string[] => {
    const venues = originalData.map(event => event.venueName).filter(Boolean)
    return [...new Set(venues)].sort()
  }

  const getUniqueOrganizers = (): string[] => {
    const organizers = originalData.map(event => event.organizerName).filter(Boolean)
    return [...new Set(organizers)].sort()
  }

  const getUniquePromoters = (): string[] => {
    const promoters = originalData.map(event => event.promoterName).filter(Boolean)
    return [...new Set(promoters)].sort()
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
        
        // Organizer info from PopUpOrganizerData (handle multiple organizers)
        organizers: event.PopUpOrganizerData || event.EventOrganizers || [],
        organizerId: event.PopUpOrganizerData?.[0]?.organizer_id || event.organizerId || event.OrganizerId,
        organizerName: event.PopUpOrganizerData?.[0]?.OrganizerName || event.organizerName || event.OrganizerName || "Unknown Organizer",
        
        // Promoter info from PopUpPromoterData (handle multiple promoters)
        PopUpPromoterData: event.PopUpPromoterData || [],
        promoterData: event.PopUpPromoterData?.[0] || null,
        promoterId: event.PopUpPromoterData?.[0]?.promoter_id || event.promoterId,
        promoterName: event.PopUpPromoterData?.[0]?.PromoterName || event.promoterName,
        
        // Category info
        categoryName: event.categoryName || "Unknown Category",
        
        // Status (with normalization)
        eventStatus: normalizeEventStatus(event.EventStatus || event.eventStatus || event.Status || event.status || 3),
        
        // Event enable/disable status
        EventIsEnableOrDisable: event.EventIsEnableOrDisable || 1, // 1 = enabled, 2 = disabled
        
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
          limit: "10", // Get more events for better UX
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
        
        // For promoters, use API call. For others, use client-side filtering
        if ((role as UserRole) === "promoter") {
          dateFilterApiCall(start.toISOString(), end.toISOString())
        }
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
      // For promoters, use API call. For others, the filtering is handled in useMemo
      if ((role as UserRole) === "promoter") {
        dateFilterApiCall(startDate, endDate)
      } else {
        toast({
          title: "Success",
          description: "Date filter applied successfully",
        })
      }
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
  // Filter events based on tab and other filters
  const filteredEvents = React.useMemo(() => {
    let events = allEventsData

    // Apply tab filter
    if (activeTab !== "all") {
      events = events.filter((event) => {
        const eventStatus = normalizeEventStatus(event.eventStatus)
        switch (activeTab) {
          case "published":
            return eventStatus === "Published"
          case "draft":
            return eventStatus === "Draft"
          case "review":
            return eventStatus === "To Be Reviewed"
          case "self":
            return event.organizerId === user?.user_id || event.promoterId === user?.user_id
          case "rejected":
            return eventStatus === "Rejected"
          default:
            return true
        }
      })
    }

    // Apply city filter
    if (selectedCity && selectedCity !== "__all__") {
      events = events.filter(event => event.city === selectedCity)
    }

    // Apply venue filter
    if (selectedVenue && selectedVenue !== "__all__") {
      events = events.filter(event => event.venueName === selectedVenue)
    }

    // Apply organizer filter
    if (selectedOrganizer && selectedOrganizer !== "__all__") {
      events = events.filter(event => event.organizerName === selectedOrganizer)
    }

    // Apply promoter filter
    if (selectedPromoter && selectedPromoter !== "__all__") {
      events = events.filter(event => event.promoterName === selectedPromoter)
    }

    // Apply date range filter (for table view)
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      events = events.filter(event => {
        const eventDate = new Date(event.eventStartDate)
        return eventDate >= start && eventDate <= end
      })
    }

    // Sort events to show latest events first (by creation date or updated date)
    events = events.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0)
      const dateB = new Date(b.updatedAt || b.createdAt || 0)
      return dateB.getTime() - dateA.getTime() // Descending order (latest first)
    })

    return events
  }, [allEventsData, activeTab, user?.user_id, selectedCity, selectedVenue, selectedOrganizer, selectedPromoter, startDate, endDate])

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
  const handleCreateEvent = () => {
    setShowEventFormatModal(true)
  }
  const handleEventFormatSelection = (format: number) => {
    setShowEventFormatModal(false)
    // Navigate to create page with event type
    const eventType = format === 1 ? 'tour' : 'regular'
    router.push(`/${role}/events/create?type=${eventType}`)
  }
  // Handle enable/disable event status
  const handleToggleEventStatus = async (eventId: string, action: "enable" | "disable") => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        toast({
          title: "Error",
          description: "Authentication required. Please log in again.",
          variant: "destructive",
        })
        return
      }      // Determine the correct endpoint based on action
      const endpoint = action === "enable" 
        ? eventEndPoint.ENABLE_EVENT
        : eventEndPoint.DISABLE_EVENT

      const statusName = action === "enable" ? "enabled" : "disabled"

      // API payload - only event_id is needed according to swagger
      const payload = {
        event_id: eventId,
      }

      // Make the API call
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to ${action} event`)
      }

      const data = await response.json()
      
      toast({
        title: "Success",
        description: data.message || `Event has been ${statusName} successfully.`,
      })

      // Refresh the events data to get the updated status from the server
      getAllEventData()

    } catch (error) {
      console.error("Error toggling event status:", error)
      toast({
        title: "Error",
        description: `Failed to ${action} the event. Please try again.`,
        variant: "destructive",
      })
    }
  }

  // Handle view and edit event
  const handleViewEditEvent = (eventId: string) => {
    // Navigate to event edit page
    router.push(`/${role}/events/edit/${eventId}`)
  }

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
    setSelectedCity("__all__")
    setSelectedVenue("__all__")
    setSelectedOrganizer("__all__")
    setSelectedPromoter("__all__")
    setAllEventsData(originalData)
    toast({
      title: "Filters Reset",
      description: "All filters have been cleared",
    })
  }
  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim()
  }

  const handleCheckReport = (eventId: string) => {
    // Navigate to reports page to check bookings for this event
    router.push(`/${role}/events/${eventId}/report`)
  }
  
  const handleBookTicket = (eventId: string, arrangedEventDateTime?: any[]) => {
    // Navigate to booking page for this event with event date time data
    router.push(`/${role}/events/${eventId}/booking`)
  }

  const handlePromoterClick = (promoterData: any, eventId: string) => {
    setSelectedPromoterData(promoterData)
    setSelectedEventId(eventId)
    setShowPromoterPopup(true)
  }

  const handleOrganizerClick = (organizerData: any) => {
    setSelectedOrganizerData(organizerData)
    setShowOrganizerPopup(true)
  }
  
  // Function to render tab-specific content with table
  const renderTabContent = () => {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                {activeTab === "all" && "All Events"}
                {activeTab === "published" && "Published Events"}
                {activeTab === "draft" && "Draft Events"}
                {activeTab === "review" && "Events To Be Reviewed"}
                {activeTab === "self" && "My Events"}
                {activeTab === "rejected" && "Rejected Events"}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {currentEvents.length} event{currentEvents.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="font-semibold text-foreground bg-muted/30">Event Name</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30">Start Date</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30">Time</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30">Category</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30 min-w-[120px]">Organizer</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30 min-w-[140px]">Promoter</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30">Visibility</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30">Venue</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30">City</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30">Status</TableHead>
                  <TableHead className="font-semibold text-foreground bg-muted/30">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-16">
                      <div className="space-y-6">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-muted/40 to-muted/20 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-xl font-semibold text-muted-foreground">No events found</h3>
                          <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            {activeTab === "all" && "No events available in the system."}
                            {activeTab === "published" && "No published events found."}
                            {activeTab === "draft" && "No draft events found."}
                            {activeTab === "review" && "No events pending review."}
                            {activeTab === "self" && "No events created by you."}
                            {activeTab === "rejected" && "No rejected events found."}
                          </p>
                        </div>
                        <Button variant="outline" onClick={getAllEventData} disabled={loading} className="text-sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh Events
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentEvents.map((event) => (
                    <TableRow 
                      key={event._id} 
                      className={`hover:bg-muted/50 transition-colors ${
                        isEventDisabled(event) 
                          ? "bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500" 
                          : ""
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold text-sm">{event.eventName}</div>
                          <div className="text-xs text-muted-foreground">{event.eventType}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateForDisplay(event.eventStartDate)}</TableCell>
                      <TableCell>{formatTime(event.eventStartDate)}</TableCell>
                      <TableCell>{event.categoryName}</TableCell>
                      <TableCell className="min-w-[120px]">
                        {(role as UserRole) === "superadmin" ? (
                          <div className="flex items-center gap-1 flex-nowrap overflow-hidden min-w-0">
                            {event.organizers && event.organizers.length > 0 ? (
                              <>
                                {event.organizers.slice(0, 2).map((organizer: any, index: number) => (
                                  <OrganizerIndicator
                                    key={organizer.organizer_id || index}
                                    organizerData={organizer}
                                    onClick={() => handleOrganizerClick(organizer)}
                                    size="sm"
                                  />
                                ))}
                                {event.organizers.length > 2 && (
                                  <Badge variant="secondary" className="text-xs ml-1 flex-shrink-0">
                                    +{event.organizers.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <OrganizerIndicator
                                organizerData={{ OrganizerName: event.organizerName, organizer_id: event.organizerId }}
                                onClick={() => handleOrganizerClick({ OrganizerName: event.organizerName, organizer_id: event.organizerId })}
                                size="sm"
                              />
                            )}
                          </div>
                        ) : (
                          event.organizerName
                        )}
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        {(role as UserRole) === "superadmin" ? (
                          <div className="flex items-center gap-1 flex-nowrap overflow-hidden min-w-0">
                            {event.PopUpPromoterData && event.PopUpPromoterData.length > 0 ? (
                              <>
                                {event.PopUpPromoterData.slice(0, 2).map((promoter: any, index: number) => (
                                  <PromoterIndicator
                                    key={promoter.promoter_id || index}
                                    promoterData={promoter}
                                    onClick={() => handlePromoterClick(promoter, event._id)}
                                    size="sm"
                                  />
                                ))}
                                {event.PopUpPromoterData.length > 2 && (
                                  <Badge variant="secondary" className="text-xs ml-1 flex-shrink-0">
                                    +{event.PopUpPromoterData.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : event.promoterData ? (
                              <PromoterIndicator
                                promoterData={event.promoterData}
                                onClick={() => handlePromoterClick(event.promoterData, event._id)}
                                size="sm"
                              />
                            ) : null}
                            <AddPromoterAndShow 
                              eventData={event} 
                              onPromoterUpdate={() => getAllEventData()}
                            />
                          </div>
                        ) : ((role as UserRole) === "organizer") ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{event.promoterName || ""}</span>
                            <AddPromoterAndShow 
                              eventData={event} 
                              onPromoterUpdate={() => getAllEventData()}
                            />
                          </div>
                        ) : (
                          event.promoterName || "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={event.eventVisibility ? "default" : "secondary"}>
                          {event.eventVisibility ? "Public" : "Private"}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.venueName}</TableCell>
                      <TableCell>{event.city}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(event.eventStatus)}>
                          {normalizeEventStatus(event.eventStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(role as UserRole) !== "promoter" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>                              <DropdownMenuItem 
                                onClick={() => handleViewEditEvent(event._id)}
                                className="hover:bg-accent cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View & Edit
                              </DropdownMenuItem>      
                              
                              {(canAddEvent) && (
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/${role}/events/${event._id}/tickets`)}
                                  className="hover:bg-accent cursor-pointer"
                                >
                                  <Ticket className="mr-2 h-4 w-4" />
                                  View & Add Tickets
                                </DropdownMenuItem>
                              )}                              <DropdownMenuItem 
                                onClick={() => handleBookTicket(event._id, event.arrangedEventDateTime)}
                                className="hover:bg-accent cursor-pointer"
                              >
                                <IndianRupee className="mr-2 h-4 w-4" />
                                Booking
                              </DropdownMenuItem>
                              {isEventDisabled(event) ? (
                                <DropdownMenuItem 
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleToggleEventStatus(event._id, "enable")}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Enable Event
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleToggleEventStatus(event._id, "disable")}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Disable Event
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border/50">
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
    )
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
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
          {(role as UserRole) === "promoter" ? "" : "Events Management"}
        </h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {(role as UserRole) === "promoter" && (
            <div className="flex items-center gap-2 bg-muted/50 dark:bg-muted/20 p-1 rounded-lg">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className={`text-xs sm:text-sm ${viewMode === "cards" ? "shadow-sm" : ""}`}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={`text-xs sm:text-sm ${viewMode === "table" ? "shadow-sm" : ""}`}
              >
                Table
              </Button>
            </div>
          )}          {canAddEvent && (
            <Button onClick={handleCreateEvent} className="w-full sm:w-auto text-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
            </Button>
          )}
        </div>
      </div>      {/* Enhanced Search Bar and Filters */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-card/90 to-card/95 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary h-4 w-4 animate-spin z-10" />
              )}
              <Input
                placeholder="Search by event name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-12 bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base transition-all duration-200 shadow-inner"
                disabled={searchLoading}
              />
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
            </div>

            {/* Comprehensive Filters Row */}
            <div className="flex flex-col gap-4">
              {/* Filter Controls */}
              <div className="flex flex-col gap-4">
                {/* Filters Container */}
                <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                  {/* Filter Selects Row */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
                    {/* Event Filters (for all roles except promoter) */}
                    {(role as UserRole) !== "promoter" && (
                      <>
                        {/* City Filter */}
                        <div className="flex-1 sm:flex-none min-w-[160px]">
                          <Select value={selectedCity} onValueChange={setSelectedCity}>
                            <SelectTrigger className="bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 text-sm">
                              <SelectValue placeholder="🏙️ Select City" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All Cities</SelectItem>
                              {getUniqueCities().map((city) => (
                                <SelectItem key={city} value={city}>
                                  {city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Venue Filter */}
                        <div className="flex-1 sm:flex-none min-w-[160px]">
                          <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                            <SelectTrigger className="bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 text-sm">
                              <SelectValue placeholder="🏢 Select Venue" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All Venues</SelectItem>
                              {getUniqueVenues().map((venue) => (
                                <SelectItem key={venue} value={venue}>
                                  {venue}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Organizer Filter */}
                        <div className="flex-1 sm:flex-none min-w-[160px]">
                          <Select value={selectedOrganizer} onValueChange={setSelectedOrganizer}>
                            <SelectTrigger className="bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 text-sm">
                              <SelectValue placeholder="👨‍💼 Select Organizer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All Organizers</SelectItem>
                              {getUniqueOrganizers().map((organizer) => (
                                <SelectItem key={organizer} value={organizer}>
                                  {organizer}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Promoter Filter */}
                        <div className="flex-1 sm:flex-none min-w-[160px]">
                          <Select value={selectedPromoter} onValueChange={setSelectedPromoter}>
                            <SelectTrigger className="bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 text-sm">
                              <SelectValue placeholder="📢 Select Promoter" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All Promoters</SelectItem>
                              {getUniquePromoters().map((promoter) => (
                                <SelectItem key={promoter} value={promoter}>
                                  {promoter}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date Range Filter for Non-Promoters */}
                        <div className="flex-1 sm:flex-none min-w-[160px]">
                          <select
                            className="w-full block px-4 py-3 border border-border/40 rounded-lg bg-background/50 dark:bg-muted/10 text-sm hover:border-border/60 focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all duration-200 shadow-inner cursor-pointer"
                            value={dateFilterOption}
                            onChange={(e) => handleDateSelection(e.target.value)}
                          >
                            <option value="">📅 Select Date Filter</option>
                            <option value="Today">📍 Today</option>
                            <option value="Yesterday">⏮️ Yesterday</option>
                            <option value="Last 7 Days">📊 Last 7 Days</option>
                            <option value="Last 1 Month">📈 Last 1 Month</option>
                            <option value="Manual">🔧 Manual Selection</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Promoter-specific Date Filter */}
                    {(role as UserRole) === "promoter" && (
                      <div className="flex-1 sm:flex-none min-w-[160px]">
                        <select
                          className="w-full sm:w-auto block px-4 py-3 border border-border/40 rounded-lg bg-background/50 dark:bg-muted/10 text-sm hover:border-border/60 focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all duration-200 shadow-inner cursor-pointer"
                          value={dateFilterOption}
                          onChange={(e) => handleDateSelection(e.target.value)}
                        >
                          <option value="">📅 Select Date Filter</option>
                          <option value="Today">📍 Today</option>
                          <option value="Yesterday">⏮️ Yesterday</option>
                          <option value="Last 7 Days">📊 Last 7 Days</option>
                          <option value="Last 1 Month">📈 Last 1 Month</option>
                          <option value="Manual">🔧 Manual Selection</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Reset All Filters Button */}
                    {(searchTerm || dateFilterOption || (selectedCity && selectedCity !== "__all__") || (selectedVenue && selectedVenue !== "__all__") || (selectedOrganizer && selectedOrganizer !== "__all__") || (selectedPromoter && selectedPromoter !== "__all__")) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={resetFilters} 
                        className="text-sm border-border/40 hover:border-border/60 hover:bg-muted/30 transition-all whitespace-nowrap"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset All
                      </Button>
                    )}
                    
                    {/* Export Button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-sm border-border/40 hover:border-border/60 hover:bg-muted/30 transition-all whitespace-nowrap"
                    >
                      <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual Date Selection (for both promoter and non-promoter) */}
              {isManual && (
                <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/20 dark:bg-muted/10 rounded-lg border border-border/30">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                    <Input
                      type="date"
                      value={startDate ? startDate.split('T')[0] : ''}
                      onChange={(e) => handleManualDateChange(e.target.value, "start")}
                      className="bg-background/70 dark:bg-muted/20 text-sm border-border/40 focus:border-primary/60"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">End Date</label>
                    <Input
                      type="date"
                      value={endDate ? endDate.split('T')[0] : ''}
                      onChange={(e) => handleManualDateChange(e.target.value, "end")}
                      className="bg-background/70 dark:bg-muted/20 text-sm border-border/40 focus:border-primary/60"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Button 
                      onClick={handleManualSubmit} 
                      size="sm" 
                      className="text-sm bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                      disabled={!startDate || !endDate}
                    >
                      ✅ Apply Dates
                    </Button>
                  </div>
                </div>
              )}

              {/* Active Filters Display */}
              {((selectedCity && selectedCity !== "__all__") || (selectedVenue && selectedVenue !== "__all__") || (selectedOrganizer && selectedOrganizer !== "__all__") || (selectedPromoter && selectedPromoter !== "__all__") || dateFilterOption) && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/10 dark:bg-muted/5 rounded-lg border border-border/20">
                  <span className="text-xs font-medium text-muted-foreground mr-2">Active Filters:</span>
                  {selectedCity && selectedCity !== "__all__" && (
                    <Badge variant="secondary" className="text-xs">
                      City: {selectedCity}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedCity("__all__")} />
                    </Badge>
                  )}
                  {selectedVenue && selectedVenue !== "__all__" && (
                    <Badge variant="secondary" className="text-xs">
                      Venue: {selectedVenue}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedVenue("__all__")} />
                    </Badge>
                  )}
                  {selectedOrganizer && selectedOrganizer !== "__all__" && (
                    <Badge variant="secondary" className="text-xs">
                      Organizer: {selectedOrganizer}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedOrganizer("__all__")} />
                    </Badge>
                  )}
                  {selectedPromoter && selectedPromoter !== "__all__" && (
                    <Badge variant="secondary" className="text-xs">
                      Promoter: {selectedPromoter}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedPromoter("__all__")} />
                    </Badge>
                  )}
                  {dateFilterOption && (
                    <Badge variant="secondary" className="text-xs">
                      Date: {dateFilterOption}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => {
                        setDateFilterOption("")
                        setStartDate(null)
                        setEndDate(null)
                        setIsManual(false)
                      }} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 lg:w-auto lg:inline-flex bg-gradient-to-r from-muted/50 to-muted/30 dark:from-muted/20 dark:to-muted/10 border border-border/30 rounded-lg">
          {(role as UserRole) !== "promoter" && (
            <TabsTrigger 
              value="all" 
              className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200"
            >
              All ({allEventsData.length})
            </TabsTrigger>
          )}
          {(role as UserRole) !== "promoter" && (
            <TabsTrigger 
              value="published" 
              className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200"
            >
              Published ({allEventsData.filter((e) => normalizeEventStatus(e.eventStatus) === "Published").length})
            </TabsTrigger>
          )}
          {(role as UserRole) !== "promoter" && (
            <TabsTrigger 
              value="draft" 
              className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200"
            >
              Draft ({allEventsData.filter((e) => normalizeEventStatus(e.eventStatus) === "Draft").length})
            </TabsTrigger>
          )}
          {(role as UserRole) !== "promoter" && (
            <TabsTrigger 
              value="review" 
              className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200"
            >
              To Be Reviewed ({allEventsData.filter((e) => normalizeEventStatus(e.eventStatus) === "To Be Reviewed").length})
            </TabsTrigger>
          )}
          {(role as UserRole) !== "promoter" && (
            <TabsTrigger 
              value="self" 
              className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200"
            >
              Self ({allEventsData.filter((e) => e.organizerId === user?.user_id || e.promoterId === user?.user_id).length})
            </TabsTrigger>
          )}
          {(role as UserRole) !== "promoter" && (
            <TabsTrigger 
              value="rejected" 
              className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-200"
            >
              Rejected ({allEventsData.filter((e) => normalizeEventStatus(e.eventStatus) === "Rejected").length})
            </TabsTrigger>
          )}
        </TabsList>        <TabsContent value={activeTab} className="mt-4 sm:mt-6">
          {/* Tab-specific content for admin/superadmin roles */}
          {(role as UserRole) !== "promoter" && renderTabContent()}
          {(role as UserRole) === "promoter" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 overflow-visible">
              {currentEvents.length === 0 ? (                
                <div className="col-span-full text-center py-16">
                  <div className="space-y-6">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-muted/40 to-muted/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-muted-foreground">No events found</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Try adjusting your search terms or filters to find the events you're looking for
                      </p>
                    </div>
                    <Button variant="outline" onClick={getAllEventData} disabled={loading} className="text-sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Events
                    </Button>                  </div>
                </div>
              ) : (
                currentEvents.map((event) => (
                  <PromoterEventCard
                    key={event._id}
                    event={event}
                    onCheckReport={handleCheckReport}
                    onBookTicket={handleBookTicket}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    stripHtmlTags={stripHtmlTags}
                    getStatusBadgeVariant={getStatusBadgeVariant}
                    normalizeEventStatus={normalizeEventStatus}
                  />
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Event Format Selection Modal */}
      <Dialog open={showEventFormatModal} onOpenChange={setShowEventFormatModal}>        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Event Type</DialogTitle>
            <DialogDescription>
              Choose between a standard event or an event tour
            </DialogDescription>
          </DialogHeader><div className="flex flex-col gap-4 py-4">            <Button
              onClick={() => handleEventFormatSelection(0)}
              className="justify-start text-left h-auto p-4"
              variant="outline"
            >
              <div>
                <div className="font-semibold">Standard Event</div>
                
              </div>
            </Button>
            <Button
              onClick={() => handleEventFormatSelection(1)}
              className="justify-start text-left h-auto p-4"
              variant="outline"
            >
              <div>
                <div className="font-semibold">Event Tour</div>
             
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promoter Details Popup */}
      <PromoterPopup
        isOpen={showPromoterPopup}
        onClose={() => setShowPromoterPopup(false)}
        promoterData={selectedPromoterData}
        eventId={selectedEventId}
      />

      {/* Organizer Details Popup */}
      <OrganizerPopup
        isOpen={showOrganizerPopup}
        onClose={() => setShowOrganizerPopup(false)}
        organizerData={selectedOrganizerData}
      />
    </div>
  )
}
