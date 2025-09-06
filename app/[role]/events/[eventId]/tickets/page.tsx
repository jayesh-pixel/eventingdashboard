"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Ticket,
  X,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { getNumericRole } from "@/lib/role-mapping"
import { eventEndPoint, ticketEndPoint } from "@/lib/api-endpoints"
import { promoterEndpoint } from "@/lib/api-endpoints"
import { NormalTicket, BulkTicket, Event } from "@/lib/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

// Extended interfaces to handle both old and new API response structures
interface ExtendedNormalTicket extends NormalTicket {
  // New field names from backend response
  Name?: string
  EventTicketType?: number
  Price?: number
  Description?: string
  Quantity?: number
  // Availability status fields - based on actual API response
  EventTicketAvailability?: number  // 1 = Available, 0 = Sold Out (THIS IS THE CORRECT FIELD)
  EventTicketStatus?: number        // Different field, may be for internal status
  AvailabilityStatus?: string
  IsSoldOut?: boolean
  // Creation date fields with different naming conventions
  CreatedAt?: string
  createdAt: string
}

interface ExtendedBulkTicket {
  // Original BulkTicket fields
  _id?: string
  event_id?: string
  EventDateTime_id?: string
  BulkTicketName?: string
  BulkTicketType?: number
  BulkTicketPrice?: number
  BulkTicketDescription?: string
  BulkTicketQuantity?: number
  SoldBulkTickets?: number
  RemainingBulkTickets?: number
  BulkTicketStatus?: number
  BulkTicketVisibility?: number
  BulkTicketSaleStartDate?: string
  BulkTicketSaleEndDate?: string
  MinBulkTicketPerTransaction?: number
  MaxBulkTicketPerTransaction?: number
  BulkTicketTermsCondition?: string
  ConvenienceFeeApplicable?: number
  PromoterCommissionRate?: number
  PromoterCommissionType?: number
  createdAt?: string
  updatedAt?: string

  // New field names from bulk tickets API response
  BatchId?: string
  TicketName?: string
  EventName?: string
  CustomerName?: string
  PhoneNumber?: number
  PhoneNo?: string
  EventStartDateTime?: string
  Email?: string
  Quantity?: number
  CheckIn?: number
  CheckedIn?: boolean
  TotalAmount?: number
  Price?: number
  CreatedAt?: string
  Status?: number
}

interface EventDateTime {
  _id: string
  event_id: string
  EventStartDateTime: string
  EventEndDateTime: string
  DateTimeStatus: number
  createdAt: string
}

interface Promoter {
  _id: string
  FullName: string
  Email: string
  Phone1: string
  Status: string
}

// Form data types
interface CreateNormalTicketForm {
  TicketName: string
  TicketType: number
  TicketDescription: string
  EventDateTime_id: string
  TicketPrice: number
  MaxQuantity: number
  BookingMaxLimit: number
  TicketStatus: number
  VisibilityLevel: number
}

interface CreateBulkTicketForm {
  TicketName: string
  CustomerName: string
  PhoneNumber: string
  Email: string
  EventDateTime_id: string
  TotalQuantity: number
  TicketPrice: number
}

export default function TicketsPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const role = params.role as string
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  
  // Loading states
  const [loading, setLoading] = React.useState(false)
  const [bulkTicketCreating, setBulkTicketCreating] = React.useState(false)
  const [eventLoading, setEventLoading] = React.useState(true)
  const [normalTickets, setNormalTickets] = React.useState<ExtendedNormalTicket[]>([])
  const [bulkTickets, setBulkTickets] = React.useState<ExtendedBulkTicket[]>([])
  const [eventData, setEventData] = React.useState<Event | null>(null)
  const [eventDateTimes, setEventDateTimes] = React.useState<EventDateTime[]>([])
  const [promoters, setPromoters] = React.useState<Promoter[]>([])
  const [ticketLoadingStates, setTicketLoadingStates] = React.useState<{[key: string]: boolean}>({})
  
  // Tab and filter states
  const [activeTab, setActiveTab] = React.useState("normal")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [availabilityFilter, setAvailabilityFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  
  // Track which tabs have been loaded to avoid unnecessary API calls
  const [loadedTabs, setLoadedTabs] = React.useState<Set<string>>(new Set())

  // Modal states
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showPromoterModal, setShowPromoterModal] = React.useState(false)
  const [showStatusConfirmModal, setShowStatusConfirmModal] = React.useState(false)
  const [pendingStatusChange, setPendingStatusChange] = React.useState<{
    ticketId: string
    currentStatus: number
    isNormal: boolean
    ticketName: string
    action: 'enable' | 'disable'
  } | null>(null)
  const [selectedTicket, setSelectedTicket] = React.useState<ExtendedNormalTicket | ExtendedBulkTicket | null>(null)
  const [selectedPromoters, setSelectedPromoters] = React.useState<string[]>([])
  const [promoterSearchTerm, setPromoterSearchTerm] = React.useState("")

  // Form states - separate for normal and bulk tickets
  const [normalFormData, setNormalFormData] = React.useState<CreateNormalTicketForm>({
    TicketName: "",
    TicketType: 1, // Will be set automatically based on event type
    TicketDescription: "",
    EventDateTime_id: "",
    TicketPrice: 0,
    MaxQuantity: 0,
    BookingMaxLimit: 0,
    TicketStatus: 1,
    VisibilityLevel: 1
  })
  
  // State for multiple date selection
  const [selectedEventDateTimes, setSelectedEventDateTimes] = React.useState<string[]>([])
  const [isMultiDateEvent, setIsMultiDateEvent] = React.useState(false)
  
  const [bulkFormData, setBulkFormData] = React.useState<CreateBulkTicketForm>({
    TicketName: "",
    CustomerName: "",
    PhoneNumber: "",
    Email: "",
    EventDateTime_id: "",
    TotalQuantity: 0,
    TicketPrice: 0,
  })
  
  const [editFormData, setEditFormData] = React.useState<any>({})

  // Helper functions
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      let date: Date
      
      // Check for DD-MM-YYYY HH:mm:ss format (like "31-01-2025 18:44:41")
      const ddmmyyyy = dateString.match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/)
      if (ddmmyyyy) {
        // new Date(year, monthIndex, day, hour, minute, second)
        date = new Date(
          Number(ddmmyyyy[3]),     // year
          Number(ddmmyyyy[2]) - 1, // month (0-indexed)
          Number(ddmmyyyy[1]),     // day
          Number(ddmmyyyy[4]),     // hour
          Number(ddmmyyyy[5]),     // minute
          Number(ddmmyyyy[6])      // second
        )
      } else {
        // Try ISO or other standard formats
        date = new Date(dateString)
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) return "N/A"
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch (error) {
      return "N/A"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }
  // Normalize various backend status shapes to a consistent string
  const normalizeStatus = (raw: any): string => {
    if (raw === undefined || raw === null) return "Inactive"
    // Booleans
    if (raw === true) return "Active"
    if (raw === false) return "Inactive"
    // Numbers or numeric strings
    if (raw === 1 || raw === "1") return "Active"
    if (raw === 0 || raw === "0") return "Inactive"
    // Common strings
    const s = String(raw).toLowerCase()
    if (["active", "enabled", "enable"].includes(s)) return "Active"
    if (["inactive", "disabled", "disable"].includes(s)) return "Inactive"
    // Fallback to capitalized raw string
    return String(raw)
  }

  // Map backend promoter record into our Promoter shape
  const mapToPromoter = (p: any): Promoter => {
    return {
      _id: p?._id ?? p?.promoter_id ?? p?.id ?? "",
      FullName: p?.FullName ?? p?.PromoterName ?? p?.Username ?? p?.name ?? "Unknown Promoter",
      Email: p?.Email ?? p?.email ?? "",
      Phone1: p?.Phone1 ?? p?.phone ?? p?.Phone ?? "",
      Status: normalizeStatus(p?.Status ?? p?.status ?? p?.PromoterStatus ?? p?.is_active),
    }
  }
  const getTicketTypeName = (type: number) => {
    switch (type) {
      case 1: return "Single Day"
      case 2: return "Multiple Day"
      case 3: return "Season Pass"
      case 4: return "Bulk"
      default: return "Unknown"
    }
  }
  
  // API Functions
  const fetchPromoters = async () => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken) return

      const response = await fetch(promoterEndpoint.GET_ALL_PROMOTER_DATA_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.error) {
          const list = Array.isArray(data.data) ? data.data : []
          const normalized: Promoter[] = list.map(mapToPromoter)
          setPromoters(normalized)
        }
      }
    } catch (error) {
      console.error("Error fetching promoters:", error)
      toast({
        title: "Error",
        description: "Failed to load promoters",
        variant: "destructive",
      })
    }
  }
  const fetchEventDateTimes = async () => {
    try {
      setEventLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) {
        console.error("No user or auth token available")
        setEventLoading(false)
        return
      }

      console.log("Fetching event details for eventId:", eventId)
      console.log("User:", user)
      console.log("Role:", role)      // Using the event endpoint to get event details which includes date/times
      const payload = {
        event_id: eventId,
        AdminRole: getNumericRole(role),
        user_id: user.user_id,
      }

      console.log("API Payload:", JSON.stringify(payload, null, 2))

      const response = await fetch(eventEndPoint.GET_EVENTDATA_BY_ID, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      console.log("API Response status:", response.status)
      console.log("API Response ok:", response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log("API Response data:", JSON.stringify(data, null, 2))
        
        if (!data.error && data.data) {
          console.log("Event data received:", data.data)
          
          // Set event data for display
          setEventData(data.data)
          
          // Determine ticket type based on event type and date times
          let automaticTicketType = 1 // Default to Single Day
          const eventDateTimes = data.data.EventDateTime || []
          const isMultiDate = eventDateTimes.length > 1 || data.data.EventType === 2
          
          setIsMultiDateEvent(isMultiDate)
          
          if (isMultiDate) {
            automaticTicketType = 2 // Multiple Day
          }
          
          // Set event date times and auto-populate forms
          if (eventDateTimes.length > 0) {
            console.log("Event date times found:", eventDateTimes)
            setEventDateTimes(eventDateTimes)
            const firstDateTime = eventDateTimes[0]
            
            console.log("First date time:", firstDateTime)
            console.log("Auto-populating forms with EventDateTime_id:", firstDateTime._id)
            console.log("Automatic ticket type:", automaticTicketType)
            
            // Auto-populate both forms with the first event date/time and automatic ticket type
            setNormalFormData(prev => ({ 
              ...prev, 
              EventDateTime_id: firstDateTime._id,
              TicketType: automaticTicketType
            }))
            setBulkFormData(prev => ({ 
              ...prev, 
              EventDateTime_id: firstDateTime._id 
            }))
            
            // If multi-day event, select the first date by default but allow multiple selection
            if (isMultiDate || eventDateTimes.length > 1) {
              setSelectedEventDateTimes([firstDateTime._id])
            }
          } else {
            console.warn("No EventDateTime found in event data")
          }
        } else {
          console.error("API returned error or no data:", data)
        }
      } else {
        const errorText = await response.text()
        console.error("API call failed:", response.status, errorText)
        toast({
          title: "Error",
          description: "Failed to load event details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching event date times:", error)
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      })    } finally {
      setEventLoading(false)
    }
  }

  const fetchNormalTickets = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      console.log("Fetching normal tickets for eventId:", eventId)
      
      const payload = {
        event_id: eventId,
        AdminRole: getNumericRole(role),
        user_id: user.user_id,
      }

      console.log("Normal tickets API Payload:", JSON.stringify(payload, null, 2))

      const normalTicketsResponse = await fetch(ticketEndPoint.GET_ALL_EVENT_TICKETS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      console.log("Normal tickets response status:", normalTicketsResponse.status)

      if (normalTicketsResponse.ok) {
        const normalData = await normalTicketsResponse.json()
        console.log("Normal tickets response data:", JSON.stringify(normalData, null, 2))
        
        if (!normalData.error) {
          // Check if the response has the new structure with EventTicketsData
          if (normalData.data && normalData.data.EventTicketsData) {
            console.log("Using new response structure - EventTicketsData")
            console.log("EventTicketsData length:", normalData.data.EventTicketsData.length)
            if (normalData.data.EventTicketsData.length > 0) {
              console.log("First ticket sample:", JSON.stringify(normalData.data.EventTicketsData[0], null, 2))
              console.log("First ticket availability (EventTicketStatus):", normalData.data.EventTicketsData[0].EventTicketStatus)
              console.log("First ticket availability (EventTicketAvailability):", normalData.data.EventTicketsData[0].EventTicketAvailability)
            }
            setNormalTickets(normalData.data.EventTicketsData || [])
          } else {
            console.log("Using old response structure - direct data")
            console.log("Direct data length:", normalData.data?.length || 0)
            if (normalData.data && normalData.data.length > 0) {
              console.log("First ticket sample:", JSON.stringify(normalData.data[0], null, 2))
            }
            setNormalTickets(normalData.data || [])
          }
        } else {
          console.error("Normal tickets API returned error:", normalData)
        }
      } else {
        const errorText = await normalTicketsResponse.text()
        console.error("Normal tickets API call failed:", normalTicketsResponse.status, errorText)
      }
    } catch (error) {
      console.error("Error fetching normal tickets:", error)
      toast({
        title: "Error",
        description: "Failed to load normal tickets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBulkTickets = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      console.log("Fetching bulk tickets for eventId:", eventId)

      const bulkTicketsPayload = {
        event_id: eventId
      }

      console.log("Bulk tickets API Payload:", JSON.stringify(bulkTicketsPayload, null, 2))

      const bulkTicketsResponse = await fetch(ticketEndPoint.GET_ALL_BULK_TICKETS_BY_EVENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(bulkTicketsPayload),
      })

      console.log("Bulk tickets response status:", bulkTicketsResponse.status)

      if (bulkTicketsResponse.ok) {
        const bulkData = await bulkTicketsResponse.json()
        console.log("Bulk tickets response data:", JSON.stringify(bulkData, null, 2))
        
        if (!bulkData.error) {
          // Handle the correct response structure with EventBulkTicketsData
          if (bulkData.data && bulkData.data.EventBulkTicketsData) {
            console.log("Using bulk tickets structure - EventBulkTicketsData")
            console.log("EventBulkTicketsData length:", bulkData.data.EventBulkTicketsData.length)
            if (bulkData.data.EventBulkTicketsData.length > 0) {
              console.log("First bulk ticket sample:", JSON.stringify(bulkData.data.EventBulkTicketsData[0], null, 2))
            }
            setBulkTickets(bulkData.data.EventBulkTicketsData || [])
          } else {
            console.log("Using old bulk tickets structure - direct data")
            setBulkTickets(bulkData.data || [])
          }
        } else {
          console.error("Bulk tickets API returned error:", bulkData)
        }
      } else {
        const errorText = await bulkTicketsResponse.text()
        console.error("Bulk tickets API call failed:", bulkTicketsResponse.status, errorText)
      }
    } catch (error) {
      console.error("Error fetching bulk tickets:", error)
      toast({
        title: "Error",
        description: "Failed to load bulk tickets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (ticketId: string, currentStatus: number, isNormal: boolean, ticketName?: string) => {
    // Show confirmation dialog first
    // currentStatus: 1 = currently active, 0 = currently disabled
    // action will be the opposite of current status
    const action = currentStatus === 1 ? 'disable' : 'enable'
    setPendingStatusChange({
      ticketId,
      currentStatus,
      isNormal,
      ticketName: ticketName || 'ticket',
      action
    })
    setShowStatusConfirmModal(true)
  }

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return

    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      const { ticketId, currentStatus, isNormal } = pendingStatusChange
      const newStatus = currentStatus === 1 ? 0 : 1
      
      // Use the correct API endpoints
      const endpoint = isNormal
        ? (newStatus === 1 
          ? 'https://devapi.eventingclub.in/eventstickets/enableEventTicket'
          : 'https://devapi.eventingclub.in/eventstickets/disableEventTicket')
        : (newStatus === 1 
          ? ticketEndPoint.ENABLE_BULK_TICKET 
          : ticketEndPoint.DISABLE_BULK_TICKET)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          eventTicket_id: ticketId,
          AdminRole: getNumericRole(role),
          user_id: user.user_id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Ticket ${newStatus === 1 ? "enabled" : "disabled"} successfully`,
        })
        // Refresh only the current tab's tickets
        if (activeTab === "normal") {
          fetchNormalTickets()
        } else {
          fetchBulkTickets()
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to update ticket status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error toggling ticket status:", error)
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowStatusConfirmModal(false)
      setPendingStatusChange(null)
    }
  }

  const handleDeleteTicket = async (ticketId: string, isNormal: boolean) => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      const endpoint = isNormal ? ticketEndPoint.DELETE_TICKET : ticketEndPoint.DELETE_BULK_TICKET

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },        body: JSON.stringify({
          _id: ticketId,
          AdminRole: getNumericRole(role),
          user_id: user.user_id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Ticket deleted successfully",
        })
        // Refresh only the current tab's tickets
        if (activeTab === "normal") {
          fetchNormalTickets()
        } else {
          fetchBulkTickets()
        }
      }
    } catch (error) {
      console.error("Error deleting ticket:", error)
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  const handleToggleAvailability = async (ticketId: string, currentIsSoldOut: boolean) => {
    try {
      console.log(`Toggling availability for ticket ${ticketId}, currently soldOut: ${currentIsSoldOut}`)
      console.log("Current ticket state before toggle:", normalTickets.find(t => t._id === ticketId))
      
      // Set individual ticket loading state
      setTicketLoadingStates(prev => ({ ...prev, [ticketId]: true }))
      // Keep previous snapshot for rollback
      const previousTickets = normalTickets
      // Optimistic update - update only availability-related fields
      setNormalTickets(prev => prev.map(ticket => {
        if (ticket._id === ticketId) {
          return {
            ...ticket,
            EventTicketAvailability: currentIsSoldOut ? 1 : 0, // 1 = Available, 0 = Sold Out
            IsSoldOut: !currentIsSoldOut,
            AvailabilityStatus: currentIsSoldOut ? "Available" : "SoldOut"
          }
        }
        return ticket
      }))
      
      const authToken = getValidToken()
      if (!user || !authToken) return

      // Determine which endpoint to use based on current status
      const endpoint = currentIsSoldOut 
        ? ticketEndPoint.UPDATE_AVAILABILITY_TO_AVAILABLE
        : ticketEndPoint.UPDATE_AVAILABILITY_TO_SOLD_OUT

      console.log(`Using endpoint: ${endpoint}`)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          eventTicket_id: ticketId
        }),
      })

      console.log(`Toggle availability response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log("Toggle availability response data:", JSON.stringify(data, null, 2))
        
        if (!data.error) {
          toast({
            title: "Success",
            description: currentIsSoldOut 
              ? "Ticket availability updated to Available" 
              : "Ticket availability updated to Sold Out",
          })
          
          // Refresh the tickets list to get the actual server state
          console.log("Refreshing tickets after successful toggle...")
          await fetchNormalTickets()
        } else {
          console.error("API returned error:", data)
          // Revert optimistic update on error
          setNormalTickets(previousTickets)
          throw new Error(data.message || "Failed to update availability")
        }
      } else {
        const errorText = await response.text()
        console.error("Toggle availability API call failed:", response.status, errorText)
        // Revert optimistic update on error
        setNormalTickets(previousTickets)
        throw new Error("Failed to update availability")
      }
    } catch (error) {
      console.error("Error toggling ticket availability:", error)
      toast({
        title: "Error",
        description: "Failed to update ticket availability",
        variant: "destructive",
      })
    } finally {
      // Clear individual ticket loading state
      setTicketLoadingStates(prev => ({ ...prev, [ticketId]: false }))
    }
  }

  const handleCreateTicket = async () => {
    try {
      // Set appropriate loading state
      if (activeTab === "bulk") {
        setBulkTicketCreating(true)
      } else {
        setLoading(true)
      }
      
      const authToken = getValidToken()
      if (!user || !authToken) return

      // Validate promoter selection if visibility is set to "Promoters"
      if (activeTab === "normal" && normalFormData.VisibilityLevel === 3 && selectedPromoters.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one promoter for promoter-only tickets",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      
      // Validate event date/time selection for normal tickets
      if (activeTab === "normal") {
        if (isMultiDateEvent || eventDateTimes.length > 1) {
          // Multi-day event: check if at least one date is selected
          if (selectedEventDateTimes.length === 0) {
            toast({
              title: "Validation Error",
              description: "Please select at least one event date for this ticket.",
              variant: "destructive",
            })
            setLoading(false)
            return
          }
        } else if (!normalFormData.EventDateTime_id) {
          toast({
            title: "Validation Error",
            description: "Event date & time is required. Please wait for event data to load.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      }
      
      // Validate event date/time selection for bulk tickets
      if (activeTab === "bulk" && !bulkFormData.EventDateTime_id) {
        toast({
          title: "Validation Error", 
          description: "Event date & time is required. Please wait for event data to load.",
          variant: "destructive",
        })
        setBulkTicketCreating(false)
        return
      }
      
      // Validate bulk ticket quantity limit (maximum 20 tickets per booking)
      if (activeTab === "bulk" && bulkFormData.TotalQuantity > 20) {
        toast({
          title: "Validation Error",
          description: "Maximum 20 tickets can be booked in one transaction.",
          variant: "destructive",
        })
        setBulkTicketCreating(false)
        return
      }
      
      // Validate minimum quantity for bulk tickets
      if (activeTab === "bulk" && bulkFormData.TotalQuantity < 1) {
        toast({
          title: "Validation Error",
          description: "At least 1 ticket must be selected.",
          variant: "destructive",
        })
        setBulkTicketCreating(false)
        return
      }
      
      const endpoint = activeTab === "normal" 
        ? ticketEndPoint.CREATE_NORMAL_TICKET 
        : ticketEndPoint.CREATE_BULK_TICKET

      let payload: any = {
        Event_id: eventId,
      }
      
      if (activeTab === "normal") {
        // For multi-day events, use selected dates; for single-day events, use the default EventDateTime_id
        const eventDateTimeIds = (isMultiDateEvent || eventDateTimes.length > 1) 
          ? selectedEventDateTimes.map(id => ({ eventDateTime_id: id }))
          : [{ eventDateTime_id: normalFormData.EventDateTime_id }]
          
        payload = {
          ...payload,
          Name: normalFormData.TicketName,
          EventTicketType: normalFormData.TicketType.toString(),
          Description: normalFormData.TicketDescription,
          EventDateTimeIds: eventDateTimeIds,
          Price: normalFormData.TicketPrice,
          Quantity: normalFormData.MaxQuantity,
          BookingMaxLimit: normalFormData.BookingMaxLimit,
          EventTicketVisibility: normalFormData.VisibilityLevel.toString()
        }
        
        // Include selected promoters if visibility is set to "Promoters"
        if (normalFormData.VisibilityLevel === 3 && selectedPromoters.length > 0) {
          payload.EventPromoters = selectedPromoters.map(promoterId => ({ promoter_id: promoterId }))
        }
      } else {
        payload = {
          event_id: eventId,
          TicketName: bulkFormData.TicketName,
          CustomerName: bulkFormData.CustomerName,
          PhoneNumber: bulkFormData.PhoneNumber,
          Email: bulkFormData.Email,
          EventDateTime_id: bulkFormData.EventDateTime_id,
          Quantity: bulkFormData.TotalQuantity.toString(),
          Price: bulkFormData.TicketPrice.toString(),
          CreatedBy: 1,
          createduser_id: user.user_id
        }
      }

      // Create AbortController for timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), activeTab === "bulk" ? 120000 : 30000) // 2 minutes for bulk, 30 seconds for normal

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId) // Clear timeout on successful response

      if (response.ok) {
        const data = await response.json()
        
        if (activeTab === "bulk") {
          // Special handling for bulk tickets with email confirmation
          toast({
            title: "Success",
            description: data.message || "Bulk tickets created successfully! Tickets have been sent to the customer's email.",
          })
        } else {
          toast({
            title: "Success",
            description: "Ticket created successfully",
          })
        }
        setShowCreateModal(false)
        setSelectedPromoters([]) // Reset selected promoters
        setSelectedEventDateTimes([]) // Reset selected dates
        if (activeTab === "normal") {
          // Determine automatic ticket type for reset
          let automaticTicketType = 1
          if (isMultiDateEvent || eventDateTimes.length > 1) {
            automaticTicketType = 2
          }
          
          setNormalFormData({
            TicketName: "",
            TicketType: automaticTicketType,
            TicketDescription: "",
            EventDateTime_id: eventDateTimes.length > 0 ? eventDateTimes[0]._id : "",
            TicketPrice: 0,
            MaxQuantity: 0,
            BookingMaxLimit: 0,
            TicketStatus: 1,
            VisibilityLevel: 1
          })
          
          // Reset selected dates for multi-day events
          if (isMultiDateEvent || eventDateTimes.length > 1) {
            setSelectedEventDateTimes(eventDateTimes.length > 0 ? [eventDateTimes[0]._id] : [])
          }
        } else {
          setBulkFormData({
            TicketName: "",
            CustomerName: "",
            PhoneNumber: "",
            Email: "",
            EventDateTime_id: eventDateTimes.length > 0 ? eventDateTimes[0]._id : "",
            TotalQuantity: 0,
            TicketPrice: 0
          })
        }
        // Refresh only the current tab's tickets
        if (activeTab === "normal") {
          fetchNormalTickets()
        } else {
          fetchBulkTickets()
        }
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
      
      let errorMessage = "Failed to create ticket"
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = activeTab === "bulk" 
            ? "Request timed out. Bulk ticket creation is taking longer than expected. Please check if the ticket was created successfully."
            : "Request timed out. Please try again."
        } else {
          errorMessage = error.message || errorMessage
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      } finally {
      if (activeTab === "bulk") {
        setBulkTicketCreating(false)
      } else {
        setLoading(false)
      }
    }
  }

  const handleEditTicket = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken || !selectedTicket) return

      const isNormal = "TicketName" in selectedTicket
      const endpoint = isNormal
        ? ticketEndPoint.UPDATE_TICKET
        : ticketEndPoint.UPDATE_BULK_TICKET

      const payload = {
        _id: selectedTicket._id,
        AdminRole: getNumericRole(role),
        user_id: user.user_id,
        ...editFormData
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Ticket updated successfully",
        })
        setShowEditModal(false)
        setEditFormData({})
        // Refresh only the current tab's tickets
        if (activeTab === "normal") {
          fetchNormalTickets()
        } else {
          fetchBulkTickets()
        }
      }
    } catch (error) {
      console.error("Error updating ticket:", error)
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for bulk ticket actions
  const handleCancelBulkTicket = async (batchId: string) => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken) return

      // Call the cancel bulk ticket API endpoint with correct payload
      const response = await fetch(ticketEndPoint.CANCEL_BULK_TICKET, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          BulkTicketBatch_Id: batchId
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: data.message || "Bulk ticket cancelled successfully",
        })
        fetchBulkTickets() // Refresh the bulk tickets list
      } else {
        throw new Error("Failed to cancel bulk ticket")
      }
    } catch (error) {
      console.error("Error cancelling bulk ticket:", error)
      toast({
        title: "Error",
        description: "Failed to cancel bulk ticket",
        variant: "destructive",
      })
    }
  }

  const handleDownloadBulkTicketReport = async (batchId: string, ticketName: string) => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken) return

      // Call the correct download bulk ticket report API endpoint
      const response = await fetch(`${BASE_URL}/eventbulktickets/exportBulkTicketBookingIds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          BulkTicketBatch_Id: batchId
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `bulk-ticket-report-${ticketName || 'report'}-${batchId}-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: "Success",
          description: "Excel report downloaded successfully",
        })
      } else {
        throw new Error("Failed to download report")
      }
    } catch (error) {
      console.error("Error downloading bulk ticket report:", error)
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      })
    }
  }

  // Effects
  React.useEffect(() => {
    // Load initial data when component mounts
    if (user && eventId) {
      fetchPromoters()
      fetchEventDateTimes()
      
      // Load tickets for the initial active tab only
      if (activeTab === "normal") {
        fetchNormalTickets()
        setLoadedTabs(prev => new Set(prev).add("normal"))
      } else if (activeTab === "bulk") {
        fetchBulkTickets()
        setLoadedTabs(prev => new Set(prev).add("bulk"))
      }
    }
  }, [eventId, user])

  // Handle tab changes - load data only when switching to a new tab
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    
    // Load data only if this tab hasn't been loaded before
    if (!loadedTabs.has(newTab)) {
      if (newTab === "normal") {
        fetchNormalTickets()
        setLoadedTabs(prev => new Set(prev).add("normal"))
      } else if (newTab === "bulk") {
        fetchBulkTickets()
        setLoadedTabs(prev => new Set(prev).add("bulk"))
      }
    }
  }

  const handleOpenCreateModal = () => {
    // Auto-populate form with event data when opening modal
    if (eventDateTimes.length > 0) {
      const firstDateTime = eventDateTimes[0]
      
      // Determine automatic ticket type based on event configuration
      let automaticTicketType = 1 // Default to Single Day
      if (isMultiDateEvent || eventDateTimes.length > 1) {
        automaticTicketType = 2 // Multiple Day
      }
      
      setNormalFormData(prev => ({ 
        ...prev, 
        EventDateTime_id: firstDateTime._id,
        TicketType: automaticTicketType
      }))
      setBulkFormData(prev => ({ 
        ...prev, 
        EventDateTime_id: firstDateTime._id 
      }))
      
      // Initialize selected dates for multi-day events
      if (isMultiDateEvent || eventDateTimes.length > 1) {
        setSelectedEventDateTimes([firstDateTime._id])
      }
    }
    setShowCreateModal(true)
  }
  const handleVisibilityChange = (value: string) => {
    setNormalFormData(prev => ({ ...prev, VisibilityLevel: parseInt(value) }))
    
    // Open promoter selection modal if "Promoters" is selected
    if (value === "3") {
      // Check if event has assigned promoters first
      if (!(eventData as any)?.EventPromoter || (eventData as any).EventPromoter.length === 0) {
        toast({
          title: "No Promoters Assigned",
          description: "You need to assign promoters to this event first before creating promoter-only tickets. Please assign promoters from the events management page.",
          variant: "destructive",
        })
        // Reset to "Everyone" visibility
        setNormalFormData(prev => ({ ...prev, VisibilityLevel: 1 }))
        return
      }
      setPromoterSearchTerm("") // Clear search term
      setShowPromoterModal(true)
    }
  }

  const handlePromoterSelection = (promoterId: string) => {
    setSelectedPromoters(prev => 
      prev.includes(promoterId) 
        ? prev.filter(id => id !== promoterId)
        : [...prev, promoterId]
    )
  }

  const handlePromoterModalSave = () => {
    setShowPromoterModal(false)
    // You can add logic here to save the selected promoters to the form data
  }
  const handleOpenEditModal = (ticket: ExtendedNormalTicket | ExtendedBulkTicket) => {
    setSelectedTicket(ticket)
    setEditFormData(ticket)
    setShowEditModal(true)
  }  // Filter promoters based on search AND event assignment
  const filteredPromoters = promoters.filter(promoter => {
    // First check if promoter is assigned to this event
    const isAssignedToEvent = (eventData as any)?.EventPromoter?.some(
      (ep: any) => ep.promoter_id === promoter._id
    )
    
    if (!isAssignedToEvent) return false
    
    // Then check if promoter matches search term
    const matchesSearch = 
      promoter.FullName.toLowerCase().includes(promoterSearchTerm.toLowerCase()) ||
      (promoter.Email && promoter.Email.toLowerCase().includes(promoterSearchTerm.toLowerCase())) ||
      (promoter.Phone1 && promoter.Phone1.includes(promoterSearchTerm))
    
    return matchesSearch
  })

  const filteredNormalTickets = normalTickets.filter(ticket => {
    const extendedTicket = ticket as ExtendedNormalTicket
    const ticketName = extendedTicket.Name || ticket.TicketName || ''
    
    // Check availability based on the actual API response structure
    // EventTicketAvailability: 1 = Available, 0 = Sold Out (THIS IS THE CORRECT FIELD)
    const isSoldOut = extendedTicket.EventTicketAvailability === 0 ||
                      extendedTicket.IsSoldOut === true || 
                      extendedTicket.AvailabilityStatus === "SoldOut" || 
                      extendedTicket.AvailabilityStatus === "sold_out"
    
    // Check status (Active/Disabled)
    const isActive = (typeof extendedTicket.TicketStatus === 'number')
      ? extendedTicket.TicketStatus !== 0
      : (typeof extendedTicket.EventTicketStatus === 'number' 
          ? extendedTicket.EventTicketStatus !== 0 
          : true)
    
    const matchesSearch = ticketName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAvailability = availabilityFilter === "all" || 
                               (availabilityFilter === "available" && !isSoldOut) ||
                               (availabilityFilter === "soldout" && isSoldOut)
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && isActive) ||
                         (statusFilter === "disabled" && !isActive)
    
    return matchesSearch && matchesAvailability && matchesStatus
  })
  const filteredBulkTickets = bulkTickets.filter(ticket => {
    const extendedTicket = ticket as ExtendedBulkTicket
    const ticketName = extendedTicket.TicketName || ticket.BulkTicketName || ''
    
    // Check status (Active/Disabled) for bulk tickets
    const isActive = (typeof extendedTicket.BulkTicketStatus === 'number')
      ? extendedTicket.BulkTicketStatus !== 0
      : (typeof extendedTicket.Status === 'number' 
          ? extendedTicket.Status !== 0 
          : true)
    
    const matchesSearch = ticketName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && isActive) ||
                         (statusFilter === "disabled" && !isActive)
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href={`/${role}/dashboard`}
              className="cursor-pointer"
            >
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={`/${role}/events`}
              className="cursor-pointer"
            >
              Events
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Tickets</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>          <div>
            <h1 className="text-2xl font-bold tracking-tight">Event Tickets</h1>
            <p className="text-muted-foreground">
              {eventLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading event details...
                </span>
              ) : eventData ? (
                `${eventData.eventName || eventData.EventName || 'Event'} - Manage event tickets and configure pricing`
              ) : (
                "Manage event tickets and configure pricing"
              )}
            </p>
          </div>
        </div>        <Button onClick={handleOpenCreateModal} disabled={eventLoading || eventDateTimes.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Ticket
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full md:min-w-[200px] md:w-auto">
              <Label htmlFor="availability">Availability</Label>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Availability</SelectItem>
                  <SelectItem value="available" className="text-green-600">Available</SelectItem>
                  <SelectItem value="soldout" className="text-red-600">Sold Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:min-w-[200px] md:w-auto">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active" className="text-green-600">Active</SelectItem>
                  <SelectItem value="disabled" className="text-red-600">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="normal" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Normal Tickets ({filteredNormalTickets.length})
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Bulk Tickets ({filteredBulkTickets.length})
          </TabsTrigger>
        </TabsList>

        {/* Normal Tickets Tab */}
        <TabsContent value="normal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Normal Tickets</CardTitle>
              <CardDescription>
                Manage individual event tickets and pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredNormalTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No tickets found
                        </TableCell>
                      </TableRow>
                    ) : (                      filteredNormalTickets.map((ticket) => {
                        const extendedTicket = ticket as ExtendedNormalTicket
                        return (
                          <TableRow key={ticket._id}>
                            <TableCell className="font-medium">
                              {extendedTicket.Name || ticket.TicketName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {getTicketTypeName(extendedTicket.EventTicketType || ticket.TicketType || 1)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(extendedTicket.Price || ticket.TicketPrice || 0)}
                            </TableCell>                            <TableCell>
                              {extendedTicket.Quantity || ticket.TicketQuantity || 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant={(() => {
                                const isActive = (typeof extendedTicket.TicketStatus === 'number')
                                  ? extendedTicket.TicketStatus !== 0
                                  : (typeof extendedTicket.EventTicketStatus === 'number' 
                                      ? extendedTicket.EventTicketStatus !== 0 
                                      : true)
                                return isActive ? "default" : "secondary"
                              })()}>
                                {(() => {
                                  const isActive = (typeof extendedTicket.TicketStatus === 'number')
                                    ? extendedTicket.TicketStatus !== 0
                                    : (typeof extendedTicket.EventTicketStatus === 'number' 
                                        ? extendedTicket.EventTicketStatus !== 0 
                                        : true)
                                  return isActive ? "Active" : "Disabled"
                                })()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"                                    checked={(() => {
                                      // EventTicketAvailability: 1 = Available, 0 = Sold Out (CORRECT FIELD)
                                      const isSoldOut = extendedTicket.EventTicketAvailability === 0 ||
                                                        extendedTicket.IsSoldOut === true || 
                                                        extendedTicket.AvailabilityStatus === "SoldOut" || 
                                                        extendedTicket.AvailabilityStatus === "sold_out"
                                      return !isSoldOut // Toggle is ON when available, OFF when sold out
                                    })()}
                                    onChange={() => {
                                      const isSoldOut = extendedTicket.EventTicketAvailability === 0 ||
                                                        extendedTicket.IsSoldOut === true || 
                                                        extendedTicket.AvailabilityStatus === "SoldOut" || 
                                                        extendedTicket.AvailabilityStatus === "sold_out"
                                      handleToggleAvailability(ticket._id, isSoldOut)
                                    }}
                                    disabled={ticketLoadingStates[ticket._id] || false}
                                  />
                                  <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>                                <span className={`text-sm font-medium ${(() => {
                                  const isSoldOut = extendedTicket.EventTicketAvailability === 0 ||
                                                    extendedTicket.IsSoldOut === true || 
                                                    extendedTicket.AvailabilityStatus === "SoldOut" || 
                                                    extendedTicket.AvailabilityStatus === "sold_out"
                                  return isSoldOut ? "text-red-600" : "text-green-600"
                                })()}`}>
                                  {(() => {
                                    const isSoldOut = extendedTicket.EventTicketAvailability === 0 ||
                                                      extendedTicket.IsSoldOut === true || 
                                                      extendedTicket.AvailabilityStatus === "SoldOut" || 
                                                      extendedTicket.AvailabilityStatus === "sold_out"
                                    return isSoldOut ? "Sold Out" : "Available"
                                  })()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(extendedTicket.createdAt || extendedTicket.CreatedAt || ticket.createdAt || ticket.CreatedAt || '')}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenEditModal(ticket)}
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const isActive = (typeof extendedTicket.TicketStatus === 'number')
                                        ? extendedTicket.TicketStatus !== 0
                                        : (typeof extendedTicket.EventTicketStatus === 'number' 
                                            ? extendedTicket.EventTicketStatus !== 0 
                                            : true)
                                      const ticketName = extendedTicket.Name || ticket.TicketName || 'ticket'
                                      // Pass the current status (1 if active, 0 if disabled) so the function can toggle it correctly
                                      handleToggleStatus(ticket._id, isActive ? 1 : 0, true, ticketName)
                                    }}
                                    className={(() => {
                                      const isActive = (typeof extendedTicket.TicketStatus === 'number')
                                        ? extendedTicket.TicketStatus !== 0
                                        : (typeof extendedTicket.EventTicketStatus === 'number' 
                                            ? extendedTicket.EventTicketStatus !== 0 
                                            : true)
                                      return isActive ? "text-destructive" : "text-green-600"
                                    })()}
                                  >
                                    {(() => {
                                      const isActive = (typeof extendedTicket.TicketStatus === 'number')
                                        ? extendedTicket.TicketStatus !== 0
                                        : (typeof extendedTicket.EventTicketStatus === 'number' 
                                            ? extendedTicket.EventTicketStatus !== 0 
                                            : true)
                                      return isActive ? "Disable" : "Enable"
                                    })()}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Tickets Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Tickets</CardTitle>
              <CardDescription>
                Manage bulk tickets for large groups and promoters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Event Time</TableHead>
                      <TableHead>Ticket Name</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone No.</TableHead>
                      <TableHead>Ticket Created</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ticket Price</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredBulkTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-8">
                          No bulk tickets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBulkTickets.map((ticket) => {
                        const extendedTicket = ticket as ExtendedBulkTicket
                        const ticketPrice = extendedTicket.Price || ticket.BulkTicketPrice || 0
                        const quantity = extendedTicket.Quantity || ticket.MaxBulkTicketPerTransaction || 0
                        const totalAmount = ticketPrice * quantity
                        
                        return (
                          <TableRow key={ticket._id || ticket.BatchId}>
                            <TableCell className="font-medium">
                              {ticket.BatchId || ticket._id || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {eventData?.eventName || eventData?.EventName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {eventDateTimes.length > 0 ? (
                                `${new Date(eventDateTimes[0].EventStartDateTime).toLocaleDateString()} ${new Date(eventDateTimes[0].EventStartDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(eventDateTimes[0].EventEndDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {extendedTicket.TicketName || ticket.BulkTicketName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {extendedTicket.CustomerName || ticket.CustomerName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {extendedTicket.Email || ticket.Email || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {extendedTicket.PhoneNo || ticket.PhoneNo || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {formatDate(extendedTicket.createdAt || extendedTicket.CreatedAt || ticket.createdAt || ticket.CreatedAt || '')}
                            </TableCell>
                            <TableCell>
                              {quantity}
                            </TableCell>
                            <TableCell>
                              <Badge variant={extendedTicket.CheckedIn || ticket.CheckedIn ? "default" : "secondary"}>
                                {extendedTicket.CheckedIn || ticket.CheckedIn ? "Checked In" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={(() => {
                                const isActive = (typeof extendedTicket.BulkTicketStatus === 'number')
                                  ? extendedTicket.BulkTicketStatus !== 0
                                  : (typeof extendedTicket.Status === 'number' 
                                      ? extendedTicket.Status !== 0 
                                      : true)
                                return isActive ? "default" : "secondary"
                              })()}>
                                {(() => {
                                  const isActive = (typeof extendedTicket.BulkTicketStatus === 'number')
                                    ? extendedTicket.BulkTicketStatus !== 0
                                    : (typeof extendedTicket.Status === 'number' 
                                        ? extendedTicket.Status !== 0 
                                        : true)
                                  return isActive ? "Active" : "Disabled"
                                })()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(ticketPrice)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(totalAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const batchId = ticket.BatchId || ticket._id || ''
                                      const isActive = (typeof extendedTicket.BulkTicketStatus === 'number')
                                        ? extendedTicket.BulkTicketStatus !== 0
                                        : (typeof extendedTicket.Status === 'number' 
                                            ? extendedTicket.Status !== 0 
                                            : true)
                                      const ticketName = extendedTicket.TicketName || ticket.BulkTicketName || 'bulk ticket'
                                      // Pass the current status (1 if active, 0 if disabled) so the function can toggle it correctly
                                      if (batchId) handleToggleStatus(batchId, isActive ? 1 : 0, false, ticketName)
                                    }}
                                    className={(() => {
                                      const isActive = (typeof extendedTicket.BulkTicketStatus === 'number')
                                        ? extendedTicket.BulkTicketStatus !== 0
                                        : (typeof extendedTicket.Status === 'number' 
                                            ? extendedTicket.Status !== 0 
                                            : true)
                                      return isActive ? "text-destructive" : "text-green-600"
                                    })()}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    {(() => {
                                      const isActive = (typeof extendedTicket.BulkTicketStatus === 'number')
                                        ? extendedTicket.BulkTicketStatus !== 0
                                        : (typeof extendedTicket.Status === 'number' 
                                            ? extendedTicket.Status !== 0 
                                            : true)
                                      return isActive ? "Disable" : "Enable"
                                    })()}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const batchId = ticket.BatchId || ticket._id || ''
                                      const ticketName = extendedTicket.TicketName || ticket.BulkTicketName || ''
                                      if (batchId) handleDownloadBulkTicketReport(batchId, ticketName)
                                    }}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Report
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create {activeTab === "normal" ? "Normal" : "Bulk"} Ticket
            </DialogTitle>
            <DialogDescription>
              Add a new {activeTab === "normal" ? "normal" : "bulk"} ticket to this event
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="normal">Normal Ticket</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Ticket</TabsTrigger>
            </TabsList>

            {/* Normal Ticket Form */}
            <TabsContent value="normal" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticketName">Ticket Name</Label>
                  <Input
                    id="ticketName"
                    value={normalFormData.TicketName}
                    onChange={(e) => setNormalFormData(prev => ({ ...prev, TicketName: e.target.value }))}
                  />
                </div>                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visibilityLevel">Visibility</Label>
                    <Select
                      value={normalFormData.VisibilityLevel.toString()}
                      onValueChange={handleVisibilityChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">All</SelectItem>
                        <SelectItem value="2">All Customers</SelectItem>
                        <SelectItem value="3">Promoters</SelectItem>
                      </SelectContent>
                    </Select>                    {normalFormData.VisibilityLevel === 3 && selectedPromoters.length > 0 && (
                      <div className="text-sm text-muted-foreground space-y-2">
                        <div className="flex items-center justify-between">
                          <span>{selectedPromoters.length} promoter(s) selected</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPromoterSearchTerm("")
                              setShowPromoterModal(true)
                            }}
                          >
                            Edit Selection
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedPromoters.map(promoterId => {
                            const promoter = promoters.find(p => p._id === promoterId)
                            return promoter ? (
                              <Badge key={promoterId} variant="secondary" className="text-xs">
                                {promoter.FullName}
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </div>                    )}                  </div>
                </div>

                {/* Event Date & Time Selection */}
                {eventDateTimes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Event Date & Time Selection</Label>
                    {isMultiDateEvent || eventDateTimes.length > 1 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          This is a multi-day event. Select the dates for which this ticket is valid:
                        </p>
                        <div className="grid gap-2 max-h-48 overflow-y-auto">
                          {eventDateTimes.map((dateTime) => (
                            <div
                              key={dateTime._id}
                              className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50"
                            >
                              <Checkbox
                                id={`datetime-${dateTime._id}`}
                                checked={selectedEventDateTimes.includes(dateTime._id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedEventDateTimes(prev => [...prev, dateTime._id])
                                  } else {
                                    setSelectedEventDateTimes(prev => prev.filter(id => id !== dateTime._id))
                                  }
                                }}
                              />
                              <label
                                htmlFor={`datetime-${dateTime._id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {new Date(dateTime.EventStartDateTime).toLocaleDateString()} - {new Date(dateTime.EventStartDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to {new Date(dateTime.EventEndDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {selectedEventDateTimes.length} of {eventDateTimes.length} dates selected
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEventDateTimes(eventDateTimes.map(dt => dt._id))}
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEventDateTimes([])}
                            >
                              Clear All
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted rounded-md text-sm">
                        {new Date(eventDateTimes[0].EventStartDateTime).toLocaleDateString()} - {new Date(eventDateTimes[0].EventStartDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to {new Date(eventDateTimes[0].EventEndDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ticketDescription">Description</Label>
                  <Textarea
                    id="ticketDescription"
                    value={normalFormData.TicketDescription}
                    onChange={(e) => setNormalFormData(prev => ({ ...prev, TicketDescription: e.target.value }))}
                  />
                </div>                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketPrice">Price (₹)</Label>
                    <Input
                      id="ticketPrice"
                      type="number"
                      value={normalFormData.TicketPrice}
                      onChange={(e) => setNormalFormData(prev => ({ ...prev, TicketPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxQuantity">Total Quantity</Label>
                    <Input
                      id="maxQuantity"
                      type="number"
                      value={normalFormData.MaxQuantity}
                      onChange={(e) => setNormalFormData(prev => ({ ...prev, MaxQuantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bookingMaxLimit">Booking Max Limit</Label>
                    <Input
                      id="bookingMaxLimit"
                      type="number"
                      value={normalFormData.BookingMaxLimit}
                      onChange={(e) => setNormalFormData(prev => ({ ...prev, BookingMaxLimit: parseInt(e.target.value) || 0 }))}
                    />                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>                <Button
                  onClick={handleCreateTicket}
                  disabled={loading || !normalFormData.TicketName || 
                    (isMultiDateEvent || eventDateTimes.length > 1 
                      ? selectedEventDateTimes.length === 0 
                      : !normalFormData.EventDateTime_id)}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Ticket
                </Button>
              </div>
            </TabsContent>

            {/* Bulk Ticket Form */}
            <TabsContent value="bulk" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkTicketName">Ticket Name*</Label>
                  <Input
                    id="bulkTicketName"
                    value={bulkFormData.TicketName}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, TicketName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name*</Label>
                  <Input
                    id="customerName"
                    value={bulkFormData.CustomerName}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, CustomerName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number*</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={bulkFormData.PhoneNumber}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, PhoneNumber: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email*</Label>
                  <Input
                    id="email"
                    type="email"
                    value={bulkFormData.Email}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, Email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventDateTime">Select Date*</Label>
                  <Select
                    value={bulkFormData.EventDateTime_id}
                    onValueChange={(value) => setBulkFormData(prev => ({ ...prev, EventDateTime_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event date & time" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventDateTimes.map((dateTime) => (
                        <SelectItem key={dateTime._id} value={dateTime._id}>
                          {new Date(dateTime.EventStartDateTime).toLocaleDateString()} - {new Date(dateTime.EventStartDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to {new Date(dateTime.EventEndDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalQuantity">Total Quantity* (Max: 20)</Label>
                    <Input
                      id="totalQuantity"
                      type="number"
                      min="1"
                      max="20"
                      value={bulkFormData.TotalQuantity}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, TotalQuantity: parseInt(e.target.value) || 0 }))}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Maximum 20 tickets can be booked per transaction</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkTicketPrice">Ticket Price*</Label>
                    <Input
                      id="bulkTicketPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkFormData.TicketPrice}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, TicketPrice: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={bulkTicketCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={bulkTicketCreating || !bulkFormData.TicketName || !bulkFormData.CustomerName || !bulkFormData.PhoneNumber || !bulkFormData.Email || !bulkFormData.EventDateTime_id || !bulkFormData.TotalQuantity || bulkFormData.TotalQuantity < 1 || bulkFormData.TotalQuantity > 20 || !bulkFormData.TicketPrice}
                >
                  {bulkTicketCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {bulkTicketCreating ? "Creating Bulk Ticket..." : "Create Bulk Ticket"}
                </Button>
              </div>
              
              {bulkTicketCreating && (
                <div className="text-sm text-muted-foreground text-center p-4 bg-blue-50 rounded-lg">
                  <p>Creating bulk tickets and sending confirmation emails...</p>
                  <p>This process may take a few moments. Please do not close this window.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>
              Update ticket information
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="grid gap-4">
              {/* Edit form fields based on ticket type */}
              {"TicketName" in selectedTicket ? (
                // Normal ticket edit form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="editTicketName">Ticket Name</Label>
                    <Input
                      id="editTicketName"
                      value={editFormData.TicketName || ""}
                      onChange={(e) => setEditFormData((prev: any) => ({ ...prev, TicketName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editTicketType">Ticket Type</Label>
                    <Select
                      value={editFormData.TicketType?.toString() || ""}
                      onValueChange={(value) => setEditFormData((prev: any) => ({ ...prev, TicketType: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Single Day</SelectItem>
                        <SelectItem value="2">Multiple Day</SelectItem>
                        <SelectItem value="3">Season Pass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editTicketPrice">Price (₹)</Label>
                      <Input
                        id="editTicketPrice"
                        type="number"
                        value={editFormData.TicketPrice || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, TicketPrice: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editMaxQuantity">Max Quantity</Label>
                      <Input
                        id="editMaxQuantity"
                        type="number"
                        value={editFormData.TicketQuantity || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, TicketQuantity: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </>
              ) : (
                // Bulk ticket edit form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="editBulkTicketName">Bulk Ticket Name</Label>
                    <Input
                      id="editBulkTicketName"
                      value={editFormData.BulkTicketName || ""}
                      onChange={(e) => setEditFormData((prev: any) => ({ ...prev, BulkTicketName: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editBulkTicketPrice">Price (₹)</Label>
                      <Input
                        id="editBulkTicketPrice"
                        type="number"
                        value={editFormData.BulkTicketPrice || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, BulkTicketPrice: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editBulkMinQuantity">Min Quantity</Label>
                      <Input
                        id="editBulkMinQuantity"
                        type="number"
                        value={editFormData.MinBulkTicketPerTransaction || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, MinBulkTicketPerTransaction: parseInt(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editBulkMaxQuantity">Max Quantity</Label>
                      <Input
                        id="editBulkMaxQuantity"
                        type="number"
                        value={editFormData.MaxBulkTicketPerTransaction || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, MaxBulkTicketPerTransaction: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditTicket}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Ticket
                </Button>
              </div>
            </div>          )}
        </DialogContent>
      </Dialog>

      {/* Promoter Selection Modal */}
      <Dialog open={showPromoterModal} onOpenChange={setShowPromoterModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Promoters</DialogTitle>
            <DialogDescription>
              Choose from promoters assigned to this event who can access this ticket
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search promoters..."
                value={promoterSearchTerm}
                onChange={(e) => setPromoterSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Promoters List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredPromoters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {promoterSearchTerm 
                    ? "No assigned promoters found matching your search" 
                    : "No promoters are currently assigned to this event. Please assign promoters to the event first."
                  }
                </div>
              ) : (
                filteredPromoters.map((promoter) => (                  <div
                    key={promoter._id}
                    className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => handlePromoterSelection(promoter._id)}
                  >
                    <Checkbox
                      checked={selectedPromoters.includes(promoter._id)}
                      onCheckedChange={() => handlePromoterSelection(promoter._id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{promoter.FullName}</div>
                      <div className="text-sm text-muted-foreground">{promoter.Email || 'No email'}</div>
                      <div className="text-sm text-muted-foreground">{promoter.Phone1 || 'No phone'}</div>
                    </div>
                    <Badge variant={promoter.Status === "Active" ? "default" : "secondary"}>
                      {promoter.Status === "Active" ? "Active" : promoter.Status || "Inactive"}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            {/* Selected Count */}
            {selectedPromoters.length > 0 && (
              <div className="text-sm font-medium">
                {selectedPromoters.length} promoter(s) selected
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">            <Button
              variant="outline"
              onClick={() => {
                setShowPromoterModal(false)
                // Don't reset selected promoters when canceling, keep the previous selection
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePromoterModalSave}>
              Save Selection ({selectedPromoters.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation Modal */}
      <Dialog open={showStatusConfirmModal} onOpenChange={setShowStatusConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {pendingStatusChange && (
                <>
                  Are you sure you want to {pendingStatusChange.action} the ticket "{pendingStatusChange.ticketName}"?
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusConfirmModal(false)
                setPendingStatusChange(null)
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={loading}
              variant={pendingStatusChange?.action === 'disable' ? 'destructive' : 'default'}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pendingStatusChange?.action === 'disable' ? 'Disable' : 'Enable'} Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
