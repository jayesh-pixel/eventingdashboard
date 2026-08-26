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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MoreHorizontal, PlusCircle, Eye, KeyRound, Loader2, Search, AlertCircle, Check, ChevronRight, UserCheck, UserX, BarChart3 } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import AddAddress from "@/components/add-address"
import type { UserRole } from "@/lib/navigation"
import { organizerEndpoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { handleApiResponse, getApiErrorMessage } from "@/lib/utils"
import { SendDefaultPasswordMail } from "@/lib/api-constants"

interface OrganizersPageProps {
  params: Promise<{ role: UserRole }> | { role: UserRole }
}

// Interface matching the actual API response structure
interface Organizer {
  _id: string
  OwnerType: string
  CompanyName: string
  FullName: string
  Phone1: string | null
  Username: string
  Email: string | null
  Password: string
  Country: string
  CountryIsoCode: string
  State: string
  StateIsoCode: string
  City: string
  CityIsoCode: string
  FilterationDateTime: string
  createdAt: string
  CreatedBy: string
  createduser_id: string
  status: number
  __v: number
  resetPasswordExpires?: string
  resetPasswordToken?: string
}

// API response structure for paginated organizers
interface PaginatedOrganizersResponse {
  error: boolean
  message: string
  data: Organizer[] | {
    OrganizerData: Organizer[]
    totalPages: number
    currentPage: number
    totalOrganizers: number
    hasNextPage?: boolean
    hasPreviousPage?: boolean
  }
}

// API request structure for paginated data
interface PaginationRequest {
  page: number
  limit: number
}

// API request structure for search
interface SearchRequest {
  page: number
  limit: number
  search_keyword: string
}

// Sales data interfaces
interface SalesEvent {
  event_id: string
  EventName: string
  EventStartDate: string
  totalOnlineSales: number
  totalPromoterSales: number
  totalConvenienceFeeAmount: number
  totalSales: number
  PendingAmount: number
}

interface SalesDataResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: string
    totalEvents: number
    EventsData: SalesEvent[]
  }
}

interface TotalSalesDataResponse {
  error: boolean
  message: string
  data: {
    totalEventCount: number
    totalSalesSum: number
    totalPendingAmountSum: number
    totalConvenienceFeeAmountSum: number
  }
}

interface SalesRequest {
  organizer_id: string
  page: string
  limit: string
}

interface TotalSalesRequest {
  organizer_id: string
}

const ITEMS_PER_PAGE = 10

export default function OrganizersPage({ params }: OrganizersPageProps) {
  // Handle params as either a Promise or direct object
  const resolvedParams = React.use(params instanceof Promise ? params : Promise.resolve(params))
  const { role } = resolvedParams
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const [organizers, setOrganizers] = React.useState<Organizer[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalOrganizers, setTotalOrganizers] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingOrganizer, setEditingOrganizer] = React.useState<Organizer | null>(null)
  const [isSalesDialogOpen, setIsSalesDialogOpen] = React.useState(false)
  const [selectedOrganizerForSales, setSelectedOrganizerForSales] = React.useState<Organizer | null>(null)
  const [salesData, setSalesData] = React.useState<SalesEvent[]>([])
  const [totalSalesData, setTotalSalesData] = React.useState<TotalSalesDataResponse['data'] | null>(null)
  const [salesLoading, setSalesLoading] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)
  
  // Password reset dialog state
  const [showPasswordResetDialog, setShowPasswordResetDialog] = React.useState(false)
  const [selectedOrganizerForReset, setSelectedOrganizerForReset] = React.useState<Organizer | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  
  // Address selector state
  const [stateIsoCode, setStateIsoCode] = React.useState("")
  const [stateName, setStateName] = React.useState("")
  const [cityIsoCode, setCityIsoCode] = React.useState("")
  const [cityName, setCityName] = React.useState("")

  // Form data state for organizer creation
  const [formData, setFormData] = React.useState({
    // Basic Info
    OwnerType: "", // "ownClub" or "eventCompany"
    CompanyName: "", // Club name or company name based on owner type
    FullName: "",
    Username: "",
    Email: "",
    Phone1: "",
    
    // Address Info (simplified)
    Country: "India",
    CountryIsoCode: "IN", 
    State: "",
    StateIsoCode: "",
    City: "",
    CityIsoCode: "",
    
    // Security
    password: "",
    showPassword: false,
    
    // Notifications
    sendEmailNotification: false,
  })

  // Form validation errors
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  // Sync address selector with form data
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      State: stateName,
      StateIsoCode: stateIsoCode,
      City: cityName,
      CityIsoCode: cityIsoCode,
      Country: "India", // Always India for this component
      CountryIsoCode: "IN"
    }))
  }, [stateIsoCode, stateName, cityIsoCode, cityName])

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    // Owner Type is required
    if (!formData.OwnerType) {
      errors.OwnerType = "Please select Owner Type"
    }
    
    // Company/Club name is required when owner type is selected
    if (formData.OwnerType && !formData.CompanyName.trim()) {
      errors.CompanyName = formData.OwnerType === "ownClub" ? "Club name is required" : "Company name is required"
    }
    
    // Full Name validation
    if (!formData.FullName.trim()) {
      errors.FullName = "Full name is required"
    } else if (formData.FullName.trim().length < 3) {
      errors.FullName = "Full name must be at least 3 characters"
    } else if (formData.FullName.trim().length > 50) {
      errors.FullName = "Full name must not exceed 50 characters"
    }
    
    // Username validation
    if (!formData.Username.trim()) {
      errors.Username = "Username is required"
    } else if (formData.Username.trim().length < 3) {
      errors.Username = "Username must be at least 3 characters"
    } else if (formData.Username.trim().length > 50) {
      errors.Username = "Username must not exceed 50 characters"
    }
    
    // Email validation (optional)
    if (formData.Email && formData.Email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.Email.trim())) {
        errors.Email = "Please enter a valid email address"
      }
    }

    // Phone validation (optional)
    if (formData.Phone1 && formData.Phone1.trim() !== "") {
      const phoneRegex = /^[1-9][0-9]{9}$/
      if (!phoneRegex.test(formData.Phone1.replace(/\D/g, ""))) {
        errors.Phone1 = "Please enter a valid 10-digit phone number"
      }
    }
    
    // Password validation (required for new organizers)
    if (!editingOrganizer) {
      if (!formData.password) {
        errors.password = "Password is required"
      } else if (formData.password.length < 6) {
        errors.password = "Password must be at least 6 characters"
      } else if (formData.password.length > 10) {
        errors.password = "Password must not exceed 10 characters (login limit)"
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Generate password function
  const handleGeneratePassword = () => {
    const length = 8 // Keep it 8 characters to stay within 10 character limit
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    
    setFormData({ ...formData, password })
    
    // Copy to clipboard
    navigator.clipboard.writeText(password).then(() => {
      toast({
        title: "Password Generated",
        description: `Generated password: ${password}\nPassword copied to clipboard!`,
      })
    }).catch(() => {
      toast({
        title: "Password Generated",
        description: `Generated password: ${password}`,
      })
    })
  }

  
  
  // Fetch organizers with pagination
  const fetchOrganizers = async (page: number = 1) => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = localStorage.getItem("authToken")
      if (!user || !authToken) {
        console.error("No user or auth token available")
        setApiError("Authentication required. Please log in to view organizers.")
        setLoading(false)
        return
      }

      console.log(`Fetching organizers page ${page}...`)
      
      const requestBody: PaginationRequest = {
        page: page,
        limit: ITEMS_PER_PAGE
      }

      const response = await fetch(organizerEndpoint.GET_ALL_ORGANIZERS_PAGINATED_DATA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      })

      const data: PaginatedOrganizersResponse = await handleApiResponse(response)
      console.log("Organizers API response:", data)      // Defensive programming - handle different response structures
      if (!data.data) {        console.warn("No data in API response:", data)
        setOrganizers([])
        setCurrentPage(1)
        setTotalPages(1)
        setTotalOrganizers(0)
        setApiError("No data received from server")
        return
      }

      // Handle different response structures
      let organizersData: Organizer[] = []
      let currentPageData = 1
      let totalPagesData = 1
      let totalOrganizersData = 0
      
      if (Array.isArray(data.data)) {
        // Simple array response (your current API structure)
        organizersData = data.data
        totalOrganizersData = data.data.length
        // For simple array, we'll implement client-side pagination
        totalPagesData = Math.ceil(data.data.length / ITEMS_PER_PAGE)
        currentPageData = currentPage
      } else if (data.data.OrganizerData && Array.isArray(data.data.OrganizerData)) {
        // Paginated response structure
        organizersData = data.data.OrganizerData
        currentPageData = data.data.currentPage || 1
        totalPagesData = data.data.totalPages || 1
        totalOrganizersData = data.data.totalOrganizers || 0
      } else {
        console.warn("Unexpected API response structure:", data)
        setOrganizers([])
        setCurrentPage(1)
        setTotalPages(1)
        setTotalOrganizers(0)
        setApiError("Invalid response structure from server")
        return
      }

      // Set the paginated data
      setOrganizers(organizersData)
      setCurrentPage(currentPageData)
      setTotalPages(totalPagesData)
      setTotalOrganizers(totalOrganizersData)
      setApiError(null)
    } catch (error) {
      console.error("Error fetching organizers:", error)
      
      const errorMessage = getApiErrorMessage(error, "Failed to load organizers")
      
      setApiError(errorMessage)
      setOrganizers([])
      setCurrentPage(1)
      setTotalPages(1)
      setTotalOrganizers(0)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Search organizers with pagination
  const searchOrganizers = async (keyword: string, page: number = 1) => {
    if (!keyword.trim()) {
      fetchOrganizers(page)
      return
    }

    try {
      setLoading(true)
      setApiError(null)

      const authToken = localStorage.getItem("authToken")
      if (!user || !authToken) {
        setApiError("Authentication required for search.")
        return
      }

      const requestBody: SearchRequest = {
        page: page,
        limit: ITEMS_PER_PAGE,
        search_keyword: keyword
      }

      const response = await fetch(organizerEndpoint.GET_ORGANIZERS_PAGINATED_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      })

      const data: PaginatedOrganizersResponse = await handleApiResponse(response)
      console.log("Search response:", data)      // Defensive programming - handle different response structures
      if (!data.data) {
        console.warn("No data in search response:", data)
        setOrganizers([])
        setCurrentPage(1)
        setTotalPages(1)
        setTotalOrganizers(0)
        setApiError("No data received from server")
        return
      }      // Handle different response structures
      let organizersData: Organizer[] = []
      let currentPageData = 1
      let totalPagesData = 1
      let totalOrganizersData = 0
      
      if (Array.isArray(data.data)) {
        // Simple array response (your current API structure)
        organizersData = data.data
        totalOrganizersData = data.data.length
        // For simple array, we'll implement client-side pagination
        totalPagesData = Math.ceil(data.data.length / ITEMS_PER_PAGE)
        currentPageData = page
      } else if (data.data.OrganizerData && Array.isArray(data.data.OrganizerData)) {
        // Paginated response structure
        organizersData = data.data.OrganizerData
        currentPageData = data.data.currentPage || 1
        totalPagesData = data.data.totalPages || 1
        totalOrganizersData = data.data.totalOrganizers || 0
      } else {
        console.warn("Unexpected search response structure:", data)
        setOrganizers([])
        setCurrentPage(1)
        setTotalPages(1)
        setTotalOrganizers(0)
        setApiError("Invalid response structure from server")
        return
      }

      // Set the search results
      setOrganizers(organizersData)
      setCurrentPage(currentPageData)
      setTotalPages(totalPagesData)
      setTotalOrganizers(totalOrganizersData)
      setApiError(null)
    } catch (error) {
      console.error("Error searching organizers:", error)
      const errorMessage = getApiErrorMessage(error, "Search failed. Please try again.")
      setApiError(errorMessage)
      setOrganizers([])
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Initialize data on component mount
  React.useEffect(() => {
    fetchOrganizers(1)
  }, [user])

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(delay)
  }, [searchTerm])

  React.useEffect(() => {
    if (debouncedSearchTerm === "") {
      fetchOrganizers(currentPage)
    } else {
      searchOrganizers(debouncedSearchTerm, 1) // Always start from page 1 for new searches
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm])
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (debouncedSearchTerm) {
      searchOrganizers(debouncedSearchTerm, page)
    } else {
      fetchOrganizers(page)
    }
  }

  const resetForm = () => {
    setFormData({
      // Basic Info
      OwnerType: "",
      CompanyName: "",
      FullName: "",
      Username: "",
      Email: "",
      Phone1: "",
      
      // Address Info
      Country: "India",
      CountryIsoCode: "IN",
      State: "",
      StateIsoCode: "",
      City: "",
      CityIsoCode: "",
      
      // Security
      password: "",
      showPassword: false,
      
      // Notifications
      sendEmailNotification: false,    })
    setEditingOrganizer(null)
    setFormErrors({})
    
    // Reset address selector state
    setStateIsoCode("")
    setStateName("")
    setCityIsoCode("")
    setCityName("")
  }

  const handleFormSubmit = async () => {
    // Validate the form
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      const authToken = localStorage.getItem("authToken")
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      // Prepare the payload based on the original form structure and API requirements
      const payload = {
        OwnerType: formData.OwnerType === "ownClub" ? 1 : 2, // 1 for Club, 2 for EventCompany
        CompanyName: formData.CompanyName,
        FullName: formData.FullName,
        Username: formData.Username,
        Email: formData.Email?.trim() ? formData.Email.trim() : undefined,
        Phone1: formData.Phone1?.trim() ? formData.Phone1.trim() : undefined,
        Password: editingOrganizer ? undefined : formData.password,
        Country: formData.Country,
        CountryIsoCode: formData.CountryIsoCode,
        State: formData.State,
        StateIsoCode: formData.StateIsoCode,
        City: formData.City,
        CityIsoCode: formData.CityIsoCode,
        SendMailFlag: formData.sendEmailNotification ? SendDefaultPasswordMail.Yes : SendDefaultPasswordMail.No,
        createduser_id: user?.user_id || "",
        CreatedBy: 1,
      }

      // Remove undefined fields
      Object.keys(payload).forEach(key => {
        if (payload[key as keyof typeof payload] === undefined) {
          delete payload[key as keyof typeof payload]
        }
      })

      let response
      if (editingOrganizer) {
        // Use the updateProfile endpoint which only supports limited fields
        const updatePayload = {
          user_id: editingOrganizer._id,
          FullName: formData.FullName,
          Email: formData.Email || "",
          Phone1: formData.Phone1 || "",
        }

        // Create FormData for multipart/form-data as required by the API
        const formDataPayload = new FormData()
        Object.entries(updatePayload).forEach(([key, value]) => {
          if (value) formDataPayload.append(key, value)
        })

        response = await fetch(organizerEndpoint.UPDATE_ORGANIZER_PROFILE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            // Don't set Content-Type for FormData - browser will set it with boundary
          },
          body: formDataPayload,
        })
      } else {
        // TODO: Replace with actual create organizer endpoint
        response = await fetch(organizerEndpoint.REGISTER_ORGANIZER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `API error: ${response.status}`
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
        } catch {
          // If response is not JSON, use the text or default message
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.message || "Operation failed")
      }
      
      toast({ 
        title: "Success", 
        description: editingOrganizer ? "Organizer updated successfully." : "Organizer created successfully." 
      })
      
      // Only close dialog and reset form on success
      setIsFormOpen(false)
      resetForm()
      
      // Refresh the current page
      if (debouncedSearchTerm) {
        searchOrganizers(debouncedSearchTerm, currentPage)
      } else {
        fetchOrganizers(currentPage)
      }
    } catch (error) {
      console.error("Error saving organizer:", error)
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save organizer. Please try again.", 
        variant: "destructive" 
      })
      // Don't close dialog or reset form on error - let user fix the issue
    } finally {
      setLoading(false)
      // Removed dialog closing and form reset from finally block
    }
  }

  const handleEdit = (organizer: Organizer) => {
    setEditingOrganizer(organizer)
    setFormData({
      // Basic Info
      OwnerType: organizer.OwnerType === "Club" ? "ownClub" : "eventCompany",
      CompanyName: organizer.CompanyName || "",
      FullName: organizer.FullName || "",
      Username: organizer.Username || "",
      Email: organizer.Email || "",
      Phone1: organizer.Phone1 || "",
      
      // Address Info
      Country: organizer.Country || "India",
      CountryIsoCode: organizer.CountryIsoCode || "IN",
      State: organizer.State || "",
      StateIsoCode: organizer.StateIsoCode || "",
      City: organizer.City || "",
      CityIsoCode: organizer.CityIsoCode || "",
      
      // Security
      password: "",
      showPassword: false,
      
      // Notifications
      sendEmailNotification: false,    })
    
    // Set address selector state
    setStateName(organizer.State || "")
    setStateIsoCode(organizer.StateIsoCode || "")
    setCityName(organizer.City || "")
    setCityIsoCode(organizer.CityIsoCode || "")
    
    setFormErrors({})
    setIsFormOpen(true)
  }
  const handleDisable = async (organizerId: string) => {
    try {
      setLoading(true)
      
      const authToken = localStorage.getItem("authToken")
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      // Find the organizer to determine current status
      const organizer = organizers.find(org => org._id === organizerId)
      if (!organizer) {
        throw new Error("Organizer not found")
      }

      // Determine which endpoint to use based on current status
      const isCurrentlyActive = organizer.status === 1
      const endpoint = isCurrentlyActive 
        ? organizerEndpoint.DISABLE_ORGANIZER_URL 
        : organizerEndpoint.ENABLE_ORGANIZER_URL
      
      const action = isCurrentlyActive ? "disabled" : "enabled"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          organizer_id: organizerId
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.message || `Failed to ${action.slice(0, -1)} organizer`)
      }
      
      toast({ 
        title: "Success", 
        description: `Organizer ${action} successfully.` 
      })
      
      // Refresh the current page
      if (debouncedSearchTerm) {
        searchOrganizers(debouncedSearchTerm, currentPage)
      } else {
        fetchOrganizers(currentPage)
      }
    } catch (error) {
      console.error("Error updating organizer status:", error)
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update organizer status. Please try again.",        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }
  const handleResetPassword = async () => {
    if (!selectedOrganizerForReset || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please enter both password fields",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const authToken = localStorage.getItem("authToken")
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      const response = await fetch(organizerEndpoint.UPDATE_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          organizer_id: selectedOrganizerForReset._id,
          new_password: newPassword,
          CreatedBy: 1,
          createduser_id: user.user_id,
        }),
      })

      const result = await response.json()

      if (response.ok && !result.error) {
        toast({
          title: "Success",
          description: "Password reset successfully",
        })
        setShowPasswordResetDialog(false)
        setSelectedOrganizerForReset(null)
        setNewPassword("")
        await fetchOrganizers(currentPage)
      } else {
        throw new Error(result.message || "Failed to reset password")
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openPasswordResetDialog = (organizer: Organizer) => {
    setSelectedOrganizerForReset(organizer)
    setNewPassword("")
    setConfirmPassword("")
    setShowPasswordResetDialog(true)
  }

  // Generate password function for reset
  const handleGenerateResetPassword = () => {
    const length = 8
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    
    setNewPassword(password)
    setConfirmPassword(password)
    
    // Copy to clipboard
    navigator.clipboard.writeText(password).then(() => {
      toast({
        title: "Password Generated",
        description: `Generated password: ${password}\nPassword copied to clipboard!`,
      })
    }).catch(() => {
      toast({
        title: "Password Generated",
        description: `Generated password: ${password}`,
      })
    })
  }


  // Helper function to get status display text and variant
  const getStatusDisplay = (status: number) => {
    switch (status) {
      case 1:
        return { text: "Active", variant: "default" as const }
      case 0:
        return { text: "Inactive", variant: "secondary" as const }
      default:
        return { text: "Unknown", variant: "destructive" as const }
    }
  }  // Fetch sales data for an organizer
  const fetchSalesData = async (organizerId: string) => {
    try {
      setSalesLoading(true)

      const authToken = localStorage.getItem("authToken")
      if (!user || !authToken) {
        toast({ title: "Error", description: "Authentication required.", variant: "destructive" })
        return
      }

      const salesRequest: SalesRequest = {
        organizer_id: organizerId,
        page: "1",
        limit: "10"
      }

      const totalSalesRequest: TotalSalesRequest = {
        organizer_id: organizerId
      }

      // Fetch both sales data and total sales data concurrently
      const [salesResponse, totalSalesResponse] = await Promise.all([
        fetch(organizerEndpoint.ORGANIZER_SALES_DATA_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(salesRequest),
        }),
        fetch(organizerEndpoint.ORGANIZER_TOTAL_SALES_DATA_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(totalSalesRequest),
        })
      ])

      if (!salesResponse.ok || !totalSalesResponse.ok) {
        throw new Error("Failed to fetch sales data")
      }

      const salesData: SalesDataResponse = await salesResponse.json()
      const totalSalesData: TotalSalesDataResponse = await totalSalesResponse.json()

      if (salesData.error || totalSalesData.error) {
        throw new Error(salesData.message || totalSalesData.message || "Failed to fetch sales data")
      }

      setSalesData(salesData.data.EventsData)
      setTotalSalesData(totalSalesData.data)
    } catch (error) {
      console.error("Error fetching sales data:", error)
      toast({ 
        title: "Error", 
        description: "Failed to fetch sales data. Please try again.", 
        variant: "destructive" 
      })
    } finally {
      setSalesLoading(false)
    }
  }

  const openSalesDialog = (organizer: Organizer) => {
    setSelectedOrganizerForSales(organizer)
    setIsSalesDialogOpen(true)
    fetchSalesData(organizer._id)
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organizers Management</h1>
        <Button
          onClick={() => {
            resetForm()
            setIsFormOpen(true)
          }}
          disabled={loading}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Organizer
        </Button>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {apiError}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => {
                setApiError(null)
                fetchOrganizers(currentPage)
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search organizers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Organizers</CardTitle>
          <CardDescription>
            View and manage event organizers. 
            {loading && " Loading..."}
            {!loading && ` (${totalOrganizers} total, page ${currentPage} of ${totalPages})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading organizers...</span>
            </div>
          ) : !organizers || organizers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchTerm ? `No organizers found matching "${searchTerm}"` : "No organizers found"}
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSearchTerm("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone no.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>              <TableBody>
                {(organizers || []).map((org) => {
                  // Debug: Log the organizer status
                  console.log(`Organizer ${org.Username} - status:`, org.status, 'type:', typeof org.status)
                  
                  // status === 1 means Active, status === 0 or 2 means Disabled
                  const isDisabled = org.status !== 1
                  
                  return (
                    <TableRow 
                      key={org._id}
                      className={isDisabled ? "bg-red-50 hover:bg-red-50 border-l-4 border-l-red-600" : ""}
                    >
                      <TableCell className="font-medium">{org.Username || "N/A"}</TableCell>
                      <TableCell>{org.FullName || "N/A"}</TableCell>
                      <TableCell>{org.City || "N/A"}</TableCell>
                      <TableCell>{org.Email || "N/A"}</TableCell>
                      <TableCell>{org.Phone1 || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={isDisabled ? "destructive" : "default"}>
                          {isDisabled ? "Disabled" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={loading}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(org)}>
                              <Eye className="mr-2 h-4 w-4" /> View & Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/${role}/organizers/${org._id}/sales`)}>
                              <BarChart3 className="mr-2 h-4 w-4" /> Sales
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDisable(org._id)}>
                              {org.status === 0 ? (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" /> Enable Organizer
                                </>
                              ) : (
                                <>
                                  <UserX className="mr-2 h-4 w-4" /> Disable Organizer
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordResetDialog(org)}>
                              <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
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
                {[...Array(Math.min(totalPages, 10))].map((_, i) => {
                  const page = i + 1
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === page}
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(page)
                        }}
                      >
                        {page}
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
      </Card>      {/* Add/Edit Organizer Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrganizer ? "Edit Organizer" : "Add New Organizer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Owner Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Owner Type <span className="text-red-500">*</span></Label>
              <div className="flex gap-6">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="ownClub"
                    name="organizerType"
                    value="ownClub"
                    checked={formData.OwnerType === "ownClub"}
                    onChange={(e) => setFormData({ ...formData, OwnerType: e.target.value, CompanyName: "" })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="ownClub" className="ml-2 text-sm font-medium text-gray-900">
                    Own club
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="eventCompany"
                    name="organizerType"
                    value="eventCompany"
                    checked={formData.OwnerType === "eventCompany"}
                    onChange={(e) => setFormData({ ...formData, OwnerType: e.target.value, CompanyName: "" })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="eventCompany" className="ml-2 text-sm font-medium text-gray-900">
                    Event company name
                  </label>
                </div>
              </div>
              {formErrors.OwnerType && (
                <div className="text-red-600 text-sm">{formErrors.OwnerType}</div>
              )}
            </div>

            {/* Conditional Company/Club Name Fields */}
            {formData.OwnerType === "ownClub" && (
              <div className="space-y-2">
                <Label htmlFor="clubName" className="text-sm font-medium">Own Club Name <span className="text-red-500">*</span></Label>
                <Input
                  id="clubName"
                  value={formData.CompanyName}
                  onChange={(e) => setFormData({ ...formData, CompanyName: e.target.value })}
                  placeholder="Enter your club name"
                />
                {formErrors.CompanyName && (
                  <div className="text-red-600 text-sm">{formErrors.CompanyName}</div>
                )}
              </div>
            )}

            {formData.OwnerType === "eventCompany" && (
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium">Event Company Name <span className="text-red-500">*</span></Label>
                <Input
                  id="companyName"
                  value={formData.CompanyName}
                  onChange={(e) => setFormData({ ...formData, CompanyName: e.target.value })}
                  placeholder="Enter event company name"
                />
                {formErrors.CompanyName && (
                  <div className="text-red-600 text-sm">{formErrors.CompanyName}</div>
                )}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="organizerFullName" className="text-sm font-medium">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="organizerFullName"
                value={formData.FullName}
                onChange={(e) => setFormData({ ...formData, FullName: e.target.value })}
                placeholder="Enter organizer full name"
              />
              {formErrors.FullName && (
                <div className="text-red-600 text-sm">{formErrors.FullName}</div>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="organizerusername" className="text-sm font-medium">Username <span className="text-red-500">*</span></Label>
              <Input
                id="organizerusername"
                value={formData.Username}
                onChange={(e) => setFormData({ ...formData, Username: e.target.value })}
                placeholder="Enter organizer username"
              />
              {formErrors.Username && (
                <div className="text-red-600 text-sm">{formErrors.Username}</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email - Optional */}
              <div className="space-y-2">
                <Label htmlFor="organizerEmail" className="text-sm font-medium">Email Id</Label>
                <Input
                  id="organizerEmail"
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                  placeholder="Enter organizer emailId (optional)"
                />
                {formErrors.Email && (
                  <div className="text-red-600 text-sm">{formErrors.Email}</div>
                )}
              </div>

              {/* Phone Number - Optional */}
              <div className="space-y-2">
                <Label htmlFor="organizerPhoneNo" className="text-sm font-medium">Phone No.</Label>
                <Input
                  id="organizerPhoneNo"
                  value={formData.Phone1}
                  onChange={(e) => setFormData({ ...formData, Phone1: e.target.value })}
                  placeholder="Enter organizer phone number (optional)"
                />
                {formErrors.Phone1 && (
                  <div className="text-red-600 text-sm">{formErrors.Phone1}</div>
                )}
              </div>
            </div>

            {/* Address Information - Show for both create and edit */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Address Information</Label>
              
              <AddAddress
                stateIsoCode={stateIsoCode}
                setStateIsoCode={setStateIsoCode}
                stateName={stateName}
                setStateName={setStateName}
                cityIsoCode={cityIsoCode}
                setCityIsoCode={setCityIsoCode}
                cityName={cityName}
                setCityName={setCityName}
              />
            </div>

            {/* Password - Only show for create mode */}
            {!editingOrganizer && (
              <div className="space-y-2">
                <Label htmlFor="organizerPassword" className="text-sm font-medium">Password <span className="text-red-500">*</span> (6-10 characters)</Label>
                <div className="relative">
                  <Input
                    id="organizerPassword"
                    type={formData.showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Generate the Password (max 10 characters)"
                    className="pr-10"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setFormData({ ...formData, showPassword: !formData.showPassword })}
                  >
                    <Eye className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                {formErrors.password && (
                  <div className="text-red-600 text-sm">{formErrors.password}</div>
                )}
                
                {/* Generate Password Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePassword}
                  className="w-full"
                >
                  Generate Password (8 chars)
                </Button>
              </div>
            )}

            {/* Send Email Notification 3- Only show for create mode, OPTIONAL, no asterisk */}
            {!editingOrganizer && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={formData.sendEmailNotification}
                  onCheckedChange={(checked) => setFormData({ ...formData, sendEmailNotification: checked === true })}
                  disabled={!formData.Email || formData.Email.trim() === ""}
                />
                <Label htmlFor="sendEmail" className="text-sm">
                  Tick here to send a new account information message to this individual
                </Label>
              </div>
            )}

          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsFormOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleFormSubmit}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingOrganizer ? "Save Changes" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      {/* Sales Data Dialog */}
      <Dialog open={isSalesDialogOpen} onOpenChange={setIsSalesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Sales Data: {selectedOrganizerForSales?.FullName}</DialogTitle>
            <DialogDescription>View sales data and events for this organizer.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">{salesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading sales data...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Total Sales Summary */}
                {totalSalesData && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Sales Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Events</div>
                        <div className="text-2xl font-bold">{totalSalesData.totalEventCount}</div>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Sales</div>
                        <div className="text-2xl font-bold">₹{totalSalesData.totalSalesSum.toLocaleString()}</div>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">Pending Amount</div>
                        <div className="text-2xl font-bold text-red-600">₹{totalSalesData.totalPendingAmountSum.toLocaleString()}</div>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">Convenience Fee</div>
                        <div className="text-2xl font-bold">₹{totalSalesData.totalConvenienceFeeAmountSum.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}                {/* Events Table */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Events</h3>
                  {!salesData || salesData.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">
                        No events found for this organizer.
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto border rounded-md">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead>Event Name</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Online Sales</TableHead>
                            <TableHead>Promoter Sales</TableHead>
                            <TableHead>Total Sales</TableHead>
                            <TableHead>Convenience Fee</TableHead>
                            <TableHead>Pending Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.map((event) => (
                            <TableRow key={event.event_id}>
                              <TableCell className="font-medium">{event.EventName}</TableCell>
                              <TableCell>{event.EventStartDate}</TableCell>
                              <TableCell>₹{event.totalOnlineSales.toLocaleString()}</TableCell>
                              <TableCell>₹{event.totalPromoterSales.toLocaleString()}</TableCell>
                              <TableCell className="font-semibold">₹{event.totalSales.toLocaleString()}</TableCell>
                              <TableCell>₹{event.totalConvenienceFeeAmount.toLocaleString()}</TableCell>
                              <TableCell className="text-red-600 font-semibold">₹{event.PendingAmount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsSalesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedOrganizerForReset?.FullName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateResetPassword}
              className="w-full"
            >
              Generate Random Password
            </Button>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordResetDialog(false)
                setSelectedOrganizerForReset(null)
                setNewPassword("")
                setConfirmPassword("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
