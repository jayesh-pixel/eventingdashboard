"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { promocodeEndPoint, eventEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { Promocode, PromocodesApiResponse, PromocodeStatus, PromocodeType } from "@/lib/types"
import { formatDate, handleApiResponse, getApiErrorMessage } from "@/lib/utils"
import { getNumericAdminRole } from "@/lib/api-constants"

const statusColors: Record<number, string> = {
  0: "bg-gray-100 text-gray-800",    // InActive
  1: "bg-green-100 text-green-800",  // Active
  2: "bg-red-100 text-red-800"       // Expired
}

const statusLabels: Record<number, string> = {
  0: "Inactive",
  1: "Active", 
  2: "Expired"
}

const typeLabels: Record<number, string> = {
  1: "Fixed Amount",
  2: "Percentage"
}

export default function PromocodesPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [promocodes, setPromocodes] = useState<Promocode[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPromocodes, setTotalPromocodes] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPromocode, setSelectedPromocode] = useState<Promocode | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isFetchingEditDetails, setIsFetchingEditDetails] = useState(false)

  // Events state for selection (Specific Events)
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [eventSearchTerm, setEventSearchTerm] = useState("")
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    PromoCodeName: "",
    TermsCondition: "",
    PromocodeType: "1", // Fixed Amount by default
    Value: "",
    MinCheckoutAmount: "",
    ExpiryDate: "",
    OneTimeUseFlag: false,
    CanBeUsed: "1", // 1 = All Events, 2 = Specific Events
    PromocodeValidFor: "1" // 1 = Public, 2 = Private
  })

  const formIsEditMode = isEditDialogOpen
  
  const itemsPerPage = 10

  const getEventId = (event: any): string | null => {
    const id = event?._id ?? event?.id ?? event?.event_id ?? event?.Event_id
    return typeof id === "string" && id.trim() ? id : null
  }

  const getEventName = (event: any): string => {
    return (
      event?.eventName ||
      event?.EventName ||
      event?.Name ||
      event?.title ||
      "Untitled Event"
    )
  }

  // Fetch events for selection
  const fetchEvents = useCallback(async (): Promise<any[]> => {
    if (!user) return []

    setLoadingEvents(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("No valid authentication token found")
      }

      // Use the paginated publish events endpoint to show only published events
      const numericRole = getNumericAdminRole(user.AdminRole)
      const requestPayload = {
        AdminRole: numericRole,
        user_id: user.user_id,
        page: "1",
        limit: "50",
      }

      const response = await fetch(eventEndPoint.GET_PAGINATED_PUBLISH_EVENTS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      })

      const data = await handleApiResponse(response)

      // Extract events from the paginated response - handle different response structures
      let eventsArray: any[] = []
      if (data.data?.EventsData && Array.isArray(data.data.EventsData)) {
        eventsArray = data.data.EventsData
      } else if (data.data?.events && Array.isArray(data.data.events)) {
        eventsArray = data.data.events
      } else if (data.data && Array.isArray(data.data)) {
        eventsArray = data.data
      } else if (Array.isArray(data)) {
        eventsArray = data
      } else {
        eventsArray = []
      }

      setEvents(eventsArray)
      return eventsArray
    } catch (error) {
      console.error("Error fetching events:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to fetch events for selection"),
        variant: "destructive",
      })
      setEvents([])
      return []
    } finally {
      setLoadingEvents(false)
    }
  }, [user, toast])


  // Load events when dialog opens and Specific Events is selected
  useEffect(() => {
    if ((isCreateDialogOpen || isEditDialogOpen) && formData.CanBeUsed === "2") {
      fetchEvents()
    }
  }, [isCreateDialogOpen, isEditDialogOpen, formData.CanBeUsed, fetchEvents])


  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when searching
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchPromocodes = useCallback(async (page: number = 1, search: string = "", status: string = "all") => {
    if (!user) return
    
    setLoading(true)
    setApiError(null)
    
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("No valid authentication token found")
      }

      const body: any = {
        page: page.toString(),
        limit: itemsPerPage.toString(),
      }
      
      // Backend has two separate endpoints:
      //   getallpaginatedData — paginated list (no search)
      //   getPaginatedSearch — paginated search by PromoCodeName (requires search_keyword)
      // Status filtering is NOT supported by the backend; we filter client-side instead.
      let endpoint = promocodeEndPoint.GET_ALL_PAGINATED_PROMOCODES_DATA

      if (search.trim()) {
        body.search_keyword = search.trim()
        endpoint = promocodeEndPoint.SEARCH_PROMOCODE_PAGINATED
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data: PromocodesApiResponse = await handleApiResponse(response)
      
      let fetchedPromocodes = data.data.PromocodeData || []

      // Client-side status filter (backend doesn't support it)
      if (status !== "all") {
        const statusNum = Number(status)
        fetchedPromocodes = fetchedPromocodes.filter((p) => p.status === statusNum)
      }

      setPromocodes(fetchedPromocodes)
      setTotalPages(data.data.totalPages || 1)
      setCurrentPage(data.data.currentPage || 1)
      setTotalPromocodes(data.data.totalPromocodes || 0)
      
    } catch (error) {
      console.error("Error fetching promocodes:", error)
      const errorMessage = getApiErrorMessage(error, "Failed to fetch promocodes")
      setApiError(errorMessage)
      setShowErrorDialog(true)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      setPromocodes([])
      setTotalPages(1)
      setTotalPromocodes(0)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
  }, [fetchPromocodes, currentPage, debouncedSearchTerm, statusFilter])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const parseDecimal = (value: string): number => {
    const normalized = String(value ?? "").trim().replace(/,/g, ".")
    return Number(normalized)
  }

  const handleCreatePromocode = async () => {
    if (!formData.PromoCodeName.trim()) {
      toast({
        title: "Validation Error",
        description: "Promocode name is required (6-12 characters)",
        variant: "destructive",
      })
      return
    }

    if (formData.PromoCodeName.trim().length < 6 || formData.PromoCodeName.trim().length > 12) {
      toast({
        title: "Validation Error",
        description: "Promocode name must be 6-12 characters long",
        variant: "destructive",
      })
      return
    }

    if (!formData.TermsCondition.trim() || formData.TermsCondition.trim().length < 5) {
      toast({
        title: "Validation Error",
        description: "Terms & Conditions are required (min 5 characters)",
        variant: "destructive",
      })
      return
    }

    const valueNumber = parseDecimal(formData.Value)
    if (!formData.Value || !Number.isFinite(valueNumber) || valueNumber <= 0) {
      toast({
        title: "Validation Error", 
        description: "Value must be greater than 0",
        variant: "destructive",
      })
      return
    }

    const minCheckoutNumber = parseDecimal(formData.MinCheckoutAmount)
    if (!formData.MinCheckoutAmount || !Number.isFinite(minCheckoutNumber) || minCheckoutNumber <= 0) {
      toast({
        title: "Validation Error",
        description: "Minimum checkout amount must be greater than 0",
        variant: "destructive", 
      })
      return
    }

    if (!formData.ExpiryDate) {
      toast({
        title: "Validation Error",
        description: "Expiry date is required",
        variant: "destructive",
      })
      return
    }

    if (formData.CanBeUsed === "2" && selectedEvents.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one event",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      // Build request data — all numeric fields must be numbers, not strings.
      // CanBeUsed: 1=AllEvents, 2=SpecificEvents (controls whether Events array is needed)
      // PromocodeValidFor: 1=Public, 2=Private
      const requestData: any = {
        PromoCodeName: formData.PromoCodeName.trim(),
        TermsCondition: formData.TermsCondition.trim(),
        PromocodeType: Number(formData.PromocodeType),
        Value: valueNumber,
        MinCheckoutAmount: minCheckoutNumber,
        ExpiryDate: formData.ExpiryDate,
        OneTimeUseFlag: formData.OneTimeUseFlag ? 1 : 0,
        PromocodeValidFor: Number(formData.PromocodeValidFor),
        CanBeUsed: Number(formData.CanBeUsed),
      }

      // Backend only processes Events when CanBeUsed === SpecificEvents(2).
      // When CanBeUsed === AllEvents(1), Events should be omitted or empty.
      if (formData.CanBeUsed === "2") {
        requestData.Events = selectedEvents.filter(Boolean).map((id) => ({ event_id: id }))
      }

      const response = await fetch(promocodeEndPoint.CREATE_PROMOCODE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      })

      const result = await handleApiResponse(response)

      toast({
        title: "Success",
        description: result.message || "Promocode created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      await fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
    } catch (error: any) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create promocode"),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      PromoCodeName: "",
      TermsCondition: "",
      PromocodeType: "1",
      Value: "",
      MinCheckoutAmount: "",
      ExpiryDate: "",
      OneTimeUseFlag: false,
      CanBeUsed: "1",
      PromocodeValidFor: "1"
    })
    setSelectedPromocode(null)
    setSelectedEvents([])
    setEventSearchTerm("")
  }

  // Extract selected event ids from a promocode's Events array
  const getSelectedEventIdsFromPromocode = (promocode: Promocode): string[] => {
    if (!Array.isArray(promocode?.Events)) return []
    return promocode.Events
      .map((e) => e?.event_id)
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
  }

  const openEditDialog = async (promocode: Promocode) => {
    setSelectedPromocode(promocode)
    setIsFetchingEditDetails(true)
    setIsEditDialogOpen(true)

    try {
      const token = getValidToken()
      if (!token) throw new Error("Authentication required")

      const response = await fetch(promocodeEndPoint.GET_PROMOCODE_BY_ID, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ Promocode_id: promocode._id }),
      })

      const result = await handleApiResponse(response)
      const detail: Promocode = result.data ?? result

      const existingEventIds = getSelectedEventIdsFromPromocode(detail)

      setFormData({
        PromoCodeName: detail.PromoCodeName || "",
        TermsCondition: detail.TermsCondition || "",
        PromocodeType: String(detail.PromocodeType ?? PromocodeType.FixedAmount),
        Value: detail.Value != null ? String(detail.Value) : "",
        MinCheckoutAmount: detail.MinCheckoutAmount != null ? String(detail.MinCheckoutAmount) : "",
        ExpiryDate: detail.ExpiryDate
          ? new Date(detail.ExpiryDate).toISOString().split("T")[0]
          : "",
        OneTimeUseFlag: detail.OneTimeUseFlag === 1,
        PromocodeValidFor: detail.PromocodeValidFor != null ? String(detail.PromocodeValidFor) : "1",
        CanBeUsed: detail.CanBeUsed != null ? String(detail.CanBeUsed) : (existingEventIds.length ? "2" : "1"),
      })

      if (existingEventIds.length > 0) {
        // Make sure the full event list is available for re-selection
        await fetchEvents()
        setSelectedEvents(existingEventIds)
      } else {
        setSelectedEvents([])
      }
    } catch (error: any) {
      console.error("Error loading promocode details:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load promocode details"),
        variant: "destructive",
      })
      setIsEditDialogOpen(false)
      resetForm()
    } finally {
      setIsFetchingEditDetails(false)
    }
  }

  const handleUpdatePromocode = async () => {
    if (!selectedPromocode) return

    if (!formData.PromoCodeName.trim()) {
      toast({
        title: "Validation Error",
        description: "Promocode name is required (6-12 characters)",
        variant: "destructive",
      })
      return
    }

    if (formData.PromoCodeName.trim().length < 6 || formData.PromoCodeName.trim().length > 12) {
      toast({
        title: "Validation Error",
        description: "Promocode name must be 6-12 characters long",
        variant: "destructive",
      })
      return
    }

    if (!formData.TermsCondition.trim() || formData.TermsCondition.trim().length < 5) {
      toast({
        title: "Validation Error",
        description: "Terms & Conditions are required (min 5 characters)",
        variant: "destructive",
      })
      return
    }

    const valueNumber = parseDecimal(formData.Value)
    if (!formData.Value || !Number.isFinite(valueNumber) || valueNumber <= 0) {
      toast({
        title: "Validation Error",
        description: "Value must be greater than 0",
        variant: "destructive",
      })
      return
    }

    const minCheckoutNumber = parseDecimal(formData.MinCheckoutAmount)
    if (!formData.MinCheckoutAmount || !Number.isFinite(minCheckoutNumber) || minCheckoutNumber <= 0) {
      toast({
        title: "Validation Error",
        description: "Minimum checkout amount must be greater than 0",
        variant: "destructive",
      })
      return
    }

    if (!formData.ExpiryDate) {
      toast({
        title: "Validation Error",
        description: "Expiry date is required",
        variant: "destructive",
      })
      return
    }

    if (formData.CanBeUsed === "2" && selectedEvents.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one event",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) throw new Error("Authentication required")

      const requestData: any = {
        Promocode_id: selectedPromocode._id,
        PromoCodeName: formData.PromoCodeName.trim(),
        TermsCondition: formData.TermsCondition.trim(),
        PromocodeType: Number(formData.PromocodeType),
        Value: valueNumber,
        MinCheckoutAmount: minCheckoutNumber,
        ExpiryDate: formData.ExpiryDate,
        OneTimeUseFlag: formData.OneTimeUseFlag ? 1 : 0,
        PromocodeValidFor: Number(formData.PromocodeValidFor),
        CanBeUsed: Number(formData.CanBeUsed),
      }

      if (formData.CanBeUsed === "2") {
        requestData.Events = selectedEvents.filter(Boolean).map((id) => ({ event_id: id }))
      }

      const response = await fetch(promocodeEndPoint.UPDATE_PROMOCODE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      })

      const result = await handleApiResponse(response)

      toast({
        title: "Success",
        description: result.message || "Promocode updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      await fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
    } catch (error: any) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update promocode"),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (promocode: Promocode) => {
    setSelectedPromocode(promocode)
    setIsDeleteDialogOpen(true)
  }

  const handleDeletePromocode = async () => {
    if (!selectedPromocode) return

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      // Note: Delete endpoint might need to be verified with backend team
      // For now, we'll show a message that this functionality needs backend support
      toast({
        title: "Feature Not Available",
        description: "Delete promocode endpoint needs to be implemented in the backend",
        variant: "destructive",
      })
      setIsDeleteDialogOpen(false)
      setSelectedPromocode(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete promocode",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (promocode: Promocode) => {
    const isCurrentlyActive = promocode.status === PromocodeStatus.Active
    const action = isCurrentlyActive ? 'disable' : 'enable'
    const endpoint = isCurrentlyActive ? promocodeEndPoint.DISABLE_PROMOCODE : promocodeEndPoint.ENABLE_PROMOCODE

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Promocode_id: promocode._id,
        }),
      })

      const result = await handleApiResponse(response)

      toast({
        title: "Success",
        description: result.message || `Promocode ${action}d successfully`,
      })
      await fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
    } catch (error: any) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, `Failed to ${action} promocode`),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promocodes</h1>
          <p className="text-muted-foreground">Manage discount codes and promotional offers</p>
        </div>
        <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false)
            setIsEditDialogOpen(false)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Promocode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{formIsEditMode ? "Edit Promocode" : "Create New Promocode"}</DialogTitle>
              <DialogDescription>
                {formIsEditMode
                  ? "Update the promotional code details"
                  : "Create a new promotional code for your events"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="grid gap-4 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="promocodeName">Promocode Name *</Label>
                  <Input
                    id="promocodeName"
                    value={formData.PromoCodeName}
                    onChange={(e) => setFormData({...formData, PromoCodeName: e.target.value})}
                    placeholder="Enter promocode name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promocodeType">Type *</Label>
                  <Select 
                    value={formData.PromocodeType} 
                    onValueChange={(value) => setFormData({...formData, PromocodeType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Fixed Amount</SelectItem>
                      <SelectItem value="2">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">
                    Value * {formData.PromocodeType === "2" && "(%)"} {formData.PromocodeType === "1" && "(₹)"}
                  </Label>
                  <Input
                    id="value"
                    type="text"
                    inputMode="decimal"
                    value={formData.Value}
                    onChange={(e) => setFormData((prev) => ({...prev, Value: e.target.value}))}
                    placeholder="Enter value"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minAmount">Minimum Checkout Amount (₹) *</Label>
                  <Input
                    id="minAmount"
                    type="text"
                    inputMode="decimal"
                    value={formData.MinCheckoutAmount}
                    onChange={(e) => setFormData((prev) => ({...prev, MinCheckoutAmount: e.target.value}))}
                    placeholder="Enter minimum amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.ExpiryDate}
                    onChange={(e) => setFormData({...formData, ExpiryDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validFor">Applies To</Label>
                  <Select 
                    value={formData.CanBeUsed} 
                    onValueChange={(value) => {
                      setFormData({...formData, CanBeUsed: value})
                      if (value === "1") {
                        setSelectedEvents([])
                        setEventSearchTerm("")
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">All Events</SelectItem>
                      <SelectItem value="2">Specific Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Event Selection - Show only when Specific Events is selected */}
              {formData.CanBeUsed === "2" && (
                <div className="space-y-2">
                  <Label>Select Events *</Label>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search events..."
                      value={eventSearchTerm}
                      onChange={(e) => setEventSearchTerm(e.target.value)}
                      className="pl-10"
                      disabled={loadingEvents}
                    />
                  </div>

                  {loadingEvents ? (
                    <div className="flex items-center justify-center py-4 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Loading events...</span>
                    </div>
                  ) : (
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                      {!Array.isArray(events) || events.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No events available</p>
                      ) : events.filter((event) => {
                          const name = getEventName(event).toLowerCase()
                          return !eventSearchTerm || name.includes(eventSearchTerm.toLowerCase())
                        }).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No events match your search</p>
                      ) : (
                        <div className="space-y-1">
                          {events
                            .filter((event) => {
                              const name = getEventName(event).toLowerCase()
                              return !eventSearchTerm || name.includes(eventSearchTerm.toLowerCase())
                            })
                            .map((event) => {
                              const eventId = getEventId(event)
                              if (!eventId) return null
                              return (
                                <div key={eventId} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`event-${eventId}`}
                                    checked={selectedEvents.includes(eventId)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedEvents((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]))
                                      } else {
                                        setSelectedEvents((prev) => prev.filter((id) => id !== eventId))
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <Label htmlFor={`event-${eventId}`} className="text-sm font-normal cursor-pointer">
                                    {getEventName(event)}
                                  </Label>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEvents.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedEvents.length} event(s) selected
                    </p>
                  )}
                </div>
              )}

                <div className="space-y-2">
                  <Label htmlFor="canBeUsed">Visibility</Label>
                  <Select 
                    value={formData.PromocodeValidFor} 
                    onValueChange={(value) => {
                      setFormData({ ...formData, PromocodeValidFor: value })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Public</SelectItem>
                      <SelectItem value="2">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <textarea
                  id="terms"
                  className="w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm resize-none"
                  value={formData.TermsCondition}
                  onChange={(e) => setFormData({...formData, TermsCondition: e.target.value})}
                  placeholder="Enter terms and conditions"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="oneTimeUse"
                  checked={formData.OneTimeUseFlag}
                  onChange={(e) => setFormData({...formData, OneTimeUseFlag: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="oneTimeUse">One Time Use Only</Label>
              </div>
            </div>
            </div>
            <DialogFooter className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  if (formIsEditMode) {
                    setIsEditDialogOpen(false)
                  } else {
                    setIsCreateDialogOpen(false)
                  }
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={formIsEditMode ? handleUpdatePromocode : handleCreatePromocode}
                disabled={submitting || isFetchingEditDetails}
              >
                {(submitting || isFetchingEditDetails) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {formIsEditMode ? "Update Promocode" : "Create Promocode"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search promocodes..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="1">Active</SelectItem>
            <SelectItem value="0">Inactive</SelectItem>
            <SelectItem value="2">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {apiError && showErrorDialog && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {apiError}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => setShowErrorDialog(false)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Promocodes
          </CardTitle>
          <CardDescription>
            Overview of all promotional codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading promocodes...</span>
            </div>
          ) : promocodes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" ? "No promocodes found matching your criteria" : "No promocodes found"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Min Amount</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>One Time Use</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promocodes.map((promocode) => (
                    <TableRow key={promocode._id}>
                      <TableCell className="font-medium">{promocode.PromoCodeName}</TableCell>
                      <TableCell>{typeLabels[promocode.PromocodeType] || 'Unknown'}</TableCell>
                      <TableCell>
                        {promocode.PromocodeType === 2 
                          ? `${promocode.Value}%` 
                          : formatCurrency(promocode.Value)
                        }
                      </TableCell>
                      <TableCell>{formatCurrency(promocode.MinCheckoutAmount)}</TableCell>
                      <TableCell>{formatDate(promocode.ExpiryDate)}</TableCell>
                      <TableCell>
                        <Badge variant={promocode.OneTimeUseFlag === 1 ? "default" : "secondary"}>
                          {promocode.OneTimeUseFlag === 1 ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[promocode.status] || "bg-gray-100 text-gray-800"}>
                          {statusLabels[promocode.status] || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(promocode)}
                            disabled={submitting || isFetchingEditDetails}
                          >
                            {isFetchingEditDetails && selectedPromocode?._id === promocode._id && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(promocode)}
                            disabled={submitting}
                            className={promocode.status === PromocodeStatus.Active ? "text-orange-600" : "text-green-600"}
                          >
                            {submitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            {promocode.status === PromocodeStatus.Active ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              {apiError}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
            <Button onClick={handleRefresh} variant="outline">Retry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Promocode</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the promocode "{selectedPromocode?.PromoCodeName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedPromocode(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePromocode} 
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
