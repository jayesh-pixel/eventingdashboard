"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { formatEventDate, formatEventTime } from "@/lib/utils"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  Check,
  ChevronsUpDown,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Ticket,
  Users,
  X,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { getNumericRole } from "@/lib/role-mapping"
import { eventEndPoint, promoterEndpoint, ticketEndPoint } from "@/lib/api-endpoints"
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
  Status?: number                   // Standard status field: 1 = Active, 0 = Disabled
  AvailabilityStatus?: string
  IsSoldOut?: boolean
  // Visibility and promoter fields
  EventTicketVisibility?: string | number
  EventPromoters?: any[]
  BookingMaxLimit?: number
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
  
  // Add missing fields for compatibility
  Description?: string
  EventTicketVisibility?: string | number
  EventPromoters?: any[]
  BookingMaxLimit?: number
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
  Username: string
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
  const [nameFilter, setNameFilter] = React.useState<string>("all")
  const [dateFilter, setDateFilter] = React.useState<string>("all")
  
  // Track which tabs have been loaded to avoid unnecessary API calls
  const [loadedTabs, setLoadedTabs] = React.useState<Set<string>>(new Set())

  // Modal states
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showPromoterModal, setShowPromoterModal] = React.useState(false)
  const [showStatusConfirmModal, setShowStatusConfirmModal] = React.useState(false)
  const [createTicketError, setCreateTicketError] = React.useState<string | null>(null)
  const [pendingStatusChange, setPendingStatusChange] = React.useState<{
    ticketId: string
    currentStatus: number
    isNormal: boolean
    ticketName: string
    action: 'enable' | 'disable'
  } | null>(null)
  const [selectedTicket, setSelectedTicket] = React.useState<ExtendedNormalTicket | ExtendedBulkTicket | null>(null)
  const [selectedTicketType, setSelectedTicketType] = React.useState<'normal' | 'bulk' | null>(null)
  const [selectedPromoters, setSelectedPromoters] = React.useState<string[]>([])
  const [promoterSearchTerm, setPromoterSearchTerm] = React.useState("")
  const [editPromoterSearchTerm, setEditPromoterSearchTerm] = React.useState("")
  const [editPromoterPopoverOpen, setEditPromoterPopoverOpen] = React.useState(false)

  // Form states - separate for normal and bulk tickets
  const [normalFormData, setNormalFormData] = React.useState<CreateNormalTicketForm>({
    TicketName: "",
    TicketType: 1, // Will be set automatically based on event type
    TicketDescription: "",
    EventDateTime_id: "",
    TicketPrice: 0,
    MaxQuantity: 0,
    BookingMaxLimit: 10, // Default to 10
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
  // Event date/times come back as wall-clock values tagged +00:00, so format
  // them with the shared helper instead of converting into another timezone.
  const formatDate = (dateString: string) =>
    formatEventDate(dateString, { month: "short", day: "numeric", year: "numeric" }, "en-US")

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

  // Build a name lookup from the event's embedded promoter references.  The event
  // stores only promoter_id + PromoterName, but the hydrated GET_EVENT_PROMOTERS
  // records use _id + FullName, so we keep both maps to resolve names correctly.
  const [eventPromoterNameMap, setEventPromoterNameMap] = React.useState<Map<string, string>>(new Map())

  // GET_EVENT_PROMOTERS rows sometimes wrap the promoter document under
  // PromoterData/promoter/Promoter instead of returning it flat, so always read
  // both levels; otherwise every field comes back empty and the row renders as
  // "Unknown Promoter" / "No phone" / "Inactive".
  const unwrapPromoter = (p: any): any =>
    p?.PromoterData ?? p?.promoterData ?? p?.promoter ?? p?.Promoter ?? p

  const pickField = (p: any, keys: string[]): any => {
    const nested = unwrapPromoter(p)
    for (const key of keys) {
      const value = p?.[key] ?? (nested !== p ? nested?.[key] : undefined)
      if (typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null) {
        return typeof value === "string" ? value.trim() : value
      }
    }
    return undefined
  }

  const pickPromoterName = (p: any): string =>
    pickField(p, [
      "Username",
      "username",
      "PromoterUsername",
      "promoterUsername",
      "PromoterName",
      "promoterName",
      "FullName",
      "fullName",
      "CompanyName",
      "name",
    ]) ?? ""

  const mapToPromoter = (p: any, nameMap?: Map<string, string>): Promoter => {
    // promoter_id is the promoter's real id; _id on these records is often the
    // join-row id (event<->promoter link), which the backend does NOT accept
    // when saving a ticket's EventPromoters — it 404s with
    // "Event Assigned Promoters Not Found". Only fall back to _id for records
    // that have no promoter_id at all (e.g. the raw promoter directory, where
    // _id IS the promoter's real id).
    const id = p?.promoter_id ?? p?.Promoter_id ?? p?.promoterId ?? p?._id ?? p?.id ?? ""
    // Guard against non-Map values (e.g. Array.map's index argument) being passed in.
    const fallbackMap = nameMap instanceof Map ? nameMap : eventPromoterNameMap
    const name = pickPromoterName(p) || fallbackMap.get(id) || ""
    return {
      _id: id,
      FullName: name || "Unknown Promoter",
      Username: name,
      Email: pickField(p, ["Email", "email"]) ?? "",
      Phone1: pickField(p, ["Phone1", "phone1", "Phone", "phone", "PhoneNumber", "MobileNumber"]) ?? "",
      Status: normalizeStatus(pickField(p, ["Status", "status", "PromoterStatus", "is_active", "IsActive"])),
    }
  }

  // GET_ALL_EVENT_TICKETS (the tickets list call) embeds EventPromotersData:
  // [{ promoterName, promoter_id }] alongside the tickets themselves. It is the
  // most reliable source of assigned-promoter names for this event, so patch
  // any promoter still missing a name as soon as this comes back.
  const applyPromoterNamesFromTicketsResponse = (list: any[]) => {
    if (!Array.isArray(list) || list.length === 0) return

    const nameById = new Map<string, string>()
    list.forEach((p) => {
      const id = p?.promoter_id ?? p?.Promoter_id ?? p?._id ?? p?.id
      const name = pickPromoterName(p)
      if (id && name) nameById.set(String(id), name)
    })
    if (nameById.size === 0) return

    setEventPromoterNameMap((prev) => {
      const next = new Map(prev)
      nameById.forEach((name, id) => next.set(id, name))
      return next
    })

    setPromoters((prev) => {
      if (prev.length === 0) {
        return Array.from(nameById.entries()).map(([id, name]) => ({
          _id: id,
          FullName: name,
          Username: name,
          Email: "",
          Phone1: "",
          Status: "Inactive",
        }))
      }
      let changed = false
      const next = prev.map((p) => {
        const name = nameById.get(p._id)
        if (!name || p.Username) return p
        changed = true
        return { ...p, FullName: name, Username: name }
      })
      return changed ? next : prev
    })
  }

  const getAssignedPromotersFromEvent = (event: any): Promoter[] => {
    const sources = [
      ...(Array.isArray(event?.PopUpPromoterData) ? event.PopUpPromoterData : []),
      ...(Array.isArray(event?.EventPromoter) ? event.EventPromoter : []),
      ...(Array.isArray(event?.EventPromoters) ? event.EventPromoters : []),
      ...(Array.isArray(event?.Promoters) ? event.Promoters : []),
    ]

    // Populate a name map from embedded promoter references.  These references
    // only carry promoter_id + PromoterName, which is the only place the assigned
    // name is guaranteed to exist for organizers viewing their own events.
    const newNameMap = new Map<string, string>()
    sources.forEach((p) => {
      const id = p?.promoter_id ?? p?.Promoter_id ?? p?.promoterId ?? p?._id ?? p?.id ?? ""
      const name = pickPromoterName(p)
      if (id && name) {
        newNameMap.set(id, name)
      }
    })
    setEventPromoterNameMap(newNameMap)

    const uniquePromoters = new Map<string, Promoter>()
    sources.map((p) => mapToPromoter(p, newNameMap)).forEach((promoter) => {
      if (promoter._id && !uniquePromoters.has(promoter._id)) {
        uniquePromoters.set(promoter._id, promoter)
      }
    })

    return Array.from(uniquePromoters.values())
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
  
  // Field-by-field merge: the hydrated record wins, but only where it actually
  // carries a value, so a nameless hydrated row never wipes out a seeded name.
  const mergePromoter = (seeded: Promoter, hydrated: Promoter): Promoter => {
    const name =
      (hydrated.Username || (hydrated.FullName !== "Unknown Promoter" ? hydrated.FullName : "")) ||
      (seeded.Username || (seeded.FullName !== "Unknown Promoter" ? seeded.FullName : ""))
    return {
      _id: hydrated._id || seeded._id,
      FullName: name || "Unknown Promoter",
      Username: name,
      Email: hydrated.Email || seeded.Email,
      Phone1: hydrated.Phone1 || seeded.Phone1,
      Status: hydrated.Status || seeded.Status,
    }
  }

  // API Functions
  // `allowedIds`, when provided and non-empty, restricts the result to the event's
  // assigned promoters so the ticket selector never lists unassigned promoters.
  const fetchPromoters = async (allowedIds?: Set<string>) => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken) return

      const response = await fetch(eventEndPoint.GET_EVENT_PROMOTERS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          AdminRole: getNumericRole(role),
          user_id: user.user_id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.error) {
          const list = Array.isArray(data.data)
            ? data.data
            : data.data?.EventPromoters || data.data?.PromoterData || data.data?.promoters || []
          // Note: pass an arrow wrapper — list.map(mapToPromoter) would pass the
          // array index as the second arg (nameMap), breaking fallbackMap.get().
          const normalized: Promoter[] = list.map((p: any) => mapToPromoter(p))
          if (normalized.some((p) => !p.Username)) {
            // Keeps the payload shape visible when a promoter still has no name.
            console.warn("GET_EVENT_PROMOTERS returned records without a usable name:", list)
          }

          // Match hydrated records against the event's assigned promoter IDs.
          // A promoter may be referenced by different id fields (_id vs promoter_id),
          // so collect every possible id from the hydrated record before checking.
          const allIdsOf = (p: Promoter): string[] => {
            const ids = [
              p._id,
              (p as any).promoter_id,
              (p as any).Promoter_id,
              (p as any).promoterId,
              (p as any).id,
            ]
            return ids.filter((id): id is string => Boolean(id))
          }

          let scoped: Promoter[]
          if (allowedIds && allowedIds.size > 0) {
            scoped = normalized.filter((p) =>
              allIdsOf(p).some((id) => allowedIds.has(id))
            )
            // If the id-based scoping dropped everything (id mismatch between the
            // event's embedded references and the hydrated promoter records), fall
            // back to the full hydrated list rather than leaving "Unknown Promoter".
            if (scoped.length === 0 && normalized.length > 0) {
              scoped = normalized
            }
          } else {
            scoped = normalized
          }

          // Merge: prefer hydrated names/details, but keep any seeded promoter that
          // wasn't returned by the API so nothing disappears unexpectedly.
          setPromoters((prev) => {
            if (prev.length === 0) return scoped
            const hydratedById = new Map<string, Promoter>()
            scoped.forEach((p) => allIdsOf(p).forEach((id) => hydratedById.set(id, p)))
            const merged: Promoter[] = []
            const seen = new Set<string>()
            prev.forEach((seeded) => {
              const hydrated = allIdsOf(seeded).map((id) => hydratedById.get(id)).find(Boolean)
              const resolved = hydrated ? mergePromoter(seeded, hydrated) : seeded
              allIdsOf(resolved).forEach((id) => seen.add(id))
              merged.push(resolved)
            })
            // Append any hydrated promoters not already present
            scoped.forEach((p) => {
              if (!allIdsOf(p).some((id) => seen.has(id))) {
                merged.push(p)
              }
            })
            return merged
          })
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

  // Last resort for names: neither the event record nor GET_EVENT_PROMOTERS
  // returned a usable name, so look the ids up in the promoter directory.
  const directoryLookupRef = React.useRef(false)

  const fillNamesFromPromoterDirectory = async () => {
    try {
      const authToken = getValidToken()
      if (!authToken) return

      const response = await fetch(promoterEndpoint.GET_ALL_PROMOTER_DATA_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!response.ok) return

      const data = await response.json()
      const all: any[] = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.PromoterData)
        ? data.data.PromoterData
        : Array.isArray(data)
        ? data
        : []

      const byId = new Map<string, any>()
      all.forEach((p) => {
        const id = p?._id ?? p?.promoter_id ?? p?.id
        if (id) byId.set(String(id), p)
      })
      if (byId.size === 0) return

      setPromoters((prev) => {
        let changed = false
        const next = prev.map((p) => {
          if (p.Username) return p
          const match = byId.get(p._id)
          const name = match ? pickPromoterName(match) : ""
          if (!name) return p
          changed = true
          return {
            ...p,
            FullName: name,
            Username: name,
            Email: p.Email || (pickField(match, ["Email", "email"]) ?? ""),
            Phone1: p.Phone1 || (pickField(match, ["Phone1", "phone1", "Phone", "phone"]) ?? ""),
            Status: normalizeStatus(pickField(match, ["Status", "status", "is_active", "IsActive"])),
          }
        })
        return changed ? next : prev
      })
    } catch (error) {
      console.warn("Promoter directory lookup failed:", error)
    }
  }

  React.useEffect(() => {
    if (directoryLookupRef.current) return
    if (promoters.length === 0 || !promoters.some((p) => !p.Username)) return
    directoryLookupRef.current = true
    fillNamesFromPromoterDirectory()
  }, [promoters])

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
          // The event's embedded promoter arrays only carry promoter_id references
          // (no name/email/phone/status), which is why they render as "Unknown Promoter".
          // Seed with them for an instant paint, then always hydrate the authoritative
          // full records (FullName/Email/Phone1/Status) from GET_EVENT_PROMOTERS.
          const assignedPromoters = getAssignedPromotersFromEvent(data.data)
          if (assignedPromoters.length > 0) {
            setPromoters(assignedPromoters)
          }
          // Hydrate full details, but keep the list scoped to this event's assigned promoters only.
          fetchPromoters(new Set(assignedPromoters.map((p) => p._id)))
          
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
            
            // Determine default visibility level based on event privacy
            const eventVisibility = data.data.EventVisibility || data.data.eventVisibility
            const defaultVisibilityLevel = eventVisibility === 2 ? 3 : 1 // Private events default to Promoters (3), Public events default to All (1)
            
            // Auto-populate both forms with the first event date/time, automatic ticket type, and proper visibility
            setNormalFormData(prev => ({ 
              ...prev, 
              EventDateTime_id: firstDateTime._id,
              TicketType: automaticTicketType,
              VisibilityLevel: defaultVisibilityLevel
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
            applyPromoterNamesFromTicketsResponse(normalData.data.EventPromotersData)
          } else {
            console.log("Using old response structure - direct data")
            console.log("Direct data length:", normalData.data?.length || 0)
            if (normalData.data && normalData.data.length > 0) {
              console.log("First ticket sample:", JSON.stringify(normalData.data[0], null, 2))
            }
            setNormalTickets(normalData.data || [])
            applyPromoterNamesFromTicketsResponse(normalData.data?.EventPromotersData)
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

  const fetchTicketsByFilter = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      console.log("Fetching filtered tickets for eventId:", eventId)
      
      // Build filter payload
      const filterPayload: any = {
        event_id: eventId,
      }

      // Add name filter if not "all"
      if (nameFilter !== "all") {
        filterPayload.name = nameFilter
        filterPayload.ticketName = nameFilter
      }

      // Add date filter if not "all"
      if (dateFilter !== "all") {
        filterPayload.eventDateTime_id = dateFilter
      }

      console.log("Filter API Payload:", JSON.stringify(filterPayload, null, 2))

      const response = await fetch(`${BASE_URL}/eventstickets/getTicketsByFilter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(filterPayload),
      })

      console.log("Filter API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Filter API response data:", JSON.stringify(data, null, 2))
        
        if (!data.error && data.data) {
          // API returns data.TicektsData (note the typo in API)
          const ticketsData = data.data.TicektsData || data.data.TicketsData || []
          console.log("Filtered tickets count:", ticketsData.length)
          if (ticketsData.length > 0) {
            console.log("First filtered ticket sample:", JSON.stringify(ticketsData[0], null, 2))
          }
          setNormalTickets(ticketsData)
        } else {
          console.error("Filter API returned error:", data)
          setNormalTickets([])
        }
      } else {
        const errorText = await response.text()
        console.error("Filter API call failed:", response.status, errorText)
        toast({
          title: "Error",
          description: "Failed to load filtered tickets",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching filtered tickets:", error)
      toast({
        title: "Error",
        description: "Failed to load filtered tickets",
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

  const fetchBulkTicketsByFilter = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      console.log("Fetching filtered bulk tickets for eventId:", eventId)
      
      // Build filter payload for bulk tickets
      const filterPayload: any = {
        event_id: eventId,
      }

      // Add name filter if not "all"
      if (nameFilter !== "all") {
        filterPayload.name = nameFilter
        filterPayload.ticketName = nameFilter
      }

      console.log("Bulk Filter API Payload:", JSON.stringify(filterPayload, null, 2))

      const response = await fetch(`${BASE_URL}/eventbulktickets/getBulkTicketsOfEvent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(filterPayload),
      })

      console.log("Bulk Filter API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Bulk Filter API response data:", JSON.stringify(data, null, 2))
        
        if (!data.error && data.data) {
          // Handle response structure for bulk tickets
          const bulkTicketsData = data.data.EventBulkTicketsData || data.data || []
          console.log("Filtered bulk tickets count:", bulkTicketsData.length)
          if (bulkTicketsData.length > 0) {
            console.log("First filtered bulk ticket sample:", JSON.stringify(bulkTicketsData[0], null, 2))
          }
          setBulkTickets(bulkTicketsData)
        } else {
          console.error("Bulk Filter API returned error:", data)
          setBulkTickets([])
        }
      } else {
        const errorText = await response.text()
        console.error("Bulk Filter API call failed:", response.status, errorText)
        toast({
          title: "Error",
          description: "Failed to load filtered bulk tickets",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching filtered bulk tickets:", error)
      toast({
        title: "Error",
        description: "Failed to load filtered bulk tickets",
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
      
      // Only normal tickets support enable/disable (bulk tickets don't have this endpoint)
      if (!isNormal) {
        toast({
          title: "Not Supported",
          description: "Bulk ticket enable/disable is not available.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const endpoint = newStatus === 1 
        ? `${BASE_URL}/eventstickets/enableEventTicket`
        : `${BASE_URL}/eventstickets/disableEventTicket`

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
      setCreateTicketError(null)
      // Set appropriate loading state
      if (activeTab === "bulk") {
        setBulkTicketCreating(true)
      } else {
        setLoading(true)
      }
      
      const authToken = getValidToken()
      if (!user || !authToken) return

      // Validate ticket name minimum length
      const ticketName = activeTab === "normal" ? normalFormData.TicketName : bulkFormData.TicketName
      if (!ticketName || ticketName.trim().length < 1) {
        toast({
          title: "Validation Error",
          description: "Ticket name must be at least 1 character.",
          variant: "destructive",
        })
        if (activeTab === "bulk") {
          setBulkTicketCreating(false)
        } else {
          setLoading(false)
        }
        return
      }

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
          EventDateTimeIds: eventDateTimeIds,
          Price: normalFormData.TicketPrice,
          Quantity: normalFormData.MaxQuantity,
          BookingMaxLimit: normalFormData.BookingMaxLimit,
          EventTicketVisibility: normalFormData.VisibilityLevel.toString(),
        }
        
        // Only send Description if it has at least 3 chars (Joi min(3))
        if (normalFormData.TicketDescription && normalFormData.TicketDescription.trim().length >= 3) {
          payload.Description = normalFormData.TicketDescription.trim()
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
          CreatedBy: getNumericRole(user?.AdminRole || "superadmin"),
          createduser_id: user.user_id
        }
      }

      // Create AbortController for timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), activeTab === "bulk" ? 300000 : 30000) // 5 minutes for bulk, 30 seconds for normal

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

        // Backend may return 200 with { error: true, message: "..." }
        if (data?.error) {
          throw new Error(data?.message || "Failed to create ticket")
        }

        if (activeTab === "bulk") {
          // Special handling for bulk tickets with email confirmation
          toast({
            title: "Success",
            description: data.message || "Bulk tickets created successfully! Tickets have been sent to the customer's email.",
          })
        } else {
          toast({
            title: "Success",
            description: data.message || "Ticket created successfully",
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
          
          // Determine default visibility based on event privacy for reset
          let defaultVisibility = 1 // Default to "All" for public events
          const eventVisibility = (eventData as any)?.EventVisibility || (eventData as any)?.eventVisibility
          if (eventData && eventVisibility === 2) {
            // For private events, default to "Promoters" as it's the only allowed option
            defaultVisibility = 3
          }
          
          setNormalFormData({
            TicketName: "",
            TicketType: automaticTicketType,
            TicketDescription: "",
            EventDateTime_id: eventDateTimes.length > 0 ? eventDateTimes[0]._id : "",
            TicketPrice: 0,
            MaxQuantity: 0,
            BookingMaxLimit: 10, // Default to 10
            TicketStatus: 1,
            VisibilityLevel: defaultVisibility
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
      } else {
        // Try to surface backend message on non-2xx responses
        let errorText = ""
        try {
          const maybeJson = await response.json()
          errorText = maybeJson?.message || ""
        } catch {
          try {
            errorText = await response.text()
          } catch {
            errorText = ""
          }
        }
        throw new Error(errorText || `Failed to create ticket (HTTP ${response.status})`)
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
      setCreateTicketError(errorMessage)
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

      const isNormal = selectedTicketType === 'normal'

      // Bulk ticket update not supported by backend
      if (!isNormal) {
        toast({
          title: "Not Supported",
          description: "Bulk ticket editing is not available.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const endpoint = ticketEndPoint.UPDATE_TICKET

      let payload: any
      
      if (isNormal) {
        // Format payload for normal tickets - editable fields are Description, Visibility, Price, and Quantity.
        const normalTicket = selectedTicket as ExtendedNormalTicket

        const currentVisibility = ((editFormData as any).Visibility || editFormData.VisibilityLevel || editFormData.EventTicketVisibility || "1").toString()

        payload = {
          Event_id: eventId,
          eventTicket_id: normalTicket._id,
          Quantity: parseInt(editFormData.MaxQuantity || editFormData.Quantity || normalTicket.Quantity),
          Price: parseFloat(editFormData.TicketPrice || editFormData.Price || normalTicket.Price),
          EventTicketVisibility: currentVisibility,
          ...(editFormData.Description && editFormData.Description.trim().length >= 3
            ? { Description: editFormData.Description.trim() }
            : {}),
          ...(currentVisibility === "3" && selectedPromoters.length > 0
            ? { EventPromoters: selectedPromoters.map(promoterId => ({ promoter_id: promoterId })) }
            : {}),
        }
      }

      // Validation for editable fields
      if (isNormal) {
        const price = parseFloat(editFormData.TicketPrice || editFormData.Price || (selectedTicket as ExtendedNormalTicket).Price)
        const quantity = parseInt(editFormData.MaxQuantity || editFormData.Quantity || (selectedTicket as ExtendedNormalTicket).Quantity)
        
        if (price < 0) {
          toast({
            title: "Validation Error",
            description: "Price cannot be negative",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
        
        if (quantity < 1) {
          toast({
            title: "Validation Error",
            description: "Quantity must be at least 1",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      } else {
        const price = parseFloat(editFormData.BulkTicketPrice || editFormData.Price || (selectedTicket as ExtendedBulkTicket).BulkTicketPrice)
        const quantity = parseInt(editFormData.BulkTicketQuantity || editFormData.Quantity || (selectedTicket as ExtendedBulkTicket).BulkTicketQuantity)
        
        if (price < 0) {
          toast({
            title: "Validation Error",
            description: "Price cannot be negative",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
        
        if (quantity < 1) {
          toast({
            title: "Validation Error",
            description: "Quantity must be at least 1",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
        
        if (quantity > 20) {
          toast({
            title: "Validation Error",
            description: "Bulk ticket quantity cannot exceed 20",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      }

      console.log("Update ticket payload:", JSON.stringify(payload, null, 2))

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      console.log("Update ticket response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Update ticket response data:", JSON.stringify(data, null, 2))
        
        toast({
          title: "Success",
          description: data.message || "Ticket updated successfully",
        })
        setShowEditModal(false)
        setEditFormData({})
        setSelectedTicketType(null)
        setSelectedPromoters([])
        // Refresh only the current tab's tickets
        if (activeTab === "normal") {
          fetchNormalTickets()
        } else {
          fetchBulkTickets()
        }
      } else {
        const errorData = await response.json()
        console.error("Update ticket API error:", errorData)
        toast({
          title: "Error",
          description: errorData.message || "Failed to update ticket",
          variant: "destructive",
        })
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

      console.log("🚫 Cancelling bulk ticket:", { batchId })

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

      const data = await response.json()
      console.log("📝 Cancel bulk ticket API response:", data)

      if (response.ok) {
        // Update the bulk ticket status locally immediately for better UX
        setBulkTickets(prevTickets => 
          prevTickets.map(ticket => 
            (ticket.BatchId === batchId || ticket._id === batchId)
              ? { ...ticket, Status: 2, BulkTicketStatus: 2, IsCancelled: true }  // Status 2 typically means cancelled
              : ticket
          )
        )

        toast({
          title: "Success",
          description: data.message || "Bulk ticket cancelled successfully",
        })
        
        // Reload the page after a short delay to ensure backend has processed
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error(data.message || "Failed to cancel bulk ticket")
      }
    } catch (error) {
      console.error("Error cancelling bulk ticket:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel bulk ticket",
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
        a.download = `${batchId}-${ticketName || 'bulk-ticket'}-report.xlsx`
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

  // Effect to handle filter changes for normal tickets
  React.useEffect(() => {
    // Only run if component is mounted and user is authenticated
    if (!user || !eventId || activeTab !== "normal") return

    // No debounce needed since we're using dropdowns
    // Check if any filters are active
    const hasActiveFilters = nameFilter !== "all" || dateFilter !== "all"
    
    if (hasActiveFilters) {
      // Use filter API when filters are active
      fetchTicketsByFilter()
    } else {
      // Use regular fetch when no filters are active
      fetchNormalTickets()
    }
  }, [nameFilter, dateFilter, activeTab, eventId, user])

  // Effect to handle filter changes for bulk tickets
  React.useEffect(() => {
    // Only run if component is mounted and user is authenticated
    if (!user || !eventId || activeTab !== "bulk") return

    // No debounce needed since we're using dropdowns
    // Check if any filters are active (bulk tickets only have name filter)
    const hasActiveFilters = nameFilter !== "all"
    
    if (hasActiveFilters) {
      // Use filter API when filters are active
      fetchBulkTicketsByFilter()
    } else {
      // Use regular fetch when no filters are active
      fetchBulkTickets()
    }
  }, [nameFilter, activeTab, eventId, user])

  // Handle tab changes - load data only when switching to a new tab
  const handleTabChange = (newTab: string) => {
    setCreateTicketError(null)
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
    setCreateTicketError(null)
    // Auto-populate form with event data when opening modal
    if (eventDateTimes.length > 0) {
      const firstDateTime = eventDateTimes[0]
      
      // Determine automatic ticket type based on event configuration
      let automaticTicketType = 1 // Default to Single Day
      if (isMultiDateEvent || eventDateTimes.length > 1) {
        automaticTicketType = 2 // Multiple Day
      }
      
      // Determine default visibility based on event privacy
      let defaultVisibility = 1 // Default to "All" for public events
      const eventVisibility = (eventData as any)?.EventVisibility || (eventData as any)?.eventVisibility
      if (eventData && eventVisibility === 2) {
        // For private events, default to "Promoters" as it's the only allowed option
        defaultVisibility = 3
      }
      
      setNormalFormData(prev => ({ 
        ...prev, 
        EventDateTime_id: firstDateTime._id,
        TicketType: automaticTicketType,
        VisibilityLevel: defaultVisibility
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
      if (promoters.length === 0) {
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
    
    // Determine ticket type based on current active tab since tickets come from different tabs
    setSelectedTicketType(activeTab as 'normal' | 'bulk')
    
    // Initialize selected promoters if this is a normal ticket with promoter visibility
    if (activeTab === 'normal') {
      const normalTicket = ticket as ExtendedNormalTicket
      // Check both Visibility and EventTicketVisibility fields (API may return either)
      const visibility = (normalTicket as any).Visibility || normalTicket.EventTicketVisibility || (normalTicket as any).VisibilityLevel
      const visibilityStr = visibility?.toString()
      
      if (visibilityStr === '3') {
        // Extract promoter IDs from both possible field names
        const promotersArray = (normalTicket as any).Promoters || normalTicket.EventPromoters || []
        const existingPromoterIds = promotersArray.map((ep: any) => ep.promoter_id || ep.Promoter_id || ep.promoterId || ep._id).filter(Boolean)
        console.log('Edit Modal - Found promoters for visibility 3:', existingPromoterIds)
        setSelectedPromoters(existingPromoterIds)
      } else {
        setSelectedPromoters([])
      }
    }
    
    setShowEditModal(true)
  }  // Filter promoters based on search; promoters state contains only event-assigned promoters.
  const filteredPromoters = promoters.filter(promoter => {
    const matchesSearch = 
      promoter.FullName.toLowerCase().includes(promoterSearchTerm.toLowerCase()) ||
      (promoter.Username && promoter.Username.toLowerCase().includes(promoterSearchTerm.toLowerCase())) ||
      (promoter.Email && promoter.Email.toLowerCase().includes(promoterSearchTerm.toLowerCase())) ||
      (promoter.Phone1 && promoter.Phone1.includes(promoterSearchTerm))
    
    return matchesSearch
  })

  // Normal tickets are already filtered by the API when filters are active
  // No client-side filtering needed since fetchTicketsByFilter handles it
  const filteredNormalTickets = normalTickets

  // Bulk tickets are already filtered by the API when filters are active
  // No client-side filtering needed since fetchBulkTicketsByFilter handles it
  const filteredBulkTickets = bulkTickets

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
                `${eventData.eventName || eventData.EventName || 'Event'} - Manage  and configure pricing`
              ) : (
                "Manage event tickets and configure pricing"
              )}
            </p>
          </div>
        </div>
        {/* Add Ticket button - Hidden for Organizers when viewing Bulk Tickets tab */}
        {!(activeTab === "bulk" && getNumericRole(role) === 3) && (
          <Button 
            onClick={handleOpenCreateModal} 
            disabled={eventLoading || eventDateTimes.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Ticket
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="w-full md:min-w-[200px] md:w-auto">
              <Label htmlFor="nameFilter">Name Filter</Label>
              <Select value={nameFilter} onValueChange={setNameFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Names</SelectItem>
                  {/* Get unique ticket names from current tickets */}
                  {Array.from(new Set(
                    (activeTab === "normal" ? normalTickets : bulkTickets).map((ticket: any) => 
                      activeTab === "normal" 
                        ? (ticket.Name || ticket.TicketName)
                        : (ticket.TicketName || ticket.BulkTicketName)
                    ).filter(Boolean)
                  )).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:min-w-[200px] md:w-auto">
              <Label htmlFor="dateFilter">Date Filter</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  {eventDateTimes.map((dateTime) => (
                    <SelectItem key={dateTime._id} value={dateTime._id}>
                      {formatEventDate(dateTime.EventStartDateTime, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }, 'en-US')}
                    </SelectItem>
                  ))}
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
            Normal Tickets
          </TabsTrigger>
          {/* Bulk Tickets tab - Visible to SuperAdmins and Organizers */}
          {(getNumericRole(role) === 1 || getNumericRole(role) === 3) && (
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Bulk Tickets
            </TabsTrigger>
          )}
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
            <CardContent className="space-y-4">
              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Ticket Date</TableHead>
                      <TableHead>Pending Quantity</TableHead>
                      <TableHead>Availability</TableHead>
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
                        
                        // Get the event date for this ticket
                        const ticketEventDate = eventDateTimes.find(
                          (edt) => edt._id === ticket.EventDateTime_id
                        )
                        
                        // Calculate pending quantity (remaining tickets)
                        const totalQuantity = extendedTicket.Quantity || ticket.TicketQuantity || 0
                        const soldTickets = ticket.SoldTickets || 0
                        const pendingQuantity =
                          (extendedTicket as any).PendingQuantity ??
                          (ticket as any).PendingQuantity ??
                          (ticket as any).pendingQuantity ??
                          (ticket as any).Pending_Quantity ??
                          (ticket as any).RemainingTickets ??
                          (ticket as any).remainingTickets ??
                          (totalQuantity - soldTickets)
                        
                        // Check if ticket is disabled
                        const statusValue = extendedTicket.EventTicketStatus ?? 
                                           extendedTicket.Status ?? 
                                           ticket.EventTicketStatus ?? 
                                           ticket.Status ?? 
                                           1
                        const isDisabled = statusValue === 0
                        
                        return (
                          <TableRow key={ticket._id} className={isDisabled ? "bg-red-50 hover:bg-red-50" : ""}>
                            <TableCell className={`font-medium ${isDisabled ? "border-l-4 border-l-red-600" : ""}`}>
                              {extendedTicket.Name || ticket.TicketName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {totalQuantity}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(extendedTicket.Price || ticket.TicketPrice || 0)}
                            </TableCell>
                            <TableCell>
                              {ticketEventDate 
                                ? formatDate(ticketEventDate.EventStartDateTime)
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {pendingQuantity}
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
                                      // Check multiple possible field names for ticket status
                                      // Priority: EventTicketStatus (from API) > Status
                                      // Status field: 1 = Active, 0 = Disabled
                                      const statusValue = extendedTicket.EventTicketStatus ?? 
                                                         extendedTicket.Status ?? 
                                                         ticket.EventTicketStatus ?? 
                                                         ticket.Status ?? 
                                                         1 // Default to active if not found
                                      const isActive = statusValue === 1
                                      const ticketName = extendedTicket.Name || ticket.TicketName || 'ticket'
                                      // Pass the current status (1 if active, 0 if disabled) so the function can toggle it correctly
                                      handleToggleStatus(ticket._id, isActive ? 1 : 0, true, ticketName)
                                    }}
                                    className={(() => {
                                      // Check multiple possible field names for ticket status
                                      // Priority: EventTicketStatus (from API) > Status
                                      // Status field: 1 = Active, 0 = Disabled
                                      const statusValue = extendedTicket.EventTicketStatus ?? 
                                                         extendedTicket.Status ?? 
                                                         ticket.EventTicketStatus ?? 
                                                         ticket.Status ?? 
                                                         1 // Default to active if not found
                                      const isActive = statusValue === 1
                                      return isActive ? "text-destructive" : "text-green-600"
                                    })()}
                                  >
                                    {(() => {
                                      // Check multiple possible field names for ticket status
                                      // Priority: EventTicketStatus (from API) > Status
                                      // Status field: 1 = Active, 0 = Disabled
                                      const statusValue = extendedTicket.EventTicketStatus ?? 
                                                         extendedTicket.Status ?? 
                                                         ticket.EventTicketStatus ?? 
                                                         ticket.Status ?? 
                                                         1 // Default to active if not found
                                      const isActive = statusValue === 1
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

        {/* Bulk Tickets Tab - Visible to SuperAdmins and Organizers */}
        {(getNumericRole(role) === 1 || getNumericRole(role) === 3) && (
          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Tickets</CardTitle>
                <CardDescription>
                  Manage bulk tickets for large groups and promoters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Event Time</TableHead>
                      <TableHead>Ticket Name</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone No.</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Ticket Price</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredBulkTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          No bulk tickets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBulkTickets.map((ticket) => {
                        const extendedTicket = ticket as ExtendedBulkTicket
                        const ticketPrice = extendedTicket.Price || ticket.BulkTicketPrice || 0
                        const quantity = extendedTicket.Quantity || ticket.MaxBulkTicketPerTransaction || 0
                        const totalAmount = ticketPrice * quantity
                        
                        // Check if bulk ticket is disabled
                        const statusValue = extendedTicket.Status ?? 
                                           extendedTicket.BulkTicketStatus ?? 
                                           ticket.Status ?? 
                                           ticket.BulkTicketStatus ??
                                           1
                        const isDisabled = statusValue === 0
                        
                        return (
                          <TableRow key={ticket._id || ticket.BatchId} className={isDisabled ? "bg-red-50 hover:bg-red-50" : ""}>
                            <TableCell className={`font-medium ${isDisabled ? "border-l-4 border-l-red-600" : ""}`}>
                              {ticket.BatchId || ticket._id || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {eventData?.eventName || eventData?.EventName || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {eventDateTimes.length > 0 ? (
                                `${formatEventDate(eventDateTimes[0].EventStartDateTime, undefined, [])} ${formatEventTime(eventDateTimes[0].EventStartDateTime, { hour: '2-digit', minute: '2-digit' }, [])} - ${formatEventTime(eventDateTimes[0].EventEndDateTime, { hour: '2-digit', minute: '2-digit' }, [])}`
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
                              {quantity}
                            </TableCell>
                            <TableCell>
                              {extendedTicket.CheckIn ?? ticket.CheckIn ?? 0} / {quantity}
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
        )}
      </Tabs>

      {/* Create Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open)
          if (!open) setCreateTicketError(null)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create {activeTab === "normal" ? "Normal" : "Bulk"} Ticket
            </DialogTitle>
            <DialogDescription>
              Add a new {activeTab === "normal" ? "normal" : "bulk"} ticket to this event
            </DialogDescription>
          </DialogHeader>

          {createTicketError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{createTicketError}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className={`grid w-full ${getNumericRole(role) === 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="normal">Normal Ticket</TabsTrigger>
              {/* Bulk Ticket tab - Only visible to SuperAdmins */}
              {getNumericRole(role) === 1 && (
                <TabsTrigger value="bulk">Bulk Ticket</TabsTrigger>
              )}
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
                </div>

                <div className="space-y-2">
                  <Label>Event Type</Label>
                  {(isMultiDateEvent || eventDateTimes.length > 1) ? (
                    // Multi-day event: allow Multiple Day or Season Pass
                    <RadioGroup
                      value={normalFormData.TicketType.toString()}
                      onValueChange={(value) => {
                        const ticketType = parseInt(value)
                        setNormalFormData(prev => ({ ...prev, TicketType: ticketType }))
                        // Season Pass should cover all event dates
                        if (ticketType === 3) {
                          setSelectedEventDateTimes(eventDateTimes.map(dt => dt._id))
                        }
                      }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="ticketType-multiple" />
                        <Label htmlFor="ticketType-multiple" className="font-normal cursor-pointer">Multiple Day</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3" id="ticketType-season" />
                        <Label htmlFor="ticketType-season" className="font-normal cursor-pointer">Season Pass</Label>
                      </div>
                    </RadioGroup>
                  ) : (
                    // Single-day event: only Single Day (selected by default)
                    <RadioGroup value="1" className="grid grid-cols-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="ticketType-single" />
                        <Label htmlFor="ticketType-single" className="font-normal cursor-pointer">Single Day</Label>
                      </div>
                    </RadioGroup>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
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
                        {(() => {
                          const eventVisibility = (eventData as any)?.EventVisibility || (eventData as any)?.eventVisibility
                          
                          if (eventVisibility === 2) {
                            // Private Event - Only show Promoters option
                            return (
                              <SelectItem value="3">Promoters</SelectItem>
                            )
                          } else {
                            // Public Event - Show All, All Customers, and Promoters
                            return (
                              <>
                                <SelectItem value="1">All</SelectItem>
                                <SelectItem value="2">All Customers</SelectItem>
                                <SelectItem value="3">Promoters</SelectItem>
                              </>
                            )
                          }
                        })()}
                      </SelectContent>
                    </Select>
                    {/* Show info message for private events */}
                    {(() => {
                      const eventVisibility = (eventData as any)?.EventVisibility || (eventData as any)?.eventVisibility
                      return eventData && eventVisibility === 2 && (
                        <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          🔒 This is a private event. Tickets can only be assigned to promoters.
                        </p>
                      )
                    })()}
                    {/* Show info for promoters visibility */}
                    {normalFormData.VisibilityLevel === 3 && (
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        💡 This ticket will only be visible to the promoters you select below.
                      </p>
                    )}                    {normalFormData.VisibilityLevel === 3 && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="promoterSelect">Assign to Promoters</Label>
                          <p className="text-xs text-muted-foreground">
                            Select which promoters assigned to this event can sell this ticket
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPromoterSearchTerm("")
                              setShowPromoterModal(true)
                            }}
                            className="w-full justify-start h-auto p-3 border-dashed"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">
                                {selectedPromoters.length > 0 
                                  ? `${selectedPromoters.length} Promoter(s) Selected`
                                  : 'Choose Promoters'
                                }
                              </span>
                              <span className="text-xs text-muted-foreground mt-1">
                                {selectedPromoters.length > 0 
                                  ? 'Click to modify selection'
                                  : `${filteredPromoters.length} promoters assigned to this event`
                                }
                              </span>
                            </div>
                          </Button>
                        </div>
                        
                        {selectedPromoters.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Selected Promoters:</Label>
                            <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                              {selectedPromoters.map(promoterId => {
                                const promoter = promoters.find(p => p._id === promoterId)
                                return promoter ? (
                                  <Badge key={promoterId} variant="secondary" className="text-xs">
                                    {promoter.FullName}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedPromoters(prev => prev.filter(id => id !== promoterId))
                                      }}
                                      className="ml-1 hover:bg-destructive/20 rounded-sm"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}                  </div>
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
                                {formatEventDate(dateTime.EventStartDateTime, undefined, [])} - {formatEventTime(dateTime.EventStartDateTime, { hour: '2-digit', minute: '2-digit' }, [])} to {formatEventTime(dateTime.EventEndDateTime, { hour: '2-digit', minute: '2-digit' }, [])}
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
                        {formatEventDate(eventDateTimes[0].EventStartDateTime, undefined, [])} - {formatEventTime(eventDateTimes[0].EventStartDateTime, { hour: '2-digit', minute: '2-digit' }, [])} to {formatEventTime(eventDateTimes[0].EventEndDateTime, { hour: '2-digit', minute: '2-digit' }, [])}
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
                </div>                <div className={`grid gap-4 ${getNumericRole(role) === 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
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

                  {/* Only show Booking Max Limit for superadmin */}
                  {getNumericRole(role) === 1 && (
                    <div className="space-y-2">
                      <Label htmlFor="bookingMaxLimit">Booking Max Limit</Label>
                      <Input
                        id="bookingMaxLimit"
                        type="number"
                        value={normalFormData.BookingMaxLimit}
                        onChange={(e) => setNormalFormData(prev => ({ ...prev, BookingMaxLimit: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  )}
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
                          {formatEventDate(dateTime.EventStartDateTime, undefined, [])} - {formatEventTime(dateTime.EventStartDateTime, { hour: '2-digit', minute: '2-digit' }, [])} to {formatEventTime(dateTime.EventEndDateTime, { hour: '2-digit', minute: '2-digit' }, [])}
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
                      step="1"
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
              {selectedTicketType === 'normal' ? (
                // Normal ticket edit form
                <>
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="text-sm font-semibold">Ticket Details (Read Only)</div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Ticket Name</div>
                        <div className="text-sm font-medium">{(selectedTicket as any)?.Name || (selectedTicket as any)?.TicketName || editFormData.TicketName || editFormData.Name || "N/A"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Ticket Type</div>
                        <div className="text-sm font-medium">{getTicketTypeName(parseInt(editFormData.TicketType?.toString() || editFormData.EventTicketType?.toString() || "1"))}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Booking Max Limit</div>
                        <div className="text-sm font-medium">{editFormData.BookingMaxLimit || selectedTicket?.BookingMaxLimit || "N/A"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Current Price</div>
                        <div className="text-sm font-medium">{formatCurrency(parseFloat((editFormData.TicketPrice || editFormData.Price || selectedTicket?.Price || 0).toString()))}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Current Quantity</div>
                        <div className="text-sm font-medium">{editFormData.TicketQuantity || editFormData.Quantity || editFormData.MaxQuantity || selectedTicket?.Quantity || "N/A"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Status</div>
                        <div className="text-sm font-medium">{(() => {
                          const statusValue = (selectedTicket as ExtendedNormalTicket)?.EventTicketStatus ?? (selectedTicket as ExtendedNormalTicket)?.Status ?? 1
                          return statusValue === 1 ? "Active" : "Disabled"
                        })()}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Assigned Promoters</div>
                        <div className="text-sm font-medium">
                          {selectedPromoters.length > 0
                            ? selectedPromoters.map((id) => promoters.find((p) => p._id === id)?.Username || promoters.find((p) => p._id === id)?.FullName || "Unknown").join(", ")
                            : "None"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Editable fields: description, visibility, price, and quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea
                      id="editDescription"
                      value={editFormData.Description || editFormData.TicketDescription || ""}
                      onChange={(e) => setEditFormData((prev: any) => ({ ...prev, Description: e.target.value, TicketDescription: e.target.value }))}
                      placeholder="Enter ticket description"
                      rows={3}
                      className="border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editVisibility">Visibility</Label>
                    <Select
                      value={((editFormData as any).Visibility || editFormData.VisibilityLevel || editFormData.EventTicketVisibility || "1").toString()}
                      onValueChange={(value) => {
                        setEditFormData((prev: any) => ({
                          ...prev,
                          Visibility: value,
                          VisibilityLevel: parseInt(value),
                          EventTicketVisibility: value,
                        }))
                        if (value === "3") {
                          setPromoterSearchTerm("")
                          setShowPromoterModal(true)
                        } else {
                          setSelectedPromoters([])
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const eventVisibility = (eventData as any)?.EventVisibility || (eventData as any)?.eventVisibility
                          if (eventVisibility === 2) {
                            return <SelectItem value="3">Promoters</SelectItem>
                          }
                          return (
                            <>
                              <SelectItem value="1">All</SelectItem>
                              <SelectItem value="2">All Customers</SelectItem>
                              <SelectItem value="3">Promoters</SelectItem>
                            </>
                          )
                        })()}
                      </SelectContent>
                    </Select>
                    {((editFormData as any).Visibility || editFormData.VisibilityLevel || editFormData.EventTicketVisibility || "1").toString() === "3" && (
                      <div className="space-y-3">
                        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          💡 This ticket will only be visible to the promoters you select below.
                        </p>
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPromoterSearchTerm("")
                              setShowPromoterModal(true)
                            }}
                            className="w-full justify-start h-auto p-3 border-dashed"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">
                                {selectedPromoters.length > 0
                                  ? `${selectedPromoters.length} Promoter(s) Selected`
                                  : 'Choose Promoters'}
                              </span>
                              <span className="text-xs text-muted-foreground mt-1">
                                {selectedPromoters.length > 0
                                  ? 'Click to modify selection'
                                  : `${filteredPromoters.length} promoters assigned to this event`}
                              </span>
                            </div>
                          </Button>
                        </div>
                        {selectedPromoters.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Selected Promoters:</Label>
                            <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                              {selectedPromoters.map(promoterId => {
                                const promoter = promoters.find(p => p._id === promoterId)
                                return promoter ? (
                                  <Badge key={promoterId} variant="secondary" className="text-xs">
                                    {promoter.FullName}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedPromoters(prev => prev.filter(id => id !== promoterId))
                                      }}
                                      className="ml-1 hover:bg-destructive/20 rounded-sm"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Editable Price and Quantity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editTicketPrice">Price (₹) *</Label>
                      <Input
                        id="editTicketPrice"
                        type="number"
                        min="0"
                        step="1"
                        value={editFormData.TicketPrice || editFormData.Price || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, TicketPrice: parseFloat(e.target.value) || 0, Price: parseFloat(e.target.value) || 0 }))}
                        className="border-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editMaxQuantity">Total Quantity *</Label>
                      <Input
                        id="editMaxQuantity"
                        type="number"
                        min="1"
                        value={editFormData.TicketQuantity || editFormData.Quantity || editFormData.MaxQuantity || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, TicketQuantity: parseInt(e.target.value) || 0, Quantity: parseInt(e.target.value) || 0, MaxQuantity: parseInt(e.target.value) || 0 }))}
                        className="border-primary"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    * Description, Visibility, Price, and Total Quantity can be edited
                  </div>
                </>
              ) : (
                // Bulk ticket edit form
                <>
                  {/* Read-only fields */}
                  <div className="space-y-2">
                    <Label>Bulk Ticket Name (Read Only)</Label>
                    <Input
                      value={editFormData.BulkTicketName || editFormData.TicketName || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  {/* Editable fields - Price and Quantity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editBulkTicketPrice">Price (₹) *</Label>
                      <Input
                        id="editBulkTicketPrice"
                        type="number"
                        min="0"
                        step="1"
                        value={editFormData.BulkTicketPrice || editFormData.Price || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, BulkTicketPrice: parseFloat(e.target.value) || 0, Price: parseFloat(e.target.value) || 0 }))}
                        className="border-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editBulkQuantity">Quantity *</Label>
                      <Input
                        id="editBulkQuantity"
                        type="number"
                        min="1"
                        max="20"
                        value={editFormData.BulkTicketQuantity || editFormData.Quantity || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, BulkTicketQuantity: parseInt(e.target.value) || 0, Quantity: parseInt(e.target.value) || 0 }))}
                        className="border-primary"
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    * Only Price and Quantity fields can be edited
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedTicketType(null)
                    setEditFormData({})
                    setSelectedPromoters([])
                  }}
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
                      <div className="font-medium">{promoter.Username || promoter.FullName || 'Unknown Promoter'}</div>
                      {promoter.Phone1 && (
                        <div className="text-sm text-muted-foreground">{promoter.Phone1}</div>
                      )}
                    </div>
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
