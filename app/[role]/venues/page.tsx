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

const mockVenues: Venue[] = [
  {
    _id: "ven001",
    Name: "Central Park",
    Description: "Large outdoor venue in the heart of the city",
    Address: "Central Park West",
    City: "New York",
    State: "NY",
    Country: "USA",
    CountryIsoCode: "US",
    StateIsoCode: "NY",
    CityIsoCode: "NYC",
    Map_Location: "<iframe src='https://maps.google.com'></iframe>",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Central+Park", _id: "img001" }],
    status: 1,
    FilterationDateTime: "2025-01-02T08:30:00.000Z",
    createdAt: "02-01-2025 08:30:00",
    Priority: 1,
    __v: 0,
  },  {
    _id: "ven002",
    Name: "Convention Center",
    Description: "Modern convention center with multiple halls",
    Address: "123 Market Street",
    City: "San Francisco",
    State: "CA",
    Country: "USA",
    CountryIsoCode: "US",
    StateIsoCode: "CA",
    CityIsoCode: "SF",
    Map_Location: "<iframe src='https://maps.google.com'></iframe>",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Convention+Center", _id: "img002" }],
    status: 1,
    FilterationDateTime: "2025-01-20T10:15:00.000Z",
    createdAt: "20-01-2025 10:15:00",
    Priority: 2,
    __v: 0,
  },
  {
    _id: "ven003",
    Name: "City Gallery",
    Description: "Contemporary art gallery in downtown",
    Address: "456 Arts Avenue",
    City: "Los Angeles",
    State: "CA",
    Country: "USA",
    CountryIsoCode: "US",
    StateIsoCode: "CA", 
    CityIsoCode: "LA",
    Map_Location: "<iframe src='https://maps.google.com'></iframe>",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=City+Gallery", _id: "img003" }],
    status: 1,
    FilterationDateTime: "2025-02-10T09:45:00.000Z",
    createdAt: "10-02-2025 09:45:00",
    Priority: 3,
    __v: 0,
  },
  {
    _id: "ven004",
    Name: "Grand Ballroom",
    Description: "Elegant ballroom for formal events",
    Address: "789 Luxury Lane",
    City: "Chicago",
    State: "IL",
    Country: "USA",
    CountryIsoCode: "US",
    StateIsoCode: "IL",
    CityIsoCode: "CHI",
    Map_Location: "<iframe src='https://maps.google.com'></iframe>",
    Images: [],
    status: 0,
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
  const [apiError, setApiError] = React.useState<string | null>(null)  // Form state
  const [formData, setFormData] = React.useState({
    venueName: "",
    priority: 0,
    venueDescription: "",
    fullAddress: "",
    state: "Meghalaya",
    city: "",
    mapLocation: "",
    carouselImages: [] as File[],
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
      }      // Set the data from API
      setVenues(data.data.VenueData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalVenues(data.data.totalVenue || 0)
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
  }, [currentPage, fetchVenues])  // Filter venues based on search (now works on current page data)
  const filteredVenues = React.useMemo(() => {
    if (!searchTerm) return venues
    return venues.filter(
      (venue) =>
        venue.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.City.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [venues, searchTerm])

  // For paginated API, we don't slice here since API handles pagination
  const currentVenues = filteredVenues

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  const handleCreateVenue = async () => {
    if (!formData.venueName.trim() || !formData.venueDescription.trim() || !formData.fullAddress.trim() || !formData.mapLocation.trim() || formData.carouselImages.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newVenue: Venue = {
        _id: `ven${Date.now()}`,
        Name: formData.venueName,
        Description: formData.venueDescription,
        Address: formData.fullAddress,
        City: formData.city,
        State: formData.state,
        Country: "India", // Default to India
        CountryIsoCode: "IN",
        StateIsoCode: "",
        CityIsoCode: "",
        Map_Location: formData.mapLocation,
        Images: formData.carouselImages.map((file, index) => ({
          image_path: `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(formData.venueName)}-${index}`,
          _id: `img${Date.now()}-${index}`
        })),
        FilterationDateTime: new Date().toISOString(),
        createdAt: new Date().toLocaleString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }).replace(/\//g, '-'),
        status: 1,
        Priority: formData.priority,
        __v: 0,
      }

      setVenues([newVenue, ...venues])
      setIsCreateDialogOpen(false)
      setFormData({
        venueName: "",
        priority: 0,
        venueDescription: "",
        fullAddress: "",
        state: "Meghalaya",
        city: "",
        mapLocation: "",
        carouselImages: [],
      })

      toast({
        title: "Success",
        description: "Venue created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create venue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  const handleEditVenue = async () => {
    if (!selectedVenue || !formData.venueName.trim() || !formData.venueDescription.trim() || !formData.fullAddress.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedVenues = venues.map((venue) =>
        venue._id === selectedVenue._id
          ? {
              ...venue,
              Name: formData.venueName,
              Description: formData.venueDescription,
              Address: formData.fullAddress,
              City: formData.city,
              State: formData.state,
              Map_Location: formData.mapLocation,
              Priority: formData.priority,
              FilterationDateTime: new Date().toISOString(),
            }          : venue,
      )

      setVenues(updatedVenues)
      setIsEditDialogOpen(false)
      setSelectedVenue(null)
      setFormData({
        venueName: "",
        priority: 0,
        venueDescription: "",
        fullAddress: "",
        state: "Meghalaya",
        city: "",
        mapLocation: "",
        carouselImages: [],
      })

      toast({
        title: "Success",
        description: "Venue updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update venue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVenue = async (venueId: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setVenues(venues.filter((venue) => venue._id !== venueId))

      toast({
        title: "Success",
        description: "Venue deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete venue",
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
      })
    } finally {      setLoading(false)
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
      carouselImages: [],
    })
    setIsEditDialogOpen(true)
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
      carouselImages: [],
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
            </DialogHeader>            <div className="space-y-4">
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
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueDescription">Venue Description *</Label>
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
              </div>              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  <SelectContent>
  <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
  <SelectItem value="Arunachal Pradesh">Arunachal Pradesh</SelectItem>
  <SelectItem value="Assam">Assam</SelectItem>
  <SelectItem value="Bihar">Bihar</SelectItem>
  <SelectItem value="Chhattisgarh">Chhattisgarh</SelectItem>
  <SelectItem value="Goa">Goa</SelectItem>
  <SelectItem value="Gujarat">Gujarat</SelectItem>
  <SelectItem value="Haryana">Haryana</SelectItem>
  <SelectItem value="Himachal Pradesh">Himachal Pradesh</SelectItem>
  <SelectItem value="Jharkhand">Jharkhand</SelectItem>
  <SelectItem value="Karnataka">Karnataka</SelectItem>
  <SelectItem value="Kerala">Kerala</SelectItem>
  <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
  <SelectItem value="Maharashtra">Maharashtra</SelectItem>
  <SelectItem value="Manipur">Manipur</SelectItem>
  <SelectItem value="Meghalaya">Meghalaya</SelectItem>
  <SelectItem value="Mizoram">Mizoram</SelectItem>
  <SelectItem value="Nagaland">Nagaland</SelectItem>
  <SelectItem value="Odisha">Odisha</SelectItem>
  <SelectItem value="Punjab">Punjab</SelectItem>
  <SelectItem value="Rajasthan">Rajasthan</SelectItem>
  <SelectItem value="Sikkim">Sikkim</SelectItem>
  <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
  <SelectItem value="Telangana">Telangana</SelectItem>
  <SelectItem value="Tripura">Tripura</SelectItem>
  <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
  <SelectItem value="Uttarakhand">Uttarakhand</SelectItem>
  <SelectItem value="West Bengal">West Bengal</SelectItem>
</SelectContent>

                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mapLocation">Map Location *</Label>
                <Textarea
                  id="mapLocation"
                  value={formData.mapLocation}
                  onChange={(e) => setFormData({ ...formData, mapLocation: e.target.value })}
                  placeholder="Enter map iframe embed code"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carouselImages">Upload Carousel Images *</Label>
                <Input
                  id="carouselImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFormData({ ...formData, carouselImages: Array.from(e.target.files || []) })}
                />
                <p className="text-sm text-muted-foreground">You can select multiple images</p>
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
          <Table>            <TableHeader>
              <TableRow>
                <TableHead>Venue Name</TableHead>
                <TableHead>Venue State</TableHead>
                <TableHead>Venue City</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentVenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No venues found
                  </TableCell>
                </TableRow>
              ) : (
                currentVenues.map((venue) => (
                  <TableRow key={venue._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {venue.Images && venue.Images.length > 0 ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/${venue.Images[0].image_path}`}
                            alt={venue.Name}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{venue.Name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{venue.State}</TableCell>
                    <TableCell>{venue.City}</TableCell>
                    <TableCell>{venue.createdAt}</TableCell>
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
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(venue._id)}>
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
      </Card>      {/* Edit Dialog */}
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
                <Label htmlFor="editPriority">Priority</Label>
                <Input
                  id="editPriority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editVenueDescription">Venue Description *</Label>
              <Textarea
                id="editVenueDescription"
                value={formData.venueDescription}
                onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                placeholder="Enter venue description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFullAddress">Full Address *</Label>
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
                <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meghalaya">Meghalaya</SelectItem>
                    <SelectItem value="Assam">Assam</SelectItem>
                    <SelectItem value="West Bengal">West Bengal</SelectItem>
                    <SelectItem value="Tripura">Tripura</SelectItem>
                    <SelectItem value="Manipur">Manipur</SelectItem>
                    <SelectItem value="Mizoram">Mizoram</SelectItem>
                    <SelectItem value="Nagaland">Nagaland</SelectItem>
                    <SelectItem value="Arunachal Pradesh">Arunachal Pradesh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCity">City</Label>
                <Input
                  id="editCity"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editMapLocation">Map Location *</Label>
              <Textarea
                id="editMapLocation"
                value={formData.mapLocation}
                onChange={(e) => setFormData({ ...formData, mapLocation: e.target.value })}
                placeholder="Enter map iframe embed code"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCarouselImages">Upload Carousel Images *</Label>
              <Input
                id="editCarouselImages"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFormData({ ...formData, carouselImages: Array.from(e.target.files || []) })}
              />
              <p className="text-sm text-muted-foreground">You can select multiple images</p>
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
