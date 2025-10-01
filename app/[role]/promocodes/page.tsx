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
import { promocodeEndPoint, eventEndPoint, websiteCustomer } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { Promocode, PromocodesApiResponse, PromocodeType, PromocodeStatus, CreatePromocodeRequest, Customer } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { getNumericAdminRole } from "@/lib/api-constants"

const statusColors: Record<number, string> = {
  0: "bg-gray-100 text-gray-800",    // Inactive
  1: "bg-green-100 text-green-800",  // Active
  2: "bg-red-100 text-red-800"       // Disabled
}

const statusLabels: Record<number, string> = {
  0: "Inactive",
  1: "Active", 
  2: "Disabled"
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
  
  // Events state for selection
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [eventSearchTerm, setEventSearchTerm] = useState("")
  
  // Customers state for selection
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    PromoCodeName: "",
    TermsCondition: "",
    PromocodeType: "1", // Fixed Amount by default
    Value: "",
    MinCheckoutAmount: "",
    ExpiryDate: "",
    OneTimeUseFlag: false,
    PromocodeValidFor: "1", // 1 = All events, 2 = Specific events
    CanBeUsed: "1" // 1 = All customers, 2 = Specific customers
  })
  
  const itemsPerPage = 10

  // Fetch events for selection
  const fetchEvents = useCallback(async () => {
    if (!user) return
    
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
        limit: "50", // Get more events for selection
      }

      const response = await fetch(eventEndPoint.GET_PAGINATED_PUBLISH_EVENTS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      console.log("Events API Response:", data) // Debug log
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch events")
      }

      // Extract events from the paginated response - handle different response structures
      let eventsArray = []
      if (data.data?.EventsData && Array.isArray(data.data.EventsData)) {
        eventsArray = data.data.EventsData
      } else if (data.data?.events && Array.isArray(data.data.events)) {
        eventsArray = data.data.events
      } else if (data.data && Array.isArray(data.data)) {
        eventsArray = data.data
      } else if (Array.isArray(data)) {
        eventsArray = data
      } else {
        console.warn("Unexpected events API response structure:", data)
        eventsArray = []
      }
      
      console.log("Extracted events array:", eventsArray) // Debug log
      setEvents(eventsArray)
      
    } catch (error) {
      console.error("Error fetching events:", error)
      toast({
        title: "Error",
        description: "Failed to fetch events for selection",
        variant: "destructive",
      })
    } finally {
      setLoadingEvents(false)
    }
  }, [user, toast])

  // Fetch customers for selection
  const fetchCustomers = useCallback(async () => {
    if (!user) return
    
    setLoadingCustomers(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("No valid authentication token found")
      }

      const response = await fetch(websiteCustomer.GET_ALL_CUSTOMER_DATA, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      console.log("Customers API Response:", data) // Debug log
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch customers")
      }

      // Extract customers from the response - handle different response structures
      let customersArray = []
      if (data.data && Array.isArray(data.data)) {
        customersArray = data.data
      } else if (Array.isArray(data)) {
        customersArray = data
      } else {
        console.warn("Unexpected customers API response structure:", data)
        customersArray = []
      }
      
      console.log("Extracted customers array:", customersArray) // Debug log
      setCustomers(customersArray)
      
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast({
        title: "Error",
        description: "Failed to fetch customers for selection",
        variant: "destructive",
      })
    } finally {
      setLoadingCustomers(false)
    }
  }, [user, toast])

  // Load events when dialog opens and Specific is selected
  useEffect(() => {
    if ((isCreateDialogOpen || isEditDialogOpen) && formData.PromocodeValidFor === "2") {
      fetchEvents()
    }
  }, [isCreateDialogOpen, isEditDialogOpen, formData.PromocodeValidFor, fetchEvents])

  // Load customers when dialog opens and Specific is selected
  useEffect(() => {
    if ((isCreateDialogOpen || isEditDialogOpen) && formData.CanBeUsed === "2") {
      fetchCustomers()
    }
  }, [isCreateDialogOpen, isEditDialogOpen, formData.CanBeUsed, fetchCustomers])

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
      
      if (search.trim()) {
        body.search = search.trim()
      }
      
      if (status !== "all") {
        body.status = status
      }

      const response = await fetch(promocodeEndPoint.GET_ALL_PAGINATED_PROMOCODES_DATA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: PromocodesApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch promocodes")
      }

      setPromocodes(data.data.PromocodeData || [])
      setTotalPages(data.data.totalPages || 1)
      setCurrentPage(data.data.currentPage || 1)
      setTotalPromocodes(data.data.totalPromocodes || 0)
      
    } catch (error) {
      console.error("Error fetching promocodes:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch promocodes"
      setApiError(errorMessage)
      setShowErrorDialog(true)
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

  const handleCreatePromocode = async () => {
    if (!formData.PromoCodeName.trim()) {
      toast({
        title: "Validation Error",
        description: "Promocode name is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.Value || parseFloat(formData.Value) <= 0) {
      toast({
        title: "Validation Error", 
        description: "Value must be greater than 0",
        variant: "destructive",
      })
      return
    }

    if (!formData.MinCheckoutAmount || parseFloat(formData.MinCheckoutAmount) < 0) {
      toast({
        title: "Validation Error",
        description: "Minimum checkout amount must be 0 or greater",
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

    if (formData.PromocodeValidFor === "2" && selectedEvents.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one event for specific promocode",
        variant: "destructive",
      })
      return
    }

    if (formData.CanBeUsed === "2" && selectedCustomers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one customer for specific promocode",
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

      // Build base request data
      const requestData: any = {
        PromoCodeName: formData.PromoCodeName.trim(),
        TermsCondition: formData.TermsCondition.trim(),
        PromocodeType: formData.PromocodeType,
        Value: parseFloat(formData.Value),
        MinCheckoutAmount: parseFloat(formData.MinCheckoutAmount),
        ExpiryDate: formData.ExpiryDate,
        OneTimeUseFlag: formData.OneTimeUseFlag ? 1 : 0, // Convert boolean to numeric
        PromocodeValidFor: formData.PromocodeValidFor,
        CanBeUsed: formData.CanBeUsed,
      }

      // Only include Events if PromocodeValidFor is "2" (Specific events)
      if (formData.PromocodeValidFor === "2") {
        requestData.Events = selectedEvents.map(id => ({ event_id: id }))
        console.log("Added Events to request:", requestData.Events)
      } else {
        console.log("NOT adding Events - PromocodeValidFor is:", formData.PromocodeValidFor)
      }

      // Only include CustomerIds if CanBeUsed is "2" (Specific customers)  
      if (formData.CanBeUsed === "2") {
        requestData.CustomerIds = selectedCustomers.map(id => ({ customer_id: id }))
        console.log("Added CustomerIds to request:", requestData.CustomerIds)
      } else {
        console.log("NOT adding CustomerIds - CanBeUsed is:", formData.CanBeUsed)
      }

      console.log("Final request data keys:", Object.keys(requestData))
      console.log("Has CustomerIds field?", 'CustomerIds' in requestData)

      console.log("Sending promocode request data:", JSON.stringify(requestData, null, 2)) // Debug log

      const response = await fetch(promocodeEndPoint.CREATE_PROMOCODE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()

      if (response.ok && !result.error) {
        toast({
          title: "Success",
          description: "Promocode created successfully",
        })
        setIsCreateDialogOpen(false)
        resetForm()
        await fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
      } else {
        throw new Error(result.message || "Failed to create promocode")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create promocode",
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
      PromocodeValidFor: "1",
      CanBeUsed: "1"
    })
    setSelectedPromocode(null)
    setSelectedEvents([])
    setSelectedCustomers([])
    setEventSearchTerm("")
  }

  const handleEdit = (promocode: Promocode) => {
    setSelectedPromocode(promocode)
    setFormData({
      PromoCodeName: promocode.PromoCodeName,
      TermsCondition: promocode.TermsCondition || "",
      PromocodeType: promocode.PromocodeType.toString(),
      Value: promocode.Value.toString(),
      MinCheckoutAmount: promocode.MinCheckoutAmount.toString(),
      ExpiryDate: promocode.ExpiryDate.split('T')[0], // Format date for input
      OneTimeUseFlag: promocode.OneTimeUseFlag === 1,
      PromocodeValidFor: promocode.PromocodeValidFor || "1",
      CanBeUsed: promocode.CanBeUsed || "1"
    })
    // Set selected events if available
    setSelectedEvents(promocode.Events ? promocode.Events.map((e: any) => e.event_id || e._id) : [])
    // Set selected customers if available
    setSelectedCustomers(promocode.CustomerIds ? promocode.CustomerIds.map((c: any) => c.customer_id || c._id) : [])
    setIsEditDialogOpen(true)
  }

  const handleUpdatePromocode = async () => {
    if (!selectedPromocode) return

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      // Note: Update endpoint might need to be verified with backend team
      // For now, we'll show a message that this functionality needs backend support
      toast({
        title: "Feature Not Available",
        description: "Update promocode endpoint needs to be implemented in the backend",
        variant: "destructive",
      })
      setIsEditDialogOpen(false)
      resetForm()
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Failed to update promocode",
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

      const result = await response.json()

      if (response.ok && !result.error) {
        toast({
          title: "Success",
          description: `Promocode ${action}d successfully`,
        })
        await fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
      } else {
        throw new Error(result.message || `Failed to ${action} promocode`)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} promocode`,
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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Promocode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Create New Promocode</DialogTitle>
              <DialogDescription>
                Create a new promotional code for your events
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
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.Value}
                    onChange={(e) => setFormData({...formData, Value: e.target.value})}
                    placeholder="Enter value"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minAmount">Minimum Checkout Amount (₹) *</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.MinCheckoutAmount}
                    onChange={(e) => setFormData({...formData, MinCheckoutAmount: e.target.value})}
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
                  <Label htmlFor="validFor">Valid For</Label>
                  <Select 
                    value={formData.PromocodeValidFor} 
                    onValueChange={(value) => {
                      setFormData({...formData, PromocodeValidFor: value})
                      if (value === "1") {
                        setSelectedEvents([])
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

                <div className="space-y-2">
                  <Label htmlFor="canBeUsed">Visibility</Label>
                  <Select 
                    value={formData.CanBeUsed} 
                    onValueChange={(value) => {
                      setFormData({...formData, CanBeUsed: value})
                      if (value === "1") {
                        setSelectedCustomers([])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">All Customers</SelectItem>
                      <SelectItem value="2">Specific Customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>              {/* Event Selection - Show only when Specific is selected */}
              {formData.PromocodeValidFor === "2" && (
                <div className="space-y-2">
                  <Label>Select Events *</Label>
                  
                  {/* Event Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search events..."
                      value={eventSearchTerm}
                      onChange={(e) => setEventSearchTerm(e.target.value)}
                      className="pl-10"
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
                      ) : events.filter((event) => 
                          !eventSearchTerm || 
                          (event.eventName || event.EventName || '').toLowerCase().includes(eventSearchTerm.toLowerCase())
                        ).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No events match your search</p>
                      ) : (
                        <div className="space-y-1">
                          {events
                            .filter((event) => 
                              !eventSearchTerm || 
                              (event.eventName || event.EventName || '').toLowerCase().includes(eventSearchTerm.toLowerCase())
                            )
                            .map((event) => (
                            <div key={event._id || event.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`event-${event._id || event.id}`}
                                checked={selectedEvents.includes(event._id || event.id)}
                                onChange={(e) => {
                                  const eventId = event._id || event.id
                                  if (e.target.checked) {
                                    setSelectedEvents([...selectedEvents, eventId])
                                  } else {
                                    setSelectedEvents(selectedEvents.filter(id => id !== eventId))
                                  }
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={`event-${event._id || event.id}`} className="text-sm font-normal cursor-pointer">
                                {event.eventName || event.EventName || 'Untitled Event'}
                              </Label>
                            </div>
                          ))}
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

              {/* Customer Selection - Show only when Specific is selected */}
              {formData.CanBeUsed === "2" && (
                <div className="space-y-2">
                  <Label>Select Customers *</Label>
                  {loadingCustomers ? (
                    <div className="flex items-center justify-center py-4 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Loading customers...</span>
                    </div>
                  ) : (
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                      {!Array.isArray(customers) || customers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No customers available</p>
                      ) : (
                        <div className="space-y-1">
                          {customers.map((customer) => (
                            <div key={customer._id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`customer-${customer._id}`}
                                checked={selectedCustomers.includes(customer._id)}
                                onChange={(e) => {
                                  const customerId = customer._id
                                  if (e.target.checked) {
                                    setSelectedCustomers([...selectedCustomers, customerId])
                                  } else {
                                    setSelectedCustomers(selectedCustomers.filter(id => id !== customerId))
                                  }
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={`customer-${customer._id}`} className="text-sm font-normal cursor-pointer">
                                {customer.CustomerName || customer.Email || 'Unknown Customer'}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {selectedCustomers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedCustomers.length} customer(s) selected
                    </p>
                  )}
                </div>
              )}

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
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreatePromocode} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Promocode
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
            <SelectItem value="2">Disabled</SelectItem>
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
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({totalPromocodes} total)
              </span>
            )}
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
                            onClick={() => handleEdit(promocode)}
                            disabled={submitting}
                          >
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(promocode)}
                            disabled={submitting}
                            className="text-red-600"
                          >
                            Delete
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Promocode</DialogTitle>
            <DialogDescription>
              Update promocode details
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPromocodeName">Promocode Name *</Label>
                <Input
                  id="editPromocodeName"
                  value={formData.PromoCodeName}
                  onChange={(e) => setFormData({...formData, PromoCodeName: e.target.value})}
                  placeholder="Enter promocode name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPromocodeType">Type *</Label>
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
                <Label htmlFor="editValue">
                  Value * {formData.PromocodeType === "2" && "(%)"} {formData.PromocodeType === "1" && "(₹)"}
                </Label>
                <Input
                  id="editValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.Value}
                  onChange={(e) => setFormData({...formData, Value: e.target.value})}
                  placeholder="Enter value"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMinAmount">Minimum Checkout Amount (₹) *</Label>
                <Input
                  id="editMinAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.MinCheckoutAmount}
                  onChange={(e) => setFormData({...formData, MinCheckoutAmount: e.target.value})}
                  placeholder="Enter minimum amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editExpiryDate">Expiry Date *</Label>
                <Input
                  id="editExpiryDate"
                  type="date"
                  value={formData.ExpiryDate}
                  onChange={(e) => setFormData({...formData, ExpiryDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editValidFor">Valid For</Label>
                <Select 
                  value={formData.PromocodeValidFor} 
                  onValueChange={(value) => {
                    setFormData({...formData, PromocodeValidFor: value})
                    if (value === "1") {
                      setSelectedEvents([])
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

            <div className="space-y-2">
              <Label htmlFor="editCanBeUsed">Visibility</Label>
              <Select 
                value={formData.CanBeUsed} 
                onValueChange={(value) => {
                  setFormData({...formData, CanBeUsed: value})
                  if (value === "1") {
                    setSelectedCustomers([])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">All Customers</SelectItem>
                  <SelectItem value="2">Specific Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Event Selection - Show only when Specific is selected */}
            {formData.PromocodeValidFor === "2" && (
              <div className="space-y-2">
                <Label>Select Events *</Label>
                
                {/* Event Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search events..."
                    value={eventSearchTerm}
                    onChange={(e) => setEventSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-4 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Loading events...</span>
                  </div>
                ) : (
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                    {events.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">No events available</p>
                    ) : events.filter((event) => 
                        !eventSearchTerm || 
                        (event.eventName || event.EventName || '').toLowerCase().includes(eventSearchTerm.toLowerCase())
                      ).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">No events match your search</p>
                    ) : (
                      <div className="space-y-1">
                        {events
                          .filter((event) => 
                            !eventSearchTerm || 
                            (event.eventName || event.EventName || '').toLowerCase().includes(eventSearchTerm.toLowerCase())
                          )
                          .map((event) => (
                          <div key={event._id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`edit-event-${event._id}`}
                              checked={selectedEvents.includes(event._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEvents([...selectedEvents, event._id])
                                } else {
                                  setSelectedEvents(selectedEvents.filter(id => id !== event._id))
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={`edit-event-${event._id}`} className="text-sm font-normal cursor-pointer">
                              {event.eventName || event.EventName}
                            </Label>
                          </div>
                        ))}
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

            {/* Customer Selection - Show only when Specific is selected */}
            {formData.CanBeUsed === "2" && (
              <div className="space-y-2">
                <Label>Select Customers *</Label>
                {loadingCustomers ? (
                  <div className="flex items-center justify-center py-4 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Loading customers...</span>
                  </div>
                ) : (
                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                    {customers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">No customers available</p>
                    ) : (
                      <div className="space-y-1">
                        {customers.map((customer) => (
                          <div key={customer._id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`edit-customer-${customer._id}`}
                              checked={selectedCustomers.includes(customer._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCustomers([...selectedCustomers, customer._id])
                                } else {
                                  setSelectedCustomers(selectedCustomers.filter(id => id !== customer._id))
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={`edit-customer-${customer._id}`} className="text-sm font-normal cursor-pointer">
                              {customer.CustomerName || customer.Email || 'Unknown Customer'}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {selectedCustomers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCustomers.length} customer(s) selected
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="editTerms">Terms & Conditions</Label>
              <textarea
                id="editTerms"
                className="w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm resize-none"
                value={formData.TermsCondition}
                onChange={(e) => setFormData({...formData, TermsCondition: e.target.value})}
                placeholder="Enter terms and conditions"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editOneTimeUse"
                checked={formData.OneTimeUseFlag}
                onChange={(e) => setFormData({...formData, OneTimeUseFlag: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="editOneTimeUse">One Time Use Only</Label>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePromocode} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Promocode
            </Button>
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
