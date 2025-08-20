"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, RefreshCw, AlertCircle, Plus, Edit, Trash2, Eye, EyeOff, UserCheck, UserX, KeyRound, MoreHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { promoterEndpoint, promoterEndPointPannel } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { AddressSelector } from "@/components/address-selector"
import AddAddress from "@/components/add-address"

interface PromotersPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface Promoter {
  _id: string
  FullName: string
  Username: string
  Email: string | null
  Phone1: string | null
  Country: string
  CountryIsoCode?: string
  State: string
  StateIsoCode?: string
  City: string
  CityIsoCode?: string
  ProfileImage?: string
  status: number // Changed from Status to status (lowercase) to match API
  createdAt: string
  updatedAt?: string
  FilterationDateTime?: string
  CreatedBy?: string
  createduser_id?: string
  Password?: string
  __v?: number
}

interface PromotersApiResponse {
  error: boolean
  message: string
  data: Promoter[] | {
    PromoterData: Promoter[]  // Changed from PromotersData to PromoterData
    totalPages: number
    currentPage: number
    totalPromoters: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

const statusColors = {
  0: "bg-gray-100 text-gray-800",    // Inactive
  1: "bg-green-100 text-green-800",  // Active
}

const statusLabels = {
  0: "Inactive",
  1: "Active",
}

export default function PromotersPage({ params }: PromotersPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role } = resolvedParams
  
  const { toast } = useToast()
  const { user } = useAuth()
  // State management
  const [promoters, setPromoters] = React.useState<Promoter[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = React.useState(false)
  const [selectedPromoter, setSelectedPromoter] = React.useState<Promoter | null>(null)
  const [showViewDialog, setShowViewDialog] = React.useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalPromoters, setTotalPromoters] = React.useState(0)
  const [itemsPerPage] = React.useState(10)
  
  // CRUD dialogs
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [showEditDialog, setShowEditDialog] = React.useState(false)
  const [showStatusDialog, setShowStatusDialog] = React.useState(false)
  const [showPasswordResetDialog, setShowPasswordResetDialog] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [statusAction, setStatusAction] = React.useState<'enable' | 'disable'>('disable')
  const [showPassword, setShowPassword] = React.useState(false)
  const [newPassword, setNewPassword] = React.useState("")
  // Form data
  const [formData, setFormData] = React.useState({
    FullName: "",
    Username: "",
    Email: "",
    Password: "",
    Phone1: "",
    Country: "",
    CountryIsoCode: "",
    State: "",
    StateIsoCode: "",
    City: "",
    CityIsoCode: "",
  })
  // Address selector state
  const [stateIsoCode, setStateIsoCode] = React.useState("")
  const [stateName, setStateName] = React.useState("")
  const [cityIsoCode, setCityIsoCode] = React.useState("")
  const [cityName, setCityName] = React.useState("")

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

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])
  // Fetch promoters data with pagination
  const fetchPromoters = React.useCallback(async (page: number = 1, searchKeyword: string = "") => {
    if (!user) return
    
    setLoading(true)
    setApiError(null)
    
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("No valid authentication token found")
      }

      // Use the paginated endpoint
      const endpoint = searchKeyword 
        ? promoterEndpoint.SEARCH_PROMOTER_PAGINATED 
        : promoterEndpoint.GET_ALL_PROMOTER_DATA_PAGINATED_URL

      const requestBody = {
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(searchKeyword && { search_keyword: searchKeyword })
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: PromotersApiResponse = await response.json()
      
      if (result.error) {
        throw new Error(result.message || "Failed to fetch promoters")
      }      // Handle paginated response structure
      if (result.data && typeof result.data === 'object' && 'PromoterData' in result.data) {
        const paginatedData = result.data as {
          PromoterData: Promoter[]  // Changed from PromotersData to PromoterData
          totalPages: number
          currentPage: number
          totalPromoters: number
          hasNextPage: boolean
          hasPreviousPage: boolean
        }
        setPromoters(paginatedData.PromoterData || [])  // Changed from PromotersData to PromoterData
        setTotalPages(paginatedData.totalPages || 1)
        setTotalPromoters(paginatedData.totalPromoters || 0)
        setCurrentPage(paginatedData.currentPage || page)
      } else {
        // Fallback for non-paginated response
        setPromoters(Array.isArray(result.data) ? result.data : [])
        setTotalPages(1)
        setTotalPromoters(Array.isArray(result.data) ? result.data.length : 0)
        setCurrentPage(1)
      }

    } catch (error) {
      console.error("Error fetching promoters:", error)
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      setApiError(errorMessage)
      setShowErrorDialog(true)
      setPromoters([])
      setTotalPages(1)
      setTotalPromoters(0)
    } finally {
      setLoading(false)
    }
  }, [user, itemsPerPage])

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchPromoters(newPage, debouncedSearchTerm)
    }
  }
  // Initial load
  React.useEffect(() => {
    fetchPromoters(1, "") // Always start from page 1 on initial load
  }, [fetchPromoters])

  // Handle search - reset to page 1 when searching
  React.useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return // Only trigger when debounced term is ready
    setCurrentPage(1) // Reset to page 1 for new search
    fetchPromoters(1, debouncedSearchTerm)
  }, [debouncedSearchTerm, fetchPromoters])

  // Remove the filteredPromoters useMemo since we're using server-side pagination
  // const filteredPromoters = promoters // No client-side filtering needed

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewPromoter = (promoter: Promoter) => {
    setSelectedPromoter(promoter)
    setShowViewDialog(true)
  }  // CRUD Functions
  const handleCreatePromoter = async () => {
    if (!formData.FullName || !formData.Username || !formData.Email || !formData.Password || !formData.Phone1 || !formData.CountryIsoCode) {
      toast({
        title: "Error",
        description: "Please fill all required fields including Country ISO Code",
        variant: "destructive",
      })
      return
    }

    // Validate phone number (must be exactly 10 digits)
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(formData.Phone1)) {
      toast({
        title: "Error",
        description: "Phone number must be exactly 10 digits",
        variant: "destructive",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.Email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }      // Helper function to get state ISO code based on state name (for India)
      const getStateIsoCode = (stateName: string, countryCode: string) => {
        if (countryCode === 'IN') {
          const stateMap: { [key: string]: string } = {
            'maharashtra': 'MH',
            'delhi': 'DL',
            'karnataka': 'KA',
            'tamil nadu': 'TN',
            'gujarat': 'GJ',
            'rajasthan': 'RJ',
            'punjab': 'PB',
            'haryana': 'HR',
            'uttar pradesh': 'UP',
            'west bengal': 'WB',
            'kerala': 'KL',
            'andhra pradesh': 'AP',
            'telangana': 'TG',
            'odisha': 'OR',
            'bihar': 'BR',
            'madhya pradesh': 'MP',
            'assam': 'AS',
            'jharkhand': 'JH',
            'goa': 'GA',
            'himachal pradesh': 'HP'
          }
          return stateMap[stateName.toLowerCase()] || ''
        }
        return ''
      }

      // Helper function to get city ISO code based on city name (for India)
      const getCityIsoCode = (cityName: string, countryCode: string) => {
        if (countryCode === 'IN') {
          const cityMap: { [key: string]: string } = {
            'mumbai': 'BOM',
            'delhi': 'DEL',
            'bangalore': 'BLR',
            'bengaluru': 'BLR',
            'chennai': 'MAA',
            'kolkata': 'CCU',
            'hyderabad': 'HYD',
            'pune': 'PNQ',
            'ahmedabad': 'AMD',
            'surat': 'STV',
            'jaipur': 'JAI',
            'lucknow': 'LKO',
            'kanpur': 'KNU',
            'nagpur': 'NAG',
            'indore': 'IDR',
            'thane': 'THN',
            'bhopal': 'BHO',
            'visakhapatnam': 'VTZ',
            'vadodara': 'BDQ',
            'ghaziabad': 'GZB',
            'ludhiana': 'LUH',
            'agra': 'AGR',
            'nashik': 'ISK',
            'faridabad': 'FDB',
            'meerut': 'MUT',
            'rajkot': 'RAJ',
            'kalyan': 'KYN',
            'vasai': 'VSI',
            'varanasi': 'VNS',
            'srinagar': 'SXR',
            'aurangabad': 'IXU',
            'dhanbad': 'DBD',
            'amritsar': 'ATQ',
            'navi mumbai': 'NMU',
            'allahabad': 'IXD',
            'prayagraj': 'IXD',
            'ranchi': 'IXR',
            'haora': 'HWH',
            'coimbatore': 'CJB',
            'jabalpur': 'JBP',
            'gwalior': 'GWL',
            'vijayawada': 'VGA',
            'jodhpur': 'JDH',
            'madurai': 'IXM',
            'raipur': 'RPR',
            'kota': 'KTU',
            'chandigarh': 'IXC',
            'guwahati': 'GAU'
          }
          return cityMap[cityName.toLowerCase()] || 'OTH' // Default to 'OTH' for other cities
        }
        return 'OTH' // Default for non-India countries
      }

      const payload: any = {
        FullName: formData.FullName,
        Username: formData.Username,
        Email: formData.Email,
        Password: formData.Password,
        Phone1: formData.Phone1,
        Country: formData.Country,
        CountryIsoCode: formData.CountryIsoCode,
        State: formData.State,
        City: formData.City,
        SendMailFlag: 1,
        CreatedBy: 1,
        createduser_id: user?.user_id || "",
      }

      // Add StateIsoCode if state is provided
      if (formData.State) {
        const stateIsoCode = formData.StateIsoCode || getStateIsoCode(formData.State, formData.CountryIsoCode)
        if (stateIsoCode) {
          payload.StateIsoCode = stateIsoCode
        }
      }      // Add CityIsoCode - required by API, always include
      const cityIsoCode = formData.CityIsoCode || getCityIsoCode(formData.City, formData.CountryIsoCode)
      payload.CityIsoCode = cityIsoCode

      const response = await fetch(promoterEndpoint.REGISTER_PROMOTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok && !result.error) {        toast({
          title: "Success",
          description: "Promoter created successfully",
        })
        setShowCreateDialog(false)
        resetForm()
        await fetchPromoters(currentPage, debouncedSearchTerm)
      } else {
        throw new Error(result.message || "Failed to create promoter")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create promoter",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }
  const handleEditPromoter = async () => {
    if (!selectedPromoter || !formData.FullName || !formData.Email || !formData.Phone1) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate phone number (must be exactly 10 digits)
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(formData.Phone1)) {
      toast({
        title: "Error",
        description: "Phone number must be exactly 10 digits",
        variant: "destructive",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.Email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
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

      const formDataToSend = new FormData()
      formDataToSend.append("user_id", selectedPromoter._id)
      formDataToSend.append("FullName", formData.FullName)
      formDataToSend.append("Email", formData.Email)
      formDataToSend.append("Phone1", formData.Phone1)

      const response = await fetch(promoterEndpoint.UPDATE_PROMOTER_DATA_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      })

      const result = await response.json()

      if (response.ok && !result.error) {        toast({
          title: "Success",
          description: "Promoter updated successfully",
        })
        setShowEditDialog(false)
        setSelectedPromoter(null)
        await fetchPromoters(currentPage, debouncedSearchTerm)
      } else {
        throw new Error(result.message || "Failed to update promoter")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update promoter",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedPromoter) return

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const endpoint = statusAction === 'enable' 
        ? promoterEndpoint.ENABLE_PROMOTER_URL 
        : promoterEndpoint.DISABLE_PROMOTER_URL

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          promoter_id: selectedPromoter._id,
        }),
      })

      const result = await response.json()

      if (response.ok && !result.error) {        toast({
          title: "Success",
          description: `Promoter ${statusAction}d successfully`,
        })
        setShowStatusDialog(false)
        setSelectedPromoter(null)
        await fetchPromoters(currentPage, debouncedSearchTerm)
      } else {
        throw new Error(result.message || `Failed to ${statusAction} promoter`)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${statusAction} promoter`,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!selectedPromoter || !newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
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

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(promoterEndPointPannel.PROMOTER_FORGOT_PASSWORD_RESET_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          promoter_id: selectedPromoter._id,
          new_password: newPassword,
        }),
      })

      const result = await response.json()

      if (response.ok && !result.error) {
        toast({
          title: "Success",
          description: "Password reset successfully",
        })
        setShowPasswordResetDialog(false)
        setSelectedPromoter(null)
        setNewPassword("")
      } else {
        throw new Error(result.message || "Failed to reset password")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }
  const openCreateDialog = () => {
    resetForm()
    setShowCreateDialog(true)
  }
    const openEditDialog = (promoter: Promoter) => {
    setSelectedPromoter(promoter)
    setFormData({
      FullName: promoter.FullName,
      Username: promoter.Username,
      Email: promoter.Email || "",  // Handle null values
      Password: "",
      Phone1: promoter.Phone1 || "",  // Handle null values
      Country: promoter.Country,
      CountryIsoCode: promoter.CountryIsoCode || "",
      State: promoter.State,
      StateIsoCode: promoter.StateIsoCode || "",
      City: promoter.City,
      CityIsoCode: promoter.CityIsoCode || "",
    })
    
    // Set address selector state for editing
    setStateIsoCode(promoter.StateIsoCode || "")
    setStateName(promoter.State || "")
    setCityIsoCode(promoter.CityIsoCode || "")
    setCityName(promoter.City || "")
    
    setShowEditDialog(true)
  }
  const openStatusDialog = (promoter: Promoter, action: 'enable' | 'disable') => {
    setSelectedPromoter(promoter)
    setStatusAction(action)
    setShowStatusDialog(true)
  }

  const openPasswordResetDialog = (promoter: Promoter) => {
    setSelectedPromoter(promoter)
    setNewPassword("")
    setShowPasswordResetDialog(true)
  }
  
  const resetForm = () => {
    setFormData({
      FullName: "",
      Username: "",
      Email: "",
      Password: "",
      Phone1: "",
      Country: "",
      CountryIsoCode: "",
      State: "",
      StateIsoCode: "",
      City: "",
      CityIsoCode: "",
    })
    setSelectedPromoter(null)
    
    // Reset address selector state
    setStateIsoCode("")
    setStateName("")
    setCityIsoCode("")
    setCityName("")
    
    // Reset password visibility
    setShowPassword(false)
    setNewPassword("")
  }

  // Generate password function
  const handleGeneratePassword = () => {
    const length = 8
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    
    setFormData(prev => ({ ...prev, Password: password }))
    
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

  // Generate password function for reset
  const handleGenerateResetPassword = () => {
    const length = 8
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    
    setNewPassword(password)
    
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promoters</h1>
          <p className="text-muted-foreground">Manage promoter accounts and permissions</p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="outline" onClick={fetchPromoters} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button> */}
          <Button onClick={openCreateDialog}                           className="px-4 py-2 text-sm rounded-full md:px-6 md:py-2 md:text-base"
>
            <Plus className="mr-2 h-4 w-4" />
            Add 
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search promoters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Promoters Management            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({totalPromoters} total, page {currentPage} of {totalPages})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            View and manage all promoter accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading promoters...</span>
            </div>
          ) : promoters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No promoters found matching your search' : 'No promoters found'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoters.map((promoter: Promoter) => (
                  <TableRow key={promoter._id}>
                    <TableCell className="font-medium">
                      {promoter.FullName}
                    </TableCell>                    <TableCell>{promoter.Username}</TableCell>
                    <TableCell>{promoter.Email || 'N/A'}</TableCell>
                    <TableCell>{promoter.Phone1 || 'N/A'}</TableCell>
                    <TableCell>
                      {[promoter.City, promoter.State, promoter.Country].filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell>                      <Badge className={statusColors[promoter.status as keyof typeof statusColors]}>
                        {statusLabels[promoter.status as keyof typeof statusLabels] || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(promoter.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewPromoter(promoter)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(promoter)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPasswordResetDialog(promoter)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {promoter.status === 1 ? (
                            <DropdownMenuItem 
                              onClick={() => openStatusDialog(promoter, 'disable')}
                              className="text-red-600"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Disable Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => openStatusDialog(promoter, 'enable')}
                              className="text-green-600"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Enable Account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}              </TableBody>
            </Table>
          )}
          
          {/* Pagination Controls */}
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
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Loading Promoters
            </DialogTitle>
            <DialogDescription className="pt-2">
              {apiError}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
              Close
            </Button>            <Button onClick={() => {
              setShowErrorDialog(false)
              fetchPromoters(currentPage, debouncedSearchTerm)
            }}>
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Promoter Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Promoter Details</DialogTitle>
            <DialogDescription>
              View promoter information and account details
            </DialogDescription>
          </DialogHeader>
          {selectedPromoter && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Full Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.FullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Username</Label>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.Username}</p>
                </div>                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.Email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.Phone1 || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Country</Label>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.Country}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">State</Label>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.State}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">City</Label>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.City}</p>
                </div>                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={statusColors[selectedPromoter.status as keyof typeof statusColors]}>
                    {statusLabels[selectedPromoter.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedPromoter.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Updated</Label>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.updatedAt ? formatDate(selectedPromoter.updatedAt) : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Promoter Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Promoter</DialogTitle>
            <DialogDescription>
              Add a new promoter account to the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.FullName}
                onChange={(e) => setFormData(prev => ({ ...prev, FullName: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.Username}
                onChange={(e) => setFormData(prev => ({ ...prev, Username: e.target.value }))}
                placeholder="Enter username"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.Email}
                onChange={(e) => setFormData(prev => ({ ...prev, Email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.Password}
                  onChange={(e) => setFormData(prev => ({ ...prev, Password: e.target.value }))}
                  placeholder="Enter password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {/* Generate Password Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePassword}
                className="w-full"
              >
                Generate Password
              </Button>
            </div>            <div className="grid gap-2">
              <Label htmlFor="phone">Phone * (10 digits)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.Phone1}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setFormData(prev => ({ ...prev, Phone1: value }))
                }}
                placeholder="Enter 10-digit phone number"
                maxLength={10}
              />
              {formData.Phone1 && formData.Phone1.length !== 10 && (
                <p className="text-sm text-red-500">Phone number must be exactly 10 digits</p>
              )}            </div>
              {/* Address Selector Component */}
            <div className="grid gap-2">
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
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>            <Button 
              onClick={handleCreatePromoter}
              disabled={submitting || !formData.FullName || !formData.Username || !formData.Email || !formData.Password || !formData.Phone1 || !stateIsoCode || !cityIsoCode}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Promoter"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Promoter Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Promoter</DialogTitle>
            <DialogDescription>
              Update promoter account information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editFullName">Full Name *</Label>
              <Input
                id="editFullName"
                value={formData.FullName}
                onChange={(e) => setFormData(prev => ({ ...prev, FullName: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editUsername">Username</Label>
              <Input
                id="editUsername"
                value={formData.Username}
                disabled
                className="bg-muted"
                placeholder="Username cannot be changed"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.Email}
                onChange={(e) => setFormData(prev => ({ ...prev, Email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>            <div className="grid gap-2">
              <Label htmlFor="editPhone">Phone * (10 digits)</Label>
              <Input
                id="editPhone"
                type="tel"
                value={formData.Phone1}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setFormData(prev => ({ ...prev, Phone1: value }))
                }}
                placeholder="Enter 10-digit phone number"
                maxLength={10}
              />
              {formData.Phone1 && formData.Phone1.length !== 10 && (
                <p className="text-sm text-red-500">Phone number must be exactly 10 digits</p>
              )}
            </div>
              {/* Address Selector Component */}
            <div className="grid gap-2">
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
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>            <Button 
              onClick={handleEditPromoter}
              disabled={submitting || !formData.FullName || !formData.Email || !formData.Phone1 || !stateIsoCode || !cityIsoCode}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Promoter"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusAction === 'enable' ? 'Enable' : 'Disable'} Promoter
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {statusAction} this promoter account? 
              {statusAction === 'disable' && ' This will prevent them from accessing the system.'}
              {statusAction === 'enable' && ' This will restore their access to the system.'}
            </DialogDescription>
          </DialogHeader>
          {selectedPromoter && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{selectedPromoter.FullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.Email || 'N/A'}</p>                  <p className="text-sm text-muted-foreground">
                    Current status: <Badge className={statusColors[selectedPromoter.status as keyof typeof statusColors]}>
                      {statusLabels[selectedPromoter.status as keyof typeof statusLabels]}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowStatusDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              variant={statusAction === 'disable' ? "destructive" : "default"}
              onClick={handleStatusChange}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {statusAction === 'enable' ? 'Enabling...' : 'Disabling...'}
                </>
              ) : (
                <>
                  {statusAction === 'enable' ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                  {statusAction === 'enable' ? 'Enable' : 'Disable'} Promoter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Generate and set a new password for this promoter account.
            </DialogDescription>
          </DialogHeader>
          {selectedPromoter && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">{selectedPromoter.FullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedPromoter.Email || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">@{selectedPromoter.Username}</p>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password *</Label>
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {/* Generate Password Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateResetPassword}
                  className="w-full"
                >
                  Generate Secure Password
                </Button>
                
                {newPassword && newPassword.length < 6 && (
                  <p className="text-sm text-red-500">Password must be at least 6 characters long</p>
                )}
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will immediately change the promoter's password. They will need to use the new password to login.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPasswordResetDialog(false)
                setSelectedPromoter(null)
                setNewPassword("")
                setShowPassword(false)
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordReset}
              disabled={submitting || !newPassword || newPassword.length < 6}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
