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

// Extended interfaces to handle both old and new API response structures
interface ExtendedNormalTicket extends NormalTicket {
  // New field names from backend response
  Name?: string
  EventTicketType?: number
  Price?: number
  Description?: string
  Quantity?: number
  // Availability status fields - based on actual API response
  EventTicketStatus?: number        // 1 = Sold Out, 0 = Available (THIS IS THE CORRECT FIELD)
  EventTicketAvailability?: number  // Different field, unclear usage
  AvailabilityStatus?: string
  IsSoldOut?: boolean
}

interface ExtendedBulkTicket extends BulkTicket {
  // Add any new bulk ticket fields if needed
}

interface EventDateTime {
  _id: string
  event_id: string
  date: string
  start_time: string
  end_time: string
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
  BulkTicketName: string
  BulkTicketType: number
  BulkTicketDescription: string
  EventDateTime_id: string
  BulkTicketPrice: number
  BulkMinQuantity: number
  BulkMaxQuantity: number
  BulkTicketStatus: number
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

  // Modal states
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showPromoterModal, setShowPromoterModal] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<ExtendedNormalTicket | ExtendedBulkTicket | null>(null)
  const [selectedPromoters, setSelectedPromoters] = React.useState<string[]>([])
  const [promoterSearchTerm, setPromoterSearchTerm] = React.useState("")

  // Form states - separate for normal and bulk tickets
  const [normalFormData, setNormalFormData] = React.useState<CreateNormalTicketForm>({
    TicketName: "",
    TicketType: 1,
    TicketDescription: "",
    EventDateTime_id: "",
    TicketPrice: 0,
    MaxQuantity: 0,
    BookingMaxLimit: 0,
    TicketStatus: 1,
    VisibilityLevel: 1
  })
  
  const [bulkFormData, setBulkFormData] = React.useState<CreateBulkTicketForm>({
    BulkTicketName: "",
    BulkTicketType: 4,
    BulkTicketDescription: "",
    EventDateTime_id: "",
    BulkTicketPrice: 0,
    BulkMinQuantity: 0,
    BulkMaxQuantity: 0,
    BulkTicketStatus: 1
  })
  
  const [editFormData, setEditFormData] = React.useState<any>({})

  // Helper functions
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
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
          setPromoters(data.data || [])
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
          
          // Set event date times and auto-populate forms
          if (data.data.EventDateTime && data.data.EventDateTime.length > 0) {
            console.log("Event date times found:", data.data.EventDateTime)
            setEventDateTimes(data.data.EventDateTime)
            const firstDateTime = data.data.EventDateTime[0]
            
            console.log("First date time:", firstDateTime)
            console.log("Auto-populating forms with EventDateTime_id:", firstDateTime._id)
            
            // Auto-populate both forms with the first event date/time
            setNormalFormData(prev => ({ 
              ...prev, 
              EventDateTime_id: firstDateTime._id 
            }))
            setBulkFormData(prev => ({ 
              ...prev, 
              EventDateTime_id: firstDateTime._id 
            }))
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

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      console.log("Fetching tickets for eventId:", eventId)
      
      const payload = {
        event_id: eventId,
        AdminRole: getNumericRole(role),
        user_id: user.user_id,
      }

      console.log("Tickets API Payload:", JSON.stringify(payload, null, 2))      // Fetch normal tickets using the new endpoint
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
          if (normalData.data && normalData.data.EventTicketsData) {            console.log("Using new response structure - EventTicketsData")
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

      // Fetch bulk tickets
      const bulkTicketsResponse = await fetch(ticketEndPoint.GET_ALL_BULK_TICKETS_BY_EVENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      console.log("Bulk tickets response status:", bulkTicketsResponse.status)

      if (bulkTicketsResponse.ok) {
        const bulkData = await bulkTicketsResponse.json()
        console.log("Bulk tickets response data:", JSON.stringify(bulkData, null, 2))
        
        if (!bulkData.error) {
          // For now, assuming bulk tickets follow similar structure
          setBulkTickets(bulkData.data || [])
        } else {
          console.error("Bulk tickets API returned error:", bulkData)
        }
      } else {
        const errorText = await bulkTicketsResponse.text()
        console.error("Bulk tickets API call failed:", bulkTicketsResponse.status, errorText)
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (ticketId: string, currentStatus: number, isNormal: boolean) => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      const newStatus = currentStatus === 1 ? 0 : 1
      const endpoint = isNormal
        ? (newStatus === 1 ? ticketEndPoint.ENABLE_TICKET : ticketEndPoint.DISABLE_TICKET)
        : (newStatus === 1 ? ticketEndPoint.ENABLE_BULK_TICKET : ticketEndPoint.DISABLE_BULK_TICKET)

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
          description: `Ticket ${newStatus === 1 ? "enabled" : "disabled"} successfully`,
        })
        fetchTickets()
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
        fetchTickets()
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
      setTicketLoadingStates(prev => ({ ...prev, [ticketId]: true }))      // Optimistic update - update the UI immediately
      const optimisticUpdate = (tickets: any[]) => 
        tickets.map(ticket => {
          if (ticket._id === ticketId) {
            return {
              ...ticket,
              EventTicketStatus: currentIsSoldOut ? 0 : 1, // 0 = Available, 1 = Sold Out
              EventTicketAvailability: currentIsSoldOut ? 0 : 1, // Keep both for compatibility
              IsSoldOut: !currentIsSoldOut,
              AvailabilityStatus: currentIsSoldOut ? "Available" : "SoldOut"
            }
          }
          return ticket
        })
      
      // Apply optimistic update
      setNormalTickets(prev => optimisticUpdate(prev))
      
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
          await fetchTickets()
        } else {
          console.error("API returned error:", data)
          // Revert optimistic update on error
          setNormalTickets(prev => optimisticUpdate(prev))
          throw new Error(data.message || "Failed to update availability")
        }
      } else {
        const errorText = await response.text()
        console.error("Toggle availability API call failed:", response.status, errorText)
        // Revert optimistic update on error
        setNormalTickets(prev => optimisticUpdate(prev))
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
      setLoading(true)
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
      if (activeTab === "normal" && !normalFormData.EventDateTime_id) {
        toast({
          title: "Validation Error",
          description: "Event date & time is required. Please wait for event data to load.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      
      // Validate event date/time selection for bulk tickets
      if (activeTab === "bulk" && !bulkFormData.EventDateTime_id) {
        toast({
          title: "Validation Error", 
          description: "Event date & time is required. Please wait for event data to load.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      
      const endpoint = activeTab === "normal" 
        ? ticketEndPoint.CREATE_NORMAL_TICKET 
        : ticketEndPoint.CREATE_BULK_TICKET

      let payload: any = {
        Event_id: eventId,
      }
      
      if (activeTab === "normal") {
        payload = {
          ...payload,
          Name: normalFormData.TicketName,
          EventTicketType: normalFormData.TicketType.toString(),
          Description: normalFormData.TicketDescription,
          EventDateTimeIds: [{ eventDateTime_id: normalFormData.EventDateTime_id }],
          Price: normalFormData.TicketPrice,
          Quantity: normalFormData.MaxQuantity,
          BookingMaxLimit: normalFormData.BookingMaxLimit,
          EventTicketVisibility: normalFormData.VisibilityLevel.toString()
        }
        
        // Include selected promoters if visibility is set to "Promoters"
        if (normalFormData.VisibilityLevel === 3 && selectedPromoters.length > 0) {
          payload.PromoterIds = selectedPromoters
        }
      } else {
        payload = {
          ...payload,
          Name: bulkFormData.BulkTicketName,
          Type: bulkFormData.BulkTicketType,
          Description: bulkFormData.BulkTicketDescription,
          EventDateTime_id: bulkFormData.EventDateTime_id,
          Price: bulkFormData.BulkTicketPrice,
          MinQuantity: bulkFormData.BulkMinQuantity,
          MaxQuantity: bulkFormData.BulkMaxQuantity,
          Status: bulkFormData.BulkTicketStatus
        }
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
          description: "Ticket created successfully",
        })
        setShowCreateModal(false)
        setSelectedPromoters([]) // Reset selected promoters
        if (activeTab === "normal") {
          setNormalFormData({
            TicketName: "",
            TicketType: 1,
            TicketDescription: "",
            EventDateTime_id: eventDateTimes.length > 0 ? eventDateTimes[0]._id : "",
            TicketPrice: 0,
            MaxQuantity: 0,
            BookingMaxLimit: 0,
            TicketStatus: 1,
            VisibilityLevel: 1
          })
        } else {
          setBulkFormData({
            BulkTicketName: "",
            BulkTicketType: 4,
            BulkTicketDescription: "",
            EventDateTime_id: eventDateTimes.length > 0 ? eventDateTimes[0]._id : "",
            BulkTicketPrice: 0,
            BulkMinQuantity: 0,
            BulkMaxQuantity: 0,
            BulkTicketStatus: 1
          })
        }
        fetchTickets()
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
        fetchTickets()
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

  // ...existing code...

  // Effects
  React.useEffect(() => {
    fetchTickets()
    fetchPromoters()
    fetchEventDateTimes()
  }, [eventId, user])

  const handleOpenCreateModal = () => {
    // Auto-populate form with event data when opening modal
    if (eventDateTimes.length > 0) {
      const firstDateTime = eventDateTimes[0]
      setNormalFormData(prev => ({ 
        ...prev, 
        EventDateTime_id: firstDateTime._id 
      }))
      setBulkFormData(prev => ({ 
        ...prev, 
        EventDateTime_id: firstDateTime._id 
      }))
    }
    setShowCreateModal(true)
  }
  const handleVisibilityChange = (value: string) => {
    setNormalFormData(prev => ({ ...prev, VisibilityLevel: parseInt(value) }))
    
    // Open promoter selection modal if "Promoters" is selected
    if (value === "3") {
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
  }  // Filter promoters based on search
  const filteredPromoters = promoters.filter(promoter =>
    promoter.FullName.toLowerCase().includes(promoterSearchTerm.toLowerCase()) ||
    promoter.Email.toLowerCase().includes(promoterSearchTerm.toLowerCase()) ||
    promoter.Phone1.includes(promoterSearchTerm)
  )

  const filteredNormalTickets = normalTickets.filter(ticket => {
    const extendedTicket = ticket as ExtendedNormalTicket
    const ticketName = extendedTicket.Name || ticket.TicketName || ''
    
    // Check availability based on the actual API response structure
    // EventTicketStatus: 1 = Sold Out, 0 = Available
    const isSoldOut = extendedTicket.EventTicketStatus === 1 ||
                     extendedTicket.IsSoldOut || 
                     extendedTicket.AvailabilityStatus === "SoldOut" || 
                     extendedTicket.AvailabilityStatus === "sold_out"
    
    const matchesSearch = ticketName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAvailability = availabilityFilter === "all" || 
                               (availabilityFilter === "available" && !isSoldOut) ||
                               (availabilityFilter === "soldout" && isSoldOut)
    
    return matchesSearch && matchesAvailability
  })
  const filteredBulkTickets = bulkTickets.filter(ticket => {
    const ticketName = ticket.BulkTicketName || ''
    const matchesSearch = ticketName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
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
          <div className="flex gap-4">
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
            <div className="min-w-[200px]">
              <Label htmlFor="availability">Availability</Label>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by availability" />
                </SelectTrigger>                <SelectContent>
                  <SelectItem value="all">All Availability</SelectItem>
                  <SelectItem value="available" className="text-green-600">Available</SelectItem>
                  <SelectItem value="soldout" className="text-red-600">Sold Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                      <TableHead>Availability</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredNormalTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
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
                              <div className="flex items-center gap-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only"                                    checked={(() => {
                                      // EventTicketStatus: 1 = Sold Out, 0 = Available
                                      const isSoldOut = extendedTicket.EventTicketStatus === 1 ||
                                                      extendedTicket.IsSoldOut || 
                                                      extendedTicket.AvailabilityStatus === "SoldOut" || 
                                                      extendedTicket.AvailabilityStatus === "sold_out"
                                      return !isSoldOut // Toggle is ON when available, OFF when sold out
                                    })()}
                                    onChange={() => {
                                      const isSoldOut = extendedTicket.EventTicketStatus === 1 ||
                                                      extendedTicket.IsSoldOut || 
                                                      extendedTicket.AvailabilityStatus === "SoldOut" || 
                                                      extendedTicket.AvailabilityStatus === "sold_out"
                                      handleToggleAvailability(ticket._id, isSoldOut)
                                    }}
                                    disabled={ticketLoadingStates[ticket._id] || false}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>                                <span className={`text-sm font-medium ${(() => {
                                  const isSoldOut = extendedTicket.EventTicketStatus === 1 ||
                                                  extendedTicket.IsSoldOut || 
                                                  extendedTicket.AvailabilityStatus === "SoldOut" || 
                                                  extendedTicket.AvailabilityStatus === "sold_out"
                                  return isSoldOut ? "text-red-600" : "text-green-600"
                                })()}`}>
                                  {(() => {
                                    const isSoldOut = extendedTicket.EventTicketStatus === 1 ||
                                                    extendedTicket.IsSoldOut || 
                                                    extendedTicket.AvailabilityStatus === "SoldOut" || 
                                                    extendedTicket.AvailabilityStatus === "sold_out"
                                    return isSoldOut ? "Sold Out" : "Available"
                                  })()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(ticket.createdAt)}
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
                                    className="text-destructive"
                                    onClick={() => handleDeleteTicket(ticket._id, true)}
                                  >
                                    Delete
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
                      <TableHead>Ticket Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Min Qty</TableHead>
                      <TableHead>Max Qty</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredBulkTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No bulk tickets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBulkTickets.map((ticket) => (
                        <TableRow key={ticket._id}>
                          <TableCell className="font-medium">
                            {ticket.BulkTicketName}
                          </TableCell>
                          <TableCell>
                            {getTicketTypeName(ticket.BulkTicketType)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(ticket.BulkTicketPrice)}
                          </TableCell>
                          <TableCell>
                            {ticket.MinBulkTicketPerTransaction || 0}
                          </TableCell>                          <TableCell>
                            {ticket.MaxBulkTicketPerTransaction || 0}
                          </TableCell>
                          <TableCell>
                            {formatDate(ticket.createdAt)}
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
                                  onClick={() => handleOpenEditModal(ticket)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(ticket._id, ticket.BulkTicketStatus, false)}
                                >
                                  {ticket.BulkTicketStatus === 1 ? "Disable" : "Enable"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteTicket(ticket._id, false)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                </div>                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketType">Event Type</Label>
                    <Select
                      value={normalFormData.TicketType.toString()}
                      onValueChange={(value) => setNormalFormData(prev => ({ ...prev, TicketType: parseInt(value) }))}
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
                  </div>                  <div className="space-y-2">
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

                {/* Show selected event date/time info (read-only) */}
                {eventDateTimes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Event Date & Time</Label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {new Date(eventDateTimes[0].date).toLocaleDateString()} - {eventDateTimes[0].start_time} to {eventDateTimes[0].end_time}
                    </div>
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
                  disabled={loading || !normalFormData.TicketName || !normalFormData.EventDateTime_id}
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
                  <Label htmlFor="bulkTicketName">Bulk Ticket Name</Label>
                  <Input
                    id="bulkTicketName"
                    value={bulkFormData.BulkTicketName}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkTicketName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkTicketType">Ticket Type</Label>
                  <Select
                    value={bulkFormData.BulkTicketType.toString()}
                    onValueChange={(value) => setBulkFormData(prev => ({ ...prev, BulkTicketType: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">Bulk</SelectItem>
                    </SelectContent>                  </Select>
                </div>

                {/* Show selected event date/time info (read-only) */}
                {eventDateTimes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Event Date & Time</Label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {new Date(eventDateTimes[0].date).toLocaleDateString()} - {eventDateTimes[0].start_time} to {eventDateTimes[0].end_time}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bulkTicketDescription">Description</Label>
                  <Textarea
                    id="bulkTicketDescription"
                    value={bulkFormData.BulkTicketDescription}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkTicketDescription: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkTicketPrice">Price (₹)</Label>
                    <Input
                      id="bulkTicketPrice"
                      type="number"
                      value={bulkFormData.BulkTicketPrice}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkTicketPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkMinQuantity">Min Quantity</Label>
                    <Input
                      id="bulkMinQuantity"
                      type="number"
                      value={bulkFormData.BulkMinQuantity}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkMinQuantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkMaxQuantity">Max Quantity</Label>
                    <Input
                      id="bulkMaxQuantity"
                      type="number"
                      value={bulkFormData.BulkMaxQuantity}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkMaxQuantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkTicketStatus">Status</Label>
                  <Select
                    value={bulkFormData.BulkTicketStatus.toString()}
                    onValueChange={(value) => setBulkFormData(prev => ({ ...prev, BulkTicketStatus: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Active</SelectItem>
                      <SelectItem value="0">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
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
                  disabled={loading || !bulkFormData.BulkTicketName || !bulkFormData.EventDateTime_id}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Bulk Ticket
                </Button>
              </div>
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
              Choose promoters who can access this ticket
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
                  {promoterSearchTerm ? "No promoters found matching your search" : "No promoters found"}
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
                      <div className="text-sm text-muted-foreground">{promoter.Email}</div>
                      <div className="text-sm text-muted-foreground">{promoter.Phone1}</div>
                    </div>
                    <Badge variant={promoter.Status === "Active" ? "default" : "secondary"}>
                      {promoter.Status}
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
    </div>
  )
}
