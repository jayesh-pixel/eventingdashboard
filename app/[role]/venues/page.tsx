"use client"

import { authFetch } from "@/lib/auth-fetch"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, PlusCircle, Search, Edit, Trash2, MapPin, Users, Upload, Loader2 } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { venueEndPoint, getallcityDataEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { getNumericAdminRole } from "@/lib/api-constants"
import { formatDate, handleApiResponse, getApiErrorMessage } from "@/lib/utils"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface VenuesPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface Venue {
  _id: string
  Name: string
  Description: string | null
  Address: string
  City: string
  State: string
  Country: string
  CountryIsoCode: string
  StateIsoCode: string
  CityIsoCode: string
  Map_Location: string
  Images: Array<{
    image_path: string
    _id: string
  }>
  status: number
  createdAt: string
  FilterationDateTime: string
  Priority: number
  __v?: number
}

interface ApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalVenue: number
    VenueData: Venue[]
  }
}

const ITEMS_PER_PAGE = 10

// Same anchored pattern as the API's isValidGoogleMapsIframe (helpers/commonFunctions.js);
// anything else is rejected with 400 "Invalid Google Maps iframe URL".
const GOOGLE_MAPS_IFRAME_REGEX =
  /^<iframe src="https:\/\/www\.google\.com\/maps\/embed\?pb=.+?" width="\d+" height="\d+" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"><\/iframe>$/
const GOOGLE_MAPS_EMBED_URL_REGEX = /^https:\/\/www\.google\.com\/maps\/embed\?pb=[^"\s<>]+$/
const MAP_LOCATION_ERROR =
  'Map Location must be the Google Maps embed code: in Google Maps choose Share > Embed a map > Copy HTML and paste the whole <iframe ...></iframe>.'

// Trims the pasted value and wraps a bare embed URL in the iframe markup Google's
// "Embed a map" dialog produces, which is the only shape the API accepts.
const normalizeMapLocation = (value: string): string => {
  const trimmed = value.trim()
  if (GOOGLE_MAPS_EMBED_URL_REGEX.test(trimmed)) {
    return `<iframe src="${trimmed}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
  }
  return trimmed
}

export default function VenuesPage({ params }: VenuesPageProps) {
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
  const [venues, setVenues] = React.useState<Venue[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalVenues, setTotalVenues] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [selectedVenue, setSelectedVenue] = React.useState<Venue | null>(null)
  const [deleteVenueId, setDeleteVenueId] = React.useState<string | null>(null)
  const [apiError, setApiError] = React.useState<string | null>(null)

  // Image upload state
  const [selectedImages, setSelectedImages] = React.useState<File[]>([])
  const [uploadingImages, setUploadingImages] = React.useState(false)
  const [imageValidationErrors, setImageValidationErrors] = React.useState<string[]>([])

  // Image validation function
  const validateImageFile = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        resolve(`File "${file.name}" must be PNG or JPG format`)
        return
      }

      // Check file size (500 KB = 500 * 1024 bytes)
      const maxSize = 500 * 1024
      if (file.size > maxSize) {
        resolve(`File "${file.name}" must be smaller than 500 KB`)
        return
      }

      // Check dimensions
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        if (img.width !== 1024 || img.height !== 812) {
          resolve(`File "${file.name}" must be exactly 1024x812 pixels (current: ${img.width}x${img.height})`)
        } else {
          resolve(null) // Valid
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(`File "${file.name}" could not be read as an image`)
      }

      img.src = url
    })
  }

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when searching
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Search handler
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  // Form state
  const [formData, setFormData] = React.useState({
    venueName: "",
    priority: 0,
    venueDescription: "",
    fullAddress: "",
    state: "Meghalaya",
    city: "",
    mapLocation: "",
  })

  // State/city data for dropdowns (AddAddress logic)
  interface State { id: number; name: string; iso2: string; }
  interface City { id: number; name: string; }
  const [stateData, setStateData] = React.useState<State[]>([]);
  const [cityData, setCityData] = React.useState<City[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(false);
  const API_KEY = "TUo5UThvYmNjckE0U294WmdzeFBtZmV4RzZlMUxhUHhTaG05TURVdQ==";

  // Fetch all states on dialog open
  React.useEffect(() => {
    if ((isCreateDialogOpen || isEditDialogOpen)) {
      const fetchStates = async () => {
        try {
          const resp = await fetch("https://api.countrystatecity.in/v1/countries/IN/states", {
            headers: { "X-CSCAPI-KEY": API_KEY }
          });
          if (!resp.ok) throw new Error("Failed to fetch states");
          const data = await resp.json();
          setStateData(data);
        } catch (err) {
          setStateData([]);
        }
      };
      fetchStates();
    }
  }, [isCreateDialogOpen, isEditDialogOpen]);

  // Fetch cities when state changes
  React.useEffect(() => {
    if (formData.state && (isCreateDialogOpen || isEditDialogOpen)) {
      setLoadingCities(true);
      const fetchCities = async () => {
        try {
          const selectedState = stateData.find(s => s.name === formData.state);
          if (!selectedState) { setCityData([]); setLoadingCities(false); return; }
          const resp = await fetch(`https://api.countrystatecity.in/v1/countries/IN/states/${selectedState.iso2}/cities`, {
            headers: { "X-CSCAPI-KEY": API_KEY }
          });
          if (!resp.ok) throw new Error("Failed to fetch cities");
          const data = await resp.json();
          setCityData(data);
        } catch (err) {
          setCityData([]);
        } finally {
          setLoadingCities(false);
        }
      };
      fetchCities();
    } else {
      setCityData([]);
    }
  }, [formData.state, isCreateDialogOpen, isEditDialogOpen, stateData]);

  // ...existing code...

  // API function to fetch venues
  const fetchVenues = React.useCallback(async (page: number = 1, limit: number = ITEMS_PER_PAGE, search: string = "") => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = getValidToken()
      if (!user || !authToken) {
        console.warn("No user or auth token available")
        return
      }

      // Use paginated search endpoint if search term is provided, otherwise use regular paginated endpoint
      const endpoint = search.trim() ? venueEndPoint.VENUE_SEARCH_PAGINATED : venueEndPoint.VENUES_PAGINATED_URL
      
      const body: any = {
        AdminRole: getNumericAdminRole(user.AdminRole || role),
        user_id: user.user_id,
        page: page,
        limit: limit.toString(),
      }

      // Add search parameter if searching - use correct parameter name
      if (search.trim()) {
        body.search_keyword = search.trim()
      }

      const response = await authFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      })

      // The API answers an empty page with 404 "Venue not found" (no venues yet, no search
      // match, or the last row of a page deleted). Treat it as an empty list, otherwise the
      // previous rows stay on screen behind an error toast.
      if (response.status === 404) {
        setVenues([])
        setTotalPages(1)
        setTotalVenues(0)
        if (page > 1) setCurrentPage(page - 1)
        return
      }

      const data: ApiResponse = await handleApiResponse(response)

      setVenues(data.data.VenueData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalVenues(data.data.totalVenue || 0)
      setCurrentPage(data.data.currentPage || 1)

    } catch (error) {
      console.error("Venues fetch failed:", error)
      setApiError("Could not fetch venues from server")
      
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Could not fetch venues from server."),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, role])

  // Initial data fetch and search
  React.useEffect(() => {
    fetchVenues(currentPage, ITEMS_PER_PAGE, debouncedSearchTerm)
  }, [currentPage, fetchVenues, debouncedSearchTerm])

  // Remove the client-side filtering since we're now using API search
  // const filteredVenues = React.useMemo(() => {
  //   if (!searchTerm) return venues
  //   return venues.filter(
  //     (venue) =>
  //       venue.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       venue.City.toLowerCase().includes(searchTerm.toLowerCase()),
  //   )
  // }, [venues, searchTerm])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCreateVenue = async () => {
    if (!formData.venueName.trim() || !formData.fullAddress.trim() || !formData.state.trim() || !formData.city.trim() || !formData.mapLocation.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Name, Address, State, City, and Map Location)",
        variant: "destructive",
      })
      return
    }

    if (formData.venueName.trim().length < 3) {
      toast({
        title: "Error",
        description: "Venue name must be at least 3 characters",
        variant: "destructive",
      })
      return
    }

    if (formData.venueDescription.trim() && formData.venueDescription.trim().length < 5) {
      toast({
        title: "Error",
        description: "Description must be at least 5 characters",
        variant: "destructive",
      })
      return
    }

    const mapLocation = normalizeMapLocation(formData.mapLocation)
    if (!GOOGLE_MAPS_IFRAME_REGEX.test(mapLocation)) {
      toast({
        title: "Error",
        description: MAP_LOCATION_ERROR,
        variant: "destructive",
      })
      return
    }

    if (selectedImages.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one venue image",
        variant: "destructive",
      })
      return
    }

    // The create API accepts at most 5 "Images"; a 6th fails in multer with "Unexpected field".
    if (selectedImages.length > 5) {
      toast({
        title: "Error",
        description: "You can upload at most 5 venue images",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      const selectedState = stateData.find(s => s.name === formData.state)
      const selectedCity = cityData.find(c => c.name === formData.city)

      // Use FormData for venue creation with images
      const formDataPayload = new FormData()
      formDataPayload.append('AdminRole', getNumericAdminRole(user.AdminRole || role).toString())
      formDataPayload.append('user_id', user.user_id)
      formDataPayload.append('Name', formData.venueName)
      formDataPayload.append('Description', formData.venueDescription)
      formDataPayload.append('Address', formData.fullAddress)
      formDataPayload.append('City', formData.city)
      formDataPayload.append('State', formData.state)
      formDataPayload.append('Country', 'India')
      formDataPayload.append('CountryIsoCode', 'IN')
      formDataPayload.append('StateIsoCode', selectedState?.iso2 || '')
      // Backend expects CityIsoCode as a 2-20 char string; city API only returns id+name,
      // so we derive a code from the city name (first 3 chars uppercased)
      const cityCode = (selectedCity?.name || formData.city || '').replace(/\s/g, '').substring(0, 3).toUpperCase() || 'OTH'
      formDataPayload.append('CityIsoCode', cityCode)
      formDataPayload.append('Map_Location', mapLocation)
      formDataPayload.append('Priority', formData.priority.toString())

      // Append images
      selectedImages.forEach((image) => {
        formDataPayload.append('Images', image)
      })

      console.log("Creating venue with FormData")

      const response = await authFetch(venueEndPoint.VENUE_CREATION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formDataPayload,
      })

      console.log("Create venue response status:", response.status)

      const result = await handleApiResponse(response)
      console.log("Create venue response:", result)

      await fetchVenues(currentPage, ITEMS_PER_PAGE, debouncedSearchTerm)
      setIsCreateDialogOpen(false)
      resetForm()

      toast({
        title: "Success",
        description: result.message || "Venue created successfully",
      })
    } catch (error) {
      console.error("Create venue error:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create venue"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditVenue = async () => {
    if (!selectedVenue) {
      return
    }

    // Only send Map_Location when it changed: the API re-validates whatever it receives,
    // so an unchanged older value would block saving unrelated fields.
    const mapLocation = normalizeMapLocation(formData.mapLocation)
    const mapLocationChanged = mapLocation !== (selectedVenue.Map_Location || "").trim()
    if (mapLocationChanged && mapLocation && !GOOGLE_MAPS_IFRAME_REGEX.test(mapLocation)) {
      toast({
        title: "Error",
        description: MAP_LOCATION_ERROR,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      const selectedState = stateData.find(s => s.name === formData.state)
      const selectedCity = cityData.find(c => c.name === formData.city)

      const payload = {
        AdminRole: getNumericAdminRole(user.AdminRole || role),
        user_id: user.user_id,
        venue_id: selectedVenue._id,
        Name: formData.venueName,
        Description: formData.venueDescription,
        Address: formData.fullAddress,
        City: formData.city,
        State: formData.state,
        Country: "India",
        CountryIsoCode: "IN",
        StateIsoCode: selectedState?.iso2 || "",
        CityIsoCode: (selectedCity?.name || formData.city || "").replace(/\s/g, "").substring(0, 3).toUpperCase() || "OTH",
        Map_Location: mapLocationChanged && mapLocation ? mapLocation : undefined,
        Priority: formData.priority,
      }

      const response = await authFetch(venueEndPoint.VENUE_DATA_UPDATED, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await handleApiResponse(response)

      // Upload new images if any selected
      if (selectedImages.length > 0 && selectedVenue) {
        await uploadImages(selectedVenue._id)
      }

      await fetchVenues(currentPage, ITEMS_PER_PAGE, debouncedSearchTerm)
      setIsEditDialogOpen(false)
      setSelectedVenue(null)
      resetForm()

      toast({
        title: "Success",
        description: result.message || "Venue updated successfully",
      })
    } catch (error) {
      console.error("Update venue error:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update venue"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVenue = async (venueId: string) => {
    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      const payload = {
        AdminRole: getNumericAdminRole(user.AdminRole || role),
        user_id: user.user_id,
        venue_id: venueId,
      }

      const response = await authFetch(venueEndPoint.VENUE_DELETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await handleApiResponse(response)

      await fetchVenues(currentPage, ITEMS_PER_PAGE, debouncedSearchTerm)

      toast({
        title: "Success",
        description: result.message || "Venue deleted successfully",
      })
    } catch (error) {
      console.error("Delete venue error:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete venue"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (venue: Venue) => {
    setSelectedVenue(venue)
    setFormData({
      venueName: venue.Name,
      priority: venue.Priority,
      venueDescription: venue.Description || "",
      fullAddress: venue.Address,
      city: venue.City,
      state: venue.State,
      mapLocation: venue.Map_Location,
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (venue: Venue) => {
    setSelectedVenue(venue)
    setIsViewDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      venueName: "",
      priority: 0,
      venueDescription: "",
      fullAddress: "",
      state: "Meghalaya",
      city: "",
      mapLocation: "",
    })
    setSelectedVenue(null)
    setSelectedImages([])
    setImageValidationErrors([])
  }

  // Image upload functions
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const errors: string[] = []
    const validFiles: File[] = []

    // Validate each file
    for (const file of files) {
      const error = await validateImageFile(file)
      if (error) {
        errors.push(error)
      } else {
        validFiles.push(file)
      }
    }

    // Update state
    setImageValidationErrors(errors)
    setSelectedImages(validFiles)

    // Show toast for validation errors
    if (errors.length > 0) {
      toast({
        title: "Image Validation Failed",
        description: `${errors.length} file(s) failed validation. Check the requirements below.`,
        variant: "destructive",
      })
    }

    // Clear the input if there are errors so user can try again
    if (errors.length > 0 && validFiles.length === 0) {
      e.target.value = ''
    }
  }

  const uploadImages = async (venueId: string) => {
    if (selectedImages.length === 0) return true

    setUploadingImages(true)
    try {
      const authToken = getValidToken()
      if (!authToken) throw new Error("Authentication required")

      for (const image of selectedImages) {
        const formData = new FormData()
        // API expects the file field name to be `VenueImage`
        formData.append('VenueImage', image)
        // Only venue_id: the API's Joi schema rejects any other field ("AdminRole" is not allowed).
        formData.append('venue_id', venueId)

        const response = await authFetch(venueEndPoint.VENUE_UPLOAD_IMAGE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        })

        // Surfaces the API's own message instead of a bare status code.
        await handleApiResponse(response)
      }

      return true
    } catch (error) {
      console.error("Image upload error:", error)
      toast({
        title: "Warning",
        description: getApiErrorMessage(error, "Some images failed to upload"),
        variant: "destructive",
      })
      return false
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = async (venueId: string, imageId: string) => {
    try {
      const authToken = getValidToken()
      if (!authToken) throw new Error("Authentication required")

      const response = await authFetch(venueEndPoint.VENUE_IMAGE_REMOVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          // AdminRole: getNumericAdminRole(user?.AdminRole || role),
          // user_id: user?.user_id || '',
          venue_id: venueId,
          image_id: imageId,
        }),
      })

      const result = await handleApiResponse(response)

      // Refresh venues to show updated images
      await fetchVenues(currentPage, ITEMS_PER_PAGE, debouncedSearchTerm)

      toast({
        title: "Success",
        description: result.message || "Image removed successfully",
      })
    } catch (error) {
      console.error("Remove image error:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to remove image"),
        variant: "destructive",
      })
    }
  }

  // Helper function to get status display
  const getStatusDisplay = (status: number): { text: string; variant: "default" | "secondary" } => {
    return status === 1 
      ? { text: "Active", variant: "default" } 
      : { text: "Inactive", variant: "secondary" }
  }

  // Helper function to construct full image URL
  const getImageUrl = (imagePath: string) => {
    return `${BASE_URL}/${imagePath}`
  }

  if (role !== "superadmin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. This page is only available to Super Admins.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Venues Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Venue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Venue</DialogTitle>
              <DialogDescription>Add a new venue to the system.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venueName">Venue Name *</Label>
                  <Input
                    id="venueName"
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    placeholder="Enter venue name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    placeholder="Enter priority"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="venueDescription">Venue Description</Label>
                <Textarea
                  id="venueDescription"
                  value={formData.venueDescription}
                  onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                  placeholder="Enter venue description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullAddress">Full Address *</Label>
                <Textarea
                  id="fullAddress"
                  value={formData.fullAddress}
                  onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.state} onValueChange={(value) => {
                    setFormData({ ...formData, state: value, city: "" })
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateData.map(state => (
                        <SelectItem key={state.id} value={state.name}>{state.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                    disabled={!formData.state || loadingCities || cityData.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCities ? "Loading..." : cityData.length === 0 ? "Select state first" : "Select city"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cityData.map(city => (
                        <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mapLocation">Map Location *</Label>
                <Textarea
                  id="mapLocation"
                  value={formData.mapLocation}
                  onChange={(e) => setFormData({ ...formData, mapLocation: e.target.value })}
                  placeholder="Paste the Google Maps embed (iframe) code"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Google Maps &gt; Share &gt; Embed a map &gt; Copy HTML. A bare https://www.google.com/maps/embed?pb=... link is also accepted.
                </p>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="venueImages">Venue Images *</Label>
                <div className="text-xs text-muted-foreground mb-2">
                  <div>• Required. Only PNG or JPG files allowed</div>
                  <div>• Maximum size: 500 KB</div>
                  <div>• Dimensions: 1024x812 pixels</div>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    id="venueImages"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    onChange={handleImageSelect}
                    className="flex-1"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {imageValidationErrors.length > 0 && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
                    <div className="font-medium mb-1">Validation Errors:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {imageValidationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedImages.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVenue} disabled={loading || uploadingImages}>
                {(loading || uploadingImages) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadingImages ? "Uploading Images..." : "Create Venue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search venues..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
              disabled={loading}
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      {/* Venues Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Venues</CardTitle>
          <CardDescription>
            View and manage venues.
            {loading && " Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading venues...</span>
            </div>
          ) : venues.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchTerm ? `No venues found matching "${searchTerm}"` : "No venues found"}
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venues.map((venue: Venue) => {
                    const statusDisplay = getStatusDisplay(venue.status)
                    return (
                      <TableRow key={venue._id}>
                        <TableCell className="font-medium">{venue.Name}</TableCell>
                        <TableCell>
                          {venue.Images && venue.Images.length > 0 ? (
                            <div className="flex gap-1">
                              {venue.Images.slice(0, 2).map((image, index) => (
                                <img
                                  key={image._id}
                                  src={getImageUrl(image.image_path)}
                                  alt={`${venue.Name} image ${index + 1}`}
                                  className="w-10 h-10 object-cover rounded-md border"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder.svg';
                                  }}
                                />
                              ))}
                              {venue.Images.length > 2 && (
                                <div className="w-10 h-10 bg-muted rounded-md border flex items-center justify-center text-xs text-muted-foreground">
                                  +{venue.Images.length - 2}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No images</span>
                          )}
                        </TableCell>
                        <TableCell>{venue.City}</TableCell>
                        <TableCell>{venue.State}</TableCell>
                        <TableCell>{venue.Priority}</TableCell>
                        <TableCell>{venue.createdAt ? formatDate(venue.createdAt) : "-"}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openViewDialog(venue)}>
                                <MapPin className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(venue)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteVenueId(venue._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Venue Details</DialogTitle>
            <DialogDescription>View complete venue information</DialogDescription>
          </DialogHeader>
          
          {selectedVenue && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Venue Name</Label>
                    <p className="text-lg font-semibold">{selectedVenue.Name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p className="text-sm">{selectedVenue.Description || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                    <p className="text-sm">{selectedVenue.Address}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">City</Label>
                      <p className="text-sm font-medium">{selectedVenue.City}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">State</Label>
                      <p className="text-sm font-medium">{selectedVenue.State}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                      <p className="text-sm">{selectedVenue.Priority}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={getStatusDisplay(selectedVenue.status).variant}>
                        {getStatusDisplay(selectedVenue.status).text}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created Date</Label>
                    <p className="text-sm">{formatDate(selectedVenue.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Images Gallery */}
              {selectedVenue.Images && selectedVenue.Images.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-lg font-medium">Images ({selectedVenue.Images.length})</Label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedVenue.Images.map((image, index) => (
                      <div key={image._id} className="relative group">
                        <img
                          src={getImageUrl(image.image_path)}
                          alt={`${selectedVenue.Name} image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border shadow-sm"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map Location */}
              {selectedVenue.Map_Location && (
                <div className="space-y-3">
                  <Label className="text-lg font-medium">Location</Label>
                  {(() => {
                    const mapValue = selectedVenue.Map_Location
                    // Extract src from iframe embed code
                    const iframeMatch = mapValue.match(/<iframe[^>]+src="([^"]+)"/i)
                    if (iframeMatch) {
                      return (
                        <iframe
                          src={iframeMatch[1]}
                          className="w-full h-64 border-0 rounded-lg"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Venue map"
                        />
                      )
                    }
                    // If it's a bare URL, use it directly
                    if (/^https?:\/\//.test(mapValue.trim())) {
                      return (
                        <iframe
                          src={mapValue.trim()}
                          className="w-full h-64 border-0 rounded-lg"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Venue map"
                        />
                      )
                    }
                    return (
                      <div className="w-full h-64 border rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                        Invalid map embed code
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedVenue) {
                setIsViewDialogOpen(false)
                openEditDialog(selectedVenue)
              }
            }}>
              Edit Venue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
            <DialogDescription>Update venue information.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editVenueName">Venue Name</Label>
                <Input
                  id="editVenueName"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  placeholder="Enter venue name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPriority">Priority</Label>
                <Input
                  id="editPriority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="Enter priority"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editVenueDescription">Venue Description</Label>
              <Textarea
                id="editVenueDescription"
                value={formData.venueDescription}
                onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                placeholder="Enter venue description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editFullAddress">Full Address</Label>
              <Textarea
                id="editFullAddress"
                value={formData.fullAddress}
                onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                placeholder="Enter full address"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editState">State</Label>
                <Select value={formData.state} onValueChange={(value) => {
                  setFormData({ ...formData, state: value, city: "" })
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {stateData.map(state => (
                      <SelectItem key={state.id} value={state.name}>{state.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCity">City</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                  disabled={!formData.state || loadingCities || cityData.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCities ? "Loading..." : cityData.length === 0 ? "Select state first" : "Select city"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityData.map(city => (
                      <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editMapLocation">Map Location</Label>
              <Textarea
                id="editMapLocation"
                value={formData.mapLocation}
                onChange={(e) => setFormData({ ...formData, mapLocation: e.target.value })}
                placeholder="Paste the Google Maps embed (iframe) code"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Google Maps &gt; Share &gt; Embed a map &gt; Copy HTML. A bare https://www.google.com/maps/embed?pb=... link is also accepted.
              </p>
            </div>

            {/* Existing Images Section */}
            {selectedVenue && selectedVenue.Images && selectedVenue.Images.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-4 gap-2">
                  {selectedVenue.Images.map((image, index) => (
                    <div key={image._id} className="relative group">
                      <img
                        src={getImageUrl(image.image_path)}
                        alt={`Venue image ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(selectedVenue._id, image._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Images Section */}
            <div className="space-y-2">
              <Label htmlFor="editVenueImages">Add New Images</Label>
              <div className="text-xs text-muted-foreground mb-2">
                <div>• Only PNG or JPG files allowed</div>
                <div>• Maximum size: 500 KB</div>
                <div>• Dimensions: 1024x812 pixels</div>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  id="editVenueImages"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  multiple
                  onChange={handleImageSelect}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {imageValidationErrors.length > 0 && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
                  <div className="font-medium mb-1">Validation Errors:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {imageValidationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedImages.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedImages.length} new image{selectedImages.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVenue} disabled={loading || uploadingImages}>
              {(loading || uploadingImages) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploadingImages ? "Uploading Images..." : "Update Venue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteVenueId} onOpenChange={() => setDeleteVenueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this venue?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Do not delete a venue that is used by any event: those events
              will stop loading in the event lists until they are moved to another venue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteVenueId) {
                  handleDeleteVenue(deleteVenueId)
                }
                setDeleteVenueId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
