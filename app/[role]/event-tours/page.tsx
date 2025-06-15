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
import { eventTourEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"

interface EventToursPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface EventTour {
  _id: string
  Name?: string
  tourName?: string  // For backward compatibility
  Description?: string | null
  tourDescription?: string  // For backward compatibility
  artistId?: string
  artistName?: string
  totalEvents?: number
  startDate?: string
  endDate?: string
  FilterationDateTime?: string
  createdAt: string
  status: number
  cities?: string[]
  __v?: number
}

interface ApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalEventTours: number
    EventTourData?: EventTour[]
  }
}

const mockEventTours: EventTour[] = [
  {
    _id: "tour001",
    Name: "Summer Rock Festival Tour 2025",
    Description: "Multi-city rock festival tour featuring top rock bands",
    artistId: "art001",
    artistName: "The Rockers",
    totalEvents: 8,
    startDate: "2025-06-01T00:00:00.000Z",
    endDate: "2025-08-31T00:00:00.000Z",
    FilterationDateTime: "2025-01-15T08:30:00.000Z",
    createdAt: "15-01-2025 08:30:00",
    status: 1,
    cities: ["New York", "Los Angeles", "Chicago", "Miami", "Seattle", "Denver", "Austin", "Boston"],
    __v: 0,
  },
  {
    _id: "tour002",
    Name: "Electronic Music World Tour",
    Description: "Global electronic music tour across major cities",
    artistId: "art002",
    artistName: "DJ Sparkle",
    totalEvents: 12,
    startDate: "2025-09-01T00:00:00.000Z",
    endDate: "2025-12-31T00:00:00.000Z",
    FilterationDateTime: "2025-02-10T10:15:00.000Z",
    createdAt: "10-02-2025 10:15:00",
    status: 1,
    cities: ["Las Vegas", "Miami", "New York", "Los Angeles", "San Francisco", "Atlanta"],
    __v: 0,
  },
  {
    _id: "tour003",
    Name: "Jazz Heritage Tour",
    Description: "Classic jazz performances in historic venues",
    artistId: "art003",
    artistName: "Smooth Jazz Trio",
    totalEvents: 6,
    startDate: "2025-03-01T00:00:00.000Z",
    endDate: "2025-05-31T00:00:00.000Z",
    FilterationDateTime: "2024-12-01T09:45:00.000Z",
    createdAt: "01-12-2024 09:45:00",
    status: 0,
    cities: ["New Orleans", "Chicago", "New York", "San Francisco", "Detroit", "Memphis"],
    __v: 0,
  },
  {
    _id: "tour004",
    Name: "Indie Rock Circuit",
    Description: "Independent rock music tour supporting emerging artists",
    artistId: "art004",
    artistName: "Indie Collective",
    totalEvents: 10,
    startDate: "2025-07-01T00:00:00.000Z",
    endDate: "2025-09-30T00:00:00.000Z",
    FilterationDateTime: "2025-03-20T12:00:00.000Z",
    createdAt: "20-03-2025 12:00:00",
    status: 2,
    cities: ["Portland", "Seattle", "San Francisco", "Los Angeles", "Phoenix", "Denver"],
    __v: 0,
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
  const [eventTours, setEventTours] = React.useState<EventTour[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalEventTours, setTotalEventTours] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedTour, setSelectedTour] = React.useState<EventTour | null>(null)
  const [useMockData, setUseMockData] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    tourName: "",
    tourDescription: "",
    artistId: "",
    startDate: "",
    endDate: "",
    cities: "",
  })

  // API function to fetch event tours
  const fetchEventTours = React.useCallback(async (page: number = 1, limit: number = ITEMS_PER_PAGE) => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = getValidToken()
      if (!user || !authToken) {
        console.warn("No user or auth token available, using mock data")
        setEventTours(mockEventTours)
        setUseMockData(true)
        setTotalPages(1)
        setTotalEventTours(mockEventTours.length)
        return
      }

      console.log("Fetching event tours with pagination:")
      console.log("- Page:", page)
      console.log("- Limit:", limit)

      const response = await fetch(eventTourEndPoint.EVENT_TOURS_PAGINATED_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          page: page,
          limit: limit.toString(),
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      console.log("Event Tours API response:", data)

      if (data.error) {
        throw new Error(data.message || "Failed to fetch event tours")
      }

      // Set the data from API
      setEventTours(data.data.EventTourData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalEventTours(data.data.totalEventTours || 0)
      setCurrentPage(data.data.currentPage || 1)
      setUseMockData(false)

      toast({
        title: "Success",
        description: data.message || "Event tours fetched successfully",
      })
    } catch (error) {
      console.error("Event tours fetch failed:", error)
      setApiError("Could not fetch event tours from server")
      
      // Fall back to mock data
      setEventTours(mockEventTours)
      setUseMockData(true)
      setTotalPages(1)
      setTotalEventTours(mockEventTours.length)
      
      toast({
        title: "API Error",
        description: "Could not fetch event tours from server. Using sample data instead.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  // Initial data fetch
  React.useEffect(() => {
    fetchEventTours(currentPage)
  }, [currentPage, fetchEventTours])

  // Filter tours based on search (now works on current page data)
  const filteredTours = React.useMemo(() => {
    if (!searchTerm) return eventTours
    return eventTours.filter(
      (tour) =>
        getEventTourName(tour).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tour.artistName && tour.artistName.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [eventTours, searchTerm])

  // For paginated API, we don't slice here since API handles pagination
  const currentTours = filteredTours

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
        Name: formData.tourName,
        Description: formData.tourDescription,
        artistId: formData.artistId,
        artistName: selectedArtist?.artistName || "Unknown Artist",
        totalEvents: citiesArray.length,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        FilterationDateTime: new Date().toISOString(),
        createdAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-'),
        status: 1,
        cities: citiesArray,
        __v: 0,
      }

      setEventTours([newTour, ...eventTours])
      setIsCreateDialogOpen(false)
      setFormData({ tourName: "", tourDescription: "", artistId: "", startDate: "", endDate: "", cities: "" })

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
              Name: formData.tourName,
              Description: formData.tourDescription,
              artistId: formData.artistId,
              artistName: selectedArtist?.artistName || "Unknown Artist",
              startDate: new Date(formData.startDate).toISOString(),
              endDate: new Date(formData.endDate).toISOString(),
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

  const handleToggleStatus = async (tourId: string, newStatus: number) => {
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
      tourName: getEventTourName(tour),
      tourDescription: getEventTourDescription(tour),
      artistId: tour.artistId || "",
      startDate: tour.startDate ? tour.startDate.split("T")[0] : "",
      endDate: tour.endDate ? tour.endDate.split("T")[0] : "",
      cities: tour.cities ? tour.cities.join(", ") : "",
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

  const getEventTourName = (tour: EventTour): string => {
    return tour.Name || tour.tourName || "Untitled Tour"
  }

  const getEventTourDescription = (tour: EventTour): string => {
    return tour.Description || tour.tourDescription || "No description available"
  }

  const getStatusDisplay = (status: number): { text: string; variant: "default" | "secondary" | "destructive" } => {
    switch (status) {
      case 1:
        return { text: "Active", variant: "default" }
      case 0:
        return { text: "Completed", variant: "secondary" }
      case 2:
        return { text: "Cancelled", variant: "destructive" }
      default:
        return { text: "Unknown", variant: "secondary" }
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
                currentTours.map((tour) => {
                  const statusDisplay = getStatusDisplay(tour.status)
                  return (
                    <TableRow key={tour._id}>
                      <TableCell className="font-medium">{getEventTourName(tour)}</TableCell>
                      <TableCell>{tour.artistName}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {tour.totalEvents}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tour.startDate ? new Date(tour.startDate).toLocaleDateString() : "N/A"} -{" "}
                        {tour.endDate ? new Date(tour.endDate).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate max-w-xs">
                            {tour.cities ? tour.cities.slice(0, 3).join(", ") : "No cities"}
                          </span>
                          {tour.cities && tour.cities.length > 3 && (
                            <span>+{tour.cities.length - 3} more</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusDisplay.variant}>{statusDisplay.text}</Badge>
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
                            {tour.status === 1 && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(tour._id, 0)}>
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                            {tour.status === 1 && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(tour._id, 2)}>
                                Cancel Tour
                              </DropdownMenuItem>
                            )}
                            {tour.status !== 1 && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(tour._id, 1)}>
                                Reactivate Tour
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteTour(tour._id)}
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
                })
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