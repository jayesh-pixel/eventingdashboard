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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { venueEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { getNumericAdminRole } from "@/lib/api-constants"

interface VenuesPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface Venue {
  _id: string
  VenueName: string
  VenueDescription?: string | null
  VenueAddress: string
  VenueCity: string
  VenueState: string
  VenueCountry: string
  VenueCapacity?: number
  Images?: Array<{
    image_path: string
    _id: string
  }>
  status: number
  ContactEmail?: string
  ContactPhone?: string
  Amenities?: string[]
  createdAt: string
  FilterationDateTime: string
  Priority?: number
  __v?: number
}

interface ApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalVenues: number
    VenueData: Venue[]
  }
}

const mockVenues: Venue[] = [
  {
    _id: "ven001",
    VenueName: "Central Park",
    VenueDescription: "Large outdoor venue in the heart of the city",
    VenueAddress: "Central Park West",
    VenueCity: "New York",
    VenueState: "NY",
    VenueCountry: "USA",
    VenueCapacity: 10000,
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Central+Park", _id: "img001" }],
    status: 1,
    Amenities: ["Parking", "Food Court", "Restrooms", "Security"],
    ContactEmail: "info@centralpark.com",
    ContactPhone: "+1-555-0101",
    FilterationDateTime: "2025-01-02T08:30:00.000Z",
    createdAt: "02-01-2025 08:30:00",
    Priority: 1,
    __v: 0,
  },
  {
    _id: "ven002",
    VenueName: "Convention Center",
    VenueDescription: "Modern convention center with multiple halls",
    VenueAddress: "123 Market Street",
    VenueCity: "San Francisco",
    VenueState: "CA",
    VenueCountry: "USA",
    VenueCapacity: 5000,
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Convention+Center", _id: "img002" }],
    status: 1,
    Amenities: ["WiFi", "A/V Equipment", "Catering", "Parking", "Accessibility"],
    ContactEmail: "events@conventioncenter.com",
    ContactPhone: "+1-555-0102",
    FilterationDateTime: "2025-01-20T10:15:00.000Z",
    createdAt: "20-01-2025 10:15:00",
    Priority: 2,
    __v: 0,
  },
  {
    _id: "ven003",
    VenueName: "City Gallery",
    VenueDescription: "Contemporary art gallery in downtown",
    VenueAddress: "456 Arts Avenue",
    VenueCity: "Los Angeles",
    VenueState: "CA",
    VenueCountry: "USA",
    VenueCapacity: 1000,
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=City+Gallery", _id: "img003" }],
    status: 1,
    Amenities: ["Climate Control", "Security", "Lighting", "Sound System"],
    ContactEmail: "bookings@citygallery.com",
    ContactPhone: "+1-555-0103",
    FilterationDateTime: "2025-02-10T09:45:00.000Z",
    createdAt: "10-02-2025 09:45:00",
    Priority: 3,
    __v: 0,
  },
  {
    _id: "ven004",
    VenueName: "Grand Ballroom",
    VenueDescription: "Elegant ballroom for formal events",
    VenueAddress: "789 Luxury Lane",
    VenueCity: "Chicago",
    VenueState: "IL",
    VenueCountry: "USA",
    VenueCapacity: 800,
    Images: [],
    status: 0,
    Amenities: ["Valet Parking", "Full Bar", "Dance Floor", "Stage"],
    ContactEmail: "events@grandballroom.com",
    ContactPhone: "+1-555-0104",
    FilterationDateTime: "2025-03-01T12:00:00.000Z",
    createdAt: "01-03-2025 12:00:00",
    Priority: 4,
    __v: 0,
  },
]

const ITEMS_PER_PAGE = 10

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedVenue, setSelectedVenue] = React.useState<Venue | null>(null)
  const [useMockData, setUseMockData] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)
  // Form state
  const [formData, setFormData] = React.useState({
    venueName: "",
    venueDescription: "",
    venueAddress: "",
    mapLocation: "",
    city: "",
    state: "",
    country: "",
    venueCapacity: "",
    contactEmail: "",
    contactPhone: "",
    amenities: "",
    venueImages: [] as File[],
  })
  // API function to fetch venues
  const fetchVenues = React.useCallback(async (page: number = 1, limit: number = ITEMS_PER_PAGE) => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = getValidToken()
      if (!user || !authToken) {
        console.warn("No user or auth token available, using mock data")
        setVenues(mockVenues)
        setUseMockData(true)
        setTotalPages(1)
        setTotalVenues(mockVenues.length)
        return
      }

      console.log("Fetching venues with pagination:")
      console.log("- Page:", page)
      console.log("- Limit:", limit)
      console.log("- User role:", role)
      console.log("- AdminRole:", getNumericAdminRole(user.AdminRole || role))

      const response = await fetch(venueEndPoint.VENUES_PAGINATED_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          AdminRole: getNumericAdminRole(user.AdminRole || role),
          user_id: user.user_id,
          page: page,
          limit: limit.toString(),
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      console.log("Venues API response:", data)

      if (data.error) {
        throw new Error(data.message || "Failed to fetch venues")
      }

      // Set the data from API
      setVenues(data.data.VenueData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalVenues(data.data.totalVenues || 0)
      setCurrentPage(data.data.currentPage || 1)
      setUseMockData(false)

      toast({
        title: "Success",
        description: data.message || "Venues fetched successfully",
      })
    } catch (error) {
      console.error("Venues fetch failed:", error)
      setApiError("Could not fetch venues from server")
      
      // Fall back to mock data
      setVenues(mockVenues)
      setUseMockData(true)
      setTotalPages(1)
      setTotalVenues(mockVenues.length)
      
      toast({        title: "API Error",
        description: "Could not fetch venues from server. Using sample data instead.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, role]) // Dependencies for useCallback

  // Initial data fetch
  React.useEffect(() => {
    fetchVenues(currentPage)
  }, [currentPage, fetchVenues])
  // Filter venues based on search (now works on current page data)
  const filteredVenues = React.useMemo(() => {
    if (!searchTerm) return venues
    return venues.filter(
      (venue) =>
        venue.VenueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.VenueCity.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [venues, searchTerm])

  // For paginated API, we don't slice here since API handles pagination
  const currentVenues = filteredVenues
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCreateVenue = async () => {
    // Validate required fields
    if (!formData.venueName.trim()) {
      toast({
        title: "Error",
        description: "Venue name is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.venueDescription.trim()) {
      toast({
        title: "Error",
        description: "Venue description is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.venueAddress.trim()) {
      toast({
        title: "Error",
        description: "Full address is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.city.trim()) {
      toast({
        title: "Error",
        description: "City is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.mapLocation.trim()) {
      toast({
        title: "Error",
        description: "Map location is required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }      // Create FormData for multipart/form-data request as per swagger
      const formDataPayload = new FormData();
      formDataPayload.append('Name', formData.venueName);
      formDataPayload.append('Country', formData.country);
      formDataPayload.append('State', formData.state);
      formDataPayload.append('City', formData.city);
      formDataPayload.append('Address', formData.venueAddress);
      formDataPayload.append('Map_Location', formData.mapLocation);
      formDataPayload.append('Priority', '0'); // Default priority

      // Add images if selected (multiple images support)
      if (formData.venueImages && formData.venueImages.length > 0) {
        formData.venueImages.forEach((image) => {
          formDataPayload.append('Images', image);
        });
      }

      console.log('Creating venue with data:', {
        Name: formData.venueName,
        Country: formData.country,
        State: formData.state,
        City: formData.city,
        Address: formData.venueAddress,
      });

      const response = await fetch(venueEndPoint.VENUE_CREATION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Don't set Content-Type for FormData, let browser set it
        },
        body: formDataPayload,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Create venue response:', data);

      if (data.error) {
        throw new Error(data.message || 'Failed to create venue');
      }      // Refresh the venues list
      await fetchVenues(currentPage);
      
      setIsCreateDialogOpen(false)
      setFormData({
        venueName: "",
        venueDescription: "",
        venueAddress: "",
        mapLocation: "",
        city: "",
        state: "",
        country: "",
        venueCapacity: "",
        contactEmail: "",
        contactPhone: "",
        amenities: "",
        venueImages: [],
      })

      toast({
        title: "Success",
        description: data.message || "Venue created successfully",
      })
    } catch (error) {
      console.error('Create venue error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create venue",
        variant: "destructive",
      })    } finally {
      setLoading(false)
    }
  }

  const handleEditVenue = async () => {
    // Validate required fields
    if (!selectedVenue) {
      toast({
        title: "Error",
        description: "No venue selected for editing",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.venueName.trim()) {
      toast({
        title: "Error",
        description: "Venue name is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.venueDescription.trim()) {
      toast({
        title: "Error",
        description: "Venue description is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.venueAddress.trim()) {
      toast({
        title: "Error",
        description: "Full address is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.city.trim()) {
      toast({
        title: "Error",
        description: "City is required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }      // Prepare update data as per swagger
      const updateData = {
        venue_id: selectedVenue._id,
        Name: formData.venueName,
        Country: formData.country,
        State: formData.state,
        City: formData.city,
        Address: formData.venueAddress,
        Map_Location: formData.mapLocation,
        Priority: selectedVenue.Priority || 0,
      };

      console.log('Updating venue with data:', updateData);

      const response = await fetch(venueEndPoint.VENUE_DATA_UPDATED, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Update venue response:', data);

      if (data.error) {
        throw new Error(data.message || 'Failed to update venue');
      }

      // Refresh the venues list
      await fetchVenues(currentPage);      setIsEditDialogOpen(false)
      setSelectedVenue(null)
      setFormData({
        venueName: "",
        venueDescription: "",
        venueAddress: "",
        mapLocation: "",
        city: "",
        state: "",
        country: "",
        venueCapacity: "",
        contactEmail: "",
        contactPhone: "",
        amenities: "",
        venueImages: [],
      })

      toast({
        title: "Success",
        description: data.message || "Venue updated successfully",
      })
    } catch (error) {
      console.error('Update venue error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update venue",
        variant: "destructive",
      })    } finally {
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

      // Delete venue as per swagger
      const deleteData = {
        venue_id: venueId,
      };

      console.log('Deleting venue with ID:', venueId);

      const response = await fetch(venueEndPoint.VENUE_DELETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(deleteData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Delete venue response:', data);

      if (data.error) {
        throw new Error(data.message || 'Failed to delete venue');
      }

      // Refresh the venues list
      await fetchVenues(currentPage);

      toast({
        title: "Success",
        description: data.message || "Venue deleted successfully",
      })
    } catch (error) {
      console.error('Delete venue error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete venue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (venueId: string) => {
    setLoading(true)
    try {
      // Simulate API call      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedVenues = venues.map((venue) =>
        venue._id === venueId
          ? {
              ...venue,
              status: venue.status === 1 ? 0 : 1,
              FilterationDateTime: new Date().toISOString(),
            }
          : venue,
      )

      setVenues(updatedVenues)

      toast({
        title: "Success",
        description: "Venue status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update venue status",
        variant: "destructive",
      })    } finally {
      setLoading(false)
    }
  }
  const openEditDialog = (venue: Venue) => {
    setSelectedVenue(venue)
    setFormData({
      venueName: venue.VenueName || "",
      venueDescription: venue.VenueDescription || "",
      venueAddress: venue.VenueAddress || "",
      mapLocation: "", // Map location not in current venue interface
      city: venue.VenueCity || "",
      state: venue.VenueState || "",
      country: venue.VenueCountry || "",
      venueCapacity: venue.VenueCapacity ? venue.VenueCapacity.toString() : "",
      contactEmail: venue.ContactEmail || "",
      contactPhone: venue.ContactPhone || "",
      amenities: venue.Amenities && Array.isArray(venue.Amenities) ? venue.Amenities.join(", ") : "",
      venueImages: [],
    })
    setIsEditDialogOpen(true)
  }
  const resetForm = () => {
    setFormData({
      venueName: "",
      venueDescription: "",
      venueAddress: "",
      mapLocation: "",
      city: "",
      state: "",
      country: "",
      venueCapacity: "",
      contactEmail: "",
      contactPhone: "",
      amenities: "",
      venueImages: [],
    })
    setSelectedVenue(null)
  }

  // Helper function to get venue image
  const getVenueImage = (venue: Venue): string => {
    if (venue.Images && venue.Images.length > 0) {
      return venue.Images[0].image_path.startsWith('http') 
        ? venue.Images[0].image_path 
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/${venue.Images[0].image_path}`
    }
    return "/placeholder.svg"
  }

  // Helper function to get status display
  const getStatusDisplay = (status: number): { text: string; variant: "default" | "secondary" } => {
    return status === 1 
      ? { text: "Active", variant: "default" } 
      : { text: "Inactive", variant: "secondary" }
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
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Venue
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
                  <Label htmlFor="venueCapacity">Capacity *</Label>
                  <Input
                    id="venueCapacity"
                    type="number"
                    value={formData.venueCapacity}
                    onChange={(e) => setFormData({ ...formData, venueCapacity: e.target.value })}
                    placeholder="Enter capacity"
                  />
                </div>
              </div>                <div className="space-y-2">
                  <Label htmlFor="venueDescription">Description *</Label>
                  <Textarea
                    id="venueDescription"
                    value={formData.venueDescription}
                    onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                    placeholder="Enter venue description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venueAddress">Address *</Label>
                  <Input
                    id="venueAddress"
                    value={formData.venueAddress}
                    onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                    placeholder="Enter venue address"
                  />
                </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Enter country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="Enter contact email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="Enter contact phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                <Input
                  id="amenities"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  placeholder="Parking, WiFi, A/V Equipment, Catering"
                />
              </div>              <div className="space-y-2">
                <Label htmlFor="mapLocation">Map Location *</Label>
                <Textarea
                  id="mapLocation"
                  value={formData.mapLocation}
                  onChange={(e) => setFormData({ ...formData, mapLocation: e.target.value })}
                  placeholder="Enter Google Maps URL or coordinates"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueImages">Venue Images (Multiple)</Label>
                <Input
                  id="venueImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFormData({ ...formData, venueImages: files });
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Select multiple images. First image will be used as thumbnail.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVenue} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Venue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search venues or cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Venues Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Venues</CardTitle>
          <CardDescription>Manage event venues in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Venue Name</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Capacity</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentVenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No venues found
                  </TableCell>
                </TableRow>
              ) : (
                currentVenues.map((venue) => (
                  <TableRow key={venue._id}>                    <TableCell>
                      {getVenueImage(venue) !== "/placeholder.svg" ? (
                        <img
                          src={getVenueImage(venue)}
                          alt={venue.VenueName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>                    <TableCell className="font-medium">{venue.VenueName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {venue.VenueCity}, {venue.VenueState}
                      </div>
                    </TableCell>                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {venue.VenueCapacity ? venue.VenueCapacity.toLocaleString() : 'N/A'}
                      </div>
                    </TableCell>                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">
                        <div>{venue.ContactEmail || 'N/A'}</div>
                        <div className="text-muted-foreground">{venue.ContactPhone || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusDisplay(venue.status).variant}>
                        {getStatusDisplay(venue.status).text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(venue)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>                          <DropdownMenuItem onClick={() => handleToggleStatus(venue._id)}>
                            {venue.status === 1 ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteVenue(venue._id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
            <DialogDescription>Update the venue information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editVenueName">Venue Name *</Label>
                <Input
                  id="editVenueName"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  placeholder="Enter venue name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVenueCapacity">Capacity *</Label>
                <Input
                  id="editVenueCapacity"
                  type="number"
                  value={formData.venueCapacity}
                  onChange={(e) => setFormData({ ...formData, venueCapacity: e.target.value })}
                  placeholder="Enter capacity"
                />
              </div>
            </div>            <div className="space-y-2">
              <Label htmlFor="editVenueDescription">Description *</Label>
              <Textarea
                id="editVenueDescription"
                value={formData.venueDescription}
                onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                placeholder="Enter venue description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editVenueAddress">Address *</Label>
              <Input
                id="editVenueAddress"
                value={formData.venueAddress}
                onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                placeholder="Enter venue address"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editCity">City *</Label>
                <Input
                  id="editCity"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editState">State</Label>
                <Input
                  id="editState"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Enter state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCountry">Country</Label>
                <Input
                  id="editCountry"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Enter country"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editContactEmail">Contact Email</Label>
                <Input
                  id="editContactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="Enter contact email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editContactPhone">Contact Phone</Label>
                <Input
                  id="editContactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="Enter contact phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAmenities">Amenities (comma-separated)</Label>
              <Input
                id="editAmenities"
                value={formData.amenities}
                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="Parking, WiFi, A/V Equipment, Catering"
              />
            </div>            <div className="space-y-2">
              <Label htmlFor="editMapLocation">Map Location *</Label>
              <Textarea
                id="editMapLocation"
                value={formData.mapLocation}
                onChange={(e) => setFormData({ ...formData, mapLocation: e.target.value })}
                placeholder="Enter Google Maps URL or coordinates"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editVenueImages">Venue Images (Multiple)</Label>
              <Input
                id="editVenueImages"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setFormData({ ...formData, venueImages: files });
                }}
              />
              <p className="text-sm text-muted-foreground">
                Select multiple images to replace existing ones. First image will be used as thumbnail.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVenue} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Venue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
