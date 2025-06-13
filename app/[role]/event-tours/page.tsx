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
import { MoreHorizontal, PlusCircle, Search, Edit, Trash2, MapPin, Calendar, Loader2 } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"

interface EventToursPageProps {
  params: { role: UserRole }
}

interface EventTour {
  _id: string
  tourName: string
  tourDescription: string
  artistId: string
  artistName: string
  totalEvents: number
  startDate: string
  endDate: string
  status: "Active" | "Completed" | "Cancelled"
  cities: string[]
  createdAt: string
  updatedAt: string
}

const mockEventTours: EventTour[] = [
  {
    _id: "tour001",
    tourName: "Summer Rock Festival Tour 2025",
    tourDescription: "Multi-city rock festival tour featuring top rock bands",
    artistId: "art001",
    artistName: "The Rockers",
    totalEvents: 8,
    startDate: "2025-06-01T00:00:00.000Z",
    endDate: "2025-08-31T00:00:00.000Z",
    status: "Active",
    cities: ["New York", "Los Angeles", "Chicago", "Miami", "Seattle", "Denver", "Austin", "Boston"],
    createdAt: "2025-01-15T08:30:00.000Z",
    updatedAt: "2025-01-20T14:45:00.000Z",
  },
  {
    _id: "tour002",
    tourName: "Electronic Music World Tour",
    tourDescription: "Global electronic music tour across major cities",
    artistId: "art002",
    artistName: "DJ Sparkle",
    totalEvents: 12,
    startDate: "2025-09-01T00:00:00.000Z",
    endDate: "2025-12-31T00:00:00.000Z",
    status: "Active",
    cities: ["Las Vegas", "Miami", "New York", "Los Angeles", "San Francisco", "Atlanta"],
    createdAt: "2025-02-10T10:15:00.000Z",
    updatedAt: "2025-02-15T16:30:00.000Z",
  },
  {
    _id: "tour003",
    tourName: "Jazz Heritage Tour",
    tourDescription: "Classic jazz performances in historic venues",
    artistId: "art003",
    artistName: "Smooth Jazz Trio",
    totalEvents: 6,
    startDate: "2025-03-01T00:00:00.000Z",
    endDate: "2025-05-31T00:00:00.000Z",
    status: "Completed",
    cities: ["New Orleans", "Chicago", "New York", "San Francisco", "Detroit", "Memphis"],
    createdAt: "2024-12-01T09:45:00.000Z",
    updatedAt: "2025-05-31T11:20:00.000Z",
  },
  {
    _id: "tour004",
    tourName: "Indie Rock Circuit",
    tourDescription: "Independent rock music tour supporting emerging artists",
    artistId: "art004",
    artistName: "Indie Collective",
    totalEvents: 10,
    startDate: "2025-07-01T00:00:00.000Z",
    endDate: "2025-09-30T00:00:00.000Z",
    status: "Cancelled",
    cities: ["Portland", "Seattle", "San Francisco", "Los Angeles", "Phoenix", "Denver"],
    createdAt: "2025-03-20T12:00:00.000Z",
    updatedAt: "2025-04-15T16:15:00.000Z",
  },
]

const mockArtists = [
  { _id: "art001", artistName: "The Rockers" },
  { _id: "art002", artistName: "DJ Sparkle" },
  { _id: "art003", artistName: "Smooth Jazz Trio" },
  { _id: "art004", artistName: "Indie Collective" },
  { _id: "art005", artistName: "Classical Orchestra" },
]

const ITEMS_PER_PAGE = 10

export default function EventToursPage({ params }: EventToursPageProps) {
  const { role } = params
  const { toast } = useToast()

  // State management
  const [eventTours, setEventTours] = React.useState<EventTour[]>(mockEventTours)
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedTour, setSelectedTour] = React.useState<EventTour | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    tourName: "",
    tourDescription: "",
    artistId: "",
    startDate: "",
    endDate: "",
    cities: "",
  })

  // Filter tours based on search
  const filteredTours = React.useMemo(() => {
    if (!searchTerm) return eventTours
    return eventTours.filter(
      (tour) =>
        tour.tourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tour.artistName.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [eventTours, searchTerm])

  const totalPages = Math.ceil(filteredTours.length / ITEMS_PER_PAGE)
  const currentTours = filteredTours.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCreateTour = async () => {
    if (!formData.tourName.trim() || !formData.artistId || !formData.startDate || !formData.endDate) {
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

      const selectedArtist = mockArtists.find((artist) => artist._id === formData.artistId)
      const citiesArray = formData.cities
        .split(",")
        .map((city) => city.trim())
        .filter(Boolean)

      const newTour: EventTour = {
        _id: `tour${Date.now()}`,
        tourName: formData.tourName,
        tourDescription: formData.tourDescription,
        artistId: formData.artistId,
        artistName: selectedArtist?.artistName || "Unknown Artist",
        totalEvents: citiesArray.length,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: "Active",
        cities: citiesArray,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setEventTours([newTour, ...eventTours])
      setIsCreateDialogOpen(false)
      setFormData({
        tourName: "",
        tourDescription: "",
        artistId: "",
        startDate: "",
        endDate: "",
        cities: "",
      })

      toast({
        title: "Success",
        description: "Event tour created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event tour",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditTour = async () => {
    if (!selectedTour || !formData.tourName.trim() || !formData.artistId) {
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

      const selectedArtist = mockArtists.find((artist) => artist._id === formData.artistId)
      const citiesArray = formData.cities
        .split(",")
        .map((city) => city.trim())
        .filter(Boolean)

      const updatedTours = eventTours.map((tour) =>
        tour._id === selectedTour._id
          ? {
              ...tour,
              tourName: formData.tourName,
              tourDescription: formData.tourDescription,
              artistId: formData.artistId,
              artistName: selectedArtist?.artistName || "Unknown Artist",
              startDate: formData.startDate,
              endDate: formData.endDate,
              cities: citiesArray,
              totalEvents: citiesArray.length,
              updatedAt: new Date().toISOString(),
            }
          : tour,
      )

      setEventTours(updatedTours)
      setIsEditDialogOpen(false)
      setSelectedTour(null)
      setFormData({
        tourName: "",
        tourDescription: "",
        artistId: "",
        startDate: "",
        endDate: "",
        cities: "",
      })

      toast({
        title: "Success",
        description: "Event tour updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event tour",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTour = async (tourId: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setEventTours(eventTours.filter((tour) => tour._id !== tourId))

      toast({
        title: "Success",
        description: "Event tour deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event tour",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (tourId: string, newStatus: "Active" | "Completed" | "Cancelled") => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedTours = eventTours.map((tour) =>
        tour._id === tourId
          ? {
              ...tour,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            }
          : tour,
      )

      setEventTours(updatedTours)

      toast({
        title: "Success",
        description: "Tour status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tour status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (tour: EventTour) => {
    setSelectedTour(tour)
    setFormData({
      tourName: tour.tourName,
      tourDescription: tour.tourDescription,
      artistId: tour.artistId,
      startDate: tour.startDate.split("T")[0],
      endDate: tour.endDate.split("T")[0],
      cities: tour.cities.join(", "),
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      tourName: "",
      tourDescription: "",
      artistId: "",
      startDate: "",
      endDate: "",
      cities: "",
    })
    setSelectedTour(null)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default"
      case "Completed":
        return "secondary"
      case "Cancelled":
        return "destructive"
      default:
        return "outline"
    }
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
        <h1 className="text-2xl font-semibold">Event Tours Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Tour
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event Tour</DialogTitle>
              <DialogDescription>Add a new event tour to the system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tourName">Tour Name *</Label>
                  <Input
                    id="tourName"
                    value={formData.tourName}
                    onChange={(e) => setFormData({ ...formData, tourName: e.target.value })}
                    placeholder="Enter tour name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artistId">Artist *</Label>
                  <Select
                    value={formData.artistId}
                    onValueChange={(value) => setFormData({ ...formData, artistId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select artist" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockArtists.map((artist) => (
                        <SelectItem key={artist._id} value={artist._id}>
                          {artist.artistName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tourDescription">Description</Label>
                <Textarea
                  id="tourDescription"
                  value={formData.tourDescription}
                  onChange={(e) => setFormData({ ...formData, tourDescription: e.target.value })}
                  placeholder="Enter tour description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cities">Cities (comma-separated)</Label>
                <Input
                  id="cities"
                  value={formData.cities}
                  onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                  placeholder="New York, Los Angeles, Chicago"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTour} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Tour
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
              placeholder="Search tours or artists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tours Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Event Tours</CardTitle>
          <CardDescription>Manage event tours and multi-city performances.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tour Name</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead className="hidden md:table-cell">Events</TableHead>
                <TableHead className="hidden md:table-cell">Duration</TableHead>
                <TableHead className="hidden lg:table-cell">Cities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTours.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No event tours found
                  </TableCell>
                </TableRow>
              ) : (
                currentTours.map((tour) => (
                  <TableRow key={tour._id}>
                    <TableCell className="font-medium">{tour.tourName}</TableCell>
                    <TableCell>{tour.artistName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {tour.totalEvents}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(tour.startDate).toLocaleDateString()} - {new Date(tour.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate max-w-xs">{tour.cities.slice(0, 3).join(", ")}</span>
                        {tour.cities.length > 3 && <span>+{tour.cities.length - 3} more</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tour.status)}>{tour.status}</Badge>
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
                          <DropdownMenuItem onClick={() => openEditDialog(tour)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {tour.status === "Active" && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(tour._id, "Completed")}>
                              Mark as Completed
                            </DropdownMenuItem>
                          )}
                          {tour.status === "Active" && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(tour._id, "Cancelled")}>
                              Cancel Tour
                            </DropdownMenuItem>
                          )}
                          {tour.status !== "Active" && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(tour._id, "Active")}>
                              Reactivate Tour
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDeleteTour(tour._id)} className="text-red-600">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event Tour</DialogTitle>
            <DialogDescription>Update the event tour information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTourName">Tour Name *</Label>
                <Input
                  id="editTourName"
                  value={formData.tourName}
                  onChange={(e) => setFormData({ ...formData, tourName: e.target.value })}
                  placeholder="Enter tour name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editArtistId">Artist *</Label>
                <Select
                  value={formData.artistId}
                  onValueChange={(value) => setFormData({ ...formData, artistId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockArtists.map((artist) => (
                      <SelectItem key={artist._id} value={artist._id}>
                        {artist.artistName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTourDescription">Description</Label>
              <Textarea
                id="editTourDescription"
                value={formData.tourDescription}
                onChange={(e) => setFormData({ ...formData, tourDescription: e.target.value })}
                placeholder="Enter tour description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editStartDate">Start Date *</Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndDate">End Date *</Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCities">Cities (comma-separated)</Label>
              <Input
                id="editCities"
                value={formData.cities}
                onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                placeholder="New York, Los Angeles, Chicago"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTour} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Tour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
