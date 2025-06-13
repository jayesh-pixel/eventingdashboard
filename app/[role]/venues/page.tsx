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

interface VenuesPageProps {
  params: { role: UserRole }
}

interface Venue {
  _id: string
  venueName: string
  venueDescription: string
  venueAddress: string
  city: string
  state: string
  country: string
  venueCapacity: number
  venueImage?: string
  status: "Active" | "Inactive"
  amenities: string[]
  contactEmail: string
  contactPhone: string
  createdAt: string
  updatedAt: string
}

const mockVenues: Venue[] = [
  {
    _id: "ven001",
    venueName: "Central Park",
    venueDescription: "Large outdoor venue in the heart of the city",
    venueAddress: "Central Park West",
    city: "New York",
    state: "NY",
    country: "USA",
    venueCapacity: 10000,
    venueImage: "/placeholder.svg?height=100&width=100&text=Central+Park",
    status: "Active",
    amenities: ["Parking", "Food Court", "Restrooms", "Security"],
    contactEmail: "info@centralpark.com",
    contactPhone: "+1-555-0101",
    createdAt: "2025-01-02T08:30:00.000Z",
    updatedAt: "2025-01-07T14:45:00.000Z",
  },
  {
    _id: "ven002",
    venueName: "Convention Center",
    venueDescription: "Modern convention center with multiple halls",
    venueAddress: "123 Market Street",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    venueCapacity: 5000,
    venueImage: "/placeholder.svg?height=100&width=100&text=Convention+Center",
    status: "Active",
    amenities: ["WiFi", "A/V Equipment", "Catering", "Parking", "Accessibility"],
    contactEmail: "events@conventioncenter.com",
    contactPhone: "+1-555-0102",
    createdAt: "2025-01-20T10:15:00.000Z",
    updatedAt: "2025-01-25T16:30:00.000Z",
  },
  {
    _id: "ven003",
    venueName: "City Gallery",
    venueDescription: "Contemporary art gallery in downtown",
    venueAddress: "456 Arts Avenue",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    venueCapacity: 1000,
    venueImage: "/placeholder.svg?height=100&width=100&text=City+Gallery",
    status: "Active",
    amenities: ["Climate Control", "Security", "Lighting", "Sound System"],
    contactEmail: "bookings@citygallery.com",
    contactPhone: "+1-555-0103",
    createdAt: "2025-02-10T09:45:00.000Z",
    updatedAt: "2025-02-15T11:20:00.000Z",
  },
  {
    _id: "ven004",
    venueName: "Grand Ballroom",
    venueDescription: "Elegant ballroom for formal events",
    venueAddress: "789 Luxury Lane",
    city: "Chicago",
    state: "IL",
    country: "USA",
    venueCapacity: 800,
    venueImage: "/placeholder.svg?height=100&width=100&text=Grand+Ballroom",
    status: "Inactive",
    amenities: ["Valet Parking", "Full Bar", "Dance Floor", "Stage"],
    contactEmail: "events@grandballroom.com",
    contactPhone: "+1-555-0104",
    createdAt: "2025-03-01T12:00:00.000Z",
    updatedAt: "2025-03-15T16:15:00.000Z",
  },
]

const ITEMS_PER_PAGE = 10

export default function VenuesPage({ params }: VenuesPageProps) {
  const { role } = params
  const { toast } = useToast()

  // State management
  const [venues, setVenues] = React.useState<Venue[]>(mockVenues)
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedVenue, setSelectedVenue] = React.useState<Venue | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    venueName: "",
    venueDescription: "",
    venueAddress: "",
    city: "",
    state: "",
    country: "",
    venueCapacity: "",
    contactEmail: "",
    contactPhone: "",
    amenities: "",
    venueImage: null as File | null,
  })

  // Filter venues based on search
  const filteredVenues = React.useMemo(() => {
    if (!searchTerm) return venues
    return venues.filter(
      (venue) =>
        venue.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.city.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [venues, searchTerm])

  const totalPages = Math.ceil(filteredVenues.length / ITEMS_PER_PAGE)
  const currentVenues = filteredVenues.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCreateVenue = async () => {
    if (!formData.venueName.trim() || !formData.city.trim() || !formData.venueCapacity) {
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

      const amenitiesArray = formData.amenities
        .split(",")
        .map((amenity) => amenity.trim())
        .filter(Boolean)

      const newVenue: Venue = {
        _id: `ven${Date.now()}`,
        venueName: formData.venueName,
        venueDescription: formData.venueDescription,
        venueAddress: formData.venueAddress,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        venueCapacity: Number.parseInt(formData.venueCapacity),
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        amenities: amenitiesArray,
        venueImage: formData.venueImage
          ? `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(formData.venueName)}`
          : undefined,
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setVenues([newVenue, ...venues])
      setIsCreateDialogOpen(false)
      setFormData({
        venueName: "",
        venueDescription: "",
        venueAddress: "",
        city: "",
        state: "",
        country: "",
        venueCapacity: "",
        contactEmail: "",
        contactPhone: "",
        amenities: "",
        venueImage: null,
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
    if (!selectedVenue || !formData.venueName.trim() || !formData.city.trim()) {
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

      const amenitiesArray = formData.amenities
        .split(",")
        .map((amenity) => amenity.trim())
        .filter(Boolean)

      const updatedVenues = venues.map((venue) =>
        venue._id === selectedVenue._id
          ? {
              ...venue,
              venueName: formData.venueName,
              venueDescription: formData.venueDescription,
              venueAddress: formData.venueAddress,
              city: formData.city,
              state: formData.state,
              country: formData.country,
              venueCapacity: Number.parseInt(formData.venueCapacity),
              contactEmail: formData.contactEmail,
              contactPhone: formData.contactPhone,
              amenities: amenitiesArray,
              updatedAt: new Date().toISOString(),
            }
          : venue,
      )

      setVenues(updatedVenues)
      setIsEditDialogOpen(false)
      setSelectedVenue(null)
      setFormData({
        venueName: "",
        venueDescription: "",
        venueAddress: "",
        city: "",
        state: "",
        country: "",
        venueCapacity: "",
        contactEmail: "",
        contactPhone: "",
        amenities: "",
        venueImage: null,
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedVenues = venues.map((venue) =>
        venue._id === venueId
          ? {
              ...venue,
              status: venue.status === "Active" ? ("Inactive" as const) : ("Active" as const),
              updatedAt: new Date().toISOString(),
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
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (venue: Venue) => {
    setSelectedVenue(venue)
    setFormData({
      venueName: venue.venueName,
      venueDescription: venue.venueDescription,
      venueAddress: venue.venueAddress,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      venueCapacity: venue.venueCapacity.toString(),
      contactEmail: venue.contactEmail,
      contactPhone: venue.contactPhone,
      amenities: venue.amenities.join(", "),
      venueImage: null,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      venueName: "",
      venueDescription: "",
      venueAddress: "",
      city: "",
      state: "",
      country: "",
      venueCapacity: "",
      contactEmail: "",
      contactPhone: "",
      amenities: "",
      venueImage: null,
    })
    setSelectedVenue(null)
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueDescription">Description</Label>
                <Textarea
                  id="venueDescription"
                  value={formData.venueDescription}
                  onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                  placeholder="Enter venue description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueAddress">Address</Label>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueImage">Venue Image</Label>
                <Input
                  id="venueImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, venueImage: e.target.files?.[0] || null })}
                />
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
                  <TableRow key={venue._id}>
                    <TableCell>
                      {venue.venueImage ? (
                        <img
                          src={venue.venueImage || "/placeholder.svg"}
                          alt={venue.venueName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{venue.venueName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {venue.city}, {venue.state}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {venue.venueCapacity.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">
                        <div>{venue.contactEmail}</div>
                        <div className="text-muted-foreground">{venue.contactPhone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={venue.status === "Active" ? "default" : "secondary"}>{venue.status}</Badge>
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
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(venue._id)}>
                            {venue.status === "Active" ? "Deactivate" : "Activate"}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="editVenueDescription">Description</Label>
              <Textarea
                id="editVenueDescription"
                value={formData.venueDescription}
                onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                placeholder="Enter venue description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editVenueAddress">Address</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="editVenueImage">Venue Image</Label>
              <Input
                id="editVenueImage"
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, venueImage: e.target.files?.[0] || null })}
              />
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
